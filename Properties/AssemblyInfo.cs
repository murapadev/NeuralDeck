using System.Runtime.CompilerServices;

// Lets NeuralDeck.Tests exercise internal-only helpers (e.g. ShortcutService's key-token
// mapping) without widening the public API surface just for testability.
[assembly: InternalsVisibleTo("NeuralDeck.Tests")]
