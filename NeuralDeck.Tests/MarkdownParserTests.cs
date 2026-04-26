using NeuralDeck.Controls;
using Xunit;
using static NeuralDeck.Controls.MarkdownParser;

namespace NeuralDeck.Tests;

public class MarkdownParserTests
{
    [Fact]
    public void ParsePlainText_ReturnsSingleParagraph()
    {
        var blocks = MarkdownParser.Parse("Hello world");
        Assert.Single(blocks);
        Assert.Equal(BlockType.Paragraph, blocks[0].Type);
        Assert.Equal("Hello world", blocks[0].Content);
    }

    [Fact]
    public void ParseHeaders_DetectsAllLevels()
    {
        var md = "# H1\n## H2\n### H3";
        var blocks = MarkdownParser.Parse(md);
        Assert.Equal(3, blocks.Count);
        Assert.Equal(BlockType.Header1, blocks[0].Type);
        Assert.Equal("H1", blocks[0].Content);
        Assert.Equal(BlockType.Header2, blocks[1].Type);
        Assert.Equal(BlockType.Header3, blocks[2].Type);
    }

    [Fact]
    public void ParseCodeFence_ExtractsLanguageAndContent()
    {
        var md = "```python\nprint('hello')\n```";
        var blocks = MarkdownParser.Parse(md);
        Assert.Single(blocks);
        var b = blocks[0];
        Assert.Equal(BlockType.CodeFence, b.Type);
        Assert.Equal("python", b.Language);
        Assert.Equal("print('hello')", b.Content);
    }

    [Fact]
    public void ParseCodeFence_NoLanguage_LanguageIsNull()
    {
        var blocks = MarkdownParser.Parse("```\ncode\n```");
        Assert.Null(blocks[0].Language);
    }

    [Fact]
    public void ParseBulletList_CollectsItems()
    {
        var md = "- Item A\n- Item B\n- Item C";
        var blocks = MarkdownParser.Parse(md);
        Assert.Single(blocks);
        Assert.Equal(BlockType.BulletList, blocks[0].Type);
        var items = blocks[0].Content.Split('\n');
        Assert.Equal(3, items.Length);
        Assert.Equal("Item A", items[0]);
        Assert.Equal("Item B", items[1]);
        Assert.Equal("Item C", items[2]);
    }

    [Fact]
    public void ParseNumberedList_CollectsItems()
    {
        var md = "1. First\n2. Second";
        var blocks = MarkdownParser.Parse(md);
        Assert.Single(blocks);
        Assert.Equal(BlockType.NumberedList, blocks[0].Type);
        var items = blocks[0].Content.Split('\n');
        Assert.Equal("First", items[0]);
        Assert.Equal("Second", items[1]);
    }

    [Fact]
    public void ParseHorizontalRule_Detected()
    {
        var blocks = MarkdownParser.Parse("---");
        Assert.Single(blocks);
        Assert.Equal(BlockType.HorizontalRule, blocks[0].Type);
    }

    [Fact]
    public void ParseEmptyString_ReturnsNoBlocks()
    {
        var blocks = MarkdownParser.Parse(string.Empty);
        Assert.Empty(blocks);
    }

    [Fact]
    public void ParseBlankLines_AreSkipped()
    {
        var blocks = MarkdownParser.Parse("\n\n\n");
        Assert.Empty(blocks);
    }

    [Fact]
    public void ParseMixedContent_CorrectOrder()
    {
        var md = """
            # Title

            Some paragraph text.

            ```csharp
            var x = 1;
            ```

            - bullet A
            - bullet B
            """;
        var blocks = MarkdownParser.Parse(md);
        Assert.Equal(4, blocks.Count);
        Assert.Equal(BlockType.Header1, blocks[0].Type);
        Assert.Equal(BlockType.Paragraph, blocks[1].Type);
        Assert.Equal(BlockType.CodeFence, blocks[2].Type);
        Assert.Equal(BlockType.BulletList, blocks[3].Type);
    }

    [Fact]
    public void ParseMultiLineParagraph_JoinsWithSpace()
    {
        var md = "Line one\nLine two\nLine three";
        var blocks = MarkdownParser.Parse(md);
        Assert.Single(blocks);
        Assert.Equal("Line one Line two Line three", blocks[0].Content);
    }

    [Fact]
    public void ParseCodeFence_MultiLine_PreservesNewlines()
    {
        var md = "```\nline1\nline2\nline3\n```";
        var blocks = MarkdownParser.Parse(md);
        Assert.Equal("line1\nline2\nline3", blocks[0].Content);
    }

    [Fact]
    public void ParseWindowsLineEndings_HandledGracefully()
    {
        var md = "# Hello\r\n\r\nParagraph\r\n";
        var blocks = MarkdownParser.Parse(md);
        Assert.Equal(2, blocks.Count);
        Assert.Equal(BlockType.Header1, blocks[0].Type);
        Assert.Equal(BlockType.Paragraph, blocks[1].Type);
    }

    [Fact]
    public void ParseStarBullet_AlsoDetected()
    {
        var blocks = MarkdownParser.Parse("* one\n* two");
        Assert.Single(blocks);
        Assert.Equal(BlockType.BulletList, blocks[0].Type);
    }

    [Fact]
    public void ParseParagraphWithLink_KeptAsText()
    {
        // Links are rendered inline by MarkdownTextBlock; the parser just sees a paragraph.
        var blocks = MarkdownParser.Parse("See [Avalonia](https://avaloniaui.net) for details.");
        Assert.Single(blocks);
        Assert.Equal(BlockType.Paragraph, blocks[0].Type);
        Assert.Contains("[Avalonia]", blocks[0].Content);
    }

    [Fact]
    public void ParseCodeFence_IndentedCode_PreservesIndent()
    {
        var md = "```python\ndef hello():\n    return 42\n```";
        var blocks = MarkdownParser.Parse(md);
        Assert.Single(blocks);
        Assert.Equal(BlockType.CodeFence, blocks[0].Type);
        Assert.Equal("python", blocks[0].Language);
        Assert.Contains("    return 42", blocks[0].Content);
    }
}
