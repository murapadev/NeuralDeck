using System;
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NeuralDeck.Models;
using NeuralDeck.Services;

namespace NeuralDeck.ViewModels;

public partial class OnboardingViewModel : ViewModelBase
{
    [ObservableProperty]
    private int _currentStep = 0;

    [ObservableProperty]
    private bool _canGoBack;

    [ObservableProperty]
    private bool _canGoNext = true;

    [ObservableProperty]
    private bool _showFinishButton;

    public ObservableCollection<ProviderConfig> Providers { get; } = new();

    public event EventHandler? OnboardingComplete;

    public OnboardingViewModel()
    {
        LoadProviders();
        UpdateNavigation();
    }

    public int TotalSteps => 2;

    private void LoadProviders()
    {
        var config = ConfigService.Instance.GetConfig();
        Providers.Clear();
        foreach (var p in config.Providers)
        {
            Providers.Add(p.Clone());
        }
    }

    [RelayCommand]
    private void Next()
    {
        if (CurrentStep < 1)
        {
            CurrentStep++;
            UpdateNavigation();
        }
    }

    [RelayCommand]
    private void Back()
    {
        if (CurrentStep > 0)
        {
            CurrentStep--;
            UpdateNavigation();
        }
    }

    private void UpdateNavigation()
    {
        CanGoBack = CurrentStep > 0;
        CanGoNext = CurrentStep < 1;
        ShowFinishButton = CurrentStep == 1;
    }

    [RelayCommand]
    private void ToggleProvider(ProviderConfig provider)
    {
        provider.Enabled = !provider.Enabled;
    }

    [RelayCommand]
    private void Finish()
    {
        ConfigService.Instance.UpdateProviders(Providers.ToList());
        OnboardingComplete?.Invoke(this, EventArgs.Empty);
    }
}
