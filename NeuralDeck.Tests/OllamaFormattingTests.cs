using NeuralDeck.Models;
using NeuralDeck.Services;
using Xunit;

namespace NeuralDeck.Tests;

public class OllamaFormattingTests
{
    [Theory]
    [InlineData(4_831_838_208L, "4.5GB")]
    [InlineData(1_073_741_824L, "1.0GB")]
    [InlineData(274_302_450L, "262MB")]
    [InlineData(0L, "0MB")]
    public void FormatModelSize_UsesGbAboveOneGib(long bytes, string expected)
    {
        Assert.Equal(expected, OllamaService.FormatModelSize(bytes).Replace(',', '.'));
    }

    [Theory]
    [InlineData("llama3:latest", "llama3")]
    [InlineData("qwen3:8b", "qwen3:8b")]
    [InlineData("mistral", "mistral")]
    public void OllamaModel_DisplayName_StripsOnlyLatestTag(string name, string expected)
    {
        Assert.Equal(expected, new OllamaModel { Name = name }.DisplayName);
    }
}
