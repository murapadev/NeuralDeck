using System;
using System.Collections.ObjectModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NeuralDeck.Models;
using NeuralDeck.Services;

namespace NeuralDeck.ViewModels;

public partial class MainWindowViewModel : ViewModelBase
{
    [ObservableProperty]
    private bool _isLoading = true;

    [ObservableProperty]
    private bool _showOnboarding;

    [ObservableProperty]
    private string? _currentProviderId;

    [ObservableProperty]
    private bool _isPinned;

    [ObservableProperty]
    private bool _showProviderNames;

    [ObservableProperty]
    private string _currentView = "chat"; // "chat" or "settings"

    [ObservableProperty]
    private ViewModelBase? _currentViewModel;

    public ObservableCollection<ProviderConfig> EnabledProviders { get; } = new();

    private readonly ConfigService _configService;
    private readonly OllamaService _ollamaService;

    public ChatViewModel ChatViewModel { get; }
    public SettingsViewModel SettingsViewModel { get; }

    public MainWindowViewModel()
    {
        _configService = ConfigService.Instance;
        _ollamaService = OllamaService.Instance;

        ChatViewModel = new ChatViewModel();
        SettingsViewModel = new SettingsViewModel();

        // Load config
        var config = _configService.GetConfig();
        ShowOnboarding = config.FirstRun;
        IsPinned = config.Window.AlwaysOnTop;
        ShowProviderNames = config.Appearance.ShowProviderNames;

        // Load enabled providers
        RefreshProviders();

        // Set initial view
        if (config.LastProvider == "ollama" || config.LastProvider == null)
        {
            CurrentView = "chat";
            CurrentViewModel = ChatViewModel;
        }

        IsLoading = false;
    }

    public void RefreshProviders()
    {
        EnabledProviders.Clear();
        var providers = _configService.GetEnabledProviders();
        foreach (var p in providers)
        {
            EnabledProviders.Add(p);
        }
    }

    [RelayCommand]
    private void TogglePin()
    {
        IsPinned = !IsPinned;
        _configService.UpdateWindow(w => w.AlwaysOnTop = IsPinned);
        WindowService.Instance.SetAlwaysOnTop(IsPinned);
    }

    [RelayCommand]
    private void OpenSettings()
    {
        CurrentView = "settings";
        CurrentViewModel = SettingsViewModel;
    }

    [RelayCommand]
    private void SelectProvider(ProviderConfig provider)
    {
        CurrentProviderId = provider.Id;

        if (provider.Id == "ollama")
        {
            CurrentView = "chat";
            CurrentViewModel = ChatViewModel;
        }
        else
        {
            // For other providers, we would open in a WebView
            // For now, just switch to chat as placeholder
            CurrentView = "chat";
            CurrentViewModel = ChatViewModel;
        }

        _configService.UpdateGeneral(lastProvider: provider.Id);
    }

    [RelayCommand]
    private void OpenProviderInBrowser(ProviderConfig provider)
    {
        // Open in external browser
        try
        {
            var url = provider.Url;
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MainWindowViewModel] Failed to open URL: {ex.Message}");
        }
    }

    public void OnOnboardingComplete()
    {
        ShowOnboarding = false;
        _configService.MarkFirstRunComplete();
    }

    public void ToggleSidebarExpanded()
    {
        ShowProviderNames = !ShowProviderNames;
        _configService.UpdateAppearance(a => a.ShowProviderNames = ShowProviderNames);
    }
}
