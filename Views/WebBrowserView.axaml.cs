using System;
using System.Diagnostics;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using NeuralDeck.ViewModels;

namespace NeuralDeck.Views;

public partial class WebBrowserView : UserControl
{
    private WebBrowserViewModel? _viewModel;

    public WebBrowserView()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    protected override void OnLoaded(RoutedEventArgs e)
    {
        base.OnLoaded(e);
        AddressBar.KeyDown += OnAddressKeyDown;
    }

    protected override void OnUnloaded(RoutedEventArgs e)
    {
        base.OnUnloaded(e);
        AddressBar.KeyDown -= OnAddressKeyDown;
    }

    private void OnDataContextChanged(object? sender, EventArgs e)
    {
        _viewModel = DataContext as WebBrowserViewModel;
        if (_viewModel == null) return;

        _viewModel.OpenInBrowserAction = uri =>
        {
            try
            {
                Process.Start(new ProcessStartInfo { FileName = uri.ToString(), UseShellExecute = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WebBrowserView] Failed to open browser: {ex.Message}");
            }
        };
    }

    private void OnAddressKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Return || e.Key == Key.Enter)
        {
            _viewModel?.OpenInBrowserCommand.Execute(null);
            e.Handled = true;
        }
    }
}
