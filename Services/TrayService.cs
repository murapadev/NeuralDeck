using System;
using Avalonia.Controls;
using Avalonia.Platform;

namespace NeuralDeck.Services;

public class TrayService
{
    private static TrayService? _instance;
    private Window? _trayIconWindow;
    private bool _isInitialized;

    public static TrayService Instance => _instance ??= new TrayService();

    private TrayService() { }

    public void Initialize(Window mainWindow)
    {
        if (_isInitialized) return;
        _trayIconWindow = mainWindow;
        _isInitialized = true;
    }

    public void ShowNotification(string title, string message)
    {
        Console.WriteLine($"[TrayService] Notification: {title} - {message}");
    }

    public void UpdateMenu()
    {
        // Menu update when providers change
    }

    public void Dispose()
    {
        _trayIconWindow = null;
        _isInitialized = false;
    }
}
