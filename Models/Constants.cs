namespace NeuralDeck.Models;

public static class AppConstants
{
    // Window dimensions
    public const int DefaultWindowWidth = 420;
    public const int DefaultWindowHeight = 700;
    public const int MinWindowWidth = 380;
    public const int MinWindowHeight = 500;

    // Sidebar dimensions
    public const int SidebarCollapsedWidth = 72;
    public const int SidebarExpandedWidth = 140;

    // Ollama
    public const string DefaultOllamaUrl = "http://localhost:11434";
    public const int OllamaHealthTimeoutMs = 3000;
    public const int OllamaPollIntervalMs = 30000;

    // Animation
    public const int AnimationFastMs = 150;
    public const int AnimationNormalMs = 200;
    public const int AnimationSlowMs = 300;

    // Default providers — first 6 enabled by default, extra providers disabled so they don't
    // overwhelm new users; they can be enabled in Settings → Providers.
    public static List<ProviderConfig> DefaultProviders { get; } = new()
    {
        new ProviderConfig { Id = "chatgpt",   Name = "ChatGPT",   Url = "https://chatgpt.com",             Icon = "chatgpt",   Color = "#10a37f", Enabled = true,  Order = 0, IsCustom = false },
        new ProviderConfig { Id = "gemini",    Name = "Gemini",    Url = "https://gemini.google.com/app",   Icon = "gemini",    Color = "#8e44ef", Enabled = true,  Order = 1, IsCustom = false },
        new ProviderConfig { Id = "claude",    Name = "Claude",    Url = "https://claude.ai/new",           Icon = "claude",    Color = "#d97706", Enabled = true,  Order = 2, IsCustom = false },
        new ProviderConfig { Id = "deepseek",  Name = "DeepSeek",  Url = "https://chat.deepseek.com",       Icon = "deepseek",  Color = "#3b82f6", Enabled = true,  Order = 3, IsCustom = false },
        new ProviderConfig { Id = "perplexity",Name = "Perplexity",Url = "https://www.perplexity.ai",       Icon = "perplexity",Color = "#22c55e", Enabled = true,  Order = 4, IsCustom = false },
        new ProviderConfig { Id = "ollama",    Name = "Ollama",    Url = "http://localhost:11434",           Icon = "ollama",    Color = "#1f2937", Enabled = true,  Order = 5, IsCustom = false },
        new ProviderConfig { Id = "grok",      Name = "Grok",      Url = "https://grok.com",                Icon = "grok",      Color = "#e5e5e5", Enabled = false, Order = 6, IsCustom = false },
        new ProviderConfig { Id = "copilot",   Name = "Copilot",   Url = "https://copilot.microsoft.com",   Icon = "copilot",   Color = "#0078d4", Enabled = false, Order = 7, IsCustom = false },
        new ProviderConfig { Id = "mistral",   Name = "Mistral",   Url = "https://chat.mistral.ai/chat",    Icon = "mistral",   Color = "#ff7000", Enabled = false, Order = 8, IsCustom = false },
        new ProviderConfig { Id = "meta",      Name = "Meta AI",   Url = "https://www.meta.ai",             Icon = "meta",      Color = "#0082fb", Enabled = false, Order = 9, IsCustom = false },
    };

    // Colors
    public const string DefaultAccentColor = "#6366f1";
    public static readonly string[] AccentColorOptions = new[]
    {
        "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#22c55e", "#14b8a6", "#3b82f6"
    };
}
