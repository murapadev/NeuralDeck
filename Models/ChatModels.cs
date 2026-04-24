namespace NeuralDeck.Models;

public class ChatMessage
{
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
    public long? Timestamp { get; set; }
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
