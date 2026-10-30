using System.Runtime.InteropServices;
using Avalonia;

namespace NeuralDeck;

class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
        PreferSystemHarfBuzzOnLinux();
        WorkAroundWebKitDmaBufOnNvidia();
        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);
    }

    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .WithInterFont()
            .LogToTrace();

    // HarfBuzzSharp ships its own libHarfBuzzSharp.so exporting the same hb_* symbols as the
    // system libharfbuzz.so.0. Once WebKitGTK pulls the system copy into the process, calls
    // from libHarfBuzzSharp get resolved against it and objects allocated by one copy are
    // freed by the other: the app aborts with "free(): invalid pointer" as soon as a web
    // provider loads. Binding HarfBuzzSharp to the system library leaves one copy in the
    // process. Only done when the system copy is at least the version HarfBuzzSharp was built
    // against, so every entry point it imports exists.
    private static readonly Version HarfBuzzSharpNativeVersion = new(8, 3, 1);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate int HbVersionAtLeast(uint major, uint minor, uint micro);

    private static void PreferSystemHarfBuzzOnLinux()
    {
        if (!OperatingSystem.IsLinux()) return;
        try
        {
            if (!NativeLibrary.TryLoad("libharfbuzz.so.0", out var system)) return;
            if (!NativeLibrary.TryGetExport(system, "hb_version_atleast", out var fn) ||
                Marshal.GetDelegateForFunctionPointer<HbVersionAtLeast>(fn)(
                    (uint)HarfBuzzSharpNativeVersion.Major,
                    (uint)HarfBuzzSharpNativeVersion.Minor,
                    (uint)HarfBuzzSharpNativeVersion.Build) == 0)
            {
                NativeLibrary.Free(system);
                return;
            }

            NativeLibrary.SetDllImportResolver(typeof(HarfBuzzSharp.Blob).Assembly,
                (name, _, _) => name == "libHarfBuzzSharp" ? system : IntPtr.Zero);
        }
        catch (Exception ex)
        {
            // Resolver already set or library unusable: keep the bundled copy.
            Console.WriteLine($"[Program] Using bundled HarfBuzz: {ex.Message}");
        }
    }

    // WebKitGTK's DMA-BUF renderer can't allocate GBM buffers on the proprietary NVIDIA driver
    // ("Failed to create GBM buffer"), leaving every provider page blank. Fall back to the
    // shared-memory path there unless the user chose otherwise. Must go through libc setenv:
    // Environment.SetEnvironmentVariable doesn't touch the native environment WebKit reads.
    [DllImport("libc", EntryPoint = "setenv")]
    private static extern int NativeSetEnv(string name, string value, int overwrite);

    private static void WorkAroundWebKitDmaBufOnNvidia()
    {
        if (!OperatingSystem.IsLinux() || !File.Exists("/proc/driver/nvidia/version")) return;
        try
        {
            NativeSetEnv("WEBKIT_DISABLE_DMABUF_RENDERER", "1", overwrite: 0);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Program] Could not set WEBKIT_DISABLE_DMABUF_RENDERER: {ex.Message}");
        }
    }
}
