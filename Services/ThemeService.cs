using System;
using Avalonia;
using Avalonia.Media;
using Avalonia.Styling;
using Avalonia.Threading;
using NeuralDeck.Models;

namespace NeuralDeck.Services;

/// <summary>
/// Applies user appearance settings (theme variant and accent color) to the live app at runtime.
/// The accent color is published as an application-level resource <c>AccentBrush</c> / <c>AccentColor</c>
/// so XAML bindings that resolve {DynamicResource AccentBrush} get updated automatically.
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
        Apply(config.Appearance.Theme, config.Appearance.AccentColor);
    }

    /// <summary>
    /// Apply a specific theme and accent right now (used by Settings live-preview so the user
    /// sees the change immediately, before — or without — clicking Save).
    /// </summary>
    public void Apply(string? theme, string? accentHex)
    {
        Dispatcher.UIThread.Post(() =>
        {
            ApplyTheme(theme);
            ApplyAccent(accentHex);
        });
    }

    private static void ApplyTheme(string? theme)
    {
        var app = Application.Current;
        if (app == null) return;

        app.RequestedThemeVariant = theme?.ToLowerInvariant() switch
        {
            "light" => ThemeVariant.Light,
            "dark"  => ThemeVariant.Dark,
            _        => ThemeVariant.Default, // "system" / null falls back to OS
        };
    }

    private static void ApplyAccent(string? hex)
    {
        var app = Application.Current;
        if (app == null) return;

        if (string.IsNullOrWhiteSpace(hex)) hex = AppConstants.DefaultAccentColor;

        Color color;
        try { color = Color.Parse(hex); }
        catch { color = Color.Parse(AppConstants.DefaultAccentColor); }

        // Publish as app-level resources so DynamicResource consumers update live.
        app.Resources["AccentColor"] = color;
        app.Resources["AccentBrush"] = new SolidColorBrush(color);
    }
}
