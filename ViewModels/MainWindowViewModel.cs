using System;
using System.Collections.ObjectModel;
using System.Linq;
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
    private string _currentView = "chat";

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(ShowChatView))]
    [NotifyPropertyChangedFor(nameof(ShowProviderView))]
    private string _selectedProviderId = "ollama";

    [ObservableProperty] private bool _showOnboarding = false;
    [ObservableProperty] private bool _isPinned = true;
    [ObservableProperty] private ObservableCollection<ProviderDisplay> _enabledProviders = new();
    [ObservableProperty] private ChatViewModel? _chatViewModel;
    [ObservableProperty] private SettingsViewModel? _settingsViewModel;
    [ObservableProperty] private OnboardingViewModel? _onboardingViewModel;
    [ObservableProperty] private ProviderConfig? _selectedProvider;
    [ObservableProperty] private WebBrowserViewModel? _webBrowserViewModel;

    public bool ShowChatView => CurrentView == "chat" && SelectedProviderId == "ollama";
    public bool ShowProviderView => CurrentView == "chat" && SelectedProviderId != "ollama";

    public MainWindowViewModel()
    {
        ChatViewModel = new ChatViewModel();
        SettingsViewModel = new SettingsViewModel();
        OnboardingViewModel = new OnboardingViewModel();
        WebBrowserViewModel = new WebBrowserViewModel();
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

            if (SelectedProviderId != "ollama" && SelectedProvider != null)
                WebBrowserViewModel?.NavigateTo(SelectedProvider.Url);
        }
        catch
        {
            ShowOnboarding = true;
        }
    }

    private void LoadProviders(AppConfig config)
    {
        EnabledProviders.Clear();
        foreach (var provider in config.Providers.Where(p => p.Enabled).OrderBy(p => p.Order))
        {
            var captured = provider;
            EnabledProviders.Add(new ProviderDisplay
            {
                Name = captured.Name,
                Color = captured.Color,
                Id = captured.Id,
                IsSelected = captured.Id == SelectedProviderId,
                SelectCommand = new RelayCommand(() => SelectProvider(captured.Id))
            });
        }
    }

    private void UpdateSelectedProvider(AppConfig? config = null)
    {
        config ??= ConfigService.Instance.GetConfig();
        SelectedProvider = config.Providers.FirstOrDefault(p => p.Id == SelectedProviderId);
        foreach (var p in EnabledProviders)
            p.IsSelected = p.Id == SelectedProviderId;
    }

    private void SelectProvider(string providerId)
    {
        SelectedProviderId = providerId;
        ConfigService.Instance.UpdateGeneral(lastProvider: providerId);
        UpdateSelectedProvider();
        CurrentView = "chat";

        if (providerId != "ollama" && SelectedProvider != null)
            WebBrowserViewModel?.NavigateTo(SelectedProvider.Url);
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
        SettingsViewModel?.LoadSettings();
        CurrentView = "settings";
    }

    [RelayCommand]
    private void CloseSettings()
    {
        CurrentView = "chat";
    }

    [RelayCommand]
    private void HideWindow()
    {
        WindowService.Instance.HideWindow();
    }

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
    }

    public void Dispose()
    {
        ConfigService.Instance.ConfigChanged -= OnConfigChanged;
        ChatViewModel?.Dispose();
        ChatViewModel = null;
        WebBrowserViewModel = null;
    }
}

public partial class ProviderDisplay : ObservableObject
{
    [ObservableProperty] private bool _isSelected;
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#6366f1";
    public string Id { get; set; } = "";
    public ICommand SelectCommand { get; set; } = null!;
}
