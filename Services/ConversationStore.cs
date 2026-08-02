using System.Text.Json;
using NeuralDeck.Models;

namespace NeuralDeck.Services;

public sealed class ConversationStore
{
    private static readonly string AppDataPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "NeuralDeck");

    private static readonly string HistoryFile = Path.Combine(AppDataPath, "ollama-history.json");

    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private const int MaxPersistedMessages = 200;

    public static List<ChatMessage> Load()
    {
        try
        {
            if (!File.Exists(HistoryFile)) return new List<ChatMessage>();
            var text = File.ReadAllText(HistoryFile);
            var list = JsonSerializer.Deserialize<List<ChatMessage>>(text, Options);
            return list ?? new List<ChatMessage>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ConversationStore] Load failed: {ex.Message}");
            return new List<ChatMessage>();
        }
    }

    public static void Save(IReadOnlyList<ChatMessage> messages)
    {
        try
        {
            Directory.CreateDirectory(AppDataPath);
            var trimmed = messages.Count > MaxPersistedMessages
                ? new List<ChatMessage>(messages)[^MaxPersistedMessages..]
                : new List<ChatMessage>(messages);
            File.WriteAllText(HistoryFile, JsonSerializer.Serialize(trimmed, Options));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ConversationStore] Save failed: {ex.Message}");
        }
    }

    public static void Clear()
    {
        try
        {
            if (File.Exists(HistoryFile)) File.Delete(HistoryFile);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ConversationStore] Clear failed: {ex.Message}");
        }
    }
}
