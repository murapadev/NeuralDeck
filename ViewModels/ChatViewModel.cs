using System;
using System.Collections.ObjectModel;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NeuralDeck.Models;
using NeuralDeck.Services;

namespace NeuralDeck.ViewModels;

public partial class ChatViewModel : ViewModelBase, IDisposable
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
    public bool HasMessages => Messages.Count > 0;

    private readonly OllamaService _ollamaService;
    private readonly ConfigService _configService;
    private CancellationTokenSource? _chatCts;
    private CancellationTokenSource? _pollCts;
    private readonly object _messagesLock = new();

    public ChatViewModel()
    {
        _ollamaService = OllamaService.Instance;
        _configService = ConfigService.Instance;

        Messages.CollectionChanged += (_, _) => OnPropertyChanged(nameof(HasMessages));

        // Restore persisted conversation history.
        foreach (var m in ConversationStore.Load())
            Messages.Add(m);

        // Start connection check
        _ = CheckConnectionAsync();

        // Periodic polling
        _pollCts = new CancellationTokenSource();
        _ = PollConnectionAsync(_pollCts.Token);
    }

    private async Task PollConnectionAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(AppConstants.OllamaPollIntervalMs, cancellationToken);
                await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(async () =>
                {
                    await CheckConnectionAsync();
                });
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch
            {
                // Continue polling even on errors
            }
        }
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

            // Prefer the user's previously selected model if it still exists.
            if (SelectedModel == null && Models.Count > 0)
            {
                var preferred = _configService.GetConfig().LastOllamaModel;
                SelectedModel = Models.FirstOrDefault(m => m.Name == preferred) ?? Models[0];
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
                        lock (_messagesLock)
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
            lock (_messagesLock)
            {
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
        }
        finally
        {
            IsLoading = false;
            _chatCts?.Dispose();
            _chatCts = null;
            PersistConversation();
        }
    }

    private void PersistConversation()
    {
        try
        {
            ConversationStore.Save(Messages.ToList());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ChatViewModel] Persist failed: {ex.Message}");
        }
    }

    [RelayCommand]
    private void ClearConversation()
    {
        Messages.Clear();
        ConversationStore.Clear();
    }

    [RelayCommand]
    private void CancelStream()
    {
        _chatCts?.Cancel();
    }

    [RelayCommand]
    private void SelectModel(OllamaModel model)
    {
        SelectedModel = model;
    }

    partial void OnSelectedModelChanged(OllamaModel? value)
    {
        if (value != null)
            _configService.UpdateGeneral(lastOllamaModel: value.Name);
    }

    public string FormatModelSize(long bytes) => OllamaService.FormatModelSize(bytes);
    public string GetModelDisplayName(string name) => OllamaService.GetModelDisplayName(name);

    public void Dispose()
    {
        PersistConversation();
        _pollCts?.Cancel();
        _pollCts?.Dispose();
        _pollCts = null;
        _chatCts?.Cancel();
        _chatCts?.Dispose();
        _chatCts = null;
    }
}
