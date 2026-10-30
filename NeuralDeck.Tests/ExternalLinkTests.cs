using NeuralDeck.Controls;
using NeuralDeck.Services;
using Xunit;

namespace NeuralDeck.Tests;

public class ExternalUriAllowlistTests
{
    [Theory]
    [InlineData("https://chatgpt.com/")]
    [InlineData("http://example.com/path?q=1")]
    [InlineData("HTTPS://EXAMPLE.COM")]
    public void IsAllowedExternalUri_AcceptsHttpAndHttps(string url)
    {
        Assert.True(WindowService.IsAllowedExternalUri(new Uri(url)));
    }

    [Theory]
    [InlineData("file:///etc/passwd")]
    [InlineData("javascript:alert(1)")]
    [InlineData("mailto:someone@example.com")]
    [InlineData("vscode://file/tmp/x")]
    [InlineData("ftp://example.com/file")]
    public void IsAllowedExternalUri_RejectsOtherSchemes(string url)
    {
        Assert.False(WindowService.IsAllowedExternalUri(new Uri(url)));
    }

    [Fact]
    public void IsAllowedExternalUri_RejectsNullAndRelative()
    {
        Assert.False(WindowService.IsAllowedExternalUri(null));
        Assert.False(WindowService.IsAllowedExternalUri(new Uri("/relative/path", UriKind.Relative)));
    }
}

public class MarkdownLinkTargetTests
{
    [Theory]
    [InlineData("https://example.com", "https://example.com/")]
    [InlineData("  http://example.com/a  ", "http://example.com/a")]
    [InlineData("<https://example.com/b>", "https://example.com/b")]
    [InlineData("https://example.com/c \"Title\"", "https://example.com/c")]
    public void TryParseLinkTarget_ReturnsHttpUris(string target, string expected)
    {
        Assert.Equal(expected, MarkdownParser.TryParseLinkTarget(target)?.ToString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("relative/page.md")]
    [InlineData("file:///home/user/.ssh/id_rsa")]
    [InlineData("javascript:alert(1)")]
    [InlineData("custom-handler://payload")]
    public void TryParseLinkTarget_RejectsNonHttpTargets(string? target)
    {
        Assert.Null(MarkdownParser.TryParseLinkTarget(target));
    }
}
