# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeuralDeck is an Electron-based desktop app that provides a floating AI command center accessible from the system tray. It uses WebContentsView to embed AI provider websites (ChatGPT, Gemini, Claude, etc.) in isolated views, with a lightweight React sidebar for navigation and settings.

## Commands

```bash
npm run dev          # Start development mode (Vite + Electron)
npm run build        # Build for current platform
npm run build:win    # Build for Windows
npm run build:linux  # Build for Linux
npm run build:mac    # Build for macOS
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format with Prettier
npm test             # Run unit tests (Vitest)
npm run test:watch   # Watch mode for tests
npm run test:coverage # Coverage report
```

## Architecture

### Process Model

- **Main Process** (`electron/`): Manages window, tray, views, shortcuts, and system integration
- **Renderer Process** (`src/`): React UI (sidebar, settings, chat interface for Ollama)
- **Preload** (`electron/preload.ts`): Exposes safe IPC bridge via `window.electronTRPC`

### Main Process Services

The main process uses a **ServiceManager** (`electron/services/ServiceManager.ts`) that initializes core services in dependency order:

1. **WindowManager** (`electron/services/WindowManager.ts`): Creates the frameless main window, handles positioning (including tray proximity), and window events
2. **ViewManager** (`electron/services/ViewManager.ts`): Manages WebContentsView instances per AI provider. Each provider gets an isolated session (incognito mode supported). Uses `contentView.addChildView()` to embed views alongside the sidebar
3. **TrayManager** (`electron/services/TrayManager.ts`): System tray icon and context menu
4. **ShortcutManager** (`electron/services/ShortcutManager.ts`): Global keyboard shortcuts (show/hide, provider switching)
5. **IpcManager** (`electron/services/IpcManager.ts`): Legacy IPC handlers for window controls (back/forward/reload)
6. **AutoUpdateManager** (`electron/services/AutoUpdateManager.ts`): electron-updater integration

### IPC Communication

tRPC is the primary IPC mechanism. The main process creates a tRPC router in `electron/router/index.ts` that merges:
- `settingsRouter`: App configuration (providers, appearance, privacy, shortcuts)
- `windowRouter`: Window controls (show/hide/minimize)
- `viewsRouter`: View management (switch provider, navigation state)
- `providersRouter`: Provider queries
- `telemetryRouter`: Memory/performance stats

The renderer connects via a custom IPC link in `src/utils/electronLink.ts` that sends tRPC operations through `window.electronTRPC` (injected by preload).

### Configuration

Config is persisted via `electron-store` and managed by `electron/config/configManager.ts`. Uses Zod schema validation with migration support. The `DEFAULT_CONFIG` and `DEFAULT_PROVIDERS` constants are in `shared/types.ts`.

### Renderer State

- **Zustand store** (`src/store/appStore.ts`): Global state (currentProvider, config, theme)
- **React Query**: Only for initial config fetch on mount; IPC listeners handle live updates
- **tRPC** (`src/utils/trpc.ts`): Client configured with `ipcLink()` to communicate with main process

### View Management

`ViewManager.switchView()` is the key method:
1. Removes previous `WebContentsView` from `contentView`
2. Adds new view for the selected provider
3. Sets view bounds to account for sidebar width
4. Sends `VIEW_CHANGED` and `NAVIGATION_STATE_CHANGED` events to renderer

Ollama is special-cased: it doesn't use WebContentsView because it's a local API, so the renderer shows a native React chat interface instead.

## Key Patterns

- **Service singleton pattern**: `serviceManager` is the global container; individual services are accessed via `serviceManager.windowManager`, etc.
- **Lazy initialization**: Background services (auto-update checks, view preloading, GC) start 2 seconds after app ready
- **Incognito isolation**: Providers in `privacy.incognitoProviders` get temp partitions that are cleared on view destruction
- **Memory management**: `ViewManager.enforceMemoryLimit()` destroys views beyond the limit (default 5), preferring disabled providers

## File Locations

| Purpose | Path |
|---------|------|
| Main entry | `electron/main.ts` |
| tRPC routers | `electron/router/*.ts` |
| React App root | `src/App.tsx` |
| State store | `src/store/appStore.ts` |
| Config schema | `shared/schemas.ts` |
| UI components | `src/components/` |
| Settings pages | `src/components/settings/` |
| i18n | `src/i18n/`, `electron/i18n/` |
