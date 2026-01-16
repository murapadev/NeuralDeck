# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-12

### Added
- **Onboarding Experience**: First-run wizard to guide new users through provider selection
- **Settings Search**: Quick search functionality in Settings UI
- **Drag-and-Drop Sidebar**: Reorder providers in the sidebar via drag-and-drop
- **View Preloading**: Top 3 providers are preloaded for instant switching
- **Memory Management**: Automatic garbage collection for unused views
- **Performance Telemetry**: Opt-in endpoint for memory/CPU monitoring
- **Code Splitting**: Vendor chunks for React, Radix UI, dnd-kit, and tRPC
- **E2E Tests**: Playwright configuration and basic app startup tests
- **Integration Tests**: tRPC router integration test suite
- **Telemetry Router**: New tRPC endpoints for performance monitoring

### Changed
- **Migrated to WebContentsView**: Replaced deprecated `BrowserView` with `WebContentsView` (Electron 35+)
- **Configuration Validation**: All config now validated with Zod schemas
- **Settings UI Overhaul**: Reorganized with tabs, search, and better categorization
- **Improved Type Safety**: Centralized types and constants in `shared/` directory
- **Enhanced Security**: Stricter CSP, input sanitization, permission handlers

### Fixed
- Hook ordering issues in Settings component
- Missing `key` props in mapped React elements
- Type errors across multiple components
- Test mocks updated for WebContentsView API

### Security
- Added Content Security Policy (CSP) meta tag
- Implemented IPC input sanitization
- Added permission request handlers for camera/microphone
- Enhanced incognito mode with session isolation

## [0.3.0] - Previous Release

Initial beta release with core functionality.
