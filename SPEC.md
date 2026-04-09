# NeuralDeck Avalonia Port - Technical Specification

## Overview

NeuralDeck is being ported from TypeScript/Electron to C#/.NET 8 with Avalonia UI for cross-platform desktop support.

**Original Stack:** TypeScript, React 18, Vite, Electron 39, tRPC, Zustand, TailwindCSS
**Target Stack:** C# .NET 8, Avalonia UI 11.x, CommunityToolkit.Mvvm, System.Text.Json

## Architecture

### Domain Model (C# Records)

```csharp
// Theme options
public record Theme(string Value) {
    public static readonly Theme Dark = new("dark");
    public static readonly Theme Light = new("light");
    public static readonly Theme System = new("system");
}

// Provider configuration
public record ProviderConfig {
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string Url { get; init; } = "";
    public string Icon { get; init; } = "";
    public string Color { get; init; } = "#ffffff";
    public bool Enabled { get; init; } = true;
    public int Order { get; init; } = 0;
    public bool IsCustom { get; init; } = false;
}

// Window configuration
public record WindowConfig {
    public int Width { get; init; } = 420;
    public int Height { get; init; } = 700;
    public string Position { get; init; } = "near-tray";
    public int? LastX { get; init; }
    public int? LastY { get; init; }
    public bool AlwaysOnTop { get; init; } = true;
    public bool HideOnBlur { get; init; } = true;
    public double Opacity { get; init; } = 1.0;
}

// Appearance configuration
public record AppearanceConfig {
    public string Theme { get; init; } = "dark";
    public string Language { get; init; } = "en";
    public bool ShowProviderNames { get; init; } = false;
    public string FontSize { get; init; } = "medium";
    public string AccentColor { get; init; } = "#6366f1";
}

// Shortcut configuration
public record ShortcutConfig {
    public string ToggleWindow { get; init; } = "CommandOrControl+Shift+Space";
    public List<string> Providers { get; init; } = new();
    public string Reload { get; init; } = "CommandOrControl+R";
    public string GoBack { get; init; } = "CommandOrControl+Left";
    public string GoForward { get; init; } = "CommandOrControl+Right";
    public string OpenSettings { get; init; } = "CommandOrControl+,";
}

// Privacy configuration
public record PrivacyConfig {
    public bool ClearOnClose { get; init; } = false;
    public bool BlockTrackers { get; init; } = false;
    public List<string> IncognitoProviders { get; init; } = new();
}

// Root application configuration
public record AppConfig {
    public string Version { get; init; } = "0.4.5";
    public bool Debug { get; init; } = false;
    public bool FirstRun { get; init; } = true;
    public string? LastProvider { get; init; }
    public WindowConfig Window { get; init; } = new();
    public ShortcutConfig Shortcuts { get; init; } = new();
    public List<ProviderConfig> Providers { get; init; } = new();
    public PrivacyConfig Privacy { get; init; } = new();
    public AppearanceConfig Appearance { get; init; } = new();
}

// Chat message for Ollama
public record ChatMessage {
    public string Role { get; init; } = "user"; // "user" | "assistant" | "system"
    public string Content { get; init; } = "";
    public long? Timestamp { get; init; }
}

// Ollama model
public record OllamaModel {
    public string Name { get; init; } = "";
    public long Size { get; init; }
    public string Digest { get; init; } = "";
    public string ModifiedAt { get; init; } = "";
}

// Navigation state
public record NavigationState {
    public bool CanGoBack { get; init; }
    public bool CanGoForward { get; init; }
    public string Url { get; init; } = "";
}
```

## Project Structure

```
NeuralDeck/
├── src/
│   ├── App.axaml                    # Root application markup
│   ├── App.axaml.cs                 # App code-behind
│   ├── Program.cs                   # Entry point
│   ├── ViewLocator.cs               # View resolution
│   ├── Views/
│   │   ├── MainWindow.axaml         # Main window with sidebar + content
│   │   ├── MainWindow.axaml.cs
│   │   ├── ChatView.axaml           # Ollama chat interface
│   │   ├── ChatView.axaml.cs
│   │   ├── SettingsView.axaml       # Settings panel
│   │   ├── SettingsView.axaml.cs
│   │   ├── OnboardingView.axaml     # First-run wizard
│   │   └── OnboardingView.axaml.cs
│   ├── ViewModels/
│   │   ├── MainWindowViewModel.cs
│   │   ├── ChatViewModel.cs
│   │   ├── SettingsViewModel.cs
│   │   ├── OnboardingViewModel.cs
│   │   └── ViewModelBase.cs
│   ├── Services/
│   │   ├── OllamaService.cs         # LLM backend HTTP client
│   │   ├── ConfigService.cs         # JSON config in AppData
│   │   ├── WindowService.cs         # Window management
│   │   ├── TrayService.cs           # System tray
│   │   ├── ShortcutService.cs       # Global hotkeys
│   │   └── NavigationService.cs    # View navigation
│   ├── Models/
│   │   ├── AppConfig.cs
│   │   ├── ChatMessage.cs
│   │   └── OllamaModel.cs
│   ├── Converters/
│   │   └── BoolToVisibilityConverter.cs
│   └── Assets/
│       └── Icons/
└── NeuralDeck.csproj
```

