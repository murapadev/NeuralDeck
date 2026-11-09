using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Threading;
using NeuralDeck.Models;
using NeuralDeck.ViewModels;
using SharpHook;
using SharpHook.Data;
using SharpHook.Providers;

namespace NeuralDeck.Services;

public class ShortcutService : IDisposable
{
    private static readonly Lazy<ShortcutService> _instance = new(() => new ShortcutService());
    private readonly Dictionary<string, Action> _registeredShortcuts = new();
    private readonly List<KeyBinding> _keyBindings = new();
    private readonly HashSet<KeyCode> _pressedKeys = new();
    private readonly HashSet<string> _triggeredShortcuts = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _shortcutLock = new();
    private Window? _window;
    private MainWindowViewModel? _mainViewModel;
    private TaskPoolGlobalHook? _hook;
    private bool _isInitialized;
    private bool _disposed;

    public static ShortcutService Instance => _instance.Value;

    // True when the app runs in a native Wayland session (not plain X11, not XWayland-only).
    // On those sessions the XRecord backend only sees the traffic that goes through XWayland,
    // so the global hotkeys can be dead while the app itself looks perfectly healthy.
    public static bool IsWaylandSession { get; } = DetectWaylandSession();

    // False once the global hook failed to start (or died). The settings UI reads this so the
    // failure is not a silent no-op: the user must be told the hotkeys are not available.
    public bool GlobalHookAvailable { get; private set; } = true;

    // Human-readable reason of the last global-hook failure (null while everything is fine).
    public string? GlobalHookError { get; private set; }

    private ShortcutService() { }

    internal static bool DetectWaylandSession()
        => DetectWaylandSession(
            Environment.GetEnvironmentVariable("XDG_SESSION_TYPE"),
            Environment.GetEnvironmentVariable("WAYLAND_DISPLAY"));

    // Pure detection so it can be unit-tested: the session type wins when it is set,
    // otherwise the compositor socket is the fallback.
    internal static bool DetectWaylandSession(string? sessionType, string? waylandDisplay)
    {
        if (!string.IsNullOrWhiteSpace(sessionType))
            return sessionType.Equals("wayland", StringComparison.OrdinalIgnoreCase);

        // WAYLAND_DISPLAY is set in every Wayland session, including ones that also
        // expose XWayland — which is exactly the case we want to warn about.
        return !string.IsNullOrWhiteSpace(waylandDisplay);
    }

    public void Initialize(Window window, MainWindowViewModel? mainViewModel = null)
    {
        if (_isInitialized) return;
        _window = window;
        _mainViewModel = mainViewModel;
        _isInitialized = true;

        TryStartGlobalHook();
        ConfigService.Instance.ConfigChanged += OnConfigChanged;
        Refresh();
    }

    private void OnConfigChanged(object? sender, AppConfig config)
    {
        Dispatcher.UIThread.Post(Refresh);
    }

    // Raised when the global hook fails to start or dies at runtime. The settings UI
    // listens to it so the user sees a warning instead of pressing dead hotkeys.
    public event EventHandler<string>? GlobalHookFailed;

    private void TryStartGlobalHook()
    {
        try
        {
            // SharpHook 8 switched Wayland sessions to a libinput/uinput backend that needs
            // elevated privileges. Keep the pre-8 behaviour (XRecord through X11/XWayland),
            // which works unprivileged for X11 sessions and XWayland-focused windows.
            if (OperatingSystem.IsLinux())
                UioHookProvider.Instance.SetLinuxMode(LinuxMode.XRecord);

            _hook = new TaskPoolGlobalHook();
            _hook.KeyPressed += OnGlobalKeyPressed;
            _hook.KeyReleased += OnGlobalKeyReleased;
            var hook = _hook;
            _ = Task.Run(() =>
            {
                // Keyboard only: shortcuts never need the (very chatty) mouse events.
                try { hook.Run(GlobalHookType.Keyboard); }
                catch (Exception ex)
                {
                    // The hook dying used to be invisible: the app kept running and the
                    // global hotkeys simply did nothing. Report it like a startup failure.
                    ReportGlobalHookFailure($"Global hook stopped: {ex.Message}");
                }
            });
        }
        catch (Exception ex)
        {
            _hook = null;
            ReportGlobalHookFailure($"Global hook unavailable: {ex.Message}");
        }
    }

