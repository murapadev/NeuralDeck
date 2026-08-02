using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Notifications;
using Avalonia.Platform;
using NeuralDeck.Models;
using NeuralDeck.ViewModels;

namespace NeuralDeck.Services;

public class TrayService : IDisposable
{
    private static TrayService? _instance;
    private TrayIcon? _trayIcon;
    private Window? _mainWindow;
    private MainWindowViewModel? _mainViewModel;
    private WindowNotificationManager? _notificationManager;
    private bool _isInitialized;

    public static TrayService Instance => _instance ??= new TrayService();

    public event EventHandler? TrayLeftClick;

    private TrayService() { }

    public void Initialize(Window mainWindow, MainWindowViewModel? mainViewModel = null)
    {
        if (_isInitialized) return;

        _mainWindow = mainWindow;
        _mainViewModel = mainViewModel;

        try
        {
            _trayIcon = new TrayIcon
            {
                ToolTipText = "NeuralDeck — AI command center",
                IsVisible = true
            };

            var icon = TryLoadIcon();
            if (icon != null)
                _trayIcon.Icon = icon;

            UpdateMenu();

            _trayIcon.Clicked += OnTrayClicked;

            ConfigService.Instance.ConfigChanged += OnConfigChanged;

            _isInitialized = true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TrayService] Failed to initialize tray: {ex.Message}");
        }
    }

    private void OnTrayClicked(object? sender, EventArgs e)
    {
        TrayLeftClick?.Invoke(this, EventArgs.Empty);
        WindowService.Instance.ToggleWindow();
    }

    private void OnConfigChanged(object? sender, AppConfig config)
    {
        Avalonia.Threading.Dispatcher.UIThread.Post(UpdateMenu);
    }

    private static WindowIcon? TryLoadIcon()
    {
        // Avalonia resource paths use the avares:// scheme.
        string[] candidates =
        {
            "avares://NeuralDeck/Assets/Icons/tray.png",
            "avares://NeuralDeck/Assets/Icons/app.png"
        };

        foreach (var candidate in candidates)
        {
            try
            {
                using var stream = AssetLoader.Open(new Uri(candidate));
                return new WindowIcon(stream);
            }
            catch
            {
                // Fall through to next candidate.
            }
        }
        return null;
    }

    public void ShowNotification(string title, string message)
    {
        Console.WriteLine($"[TrayService] Notification: {title} — {message}");
        try
        {
            if (_mainWindow != null)
            {
                _notificationManager ??= new WindowNotificationManager(_mainWindow);
                _notificationManager.Show(new Notification(title, message, NotificationType.Information));
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

            // Toggle window (first item so it's the default on platforms that support it)
            var toggleItem = new NativeMenuItem { Header = WindowService.Instance.IsVisible ? "Hide NeuralDeck" : "Show NeuralDeck" };
            toggleItem.Click += (s, e) => WindowService.Instance.ToggleWindow();
            menu.Items.Add(toggleItem);

            menu.Items.Add(new NativeMenuItemSeparator());

            // Providers submenu — clicking a provider actually selects it and shows the window.
            var providersMenuItem = new NativeMenuItem { Header = "Providers" };
            var providersSubmenu = new NativeMenu();

            foreach (var provider in config.Providers
                         .Where(p => p.Enabled)
                         .OrderBy(p => p.Order))
            {
                var captured = provider;
                var item = new NativeMenuItem { Header = captured.Name };
                item.Click += (s, e) =>
                {
                    _mainViewModel?.SelectProvider(captured.Id);
                    WindowService.Instance.ShowWindow();
                };
                providersSubmenu.Items.Add(item);
            }

            if (providersSubmenu.Items.Count == 0)
            {
                providersSubmenu.Items.Add(new NativeMenuItem { Header = "(no providers enabled)", IsEnabled = false });
            }

            providersMenuItem.Menu = providersSubmenu;
            menu.Items.Add(providersMenuItem);

            menu.Items.Add(new NativeMenuItemSeparator());

            // Settings
            var settingsItem = new NativeMenuItem { Header = "Settings…" };
            settingsItem.Click += (s, e) => WindowService.Instance.OpenSettingsWindow();
            menu.Items.Add(settingsItem);

            menu.Items.Add(new NativeMenuItemSeparator());

            // Quit through WindowService so the main window's hide-on-close handler allows it.
            var quitItem = new NativeMenuItem { Header = "Quit" };
            quitItem.Click += (s, e) => ShutdownApp();
            menu.Items.Add(quitItem);

            _trayIcon.Menu = menu;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TrayService] Failed to update menu: {ex.Message}");
        }
    }

    private static void ShutdownApp()
    {
        WindowService.Instance.ShutdownApplication();
    }

    public void Dispose()
    {
        ConfigService.Instance.ConfigChanged -= OnConfigChanged;
        if (_trayIcon != null)
        {
            _trayIcon.Clicked -= OnTrayClicked;
            _trayIcon.IsVisible = false;
            _trayIcon.Menu = null;
            _trayIcon.Dispose();
            _trayIcon = null;
        }
        _notificationManager = null;
        _mainWindow = null;
        _mainViewModel = null;
        _isInitialized = false;
    }
}