## Services

### ConfigService
- Loads/saves JSON config from `%APPDATA%/NeuralDeck/config.json`
- Handles migrations for version upgrades
- Provides reactive config updates via events

### OllamaService
- HTTP client to `http://localhost:11434`
- `HealthCheckAsync()` - ping Ollama
- `GetModelsAsync()` - list available models
- `SendMessageAsync(stream)` - streaming chat completions

### WindowService
- Show/hide/toggle main window
- Position calculation (near-tray, corners, center)
- Always-on-top management
- Settings window management

### TrayService
- System tray icon
- Context menu with providers
- Left-click toggle, right-click menu

### ShortcutService
- Global hotkey registration via `GlobalHotKey` (Avalonia)
- Provider switching shortcuts
- Window toggle shortcut

## UI Components

### MainWindow
- Frameless window with custom title bar
- Sidebar (collapsible provider list)
- Content area (provider WebViews or native views)
- Tray icon integration

### Sidebar
- Provider icons with drag-and-drop reordering
- Pin/unpin window toggle
- Settings button
- Active indicator

### ChatView (Ollama native)
- Connection status indicator
- Model selector dropdown
- Message history with Markdown rendering
- Input field with send button
- Streaming response display

### SettingsView
- Tabbed interface (General, Appearance, Shortcuts, Providers, Privacy)
- Search functionality
- Version info footer

### OnboardingView
- Welcome screen
- Provider selection checkboxes
- Finish button

## Key Packages

```xml
<PackageReference Include="Avalonia.Desktop" Version="11.2.1" />
<PackageReference Include="Avalonia.Themes.Fluent" Version="11.2.1" />
<PackageReference Include="CommunityToolkit.Mvvm" Version="8.2.2" />
<PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.0.0" />
<PackageReference Include="System.Text.Json" Version="8.0.4" />
<PackageReference Include="Avalonia.SystemTray" Version="11.2.1" />
```

## Default Providers

| ID | Name | URL | Color |
|---|---|---|---|
| chatgpt | ChatGPT | https://chatgpt.com | #10a37f |
| gemini | Gemini | https://gemini.google.com/app | #8e44ef |
| claude | Claude | https://claude.ai/new | #d97706 |
| deepseek | DeepSeek | https://chat.deepseek.com | #3b82f6 |
| perplexity | Perplexity | https://www.perplexity.ai | #22c55e |
| ollama | Ollama | http://localhost:11434 | #ffffff |

## Constants

```csharp
public static class Constants {
    public const int DefaultWindowWidth = 420;
    public const int DefaultWindowHeight = 700;
    public const int SidebarCollapsedWidth = 72;
    public const int SidebarExpandedWidth = 140;
    public const string DefaultOllamaUrl = "http://localhost:11434";
    public const int OllamaHealthTimeoutMs = 3000;
    public const string ToggleWindowShortcut = "CommandOrControl+Shift+Space";
}
```

## Implementation Priority

1. **Core Infrastructure**
   - Project setup with Avalonia 11.x
   - Domain models and constants
   - ConfigService with JSON persistence

2. **Main Window**
   - Frameless window with sidebar
   - Window positioning and tray

3. **Ollama Integration**
   - OllamaService with streaming
   - ChatView with message history

4. **Settings & Onboarding**
   - OnboardingView for first-run
   - SettingsView with tabs

5. **Polish**
   - Global shortcuts
   - Theme support
   - Provider reordering

## Notes

- WebView2/Avalonia WebView will be used for non-Ollama providers in future versions
- Current port focuses on Ollama native integration + window management
- IPC bridge simplified - no tRPC, direct service calls via DI
- Markdown rendering via Markdig library
