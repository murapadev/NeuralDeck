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
            OllamaService.Instance.Dispose();
            TrayService.Instance.Dispose();
            ShortcutService.Instance?.Dispose();
            _mainWindowViewModel?.Dispose();

            if (ConfigService.Instance.GetConfig().Privacy.ClearOnClose)
                ConversationStore.Clear();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[App] Exit cleanup failed: {ex.Message}");
        }
    }
}
