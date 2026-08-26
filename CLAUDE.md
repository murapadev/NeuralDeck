# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeuralDeck is a cross-platform desktop **AI command center** that lives in the system tray.
It embeds AI provider websites (ChatGPT, Gemini, Claude, DeepSeek, Perplexity, plus custom
providers) in a native WebView, and offers a native streaming chat client for local Ollama.
`Ctrl+Shift+Space` toggles a frameless floating window.

The project was ported from Electron/React/TypeScript to **.NET 10 + Avalonia/C#** in April 2026.
Anything describing a Node/Electron/React/tRPC stack is obsolete — the codebase is now pure C#.

## Stack

- **.NET 10** (`net10.0`, `WinExe`, `Nullable` + `ImplicitUsings` enabled)
- **Avalonia UI 12.1** (Fluent theme, Inter font, compiled bindings by default)
- **Real embedded Chrome, per provider, via X11 window reparenting** — every non-Ollama
  provider (ChatGPT, Gemini, Claude, DeepSeek, Perplexity, custom) is rendered by a genuine,
  standalone `google-chrome-stable` process embedded into the Avalonia visual tree. See
  Architecture below for why and how.
- **CommunityToolkit.Mvvm 8.4** — MVVM via source generators (`[ObservableProperty]`, `[RelayCommand]`)
- **SharpHook 7.1** — global keyboard shortcuts (types live in `SharpHook.Data`, not `SharpHook.Native`)
- `Tmds.DBus.Protocol` is referenced explicitly (0.94.2) so it can never resolve back to
  0.20.0 / GHSA-xrw6-gwf8-vvr9. Keep the explicit reference; bumping it forward is fine.

## Commands

```bash
dotnet restore
dotnet run                      # run debug
dotnet build -c Release         # release build (expected: 0 warnings)
dotnet test                     # xUnit tests (NeuralDeck.Tests, currently MarkdownParser only)

dotnet publish -c Release -r linux-x64 --self-contained true
dotnet publish -c Release -r win-x64   --self-contained true
dotnet publish -c Release -r osx-arm64 --self-contained true
```

Linux requires `google-chrome-stable` on `PATH` and an X11 session (`libX11.so.6`) — there is no
Wayland-native path; under Wayland sessions Chrome/Avalonia both fall back through XWayland,
which this embedding relies on implicitly (untested under pure Wayland).

## Provider embedding: real Chrome via X11 reparenting

Two embedding approaches were tried and rejected before landing on this one:

1. **`Avalonia.Controls.WebView` (WPE WebKit)** — claude.ai's Cloudflare bot-protection rejects
   the WebKit-family engine outright, even with a fully wiped session.
2. **CEF/Chromium in-process (CefGlue + WebViewControl-Avalonia, local patched forks)** — passed
   Cloudflare, but had a structural, unfixable-via-build-flags native stability bug: CEF's
   bundled Chromium allocator (PartitionAlloc) and .NET's own native stack (SkiaSharp/
   HarfBuzzSharp, glibc malloc) share one process address space, and pointers allocated by one
   side and freed/queried by the other corrupt the heap. Confirmed via multiple distinct crash
   signatures depending on which allocator path fired first (HarfBuzz `free(): invalid pointer`,
   `malloc_usable_size`/sqlite3Malloc SIGSEGV, Skia DCHECK assertions, Mojo IPC validation
   errors, fontconfig/libxml2 memory corruption) — a genuine race condition, not one bug with one
   fix. `use_partition_alloc_as_malloc=false` in a from-source CEF rebuild reduced but did not
   eliminate it. Abandoned entirely; the CefGlue/WebView forks at `~/Proyectos/OSS/CefGlue` and
   `~/Proyectos/OSS/WebView`, and the custom build tree at `~/chromium-cef-build/`, are no longer
   used by NeuralDeck (left on disk, not yet cleaned up).

**Current approach**: launch a real, separate `google-chrome-stable` process per provider
(`--app=<url>`, its own `--user-data-dir` keyed by provider ID) and reparent its X11 window into
Avalonia's own window using `XReparentWindow`. Genuinely separate OS process → no shared address
space → no allocator collision risk. And it's real Chrome, so Cloudflare accepts it.

- **`Services/X11Interop.cs`** — minimal Xlib P/Invoke surface (`libX11.so.6`): open/close
  display, reparent/map/unmap/move-resize a window, read window properties.
- **`Services/ChromeEmbedHost.cs`** — an Avalonia `NativeControlHost` subclass. On
  `CreateNativeControlCore`, launches Chrome, finds its top-level window by reading the root
  window's `_NET_CLIENT_LIST` and matching `_NET_WM_PID` against the launched process's PID
  (skipping small auxiliary windows via a `width/height > 50` geometry check), reparents it into
  the host's native handle, and returns it as `new PlatformHandle(windowId, "XID")` — Avalonia's
  X11 backend then handles resize/reposition automatically as the control's bounds change.
  `DestroyNativeControlCore` kills the Chrome process tree.
  - **Gotcha**: `NativeControlHost.CreateNativeControlCore` only fires once the containing
    `Window` is actually shown (real X11 handle exists), not merely constructed. NeuralDeck's
    main window starts hidden (tray app; `Ctrl+Shift+Space` toggles it) — the embedding logic
    only runs after the first `Show()`.
