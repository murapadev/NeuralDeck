# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
