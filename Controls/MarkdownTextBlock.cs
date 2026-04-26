using System;
using System.Text.RegularExpressions;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Documents;
using Avalonia.Layout;
using Avalonia.Media;
using NeuralDeck.Controls;

namespace NeuralDeck.Controls;

/// <summary>
/// Renders a subset of Markdown as native Avalonia controls.
/// Handles code fences, headers (H1-H3), bold, italic, inline code, bullets, numbered lists,
/// and horizontal rules. Designed for Ollama chat responses.
/// </summary>
public sealed partial class MarkdownTextBlock : ContentControl
{
    public static readonly StyledProperty<string?> TextProperty =
        AvaloniaProperty.Register<MarkdownTextBlock, string?>(nameof(Text));

    public static readonly StyledProperty<double> BaseSizeProperty =
        AvaloniaProperty.Register<MarkdownTextBlock, double>(nameof(BaseSize), 13.0);

    public string? Text
    {
        get => GetValue(TextProperty);
        set => SetValue(TextProperty, value);
    }

    public double BaseSize
    {
        get => GetValue(BaseSizeProperty);
        set => SetValue(BaseSizeProperty, value);
    }

    protected override void OnPropertyChanged(AvaloniaPropertyChangedEventArgs change)
    {
        base.OnPropertyChanged(change);
        if (change.Property == TextProperty || change.Property == BaseSizeProperty)
        {
            // Skip rebuild when hidden — we're behind an IsStreaming=true SelectableTextBlock.
            // Rebuild is triggered below when IsVisible flips back to true.
            if (IsVisible) Rebuild();
        }
        else if (change.Property == IsVisibleProperty && IsVisible)
        {
            // Streaming just ended and this control became visible — build the final markdown.
            Rebuild();
        }
    }

    private void Rebuild()
    {
        if (string.IsNullOrEmpty(Text))
        {
            Content = null;
            return;
        }

        var panel = new StackPanel { Spacing = 5 };
        foreach (var block in MarkdownParser.Parse(Text))
            panel.Children.Add(RenderBlock(block, BaseSize));
        Content = panel;
    }

    private static Control RenderBlock(MarkdownParser.Block block, double size) => block.Type switch
    {
        MarkdownParser.BlockType.Header1       => BuildHeader(block.Content, size + 6, FontWeight.Bold),
        MarkdownParser.BlockType.Header2       => BuildHeader(block.Content, size + 3, FontWeight.SemiBold),
        MarkdownParser.BlockType.Header3       => BuildHeader(block.Content, size + 1, FontWeight.Medium),
        MarkdownParser.BlockType.CodeFence     => BuildCodeFence(block.Content, block.Language, size),
        MarkdownParser.BlockType.BulletList    => BuildItemList(block.Content, size, ordered: false),
        MarkdownParser.BlockType.NumberedList  => BuildItemList(block.Content, size, ordered: true),
        MarkdownParser.BlockType.Blockquote    => BuildBlockquote(block.Content, size),
        MarkdownParser.BlockType.HorizontalRule => new Border
        {
            Height = 1,
            Background = new SolidColorBrush(Color.Parse("#3f3f46")),
            Margin = new Thickness(0, 4)
        },
        _ => BuildParagraph(block.Content, size)
    };

    // ── Block builders ───────────────────────────────────────────────────────

    private static TextBlock BuildHeader(string text, double size, FontWeight weight)
    {
        var tb = new TextBlock
        {
            FontSize = size,
            FontWeight = weight,
            Foreground = new SolidColorBrush(Color.Parse("#fafafa")),
            TextWrapping = TextWrapping.Wrap,
            Margin = new Thickness(0, 4, 0, 2)
        };
        AddInlines(tb, text, size);
        return tb;
    }

    private static Control BuildCodeFence(string code, string? language, double size)
    {
        var monoFamily = FontFamily.Parse(
            "Cascadia Code,JetBrains Mono,Fira Code,Consolas,monospace");

        Border? langLabel = language != null
            ? new Border
            {
                Background = new SolidColorBrush(Color.Parse("#1a1a27")),
                CornerRadius = new CornerRadius(6, 6, 0, 0),
                Padding = new Thickness(12, 5),
                Child = new TextBlock
                {
                    Text = language,
                    FontSize = size - 2,
                    FontFamily = monoFamily,
                    Foreground = new SolidColorBrush(Color.Parse("#a1a1aa"))
                }
            }
            : null;

        var codeBody = new Border
        {
            Background = new SolidColorBrush(Color.Parse("#0d0d14")),
            BorderBrush = new SolidColorBrush(Color.Parse("#27272a")),
            BorderThickness = new Thickness(1),
            CornerRadius = langLabel != null ? new CornerRadius(0, 0, 6, 6) : new CornerRadius(6),
            Padding = new Thickness(12, 10),
            Child = new SelectableTextBlock
            {
                Text = code,
                FontFamily = monoFamily,
                FontSize = size - 1,
                Foreground = new SolidColorBrush(Color.Parse("#e2e8f0")),
                TextWrapping = TextWrapping.Wrap
            }
        };

        if (langLabel == null) return codeBody;

        var wrapper = new StackPanel { Spacing = 0, Margin = new Thickness(0, 2, 0, 2) };
        wrapper.Children.Add(langLabel);
        wrapper.Children.Add(codeBody);
        return wrapper;
    }

