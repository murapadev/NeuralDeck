using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Threading;
using NeuralDeck.ViewModels;

namespace NeuralDeck.Views;

public partial class ChatView : UserControl
{
    private ChatViewModel? _messagesViewModel;
    private TextBox? _messageInput;

    public ChatView()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, System.EventArgs e)
    {
        if (DataContext is ChatViewModel vm)
        {
            SubscribeToMessages(vm);
        }
        else
        {
            UnsubscribeFromMessages();
        }
    }

    private void SubscribeToMessages(ChatViewModel vm)
    {
        if (_messagesViewModel == vm) return;

        UnsubscribeFromMessages();
        _messagesViewModel = vm;
        vm.Messages.CollectionChanged += OnMessagesChanged;
    }

    private void UnsubscribeFromMessages()
    {
        if (_messagesViewModel != null)
            _messagesViewModel.Messages.CollectionChanged -= OnMessagesChanged;
        _messagesViewModel = null;
    }

    private void OnMessagesChanged(object? sender, System.Collections.Specialized.NotifyCollectionChangedEventArgs e)
    {
        ScrollToBottom();
    }

    private void ScrollToBottom()
    {
        Dispatcher.UIThread.Post(() =>
        {
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
}
