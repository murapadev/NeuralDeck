using Avalonia.Input;
using NeuralDeck.Services;
using SharpHook.Data;
using Xunit;

namespace NeuralDeck.Tests;

public class ShortcutServicePunctuationTests
{
    [Theory]
    [InlineData(",", KeyCode.VcComma)]
    [InlineData(".", KeyCode.VcPeriod)]
    [InlineData(";", KeyCode.VcSemicolon)]
    [InlineData("/", KeyCode.VcSlash)]
    [InlineData("-", KeyCode.VcMinus)]
    [InlineData("=", KeyCode.VcEquals)]
    public void MapToKeyCode_SupportsPunctuation(string token, KeyCode expected)
    {
        Assert.Equal(expected, ShortcutService.MapToKeyCode(token));
    }

    [Theory]
    [InlineData(",", Key.OemComma)]
    [InlineData(".", Key.OemPeriod)]
    [InlineData(";", Key.OemSemicolon)]
    [InlineData("/", Key.OemQuestion)]
    [InlineData("-", Key.OemMinus)]
    [InlineData("=", Key.OemPlus)]
    public void MapPunctuationToKey_SupportsPunctuation(string token, Key expected)
    {
        Assert.Equal(expected, ShortcutService.MapPunctuationToKey(token));
    }

    [Theory]
    [InlineData("CommandOrControl+.", Key.OemPeriod)]
    [InlineData("CommandOrControl+Shift+;", Key.OemSemicolon)]
    public void ParseAvaloniaKey_ResolvesPunctuationAccelerators(string accelerator, Key expected)
    {
        Assert.Equal(expected, ShortcutService.ParseAvaloniaKey(accelerator));
    }
}
