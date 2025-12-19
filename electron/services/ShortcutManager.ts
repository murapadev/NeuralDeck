/**
 * ShortcutManager - Global keyboard shortcuts registration
 */

import { globalShortcut, app } from 'electron'
import { WindowManager } from './WindowManager.js'
import { ViewManager } from './ViewManager.js'
import configManager from '../config/configManager.js'

export class ShortcutManager {
  private windowManager: WindowManager
  private viewManager: ViewManager
  private registeredShortcuts: string[] = []

  constructor(windowManager: WindowManager, viewManager: ViewManager) {
    this.windowManager = windowManager
    this.viewManager = viewManager
    this.registerAll()

    // Unregister shortcuts when app is quitting
    app.on('will-quit', () => {
      this.unregisterAll()
    })
  }

  /**
   * Register all shortcuts from config
   */
  public registerAll(): void {
    this.unregisterAll()

    const config = configManager.getAll()
    const shortcuts = config.shortcuts

    // Toggle window shortcut
    if (shortcuts.toggleWindow) {
      this.register(shortcuts.toggleWindow, () => {
        this.windowManager.toggleWindow()
      })
    }

    // Provider shortcuts (Ctrl+Shift+1, etc.)
    const enabledProviders = configManager.getEnabledProviders()
    shortcuts.providers.forEach((shortcut, index) => {
      if (shortcut && enabledProviders[index]) {
        this.register(shortcut, () => {
          this.windowManager.showWindow()
          this.viewManager.switchView(enabledProviders[index].id)
        })
      }
    })

    // Open Settings shortcut
    if (shortcuts.openSettings) {
      this.register(shortcuts.openSettings, () => {
        this.windowManager.openSettingsWindow()
      })
    }

    // Navigation shortcuts only work when window is focused
    // These are handled by the renderer process via accelerators
  }

  /**
   * Register a single shortcut
   */
  private register(accelerator: string, callback: () => void): boolean {
    try {
      const success = globalShortcut.register(accelerator, callback)
      if (success) {
        this.registeredShortcuts.push(accelerator)
      } else {
        console.warn(`ShortcutManager: Failed to register ${accelerator}`)
      }
      return success
    } catch (error) {
      console.warn(`ShortcutManager: Error registering ${accelerator}:`, error)
      return false
    }
  }

  /**
   * Unregister all shortcuts
   */
  public unregisterAll(): void {
    for (const shortcut of this.registeredShortcuts) {
      try {
        globalShortcut.unregister(shortcut)
      } catch {
        // Ignore errors during unregistration
      }
    }
    this.registeredShortcuts = []
  }

  /**
   * Re-register shortcuts after config change
   */
  public refresh(): void {
    this.registerAll()
  }
}