    private void ReportGlobalHookFailure(string reason)
    {
        GlobalHookAvailable = false;
        GlobalHookError = reason;

        var hint = IsWaylandSession
            ? " This is a native Wayland session: the XRecord backend only sees XWayland traffic. Real Wayland support needs the uinput backend (root)."
            : string.Empty;

        Console.WriteLine($"[ShortcutService] {reason}{hint}");
        Console.Error.WriteLine($"[ShortcutService] Global shortcuts are not available. {reason}{hint}");

        // Surface it where the user actually looks: a tray notification plus the settings UI.
        // The hook failure can come from the hook thread, and the notification manager
        // touches UI objects, so hop to the UI thread first.
        try
        {
            Dispatcher.UIThread.Post(() =>
            {
                try
                {
                    TrayService.Instance.ShowNotification(
                        "Global shortcuts unavailable",
                        $"{reason} NeuralDeck keeps working, but the global hotkeys won't respond.{hint}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ShortcutService] Failed to notify about the hook failure: {ex.Message}");
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ShortcutService] Failed to notify about the hook failure: {ex.Message}");
        }

        try
        {
            GlobalHookFailed?.Invoke(this, reason);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ShortcutService] GlobalHookFailed handler threw: {ex.Message}");
        }
    }

    private void OnGlobalKeyPressed(object? sender, KeyboardHookEventArgs e)
    {
        var actions = new List<Action>();

        lock (_shortcutLock)
        {
            _pressedKeys.Add(e.Data.KeyCode);

            foreach (var (accelerator, action) in _registeredShortcuts)
            {
                if (MatchesAccelerator(accelerator) && _triggeredShortcuts.Add(accelerator))
                    actions.Add(action);
            }
        }

        foreach (var action in actions)
            Dispatcher.UIThread.InvokeAsync(action);
    }

    private void OnGlobalKeyReleased(object? sender, KeyboardHookEventArgs e)
    {
        lock (_shortcutLock)
        {
            _pressedKeys.Remove(e.Data.KeyCode);

            foreach (var accelerator in _triggeredShortcuts.Where(a => !MatchesAccelerator(a)).ToList())
                _triggeredShortcuts.Remove(accelerator);
        }
    }

    private bool MatchesAccelerator(string accelerator) => MatchesAccelerator(accelerator, _pressedKeys);

    internal readonly record struct Accelerator(KeyCode? Key, bool Ctrl, bool Shift, bool Alt, bool Meta);

    // Pure parsing of Electron-style accelerators ("CommandOrControl+Shift+Space") into the
    // SharpHook key code + required modifiers. Kept separate from the hook so it is testable.
    internal static Accelerator ParseAccelerator(string accelerator)
    {
        KeyCode? mainKey = null;
        bool ctrl = false, shift = false, alt = false, meta = false;

        foreach (var part in accelerator.Split('+'))
        {
            var t = part.Trim();
            if (t.Equals("CommandOrControl", StringComparison.OrdinalIgnoreCase) ||
                t.Equals("Control", StringComparison.OrdinalIgnoreCase) ||
                t.Equals("Ctrl", StringComparison.OrdinalIgnoreCase))
                ctrl = true;
            else if (t.Equals("Shift", StringComparison.OrdinalIgnoreCase))
                shift = true;
            else if (t.Equals("Alt", StringComparison.OrdinalIgnoreCase))
                alt = true;
            else if (t.Equals("Meta", StringComparison.OrdinalIgnoreCase) ||
                     t.Equals("Super", StringComparison.OrdinalIgnoreCase) ||
                     t.Equals("Win", StringComparison.OrdinalIgnoreCase))
                meta = true;
            else
                mainKey = MapToKeyCode(t);
        }

        return new Accelerator(mainKey, ctrl, shift, alt, meta);
    }

    internal static bool MatchesAccelerator(string accelerator, IReadOnlySet<KeyCode> pressed)
    {
        var a = ParseAccelerator(accelerator);
        if (a.Key == null || !pressed.Contains(a.Key.Value)) return false;

        bool hasCtrl = pressed.Contains(KeyCode.VcLeftControl) || pressed.Contains(KeyCode.VcRightControl);
        bool hasShift = pressed.Contains(KeyCode.VcLeftShift) || pressed.Contains(KeyCode.VcRightShift);
        bool hasAlt = pressed.Contains(KeyCode.VcLeftAlt) || pressed.Contains(KeyCode.VcRightAlt);
        bool hasMeta = pressed.Contains(KeyCode.VcLeftMeta) || pressed.Contains(KeyCode.VcRightMeta);

        return (!a.Ctrl || hasCtrl) &&
               (!a.Shift || hasShift) &&
               (!a.Alt || hasAlt) &&
               (!a.Meta || hasMeta);
    }

    internal static KeyCode? MapToKeyCode(string key) => key.ToUpperInvariant() switch
    {
        "SPACE" => KeyCode.VcSpace,
        "," => KeyCode.VcComma,
        "." => KeyCode.VcPeriod,
        ";" => KeyCode.VcSemicolon,
        "/" => KeyCode.VcSlash,
        "-" => KeyCode.VcMinus,
        "=" => KeyCode.VcEquals,
        "'" => KeyCode.VcQuote,
        "`" => KeyCode.VcBackQuote,
        "\\" => KeyCode.VcBackslash,
        "[" => KeyCode.VcOpenBracket,
        "]" => KeyCode.VcCloseBracket,
        "A" => KeyCode.VcA,
        "B" => KeyCode.VcB,
        "C" => KeyCode.VcC,
        "D" => KeyCode.VcD,
        "E" => KeyCode.VcE,
        "F" => KeyCode.VcF,
        "G" => KeyCode.VcG,
        "H" => KeyCode.VcH,
        "I" => KeyCode.VcI,
        "J" => KeyCode.VcJ,
        "K" => KeyCode.VcK,
        "L" => KeyCode.VcL,
        "M" => KeyCode.VcM,
        "N" => KeyCode.VcN,
        "O" => KeyCode.VcO,
        "P" => KeyCode.VcP,
        "Q" => KeyCode.VcQ,
        "R" => KeyCode.VcR,
        "S" => KeyCode.VcS,
        "T" => KeyCode.VcT,
        "U" => KeyCode.VcU,
        "V" => KeyCode.VcV,
        "W" => KeyCode.VcW,
        "X" => KeyCode.VcX,
        "Y" => KeyCode.VcY,
        "Z" => KeyCode.VcZ,
        "1" => KeyCode.Vc1,
        "2" => KeyCode.Vc2,
        "3" => KeyCode.Vc3,
        "4" => KeyCode.Vc4,
        "5" => KeyCode.Vc5,
        "6" => KeyCode.Vc6,
        "7" => KeyCode.Vc7,
        "8" => KeyCode.Vc8,
        "9" => KeyCode.Vc9,
        "0" => KeyCode.Vc0,
        "F1"  => KeyCode.VcF1,
        "F2"  => KeyCode.VcF2,
        "F3"  => KeyCode.VcF3,
        "F4"  => KeyCode.VcF4,
        "F5"  => KeyCode.VcF5,
        "F6" => KeyCode.VcF6,
        "F7" => KeyCode.VcF7,
        "F8" => KeyCode.VcF8,
        "F9" => KeyCode.VcF9,
        "F10" => KeyCode.VcF10,
        "F11" => KeyCode.VcF11,
        "F12" => KeyCode.VcF12,
        "LEFT" => KeyCode.VcLeft,
        "RIGHT" => KeyCode.VcRight,
        "UP" => KeyCode.VcUp,
        "DOWN" => KeyCode.VcDown,
        _ => null
    };

    public void Register(string accelerator, Action callback)
    {
        if (string.IsNullOrEmpty(accelerator))
            return;

        lock (_shortcutLock)
        {
            if (_registeredShortcuts.ContainsKey(accelerator))
                return;

            _registeredShortcuts[accelerator] = callback;
        }

        // Also register as in-window fallback
        if (_window != null)
        {
            var key = ParseAvaloniaKey(accelerator);
            var modifiers = ParseAvaloniaModifiers(accelerator);
            if (key != Key.None)
            {
                var kb = new KeyBinding
                {
                    Gesture = new KeyGesture(key, modifiers),
                    Command = new CommunityToolkit.Mvvm.Input.RelayCommand(callback)
                };
                _keyBindings.Add(kb);
                _window.KeyBindings.Add(kb);
            }
        }
    }

    internal static Key? MapPunctuationToKey(string token) => token switch
    {
        "," => Key.OemComma,
        "." => Key.OemPeriod,
        ";" => Key.OemSemicolon,
        "/" => Key.OemQuestion,
        "-" => Key.OemMinus,
        "=" => Key.OemPlus,
        "'" => Key.OemQuotes,
        "`" => Key.OemTilde,
        "\\" => Key.OemBackslash,
        "[" => Key.OemOpenBrackets,
        "]" => Key.OemCloseBrackets,
        _ => null
    };

    internal static Key ParseAvaloniaKey(string accelerator)
    {
        foreach (var part in accelerator.Split('+'))
        {
            var t = part.Trim();
            if (IsModifierToken(t)) continue;
            var punctuationKey = MapPunctuationToKey(t);
            if (punctuationKey != null) return punctuationKey.Value;
            if (Enum.TryParse<Key>(t, true, out var k)) return k;
        }
        return Key.None;
    }

    internal static KeyModifiers ParseAvaloniaModifiers(string accelerator)
    {
        var m = KeyModifiers.None;
        var lower = accelerator.ToLowerInvariant();
        if (lower.Contains("commandorcontrol") || lower.Contains("control") || lower.Contains("ctrl"))
            m |= KeyModifiers.Control;
        if (lower.Contains("shift")) m |= KeyModifiers.Shift;
        if (lower.Contains("alt")) m |= KeyModifiers.Alt;
        if (lower.Contains("meta") || lower.Contains("super") || lower.Contains("win"))
            m |= KeyModifiers.Meta;
        return m;
    }

    private static bool IsModifierToken(string token) =>
        token.Equals("CommandOrControl", StringComparison.OrdinalIgnoreCase) ||
        token.Equals("Control", StringComparison.OrdinalIgnoreCase) ||
        token.Equals("Ctrl", StringComparison.OrdinalIgnoreCase) ||
        token.Equals("Shift", StringComparison.OrdinalIgnoreCase) ||
        token.Equals("Alt", StringComparison.OrdinalIgnoreCase) ||
        token.Equals("Meta", StringComparison.OrdinalIgnoreCase) ||
        token.Equals("Super", StringComparison.OrdinalIgnoreCase) ||
        token.Equals("Win", StringComparison.OrdinalIgnoreCase);

    public void UnregisterAll()
    {
        if (_window != null)
            foreach (var kb in _keyBindings)
                _window.KeyBindings.Remove(kb);
        _keyBindings.Clear();

        lock (_shortcutLock)
        {
            _registeredShortcuts.Clear();
            _triggeredShortcuts.Clear();
            _pressedKeys.Clear();
        }
    }

    public void Refresh()
    {
        UnregisterAll();
        var config = ConfigService.Instance.GetConfig();

        Register(config.Shortcuts.ToggleWindow, WindowService.Instance.ToggleWindow);
        Register(config.Shortcuts.OpenSettings, WindowService.Instance.OpenSettingsWindow);

        // Ctrl+Q — clean shutdown through WindowService.
        Register("CommandOrControl+Q", WindowService.Instance.ShutdownApplication);

        // Ctrl+R / F5 — reload current web provider.
        Register(config.Shortcuts.Reload, () => _mainViewModel?.ReloadCurrentView());
        Register("F5", () => _mainViewModel?.ReloadCurrentView());

        // Browser back / forward.
        Register(config.Shortcuts.GoBack, () => _mainViewModel?.GoBackInView());
        Register(config.Shortcuts.GoForward, () => _mainViewModel?.GoForwardInView());

        // Per-provider hotkeys: 1..N map to the first N enabled providers in display order.
        var enabled = config.Providers.Where(p => p.Enabled).OrderBy(p => p.Order).ToList();
        for (int i = 0; i < Math.Min(enabled.Count, config.Shortcuts.Providers.Count); i++)
        {
            var providerId = enabled[i].Id;
            Register(config.Shortcuts.Providers[i], () =>
            {
                _mainViewModel?.SelectProvider(providerId);
                WindowService.Instance.ShowWindow();
            });
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        UnregisterAll();
        if (_hook != null)
        {
            _hook.KeyPressed -= OnGlobalKeyPressed;
            _hook.KeyReleased -= OnGlobalKeyReleased;
            _hook.Dispose();
            _hook = null;
        }
        ConfigService.Instance.ConfigChanged -= OnConfigChanged;
        _window = null;
    }
}
