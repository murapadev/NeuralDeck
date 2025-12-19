function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-950">
      {/* Animated logo */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neural-500 to-neural-700 flex items-center justify-center shadow-lg shadow-neural-500/25">
          <span className="text-white font-bold text-2xl">N</span>
        </div>
        {/* Loading ring */}
        <div className="absolute -inset-3 rounded-3xl border-2 border-neural-500/30 loading-ring" />
      </div>
      
      {/* Text */}
      <div className="mt-6 text-center">
        <h1 className="text-xl font-semibold text-white">NeuralDeck</h1>
        <p className="mt-2 text-sm text-neutral-500">Loading your AI command center...</p>
      </div>
      
      {/* Progress indicator */}
      <div className="mt-8 w-48 h-1 bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-neural-500 to-neural-400 rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  )
}

export default LoadingScreen
