using System;
using System.Collections.ObjectModel;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NeuralDeck.Models;
using NeuralDeck.Services;

namespace NeuralDeck.ViewModels;

public partial class ChatViewModel : ViewModelBase
{
    [ObservableProperty]
    private bool _isConnected;

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private bool _isLoadingModels = true;

    [ObservableProperty]
    private string _inputText = string.Empty;

    [ObservableProperty]
    private OllamaModel? _selectedModel;

    [ObservableProperty]
    private string _connectionStatus = "Connecting...";

    public ObservableCollection<ChatMessage> Messages { get; } = new();
    public ObservableCollection<OllamaModel> Models { get; } = new();

    private readonly OllamaService _ollamaService;
    private readonly ConfigService _configService;
    private CancellationTokenSource? _chatCts;

    public ChatViewModel()
    {
        _ollamaService = OllamaService.Instance;
        _configService = ConfigService.Instance;

        // Load saved model
        var savedModelName = GetSavedModelName();

        // Start connection check
        _ = CheckConnectionAsync();

        // Periodic polling
        Task.Run(async () =>
        {
            while (true)
            {
                await Task.Delay(Constants.OllamaPollIntervalMs);
                await CheckConnectionAsync();
            }
        });
    }

    private string GetSavedModelName()
    {
        // For now, no persistence - would use local storage
        return string.Empty;
    }

    private void SaveSelectedModel(string modelName)
    {
        // Would save to local storage
    }

    [RelayCommand]
    private async Task CheckConnectionAsync()
    {
        IsLoadingModels = true;
        ConnectionStatus = "Connecting...";

        try
        {
            var connected = await _ollamaService.HealthCheckAsync();
            IsConnected = connected;

            if (connected)
            {
                ConnectionStatus = "Connected";
                await LoadModelsAsync();
            }
            else
            {
                ConnectionStatus = "Disconnected - Ollama not running";
                IsConnected = false;
            }
        }
        catch
        {
            IsConnected = false;
            ConnectionStatus = "Connection error";
        }
        finally
        {
            IsLoadingModels = false;
        }
    }

    private async Task LoadModelsAsync()
    {
        try
        {
            var models = await _ollamaService.GetModelsAsync();
            Models.Clear();
            foreach (var model in models)
            {
                Models.Add(model);
            }

            // Select first model if none selected
            if (SelectedModel == null && Models.Count > 0)
            {
                SelectedModel = Models[0];
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ChatViewModel] Failed to load models: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task SendMessageAsync()
    {
        if (string.IsNullOrWhiteSpace(InputText) || IsLoading || !IsConnected || SelectedModel == null)
            return;

        var userMessage = InputText.Trim();
        InputText = string.Empty;

        // Add user message
        Messages.Add(new ChatMessage
        {
            Role = "user",
            Content = userMessage,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });

        // Add placeholder for assistant
        var assistantMessage = new ChatMessage
        {
            Role = "assistant",
            Content = "",
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        Messages.Add(assistantMessage);

        IsLoading = true;
        _chatCts = new CancellationTokenSource();

        try
        {
            var history = Messages
                .Where(m => m.Role != "system")
                .Select(m => new ChatMessage { Role = m.Role, Content = m.Content })
                .ToList();

            await _ollamaService.ChatAsync(
                SelectedModel.Name,
                history,
                async chunk =>
                {
                    await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
                    {
                        if (Messages.Count > 0)
                        {
                            var last = Messages[^1];
                            Messages[^1] = new ChatMessage
                            {
                                Role = last.Role,
                                Content = last.Content + chunk,
                                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                            };
                        }
                    });
                },
                _chatCts.Token);
        }
        catch (OperationCanceledException)
        {
            // Cancelled
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ChatViewModel] Chat error: {ex.Message}");
            if (Messages.Count > 0)
            {
                Messages[^1] = new ChatMessage
                {
                    Role = "assistant",
                    Content = "⚠️ **Error**: Could not connect to Ollama.",
                    Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };
            }
        }
        finally
        {
            IsLoading = false;
            _chatCts?.Dispose();
            _chatCts = null;
        }
    }

    [RelayCommand]
    private void ClearConversation()
    {
        Messages.Clear();
    }

    [RelayCommand]
    private void SelectModel(OllamaModel model)
    {
        SelectedModel = model;
        if (model != null)
        {
            SaveSelectedModel(model.Name);
        }
    }

    partial void OnSelectedModelChanged(OllamaModel? value)
    {
        if (value != null)
        {
            SaveSelectedModel(value.Name);
        }
    }

    public string FormatModelSize(long bytes) => OllamaService.FormatModelSize(bytes);
    public string GetModelDisplayName(string name) => OllamaService.GetModelDisplayName(name);
}
