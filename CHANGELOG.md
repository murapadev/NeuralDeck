# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-10-30

### Added
- **Isolated sessions per web provider** — each provider gets its own WebView and browser
  profile, so logging into one is never visible to another (WebKitGTK/WPE: separate data and
  cache directories; Windows WebView2: a named profile per provider; macOS 14+: a separate
  WKWebView data store). Visited providers stay alive in the background, so switching back
  keeps the page and session. Clicking the active provider in the sidebar goes back home.
- **Persistent logins on Linux** — WebKitGTK kept cookies in memory only, so every restart
  logged out of every provider; cookies are now stored per provider (`cookies.sqlite`)
- **Clickable markdown links** in the Ollama chat (0.7.0 only rendered them as styled text);
  only `http`/`https` targets open, in the system browser
- Chat: message timestamps, suggested prompts, copy buttons (messages and code blocks),
  "Regenerate", animated loading dots, Markdown/text export, custom system prompt
- 162 unit tests (from 18): URI allowlist, link targets, shortcut parsing/matching,
  web profiles, Ollama formatting, converters

### Changed
- **Avalonia 12.1.4**, Avalonia.Controls.WebView 12.1.1, CommunityToolkit.Mvvm 8.4.2,
  Tmds.DBus.Protocol 0.95.2 (still pinned explicitly), MicroCom.Runtime 0.11.7
- **SharpHook 8.0.1** — every `KeyCode` value changed upstream; the mapping is symbolic and
  covered by tests. On Linux the hook keeps the pre-8 XRecord backend (the new Wayland backend
  needs elevated privileges) and listens to the keyboard only
- **Tests on xUnit v3** (`xunit.v3` 4.0.2) running on Microsoft.Testing.Platform
  (`global.json`); VSTest-only test packages removed
- `Privacy → Clear on close` now covers web sessions as well: providers run in private,
  non-persistent sessions and leftover profile data is wiped at exit and at startup
- Claude opens in the system browser (Cloudflare blocks embedded WebKit engines)
- Settings are saved when the settings window is closed, with a save confirmation
- The 30 s Ollama connection poll no longer flashes "Connecting…" or rebuilds the model list
  unless the connection state actually changed
- Dragging the window no longer writes `config.json` on every pixel (debounced)
- Dependabot tracks NuGet and GitHub Actions instead of the Electron-era npm

### Fixed
- Linux: crash (`free(): invalid pointer`) as soon as a web provider loaded — HarfBuzzSharp's
  bundled library and the system libharfbuzz pulled in by WebKitGTK were both in the process;
  HarfBuzzSharp now binds to the system library when it is recent enough
- Linux + NVIDIA proprietary driver: blank provider pages (WebKitGTK DMA-BUF renderer)
- Long Ollama generations were cut off after 60 s; streams now only stop on a real stall
  (idle timeout, reported in the chat)
- Pages could open arbitrary schemes (`file://`, custom handlers) through `window.open`; every
  external open now goes through a single http/https allowlist
- OAuth popups (Google, Microsoft, GitHub, Apple) now complete inside the provider view
- Failed page loads show an error with Reload / Open in Browser instead of a blank view, and the
  banner clears on the next navigation
- `config.json` writes are serialized; singletons are created thread-safely
- `async void` UI handlers can no longer crash the app on an unexpected exception
- Shortcuts with punctuation (`Ctrl+.`, `Ctrl+;`…) register correctly
- Leaked notification managers, window placement without screen info, onboarding shortcut text

### Removed
- Ghost "Block trackers" setting (never applied) and unused `IncognitoProviders`
- Dead code: `ConfigRecords`, `NavigationState`

## [0.7.0] - 2026-04-26

### Added
- **WebView: JS injection** — dark scrollbar CSS injected via `InvokeScript` on every
  page load; idempotent (checks for existing `__nd_s` style element)
- **WebView: page title** — `document.title` fetched after each navigation and displayed
  in the status bar as `"Page Title  •  host"`; address bar tooltip also shows the title
- **WebView: Go button** — explicit `→` navigation button next to the address bar
  (Enter key still works as before)
- **Markdown: blockquotes** — `> text` renders as a left-border panel with italic text
- **Markdown: links** — `[text](url)` rendered as indigo underlined text inline
- **Shortcuts: Ctrl+Left / Ctrl+Right** — browser back / forward now registered from
  `ShortcutConfig.GoBack` / `GoForward` (were defined in schema but never wired up)
