using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using NeuralDeck.Models;

namespace NeuralDeck.Services;

public class ConfigService
{
    private static readonly string AppDataPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "NeuralDeck");

    private static readonly string ConfigFilePath = Path.Combine(AppDataPath, "config.json");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private AppConfig _config = new();
    private readonly object _configLock = new();
    private static ConfigService? _instance;

    public static ConfigService Instance => _instance ??= new ConfigService();

    public event EventHandler<AppConfig>? ConfigChanged;

    private ConfigService()
    {
        EnsureAppDataDirectory();
        LoadConfig();
    }

    private void EnsureAppDataDirectory()
    {
        if (!Directory.Exists(AppDataPath))
        {
            Directory.CreateDirectory(AppDataPath);
        }
    }

    public AppConfig GetConfig() => _config;

    public void LoadConfig()
    {
        try
        {
            if (File.Exists(ConfigFilePath))
            {
                var json = File.ReadAllText(ConfigFilePath);
                var loaded = JsonSerializer.Deserialize<AppConfig>(json, JsonOptions);
                if (loaded != null)
                {
                    _config = NormalizeConfig(loaded);
                    SaveConfig();
                }
            }
            else
            {
                _config = CreateDefaultConfig();
                SaveConfig();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ConfigService] Failed to load config: {ex.Message}");
            _config = CreateDefaultConfig();
            SaveConfig();
        }
    }

    private AppConfig CreateDefaultConfig()
    {
        return new AppConfig
        {
            Version = "0.5.0",
            Debug = false,
            FirstRun = true,
            LastProvider = null,
            Window = new WindowConfig
            {
                Width = AppConstants.DefaultWindowWidth,
                Height = AppConstants.DefaultWindowHeight,
                Position = "near-tray",
                AlwaysOnTop = true,
                HideOnBlur = true,
                Opacity = 1.0
            },
            Shortcuts = new ShortcutConfig(),
            Providers = AppConstants.DefaultProviders.Select(p => p.Clone()).ToList(),
            Privacy = new PrivacyConfig(),
            Appearance = new AppearanceConfig()
        };
    }

    private AppConfig NormalizeConfig(AppConfig config)
    {
        // Ensure all required providers exist
        var existingIds = config.Providers.Select(p => p.Id).ToHashSet();
        foreach (var defaultProvider in AppConstants.DefaultProviders)
        {
            if (!existingIds.Contains(defaultProvider.Id))
            {
                config.Providers.Add(defaultProvider.Clone());
            }
        }

        // Migration: older configs stored Ollama with a pure-white color, which makes
        // the white-on-white glyph invisible in the sidebar. Refresh it to the new default.
        var ollama = config.Providers.FirstOrDefault(p => p.Id == "ollama");
        if (ollama != null && string.Equals(ollama.Color, "#ffffff", StringComparison.OrdinalIgnoreCase))
            ollama.Color = "#1f2937";

        // Ensure window config has valid values
        if (config.Window.Width < 300) config.Window.Width = AppConstants.DefaultWindowWidth;
        if (config.Window.Height < 400) config.Window.Height = AppConstants.DefaultWindowHeight;
        if (config.Window.Opacity < 0.1 || config.Window.Opacity > 1.0) config.Window.Opacity = 1.0;

        return config;
    }

    public void SaveConfig()
    {
        try
        {
            var json = JsonSerializer.Serialize(_config, JsonOptions);
            File.WriteAllText(ConfigFilePath, json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ConfigService] Failed to save config: {ex.Message}");
        }
    }

    public void UpdateConfig(Action<AppConfig> updateAction)
    {
        updateAction(_config);
        SaveConfig();
        ConfigChanged?.Invoke(this, _config);
    }

    public void UpdateWindow(Action<WindowConfig> updateAction)
    {
        updateAction(_config.Window);
        SaveConfig();
        ConfigChanged?.Invoke(this, _config);
    }

    public void UpdateAppearance(Action<AppearanceConfig> updateAction)
    {
        updateAction(_config.Appearance);
        SaveConfig();
        ConfigChanged?.Invoke(this, _config);
    }

    public void UpdateShortcuts(Action<ShortcutConfig> updateAction)
    {
        updateAction(_config.Shortcuts);
        SaveConfig();
        ConfigChanged?.Invoke(this, _config);
    }

    public void UpdatePrivacy(Action<PrivacyConfig> updateAction)
    {
        updateAction(_config.Privacy);
        SaveConfig();
        ConfigChanged?.Invoke(this, _config);
    }

    public void UpdateProviders(List<ProviderConfig> providers)
    {
        _config.Providers = providers;
        SaveConfig();
        ConfigChanged?.Invoke(this, _config);
    }

    public void UpdateGeneral(
        bool? firstRun = null,
        string? lastProvider = null,
        bool? debug = null,
        string? lastOllamaModel = null,
        string? ollamaUrl = null)
    {
        if (firstRun.HasValue) _config.FirstRun = firstRun.Value;
        if (lastProvider != null) _config.LastProvider = lastProvider;
        if (debug.HasValue) _config.Debug = debug.Value;
        if (lastOllamaModel != null) _config.LastOllamaModel = lastOllamaModel;
        if (!string.IsNullOrWhiteSpace(ollamaUrl)) _config.OllamaUrl = ollamaUrl.Trim();
        SaveConfig();
        ConfigChanged?.Invoke(this, _config);
    }

    public List<ProviderConfig> GetEnabledProviders()
    {
        return _config.Providers
            .Where(p => p.Enabled)
            .OrderBy(p => p.Order)
            .ToList();
    }

    public void MarkFirstRunComplete()
    {
        UpdateGeneral(firstRun: false);
    }

    public string GetConfigPath() => ConfigFilePath;
}
