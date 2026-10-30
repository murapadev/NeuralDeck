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

    // One browser per visited web provider, each with its own isolated profile (cookies,
    // storage). Created lazily on first selection and kept alive while the provider stays
    // enabled, so switching back is instant and keeps the page/session where it was.
    public ObservableCollection<WebBrowserViewModel> Browsers { get; } = new();
    [ObservableProperty] private WebBrowserViewModel? _activeBrowser;

    public bool ShowChatView => SelectedProviderId == "ollama";
    public bool ShowProviderView => SelectedProviderId != "ollama";

    // claude.ai's Cloudflare bot-protection rejects the embedded WebKitGTK engine outright —
    // confirmed still blocked even with a completely fresh WebView session/cookies. There's no
    // in-app fix for that, so route it straight to the system browser instead of showing a
    // permanently broken pane.
    private static readonly HashSet<string> ExternalOnlyProviderIds = new(StringComparer.OrdinalIgnoreCase)
    {
        "claude"
    };

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

            // Don't "restore" a launch-externally provider into a permanently broken pane on
            // every startup — fall back to Ollama, same as if it had been deleted.
            if (ExternalOnlyProviderIds.Contains(SelectedProviderId))
                SelectedProviderId = "ollama";

            IsPinned = config.Window.AlwaysOnTop;
            LoadProviders(config);
            UpdateSelectedProvider(config);

            ActivateBrowser();
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
            if (ExternalOnlyProviderIds.Contains(captured.Id))
                hint += "  ↗ opens in browser";

            EnabledProviders.Add(new ProviderDisplay
            {
                Name = captured.Name,
                Color = captured.Color,
                Id = captured.Id,
                IsSelected = captured.Id == SelectedProviderId,
                ShortcutHint = hint,
                SelectCommand = new RelayCommand(() => SelectProvider(captured.Id, goHomeIfActive: true))
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

        // The selected provider can vanish out from under us (deleted or disabled in Settings while
        // active) — fall back to Ollama rather than leaving the view stuck on whatever the
        // now-nonexistent provider last rendered.
        if ((SelectedProvider == null || !SelectedProvider.Enabled) && SelectedProviderId != "ollama")
        {
            SelectProvider("ollama");
            return;
        }

        foreach (var p in EnabledProviders)
            p.IsSelected = p.Id == SelectedProviderId;

        CurrentProviderName = SelectedProvider?.Name ?? "NeuralDeck";
    }

    internal void SelectProvider(string providerId, bool goHomeIfActive = false)
    {
        if (ExternalOnlyProviderIds.Contains(providerId))
        {
            var provider = ConfigService.Instance.GetConfig().Providers.FirstOrDefault(p => p.Id == providerId);
            if (provider != null && Uri.TryCreate(provider.Url, UriKind.Absolute, out var uri))
                WindowService.OpenExternalUrl(uri);
            return;
        }

        var reselected = providerId == SelectedProviderId;
        SelectedProviderId = providerId;
        ConfigService.Instance.UpdateGeneral(lastProvider: providerId);
        UpdateSelectedProvider();

        // Clicking the sidebar entry of the provider already showing acts as "home". Hotkeys
        // don't (they are also used just to bring the window back).
        if (goHomeIfActive && reselected && ActiveBrowser != null && SelectedProvider != null)
            ActiveBrowser.NavigateTo(SelectedProvider.Url);
        else
            ActivateBrowser();
    }

    private void ActivateBrowser()
    {
        WebBrowserViewModel? target = null;
        if (SelectedProviderId != "ollama" && SelectedProvider != null)
        {
            target = Browsers.FirstOrDefault(b => b.ProviderId == SelectedProvider.Id);
            if (target == null)
            {
                target = new WebBrowserViewModel(SelectedProvider.Id, SelectedProvider.Url);
                Browsers.Add(target);
            }
        }

        foreach (var b in Browsers)
            b.IsActive = b == target;
        ActiveBrowser = target;
    }

    // Removing a browser detaches its NativeWebView, which tears down the provider's web
    // process; its on-disk profile stays so re-enabling the provider keeps the login.
    private void PruneBrowsers(AppConfig config)
    {
        var live = config.Providers.Where(p => p.Enabled).Select(p => p.Id).ToHashSet();
        foreach (var b in Browsers.Where(b => !live.Contains(b.ProviderId)).ToList())
            Browsers.Remove(b);
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

    internal void ReloadCurrentView()
    {
        if (SelectedProviderId == "ollama") return;
        ActiveBrowser?.ReloadAction?.Invoke();
    }

    internal void GoBackInView()
    {
        if (SelectedProviderId == "ollama") return;
        ActiveBrowser?.GoBackAction?.Invoke();
    }

    internal void GoForwardInView()
    {
        if (SelectedProviderId == "ollama") return;
        ActiveBrowser?.GoForwardAction?.Invoke();
    }

    private void OnConfigChanged(object? sender, AppConfig config)
    {
        Avalonia.Threading.Dispatcher.UIThread.Post(() =>
        {
            LoadProviders(config);
            PruneBrowsers(config);
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
    }

    public void Dispose()
    {
        ConfigService.Instance.ConfigChanged -= OnConfigChanged;
        ChatViewModel?.Dispose();
        ChatViewModel = null;
        Browsers.Clear();
        ActiveBrowser = null;
    }
}