- **18 unit tests** (up from 14) — added blockquote, link-in-paragraph, indented code fence

### Changed
- **Streaming scroll fix** — `ChatView` now subscribes to each `ChatMessage.PropertyChanged`
  so the scroll view follows token updates during streaming (previously stuck at position
  from when the message was first added)
- **Scroll coalescing** — rapid token bursts queue at most one scroll action at a time
  via `_scrollPending` flag
- **MarkdownTextBlock performance** — `Rebuild()` is skipped while `IsVisible=false`
  (hidden behind the streaming `SelectableTextBlock`); rebuilds on `IsVisible→true`.
  Eliminates hundreds of redundant markdown parses during a streaming response
- **Ollama model display** — ComboBox shows `DisplayName` (`:latest` stripped); full
  name still visible as a tooltip
- **Disconnected state** — shows the actual configured Ollama URL being tried, plus
  a `Retry` button that fires `CheckConnectionCommand`; button disabled while a check
  is in flight
- Language setting in Appearance tab labelled "(coming soon)" and disabled — it has
  never applied a translation; making the UI honest about it
- Shortcuts tab: added `Ctrl+Left/Right` (back/forward) and corrected `Ctrl+W` entry
- Status bar text dimmed to `#52525b` (less visually heavy than before)

## [0.6.0] - 2026-04-26

### Added
- **Markdown rendering** in Ollama chat — assistant responses now render headings, bold,
  italic, inline code, fenced code blocks (with language label), bullet/numbered lists,
  and horizontal rules using native Avalonia controls
- **Test suite** — `NeuralDeck.Tests` project with xUnit; 14 unit tests covering the
  markdown parser (block splitting, header detection, code fences, lists, mixed content)
- **4 new providers** (disabled by default, enable in Settings → Providers):
  Grok (xAI), Copilot (Microsoft), Mistral, Meta AI
- **Solution file** (`NeuralDeck.slnx`) covering the main project and test project
- CI now runs `dotnet test` after the build step

### Changed
- Settings tab buttons now correctly highlight the active tab (was broken: the old
  `EqualityConverter` returned `bool` instead of `IBrush`; replaced with
  `TabForegroundConverter` + `TabBackgroundConverter`)
- Settings auto-saves the current tab before switching to another
- Main window title bar shows the currently selected provider name
- Provider sidebar tooltips include the keyboard shortcut hint (e.g. `ChatGPT  (Ctrl+Shift+1)`)
- SettingsWindow now closes with `Ctrl+W` in addition to `Esc`
- README rewritten: app icon, .NET/Avalonia badges, keyboard shortcuts table, platform build commands
- Version bumped to 0.6.0

### Fixed
- CI workflows were completely broken (Node.js/Electron targets); replaced with .NET 10 workflows

## [0.5.0] - 2026-04-24

### Added
- Real embedded WebView (`Avalonia.Controls.WebView 11.4.0`, WebKitGTK-4.1) — ChatGPT,
  Gemini, Perplexity, DeepSeek render fully with JS
- Standalone `SettingsWindow` with 7 tabs (General, Appearance, Shortcuts, Privacy,
  Window, Providers, About)
- TrayService: Providers submenu wired to select provider and show window; auto-refreshes on config change
- ShortcutService: `Ctrl+Shift+Space` toggle, `Ctrl+,` settings, `Ctrl+Shift+1..5` provider hotkeys
  re-registered on config change
- Ollama streaming chat with model selector, conversation history (cap 200 messages),
  persistent `~/.config/NeuralDeck/ollama-history.json`
- Onboarding flow on first run
- Real brand favicons normalized to 64×64 for all 6 default providers
- Transitive dep pin: `Tmds.DBus.Protocol 0.21.3` (fixes GHSA-xrw6-gwf8-vvr9)
- `AlwaysOnTop` and `Opacity` toggleable live from the pin button and settings

### Fixed
- Ported from Electron/React to .NET 10 + Avalonia 11.2 for lower memory usage and native packaging
- Removed legacy Electron/npm build artifacts from repository

## [0.1.0] - 2026-01-12

### Added
- Initial Avalonia port — C# .NET desktop application
- Core infrastructure with CommunityToolkit.Mvvm
- OllamaService for local LLM integration
- ConfigService for JSON-based configuration persistence
- Window management with system tray integration
