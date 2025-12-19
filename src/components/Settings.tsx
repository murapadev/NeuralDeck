import { useState } from 'react'
import { useTranslation } from '../i18n'
import type { WindowConfig, AppearanceConfig, ShortcutConfig, PrivacyConfig } from '../../electron/config/types'
import {
    useAppearanceConfig,
    useAppStore,
    usePrivacyConfig,
    useShortcutsConfig,
    useWindowConfig
} from '../store/appStore'
import { trpc } from '../utils/trpc'
import { UIIcons } from './icons'

const icons = UIIcons

// Componentes de UI reutilizables
const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center justify-between py-2 cursor-pointer group">
    <span className="text-neutral-200 group-hover:text-white transition-colors">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-neural-500' : 'bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  </label>
)

const Select = <T extends string>({ 
  value, 
  onChange, 
  options, 
  label 
}: { 
  value: T; 
  onChange: (v: T) => void; 
  options: readonly { value: T; label: string }[];
  label: string;
}) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-neutral-200">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-neutral-700 text-white rounded-lg px-3 py-1.5 text-sm border border-neutral-600 focus:border-neural-500 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
)

const Slider = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  suffix = '',
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  label: string
  suffix?: string
}) => (
  <div className="py-2">
    <div className="flex items-center justify-between mb-2">
      <span className="text-neutral-200">{label}</span>
      <span className="text-sm text-neural-400">{value}{suffix}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neural-500"
    />
  </div>
)

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
    <div className="flex items-center justify-between py-2">
      <span className="text-neutral-200">{label}</span>
      <button
        onClick={() => setRecording(true)}
        onKeyDown={recording ? handleKeyDown : undefined}
        onBlur={() => { setRecording(false); setKeys([]) }}
        className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
          recording
            ? 'bg-neural-500/20 border-2 border-neural-500 text-neural-400'
            : 'bg-neutral-700 border border-neutral-600 text-white hover:border-neutral-500'
        }`}
      >
        {recording ? (keys.length > 0 ? keys.join('+') + '+...' : 'Presiona teclas...') : value}
      </button>
    </div>
  )
}

// Paneles de contenido
const GeneralTab = () => {
  const { t } = useTranslation()
  const windowConfig = useWindowConfig()
  const windowMutation = trpc.updateWindow.useMutation()
  
  // Also need language config here, technically it's in appearance config but UI is here
  const { config } = useAppStore()
  const appearanceConfig = config?.appearance || { language: 'en' }
  const appearanceMutation = trpc.updateAppearance.useMutation()

  const POSITION_OPTIONS = [
    { value: 'near-tray', label: t('position.nearTray') },
    { value: 'top-right', label: t('position.topRight') },
    { value: 'bottom-right', label: t('position.bottomRight') },
    { value: 'top-left', label: t('position.topLeft') },
    { value: 'bottom-left', label: t('position.bottomLeft') },
    { value: 'center', label: t('position.center') },
    { value: 'remember', label: t('position.remember') },
  ] as const

  if (!windowConfig) return null

  const updateWindowConfig = (updates: Partial<WindowConfig>) => {
      windowMutation.mutate(updates)
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings.general.window')}</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
            
            {/* Language Selector */}
            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-200">{t('settings.general.language')}</span>
              <select
                value={appearanceConfig?.language || 'en'}
                onChange={(e) => {
                  const lang = e.target.value as 'en' | 'es'
                  appearanceMutation.mutate({ language: lang })
                }}
                className="bg-neutral-700 text-white rounded-lg px-3 py-1.5 text-sm border border-neutral-600 focus:border-neural-500 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>

          <Select
            label={t('settings.general.position')}
            value={windowConfig.position}
            onChange={(v) => updateWindowConfig({ position: v })}
            options={POSITION_OPTIONS}
          />
          <Slider
            label="Width"
            value={windowConfig.width}
            onChange={(v) => updateWindowConfig({ width: v })}
            min={400}
            max={1200}
            suffix="px"
          />
          <Slider
            label="Height"
            value={windowConfig.height}
            onChange={(v) => updateWindowConfig({ height: v })}
            min={400}
            max={900}
            suffix="px"
          />
          <Slider
            label="Opacity"
            value={Math.round(windowConfig.opacity * 100)}
            onChange={(v) => updateWindowConfig({ opacity: v / 100 })}
            min={50}
            max={100}
            suffix="%"
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Comportamiento</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <Toggle
            label="Siempre visible"
            checked={windowConfig.alwaysOnTop}
            onChange={(v) => updateWindowConfig({ alwaysOnTop: v })}
          />
          <Toggle
            label="Ocultar al perder foco"
            checked={windowConfig.hideOnBlur}
            onChange={(v) => updateWindowConfig({ hideOnBlur: v })}
          />
        </div>
      </section>
    </div>
  )
}

const AppearanceTab = () => {
  const { t } = useTranslation()
  const appearanceConfig = useAppearanceConfig()
  const appearanceMutation = trpc.updateAppearance.useMutation()

  const THEME_OPTIONS = [
    { value: 'dark', label: t('settings.appearance.dark') },
    { value: 'light', label: t('settings.appearance.light') },
    { value: 'system', label: t('settings.appearance.system') },
  ] as const

  const FONT_SIZE_OPTIONS = [
    { value: 'small', label: t('settings.appearance.small') },
    { value: 'medium', label: t('settings.appearance.medium') },
    { value: 'large', label: t('settings.appearance.large') },
  ] as const

  if (!appearanceConfig) return null

  const updateAppearanceConfig = (updates: Partial<AppearanceConfig>) => {
      appearanceMutation.mutate(updates)
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings.appearance.theme')}</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <Select
            label="Application theme"
            value={appearanceConfig.theme}
            onChange={(v) => updateAppearanceConfig({ theme: v })}
            options={THEME_OPTIONS}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Barra lateral</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <Toggle
            label="Mostrar nombres de proveedores"
            checked={appearanceConfig.showProviderNames}
            onChange={(v) => updateAppearanceConfig({ showProviderNames: v })}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Texto</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <Select
            label="Font size"
            value={appearanceConfig.fontSize}
            onChange={(v) => updateAppearanceConfig({ fontSize: v as 'small' | 'medium' | 'large' })}
            options={FONT_SIZE_OPTIONS}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Color de acento</h3>
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <div className="flex gap-3">
            {['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#22c55e', '#14b8a6', '#3b82f6'].map(
              (color) => (
                <button
                  key={color}
                  onClick={() => updateAppearanceConfig({ accentColor: color })}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                    appearanceConfig.accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              )
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

const ShortcutsTab = () => {
  const { t } = useTranslation()
  const shortcutsConfig = useShortcutsConfig()
  const providers = useAppStore((s) => s.providers)
  const shortcutsMutation = trpc.updateShortcuts.useMutation()

  if (!shortcutsConfig) return null

  const updateShortcutsConfig = (updates: Partial<ShortcutConfig>) => {
      shortcutsMutation.mutate(updates)
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings.shortcuts.toggleWindow')}</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <ShortcutInput
            label="Mostrar/ocultar ventana"
            value={shortcutsConfig.toggleWindow}
            onChange={(v) => updateShortcutsConfig({ toggleWindow: v })}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Navigation</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <ShortcutInput
            label="Reload page"
            value={shortcutsConfig.reload}
            onChange={(v) => updateShortcutsConfig({ reload: v })}
          />
          <ShortcutInput
            label="Go back"
            value={shortcutsConfig.goBack}
            onChange={(v) => updateShortcutsConfig({ goBack: v })}
          />
          <ShortcutInput
            label="Go forward"
            value={shortcutsConfig.goForward}
            onChange={(v) => updateShortcutsConfig({ goForward: v })}
          />
          <ShortcutInput
            label="Open settings"
            value={shortcutsConfig.openSettings}
            onChange={(v) => updateShortcutsConfig({ openSettings: v })}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Switch provider</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          {providers.slice(0, 5).map((provider, index) => (
            <div key={provider.id} className="flex items-center justify-between py-2">

              <span className="text-neutral-200">{provider.name}</span>
              <span className="px-3 py-1.5 bg-neutral-700 rounded-lg text-sm font-mono text-white">
                {shortcutsConfig.providers[index] || `CommandOrControl+${index + 1}`}
              </span>
            </div>
          ))}
          <p className="text-xs text-neutral-400 mt-2">
            Provider shortcuts are fixed: Ctrl/Cmd + number
          </p>
        </div>
      </section>
    </div>
  )
}

const ProvidersTab = () => {
  const { t } = useTranslation()
  const config = useAppStore((s) => s.config)
  const allProviders = config?.providers || []
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProvider, setNewProvider] = useState({
    id: '',
    name: '',
    url: '',
    color: '#6366f1',
  })
  
  const updateProviderMutation = trpc.updateProvider.useMutation()
  const addProviderMutation = trpc.addCustomProvider.useMutation()
  const removeProviderMutation = trpc.removeCustomProvider.useMutation()

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
        isCustom: true
      })
      setNewProvider({ id: '', name: '', url: '', color: '#6366f1' })
      setShowAddForm(false)
    }
  }

  const handleRemoveProvider = (id: string) => {
    if (confirm('Remove this custom provider?')) {
      removeProviderMutation.mutate(id)
    }
  }

  const handleDetach = (id: string) => {
    detachMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{t('settings.providers')}</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neural-500 hover:bg-neural-600 text-white rounded-lg text-sm transition-colors"
          >
            {icons.plus}
            Add
          </button>
        </div>

        {showAddForm && (
          <div className="bg-neutral-800/50 rounded-lg p-4 mb-4 space-y-3">
            <input
              type="text"
              placeholder="Unique ID (e.g., mistral)"
              value={newProvider.id}
              onChange={(e) => setNewProvider({ ...newProvider, id: e.target.value.toLowerCase().replace(/\s/g, '-') })}
              className="w-full bg-neutral-700 text-white rounded-lg px-3 py-2 text-sm border border-neutral-600 focus:border-neural-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Name (e.g., Mistral AI)"
              value={newProvider.name}
              onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
              className="w-full bg-neutral-700 text-white rounded-lg px-3 py-2 text-sm border border-neutral-600 focus:border-neural-500 focus:outline-none"
            />
            <input
              type="url"
              placeholder="URL (ej: https://chat.mistral.ai)"
              value={newProvider.url}
              onChange={(e) => setNewProvider({ ...newProvider, url: e.target.value })}
              className="w-full bg-neutral-700 text-white rounded-lg px-3 py-2 text-sm border border-neutral-600 focus:border-neural-500 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">Color:</span>
              <input
                type="color"
                value={newProvider.color}
                onChange={(e) => setNewProvider({ ...newProvider, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddProvider}
                className="flex-1 py-2 bg-neural-500 hover:bg-neural-600 text-white rounded-lg text-sm transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {allProviders.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center gap-3 bg-neutral-800/50 rounded-lg p-3 group"
            >
              <div className="text-neutral-500 cursor-grab hover:text-neutral-300">
                {icons.dragHandle}
              </div>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: provider.color }}
              >
                {provider.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{provider.name}</div>
                <div className="text-xs text-neutral-400 truncate">{provider.url}</div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDetach(provider.id)}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                  title="Abrir en ventana separada"
                >
                  {icons.popout}
                </button>
                {provider.isCustom && (
                  <button
                    onClick={() => handleRemoveProvider(provider.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors"
                    title="Eliminar"
                  >
                    {icons.trash}
                  </button>
                )}
              </div>
              <Toggle
                label=""
                checked={provider.enabled}
                onChange={(v) => handleToggleProvider(provider.id, v)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

const PrivacyTab = () => {
  const { t } = useTranslation()
  const privacyConfig = usePrivacyConfig()
  const providers = useAppStore((s) => s.providers)
  
  const privacyMutation = trpc.updatePrivacy.useMutation()
  const clearDataMutation = trpc.clearAllData.useMutation()

  if (!privacyConfig) return null

  const updatePrivacyConfig = (updates: Partial<PrivacyConfig>) => {
      privacyMutation.mutate(updates)
  }

  const handleClearAllData = () => {
    if (confirm('Clear all browsing data? This will close all sessions.')) {
      clearDataMutation.mutate()
    }
  }

  const toggleIncognitoProvider = (id: string) => {
    const current = privacyConfig.incognitoProviders
    const updated = current.includes(id)
      ? current.filter((p) => p !== id)
      : [...current, id]
    updatePrivacyConfig({ incognitoProviders: updated })
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">{t('settings.privacy')}</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <Toggle
            label={t('settings.privacy.clearOnClose')}
            checked={privacyConfig.clearOnClose}
            onChange={(v) => updatePrivacyConfig({ clearOnClose: v })}
          />
          <Toggle
            label={t('settings.privacy.blockTrackers')}
            checked={privacyConfig.blockTrackers}
            onChange={(v) => updatePrivacyConfig({ blockTrackers: v })}
          />
          <div className="pt-4 border-t border-neutral-700 mt-4">
            <button
              onClick={handleClearAllData}
              className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              {t('settings.privacy.clearAllData')}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Incognito mode per provider</h3>
        <p className="text-sm text-neutral-400 mb-4">
          Providers in incognito mode will not save cookies or session data.
        </p>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          {providers.map((provider) => (
            <Toggle
              key={provider.id}
              label={provider.name}
              checked={privacyConfig.incognitoProviders.includes(provider.id)}
              onChange={() => toggleIncognitoProvider(provider.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

// Componente principal
function Settings({ isWindow = false }: { isWindow?: boolean }) {
  const { isSettingsOpen, closeSettings, settingsTab, setSettingsTab } = useAppStore()
  const openExternalMutation = trpc.openExternal.useMutation()
  const { t } = useTranslation()

  const TABS = [
    { id: 'general', label: t('settings.general'), icon: UIIcons.settings },
    { id: 'appearance', label: t('settings.appearance'), icon: UIIcons.appearance },
    { id: 'shortcuts', label: t('settings.shortcuts'), icon: UIIcons.keyboard },
    { id: 'providers', label: t('settings.providers'), icon: UIIcons.providers },
    { id: 'privacy', label: t('settings.privacy'), icon: UIIcons.privacy },
  ] as const

  // Si no es ventana y no está abierto, no renderizar
  if (!isWindow && !isSettingsOpen) return null

  const handleClose = () => {
    if (isWindow) {
      // closeSettingsWindowMutation.mutate()
      window.close() // Fallback normal electron window close
    } else {
      closeSettings()
    }
  }

  const renderTabContent = () => {
    switch (settingsTab) {
      case 'general':
        return <GeneralTab />
      case 'appearance':
        return <AppearanceTab />
      case 'shortcuts':
        return <ShortcutsTab />
      case 'providers':
        return <ProvidersTab />
      case 'privacy':
        return <PrivacyTab />
      default:
        return null
    }
  }

  // Si es ventana, renderizar como ventana completa
  if (isWindow) {
    return (
      <div className="h-screen w-screen bg-neutral-900 flex flex-col overflow-hidden">
        {/* Header draggable */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 app-drag">
          <h2 className="text-xl font-semibold text-white">Ajustes</h2>
          <div className="flex items-center gap-2 app-no-drag">
            <button
              onClick={handleClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {icons.close}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tabs sidebar */}
          <div className="w-48 bg-neutral-850 border-r border-neutral-800 p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  settingsTab === tab.id
                    ? 'bg-neural-500/20 text-neural-400'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-500">NeuralDeck v1.0.0</span>
          <button
            onClick={() => openExternalMutation.mutate('https://github.com/murapadev/neuraldeck')}
            className="text-xs text-neural-400 hover:text-neural-300 transition-colors"
          >
            Ver en GitHub
          </button>
        </div>
      </div>
    )
  }

  // Modo overlay (por si se usa en el futuro)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h2 className="text-xl font-semibold text-white">Ajustes</h2>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {icons.close}
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tabs sidebar */}
          <div className="w-48 bg-neutral-850 border-r border-neutral-800 p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  settingsTab === tab.id
                    ? 'bg-neural-500/20 text-neural-400'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-500">NeuralDeck v1.0.0</span>
          <button
            onClick={() => openExternalMutation.mutate('https://github.com/murapadev/neuraldeck')}
            className="text-xs text-neural-400 hover:text-neural-300 transition-colors"
          >
            Ver en GitHub
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
