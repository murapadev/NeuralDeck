using System;
using System.IO;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Notifications;
using NeuralDeck.Models;

namespace NeuralDeck.Services;

public class TrayService
{
    private static TrayService? _instance;
    private TrayIcon? _trayIcon;
    private Window? _mainWindow;
    private bool _isInitialized;

    public static TrayService Instance => _instance ??= new TrayService();

    public event EventHandler? TrayLeftClick;

    private TrayService() { }

    public void Initialize(Window mainWindow)
    {
        if (_isInitialized) return;

        _mainWindow = mainWindow;
        
        try
        {
            // Create tray icon
            _trayIcon = new TrayIcon
            {
                ToolTipText = "NeuralDeck",
                IsVisible = true
            };

            // Try to set icon from file
            var iconPath = GetTrayIconPath();
            if (!string.IsNullOrEmpty(iconPath) && File.Exists(iconPath))
            {
                _trayIcon.Icon = new WindowIcon(iconPath);
            }

            // Create context menu
            UpdateMenu();

            // Handle left click - toggle window
            _trayIcon.Clicked += (s, e) =>
            {
                TrayLeftClick?.Invoke(this, EventArgs.Empty);
                WindowService.Instance.ToggleWindow();
            };

            _isInitialized = true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TrayService] Failed to initialize tray: {ex.Message}");
        }
    }

    private string? GetTrayIconPath()
    {
        var basePath = AppDomain.CurrentDomain.BaseDirectory;
        var iconPath = Path.Combine(basePath, "Assets", "Icons", "tray.ico");
        
        if (File.Exists(iconPath))
            return iconPath;
        
        iconPath = Path.Combine(basePath, "tray.ico");
        if (File.Exists(iconPath))
            return iconPath;
        
        return null;
    }

    public void ShowNotification(string title, string message)
    {
        Console.WriteLine($"[TrayService] Notification: {title} - {message}");

        try
        {
            if (_mainWindow != null)
            {
                // WindowNotificationManager doesn't need explicit disposal
                var notificationManager = new WindowNotificationManager(_mainWindow);
                notificationManager.Show(new Notification(title, message, NotificationType.Information));
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TrayService] Notification failed: {ex.Message}");
        }
    }

    public void UpdateMenu()
    {
        if (_trayIcon == null) return;

        try
        {
            var config = ConfigService.Instance.GetConfig();
            var menu = new NativeMenu();

            // Providers submenu
            var providersMenuItem = new NativeMenuItem { Header = "Providers" };
            var providersSubmenu = new NativeMenu();

            foreach (var provider in config.Providers)
            {
                var item = new NativeMenuItem
                {
                    Header = provider.Name,
                    IsEnabled = provider.Enabled
                };
                item.Click += (s, e) =>
                {
                    Console.WriteLine($"[TrayService] Switch to provider: {provider.Name}");
                };
                providersSubmenu.Items.Add(item);
            }

            providersMenuItem.Menu = providersSubmenu;
            menu.Items.Add(providersMenuItem);

            menu.Items.Add(new NativeMenuItem { Header = "-" });

            // Toggle window
            var toggleItem = new NativeMenuItem { Header = "Show/Hide NeuralDeck" };
            toggleItem.Click += (s, e) => WindowService.Instance.ToggleWindow();
            menu.Items.Add(toggleItem);

            // Settings
            var settingsItem = new NativeMenuItem { Header = "Settings" };
            settingsItem.Click += (s, e) => WindowService.Instance.OpenSettingsWindow();
            menu.Items.Add(settingsItem);

            menu.Items.Add(new NativeMenuItem { Header = "-" });

            // Quit
            var quitItem = new NativeMenuItem { Header = "Quit" };
            quitItem.Click += (s, e) =>
            {
                if (_mainWindow != null)
                {
                    _mainWindow.Close();
                }
                Environment.Exit(0);
            };
            menu.Items.Add(quitItem);

            _trayIcon.Menu = menu;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TrayService] Failed to update menu: {ex.Message}");
        }
    }

    public void Dispose()
    {
        if (_trayIcon != null)
        {
            _trayIcon.IsVisible = false;
            _trayIcon.Menu = null;
            _trayIcon.Dispose();
            _trayIcon = null;
        }
        _mainWindow = null;
        _isInitialized = false;
    }
}
