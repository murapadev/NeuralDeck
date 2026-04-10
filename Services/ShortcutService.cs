using System;
using System.Collections.Generic;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Input.Platform;
using CommunityToolkit.Mvvm.Input;
using NeuralDeck.Models;

namespace NeuralDeck.Services;

public class ShortcutService
{
    private static ShortcutService? _instance;
    private readonly Dictionary<string, Action> _registeredShortcuts = new();
    private readonly List<KeyBinding> _keyBindings = new();
    private Window? _window;
    private bool _isInitialized;

    public static ShortcutService Instance => _instance ??= new ShortcutService();

    public event EventHandler? ShortcutTriggered;

    private ShortcutService() { }

    public void Initialize(Window window)
    {
        if (_isInitialized) return;
        
        _window = window;
        _isInitialized = true;
        
        // Register configured shortcuts
        Refresh();
    }

    public void Register(string accelerator, Action callback)
    {
        if (string.IsNullOrEmpty(accelerator) || callback == null)
            return;

        if (_registeredShortcuts.ContainsKey(accelerator))
            return;

        _registeredShortcuts[accelerator] = callback;

        // Also register as Avalonia hotkey if we have a window
        if (_window != null)
        {
            var key = ParseKey(accelerator);
            var modifiers = ParseModifiers(accelerator);
            
            if (key != Key.None)
            {
                var keyBinding = new KeyBinding
                {
                    Gesture = new KeyGesture(key, modifiers),
                    Command = new RelayCommand(callback)
                };
                _keyBindings.Add(keyBinding);
                _window.KeyBindings.Add(keyBinding);
            }
        }
    }

    private Key ParseKey(string accelerator)
    {
        var parts = accelerator.Split('+');
        foreach (var part in parts)
        {
            var trimmed = part.Trim();
            if (trimmed.Equals("CommandOrControl", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Control", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Ctrl", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Shift", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Alt", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Meta", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Super", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Win", StringComparison.OrdinalIgnoreCase))
                continue;

            // Handle punctuation characters that don't parse directly to Key enum
            if (trimmed == ",")
                return Key.OemComma;

            if (Enum.TryParse<Key>(trimmed, true, out var key))
                return key;
        }
        return Key.None;
    }

    private KeyModifiers ParseModifiers(string accelerator)
    {
        var modifiers = KeyModifiers.None;
        var lower = accelerator.ToLowerInvariant();
        
        if (lower.Contains("commandorcontrol") || lower.Contains("control") || lower.Contains("ctrl"))
            modifiers |= KeyModifiers.Control;
        if (lower.Contains("shift"))
            modifiers |= KeyModifiers.Shift;
        if (lower.Contains("alt"))
            modifiers |= KeyModifiers.Alt;
        if (lower.Contains("meta") || lower.Contains("super") || lower.Contains("win"))
            modifiers |= KeyModifiers.Meta;
        
        return modifiers;
    }

    public void UnregisterAll()
    {
        if (_window != null)
        {
            foreach (var binding in _keyBindings)
            {
                _window.KeyBindings.Remove(binding);
            }
        }
        _keyBindings.Clear();
        _registeredShortcuts.Clear();
    }

    public void Refresh()
    {
        UnregisterAll();
        
        var config = ConfigService.Instance.GetConfig();

        Register(config.Shortcuts.ToggleWindow, () => WindowService.Instance.ToggleWindow());
        Register(config.Shortcuts.OpenSettings, () => WindowService.Instance.OpenSettingsWindow());
    }

    public bool HandleKeyPress(Key key, KeyModifiers modifiers, string accelerator)
    {
        var keys = ParseAccelerator(accelerator);
        if (keys.Count > 0 && key == keys[0] && CheckModifiers(modifiers, accelerator))
        {
            if (_registeredShortcuts.TryGetValue(accelerator, out var callback))
            {
                callback?.Invoke();
                ShortcutTriggered?.Invoke(this, EventArgs.Empty);
                return true;
            }
        }
        return false;
    }

    private List<Key> ParseAccelerator(string accelerator)
    {
        var keys = new List<Key>();
        var parts = accelerator.Split('+');
        foreach (var part in parts)
        {
            var trimmed = part.Trim();
            if (trimmed.Equals("CommandOrControl", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Control", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Ctrl", StringComparison.OrdinalIgnoreCase))
                continue;
            if (trimmed.Equals("Shift", StringComparison.OrdinalIgnoreCase))
                continue;
            if (trimmed.Equals("Alt", StringComparison.OrdinalIgnoreCase))
                continue;
            if (trimmed.Equals("Meta", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Super", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("Win", StringComparison.OrdinalIgnoreCase))
                continue;

            // Handle punctuation characters that don't parse directly to Key enum
            if (trimmed == ",")
            {
                keys.Add(Key.OemComma);
                continue;
            }

            if (Enum.TryParse<Key>(trimmed, true, out var key))
                keys.Add(key);
        }
        return keys;
    }

    private bool CheckModifiers(KeyModifiers modifiers, string accelerator)
    {
        var hasCtrl = accelerator.Contains("CommandOrControl") || accelerator.Contains("Control") || accelerator.Contains("Ctrl");
        var hasShift = accelerator.Contains("Shift");
        var hasAlt = accelerator.Contains("Alt");
        var hasMeta = accelerator.Contains("Meta") || accelerator.Contains("Super") || accelerator.Contains("Win");

        return (!hasCtrl || modifiers.HasFlag(KeyModifiers.Control)) &&
               (!hasShift || modifiers.HasFlag(KeyModifiers.Shift)) &&
               (!hasAlt || modifiers.HasFlag(KeyModifiers.Alt)) &&
               (!hasMeta || modifiers.HasFlag(KeyModifiers.Meta));
    }

    public void Dispose()
    {
        UnregisterAll();
        _window = null;
        _isInitialized = false;
    }
}

// Simple command implementation for Avalonia KeyBinding using WPF ICommand
public class RelayCommand : System.Windows.Input.ICommand
{
    private readonly Action _execute;

    public RelayCommand(Action execute)
    {
        _execute = execute;
    }

    public event EventHandler? CanExecuteChanged;

    public bool CanExecute(object? parameter) => true;

    public void Execute(object? parameter) => _execute();
}
