using System.Collections.Generic;

namespace NeuralDeck.Controls;

/// <summary>
/// Splits markdown text into a flat list of typed blocks.
/// Pure logic — no Avalonia dependency — so it can be unit-tested in isolation.
/// </summary>
public static class MarkdownParser
{
    public enum BlockType
    {
        Paragraph,
        Header1, Header2, Header3,
        CodeFence,
        BulletList,
        NumberedList,
        HorizontalRule,
        Blockquote
    }

    public sealed record Block(BlockType Type, string Content, string? Language = null);

    public static List<Block> Parse(string markdown)
    {
        var blocks = new List<Block>();
        var lines = markdown.Replace("\r\n", "\n").Split('\n');
        var i = 0;

        while (i < lines.Length)
        {
            var line = lines[i].TrimEnd();

            // ── Code fence ───────────────────────────────────────────────
            if (line.StartsWith("```"))
            {
                var lang = line.Length > 3 ? line[3..].Trim() : null;
                if (string.IsNullOrEmpty(lang)) lang = null;
                var code = new List<string>();
                i++;
                while (i < lines.Length && !lines[i].TrimEnd().StartsWith("```"))
                    code.Add(lines[i++].TrimEnd('\r'));
                if (i < lines.Length) i++; // skip closing ```
                blocks.Add(new Block(BlockType.CodeFence, string.Join("\n", code), lang));
                continue;
            }

            // ── Horizontal rule ──────────────────────────────────────────
            if (line is "---" or "***" or "___")
            {
                blocks.Add(new Block(BlockType.HorizontalRule, string.Empty));
                i++;
                continue;
            }

            // ── Headers ──────────────────────────────────────────────────
            if (line.StartsWith("### ")) { blocks.Add(new Block(BlockType.Header3, line[4..])); i++; continue; }
            if (line.StartsWith("## "))  { blocks.Add(new Block(BlockType.Header2, line[3..])); i++; continue; }
            if (line.StartsWith("# "))   { blocks.Add(new Block(BlockType.Header1, line[2..])); i++; continue; }

            // ── Bullet list ──────────────────────────────────────────────
            if (IsBulletLine(line))
            {
                var items = new List<string>();
                while (i < lines.Length && IsBulletLine(lines[i].TrimEnd()))
                {
                    items.Add(StripBullet(lines[i].TrimEnd()));
                    i++;
                }
                blocks.Add(new Block(BlockType.BulletList, string.Join("\n", items)));
                continue;
            }

            // ── Numbered list ─────────────────────────────────────────────
            if (IsNumberedLine(line))
            {
                var items = new List<string>();
                while (i < lines.Length && IsNumberedLine(lines[i].TrimEnd()))
                {
                    items.Add(StripNumber(lines[i].TrimEnd()));
                    i++;
                }
                blocks.Add(new Block(BlockType.NumberedList, string.Join("\n", items)));
                continue;
            }

            // ── Blockquote ───────────────────────────────────────────────
            if (line.StartsWith("> ") || line == ">")
            {
                var qlines = new List<string>();
                while (i < lines.Length)
                {
                    var l = lines[i].TrimEnd();
                    if (l.StartsWith("> ")) { qlines.Add(l[2..]); i++; }
                    else if (l == ">") { qlines.Add(""); i++; }
                    else break;
                }
                blocks.Add(new Block(BlockType.Blockquote, string.Join("\n", qlines)));
                continue;
            }

            // ── Blank line ───────────────────────────────────────────────
            if (string.IsNullOrWhiteSpace(line)) { i++; continue; }

            // ── Paragraph (collect until blank or block boundary) ─────────
            var para = new List<string>();
            while (i < lines.Length)
            {
                var l = lines[i].TrimEnd();
                if (string.IsNullOrWhiteSpace(l)) { i++; break; }
                if (l.StartsWith("```") || l.StartsWith("# ") || l.StartsWith("## ") ||
                    l.StartsWith("### ") || IsBulletLine(l) || IsNumberedLine(l) ||
                    l is "---" or "***" or "___")
                    break;
                para.Add(l);
                i++;
            }
            if (para.Count > 0)
                blocks.Add(new Block(BlockType.Paragraph, string.Join(" ", para)));
        }

        return blocks;
    }

    private static bool IsBulletLine(string line) =>
        line.StartsWith("- ") || line.StartsWith("* ") || line.StartsWith("+ ");

    private static string StripBullet(string line) => line.Length > 2 ? line[2..] : string.Empty;

    private static bool IsNumberedLine(string line)
    {
        var dot = line.IndexOf(". ");
        if (dot < 1) return false;
        return int.TryParse(line[..dot], out _);
    }

    private static string StripNumber(string line)
    {
        var dot = line.IndexOf(". ");
        return dot >= 0 && line.Length > dot + 2 ? line[(dot + 2)..] : line;
    }
}
