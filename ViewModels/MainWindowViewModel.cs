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
    private readonly Action _onOnboardingComplete;

    [ObservableProperty]
    private string _currentView = "chat";

    [ObservableProperty]
    private bool _isLoading = false;

    [ObservableProperty]
    private bool _showOnboarding = false;

    [ObservableProperty]
    private bool _isPinned = true;

    [ObservableProperty]
    private ObservableCollection<ProviderDisplay> _enabledProviders = new();

    [ObservableProperty]
    private ChatViewModel? _chatViewModel;

    public MainWindowViewModel(Action? onOnboardingComplete = null)
    {
        _onOnboardingComplete = onOnboardingComplete ?? (() => { });
        ChatViewModel = new ChatViewModel();
        LoadConfig();
    }

    private void LoadConfig()
    {
        try
        {
            var config = ConfigService.Instance.GetConfig();
            ShowOnboarding = config.FirstRun;

            EnabledProviders.Clear();
            foreach (var provider in config.Providers.Where(p => p.Enabled))
            {
                EnabledProviders.Add(new ProviderDisplay
                {
                    Name = provider.Name,
                    Color = provider.Color,
                    Enabled = provider.Enabled
                });
            }

            IsPinned = config.Window.AlwaysOnTop;
        }
        catch
        {
            ShowOnboarding = true;
        }
    }

    [RelayCommand]
    private void TogglePin()
    {
        IsPinned = !IsPinned;
    }

    [RelayCommand]
    private void OpenSettings()
    {
        CurrentView = "settings";
    }

    [RelayCommand]
    private void SelectProvider(ProviderDisplay? provider)
    {
        if (provider != null)
        {
            CurrentView = "chat";
        }
    }

    [RelayCommand]
    private void CloseSettings()
    {
        CurrentView = "chat";
    }

    public void OnOnboardingComplete()
    {
        ShowOnboarding = false;
        _onOnboardingComplete();
        ConfigService.Instance.MarkFirstRunComplete();
    }
}

public class ProviderDisplay
{
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#6366f1";
    public bool Enabled { get; set; }
}