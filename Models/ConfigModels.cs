namespace NeuralDeck.Models;

public class WindowConfig
{
    public int Width { get; set; } = 420;
    public int Height { get; set; } = 700;
    public string Position { get; set; } = "near-tray";
    public int? LastX { get; set; }
    public int? LastY { get; set; }
    public bool AlwaysOnTop { get; set; } = true;
    public bool HideOnBlur { get; set; } = true;
    public double Opacity { get; set; } = 1.0;
}

public class AppearanceConfig
{
    public string Theme { get; set; } = "dark";
    public string Language { get; set; } = "en";
    public bool ShowProviderNames { get; set; } = false;
    public string FontSize { get; set; } = "medium";
    public string AccentColor { get; set; } = "#6366f1";
}

public class ShortcutConfig
{
    public string ToggleWindow { get; set; } = "CommandOrControl+Shift+Space";
    public List<string> Providers { get; set; } = new()
    {
        "CommandOrControl+Shift+1",
        "CommandOrControl+Shift+2",
        "CommandOrControl+Shift+3",
        "CommandOrControl+Shift+4",
        "CommandOrControl+Shift+5"
    };
    public string Reload { get; set; } = "CommandOrControl+R";
    public string GoBack { get; set; } = "CommandOrControl+Left";
    public string GoForward { get; set; } = "CommandOrControl+Right";
    public string OpenSettings { get; set; } = "CommandOrControl+,";
}

public class PrivacyConfig
{
    public bool ClearOnClose { get; set; } = false;
    public bool BlockTrackers { get; set; } = false;
    public List<string> IncognitoProviders { get; set; } = new();
}

public class AppConfig
{
    public string Version { get; set; } = "0.5.0";
    public bool Debug { get; set; } = false;
    public bool FirstRun { get; set; } = true;
    public string? LastProvider { get; set; }
    public string? LastOllamaModel { get; set; }
    public string OllamaUrl { get; set; } = "http://localhost:11434";
    public string OllamaSystemPrompt { get; set; } = "";
    public WindowConfig Window { get; set; } = new();
    public ShortcutConfig Shortcuts { get; set; } = new();
    public List<ProviderConfig> Providers { get; set; } = new();
    public PrivacyConfig Privacy { get; set; } = new();
    public AppearanceConfig Appearance { get; set; } = new();
}