- **`ViewModels/ChromeProviderViewModel.cs`** / **`Views/ChromeProviderView.axaml(.cs)`** — one
  instance per provider (`ProviderId`, `CurrentUrl`), wraps a `ChromeEmbedHost` in a bare
  `ContentControl` (no toolbar/address bar — Chrome's own window fills the pane).
- **`MainWindowViewModel.BrowserViewModels`** — an `ObservableCollection<ChromeProviderViewModel>`,
  one per *visited* provider, all stacked in the same `Grid` cell in `MainWindow.axaml` with only
  the selected one `IsVisible`. `ActivateBrowserFor(providerId)` creates one lazily on first visit
  and never destroys an existing one — its Chrome process (and login/session state) keeps
  running in the background, so switching back to an already-visited provider is instant with no
  reload (verified: Claude → ChatGPT → Claude showed identical state).
- Each provider's profile lives at
  `~/.local/share/NeuralDeck/ChromeEmbed/<providerId>/` (Linux) — deleting it resets that
  provider's login/session.
- `ReloadCurrentView`/`GoBackInView`/`GoForwardInView` in `MainWindowViewModel` are no-ops (kept
  only so `ShortcutService`'s existing hotkey bindings don't need special-casing) — there's no
  programmatic hook into the embedded Chrome's navigation from C#; use Chrome's own shortcuts
  (`Ctrl+R`, `Alt+Left/Right`) once the pane has focus.

## Architecture

Single-process Avalonia app. There is **no DI container** — services are accessed through a
`static Instance` singleton (`SPEC.md` planned `Microsoft.Extensions.DependencyInjection`, but
it was never adopted). Layers: `Models/` → `Services/` (singletons, side effects) →
`ViewModels/` (MVVM) → `Views/` (AXAML + code-behind).

### Entry & startup

- `Program.cs` — `Main`; `AppBuilder.Configure<App>().UsePlatformDetect().WithInterFont()`.
- `App.axaml.cs` — `OnFrameworkInitializationCompleted` wires everything: creates
  `MainWindowViewModel` + `MainWindow`, initializes `ThemeService`, `WindowService`,
  `TrayService`, `ShortcutService`, applies startup window config, and registers exit cleanup
  (`OnExit` disposes services and clears Ollama history when `Privacy.ClearOnClose`).
  `ShutdownMode = OnExplicitShutdown` — closing the window hides it; quit is via tray/`Ctrl+Q`.

### Services (`Services/`, all singletons via `.Instance`)

| Service | Responsibility |
|---------|----------------|
| `ConfigService` | Loads/saves `config.json` (System.Text.Json, camelCase). `GetConfig()`, `Update*` mutators, `NormalizeConfig` (migration/defaults), raises `ConfigChanged`. |
| `OllamaService` | HTTP client for local Ollama. Streaming `ChatAsync` (`ResponseHeadersRead` + line-by-line, cancelable), model listing, connection polling. |
| `ConversationStore` | Persists/loads Ollama chat history (`ollama-history.json`); `Clear()` on exit when enabled. |
| `WindowService` | Owns `MainWindow`; positioning (`CalculateWindowPosition`, incl. tray proximity), show/hide, always-on-top, opacity, shutdown prep. |
| `ShortcutService` | Global hotkeys via SharpHook; accelerator parsing/matching; `Refresh()` re-reads config. |
| `ThemeService` | Applies theme (dark/light/system), accent color, font size. Live preview from settings. |
| `TrayService` | Avalonia built-in `TrayIcon` + context menu (not `Avalonia.SystemTray`). |

### Models (`Models/`)

- `ConfigModels.cs` — `AppConfig` and nested `WindowConfig`, `AppearanceConfig`,
  `ShortcutConfig`, `PrivacyConfig`. **This is the live config schema** (plain mutable classes).
- `ProviderConfig.cs`, `ChatModels.cs`, `Constants.cs` (`AppConstants`).
- `ConfigRecords.cs` exists but is currently **dead** (record types unused; strings are used
  instead). Don't add new dependencies on it without a reason.

### ViewModels (`ViewModels/`)

`MainWindowViewModel` (root; picks chat/provider view via `SelectedProviderId` —
`ShowChatView`/`ShowProviderView`, mutually exclusive), `ChatViewModel`, `SettingsViewModel`,
`OnboardingViewModel`, `ChromeProviderViewModel` (one instance per visited non-Ollama provider,
see `BrowserViewModels` in `MainWindowViewModel` and the Chrome-embedding section above), plus
`ViewModelBase`. ViewModels read/write config through `ConfigService.Instance` and subscribe to
`ConfigChanged`.

### Views (`Views/`) & Controls

AXAML + code-behind: `MainWindow`, `ChatView`, `SettingsView`/`SettingsWindow`, `OnboardingView`,
`ChromeProviderView` (thin wrapper around `ChromeEmbedHost`, see Chrome-embedding section above).
`Controls/MarkdownParser.cs` is a **pure, Avalonia-free** parser (the one well-tested class);
`MarkdownTextBlock.cs` renders it.

### Configuration file

`config.json` in `%APPDATA%\NeuralDeck\` (Windows) / `~/.config/NeuralDeck/` (Linux/macOS).
`<Version>` in `NeuralDeck.csproj` is the source of truth for the app version (the About tab
reads it from the assembly attribute).

## Conventions

- TypeScript-era files (`electron/`, `src/`, tRPC, Zustand, Vite) **no longer exist** — ignore
  any reference to them in stale docs.
- Comments explain *why*, not *what*. Keep `dotnet build -c Release` at **0 warnings**.
- No hardcoded secrets/tokens (none currently — only public provider URLs and `localhost:11434`).
- WebView provider sessions are **shared** (single `Browser` control, `Navigate()` only); there
  is no per-provider session isolation or tracker blocking. Don't expose UI for privacy features
  that aren't actually implemented (the old "Block trackers" ghost checkbox was removed).

## Known stale docs

- `SPEC.md` is the port-planning doc and is partly stale (says .NET 8, DI, Markdig). Historical.
- `README.md` and `CHANGELOG.md` are accurate.
