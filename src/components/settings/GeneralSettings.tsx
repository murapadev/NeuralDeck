import type { WindowConfig } from '../../../shared/types'
import { useTranslation } from '../../i18n'
import { useAppStore, useWindowConfig } from '../../store/appStore'
import { trpc } from '../../utils/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Slider } from '../ui/slider'
import { Switch } from '../ui/switch'

export const GeneralSettings = () => {
  const { t } = useTranslation()
  const windowConfig = useWindowConfig()
  const setConfig = useAppStore((s) => s.setConfig)
  const windowMutation = trpc.updateWindow.useMutation({
    onSuccess: (data) => setConfig(data),
  })

  const { config } = useAppStore()
  const appearanceConfig = config?.appearance || { language: 'en' }
  const appearanceMutation = trpc.updateAppearance.useMutation({
    onSuccess: (data) => setConfig(data),
  })

  // Ensure config is loaded
  if (!windowConfig) return null

  const updateWindowConfig = (updates: Partial<WindowConfig>) => {
    windowMutation.mutate(updates)
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Language Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.general.language')}</CardTitle>
          <CardDescription>{t('settings.general.languageDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="language-select">{t('settings.general.language')}</Label>
            <Select
              value={appearanceConfig?.language || 'en'}
              onValueChange={(val) => appearanceMutation.mutate({ language: val as 'en' | 'es' })}
            >
              <SelectTrigger
                id="language-select"
                className="w-[200px] bg-background border-border"
              >
                <SelectValue placeholder={t('settings.general.selectLanguage')} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Window Behavior */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.general.window')}</CardTitle>
          <CardDescription>{t('settings.general.windowDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>{t('settings.general.defaultPosition')}</Label>
            <Select
              value={windowConfig.position}
              onValueChange={(v) => updateWindowConfig({ position: v as WindowConfig['position'] })}
            >
              <SelectTrigger className="w-[200px] bg-background border-border">
                <SelectValue placeholder={t('settings.general.selectPosition')} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="near-tray">{t('position.nearTray')}</SelectItem>
                <SelectItem value="top-right">{t('position.topRight')}</SelectItem>
                <SelectItem value="bottom-right">{t('position.bottomRight')}</SelectItem>
                <SelectItem value="top-left">{t('position.topLeft')}</SelectItem>
                <SelectItem value="bottom-left">{t('position.bottomLeft')}</SelectItem>
                <SelectItem value="center">{t('position.center')}</SelectItem>
                <SelectItem value="remember">{t('position.remember')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>{t('settings.general.width')}</Label>
              <span className="text-xs text-muted-foreground">{windowConfig.width}px</span>
            </div>
            <Slider
              value={[windowConfig.width]}
              min={400}
              max={1200}
              step={10}
              onValueChange={([val]) => updateWindowConfig({ width: val })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>{t('settings.general.height')}</Label>
              <span className="text-xs text-muted-foreground">{windowConfig.height}px</span>
            </div>
            <Slider
              value={[windowConfig.height]}
              min={400}
              max={900}
              step={10}
              onValueChange={([val]) => updateWindowConfig({ height: val })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>{t('settings.general.opacity')}</Label>
              <span className="text-xs text-muted-foreground">
                {Math.round(windowConfig.opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[windowConfig.opacity * 100]}
              min={50}
              max={100}
              step={1}
              onValueChange={([val]) => updateWindowConfig({ opacity: val / 100 })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Visibility Behavior */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.general.visibility')}</CardTitle>
          <CardDescription>{t('settings.general.visibilityDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="always-on-top" className="flex flex-col space-y-1">
              <span>{t('settings.general.alwaysOnTop')}</span>
              <span className="font-normal text-xs text-muted-foreground">
                {t('settings.general.alwaysOnTopDesc')}
              </span>
            </Label>
            <Switch
              id="always-on-top"
              checked={windowConfig.alwaysOnTop}
              onCheckedChange={(v) => updateWindowConfig({ alwaysOnTop: v })}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="hide-on-blur" className="flex flex-col space-y-1">
              <span>{t('settings.general.hideOnBlur')}</span>
              <span className="font-normal text-xs text-muted-foreground">
                {t('settings.general.hideOnBlurDesc')}
              </span>
            </Label>
            <Switch
              id="hide-on-blur"
              checked={windowConfig.hideOnBlur}
              onCheckedChange={(v) => updateWindowConfig({ hideOnBlur: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
