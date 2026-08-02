namespace NeuralDeck.Models;

public static class OllamaConstants
{
    public const string DefaultOllamaUrl = "http://localhost:11434";
    public const int OllamaHealthTimeoutMs = 3000;
    public const int OllamaPollIntervalMs = 30000;
    // Per-read idle timeout for chat streaming. The HttpClient has no global timeout (long
    // generations must not be cut), so this guards only against a dead/stalled stream: abort
    // if no bytes arrive for this long between chunks.
    public const int OllamaStreamIdleTimeoutMs = 120000;
}
