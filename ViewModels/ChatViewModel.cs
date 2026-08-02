using System.Collections.ObjectModel;
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
    [NotifyPropertyChangedFor(nameof(CanRegenerate))]
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
    public bool CanRegenerate => !IsLoading && Messages.Count >= 1
                                 && Messages[^1].Role == "assistant";

    public string OllamaBaseUrl => _configService.GetConfig().OllamaUrl ?? OllamaConstants.DefaultOllamaUrl;

    private readonly OllamaService _ollamaService;
    private readonly ConfigService _configService;
    private CancellationTokenSource? _chatCts;
    private CancellationTokenSource? _pollCts;
    private readonly object _messagesLock = new();

    public ChatViewModel()
    {
        _ollamaService = OllamaService.Instance;
        _configService = ConfigService.Instance;

        Messages.CollectionChanged += (_, _) =>
        {
            OnPropertyChanged(nameof(HasMessages));
            OnPropertyChanged(nameof(CanRegenerate));
        };

        // Restore persisted conversation history.
        foreach (var m in ConversationStore.Load())
            Messages.Add(m);

        _ = CheckConnectionAsync();

        _pollCts = new CancellationTokenSource();
        _ = PollConnectionAsync(_pollCts.Token);
    }

    private async Task PollConnectionAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(OllamaConstants.OllamaPollIntervalMs, cancellationToken);
                await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(async () =>
                    await CheckConnectionAsync());
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatViewModel] Poll error: {ex.Message}");
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
        catch (Exception ex)
        {
            Console.WriteLine($"[ChatViewModel] Connection check failed: {ex.Message}");
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
                Models.Add(model);

            var preferred = SelectedModel?.Name ?? _configService.GetConfig().LastOllamaModel;
            SelectedModel = Models.FirstOrDefault(m => m.Name == preferred)
                            ?? Models.FirstOrDefault();
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

        Messages.Add(new ChatMessage
        {
            Role = "user",
            Content = userMessage,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });

        await RunChatAsync();
    }

    [RelayCommand]
    private async Task RegenerateAsync()
    {
        if (!CanRegenerate || SelectedModel == null) return;

        // Remove the last assistant message so it can be regenerated.
        Messages.RemoveAt(Messages.Count - 1);
        if (Messages.Count == 0) return;

        await RunChatAsync();
    }

    // Shared streaming pipeline: builds history, adds assistant placeholder, streams.
    private async Task RunChatAsync()
    {
        if (SelectedModel == null) return;

        var history = new List<ChatMessage>();
        var sysPrompt = _configService.GetConfig().OllamaSystemPrompt;
        if (!string.IsNullOrWhiteSpace(sysPrompt))
            history.Add(new ChatMessage { Role = "system", Content = sysPrompt.Trim() });
        history.AddRange(Messages
            .Where(m => m.Role != "system")
            .Select(m => new ChatMessage { Role = m.Role, Content = m.Content }));

        var assistantMessage = new ChatMessage
        {
            Role = "assistant",
            Content = "",
            IsStreaming = true,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        Messages.Add(assistantMessage);

        IsLoading = true;
        _chatCts = new CancellationTokenSource();

        try
        {
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
                                Messages[^1].Content += chunk;
                        }
                    });
                },
                _chatCts.Token);
        }
        catch (OperationCanceledException)
        {
            // User pressed Stop — partial content stays.
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ChatViewModel] Chat error: {ex.Message}");
            lock (_messagesLock)
            {
                if (Messages.Count > 0)
                    Messages[^1].Content = "⚠️ **Error**: Could not connect to Ollama.";
            }
        }
        finally
        {
            await Avalonia.Threading.Dispatcher.UIThread.InvokeAsync(() =>
            {
                lock (_messagesLock)
                {
                    if (Messages.Count > 0)
                        Messages[^1].IsStreaming = false;
                }
            });
            IsLoading = false;
            _chatCts?.Dispose();
            _chatCts = null;
            PersistConversation();
        }
    }

    private void PersistConversation()
    {
        try { ConversationStore.Save(Messages.ToList()); }
        catch (Exception ex) { Console.WriteLine($"[ChatViewModel] Persist failed: {ex.Message}"); }
    }

    [RelayCommand]
    private void ClearConversation()
    {
        // Stop any in-flight generation first — otherwise it keeps streaming into a cleared
        // conversation, wasting the request and leaving IsLoading stuck until it finishes.
        _chatCts?.Cancel();
        Messages.Clear();
        ConversationStore.Clear();
    }

    [RelayCommand]
    private void CancelStream() => _chatCts?.Cancel();

    [RelayCommand]
    private void SelectModel(OllamaModel model) => SelectedModel = model;

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
