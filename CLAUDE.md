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
- **Avalonia.Controls.WebView 12.0** (WebKitGTK on Linux) — embeds provider sites
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

# Self-contained single-file publish
dotnet publish -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true
dotnet publish -c Release -r win-x64   --self-contained true -p:PublishSingleFile=true
dotnet publish -c Release -r osx-arm64 --self-contained true -p:PublishSingleFile=true
```

Linux needs WebKitGTK 4.1 (`webkit2gtk-4.1` on Arch, `libwebkit2gtk-4.1-dev` on Debian/Ubuntu).

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

`MainWindowViewModel` (root; picks chat vs WebView via `SelectedProviderId == "ollama"`),
`ChatViewModel`, `SettingsViewModel`, `OnboardingViewModel`, `WebBrowserViewModel`, plus
`ViewModelBase`. ViewModels read/write config through `ConfigService.Instance` and subscribe
to `ConfigChanged`.

### Views (`Views/`) & Controls

AXAML + code-behind: `MainWindow`, `ChatView`, `SettingsView`/`SettingsWindow`,
`OnboardingView`, `WebBrowserView`. WebView navigation lives in `WebBrowserView.axaml.cs`
(CSS injection is idempotent via a `__nd_s` marker; external links open via `Process.Start`).
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
