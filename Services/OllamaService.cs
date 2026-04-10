using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using NeuralDeck.Models;

namespace NeuralDeck.Services;

public class OllamaService : IDisposable
{
    private static OllamaService? _instance;
    private HttpClient _httpClient;
    private string _baseUrl;
    private bool _disposed;

    public static OllamaService Instance => _instance ??= new OllamaService();

    private OllamaService()
    {
        _httpClient = new HttpClient();
        _httpClient.Timeout = TimeSpan.FromSeconds(60);
        _baseUrl = Constants.DefaultOllamaUrl;
    }

    public string BaseUrl
    {
        get => _baseUrl;
        set => _baseUrl = value.TrimEnd('/');
    }

    public async Task<bool> HealthCheckAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"{_baseUrl}/api/tags",
                cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<List<OllamaModel>> GetModelsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"{_baseUrl}/api/tags",
                cancellationToken);

            if (!response.IsSuccessStatusCode)
                return new List<OllamaModel>();

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var doc = JsonDocument.Parse(json);

            var models = new List<OllamaModel>();
            if (doc.RootElement.TryGetProperty("models", out var modelsArray))
            {
                foreach (var model in modelsArray.EnumerateArray())
                {
                    models.Add(new OllamaModel
                    {
                        Name = model.GetProperty("name").GetString() ?? "",
                        Size = model.TryGetProperty("size", out var size) ? size.GetInt64() : 0,
                        Digest = model.TryGetProperty("digest", out var digest) ? digest.GetString() ?? "" : "",
                        ModifiedAt = model.TryGetProperty("modified_at", out var modifiedAt) ? modifiedAt.GetString() ?? "" : ""
                    });
                }
            }
            return models;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[OllamaService] Failed to get models: {ex.Message}");
            return new List<OllamaModel>();
        }
    }

    public async Task ChatAsync(
        string model,
        List<ChatMessage> messages,
        Func<string, Task> onChunk,
        CancellationToken cancellationToken = default)
    {
        var request = new
        {
            model,
            messages = messages.Select(m => new { role = m.Role, content = m.Content }),
            stream = true
        };

        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await _httpClient.PostAsync($"{_baseUrl}/api/chat", content, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            await onChunk("⚠️ **Error**: Could not connect to Ollama.");
            return;
        }

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(line)) continue;

            try
            {
                var doc = JsonDocument.Parse(line);
                var root = doc.RootElement;

                if (root.TryGetProperty("message", out var msg) &&
                    msg.TryGetProperty("content", out var contentProp))
                {
                    var chunk = contentProp.GetString();
                    if (!string.IsNullOrEmpty(chunk))
                    {
                        await onChunk(chunk);
                    }
                }

                if (root.TryGetProperty("done", out var doneProp) && doneProp.GetBoolean())
                {
                    break;
                }
            }
            catch
            {
                // Ignore parse errors for incomplete JSON
            }
        }
    }

    public static string FormatModelSize(long bytes)
    {
        var gb = bytes / (1024.0 * 1024.0 * 1024.0);
        if (gb >= 1)
            return $"{gb:F1}GB";
        var mb = bytes / (1024.0 * 1024.0);
        return $"{mb:F0}MB";
    }

    public static string GetModelDisplayName(string name)
    {
        return name.Replace(":latest", "");
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _httpClient.Dispose();
    }
}
