using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace NeuralDeck.ViewModels;

public partial class WebBrowserViewModel : ViewModelBase
{
    [ObservableProperty] private string _addressBarText = "";
    [ObservableProperty] private bool _isLoading;
    [ObservableProperty] private bool _canGoBack;
    [ObservableProperty] private bool _canGoForward;
    [ObservableProperty] private string _statusText = "";
    [ObservableProperty] private string _pageTitle = "";
    [ObservableProperty] private bool _showFallback;
    [ObservableProperty] private string _fallbackMessage = "";

    public Action<Uri>? NavigateAction { get; set; }
    public Action? GoBackAction { get; set; }
    public Action? GoForwardAction { get; set; }
    public Action? ReloadAction { get; set; }
    public Action<Uri>? OpenInBrowserAction { get; set; }

    private string? _pendingUrl;

    public WebBrowserViewModel(string initialUrl = "")
    {
        _addressBarText = initialUrl;
        _pendingUrl = string.IsNullOrEmpty(initialUrl) ? null : initialUrl;
    }

    [RelayCommand(CanExecute = nameof(CanGoBack))]
    private void GoBack() => GoBackAction?.Invoke();

    [RelayCommand(CanExecute = nameof(CanGoForward))]
    private void GoForward() => GoForwardAction?.Invoke();

    [RelayCommand]
    private void Reload() => ReloadAction?.Invoke();

    [RelayCommand]
    private void Go() => NavigateTo(AddressBarText);

    [RelayCommand]
    private void OpenInBrowser()
    {
        var url = NormalizeUrl(AddressBarText);
        if (url != null)
            OpenInBrowserAction?.Invoke(url);
    }

    partial void OnCanGoBackChanged(bool value) => GoBackCommand.NotifyCanExecuteChanged();
    partial void OnCanGoForwardChanged(bool value) => GoForwardCommand.NotifyCanExecuteChanged();

    public void NavigateTo(string? url)
    {
        if (string.IsNullOrEmpty(url)) return;
        AddressBarText = url;
        _pendingUrl = url;

        if (NavigateAction != null)
        {
            var uri = NormalizeUrl(url);
            if (uri != null)
            {
                NavigateAction.Invoke(uri);
                _pendingUrl = null;
            }
        }
    }

    public void FlushPendingUrl()
    {
        if (string.IsNullOrEmpty(_pendingUrl) || NavigateAction == null) return;
        var uri = NormalizeUrl(_pendingUrl);
        if (uri != null)
        {
            NavigateAction.Invoke(uri);
            _pendingUrl = null;
        }
    }

    public void OnNavigationStarted(Uri? url)
    {
        IsLoading = true;
        // A fresh navigation attempt supersedes any stale failure banner from a previous one.
        ShowFallback = false;
        if (url != null)
        {
            AddressBarText = url.ToString();
            StatusText = $"Loading {url.Host}…";
        }
    }

    public void OnNavigationCompleted(Uri? currentUrl, bool canGoBack, bool canGoForward, bool isSuccess = true)
    {
        IsLoading = false;
        if (currentUrl != null)
            AddressBarText = currentUrl.ToString();
        CanGoBack = canGoBack;
        CanGoForward = canGoForward;

        if (!isSuccess)
        {
            ShowFallbackMessage(currentUrl != null
                ? $"Couldn't load {currentUrl.Host}. Check your connection and try reloading."
                : "Couldn't load this page. Check your connection and try reloading.");
            return;
        }

        StatusText = PageTitle.Length > 0 ? $"{PageTitle}  •  {currentUrl?.Host}" : (currentUrl?.Host ?? "");
    }

    public void SetPageTitle(string title)
    {
        PageTitle = title;
        var host = NormalizeUrl(AddressBarText)?.Host ?? "";
        StatusText = title.Length > 0 && host.Length > 0 ? $"{title}  •  {host}" : title;
    }

    public void ShowFallbackMessage(string message)
    {
        ShowFallback = true;
        FallbackMessage = message;
    }

    private static Uri? NormalizeUrl(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var text = input.Trim();
        if (!text.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !text.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            text = "https://" + text;
        return Uri.TryCreate(text, UriKind.Absolute, out var uri) ? uri : null;
    }
}
