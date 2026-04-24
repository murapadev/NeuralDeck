using Avalonia;
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
            _mainWindowViewModel = new MainWindowViewModel();
            var mainWindow = new MainWindow
            {
                DataContext = _mainWindowViewModel
            };

            WindowService.Instance.SetMainWindow(mainWindow);
            TrayService.Instance.Initialize(mainWindow);
            ShortcutService.Instance.Initialize(mainWindow);

            try
            {
                var config = ConfigService.Instance.GetConfig();
                mainWindow.Topmost = config.Window.AlwaysOnTop;
                mainWindow.Opacity = config.Window.Opacity;
                var (x, y) = WindowService.Instance.CalculateWindowPosition();
                mainWindow.Position = new PixelPoint(x, y);
            }
            catch { }

            desktop.MainWindow = mainWindow;
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
        }
        catch { }
    }
}
