import { useState } from 'react'

import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { trpc } from '../utils/trpc'
import { ProviderIcons } from './icons'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Checkbox } from './ui/checkbox'

export default function Onboarding() {
  const { config, setConfig } = useAppStore()
  const [step, setStep] = useState(0)
  const updateGeneralMutation = trpc.updateGeneral.useMutation()
  const updateProvidersMutation = trpc.updateProvidersList.useMutation()

  if (!config?.firstRun) return null

  const providers = config.providers

  const handleToggleProvider = (id: string, enabled: boolean) => {
    if (!config) return
    const newProviders = config.providers.map((p) => (p.id === id ? { ...p, enabled } : p))
    setConfig({ ...config, providers: newProviders })
    // We don't save to disk yet, we wait until finish
  }

  const handleFinish = async () => {
    if (!config) return

    // Save providers
    await updateProvidersMutation.mutateAsync(config.providers)

    // Set firstRun to false
    await updateGeneralMutation.mutateAsync({ firstRun: false })

    // Update local store to remove onboarding
    setConfig({ ...config, firstRun: false })
  }

  const steps = [
    // Step 0: Welcome
    <div
      key="step-welcome"
      className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_-10px_rgba(167,139,250,0.5)] border border-white/10">
        <Sparkles className="w-12 h-12 text-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
          NeuralDeck
        </h1>
        <p className="text-muted-foreground text-lg max-w-sm">
          Your invisible AI command center. Access all your AI models from one place.
        </p>
      </div>
      <Button
        size="lg"
        className="mt-8 rounded-full px-8 bg-foreground text-background hover:bg-foreground/90"
        onClick={() => setStep(1)}
      >
        Get Started <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>,

    // Step 1: Select Providers
    <div
      key="step-providers"
      className="flex flex-col space-y-6 w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-300"
    >
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold">Select Your AIs</h2>
        <p className="text-muted-foreground">Choose the providers you want to access instantly.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {providers.map((provider) => {
          const Icon = ProviderIcons[provider.icon as keyof typeof ProviderIcons]
          return (
            <div
              key={provider.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer',
                provider.enabled
                  ? 'bg-foreground/5 border-foreground/20 shadow-[0_0_15px_-5px_rgba(128,128,128,0.2)]'
                  : 'bg-transparent border-foreground/5 hover:bg-foreground/5 opacity-50 hover:opacity-100'
              )}
              onClick={() => handleToggleProvider(provider.id, !provider.enabled)}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: provider.enabled ? `${provider.color}20` : '#ffffff10',
                  }}
                >
                  {Icon ? (
                    <Icon
                      className="w-6 h-6"
                      color={provider.enabled ? provider.color : 'currentColor'}
                    />
                  ) : (
                    <span className="font-bold text-xs">{provider.name.slice(0, 2)}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{provider.name}</span>
                </div>
              </div>
              <Checkbox
                checked={provider.enabled}
                onCheckedChange={(c: boolean | string) => handleToggleProvider(provider.id, !!c)}
                className="data-[state=checked]:bg-foreground data-[state=checked]:text-background border-foreground/20"
              />
            </div>
          )
        })}
      </div>

      <Button
        size="lg"
        className="w-full mt-4 bg-foreground text-background hover:bg-foreground/90"
        onClick={handleFinish}
      >
        Finish Setup <Check className="ml-2 w-4 h-4" />
      </Button>
    </div>,
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
      <Card className="w-full max-w-3xl min-h-[500px] bg-card/90 border-border shadow-2xl flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

        {steps[step]}

        {/* Progress dots for Step 1+ */}
        {step > 0 && (
          <div className="absolute bottom-8 flex gap-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i === step ? 'bg-foreground' : 'bg-foreground/20'
                )}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
