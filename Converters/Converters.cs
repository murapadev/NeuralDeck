using System;
using System.Collections.Generic;
using System.Globalization;
using Avalonia;
using Avalonia.Data.Converters;
using Avalonia.Media;
using Avalonia.Media.Imaging;
using Avalonia.Platform;

namespace NeuralDeck.Converters;

public class BoolToVisibilityConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is bool boolValue)
        {
            bool isInverse = parameter?.ToString() == "Inverse";
            if (isInverse)
                return !boolValue;
            return boolValue;
        }
        return false;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return Avalonia.Data.BindingOperations.DoNothing;
    }
}

public class BoolToColorConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is bool boolValue)
        {
            return boolValue ? new SolidColorBrush(Color.Parse("#22c55e")) : new SolidColorBrush(Color.Parse("#ef4444"));
        }
        return new SolidColorBrush(Color.Parse("#71717a"));
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return Avalonia.Data.BindingOperations.DoNothing;
    }
}

public class StringToColorConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is string colorString)
        {
            try
            {
                return new SolidColorBrush(Color.Parse(colorString));
            }
            catch
            {
                return new SolidColorBrush(Colors.White);
            }
        }
        return new SolidColorBrush(Colors.White);
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return Avalonia.Data.BindingOperations.DoNothing;
    }
}

public class EqualityConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return value?.ToString() == parameter?.ToString();
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is bool b && b)
            return parameter;
        return Avalonia.Data.BindingOperations.DoNothing;
    }
}

public class FirstTwoConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is string str && str.Length >= 2)
        {
            return str.Substring(0, 2).ToUpper();
        }
        return "??";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return Avalonia.Data.BindingOperations.DoNothing;
    }
}

/// <summary>
/// Returns 1.0 when bool is true, else 0.0 — lets us hide/show elements whose BorderBrush
/// must still be a DynamicResource (so it updates when the accent color changes).
/// </summary>
public class BoolToOpacityConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        => value is bool b && b ? 1.0 : 0.0;

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => Avalonia.Data.BindingOperations.DoNothing;
}

/// <summary>
/// Returns white (#fafafa) when the bound string equals ConverterParameter, dim gray (#71717a) otherwise.
/// Used for settings tab button foreground highlighting.
/// </summary>
public class TabForegroundConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        bool active = value?.ToString() == parameter?.ToString();
        return new SolidColorBrush(active ? Color.Parse("#fafafa") : Color.Parse("#71717a"));
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => Avalonia.Data.BindingOperations.DoNothing;
}

/// <summary>
/// Returns a subtle highlight (#27272a) when active, transparent otherwise.
/// Used for settings tab button background.
/// </summary>
public class TabBackgroundConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        bool active = value?.ToString() == parameter?.ToString();
        return active
            ? new SolidColorBrush(Color.Parse("#27272a"))
            : new SolidColorBrush(Colors.Transparent);
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => Avalonia.Data.BindingOperations.DoNothing;
}

public class BoolToAccentConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        bool selected = value is bool b && b;
        if (!selected) return new SolidColorBrush(Colors.Transparent);

        // Resolve the live accent brush from Application resources.
        if (Application.Current?.Resources.TryGetResource("AccentBrush", null, out var res) == true
            && res is IBrush brush)
        {
            return brush;
        }
        return new SolidColorBrush(Color.Parse("#6366f1"));
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => Avalonia.Data.BindingOperations.DoNothing;
}

public class RoleToBrushConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is string role && role == "user")
            return new SolidColorBrush(Color.Parse("#1e1b4b"));
        return new SolidColorBrush(Color.Parse("#27272a"));
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => Avalonia.Data.BindingOperations.DoNothing;
}

public class StepToDotConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is int currentStep && parameter is string paramStr && int.TryParse(paramStr, out int dotStep))
        {
            return currentStep == dotStep ? new SolidColorBrush(Color.Parse("#fafafa")) : new SolidColorBrush(Color.Parse("#3f3f46"));
        }
        return new SolidColorBrush(Color.Parse("#3f3f46"));
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return Avalonia.Data.BindingOperations.DoNothing;
    }
}

/// <summary>
/// Maps a provider Id to its brand favicon (normalized 64×64 PNG) bundled in
/// Assets/Icons/providers/{id}.png. Returns null when the favicon is missing, so the
/// caller can fall back to the geometric ProviderIconConverter glyph for unknown or
/// user-added custom providers.
/// </summary>
public class ProviderFaviconConverter : IValueConverter
{
    private static readonly Dictionary<string, Bitmap?> Cache = new(StringComparer.OrdinalIgnoreCase);
    private static readonly HashSet<string> KnownIds = new(StringComparer.OrdinalIgnoreCase)
    { "chatgpt", "gemini", "claude", "deepseek", "perplexity", "ollama" };

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var key = value?.ToString() ?? "";
        if (!KnownIds.Contains(key)) return null;

