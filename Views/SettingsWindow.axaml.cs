using Avalonia.Controls;
using Avalonia.Input;

namespace NeuralDeck.Views;

public partial class SettingsWindow : Window
{
    public SettingsWindow()
    {
        InitializeComponent();
        KeyDown += OnKeyDown;

        var titleBar = this.FindControl<Border>("TitleBar");
        if (titleBar != null)
            titleBar.PointerPressed += OnTitleBarPressed;
    }

    private void OnTitleBarPressed(object? sender, PointerPressedEventArgs e)
    {
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
            BeginMoveDrag(e);
    }

    private void OnKeyDown(object? sender, KeyEventArgs e)
    {
        bool close = e.Key == Key.Escape
            || (e.Key == Key.W && e.KeyModifiers == KeyModifiers.Control);
        if (close)
        {
            Close();
            e.Handled = true;
        }
    }
}
