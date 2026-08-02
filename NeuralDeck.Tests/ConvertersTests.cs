using NeuralDeck.Converters;
using Xunit;

namespace NeuralDeck.Tests;

public class FirstTwoConverterTests
{
    private readonly FirstTwoConverter _converter = new();

    [Fact]
    public void Convert_TwoOrMoreChars_ReturnsFirstTwoUppercased()
    {
        Assert.Equal("AB", _converter.Convert("abcdef", typeof(string), null, null!));
    }

    [Fact]
    public void Convert_SingleChar_ReturnsThatCharUppercased()
    {
        Assert.Equal("X", _converter.Convert("x", typeof(string), null, null!));
    }

    [Fact]
    public void Convert_EmptyString_ReturnsPlaceholder()
    {
        Assert.Equal("??", _converter.Convert("", typeof(string), null, null!));
    }

    [Fact]
    public void Convert_Null_ReturnsPlaceholder()
    {
        Assert.Equal("??", _converter.Convert(null, typeof(string), null, null!));
    }
}
