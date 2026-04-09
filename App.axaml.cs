using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Data.Core.Plugins;
using Avalonia.Layout;
using Avalonia.Media;
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
            var mainWindow = new MainWindow
            {
                DataContext = new MainWindowViewModel()
            };

            // Set window position from config
            var config = ConfigService.Instance.GetConfig();
            if (config.Window.Position != Models.WindowPosition.Default)
            {
                mainWindow.Position = config.Window.Position switch
                {
                    Models.WindowPosition.TopRight => new PixelPoint((int)(1920 - 450), 50),
                    Models.WindowPosition.BottomRight => new PixelPoint((int)(1920 - 450), (int)(1080 - 750)),
                    _ => mainWindow.Position
                };
            }

            desktop.MainWindow = mainWindow;
        }

        base.OnFrameworkInitializationCompleted();
    }
}