import type { AppearanceConfig } from '../../../shared/types'
import { COLORS } from '../../../shared/types'
import { useTranslation } from '../../i18n'
import { useAppearanceConfig, useAppStore } from '../../store/appStore'
import { trpc } from '../../utils/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export const AppearanceSettings = () => {
  const { t } = useTranslation()
  const appearanceConfig = useAppearanceConfig()
  const setConfig = useAppStore((s) => s.setConfig)
  const appearanceMutation = trpc.updateAppearance.useMutation({
    onSuccess: (data) => setConfig(data),
  })

  if (!appearanceConfig) return null

  const updateAppearanceConfig = (updates: Partial<AppearanceConfig>) => {
    appearanceMutation.mutate(updates)
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.appearance.theme')}</CardTitle>
          <CardDescription>{t('settings.appearance.themeDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="theme-select">{t('settings.appearance.themeMode')}</Label>
            <Select
              value={appearanceConfig.theme}
              onValueChange={(v) =>
                updateAppearanceConfig({ theme: v as 'dark' | 'light' | 'system' })
              }
            >
              <SelectTrigger id="theme-select" className="w-[200px] bg-background border-border">
                <SelectValue placeholder={t('settings.appearance.selectTheme')} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="dark">{t('settings.appearance.dark')}</SelectItem>
                <SelectItem value="light">{t('settings.appearance.light')}</SelectItem>
                <SelectItem value="system">{t('settings.appearance.system')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.appearance.typography')}</CardTitle>
          <CardDescription>{t('settings.appearance.typographyDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="font-size">{t('settings.appearance.fontSize')}</Label>
            <Select
              value={appearanceConfig.fontSize}
              onValueChange={(v) =>
                updateAppearanceConfig({ fontSize: v as 'small' | 'medium' | 'large' })
              }
            >
              <SelectTrigger id="font-size" className="w-[200px] bg-background border-border">
                <SelectValue placeholder={t('settings.appearance.selectSize')} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="small">{t('settings.appearance.small')}</SelectItem>
                <SelectItem value="medium">{t('settings.appearance.medium')}</SelectItem>
                <SelectItem value="large">{t('settings.appearance.large')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.appearance.accentColor')}</CardTitle>
          <CardDescription>{t('settings.appearance.accentColorDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {COLORS.ACCENT_OPTIONS.map((color) => (
              <button
                key={color}
                onClick={() => updateAppearanceConfig({ accentColor: color })}
                className={`w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95 ${
                  appearanceConfig.accentColor === color
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110'
                    : 'hover:ring-2 hover:ring-foreground/50 hover:ring-offset-2 hover:ring-offset-background'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select accent color ${color}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
