using System.Security.Cryptography;
using System.Text;
using Avalonia.Controls;
using Avalonia.Platform;

namespace NeuralDeck.Services;

/// <summary>
/// Per-provider browser profile: each embedded provider gets its own cookie jar / storage so
/// logging into one provider is never visible to another. Isolation needs one NativeWebView
/// per provider, because the WebView only asks for its environment once, when it is attached.
/// </summary>
public sealed record WebProfile(
    string ProviderId,
    string Key,
    string DataDirectory,
    string CacheDirectory,
    Guid DataStoreId,
    bool Ephemeral);

public static class WebProfiles
{
    private const string FolderName = "WebProfiles";

    // ~/.local/share/NeuralDeck/WebProfiles on Linux (.NET honours XDG_DATA_HOME),
    // %LOCALAPPDATA%\NeuralDeck\WebProfiles on Windows. Config lives elsewhere
    // (ApplicationData/NeuralDeck), so wiping this never touches settings.
    // DoNotVerify: the default option returns "" when the folder doesn't exist yet (fresh
    // Linux home without ~/.local/share), which would turn this into a relative path.
    public static string DataRoot { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData, Environment.SpecialFolderOption.DoNotVerify),
        "NeuralDeck", FolderName);

    public static string CacheRoot { get; } = ResolveCacheRoot();

    private static string ResolveCacheRoot()
    {
        if (!OperatingSystem.IsLinux()) return Path.Combine(DataRoot, "cache");
        var cacheHome = Environment.GetEnvironmentVariable("XDG_CACHE_HOME");
        if (string.IsNullOrEmpty(cacheHome))
            cacheHome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile, Environment.SpecialFolderOption.DoNotVerify), ".cache");
        return Path.Combine(cacheHome, "NeuralDeck", FolderName);
    }

    public static WebProfile For(string? providerId, bool ephemeral) =>
        For(providerId, ephemeral, DataRoot, CacheRoot);

    internal static WebProfile For(string? providerId, bool ephemeral, string dataRoot, string cacheRoot)
    {
        var id = string.IsNullOrWhiteSpace(providerId) ? "default" : providerId;
        var key = ToKey(id);
        return new WebProfile(
            id,
            key,
            Path.Combine(dataRoot, key),
            Path.Combine(cacheRoot, key),
            DeriveDataStoreId(key),
            ephemeral);
    }

    // Provider ids of custom providers are user-entered; the key ends up as a directory and
    // a WebView2 profile name, so keep it to a safe charset and append a hash of the original
    // id so two ids that sanitize to the same text ("my.ai" / "my-ai") still never collide.
    internal static string ToKey(string providerId)
    {
        var sb = new StringBuilder(providerId.Length);
        foreach (var c in providerId.ToLowerInvariant())
            sb.Append(c is >= 'a' and <= 'z' or >= '0' and <= '9' ? c : '-');
        var slug = sb.ToString().Trim('-');
        if (slug.Length > 40) slug = slug[..40];
        if (slug.Length == 0) slug = "provider";
        var hash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(providerId)))[..8];
        return $"{slug}-{hash}";
    }

    // WKWebsiteDataStore identifiers must be stable across launches (same provider → same
    // store), so derive the GUID from the key instead of generating a random one.
    internal static Guid DeriveDataStoreId(string key)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes("neuraldeck-webprofile:" + key));
        var guid = bytes.AsSpan(0, 16).ToArray();
        guid[7] = (byte)((guid[7] & 0x0F) | 0x50); // RFC 4122 version 5-style (name-based)
        guid[8] = (byte)((guid[8] & 0x3F) | 0x80); // RFC 4122 variant
        return new Guid(guid);
    }

    /// <summary>
    /// Maps a profile onto whatever environment the platform adapter asked for. Support differs:
    /// WebKitGTK/WPE (Linux) use separate data/cache directories, WebView2 (Windows) a named
    /// profile, WKWebView (macOS 14+) an identified data store. Older macOS and the legacy
    /// WebView1 fallback ignore these settings and share a single store.
    /// </summary>
    public static void Apply(WebViewEnvironmentRequestedEventArgs args, WebProfile profile)
    {
        switch (args)
        {
            case GtkWebViewEnvironmentRequestedEventArgs gtk:
                if (profile.Ephemeral)
                {
                    gtk.EphemeralDataManager = true;
                }
                else
                {
                    gtk.BaseDataDirectory = profile.DataDirectory;
                    gtk.BaseCacheDirectory = profile.CacheDirectory;
                }
                break;

            case LinuxWpeWebViewEnvironmentRequestedEventArgs wpe:
                // WPE has no ephemeral switch; the directories are wiped on exit/startup instead.
                wpe.DataDirectory = profile.DataDirectory;
                wpe.CacheDirectory = profile.CacheDirectory;
                break;

            case WindowsWebView2EnvironmentRequestedEventArgs webView2:
                // One user-data folder (one shared browser process) with a profile per provider.
                webView2.UserDataFolder = DataRoot;
                webView2.ProfileName = profile.Key;
                webView2.IsInPrivateModeEnabled = profile.Ephemeral;
                break;

            case AppleWKWebViewEnvironmentRequestedEventArgs apple:
                if (profile.Ephemeral)
                    apple.NonPersistentDataStore = true;
                else
                    apple.DataStoreIdentifier = profile.DataStoreId;
                break;
        }
    }

    /// <summary>
    /// Best-effort removal of every on-disk provider profile. Files can still be locked by
    /// browser helper processes during shutdown, which is why this also runs at startup.
    /// </summary>
    public static void WipeAll()
    {
        foreach (var dir in new[] { DataRoot, CacheRoot })
        {
            try
            {
                if (Directory.Exists(dir))
                    Directory.Delete(dir, recursive: true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WebProfiles] Failed to clear {dir}: {ex.Message}");
            }
        }
    }
}
