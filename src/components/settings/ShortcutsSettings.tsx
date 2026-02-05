import { useState } from 'react'
import type { ShortcutConfig } from '../../../shared/types'
import { UI_LIMITS } from '../../../shared/types'
import { useTranslation } from '../../i18n'
import { cn } from '../../lib/utils'
import { useAppStore, useShortcutsConfig } from '../../store/appStore'
import { trpc } from '../../utils/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

const ShortcutInput = ({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) => {
  const [recording, setRecording] = useState(false)
  const [keys, setKeys] = useState<string[]>([])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault()
    const modifiers: string[] = []
    if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl')
    if (e.altKey) modifiers.push('Alt')
    if (e.shiftKey) modifiers.push('Shift')

    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      const shortcut = [...modifiers, key].join('+')
      onChange(shortcut)
      setRecording(false)
      setKeys([])
    } else {
      setKeys(modifiers)
    }
  }

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={recording ? (keys.length > 0 ? keys.join('+') + '+...' : 'Press keys...') : value}
          readOnly
          onFocus={() => setRecording(true)}
          onKeyDown={recording ? handleKeyDown : undefined}
          onBlur={() => {
            setRecording(false)
            setKeys([])
          }}
          className={cn(
            'font-mono text-center cursor-pointer transition-all',
            recording
              ? 'border-primary ring-2 ring-primary/20 bg-primary/10 text-primary'
              : 'hover:bg-muted'
          )}
        />
        {recording && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
    </div>
  )
}

export const ShortcutsSettings = () => {
  const { t } = useTranslation()
  const shortcutsConfig = useShortcutsConfig()
  const providers = useAppStore((s) => s.providers)
  const setConfig = useAppStore((s) => s.setConfig)
  const shortcutsMutation = trpc.updateShortcuts.useMutation({
    onSuccess: (data) => setConfig(data),
  })

  if (!shortcutsConfig) return null

  const updateShortcutsConfig = (updates: Partial<ShortcutConfig>) => {
    shortcutsMutation.mutate(updates)
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.shortcuts.toggleWindow')}</CardTitle>
          <CardDescription>{t('settings.shortcuts.toggleWindowDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ShortcutInput
            label={t('settings.shortcuts.toggleWindow')}
            value={shortcutsConfig.toggleWindow}
            onChange={(v) => updateShortcutsConfig({ toggleWindow: v })}
          />
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.shortcuts.section.navigation')}</CardTitle>
          <CardDescription>{t('settings.shortcuts.section.navigationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ShortcutInput
            label={t('settings.shortcuts.reload')}
            value={shortcutsConfig.reload}
            onChange={(v) => updateShortcutsConfig({ reload: v })}
          />
          <ShortcutInput
            label={t('settings.shortcuts.back')}
            value={shortcutsConfig.goBack}
            onChange={(v) => updateShortcutsConfig({ goBack: v })}
          />
          <ShortcutInput
            label={t('settings.shortcuts.forward')}
            value={shortcutsConfig.goForward}
            onChange={(v) => updateShortcutsConfig({ goForward: v })}
          />
          <ShortcutInput
            label={t('settings.shortcuts.openSettings')}
            value={shortcutsConfig.openSettings}
            onChange={(v) => updateShortcutsConfig({ openSettings: v })}
          />
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.shortcuts.section.providers')}</CardTitle>
          <CardDescription>{t('settings.shortcuts.section.providersDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {providers.slice(0, UI_LIMITS.MAX_PROVIDER_SHORTCUTS).map((provider, index) => (
              <div
                key={provider.id}
                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background/50 border border-border"
              >
                <span className="text-sm font-medium text-foreground min-w-[100px]">
                  {provider.name}
                </span>
                <div className="flex-1 max-w-[200px]">
                  <ShortcutInput
                    label=""
                    value={shortcutsConfig.providers[index] || `CommandOrControl+${index + 1}`}
                    onChange={(v) => {
                      const newProviders = [...shortcutsConfig.providers]
                      newProviders[index] = v
                      updateShortcutsConfig({ providers: newProviders })
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
