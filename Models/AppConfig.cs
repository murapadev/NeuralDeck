namespace NeuralDeck.Models;

public record Theme(string Value)
{
    public static readonly Theme Dark = new("dark");
    public static readonly Theme Light = new("light");
    public static readonly Theme System = new("system");
}

public record WindowPosition(string Value)
{
    public static readonly WindowPosition NearTray = new("near-tray");
    public static readonly WindowPosition TopLeft = new("top-left");
    public static readonly WindowPosition TopRight = new("top-right");
    public static readonly WindowPosition BottomLeft = new("bottom-left");
    public static readonly WindowPosition BottomRight = new("bottom-right");
    public static readonly WindowPosition Center = new("center");
    public static readonly WindowPosition Remember = new("remember");
}

public record FontSize(string Value)
{
    public static readonly FontSize Small = new("small");
    public static readonly FontSize Medium = new("medium");
    public static readonly FontSize Large = new("large");
}

public record Language(string Value)
{
    public static readonly Language English = new("en");
    public static readonly Language Spanish = new("es");
}
