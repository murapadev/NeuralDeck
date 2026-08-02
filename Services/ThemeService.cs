using Avalonia;
using Avalonia.Media;
using Avalonia.Styling;
using Avalonia.Threading;
using NeuralDeck.Models;

namespace NeuralDeck.Services;

/// <summary>
/// Applies user appearance settings (theme, accent color, font size) to the live app at runtime.
/// Resources published here are DynamicResource-accessible from all AXAML files.
/// </summary>
public sealed class ThemeService
{
    private static ThemeService? _instance;
    public static ThemeService Instance => _instance ??= new ThemeService();

    private ThemeService() { }

    public void Initialize()
    {
        ApplyFromConfig();
        ConfigService.Instance.ConfigChanged += (_, _) =>
            Dispatcher.UIThread.Post(ApplyFromConfig);
    }

    public void ApplyFromConfig()
    {
        var config = ConfigService.Instance.GetConfig();
        Apply(config.Appearance.Theme, config.Appearance.AccentColor, config.Appearance.FontSize);
    }

    /// <summary>
    /// Apply theme, accent and font size immediately (used by Settings live-preview).
    /// </summary>
    public void Apply(string? theme, string? accentHex, string? fontSize = null)
    {
        Dispatcher.UIThread.Post(() =>
        {
            ApplyTheme(theme);
            ApplyAccent(accentHex);
            ApplyFontSize(fontSize);
        });
    }

    private static void ApplyTheme(string? theme)
    {
        var app = Application.Current;
        if (app == null) return;

        app.RequestedThemeVariant = theme?.ToLowerInvariant() switch
        {
            "light"  => ThemeVariant.Light,
            "dark"   => ThemeVariant.Dark,
            _        => ThemeVariant.Default
        };
    }

    private static void ApplyAccent(string? hex)
    {
        var app = Application.Current;
        if (app == null) return;

        if (string.IsNullOrWhiteSpace(hex)) hex = ProviderDefaults.DefaultAccentColor;

        Color color;
        try { color = Color.Parse(hex); }
        catch (Exception ex)
        {
            Console.WriteLine($"[ThemeService] Invalid accent color '{hex}', using default: {ex.Message}");
            color = Color.Parse(ProviderDefaults.DefaultAccentColor);
        }

        app.Resources["AccentColor"] = color;
        app.Resources["AccentBrush"] = new SolidColorBrush(color);
    }

    private static void ApplyFontSize(string? size)
    {
        var app = Application.Current;
        if (app == null) return;

        double pts = size?.ToLowerInvariant() switch
        {
            "small"  => 11.0,
            "large"  => 15.0,
            _        => 13.0
        };

        // Published as DynamicResource so styles referencing {DynamicResource BaseFontSize}
        // update live without a restart.
        app.Resources["BaseFontSize"] = pts;
    }
}
