using NeuralDeck.Services;
using NeuralDeck.ViewModels;
using Xunit;

namespace NeuralDeck.Tests;

// The settings banner must only show up when there is really something to warn about:
// on a plain X11 session the global hook works and the banner must stay hidden.
public class GlobalShortcutWarningTests
{
    [Fact]
    public void BuildGlobalShortcutWarning_IsEmptyWhenTheHookWorksOnX11()
    {
        Assert.Equal("", SettingsViewModel.BuildGlobalShortcutWarning(
            hookAvailable: true, hookError: null, isWaylandSession: false, reason: null));
    }

    [Fact]
    public void BuildGlobalShortcutWarning_NamesTheReasonWhenTheHookFailed()
    {
        var message = SettingsViewModel.BuildGlobalShortcutWarning(
            hookAvailable: false, hookError: "Global hook unavailable: boom",
            isWaylandSession: false, reason: null);

        Assert.Contains("not available", message);
        Assert.Contains("boom", message);
    }

    [Fact]
    public void BuildGlobalShortcutWarning_MentionsTheWaylandLimitation()
    {
        var message = SettingsViewModel.BuildGlobalShortcutWarning(
            hookAvailable: false, hookError: null, isWaylandSession: true, reason: "boom");

        Assert.Contains("Wayland", message);
        Assert.Contains("uinput", message);
        Assert.Contains("boom", message);
    }

    [Fact]
    public void BuildGlobalShortcutWarning_WarnsOnWaylandEvenWhileTheHookIsAlive()
    {
        // XRecord starts fine on a Wayland session — it just doesn't see native Wayland
        // keys. The user still has to be told.
        var message = SettingsViewModel.BuildGlobalShortcutWarning(
            hookAvailable: true, hookError: null, isWaylandSession: true, reason: null);

        Assert.Contains("Wayland", message);
        Assert.Contains("XWayland", message);
    }

    [Fact]
    public void DetectWaylandSession_MatchesTheEnvironmentItRunsIn()
    {
        // Not a hardcoded "false": on a native Wayland machine this must be true.
        // The static property has to agree with the pure detection over the real env.
        var expected = ShortcutService.DetectWaylandSession(
            Environment.GetEnvironmentVariable("XDG_SESSION_TYPE"),
            Environment.GetEnvironmentVariable("WAYLAND_DISPLAY"));

        Assert.Equal(expected, ShortcutService.IsWaylandSession);
    }
}
