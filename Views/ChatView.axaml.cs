using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Threading;
using NeuralDeck.ViewModels;

namespace NeuralDeck.Views;

public partial class ChatView : UserControl
{
    public ChatView()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, System.EventArgs e)
    {
        if (DataContext is ChatViewModel vm)
        {
            vm.Messages.CollectionChanged += (_, _) => ScrollToBottom();
        }
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

    protected override void OnLoaded(Avalonia.Interactivity.RoutedEventArgs e)
    {
        base.OnLoaded(e);
        var input = this.FindControl<TextBox>("MessageInput");
        if (input != null)
            input.KeyDown += OnInputKeyDown;
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
