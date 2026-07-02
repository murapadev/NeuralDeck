using System;
using System.Threading;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Threading;
using NeuralDeck.Models;
using NeuralDeck.ViewModels;
using NeuralDeck.Views;

namespace NeuralDeck.Services;

public class WindowService
{
    private static WindowService? _instance;
    private Window? _mainWindow;
    private Window? _settingsWindow;
    private bool _isWindowVisible;
    private bool _allowClose;
    private Timer? _sizeDebounceTimer;
    private Timer? _positionDebounceTimer;

    public static WindowService Instance => _instance ??= new WindowService();

    public event EventHandler? WindowShown;
    public event EventHandler? WindowHidden;

    private WindowService() { }

    public void SetMainWindow(Window window)
    {
        _mainWindow = window;
        _isWindowVisible = window.IsVisible;

        window.Opened += (s, e) =>
        {
            _isWindowVisible = true;
            WindowShown?.Invoke(this, EventArgs.Empty);
        };

        window.PositionChanged += (s, e) =>
        {
            var config = ConfigService.Instance.GetConfig();
            if (config.Window.Position != "remember") return;

            // Debounce: dragging fires PositionChanged on every pixel. Without this, each event
            // wrote config.json + raised the global ConfigChanged (rebuilding sidebar/tray/
            // shortcuts/theme), causing jank and disk churn. Persist 350ms after the last move.
            var pos = window.Position;
            _positionDebounceTimer?.Dispose();
            _positionDebounceTimer = new Timer(
                _ => Dispatcher.UIThread.Post(() => SaveWindowPosition(pos.X, pos.Y)),
                null, 350, Timeout.Infinite);
        };

        window.SizeChanged += (s, e) =>
        {
            // Debounce: only save 350ms after the last resize event, not on every pixel change.
            _sizeDebounceTimer?.Dispose();
            var targetW = (int)e.NewSize.Width;
            var targetH = (int)e.NewSize.Height;
            _sizeDebounceTimer = new Timer(
                _ => Dispatcher.UIThread.Post(() => SaveWindowSize(targetW, targetH)),
                null, 350, Timeout.Infinite);
        };

        window.Deactivated += (s, e) =>
        {
            var config = ConfigService.Instance.GetConfig();
            // Don't hide while the settings window has focus — it's an owned dialog.
            if (config.Window.HideOnBlur && _isWindowVisible
                && (_settingsWindow == null || !_settingsWindow.IsVisible))
                HideWindow();
        };

        window.Closing += (s, e) =>
        {
            if (_allowClose)
            {
                _isWindowVisible = false;
                return;
            }

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

        int screenWidth, screenHeight, workingAreaX, workingAreaY;
        if (screen != null)
        {
            screenWidth = screen.WorkingArea.Width;
            screenHeight = screen.WorkingArea.Height;
            workingAreaX = screen.WorkingArea.X;
            workingAreaY = screen.WorkingArea.Y;
        }
        else
        {
            // Fallback to display primary metrics
            screenWidth = 1920;
            screenHeight = 1080;
            workingAreaX = 0;
            workingAreaY = 0;
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
            "top-left" => (workingAreaX + margin, workingAreaY + margin),
            "top-right" => (workingAreaX + screenWidth - windowWidth - margin, workingAreaY + margin),
            "bottom-left" => (workingAreaX + margin, workingAreaY + screenHeight - windowHeight - margin),
            "bottom-right" => (workingAreaX + screenWidth - windowWidth - margin, workingAreaY + screenHeight - windowHeight - margin),
            "center" => (
                workingAreaX + (screenWidth - windowWidth) / 2,
                workingAreaY + (screenHeight - windowHeight) / 2),
            _ => (workingAreaX + screenWidth - windowWidth - margin, workingAreaY + margin) // near-tray defaults to top-right
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
            _settingsWindow.Show();
            _settingsWindow.WindowState = WindowState.Normal;
            _settingsWindow.Activate();
            return;
        }

        var settingsVm = new SettingsViewModel();
        _settingsWindow = new SettingsWindow
        {
            DataContext = settingsVm
        };

        _settingsWindow.Closed += (s, e) =>
        {
            if (_settingsWindow?.DataContext is IDisposable d) d.Dispose();
            _settingsWindow = null;
            // Bring the main window back to the foreground so the user can keep working.
            Dispatcher.UIThread.Post(() => _mainWindow?.Activate());
        };

        // Make sure the settings window is centered and above the main window on first open.
        if (_mainWindow != null && _mainWindow.IsVisible)
            _settingsWindow.Show(_mainWindow);
        else
            _settingsWindow.Show();

        _settingsWindow.Activate();
    }

    public void CloseSettingsWindow()
    {
        _settingsWindow?.Close();
        _settingsWindow = null;
    }

    public void PrepareForShutdown()
    {
        _allowClose = true;
        _sizeDebounceTimer?.Dispose();
        _sizeDebounceTimer = null;
        _positionDebounceTimer?.Dispose();
        _positionDebounceTimer = null;
    }

    public void ShutdownApplication()
    {
        PrepareForShutdown();

        if (Application.Current?.ApplicationLifetime is
            Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime desktop)
        {
            desktop.Shutdown();
        }
        else
        {
            Environment.Exit(0);
        }
    }

    public void SaveWindowSize(int width, int height)
    {
        ConfigService.Instance.UpdateWindow(w => { w.Width = width; w.Height = height; });
    }

    public void SaveWindowPosition(int x, int y)
    {
        ConfigService.Instance.UpdateWindow(w => { w.LastX = x; w.LastY = y; });
    }
}
