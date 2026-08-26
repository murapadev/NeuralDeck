using System.Collections.ObjectModel;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NeuralDeck.Models;
using NeuralDeck.Services;

namespace NeuralDeck.ViewModels;

public partial class MainWindowViewModel : ViewModelBase, IDisposable
{
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(ShowChatView))]
    [NotifyPropertyChangedFor(nameof(ShowProviderView))]
    private string _selectedProviderId = "ollama";

    [ObservableProperty] private bool _showOnboarding = false;
    [ObservableProperty] private bool _isPinned = true;
    [ObservableProperty] private string _currentProviderName = "NeuralDeck";
    [ObservableProperty] private ObservableCollection<ProviderDisplay> _enabledProviders = new();
    [ObservableProperty] private ChatViewModel? _chatViewModel;
    [ObservableProperty] private OnboardingViewModel? _onboardingViewModel;
    [ObservableProperty] private ProviderConfig? _selectedProvider;

    // Every non-Ollama provider gets its own ChromeProviderViewModel (own Chrome process, own
    // profile dir), created lazily the first time it's selected and kept alive afterward —
    // switching providers just flips IsSelected (see ChromeProviderView's IsVisible binding in
    // MainWindow.axaml), so an already-visited provider switches back instantly and stays
    // logged in. See ChromeProviderViewModel for why Chrome-embedding replaced the old
    // WebKit-based WebBrowserView for every provider.
    [ObservableProperty] private ObservableCollection<ChromeProviderViewModel> _browserViewModels = new();

    public bool ShowChatView => SelectedProviderId == "ollama";
    public bool ShowProviderView => SelectedProviderId != "ollama";

    public MainWindowViewModel()
    {
        ChatViewModel = new ChatViewModel();
        OnboardingViewModel = new OnboardingViewModel();
        OnboardingViewModel.OnboardingComplete += (_, _) => OnOnboardingComplete();
        ConfigService.Instance.ConfigChanged += OnConfigChanged;
        LoadConfig();
    }

    private void LoadConfig()
    {
        try
        {
            var config = ConfigService.Instance.GetConfig();
            ShowOnboarding = config.FirstRun;
            SelectedProviderId = config.LastProvider ?? "ollama";
            IsPinned = config.Window.AlwaysOnTop;
            LoadProviders(config);
            UpdateSelectedProvider(config);
            ActivateBrowserFor(SelectedProviderId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MainWindowViewModel] Failed to load config, falling back to onboarding: {ex.Message}");
            ShowOnboarding = true;
        }
    }

    private void LoadProviders(AppConfig config)
    {
        EnabledProviders.Clear();
        var ordered = config.Providers.Where(p => p.Enabled).OrderBy(p => p.Order).ToList();
        for (int i = 0; i < ordered.Count; i++)
        {
            var captured = ordered[i];
            var shortcutIndex = i < config.Shortcuts.Providers.Count ? i : -1;
            var hint = shortcutIndex >= 0
                ? BuildShortcutHint(captured.Name, config.Shortcuts.Providers[shortcutIndex])
                : captured.Name;

            EnabledProviders.Add(new ProviderDisplay
            {
                Name = captured.Name,
                Color = captured.Color,
                Id = captured.Id,
                IsSelected = captured.Id == SelectedProviderId,
                ShortcutHint = hint,
                SelectCommand = new RelayCommand(() => SelectProvider(captured.Id))
            });
        }
    }

    private static string BuildShortcutHint(string name, string shortcut)
    {
        // Convert "CommandOrControl+Shift+1" → "Ctrl+Shift+1" for display
        var display = shortcut
            .Replace("CommandOrControl", "Ctrl", StringComparison.OrdinalIgnoreCase)
            .Replace("Control", "Ctrl", StringComparison.OrdinalIgnoreCase);
        return $"{name}  ({display})";
    }

    private void UpdateSelectedProvider(AppConfig? config = null)
    {
        config ??= ConfigService.Instance.GetConfig();
        SelectedProvider = config.Providers.FirstOrDefault(p => p.Id == SelectedProviderId);

        // The selected provider can vanish out from under us (deleted in Settings while
        // active) — fall back to Ollama rather than leaving the view stuck on whatever the
        // now-nonexistent provider last rendered.
        if (SelectedProvider == null && SelectedProviderId != "ollama")
        {
            SelectProvider("ollama");
            return;
        }

        foreach (var p in EnabledProviders)
            p.IsSelected = p.Id == SelectedProviderId;

        CurrentProviderName = SelectedProvider?.Name ?? "NeuralDeck";
    }

    /// <summary>
    /// Marks the given provider's ChromeProviderViewModel as the visible one (creating it on
    /// first use), and every other one as not — never destroys/recreates an existing browser,
    /// so its Chrome process and session keep running in the background.
    /// </summary>
    private void ActivateBrowserFor(string providerId)
    {
        if (providerId == "ollama" || SelectedProvider == null) return;

        var target = BrowserViewModels.FirstOrDefault(b => b.ProviderId == providerId);
        if (target == null)
        {
            target = new ChromeProviderViewModel(providerId, SelectedProvider.Url);
            BrowserViewModels.Add(target);
        }

        foreach (var b in BrowserViewModels)
            b.IsSelected = b == target;
    }

    internal void SelectProvider(string providerId)
    {
        SelectedProviderId = providerId;
        ConfigService.Instance.UpdateGeneral(lastProvider: providerId);
        UpdateSelectedProvider();
        ActivateBrowserFor(providerId);
    }

    [RelayCommand]
    private void TogglePin()
    {
        IsPinned = !IsPinned;
        WindowService.Instance.SetAlwaysOnTop(IsPinned);
        ConfigService.Instance.UpdateWindow(w => w.AlwaysOnTop = IsPinned);
    }

    [RelayCommand]
    private void OpenSettings()
    {
        WindowService.Instance.OpenSettingsWindow();
    }

    [RelayCommand]
    private void CloseSettings()
    {
        WindowService.Instance.CloseSettingsWindow();
    }

    [RelayCommand]
    private void HideWindow()
    {
        WindowService.Instance.HideWindow();
    }

    // Reload/back/forward have no hook into the embedded Chrome process from here — it has its
    // own navigation via its own keyboard shortcuts (Ctrl+R, Alt+Left/Right) once focused. Kept
    // as no-ops (rather than removed) so ShortcutService's existing bindings don't need to
    // special-case "current provider is a browser pane".
    internal void ReloadCurrentView() { }
    internal void GoBackInView() { }
    internal void GoForwardInView() { }

    private void OnConfigChanged(object? sender, AppConfig config)
    {
        Avalonia.Threading.Dispatcher.UIThread.Post(() =>
        {
            LoadProviders(config);
            UpdateSelectedProvider(config);
        });
    }

    public void OnOnboardingComplete()
    {
        ShowOnboarding = false;
        ConfigService.Instance.MarkFirstRunComplete();
        var config = ConfigService.Instance.GetConfig();
        LoadProviders(config);
        UpdateSelectedProvider(config);
        ActivateBrowserFor(SelectedProviderId);
    }

    public void Dispose()
    {
        ConfigService.Instance.ConfigChanged -= OnConfigChanged;
        ChatViewModel?.Dispose();
        ChatViewModel = null;
    }
}
