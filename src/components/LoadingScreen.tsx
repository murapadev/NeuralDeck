import { useTranslation } from '../i18n'
import { Progress } from './ui/progress'

function LoadingScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-background">
      {/* Animated logo */}
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)',
            boxShadow: '0 10px 25px hsl(var(--primary) / 0.25)',
          }}
        >
          <span className="text-foreground font-bold text-2xl">N</span>
        </div>
        {/* Loading ring */}
        <div
          className="absolute -inset-3 rounded-3xl border-2 loading-ring"
          style={{ borderColor: 'hsl(var(--primary) / 0.3)' }}
        />
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
