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
    private bool _blockTrackers;

    [ObservableProperty]
    private bool _alwaysOnTop = true;

    [ObservableProperty]
    private bool _hideOnBlur = true;

    [ObservableProperty]
    private string _windowPosition = "near-tray";

    [ObservableProperty]
    private double _windowOpacity = 1.0;

    [ObservableProperty]
    private string _appVersion = "0.4.5";

    public ObservableCollection<ProviderConfig> Providers { get; } = new();
    public ObservableCollection<string> ThemeOptions { get; } = new() { "dark", "light", "system" };
    public ObservableCollection<string> LanguageOptions { get; } = new() { "en", "es" };
    public ObservableCollection<string> FontSizeOptions { get; } = new() { "small", "medium", "large" };
    public ObservableCollection<string> PositionOptions { get; } = new() { "near-tray", "top-left", "top-right", "bottom-left", "bottom-right", "center", "remember" };

    public SettingsViewModel()
    {
        LoadSettings();
    }

    public void LoadSettings()
    {
        var config = ConfigService.Instance.GetConfig();

        DebugMode = config.Debug;
        Theme = config.Appearance.Theme;
        Language = config.Appearance.Language;
        ShowProviderNames = config.Appearance.ShowProviderNames;
        FontSize = config.Appearance.FontSize;
        AccentColor = config.Appearance.AccentColor;

        ToggleWindowShortcut = config.Shortcuts.ToggleWindow;
        OpenSettingsShortcut = config.Shortcuts.OpenSettings;

        ClearOnClose = config.Privacy.ClearOnClose;
        BlockTrackers = config.Privacy.BlockTrackers;

        AlwaysOnTop = config.Window.AlwaysOnTop;
        HideOnBlur = config.Window.HideOnBlur;
        WindowPosition = config.Window.Position;
        WindowOpacity = config.Window.Opacity;

        AppVersion = config.Version;

        Providers.Clear();
        foreach (var p in config.Providers)
        {
            Providers.Add(p.Clone());
        }
    }

    [RelayCommand]
    private void SaveGeneral()
    {
        ConfigService.Instance.UpdateGeneral(debug: DebugMode);
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
    }

    [RelayCommand]
    private void SaveShortcuts()
    {
        ConfigService.Instance.UpdateShortcuts(s =>
        {
            s.ToggleWindow = ToggleWindowShortcut;
            s.OpenSettings = OpenSettingsShortcut;
        });
        ShortcutService.Instance.Refresh();
    }

    [RelayCommand]
    private void SavePrivacy()
    {
        ConfigService.Instance.UpdatePrivacy(p =>
        {
            p.ClearOnClose = ClearOnClose;
            p.BlockTrackers = BlockTrackers;
        });
    }

    [RelayCommand]
    private void SaveWindow()
    {
        ConfigService.Instance.UpdateWindow(w =>
        {
            w.AlwaysOnTop = AlwaysOnTop;
            w.HideOnBlur = HideOnBlur;
            w.Position = WindowPosition;
            w.Opacity = WindowOpacity;
        });
        WindowService.Instance.SetAlwaysOnTop(AlwaysOnTop);
        WindowService.Instance.SetOpacity(WindowOpacity);
    }

    [RelayCommand]
    private void SaveProviders()
    {
        ConfigService.Instance.UpdateProviders(Providers.ToList());
    }

    [RelayCommand]
    private void ToggleProvider(ProviderConfig provider)
    {
        provider.Enabled = !provider.Enabled;
        SaveProviders();
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
        catch { }
    }
}
