import { useTranslation } from '../i18n'
import { Progress } from './ui/progress'

function LoadingScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-background">
      {/* Animated logo */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neural-500 to-neural-700 flex items-center justify-center shadow-lg shadow-neural-500/25">
          <span className="text-foreground font-bold text-2xl">N</span>
        </div>
        {/* Loading ring */}
        <div className="absolute -inset-3 rounded-3xl border-2 border-neural-500/30 loading-ring" />
      </div>

      {/* Text */}
      <div className="mt-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">NeuralDeck</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('loading.message')}</p>
      </div>

      {/* Progress indicator */}
      <Progress value={60} className="mt-8 w-48 h-1 bg-muted" />
    </div>
  )
}

export default LoadingScreen
