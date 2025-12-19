import { useState } from 'react'
import {
    useAppearanceConfig,
    useAppStore,
    usePrivacyConfig,
    useShortcutsConfig,
    useWindowConfig
} from '../store/appStore'
import { trpc } from '../utils/trpc'
import type { AppTheme, WindowPosition } from '../types/electron'

// Iconos SVG inline para el panel de settings
const icons = {
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  general: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  appearance: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  keyboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  providers: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  privacy: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  dragHandle: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  ),
  popout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
}

type TabId = 'general' | 'appearance' | 'shortcuts' | 'providers' | 'privacy'

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
  { id: 'general', label: 'General', icon: icons.general },
  { id: 'appearance', label: 'Apariencia', icon: icons.appearance },
  { id: 'shortcuts', label: 'Atajos', icon: icons.keyboard },
  { id: 'providers', label: 'Proveedores', icon: icons.providers },
  { id: 'privacy', label: 'Privacidad', icon: icons.privacy },
]

const POSITION_OPTIONS: { value: WindowPosition; label: string }[] = [
  { value: 'near-tray', label: 'Cerca del tray' },
  { value: 'top-left', label: 'Arriba izquierda' },
  { value: 'top-right', label: 'Arriba derecha' },
  { value: 'bottom-left', label: 'Abajo izquierda' },
  { value: 'bottom-right', label: 'Abajo derecha' },
  { value: 'center', label: 'Centro' },
  { value: 'remember', label: 'Recordar posición' },
]

const THEME_OPTIONS: { value: AppTheme; label: string }[] = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
]

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Pequeño' },
  { value: 'medium', label: 'Mediano' },
  { value: 'large', label: 'Grande' },
]

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
  options: { value: T; label: string }[];
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
  const windowConfig = useWindowConfig()
  const windowMutation = trpc.updateWindow.useMutation()

  if (!windowConfig) return null

  const updateWindowConfig = (updates: any) => {
      windowMutation.mutate(updates)
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Ventana</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <Select
            label="Posición de la ventana"
            value={windowConfig.position}
            onChange={(v) => updateWindowConfig({ position: v })}
            options={POSITION_OPTIONS}
          />
          <Slider
            label="Ancho"
            value={windowConfig.width}
            onChange={(v) => updateWindowConfig({ width: v })}
            min={400}
            max={1200}
            suffix="px"
          />
          <Slider
            label="Alto"
            value={windowConfig.height}
            onChange={(v) => updateWindowConfig({ height: v })}
            min={400}
            max={900}
            suffix="px"
          />
          <Slider
            label="Opacidad"
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
  const appearanceConfig = useAppearanceConfig()
  const appearanceMutation = trpc.updateAppearance.useMutation()

  if (!appearanceConfig) return null

  const updateAppearanceConfig = (updates: any) => {
      appearanceMutation.mutate(updates)
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Tema</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <Select
            label="Tema de la aplicación"
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
            label="Tamaño de fuente"
            value={appearanceConfig.fontSize}
            onChange={(v) => updateAppearanceConfig({ fontSize: v as 'small' | 'medium' | 'large' })}
            options={FONT_SIZE_OPTIONS as { value: string; label: string }[]}
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
  const shortcutsConfig = useShortcutsConfig()
  const providers = useAppStore((s) => s.providers)
  const shortcutsMutation = trpc.updateShortcuts.useMutation()

  if (!shortcutsConfig) return null

  const updateShortcutsConfig = (updates: any) => {
      shortcutsMutation.mutate(updates)
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Atajos globales</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <ShortcutInput
            label="Mostrar/ocultar ventana"
            value={shortcutsConfig.toggleWindow}
            onChange={(v) => updateShortcutsConfig({ toggleWindow: v })}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Navegación</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <ShortcutInput
            label="Recargar página"
            value={shortcutsConfig.reload}
            onChange={(v) => updateShortcutsConfig({ reload: v })}
          />
          <ShortcutInput
            label="Ir atrás"
            value={shortcutsConfig.goBack}
            onChange={(v) => updateShortcutsConfig({ goBack: v })}
          />
          <ShortcutInput
            label="Ir adelante"
            value={shortcutsConfig.goForward}
            onChange={(v) => updateShortcutsConfig({ goForward: v })}
          />
          <ShortcutInput
            label="Abrir ajustes"
            value={shortcutsConfig.openSettings}
            onChange={(v) => updateShortcutsConfig({ openSettings: v })}
          />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Cambiar proveedor</h3>
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
            Los atajos de proveedores son fijos: Ctrl/Cmd + número
          </p>
        </div>
      </section>
    </div>
  )
}

const ProvidersTab = () => {
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
  // const detachMutation = trpc.detachView.useMutation()

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
    if (confirm('¿Eliminar este proveedor personalizado?')) {
      removeProviderMutation.mutate(id)
    }
  }

  const handleDetach = (id: string) => {
    // detachMutation.mutate(id) 
    console.log('Detach not implemented', id)
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Proveedores de IA</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neural-500 hover:bg-neural-600 text-white rounded-lg text-sm transition-colors"
          >
            {icons.plus}
            Añadir
          </button>
        </div>

        {showAddForm && (
          <div className="bg-neutral-800/50 rounded-lg p-4 mb-4 space-y-3">
            <input
              type="text"
              placeholder="ID único (ej: mistral)"
              value={newProvider.id}
              onChange={(e) => setNewProvider({ ...newProvider, id: e.target.value.toLowerCase().replace(/\s/g, '-') })}
              className="w-full bg-neutral-700 text-white rounded-lg px-3 py-2 text-sm border border-neutral-600 focus:border-neural-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Nombre (ej: Mistral AI)"
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
  const privacyConfig = usePrivacyConfig()
  const providers = useAppStore((s) => s.providers)
  
  const privacyMutation = trpc.updatePrivacy.useMutation()
  const clearDataMutation = trpc.clearAllData.useMutation()

  if (!privacyConfig) return null

  const updatePrivacyConfig = (updates: any) => {
      privacyMutation.mutate(updates)
  }

  const handleClearAllData = () => {
    if (confirm('¿Borrar todos los datos de navegación? Esto cerrará todas las sesiones.')) {
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
        <h3 className="text-lg font-semibold text-white mb-4">Datos de navegación</h3>
        <div className="space-y-1 bg-neutral-800/50 rounded-lg p-4">
          <Toggle
            label="Limpiar datos al cerrar"
            checked={privacyConfig.clearOnClose}
            onChange={(v) => updatePrivacyConfig({ clearOnClose: v })}
          />
          <Toggle
            label="Bloquear rastreadores"
            checked={privacyConfig.blockTrackers}
            onChange={(v) => updatePrivacyConfig({ blockTrackers: v })}
          />
          <div className="pt-4 border-t border-neutral-700 mt-4">
            <button
              onClick={handleClearAllData}
              className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              Borrar todos los datos ahora
            </button>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-white mb-4">Modo incógnito por proveedor</h3>
        <p className="text-sm text-neutral-400 mb-4">
          Los proveedores en modo incógnito no guardarán cookies ni datos de sesión.
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
  // const closeSettingsWindowMutation = trpc.closeSettingsWindow.useMutation()

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
