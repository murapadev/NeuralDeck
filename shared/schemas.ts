import { z } from 'zod'

// ============================================================================
// Enums/Literals
// ============================================================================

export const ThemeSchema = z.enum(['dark', 'light', 'system'])
export const LanguageSchema = z.enum(['en', 'es'])
export const FontSizeSchema = z.enum(['small', 'medium', 'large'])
export const WindowPositionSchema = z.enum([
  'near-tray',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
  'remember',
])

// ============================================================================
// Component Schemas
// ============================================================================

export const WindowConfigSchema = z.object({
  width: z.number().min(300),
  height: z.number().min(400),
  position: WindowPositionSchema,
  lastX: z.number().optional(),
  lastY: z.number().optional(),
  alwaysOnTop: z.boolean(),
  hideOnBlur: z.boolean(),
  opacity: z.number().min(0.1).max(1),
})

export const AppearanceConfigSchema = z.object({
  theme: ThemeSchema,
  language: LanguageSchema,
  showProviderNames: z.boolean(),
  fontSize: FontSizeSchema,
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/),
})

export const ProviderConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  url: z.string().url(),
  icon: z.string(),
  color: z.string(),
  enabled: z.boolean(),
  order: z.number(),
  isCustom: z.boolean().optional(),
})

export const ShortcutConfigSchema = z.object({
  toggleWindow: z.string(),
  providers: z.array(z.string()),
  reload: z.string(),
  goBack: z.string(),
  goForward: z.string(),
  openSettings: z.string(),
})

export const PrivacyConfigSchema = z.object({
  clearOnClose: z.boolean(),
  blockTrackers: z.boolean(),
  incognitoProviders: z.array(z.string()),
})

// ============================================================================
// Root Schema
// ============================================================================

export const AppConfigSchema = z.object({
  version: z.string(),
  debug: z.boolean(),
  firstRun: z.boolean(),
  lastProvider: z.string().nullable(),
  window: WindowConfigSchema,
  shortcuts: ShortcutConfigSchema,
  providers: z.array(ProviderConfigSchema),
  privacy: PrivacyConfigSchema,
  appearance: AppearanceConfigSchema,
})

// Export inferred types
export type Theme = z.infer<typeof ThemeSchema>
export type Language = z.infer<typeof LanguageSchema>
export type FontSize = z.infer<typeof FontSizeSchema>
export type WindowConfig = z.infer<typeof WindowConfigSchema>
export type AppearanceConfig = z.infer<typeof AppearanceConfigSchema>
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
export type ShortcutConfig = z.infer<typeof ShortcutConfigSchema>
export type PrivacyConfig = z.infer<typeof PrivacyConfigSchema>
export type AppConfig = z.infer<typeof AppConfigSchema>

export const NavigationStateSchema = z.object({
  canGoBack: z.boolean(),
  canGoForward: z.boolean(),
  url: z.string(),
})
export type NavigationState = z.infer<typeof NavigationStateSchema>
