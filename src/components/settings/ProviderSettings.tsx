import { ExternalLink, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { COLORS } from '../../../shared/types'
import { useTranslation } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { trpc } from '../../utils/trpc'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

export const ProviderSettings = () => {
  const { t } = useTranslation()
  const config = useAppStore((s) => s.config)
  const setConfig = useAppStore((s) => s.setConfig)
  const allProviders = config?.providers || []
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newProvider, setNewProvider] = useState<{
    id: string
    name: string
    url: string
    color: string
  }>({
    id: '',
    name: '',
    url: '',
    color: COLORS.DEFAULT_ACCENT,
  })

  const updateProviderMutation = trpc.updateProvider.useMutation({
    onSuccess: (data) => setConfig(data),
  })
  const addProviderMutation = trpc.addCustomProvider.useMutation({
    onSuccess: (data) => setConfig(data),
  })
  const removeProviderMutation = trpc.removeCustomProvider.useMutation({
    onSuccess: (data) => setConfig(data),
  })
  const detachMutation = trpc.detachView.useMutation()

  const handleToggleProvider = (id: string, enabled: boolean) => {
    updateProviderMutation.mutate({ id, data: { enabled } })
  }

  const handleAddProvider = () => {
    if (newProvider.id && newProvider.name && newProvider.url) {
      addProviderMutation.mutate({
        id: newProvider.id,
        name: newProvider.name,
        url: newProvider.url,
        icon: 'custom',
        color: newProvider.color,
        enabled: true,
        isCustom: true,
      })
      setNewProvider({ id: '', name: '', url: '', color: COLORS.DEFAULT_ACCENT })
      setIsAddDialogOpen(false)
    }
  }

  const handleRemoveProvider = (id: string) => {
    removeProviderMutation.mutate(id)
  }

  const handleDetach = (id: string) => {
    detachMutation.mutate(id)
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg">{t('settings.providers')}</CardTitle>
            <CardDescription>{t('settings.providers.manage')}</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                {t('settings.providers.addProvider')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle>{t('settings.providers.addCustomTitle')}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t('settings.providers.addCustomDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="id">{t('settings.providers.id')}</Label>
                  <Input
                    id="id"
                    placeholder="e.g., mistral"
                    value={newProvider.id}
                    onChange={(e) =>
                      setNewProvider({
                        ...newProvider,
                        id: e.target.value.toLowerCase().replace(/\s/g, '-'),
                      })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('settings.providers.name')}</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Mistral AI"
                    value={newProvider.name}
                    onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="url">{t('settings.providers.url')}</Label>
                  <Input
                    id="url"
                    placeholder="https://chat.mistral.ai"
                    value={newProvider.url}
                    onChange={(e) => setNewProvider({ ...newProvider, url: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">{t('settings.providers.color')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={newProvider.color}
                      onChange={(e) => setNewProvider({ ...newProvider, color: e.target.value })}
                      className="w-12 h-10 p-1 bg-background border-border cursor-pointer"
                    />
                    <Input
                      value={newProvider.color}
                      onChange={(e) => setNewProvider({ ...newProvider, color: e.target.value })}
                      className="flex-1 bg-background border-border font-mono"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="border-border hover:bg-muted"
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleAddProvider} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {t('settings.providers.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {allProviders.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center gap-4 p-3 bg-background/50 border border-border rounded-xl group hover:border-border transition-colors"
              >
                <GripVertical className="text-muted-foreground/50 cursor-grab hover:text-muted-foreground" />

                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-foreground text-sm font-bold shadow-lg"
                  style={{ backgroundColor: provider.color }}
                >
                  {provider.name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{provider.name}</div>
                  <div className="text-xs text-muted-foreground truncate font-mono">
                    {provider.url}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDetach(provider.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title={t('settings.providers.openInWindow')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>

                  {provider.isCustom && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          title={t('settings.providers.remove')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('settings.providers.removeTitle')}</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            {t('settings.providers.removeConfirm', { name: provider.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border hover:bg-muted">
                            {t('common.cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveProvider(provider.id)}
                            className="bg-red-600 hover:bg-red-500"
                          >
                            {t('settings.providers.remove')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                <Switch
                  checked={provider.enabled}
                  onCheckedChange={(v) => handleToggleProvider(provider.id, v)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
