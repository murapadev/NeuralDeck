/**
 * Electron Services Barrel Export
 * Centralized exports for all service managers
 */

export { WindowManager } from './WindowManager.js'
export { ViewManager } from './ViewManager.js'
export { TrayManager } from './TrayManager.js'
export { ShortcutManager } from './ShortcutManager.js'
export { IpcManager, IPC_CHANNELS } from './IpcManager.js'
export { ErrorService, errorService, ERROR_CODES } from './ErrorService.js'
export { ServiceManager, serviceManager } from './ServiceManager.js'
