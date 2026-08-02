using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NeuralDeck.Models;
using NeuralDeck.Services;

namespace NeuralDeck.ViewModels;

public partial class SettingsViewModel : ViewModelBase
{
    [ObservableProperty]
    private string _selectedTab = "general";

    [ObservableProperty]
    private bool _debugMode;

    [ObservableProperty]
    private string _ollamaUrl = "http://localhost:11434";

    [ObservableProperty]
    private string _ollamaSystemPrompt = "";

    [ObservableProperty]
    private string _theme = "dark";

    [ObservableProperty]
    private string _language = "en";

    [ObservableProperty]
    private bool _showProviderNames;

    [ObservableProperty]
    private string _fontSize = "medium";

    [ObservableProperty]
    private string _accentColor = "#6366f1";

    [ObservableProperty]
    private string _toggleWindowShortcut = "CommandOrControl+Shift+Space";

    [ObservableProperty]
    private string _openSettingsShortcut = "CommandOrControl+,";

    [ObservableProperty]
    private bool _clearOnClose;

    [ObservableProperty]
    private bool _alwaysOnTop = true;

    [ObservableProperty]
    private bool _hideOnBlur = true;

    [ObservableProperty]
    private string _windowPosition = "near-tray";

    [ObservableProperty]
    private double _windowOpacity = 1.0;

    public string AppVersion { get; } = ResolveAppVersion();

    private static string ResolveAppVersion()
    {
        // Read from the assembly version attribute (mirrors <Version> in NeuralDeck.csproj),
        // so the About tab can never drift from the actual build number again.
        var asm = typeof(SettingsViewModel).Assembly;
        var info = asm.GetCustomAttributes(typeof(System.Reflection.AssemblyInformationalVersionAttribute), false);
        if (info.Length > 0 && info[0] is System.Reflection.AssemblyInformationalVersionAttribute infoAttr)
        {
            // Strip the "+commit-hash" suffix if present
            var v = infoAttr.InformationalVersion;
            var plus = v.IndexOf('+');
            return plus > 0 ? v[..plus] : v;
        }
        return asm.GetName().Version?.ToString(3) ?? "0.0.0";
    }

    [ObservableProperty] private string _saveStatusMessage = "";
    private int _saveStatusToken;

    // Save buttons gave zero feedback — clicking one looked identical whether it worked or
    // silently no-op'd. Flash a short-lived confirmation instead.
    private void ShowSavedFeedback()
    {
        SaveStatusMessage = "Saved";
        var token = ++_saveStatusToken;
        _ = ClearSaveStatusAfterDelay(token);
    }

    private async Task ClearSaveStatusAfterDelay(int token)
    {
        await Task.Delay(1500);
        if (token == _saveStatusToken)
            SaveStatusMessage = "";
    }

    [ObservableProperty] private bool _isAddingProvider = false;
    [ObservableProperty] private string _newProviderName = "";
    [ObservableProperty] private string _newProviderUrl = "";
    [ObservableProperty] private string _newProviderColor = "#6366f1";

    public ObservableCollection<ProviderConfig> Providers { get; } = new();
    public ObservableCollection<string> ThemeOptions { get; } = new() { "dark", "light", "system" };
    public ObservableCollection<string> LanguageOptions { get; } = new() { "en", "es" };
    public ObservableCollection<string> FontSizeOptions { get; } = new() { "small", "medium", "large" };
    public ObservableCollection<string> PositionOptions { get; } = new() { "near-tray", "top-left", "top-right", "bottom-left", "bottom-right", "center", "remember" };
    public ObservableCollection<string> ColorOptions { get; } = new(ProviderDefaults.AccentColorOptions);

    public SettingsViewModel()
    {
        LoadSettings();
    }

    public void LoadSettings()
    {
        var config = ConfigService.Instance.GetConfig();

        DebugMode = config.Debug;
        OllamaUrl = string.IsNullOrWhiteSpace(config.OllamaUrl) ? "http://localhost:11434" : config.OllamaUrl;
        OllamaSystemPrompt = config.OllamaSystemPrompt ?? "";
        Theme = config.Appearance.Theme;
        Language = config.Appearance.Language;
        ShowProviderNames = config.Appearance.ShowProviderNames;
        FontSize = config.Appearance.FontSize;
        AccentColor = config.Appearance.AccentColor;

        ToggleWindowShortcut = config.Shortcuts.ToggleWindow;
        OpenSettingsShortcut = config.Shortcuts.OpenSettings;

        ClearOnClose = config.Privacy.ClearOnClose;

        AlwaysOnTop = config.Window.AlwaysOnTop;
        HideOnBlur = config.Window.HideOnBlur;
        WindowPosition = config.Window.Position;
        WindowOpacity = config.Window.Opacity;

        Providers.Clear();
        foreach (var p in config.Providers)
        {
            Providers.Add(p.Clone());
        }
    }

    [RelayCommand]
    private void SaveGeneral()
    {
        var normalizedUrl = NormalizeUrl(OllamaUrl);
        if (normalizedUrl == null && !string.IsNullOrWhiteSpace(OllamaUrl))
            Console.WriteLine($"[SettingsViewModel] Ignoring invalid Ollama URL: '{OllamaUrl}'");

        // UpdateGeneral leaves OllamaUrl untouched when passed null, so an invalid entry
        // just doesn't overwrite the last known-good saved value.
        ConfigService.Instance.UpdateGeneral(
            debug: DebugMode,
            ollamaUrl: normalizedUrl?.ToString(),
            ollamaSystemPrompt: OllamaSystemPrompt);
        ShowSavedFeedback();
    }

