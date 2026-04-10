using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Controls;
using Avalonia.Media;
using Avalonia.Markup.Xaml;
using NeuralDeck.Services;
using NeuralDeck.ViewModels;
using NeuralDeck.Views;

namespace NeuralDeck;

public partial class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            var mainWindowViewModel = new MainWindowViewModel(OnOnboardingComplete);
            var mainWindow = new MainWindow
            {
                DataContext = mainWindowViewModel
            };

            // Set window position from config
            try
            {
                var config = ConfigService.Instance.GetConfig();
                if (config.Window.Position != "default" && config.Window.Position != "near-tray")
                {
                    mainWindow.Position = config.Window.Position switch
                    {
                        "top-right" => new PixelPoint(1470, 50),
                        "bottom-right" => new PixelPoint(1470, 330),
                        _ => mainWindow.Position
                    };
                }
                if (config.Window.AlwaysOnTop)
                {
                    mainWindow.Topmost = true;
                }
            }
            catch
            {
                // Config not available, use default position
            }

            desktop.MainWindow = mainWindow;

            // Dispose tray resources on exit; handler lifetime matches application lifetime.
            desktop.Exit += (s, e) => TrayService.Instance.Dispose();
        }

        base.OnFrameworkInitializationCompleted();
    }

    private void OnOnboardingComplete()
    {
        // Onboarding completed - could trigger additional setup here
    }
}