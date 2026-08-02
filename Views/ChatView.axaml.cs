using System.Collections.Specialized;
using System.ComponentModel;
using System.Text;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Input.Platform;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Avalonia.Threading;
using NeuralDeck.Models;
using NeuralDeck.ViewModels;

namespace NeuralDeck.Views;

public partial class ChatView : UserControl
{
    private ChatViewModel? _messagesViewModel;
    private TextBox? _messageInput;
    private bool _scrollPending;

    public ChatView()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, System.EventArgs e)
    {
        if (DataContext is ChatViewModel vm)
            SubscribeToMessages(vm);
        else
            UnsubscribeFromMessages();
    }

    private void SubscribeToMessages(ChatViewModel vm)
    {
        if (_messagesViewModel == vm) return;
        UnsubscribeFromMessages();
        _messagesViewModel = vm;
        vm.Messages.CollectionChanged += OnMessagesChanged;
        foreach (var msg in vm.Messages)
            msg.PropertyChanged += OnMessagePropertyChanged;
    }

    private void UnsubscribeFromMessages()
    {
        if (_messagesViewModel != null)
        {
            _messagesViewModel.Messages.CollectionChanged -= OnMessagesChanged;
            foreach (var msg in _messagesViewModel.Messages)
                msg.PropertyChanged -= OnMessagePropertyChanged;
        }
        _messagesViewModel = null;
    }

    private void OnMessagesChanged(object? sender, NotifyCollectionChangedEventArgs e)
    {
        if (e.NewItems != null)
            foreach (ChatMessage msg in e.NewItems)
                msg.PropertyChanged += OnMessagePropertyChanged;
        if (e.OldItems != null)
            foreach (ChatMessage msg in e.OldItems)
                msg.PropertyChanged -= OnMessagePropertyChanged;
        ScrollToBottom();
    }

    private void OnMessagePropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        // Scroll on every streaming token. Coalesced via _scrollPending flag so
        // rapid token bursts only queue one scroll action at a time.
        if (e.PropertyName == nameof(ChatMessage.Content))
            ScrollToBottom();
    }

    private void ScrollToBottom()
    {
        if (_scrollPending) return;
        _scrollPending = true;
        Dispatcher.UIThread.Post(() =>
        {
            _scrollPending = false;
            var sv = this.FindControl<ScrollViewer>("MessagesScrollViewer");
            if (sv != null)
                sv.SetCurrentValue(ScrollViewer.OffsetProperty,
                    new Vector(sv.Offset.X, double.MaxValue));
        }, DispatcherPriority.Background);
    }

    protected override void OnLoaded(RoutedEventArgs e)
    {
        base.OnLoaded(e);
        _messageInput = this.FindControl<TextBox>("MessageInput");
        if (_messageInput != null)
        {
            _messageInput.KeyDown -= OnInputKeyDown;
            _messageInput.KeyDown += OnInputKeyDown;
        }

        if (DataContext is ChatViewModel vm)
            SubscribeToMessages(vm);

        FocusInput();
    }

    protected override void OnPropertyChanged(AvaloniaPropertyChangedEventArgs change)
    {
        base.OnPropertyChanged(change);
        // Auto-focus the input whenever the chat panel becomes visible (user switches to Ollama).
        if (change.Property == IsVisibleProperty && IsVisible)
            FocusInput();
    }

    private void FocusInput()
    {
        if (_messageInput != null && DataContext is ChatViewModel vm && vm.IsConnected)
            _messageInput.Focus();
    }

    protected override void OnUnloaded(RoutedEventArgs e)
    {
        base.OnUnloaded(e);
        if (_messageInput != null)
            _messageInput.KeyDown -= OnInputKeyDown;
        _messageInput = null;
        UnsubscribeFromMessages();
    }

    private void OnInputKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Return && !e.KeyModifiers.HasFlag(KeyModifiers.Shift))
        {
            e.Handled = true;
            if (DataContext is ChatViewModel vm)
                vm.SendMessageCommand.Execute(null);
        }
    }

    private void OnSuggestClick(object? sender, RoutedEventArgs e)
    {
        if (sender is not Button btn || btn.Tag is not string prompt) return;
        if (DataContext is ChatViewModel vm)
            vm.InputText = prompt + " ";
        _messageInput?.Focus();
        // Move caret to end
        if (_messageInput != null)
            _messageInput.CaretIndex = _messageInput.Text?.Length ?? 0;
    }

    private async void OnExportClick(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not ChatViewModel vm || vm.Messages.Count == 0) return;
        var topLevel = TopLevel.GetTopLevel(this);
        if (topLevel == null) return;

        var file = await topLevel.StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Export conversation",
            SuggestedFileName = $"neuraldeck_{DateTime.Now:yyyy-MM-dd_HH-mm}",
            DefaultExtension = "md",
            FileTypeChoices = new[]
            {
                new FilePickerFileType("Markdown") { Patterns = new[] { "*.md" } },
                new FilePickerFileType("Plain text") { Patterns = new[] { "*.txt" } }
            }
        });

        if (file == null) return;

        var sb = new StringBuilder();
        sb.AppendLine($"# NeuralDeck — Ollama chat export");
        sb.AppendLine($"*Exported {DateTime.Now:yyyy-MM-dd HH:mm}*");
        sb.AppendLine();

        foreach (var msg in vm.Messages)
        {
            if (msg.Role == "system") continue;
            sb.AppendLine($"### {(msg.IsUser ? "You" : "Ollama")}");
            sb.AppendLine(msg.Content.TrimEnd());
            sb.AppendLine();
        }

        await using var stream = await file.OpenWriteAsync();
        await using var writer = new StreamWriter(stream, Encoding.UTF8);
        await writer.WriteAsync(sb.ToString());
    }

    private async void OnCopyClick(object? sender, RoutedEventArgs e)
    {
        if (sender is not Button btn || btn.Tag is not string text) return;
        var clipboard = TopLevel.GetTopLevel(this)?.Clipboard;
        if (clipboard == null) return;
        await clipboard.SetValueAsync(DataFormat.Text, text);
        // Brief visual feedback: flash the button to full opacity then fade back.
        var prev = btn.Opacity;
        btn.Opacity = 1.0;
        await Task.Delay(600);
        btn.Opacity = prev;
    }
}