    [RelayCommand]
    private void SaveAppearance()
    {
        ConfigService.Instance.UpdateAppearance(a =>
        {
            a.Theme = Theme;
            a.Language = Language;
            a.ShowProviderNames = ShowProviderNames;
            a.FontSize = FontSize;
            a.AccentColor = AccentColor;
        });
        ShowSavedFeedback();
    }

    // Live preview of theme and accent color as the user tweaks them,
    // even before clicking Save. The save path only persists to disk.
    partial void OnThemeChanged(string value)
        => ThemeService.Instance.Apply(value, AccentColor, FontSize);

    partial void OnAccentColorChanged(string value)
        => ThemeService.Instance.Apply(Theme, value, FontSize);

    partial void OnFontSizeChanged(string value)
        => ThemeService.Instance.Apply(Theme, AccentColor, value);

    [RelayCommand]
    private void SaveShortcuts()
    {
        // Reject blank shortcuts rather than persisting them and silently breaking the
        // global hotkey — fall back to whatever was last saved.
        var savedShortcuts = ConfigService.Instance.GetConfig().Shortcuts;
        var toggleWindow = string.IsNullOrWhiteSpace(ToggleWindowShortcut) ? savedShortcuts.ToggleWindow : ToggleWindowShortcut;
        var openSettings = string.IsNullOrWhiteSpace(OpenSettingsShortcut) ? savedShortcuts.OpenSettings : OpenSettingsShortcut;

        ConfigService.Instance.UpdateShortcuts(s =>
        {
            s.ToggleWindow = toggleWindow;
            s.OpenSettings = openSettings;
        });
        ShortcutService.Instance.Refresh();
        ShowSavedFeedback();
    }

    [RelayCommand]
    private void SavePrivacy()
    {
        ConfigService.Instance.UpdatePrivacy(p =>
        {
            p.ClearOnClose = ClearOnClose;
        });
        ShowSavedFeedback();
    }

    [RelayCommand]
    private void SaveWindow()
    {
        var opacity = Math.Clamp(WindowOpacity, 0.1, 1.0);
        ConfigService.Instance.UpdateWindow(w =>
        {
            w.AlwaysOnTop = AlwaysOnTop;
            w.HideOnBlur = HideOnBlur;
            w.Position = WindowPosition;
            w.Opacity = opacity;
        });
        WindowService.Instance.SetAlwaysOnTop(AlwaysOnTop);
        WindowService.Instance.SetOpacity(opacity);
        ShowSavedFeedback();
    }

    [RelayCommand]
    private void SaveProviders()
    {
        ConfigService.Instance.UpdateProviders(Providers.ToList());
        ShowSavedFeedback();
    }

    [RelayCommand]
    private void ToggleProvider(ProviderConfig provider)
    {
        provider.Enabled = !provider.Enabled;
        SaveProviders();
    }

    [RelayCommand]
    private void ShowAddProviderForm()
    {
        NewProviderName = "";
        NewProviderUrl = "";
        NewProviderColor = ProviderDefaults.DefaultAccentColor;
        IsAddingProvider = true;
    }

    [RelayCommand]
    private void CancelAddProvider()
    {
        IsAddingProvider = false;
    }

    [RelayCommand]
    private void ConfirmAddProvider()
    {
        var name = NewProviderName.Trim();
        var normalizedUrl = NormalizeUrl(NewProviderUrl);
        if (string.IsNullOrEmpty(name) || normalizedUrl == null) return;

        var provider = new ProviderConfig
        {
            Id = Guid.NewGuid().ToString("N")[..8],
            Name = name,
            Url = normalizedUrl.ToString(),
            Color = NewProviderColor,
            Enabled = true,
            Order = Providers.Count,
            IsCustom = true
        };

        Providers.Add(provider);
        SaveProviders();
        IsAddingProvider = false;
    }

    private static Uri? NormalizeUrl(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var text = input.Trim();
        if (!text.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !text.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            text = "https://" + text;
        return Uri.TryCreate(text, UriKind.Absolute, out var uri) ? uri : null;
    }

    [RelayCommand]
    private void RemoveProvider(ProviderConfig provider)
    {
        if (!provider.IsCustom) return;
        Providers.Remove(provider);
        SaveProviders();
    }

    [RelayCommand]
    private void SelectTab(string tab)
    {
        SaveCurrentTab();
        SelectedTab = tab;
    }

    [RelayCommand]
    private void SaveCurrentTab()
    {
        switch (SelectedTab)
        {
            case "general": SaveGeneral(); break;
            case "appearance": SaveAppearance(); break;
            case "shortcuts": SaveShortcuts(); break;
            case "privacy": SavePrivacy(); break;
            case "window": SaveWindow(); break;
            case "providers": SaveProviders(); break;
        }
    }

    [RelayCommand]
    private void OpenGitHub()
    {
        try
        {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = "https://github.com/murapadev/NeuralDeck",
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SettingsViewModel] Failed to open GitHub: {ex.Message}");
        }
    }
}
