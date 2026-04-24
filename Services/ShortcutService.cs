using System;
using System.Collections.Generic;
using System.Linq;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Threading;
using NeuralDeck.ViewModels;
using SharpHook;
using SharpHook.Native;

namespace NeuralDeck.Services;

public class ShortcutService : IDisposable
{
    private static ShortcutService? _instance;
    private readonly Dictionary<string, Action> _registeredShortcuts = new();
    private readonly List<KeyBinding> _keyBindings = new();
    private readonly HashSet<KeyCode> _pressedKeys = new();
    private Window? _window;
    private MainWindowViewModel? _mainViewModel;
    private TaskPoolGlobalHook? _hook;
    private bool _isInitialized;
    private bool _disposed;

    public static ShortcutService Instance => _instance ??= new ShortcutService();

    private ShortcutService() { }

    public void Initialize(Window window, MainWindowViewModel? mainViewModel = null)
    {
        if (_isInitialized) return;
        _window = window;
        _mainViewModel = mainViewModel;
        _isInitialized = true;

        TryStartGlobalHook();
        ConfigService.Instance.ConfigChanged += (_, _) => Dispatcher.UIThread.Post(Refresh);
        Refresh();
    }

    private void TryStartGlobalHook()
    {
        try
        {
            _hook = new TaskPoolGlobalHook();
            _hook.KeyPressed += OnGlobalKeyPressed;
            _hook.KeyReleased += OnGlobalKeyReleased;
            _ = Task.Run(() =>
            {
                try { _hook.Run(); }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ShortcutService] Global hook stopped: {ex.Message}");
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ShortcutService] Global hook unavailable: {ex.Message}");
            _hook = null;
        }
    }

    private void OnGlobalKeyPressed(object? sender, KeyboardHookEventArgs e)
    {
        _pressedKeys.Add(e.Data.KeyCode);

        foreach (var (accelerator, action) in _registeredShortcuts)
        {
            if (MatchesAccelerator(accelerator))
            {
                Dispatcher.UIThread.InvokeAsync(action);
            }
        }
    }

    private void OnGlobalKeyReleased(object? sender, KeyboardHookEventArgs e)
    {
        _pressedKeys.Remove(e.Data.KeyCode);
    }

    private bool MatchesAccelerator(string accelerator)
    {
        var parts = accelerator.Split('+');
        KeyCode? mainKey = null;
        bool needsCtrl = false, needsShift = false, needsAlt = false, needsMeta = false;

        foreach (var part in parts)
        {
            var t = part.Trim();
            if (t.Equals("CommandOrControl", StringComparison.OrdinalIgnoreCase) ||
                t.Equals("Control", StringComparison.OrdinalIgnoreCase) ||
                t.Equals("Ctrl", StringComparison.OrdinalIgnoreCase))
                needsCtrl = true;
            else if (t.Equals("Shift", StringComparison.OrdinalIgnoreCase))
                needsShift = true;
            else if (t.Equals("Alt", StringComparison.OrdinalIgnoreCase))
                needsAlt = true;
            else if (t.Equals("Meta", StringComparison.OrdinalIgnoreCase) ||
                     t.Equals("Super", StringComparison.OrdinalIgnoreCase) ||
                     t.Equals("Win", StringComparison.OrdinalIgnoreCase))
                needsMeta = true;
            else
                mainKey = MapToKeyCode(t);
        }

        if (mainKey == null || !_pressedKeys.Contains(mainKey.Value)) return false;

        bool hasCtrl = _pressedKeys.Contains(KeyCode.VcLeftControl) || _pressedKeys.Contains(KeyCode.VcRightControl);
        bool hasShift = _pressedKeys.Contains(KeyCode.VcLeftShift) || _pressedKeys.Contains(KeyCode.VcRightShift);
        bool hasAlt = _pressedKeys.Contains(KeyCode.VcLeftAlt) || _pressedKeys.Contains(KeyCode.VcRightAlt);
        bool hasMeta = _pressedKeys.Contains(KeyCode.VcLeftMeta) || _pressedKeys.Contains(KeyCode.VcRightMeta);

        return (!needsCtrl || hasCtrl) &&
               (!needsShift || hasShift) &&
               (!needsAlt || hasAlt) &&
               (!needsMeta || hasMeta);
    }

