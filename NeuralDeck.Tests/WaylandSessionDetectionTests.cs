using NeuralDeck.Services;
using Xunit;

namespace NeuralDeck.Tests;

// The global hook is pinned to LinuxMode.XRecord, which only captures the traffic that
// goes through XWayland. On a native Wayland session the hotkeys are therefore dead —
// the app must at least say so instead of failing silently.
public class WaylandSessionDetectionTests
{
    [Theory]
    [InlineData("wayland", "wayland-0", true)]
    [InlineData("Wayland", "wayland-0", true)]
    [InlineData("x11", "wayland-0", false)]
    [InlineData("tty", null, false)]
    [InlineData(null, "wayland-0", true)]
    [InlineData(null, null, false)]
    [InlineData("", "", false)]
    public void DetectWaylandSession_UsesSessionTypeFirstThenTheCompositorSocket(
        string? sessionType, string? waylandDisplay, bool expected)
    {
        Assert.Equal(expected, ShortcutService.DetectWaylandSession(sessionType, waylandDisplay));
    }
}
