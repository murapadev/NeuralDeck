using Avalonia.Input;
using NeuralDeck.Models;
using NeuralDeck.Services;
using SharpHook.Data;
using Xunit;

namespace NeuralDeck.Tests;

// SharpHook 8 renumbered every KeyCode value. The service only uses symbolic names, so these
// tests pin the token → KeyCode mapping and the matching logic rather than raw numbers.
public class ShortcutParsingTests
{
    public static IEnumerable<object[]> Letters() =>
        Enumerable.Range('A', 26).Select(c => new object[] { ((char)c).ToString(), Enum.Parse<KeyCode>($"Vc{(char)c}") });

    public static IEnumerable<object[]> Digits() =>
        Enumerable.Range(0, 10).Select(d => new object[] { d.ToString(), Enum.Parse<KeyCode>($"Vc{d}") });

    public static IEnumerable<object[]> FunctionKeys() =>
        Enumerable.Range(1, 12).Select(n => new object[] { $"F{n}", Enum.Parse<KeyCode>($"VcF{n}") });

    [Theory]
    [MemberData(nameof(Letters))]
    [MemberData(nameof(Digits))]
    [MemberData(nameof(FunctionKeys))]
    public void MapToKeyCode_MapsAlphanumericAndFunctionKeys(string token, KeyCode expected)
    {
        Assert.Equal(expected, ShortcutService.MapToKeyCode(token));
        Assert.Equal(expected, ShortcutService.MapToKeyCode(token.ToLowerInvariant()));
    }

    [Theory]
    [InlineData("Space", KeyCode.VcSpace)]
    [InlineData("Left", KeyCode.VcLeft)]
    [InlineData("Right", KeyCode.VcRight)]
    [InlineData("Up", KeyCode.VcUp)]
    [InlineData("Down", KeyCode.VcDown)]
    [InlineData("'", KeyCode.VcQuote)]
    [InlineData("`", KeyCode.VcBackQuote)]
    [InlineData("\\", KeyCode.VcBackslash)]
    [InlineData("[", KeyCode.VcOpenBracket)]
    [InlineData("]", KeyCode.VcCloseBracket)]
    public void MapToKeyCode_MapsNamedAndPunctuationKeys(string token, KeyCode expected)
    {
        Assert.Equal(expected, ShortcutService.MapToKeyCode(token));
    }

    [Theory]
    [InlineData("Enter")]
    [InlineData("F13")]
    [InlineData("")]
    [InlineData("NotAKey")]
    public void MapToKeyCode_ReturnsNullForUnsupportedTokens(string token)
    {
        Assert.Null(ShortcutService.MapToKeyCode(token));
    }

    [Fact]
    public void MapToKeyCode_ProducesDistinctCodes()
    {
        var tokens = Enumerable.Range('A', 26).Select(c => ((char)c).ToString())
            .Concat(Enumerable.Range(0, 10).Select(d => d.ToString()))
            .Concat(Enumerable.Range(1, 12).Select(n => $"F{n}"))
            .Concat(new[] { "Space", "Left", "Right", "Up", "Down", ",", ".", ";", "/", "-", "=", "'", "`", "\\", "[", "]" })
            .ToList();
        var codes = tokens.Select(ShortcutService.MapToKeyCode).ToList();
        Assert.DoesNotContain(null, codes);
        Assert.Equal(tokens.Count, codes.Distinct().Count());
    }

    [Theory]
    [InlineData("CommandOrControl+Shift+Space", KeyCode.VcSpace, true, true, false, false)]
    [InlineData("Ctrl+,", KeyCode.VcComma, true, false, false, false)]
    [InlineData("Alt+Super+F5", KeyCode.VcF5, false, false, true, true)]
    [InlineData("control + shift + 1", KeyCode.Vc1, true, true, false, false)]
    [InlineData("F5", KeyCode.VcF5, false, false, false, false)]
    public void ParseAccelerator_SplitsKeyAndModifiers(string accelerator, KeyCode key, bool ctrl, bool shift, bool alt, bool meta)
    {
        Assert.Equal(new ShortcutService.Accelerator(key, ctrl, shift, alt, meta), ShortcutService.ParseAccelerator(accelerator));
    }

