using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;

namespace NeuralDeck.ViewModels;

public partial class ProviderDisplay : ObservableObject
{
    [ObservableProperty] private bool _isSelected;
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#6366f1";
    public string Id { get; set; } = "";
    public string ShortcutHint { get; set; } = "";
    public ICommand SelectCommand { get; set; } = null!;
}
