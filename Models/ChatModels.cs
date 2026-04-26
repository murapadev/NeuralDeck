using System.Text.Json.Serialization;
using CommunityToolkit.Mvvm.ComponentModel;

namespace NeuralDeck.Models;

public partial class ChatMessage : ObservableObject
{
    public string Role { get; set; } = "user";

    [ObservableProperty]
    private string _content = string.Empty;

    public long? Timestamp { get; set; }

    // UI-only flag: true while Ollama is still streaming tokens into this message.
    // Not persisted to JSON.
    [ObservableProperty]
    [JsonIgnore]
    private bool _isStreaming;

    public bool IsUser => Role == "user";
}

public class OllamaModel
{
    public string Name { get; set; } = string.Empty;
    public long Size { get; set; }
    public string Digest { get; set; } = string.Empty;
    public string ModifiedAt { get; set; } = string.Empty;
}

public class NavigationState
{
    public bool CanGoBack { get; set; }
    public bool CanGoForward { get; set; }
    public string Url { get; set; } = string.Empty;
}
