import {
  Database,
  ExternalLink,
  Keyboard,
  Palette,
  Settings as SettingsIcon,
  Shield,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from '../i18n'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { trpc } from '../utils/trpc'
import { AppearanceSettings } from './settings/AppearanceSettings'
import { GeneralSettings } from './settings/GeneralSettings'
import { PrivacySettings } from './settings/PrivacySettings'
import { ProviderSettings } from './settings/ProviderSettings'
import { ShortcutsSettings } from './settings/ShortcutsSettings'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

function Settings({ isWindow = false }: { isWindow?: boolean }) {
  const { isSettingsOpen, closeSettings, settingsTab, setSettingsTab } = useAppStore()
  const openExternalMutation = trpc.openExternal.useMutation()
  const { data: appVersion } = trpc.getAppVersion.useQuery()
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState('')

  const handleClose = () => {
    if (isWindow) {
      window.close()
    } else {
      closeSettings()
    }
  }

  const handleTabChange = (value: string) => {
    setSettingsTab(value as 'general' | 'appearance' | 'shortcuts' | 'providers' | 'privacy')
  }

  // Filter logic
  const tabs = [
    { id: 'general', icon: SettingsIcon, label: t('settings.general') },
    { id: 'appearance', icon: Palette, label: t('settings.appearance') },
    { id: 'shortcuts', icon: Keyboard, label: t('settings.shortcuts') },
    { id: 'providers', icon: Database, label: t('settings.providers') },
    { id: 'privacy', icon: Shield, label: t('settings.privacy') },
  ]

  const filteredTabs = useMemo(() => {
    if (!searchQuery) return tabs
    return tabs.filter((tab) => tab.label.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery, t, tabs])

  // If not window and not open, don't render (unless animating in future)
  if (!isWindow && !isSettingsOpen) return null

  return (
    <div
      className={cn(
        'flex flex-col bg-background text-foreground overflow-hidden',
        isWindow
          ? 'h-screen w-screen'
          : 'fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 sm:p-8'
      )}
    >
      {/* Container - if overlay match window look, if window full width */}
      <div
        className={cn(
          'flex flex-col flex-1 overflow-hidden',
          !isWindow &&
            'max-w-4xl mx-auto w-full bg-card rounded-xl border border-border shadow-2xl h-full max-h-[800px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border app-drag shrink-0 bg-card/50">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">{t('sidebar.settings')}</h2>
          </div>

          {/* Search Input */}
          <div className="flex-1 max-w-[200px] mx-4 app-no-drag">
            <div className="relative">
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 bg-muted border-border text-xs focus:ring-neural-500"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground app-no-drag"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Content with Tabs */}
        <Tabs
          defaultValue={settingsTab}
          value={settingsTab}
          onValueChange={handleTabChange}
          orientation="vertical"
          className="flex-1 flex overflow-hidden"
        >
          {/* Sidebar Tabs List */}
          <div className="w-[200px] border-r border-border bg-card/30 flex flex-col shrink-0">
            <ScrollArea className="flex-1">
              <TabsList className="flex flex-col h-full w-full justify-start p-2 gap-1 bg-transparent space-y-1">
                {filteredTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="w-full justify-start gap-2 px-3 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground text-muted-foreground"
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>

            {/* Version Info Footer in Sidebar */}
            <div className="p-4 border-t border-border">
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  NeuralDeck v{appVersion ?? '...'}
                </span>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground justify-start gap-1"
                  onClick={() =>
                    openExternalMutation.mutate('https://github.com/murapadev/NeuralDeck')
                  }
                >
                  GitHub <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <ScrollArea className="flex-1 h-full">
              <div className="p-6 max-w-2xl mx-auto pb-20">
                <TabsContent
                  value="general"
                  className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-1">{t('settings.general')}</h3>
                    <p className="text-muted-foreground text-sm">
                      Configure basic application behavior.
                    </p>
                  </div>
                  <GeneralSettings />
                </TabsContent>

                <TabsContent
                  value="appearance"
                  className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-1">{t('settings.appearance')}</h3>
                    <p className="text-muted-foreground text-sm">
                      Customize how NeuralDeck looks and feels.
                    </p>
                  </div>
                  <AppearanceSettings />
                </TabsContent>

                <TabsContent
                  value="shortcuts"
                  className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-1">{t('settings.shortcuts')}</h3>
                    <p className="text-muted-foreground text-sm">
                      Manage global keyboard shortcuts.
                    </p>
                  </div>
                  <ShortcutsSettings />
                </TabsContent>

                <TabsContent
                  value="providers"
                  className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-1">{t('settings.providers')}</h3>
                    <p className="text-muted-foreground text-sm">Manage AI providers and models.</p>
                  </div>
                  <ProviderSettings />
                </TabsContent>

                <TabsContent
                  value="privacy"
                  className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-1">{t('settings.privacy')}</h3>
                    <p className="text-muted-foreground text-sm">
                      Manage privacy and data settings.
                    </p>
                  </div>
                  <PrivacySettings />
                </TabsContent>
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default Settings