    private static KeyCode? MapToKeyCode(string key) => key.ToUpperInvariant() switch
    {
        "SPACE" => KeyCode.VcSpace,
        "," => KeyCode.VcComma,
        "A" => KeyCode.VcA, "B" => KeyCode.VcB, "C" => KeyCode.VcC,
        "D" => KeyCode.VcD, "E" => KeyCode.VcE, "F" => KeyCode.VcF,
        "G" => KeyCode.VcG, "H" => KeyCode.VcH, "I" => KeyCode.VcI,
        "J" => KeyCode.VcJ, "K" => KeyCode.VcK, "L" => KeyCode.VcL,
        "M" => KeyCode.VcM, "N" => KeyCode.VcN, "O" => KeyCode.VcO,
        "P" => KeyCode.VcP, "Q" => KeyCode.VcQ, "R" => KeyCode.VcR,
        "S" => KeyCode.VcS, "T" => KeyCode.VcT, "U" => KeyCode.VcU,
        "V" => KeyCode.VcV, "W" => KeyCode.VcW, "X" => KeyCode.VcX,
        "Y" => KeyCode.VcY, "Z" => KeyCode.VcZ,
        "1" => KeyCode.Vc1, "2" => KeyCode.Vc2, "3" => KeyCode.Vc3,
        "4" => KeyCode.Vc4, "5" => KeyCode.Vc5, "6" => KeyCode.Vc6,
        "7" => KeyCode.Vc7, "8" => KeyCode.Vc8, "9" => KeyCode.Vc9,
        "0" => KeyCode.Vc0,
        "F1" => KeyCode.VcF1, "F2" => KeyCode.VcF2, "F3" => KeyCode.VcF3,
        "F4" => KeyCode.VcF4, "F5" => KeyCode.VcF5, "F6" => KeyCode.VcF6,
        "F7" => KeyCode.VcF7, "F8" => KeyCode.VcF8, "F9" => KeyCode.VcF9,
        "F10" => KeyCode.VcF10, "F11" => KeyCode.VcF11, "F12" => KeyCode.VcF12,
        "LEFT" => KeyCode.VcLeft, "RIGHT" => KeyCode.VcRight,
        "UP" => KeyCode.VcUp, "DOWN" => KeyCode.VcDown,
        _ => null
    };

    public void Register(string accelerator, Action callback)
    {
        if (string.IsNullOrEmpty(accelerator) || _registeredShortcuts.ContainsKey(accelerator))
            return;

        _registeredShortcuts[accelerator] = callback;

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
                    Command = new HotKeyCommand(callback)
                };
                _keyBindings.Add(kb);
                _window.KeyBindings.Add(kb);
            }
        }
    }

    private static Key ParseAvaloniaKey(string accelerator)
    {
        foreach (var part in accelerator.Split('+'))
        {
            var t = part.Trim();
            if (IsModifierToken(t)) continue;
            if (t == ",") return Key.OemComma;
            if (Enum.TryParse<Key>(t, true, out var k)) return k;
        }
        return Key.None;
    }

    private static KeyModifiers ParseAvaloniaModifiers(string accelerator)
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
        _registeredShortcuts.Clear();
    }

    public void Refresh()
    {
        UnregisterAll();
        var config = ConfigService.Instance.GetConfig();

        Register(config.Shortcuts.ToggleWindow, WindowService.Instance.ToggleWindow);
        Register(config.Shortcuts.OpenSettings, WindowService.Instance.OpenSettingsWindow);

        // Ctrl+Q — clean shutdown through the application lifetime.
        Register("CommandOrControl+Q", () =>
        {
            if (Avalonia.Application.Current?.ApplicationLifetime is
                Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime desktop)
            {
                desktop.Shutdown();
            }
        });

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
        _window = null;
    }
}

internal class HotKeyCommand : System.Windows.Input.ICommand
{
    private readonly Action _execute;
    public HotKeyCommand(Action execute) => _execute = execute;
#pragma warning disable CS0067
    public event EventHandler? CanExecuteChanged;
#pragma warning restore CS0067
    public bool CanExecute(object? parameter) => true;
    public void Execute(object? parameter) => _execute();
}