        if (Cache.TryGetValue(key, out var cached)) return cached;

        try
        {
            var uri = new Uri($"avares://NeuralDeck/Assets/Icons/providers/{key.ToLowerInvariant()}.png");
            using var stream = AssetLoader.Open(uri);
            var bmp = new Bitmap(stream);
            Cache[key] = bmp;
            return bmp;
        }
        catch
        {
            Cache[key] = null;
            return null;
        }
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => Avalonia.Data.BindingOperations.DoNothing;
}

/// <summary>
/// Maps a provider Id to a distinctive geometric glyph (Geometry) used as a fallback for
/// custom providers that don't have a bundled favicon. Each glyph is drawn on a 24x24
/// viewbox using generic shapes (hexagon / sparkle / starburst / mountain / magnifying-glass).
/// </summary>
public class ProviderIconConverter : IValueConverter
{
    private static readonly Dictionary<string, string> IconData = new()
    {
        // ChatGPT → hexagon with inner dot-cluster
        ["chatgpt"] = "M 12 1.5 L 21 6.5 L 21 17.5 L 12 22.5 L 3 17.5 L 3 6.5 Z " +
                      "M 12 7 L 12 9 M 9.5 10.4 L 8 11.3 M 14.5 10.4 L 16 11.3 " +
                      "M 9.5 13.6 L 8 12.7 M 14.5 13.6 L 16 12.7 M 12 15 L 12 17",

        // Gemini → 4-point sparkle star
        ["gemini"] = "M 12 2 L 13.3 10.7 L 22 12 L 13.3 13.3 L 12 22 L 10.7 13.3 L 2 12 L 10.7 10.7 Z",

        // Claude → starburst asterisk (8 rays)
        ["claude"] = "M 12 2.5 L 12 9 L 16.5 4.5 L 13.5 10 L 21.5 8.5 L 15 12 " +
                     "L 21.5 15.5 L 13.5 14 L 16.5 19.5 L 12 15 L 12 21.5 L 7.5 19.5 " +
                     "L 10.5 14 L 2.5 15.5 L 9 12 L 2.5 8.5 L 10.5 10 L 7.5 4.5 Z",

        // DeepSeek → twin-peak mountain
        ["deepseek"] = "M 2 20 L 7 10 L 11.5 16 L 15 7 L 22 20 Z",

        // Perplexity → magnifying glass (question/search)
        ["perplexity"] = "M 10 2.5 A 7 7 0 1 0 10 16.5 A 7 7 0 1 0 10 2.5 Z " +
                          "M 10 5.5 A 4 4 0 1 1 10 13.5 A 4 4 0 1 1 10 5.5 Z " +
                          "M 15 14 L 21.5 20.5 L 20 22 L 13.5 15.5 Z",

        // Ollama → friendly llama silhouette
        ["ollama"] = "M 8 3 L 8 7 L 6 7 L 6 12 L 8 12 L 8 20 L 11 20 L 11 13 L 14 13 L 14 20 L 17 20 L 17 9 " +
                     "C 17 6 15 4 12 4 L 10 4 L 10 3 Z",

        // Grok (xAI) → stylised X
        ["grok"] = "M 5 4 L 10.5 12 L 5 20 L 7.5 20 L 12 14.5 L 16.5 20 L 19 20 L 13.5 12 L 19 4 L 16.5 4 L 12 9.5 L 7.5 4 Z",

        // Copilot → circular arc-wings
        ["copilot"] = "M 12 3 A 9 9 0 0 1 21 12 A 9 9 0 0 1 12 21 A 9 9 0 0 1 3 12 A 9 9 0 0 1 12 3 Z " +
                      "M 9 12 A 3 3 0 1 0 15 12 A 3 3 0 1 0 9 12 Z",

        // Mistral → three horizontal bars (AI wave pattern)
        ["mistral"] = "M 4 8 L 20 8 M 4 12 L 16 12 M 4 16 L 20 16",

        // Meta → infinity / M shape
        ["meta"] = "M 3 14 C 3 10 6 8 9 10 L 12 12 L 15 10 C 18 8 21 10 21 14 C 21 18 18 16 15 14 L 12 12 L 9 14 C 6 16 3 18 3 14 Z"
    };

    private static readonly string FallbackData = "M 4 4 L 20 4 L 20 20 L 4 20 Z"; // square fallback

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var key = value?.ToString()?.ToLowerInvariant() ?? "";
        var data = IconData.TryGetValue(key, out var d) ? d : FallbackData;
        try
        {
            return Geometry.Parse(data);
        }
        catch
        {
            return Geometry.Parse(FallbackData);
        }
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => Avalonia.Data.BindingOperations.DoNothing;
}
