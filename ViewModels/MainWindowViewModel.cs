using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
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

    public bool ShowChatView => CurrentView == "chat" && SelectedProviderId == "ollama";
    public bool ShowProviderView => CurrentView == "chat" && SelectedProviderId != "ollama";

    public MainWindowViewModel()
    {
        ChatViewModel = new ChatViewModel();
        SettingsViewModel = new SettingsViewModel();
        OnboardingViewModel = new OnboardingViewModel();
        OnboardingViewModel.OnboardingComplete += (_, _) => OnOnboardingComplete();
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

    [RelayCommand]
    private void OpenProviderInBrowser()
    {
        if (string.IsNullOrEmpty(SelectedProvider?.Url)) return;
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = SelectedProvider.Url,
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MainWindowViewModel] Failed to open browser: {ex.Message}");
        }
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
        ChatViewModel?.Dispose();
        ChatViewModel = null;
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
