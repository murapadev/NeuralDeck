using System;
using System.Collections.Generic;
using Avalonia.Input;
using NeuralDeck.Models;

namespace NeuralDeck.Services;

public class ShortcutService
{
    private static ShortcutService? _instance;
    private readonly Dictionary<string, Action> _registeredShortcuts = new();

    public static ShortcutService Instance => _instance ??= new ShortcutService();

    public event EventHandler? ShortcutTriggered;

    private ShortcutService() { }

    public void Register(string accelerator, Action callback)
    {
        if (_registeredShortcuts.ContainsKey(accelerator))
            return;

        _registeredShortcuts[accelerator] = callback;
    }

    public void UnregisterAll()
    {
        _registeredShortcuts.Clear();
    }

    public void Refresh()
    {
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
}