    [Fact]
    public void DefaultShortcuts_AllParseToAKey()
    {
        var defaults = new ShortcutConfig();
        var all = new[] { defaults.ToggleWindow, defaults.Reload, defaults.GoBack, defaults.GoForward, defaults.OpenSettings }
            .Concat(defaults.Providers);
        foreach (var accelerator in all)
            Assert.NotNull(ShortcutService.ParseAccelerator(accelerator).Key);
    }

    private static HashSet<KeyCode> Pressed(params KeyCode[] keys) => new(keys);

    [Fact]
    public void MatchesAccelerator_ToggleWithLeftOrRightModifiers()
    {
        const string toggle = "CommandOrControl+Shift+Space";
        Assert.True(ShortcutService.MatchesAccelerator(toggle, Pressed(KeyCode.VcLeftControl, KeyCode.VcLeftShift, KeyCode.VcSpace)));
        Assert.True(ShortcutService.MatchesAccelerator(toggle, Pressed(KeyCode.VcRightControl, KeyCode.VcRightShift, KeyCode.VcSpace)));
    }

    [Fact]
    public void MatchesAccelerator_RequiresEveryModifierAndTheKey()
    {
        const string toggle = "CommandOrControl+Shift+Space";
        Assert.False(ShortcutService.MatchesAccelerator(toggle, Pressed(KeyCode.VcLeftControl, KeyCode.VcSpace)));
        Assert.False(ShortcutService.MatchesAccelerator(toggle, Pressed(KeyCode.VcLeftControl, KeyCode.VcLeftShift)));
        Assert.False(ShortcutService.MatchesAccelerator(toggle, Pressed(KeyCode.VcLeftControl, KeyCode.VcLeftShift, KeyCode.VcEnter)));
        Assert.False(ShortcutService.MatchesAccelerator("Alt+Meta+F5", Pressed(KeyCode.VcLeftAlt, KeyCode.VcF5)));
    }

    [Fact]
    public void MatchesAccelerator_ProviderHotkeysAreDistinct()
    {
        var pressed = Pressed(KeyCode.VcLeftControl, KeyCode.VcLeftShift, KeyCode.Vc2);
        Assert.False(ShortcutService.MatchesAccelerator("CommandOrControl+Shift+1", pressed));
        Assert.True(ShortcutService.MatchesAccelerator("CommandOrControl+Shift+2", pressed));
    }

    [Fact]
    public void MatchesAccelerator_UnknownKeyNeverMatches()
    {
        Assert.False(ShortcutService.MatchesAccelerator("Ctrl+NotAKey", Pressed(KeyCode.VcLeftControl)));
    }

    [Theory]
    [InlineData("CommandOrControl+Shift+Space", KeyModifiers.Control | KeyModifiers.Shift)]
    [InlineData("Alt+F4", KeyModifiers.Alt)]
    [InlineData("Super+1", KeyModifiers.Meta)]
    [InlineData("F5", KeyModifiers.None)]
    public void ParseAvaloniaModifiers_MapsToInWindowGesture(string accelerator, KeyModifiers expected)
    {
        Assert.Equal(expected, ShortcutService.ParseAvaloniaModifiers(accelerator));
    }

    [Theory]
    [InlineData("CommandOrControl+Shift+Space", Key.Space)]
    [InlineData("CommandOrControl+R", Key.R)]
    [InlineData("CommandOrControl+Left", Key.Left)]
    [InlineData("F5", Key.F5)]
    public void ParseAvaloniaKey_MapsToInWindowGesture(string accelerator, Key expected)
    {
        Assert.Equal(expected, ShortcutService.ParseAvaloniaKey(accelerator));
    }
}
