using System.Runtime.InteropServices;

namespace NeuralDeck.Services;

/// <summary>
/// WebKitGTK keeps cookies in memory unless told otherwise, so on Linux every restart logged
/// the user out of every provider. Avalonia's WebView exposes the native WebKitWebView handle
/// but no cookie-persistence switch, so this calls the WebKitGTK API directly.
/// </summary>
internal static class WebKitGtkCookies
{
    private const int PersistentStorageSqlite = 1; // WEBKIT_COOKIE_PERSISTENT_STORAGE_SQLITE

    private delegate nint GetContextFn(nint webView);
    private delegate nint GetCookieManagerFn(nint context);
    private delegate void SetPersistentStorageFn(nint cookieManager, [MarshalAs(UnmanagedType.LPUTF8Str)] string path, int storage);

    private static readonly Lazy<(GetContextFn, GetCookieManagerFn, SetPersistentStorageFn)?> Api = new(Load);

    private static (GetContextFn, GetCookieManagerFn, SetPersistentStorageFn)? Load()
    {
        foreach (var name in new[] { "libwebkit2gtk-4.1.so.0", "libwebkit2gtk-4.0.so.37" })
        {
            if (!NativeLibrary.TryLoad(name, out var lib)) continue;
            if (NativeLibrary.TryGetExport(lib, "webkit_web_view_get_context", out var getContext) &&
                NativeLibrary.TryGetExport(lib, "webkit_web_context_get_cookie_manager", out var getManager) &&
                NativeLibrary.TryGetExport(lib, "webkit_cookie_manager_set_persistent_storage", out var setStorage))
            {
                return (Marshal.GetDelegateForFunctionPointer<GetContextFn>(getContext),
                        Marshal.GetDelegateForFunctionPointer<GetCookieManagerFn>(getManager),
                        Marshal.GetDelegateForFunctionPointer<SetPersistentStorageFn>(setStorage));
            }
        }
        return null;
    }

    public static async Task EnablePersistenceAsync(nint webKitWebView, string cookieFile)
    {
        if (!OperatingSystem.IsLinux() || webKitWebView == 0 || Api.Value is not { } api) return;

        Directory.CreateDirectory(Path.GetDirectoryName(cookieFile)!);
        // GTK objects may only be touched from the GLib thread Avalonia runs WebKitGTK on.
        await Avalonia.X11.Interop.GtkInteropHelper.RunOnGlibThread(() =>
        {
            var (getContext, getManager, setStorage) = api;
            var manager = getManager(getContext(webKitWebView));
            if (manager != 0)
                setStorage(manager, cookieFile, PersistentStorageSqlite);
            return 0;
        });
    }
}
