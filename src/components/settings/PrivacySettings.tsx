import { AlertCircle } from 'lucide-react'
import type { PrivacyConfig } from '../../../shared/types'
import { useTranslation } from '../../i18n'
import { useAppStore, usePrivacyConfig } from '../../store/appStore'
import { trpc } from '../../utils/trpc'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

export const PrivacySettings = () => {
  const { t } = useTranslation()
  const privacyConfig = usePrivacyConfig()
  const providers = useAppStore((s) => s.providers)
  const setConfig = useAppStore((s) => s.setConfig)

  const privacyMutation = trpc.updatePrivacy.useMutation({
    onSuccess: (data) => setConfig(data),
  })
  const clearDataMutation = trpc.clearAllData.useMutation()

  if (!privacyConfig) return null

  const updatePrivacyConfig = (updates: Partial<PrivacyConfig>) => {
    privacyMutation.mutate(updates)
  }

  const handleClearAllData = () => {
    if (confirm(t('settings.privacy.clearDataConfirm'))) {
      clearDataMutation.mutate()
    }
  }

  const toggleIncognitoProvider = (id: string) => {
    const current = privacyConfig.incognitoProviders
    const updated = current.includes(id) ? current.filter((p) => p !== id) : [...current, id]
    updatePrivacyConfig({ incognitoProviders: updated })
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Session Data */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.privacy')}</CardTitle>
          <CardDescription>{t('settings.privacy.privacyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="clear-on-close" className="flex flex-col space-y-1">
              <span>{t('settings.privacy.clearOnClose')}</span>
              <span className="font-normal text-xs text-muted-foreground">
                {t('settings.privacy.clearOnCloseDesc')}
              </span>
            </Label>
            <Switch
              id="clear-on-close"
              checked={privacyConfig.clearOnClose}
              onCheckedChange={(v) => updatePrivacyConfig({ clearOnClose: v })}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="block-trackers" className="flex flex-col space-y-1">
              <span>{t('settings.privacy.blockTrackers')}</span>
              <span className="font-normal text-xs text-muted-foreground">
                {t('settings.privacy.blockTrackersDesc')}
              </span>
            </Label>
            <Switch
              id="block-trackers"
              checked={privacyConfig.blockTrackers}
              onCheckedChange={(v) => updatePrivacyConfig({ blockTrackers: v })}
            />
          </div>

          <div className="pt-4 border-t border-border">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold text-sm">{t('settings.privacy.dangerZone')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.privacy.dangerZoneDesc')}</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAllData}
                className="self-start"
              >
                {t('settings.privacy.clearAllData')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incognito Mode */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.privacy.incognito')}</CardTitle>
          <CardDescription>{t('settings.privacy.incognitoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
            >
              <span className="text-sm font-medium">{provider.name}</span>
              <Switch
                checked={privacyConfig.incognitoProviders.includes(provider.id)}
                onCheckedChange={() => toggleIncognitoProvider(provider.id)}
              />
            </div>
          ))}
          {providers.length === 0 && (
            <p className="text-sm text-muted-foreground italic col-span-2 text-center py-4">
              {t('settings.privacy.noProviders')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
