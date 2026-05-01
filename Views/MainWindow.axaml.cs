using Avalonia.Controls;
using Avalonia.Input;

namespace NeuralDeck.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        var titleBar = this.FindControl<Border>("TitleBar");
        if (titleBar != null)
            titleBar.PointerPressed += TitleBar_PointerPressed;
    }

    private void TitleBar_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
            BeginMoveDrag(e);
    }
}
