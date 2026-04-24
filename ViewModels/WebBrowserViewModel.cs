using System;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace NeuralDeck.ViewModels;

public partial class WebBrowserViewModel : ViewModelBase
{
    [ObservableProperty] private string _addressBarText = "";

    public Action<Uri>? OpenInBrowserAction { get; set; }

    public WebBrowserViewModel(string initialUrl = "")
    {
        _addressBarText = initialUrl;
    }

    [RelayCommand]
    private void OpenInBrowser()
    {
        var url = AddressBarText.Trim();
        if (string.IsNullOrEmpty(url)) return;
        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            url = "https://" + url;

        if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
            OpenInBrowserAction?.Invoke(uri);
    }

    public void NavigateTo(string? url)
    {
        if (!string.IsNullOrEmpty(url))
            AddressBarText = url;
    }
}
