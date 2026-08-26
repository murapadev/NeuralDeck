using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using NeuralDeck.Services;
using NeuralDeck.ViewModels;
using NeuralDeck.Views;

namespace NeuralDeck;

public partial class App : Application
{
    private MainWindowViewModel? _mainWindowViewModel;

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            desktop.ShutdownMode = ShutdownMode.OnExplicitShutdown;

            _mainWindowViewModel = new MainWindowViewModel();
            var mainWindow = new MainWindow
            {
                DataContext = _mainWindowViewModel
            };

            ThemeService.Instance.Initialize();
            WindowService.Instance.SetMainWindow(mainWindow);
            TrayService.Instance.Initialize(mainWindow, _mainWindowViewModel);
            ShortcutService.Instance.Initialize(mainWindow, _mainWindowViewModel);

            try
            {
                var config = ConfigService.Instance.GetConfig();
                mainWindow.Width = config.Window.Width;
                mainWindow.Height = config.Window.Height;
                mainWindow.Topmost = config.Window.AlwaysOnTop;
                mainWindow.Opacity = config.Window.Opacity;
                var (x, y) = WindowService.Instance.CalculateWindowPosition();
                mainWindow.Position = new PixelPoint(x, y);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[App] Failed to apply startup config: {ex.Message}");
            }

            desktop.MainWindow = mainWindow;
            desktop.ShutdownRequested += (_, _) => WindowService.Instance.PrepareForShutdown();
            desktop.Exit += OnExit;
        }

        base.OnFrameworkInitializationCompleted();
    }

    private void OnExit(object? sender, ControlledApplicationLifetimeExitEventArgs e)
    {
        try
        {
            // Embedded providers are separate OS processes (see ChromeEmbedHost) — normal
            // process exit doesn't kill them, so without this every visited provider's Chrome
            // instance is orphaned and keeps running (and consuming RAM/CPU) after quit.
            ChromeEmbedHost.KillAllEmbeddedChrome();
            OllamaService.Instance.Dispose();
            TrayService.Instance.Dispose();
            ShortcutService.Instance?.Dispose();
            WindowService.Instance.Dispose();
            _mainWindowViewModel?.Dispose();

            if (ConfigService.Instance.GetConfig().Privacy.ClearOnClose)
            {
                ConversationStore.Clear();
                ClearWebViewData();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[App] Exit cleanup failed: {ex.Message}");
        }
    }

    // ClearOnClose used to wipe only the Ollama history, leaving the WebView (cookies,
    // localStorage, IndexedDB) logged into ChatGPT/Claude/etc. — a broken privacy promise.
    // The WebKitGTK control exposes no programmatic clear API, so we delete its on-disk
    // website-data and cache directories. WebKitGTK names them after the program (g_get_prgname,
    // here "NeuralDeck") under the XDG data/cache roots. Config lives in a separate dir
    // (ApplicationData/NeuralDeck), so it is never touched.
    private static void ClearWebViewData()
    {
        if (!OperatingSystem.IsLinux()) return;

        var appName = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Name ?? "NeuralDeck";
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

        var dataHome = Environment.GetEnvironmentVariable("XDG_DATA_HOME");
        if (string.IsNullOrEmpty(dataHome)) dataHome = System.IO.Path.Combine(home, ".local", "share");

        var cacheHome = Environment.GetEnvironmentVariable("XDG_CACHE_HOME");
        if (string.IsNullOrEmpty(cacheHome)) cacheHome = System.IO.Path.Combine(home, ".cache");

        foreach (var dir in new[]
                 {
                     System.IO.Path.Combine(dataHome, appName),
                     System.IO.Path.Combine(cacheHome, appName),
                 })
        {
            try
            {
                if (System.IO.Directory.Exists(dir))
                    System.IO.Directory.Delete(dir, recursive: true);
            }
            catch (Exception ex)
            {
                // Files may still be locked by the WebKit network process during shutdown;
                // best-effort, log and move on rather than blocking exit.
                Console.WriteLine($"[App] Failed to clear WebView data at {dir}: {ex.Message}");
            }
        }
    }
}
