namespace NeuralDeck.Models;

public class ProviderConfig
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = "#ffffff";
    public bool Enabled { get; set; } = true;
    public int Order { get; set; } = 0;
    public bool IsCustom { get; set; } = false;

    public ProviderConfig Clone()
    {
        return new ProviderConfig
        {
            Id = Id,
            Name = Name,
            Url = Url,
            Icon = Icon,
            Color = Color,
            Enabled = Enabled,
            Order = Order,
            IsCustom = IsCustom
        };
    }
}
