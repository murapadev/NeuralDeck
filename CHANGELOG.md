# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
