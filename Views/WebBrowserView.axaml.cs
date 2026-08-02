using System.Diagnostics;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using NeuralDeck.ViewModels;

namespace NeuralDeck.Views;

public partial class WebBrowserView : UserControl
{
    private WebBrowserViewModel? _viewModel;
    private bool _eventsWired;

    public WebBrowserView()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    // A realistic desktop User-Agent so AI providers (Claude.ai etc.) don't reject the
    // request as coming from an unknown embedded browser.
    private const string DesktopUserAgent =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

    protected override void OnLoaded(RoutedEventArgs e)
    {
        base.OnLoaded(e);

        if (Browser != null && !_eventsWired)
        {
            try
            {
                Browser.UserAgent = DesktopUserAgent;
                Browser.NavigationStarted += OnNavigationStarted;
                Browser.NavigationCompleted += OnNavigationCompleted;
                Browser.NewWindowRequested += OnNewWindowRequested;
                _eventsWired = true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WebBrowserView] NativeWebView event wiring failed: {ex.Message}");
                _viewModel?.ShowFallbackMessage(
                    "Embedded browser is unavailable on this system. Use 'Open in Browser' to open this provider.");
            }
        }

        if (AddressBar != null)
            AddressBar.KeyDown += OnAddressKeyDown;

        _viewModel?.FlushPendingUrl();
    }

    protected override void OnUnloaded(RoutedEventArgs e)
    {
        base.OnUnloaded(e);

        if (Browser != null && _eventsWired)
        {
            Browser.NavigationStarted -= OnNavigationStarted;
            Browser.NavigationCompleted -= OnNavigationCompleted;
            Browser.NewWindowRequested -= OnNewWindowRequested;
            _eventsWired = false;
        }

        if (AddressBar != null)
            AddressBar.KeyDown -= OnAddressKeyDown;
    }

    private void OnDataContextChanged(object? sender, EventArgs e)
    {
        if (_viewModel != null)
        {
            _viewModel.NavigateAction = null;
            _viewModel.GoBackAction = null;
            _viewModel.GoForwardAction = null;
            _viewModel.ReloadAction = null;
            _viewModel.OpenInBrowserAction = null;
        }

        _viewModel = DataContext as WebBrowserViewModel;
        if (_viewModel == null) return;

        _viewModel.NavigateAction = uri =>
        {
            try
            {
                if (Browser != null) Browser.Navigate(uri);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WebBrowserView] Navigate failed: {ex.Message}");
                _viewModel?.ShowFallbackMessage("Embedded browser failed to load this page.");
            }
        };
        _viewModel.GoBackAction = () => TryInvoke(() => Browser?.GoBack());
        _viewModel.GoForwardAction = () => TryInvoke(() => Browser?.GoForward());
        _viewModel.ReloadAction = () => TryInvoke(() => Browser?.Refresh());
        _viewModel.OpenInBrowserAction = OpenExternalBrowser;

        _viewModel.FlushPendingUrl();
    }

    private static void TryInvoke(Action action)
    {
        try { action(); }
        catch (Exception ex) { Console.WriteLine($"[WebBrowserView] Browser action failed: {ex.Message}"); }
    }

    private static void OpenExternalBrowser(Uri uri)
    {
        // The URI can come from the page itself (NewWindowRequested). UseShellExecute hands it
        // to xdg-open, which dispatches any scheme (file://, mailto:, custom handlers). Only
        // allow http/https so a page can't force opening arbitrary local files or handlers.
        if (uri is null || !uri.IsAbsoluteUri ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            Console.WriteLine($"[WebBrowserView] Blocked external URI with disallowed scheme: {uri}");
            return;
        }

        try
        {
            Process.Start(new ProcessStartInfo { FileName = uri.ToString(), UseShellExecute = true });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WebBrowserView] External browser failed: {ex.Message}");
        }
    }

    private void OnNavigationStarted(object? sender, WebViewNavigationStartingEventArgs e)
    {
        _viewModel?.OnNavigationStarted(e.Request);
    }

    private async void OnNavigationCompleted(object? sender, WebViewNavigationCompletedEventArgs e)
    {
        if (Browser == null) return;
        _viewModel?.OnNavigationCompleted(Browser.Source, Browser.CanGoBack, Browser.CanGoForward);
        await InjectStylesAsync();
        await FetchPageTitleAsync();
    }

    private async Task InjectStylesAsync()
    {
        if (Browser == null) return;
        const string css = @"(function(){
  var s=document.getElementById('__nd_s');
  if(s)return;
  s=document.createElement('style');
  s.id='__nd_s';
  s.textContent='::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:#1a1a1d}::-webkit-scrollbar-thumb{background:#3f3f46;border-radius:4px}::-webkit-scrollbar-thumb:hover{background:#52525b}';
  document.head&&document.head.appendChild(s);
})();";
        try { await Browser.InvokeScript(css); }
        catch (Exception ex)
        {
            // Best-effort cosmetic tweak — page may not be ready yet. Log and move on.
            Console.WriteLine($"[WebBrowserView] Style injection failed: {ex.Message}");
        }
    }

    private async Task FetchPageTitleAsync()
    {
        if (Browser == null || _viewModel == null) return;
        try
        {
            var raw = await Browser.InvokeScript("document.title");
            if (raw == null) return;
            // WebKit returns a JSON-encoded string — strip surrounding quotes if present.
            var title = raw.Length >= 2 && raw[0] == '"' && raw[^1] == '"'
                ? raw[1..^1]
                : raw;
            _viewModel.SetPageTitle(title);
        }
        catch (Exception ex)
        {
            // Best-effort — page may not have loaded yet. Log and move on.
            Console.WriteLine($"[WebBrowserView] Fetch title failed: {ex.Message}");
        }
    }

    private void OnNewWindowRequested(object? sender, WebViewNewWindowRequestedEventArgs e)
    {
        // Route popup/new-window links to the external browser instead of creating a second window.
        if (e is WebViewNavigationEventArgs navArgs && navArgs.Request != null)
        {
            OpenExternalBrowser(navArgs.Request);
            e.Handled = true;
        }
    }

    private void OnAddressKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key != Key.Return && e.Key != Key.Enter) return;
        if (_viewModel == null) return;

        var raw = _viewModel.AddressBarText?.Trim() ?? "";
        if (string.IsNullOrEmpty(raw)) return;
        if (!raw.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !raw.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            raw = "https://" + raw;

        _viewModel.NavigateTo(raw);
        e.Handled = true;
    }
}
