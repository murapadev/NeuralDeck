using NeuralDeck.Services;
using NeuralDeck.ViewModels;
using Xunit;

namespace NeuralDeck.Tests;

public class WebProfilesTests
{
    private const string DataRoot = "/data/WebProfiles";
    private const string CacheRoot = "/cache/WebProfiles";

    [Fact]
    public void For_GivesEachProviderItsOwnDirectoriesAndStore()
    {
        var chatgpt = WebProfiles.For("chatgpt", false, DataRoot, CacheRoot);
        var gemini = WebProfiles.For("gemini", false, DataRoot, CacheRoot);

        Assert.NotEqual(chatgpt.DataDirectory, gemini.DataDirectory);
        Assert.NotEqual(chatgpt.CacheDirectory, gemini.CacheDirectory);
        Assert.NotEqual(chatgpt.DataStoreId, gemini.DataStoreId);
        Assert.NotEqual(chatgpt.Key, gemini.Key);
        Assert.StartsWith(DataRoot, chatgpt.DataDirectory);
        Assert.StartsWith(CacheRoot, chatgpt.CacheDirectory);
    }

    [Fact]
    public void For_IsStableAcrossCalls()
    {
        var a = WebProfiles.For("perplexity", false, DataRoot, CacheRoot);
        var b = WebProfiles.For("perplexity", false, DataRoot, CacheRoot);
        Assert.Equal(a, b);
        Assert.NotEqual(Guid.Empty, a.DataStoreId);
    }

    [Theory]
    [InlineData("../../etc")]
    [InlineData("..\\..\\Windows")]
    [InlineData("/absolute/path")]
    [InlineData("custom provider: ñ")]
    public void ToKey_NeverEscapesTheProfileRoot(string providerId)
    {
        var key = WebProfiles.ToKey(providerId);
        Assert.Matches("^[a-z0-9-]+$", key);
        var profile = WebProfiles.For(providerId, false, DataRoot, CacheRoot);
        Assert.Equal(DataRoot, Path.GetDirectoryName(profile.DataDirectory));
    }

    [Fact]
    public void ToKey_DistinguishesIdsThatSanitizeAlike()
    {
        Assert.NotEqual(WebProfiles.ToKey("my.ai"), WebProfiles.ToKey("my-ai"));
        Assert.NotEqual(WebProfiles.ToKey("Claude"), WebProfiles.ToKey("claude"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void For_FallsBackToDefaultProfileForMissingId(string? providerId)
    {
        Assert.Equal("default", WebProfiles.For(providerId, true, DataRoot, CacheRoot).ProviderId);
    }

    [Fact]
    public void For_CarriesEphemeralFlag()
    {
        Assert.True(WebProfiles.For("chatgpt", true, DataRoot, CacheRoot).Ephemeral);
        Assert.False(WebProfiles.For("chatgpt", false, DataRoot, CacheRoot).Ephemeral);
    }
}

public class WebBrowserViewModelTests
{
    [Theory]
    [InlineData("example.com", "https://example.com/")]
    [InlineData("  http://example.com/a ", "http://example.com/a")]
    [InlineData("https://chatgpt.com", "https://chatgpt.com/")]
    public void NormalizeUrl_DefaultsToHttps(string input, string expected)
    {
        Assert.Equal(expected, WebBrowserViewModel.NormalizeUrl(input)?.ToString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void NormalizeUrl_RejectsEmpty(string? input)
    {
        Assert.Null(WebBrowserViewModel.NormalizeUrl(input));
    }

    [Fact]
    public void NewBrowser_KeepsProviderIdentityAndStartsInactive()
    {
        var vm = new WebBrowserViewModel("gemini", "https://gemini.google.com");
        Assert.Equal("gemini", vm.ProviderId);
        Assert.Equal("https://gemini.google.com", vm.AddressBarText);
        Assert.False(vm.IsActive);
    }
}

public class WebProfileRootTests
{
    [Fact]
    public void Roots_AreAbsolute()
    {
        Assert.True(Path.IsPathRooted(WebProfiles.DataRoot));
        Assert.True(Path.IsPathRooted(WebProfiles.CacheRoot));
    }
}
