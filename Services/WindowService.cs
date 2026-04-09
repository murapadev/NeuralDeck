using System;
using Avalonia;
using Avalonia.Controls;
using NeuralDeck.Models;

namespace NeuralDeck.Services;

public class WindowService
{
    private static WindowService? _instance;
    private Window? _mainWindow;
    private Window? _settingsWindow;
    private bool _isWindowVisible;

    public static WindowService Instance => _instance ??= new WindowService();

    public event EventHandler? WindowShown;
    public event EventHandler? WindowHidden;

    private WindowService() { }

    public void SetMainWindow(Window window)
    {
        _mainWindow = window;
        _isWindowVisible = window.IsVisible;

        window.PositionChanged += (s, e) =>
        {
            var config = ConfigService.Instance.GetConfig();
            if (config.Window.Position == "remember")
            {
                var pos = window.Position;
                ConfigService.Instance.UpdateWindow(w => { w.LastX = pos.X; w.LastY = pos.Y; });
            }
        };

        window.Closing += (s, e) =>
        {
            // Hide instead of close
            e.Cancel = true;
            HideWindow();
        };
    }

    public Window? GetMainWindow() => _mainWindow;

    public void ShowWindow()
    {
        if (_mainWindow == null) return;

        var (x, y) = CalculateWindowPosition();
        _mainWindow.Position = new PixelPoint(x, y);
        _mainWindow.Show();
        _mainWindow.Activate();
        _isWindowVisible = true;
        WindowShown?.Invoke(this, EventArgs.Empty);
    }

    public void HideWindow()
    {
        if (_mainWindow == null) return;

        var config = ConfigService.Instance.GetConfig();
        if (config.Window.Position == "remember")
        {
            var pos = _mainWindow.Position;
            ConfigService.Instance.UpdateWindow(w => { w.LastX = pos.X; w.LastY = pos.Y; });
        }

        _mainWindow.Hide();
        _isWindowVisible = false;
        WindowHidden?.Invoke(this, EventArgs.Empty);
    }

    public void ToggleWindow()
    {
        if (_isWindowVisible)
            HideWindow();
        else
            ShowWindow();
    }

    public bool IsVisible => _isWindowVisible;

    public (int x, int y) CalculateWindowPosition()
    {
        var config = ConfigService.Instance.GetConfig();
        var screen = _mainWindow?.Screens?.Primary;

        int screenWidth, screenHeight;
        if (screen != null)
        {
            screenWidth = screen.WorkingArea.Width;
            screenHeight = screen.WorkingArea.Height;
        }
        else
        {
            // Fallback to display primary metrics
            screenWidth = 1920;
            screenHeight = 1080;
        }

        var windowWidth = config.Window.Width;
        var windowHeight = config.Window.Height;
        var margin = 10;

        if (config.Window.Position == "remember" && config.Window.LastX.HasValue && config.Window.LastY.HasValue)
        {
            return (config.Window.LastX.Value, config.Window.LastY.Value);
        }

        return config.Window.Position switch
        {
            "top-left" => (margin, margin),
            "top-right" => (screenWidth - windowWidth - margin, margin),
            "bottom-left" => (margin, screenHeight - windowHeight - margin),
            "bottom-right" => (screenWidth - windowWidth - margin, screenHeight - windowHeight - margin),
            "center" => (
                (screenWidth - windowWidth) / 2,
                (screenHeight - windowHeight) / 2),
            _ => (screenWidth - windowWidth - margin, margin) // near-tray defaults to top-right
        };
    }

    public void SetAlwaysOnTop(bool value)
    {
        if (_mainWindow == null) return;
        _mainWindow.Topmost = value;
    }

    public void SetOpacity(double opacity)
    {
        if (_mainWindow == null) return;
        _mainWindow.Opacity = Math.Max(0.1, Math.Min(1.0, opacity));
    }

    public void OpenSettingsWindow()
    {
        if (_settingsWindow != null)
        {
            _settingsWindow.Activate();
            return;
        }

        _settingsWindow = new Window
        {
            Width = 900,
            Height = 700,
            MinWidth = 800,
            MinHeight = 600,
            Title = "NeuralDeck Settings",
            CanResize = true,
            ShowInTaskbar = true
        };

        _settingsWindow.Closed += (s, e) => _settingsWindow = null;
        _settingsWindow.Show();
    }

    public void CloseSettingsWindow()
    {
        _settingsWindow?.Close();
        _settingsWindow = null;
    }

    public void SaveWindowSize(int width, int height)
    {
        ConfigService.Instance.UpdateWindow(w => { w.Width = width; w.Height = height; });
    }
}