    private static Control BuildItemList(string content, double size, bool ordered)
    {
        var items = content.Split('\n');
        var panel = new StackPanel { Spacing = 3, Margin = new Thickness(6, 0, 0, 0) };

        for (int n = 0; n < items.Length; n++)
        {
            var item = items[n];
            if (string.IsNullOrWhiteSpace(item)) continue;

            var row = new Grid { ColumnDefinitions = new ColumnDefinitions("24,*") };

            var marker = new TextBlock
            {
                Text = ordered ? $"{n + 1}." : "•",
                FontSize = size,
                Foreground = new SolidColorBrush(ordered
                    ? Color.Parse("#a1a1aa")
                    : Color.Parse("#6366f1")),
                VerticalAlignment = VerticalAlignment.Top
            };

            var text = new TextBlock
            {
                FontSize = size,
                Foreground = new SolidColorBrush(Color.Parse("#e4e4e7")),
                TextWrapping = TextWrapping.Wrap,
                LineHeight = size * 1.5
            };
            AddInlines(text, item.Trim(), size);

            Grid.SetColumn(marker, 0);
            Grid.SetColumn(text, 1);
            row.Children.Add(marker);
            row.Children.Add(text);
            panel.Children.Add(row);
        }

        return panel;
    }

    private static Control BuildBlockquote(string content, double size)
    {
        var inner = new StackPanel { Spacing = 4 };
        foreach (var line in content.Split('\n'))
        {
            var tb = new TextBlock
            {
                FontSize = size,
                Foreground = new SolidColorBrush(Color.Parse("#a1a1aa")),
                FontStyle = FontStyle.Italic,
                TextWrapping = TextWrapping.Wrap,
                LineHeight = size * 1.5
            };
            AddInlines(tb, line, size);
            inner.Children.Add(tb);
        }
        return new Border
        {
            BorderThickness = new Thickness(3, 0, 0, 0),
            BorderBrush = new SolidColorBrush(Color.Parse("#3f3f46")),
            Padding = new Thickness(12, 6),
            Margin = new Thickness(0, 2),
            Background = new SolidColorBrush(Color.Parse("#18181b")),
            CornerRadius = new CornerRadius(0, 4, 4, 0),
            Child = inner
        };
    }

    private static TextBlock BuildParagraph(string text, double size)
    {
        var tb = new TextBlock
        {
            FontSize = size,
            Foreground = new SolidColorBrush(Color.Parse("#e4e4e7")),
            TextWrapping = TextWrapping.Wrap,
            LineHeight = size * 1.5
        };
        AddInlines(tb, text, size);
        return tb;
    }

    // ── Inline parser ────────────────────────────────────────────────────────

    // Matches **bold**, `code`, *italic*, [link](url) — in priority order.
    [GeneratedRegex(@"\*\*(.+?)\*\*|`([^`]+)`|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)")]
    private static partial Regex InlineRegex();

    private static readonly FontFamily MonoFamily =
        FontFamily.Parse("Cascadia Code,JetBrains Mono,Fira Code,Consolas,monospace");

    private static void AddInlines(TextBlock tb, string text, double size)
    {
        int last = 0;
        foreach (Match m in InlineRegex().Matches(text))
        {
            if (m.Index > last)
                tb.Inlines!.Add(new Run(text[last..m.Index]));

            if (m.Groups[1].Success)                    // **bold**
                tb.Inlines!.Add(new Run(m.Groups[1].Value) { FontWeight = FontWeight.Bold });
            else if (m.Groups[2].Success)               // `code`
                tb.Inlines!.Add(new Run(m.Groups[2].Value)
                {
                    FontFamily = MonoFamily,
                    FontSize = size - 1,
                    Foreground = new SolidColorBrush(Color.Parse("#c4b5fd")),
                    Background = new SolidColorBrush(Color.Parse("#1a1127"))
                });
            else if (m.Groups[3].Success)               // *italic*
                tb.Inlines!.Add(new Run(m.Groups[3].Value) { FontStyle = FontStyle.Italic });
            else if (m.Groups[4].Success)               // [text](url)
                tb.Inlines!.Add(new Run(m.Groups[4].Value)
                {
                    Foreground = new SolidColorBrush(Color.Parse("#818cf8")),
                    TextDecorations = TextDecorations.Underline
                });

            last = m.Index + m.Length;
        }
        if (last < text.Length)
            tb.Inlines!.Add(new Run(text[last..]));
    }
}
