# Auditoría técnica — NeuralDeck

**Fecha:** 2026-05-31
**Commit auditado:** `a5d5d88c` (rama `main`, último commit 2026-04-27, ~5 semanas)
**Versión declarada:** 0.7.0
**Stack real:** .NET 10 + Avalonia UI 11.2 + CommunityToolkit.Mvvm + SharpHook
**Auditor:** Claude (Opus 4.8)

**Metodología:** `dotnet build -c Release` (0 warn / 0 err), `dotnet test` (18/18), y revisión
estática (grep/lectura) de cada hallazgo. Todas las afirmaciones de este documento se verificaron
contra el código en `a5d5d88c`: `_configLock` (1 sola aparición → sin uso), 3 × `async void`,
`Process.Start(UseShellExecute=true)` sin validar esquema, `BlockTrackers` sin aplicarse al WebView,
records de `ConfigRecords.cs` y `NavigationState` sin referencias, `dependabot.yml` apuntando a `npm`,
y skew Avalonia core 11.2.1 vs WebView 11.4.0.

---

## 1. Resumen ejecutivo

NeuralDeck es un *AI command center* de escritorio que vive en la bandeja del sistema:
embebe las webs de proveedores de IA (ChatGPT, Gemini, Claude, DeepSeek, Perplexity…) en
un WebView nativo y ofrece un cliente de chat nativo para Ollama local. El proyecto **fue
portado de Electron/React/TypeScript a .NET 10/Avalonia/C#** en abril de 2026.

**Estado de salud: BUENO.** El código compila limpio (0 warnings, 0 errores), los 18 tests
pasan, la arquitectura MVVM es coherente y el manejo de errores/async es sólido. No hay
secretos hardcodeados ni vulnerabilidades graves.

Los problemas son de **higiene y honestidad del proyecto**, no de funcionamiento:

| Área | Estado | Severidad máxima |
|------|--------|------------------|
| Compilación / tests | ✅ Limpio (18/18) | — |
| Seguridad | 🟢 Sin secretos; gaps menores | Media |
| Documentación | 🔴 `CLAUDE.md` y `SPEC.md` describen el stack viejo (Electron) | **Alta** |
| Cobertura de tests | 🟡 Solo el parser markdown (1 archivo) | Media |
| Deuda técnica | 🟡 Código muerto + features fantasma en UI | Media |
| Higiene del repo | 🟡 ~70 ramas stale, Dependabot npm obsoleto | Media |

**Top 3 acciones recomendadas:**
1. Reescribir `CLAUDE.md` (describe Electron — induce a error a humanos y a la IA). **Alta.**
2. Eliminar/implementar las features fantasma de privacidad ("Block trackers", incógnito). **Media.**
3. Limpiar las ~49 ramas Dependabot npm + Dependabot.yml obsoleto, y las ~23 ramas `copilot/*`. **Media.**

---

## 2. Estructura del proyecto

```
NeuralDeck/                  (66 archivos en git, ~4.082 LOC C#)
├── Program.cs               entrypoint Avalonia
├── App.axaml(.cs)           init de servicios (sin DI, singletons)
├── Models/      (5)         AppConfig, ProviderConfig, ChatMessage, Constants, records
├── Services/    (7)         Config, Ollama, ConversationStore, Window, Shortcut, Theme, Tray
├── ViewModels/  (6)         MainWindow, Chat, Settings, Onboarding, WebBrowser, Base
├── Views/       (12)        AXAML + code-behind
├── Controls/    (2)         MarkdownParser (puro) + MarkdownTextBlock (render)
├── Converters/  (1)
├── NeuralDeck.Tests/        xUnit — 18 tests (solo MarkdownParser)
└── .github/workflows/       ci.yml + release.yml (.NET 10, multiplataforma)
```

**Valoración:** estructura limpia y convencional para Avalonia. Separación correcta
Model/View/ViewModel/Service. El `MarkdownParser` aislado de Avalonia (lógica pura,
testeable) es un buen patrón.

**Artefactos residuales en disco** (gitignored, *no* trackeados — solo clutter local):
`dist-electron/`, `coverage/`, `tests/components/`, `.husky/`, `.codex` (vacío),
`bin/Debug/net8.0` (target obsoleto; el csproj ya solo apunta a net10.0).
No afectan al build pero conviene borrarlos del working tree.

---

## 3. Calidad de código

### Puntos fuertes
- **`<Nullable>enable</Nullable>`** y compiled bindings activados; **0 warnings** en Release.
- **MVVM con source generators** (`[ObservableProperty]`, `[RelayCommand]`) — idiomático.
- **Async/streaming bien hecho:** `ChatAsync` usa `HttpCompletionOption.ResponseHeadersRead`
  + lectura línea a línea con `CancellationToken`; el polling de conexión y el stream son
  cancelables y se liberan en `Dispose()`.
- **Manejo de errores defensivo** con logging consistente (`Console.WriteLine("[Servicio] …")`).
- **Patrones de UI cuidados:** guardado de tamaño de ventana con *debounce* (350 ms),
  inyección de CSS idempotente (chequea `__nd_s`), skip de `Rebuild()` del markdown mientras
  está oculto durante el streaming.
- **Comentarios explican el *porqué***, no lo obvio (alineado con tus convenciones).

### Problemas

| # | Severidad | Hallazgo |
|---|-----------|----------|
| C1 | 🟠 Media | **`ConfigService._configLock` declarado pero NUNCA usado** (`ConfigService.cs:27`). Da falsa sensación de thread-safety: `LoadConfig`/`SaveConfig`/`Update*` no están sincronizados y `File.WriteAllText` puede solaparse con lecturas. O se usa el lock, o se elimina. |
| C2 | 🟡 Baja | **3 × `async void`** (`WebBrowserView.axaml.cs:128`, `ChatView.axaml.cs:152,190`). En handlers de UI es aceptable, pero una excepción no capturada en `OnNavigationCompleted` (que llama a `InjectStylesAsync`/`FetchPageTitleAsync`) escaparía como unhandled. Ambos métodos internos tragan sus excepciones, así que el riesgo real es bajo — pero conviene `try/catch` de cierre en el `async void`. |
| C3 | 🟡 Baja | **0 usos de `ConfigureAwait(false)`** en servicios. En una app de escritorio Avalonia mayormente correcto (se quiere volver al hilo de UI), pero en `OllamaService`/`ConfigService` (lógica no-UI) ayudaría. Menor. |
| C4 | 🟡 Baja | **`OllamaService._baseUrl`** se lee/escribe desde el callback `ConfigChanged` y desde llamadas HTTP sin sincronización. Carrera benigna (string ref), pero no es estrictamente thread-safe. |
| C5 | 🟡 Baja | **Patrón singleton omnipresente** (`Instance` en Config, Ollama, Window, Shortcut, Theme, Tray). Funciona, pero impide inyección/mocking → los ViewModels no se pueden testear sin tocar los singletons reales (ver §6). El propio `SPEC.md` planeaba DI con `Microsoft.Extensions.DependencyInjection`, que nunca se adoptó. |

---

## 4. Seguridad

**Sin hallazgos críticos. No hay secretos, tokens ni API keys hardcodeados** (verificado;
solo URLs públicas de proveedores y `http://localhost:11434`).

| # | Severidad | Hallazgo | Detalle / Recomendación |
|---|-----------|----------|--------------------------|
| S1 | 🟠 Media | **`Process.Start(UseShellExecute=true)` sin allowlist de esquema** (`WebBrowserView.axaml.cs:OpenExternalBrowser`). Se invoca con la URI que pide la página vía `NewWindowRequested`. Una página de proveedor comprometida podría disparar `window.open` hacia un esquema arbitrario (`file://`, protocolos custom registrados en el SO). Riesgo bajo (sitios confiables) pero **debería validarse que el esquema sea `http`/`https` antes de `Process.Start`**. |
| S2 | 🟠 Media | **Sesiones de WebView NO aisladas entre proveedores.** El port reutiliza un único control `Browser` y solo hace `Navigate()`; cookies/sesión se comparten entre ChatGPT, Claude, etc. El modelo de Electron tenía particiones incógnito por proveedor; en Avalonia no se reimplementó. Implica que iniciar sesión en un proveedor deja cookies visibles para los demás dominios cargados en el mismo WebView. |
| S3 | 🟡 Baja | **Historial de Ollama en claro** en `~/.config/NeuralDeck/ollama-history.json` (sin cifrar). Aceptable para app local, pero documentarlo. `ClearOnClose` SÍ está implementado (`App.axaml.cs:69`) y borra ese historial al salir — correcto. |
| S4 | 🟢 Info | **Inyección JS** (`InvokeScript`) solo añade CSS de scrollbar, idempotente. Sin riesgo. |
| S5 | 🟢 Info | **Links markdown no son clickables** — se renderizan como texto coloreado/subrayado sin navegación. Sin superficie XSS. (Es además una limitación UX: el CHANGELOG dice "links rendered" pero no son interactivos.) |
| S6 | 🟢 Info | **CVE mitigado:** `Tmds.DBus.Protocol` pineado a 0.21.3 en el csproj para evitar GHSA-xrw6-gwf8-vvr9 (la 0.20.0 transitiva vía Avalonia.X11 es vulnerable). Buena práctica ya aplicada. |

---

## 5. Dependencias

| Paquete | Versión | Nota |
|---------|---------|------|
| Avalonia (+ Desktop, Themes.Fluent, Fonts.Inter) | 11.2.1 | OK |
| **Avalonia.Controls.WebView** | **11.4.0** | ⚠️ **Skew de versión** respecto al core 11.2.1. Funciona, pero mezclar minor de Avalonia puede dar incompatibilidades sutiles. Alinear ambos a 11.2.x o subir todo a 11.4.x. |
| CommunityToolkit.Mvvm | 8.2.2 | Algo atrasado (existe 8.4.x). Menor. |
| SharpHook | 5.3.7 | Hook global de teclado. OK. |
| Tmds.DBus.Protocol | 0.21.3 | Pin de seguridad (ver S6). |
| xUnit / Microsoft.NET.Test.Sdk / coverlet | 2.9.3 / 17.12 / 6.0.4 | OK |

**Dependabot mal configurado:** `.github/dependabot.yml` sigue apuntando al ecosistema
**`npm`** (el proyecto ya no usa npm). Esto genera las ~49 ramas `dependabot/npm_and_yarn/*`
stale en el remoto (zustand, trpc, eslint, electron-builder, react-markdown…), todas
irrelevantes. La sección `github-actions` sí es útil. **Acción:** sustituir el bloque npm
por `nuget`.

---

## 6. Cobertura de tests

- **18 tests, todos passing**, todos sobre `MarkdownParser` (lógica pura de parsing).
- **0 tests** para: servicios (Config con su migración/normalización, Ollama, ConversationStore),
  ViewModels, parsing de aceleradores (`ShortcutService.MatchesAccelerator` — lógica no trivial
  con modificadores), o cálculo de posición de ventana.

**Causa raíz:** el patrón singleton (C5) hace que los ViewModels/servicios no sean testeables
sin DI. El `MarkdownParser` se testea precisamente porque es la única clase estática pura.

**Recomendación:** la lógica de mayor riesgo y más testeable sin refactor es:
- `ConfigService.NormalizeConfig` / migraciones (lógica pura sobre un `AppConfig` de entrada).
- `ShortcutService.MapToKeyCode` / `ParseAvaloniaModifiers` (estáticas puras).
- `WindowService.CalculateWindowPosition` (extraer el cálculo a función pura).
- `OllamaService.FormatModelSize` / `GetModelDisplayName` (ya estáticas).

Extraer estas a funciones puras y testearlas subiría la cobertura significativa con poco coste.

---

## 7. Deuda técnica

### 7.1 Documentación desincronizada (🔴 Alta — el problema #1 del repo)

- **`CLAUDE.md` describe ÍNTEGRAMENTE el stack Electron** (Main/Renderer process, tRPC,
  Zustand, `electron/services/ServiceManager.ts`, preload, WebContentsView…). **Nada de eso
  existe ya.** Cualquier asistente IA (o humano nuevo) trabajará con un mapa mental
  completamente equivocado. **Reescribir desde cero** describiendo el stack Avalonia/.NET.
- **`SPEC.md`** es un documento de planificación del port y quedó stale: dice **.NET 8**
  (es 10), DI con `Microsoft.Extensions.DependencyInjection` (no se usa), `Avalonia.SystemTray`
  (se usa el `TrayIcon` integrado), paquete `System.Text.Json` explícito (viene en el runtime),
  y **Markdig** para markdown (se hizo un parser propio). Marcar como histórico o actualizar.
- ✅ **`README.md` SÍ está actualizado y correcto** (.NET 10/Avalonia, badges, atajos, build).
- ✅ **`CHANGELOG.md`** bien mantenido y honesto (incluso documenta que el setting de idioma
  "nunca aplicó traducción" y lo deshabilitó — buena práctica de honestidad).

### 7.2 Código muerto

| Elemento | Ubicación | Estado |
|----------|-----------|--------|
| `Theme`, `WindowPosition`, `FontSize`, `Language` (records) | `Models/ConfigRecords.cs` | **Muerto** — en todo el código se usan strings ("dark", "near-tray"), nunca estos records. |
| `NavigationState` | `Models/ChatModels.cs` | **Muerto** — sin referencias fuera de su definición. |

### 7.3 Features fantasma en la UI (🟠 Media — afecta confianza del usuario)

Settings expone controles para features que **no están implementadas** en el port a Avalonia:

| Feature | UI | Backend |
|---------|-----|---------|
| **"Block trackers (web providers)"** | ✅ Checkbox en Settings (`SettingsView.axaml:205`), se guarda en config | ❌ **Nunca se aplica al WebView.** Setting inerte. |
| **Incognito por proveedor** (`PrivacyConfig.IncognitoProviders`) | (sin UI) | ❌ Solo existe en el modelo; sin implementación. |
| **"Clear Ollama history on close"** | ✅ Checkbox | ✅ **Implementado** (`App.axaml.cs:69`). OK. |

El checkbox "Block trackers" es engañoso: el usuario cree que está protegido y no lo está.
**O se implementa, o se quita de la UI.** Misma decisión que ya se tomó (bien) con el idioma.

### 7.4 Versionado confuso

- `csproj`/CHANGELOG dicen **0.7.0**, pero existe un **tag `v1.0.0`** en git (junto a v0.4.0,
  v0.4.5). El `v1.0.0` probablemente es de la era Electron. El README pone badge "stable".
  Conviene aclarar el historial de tags (o re-taggear) para que 0.7.0 < v1.0.0 no confunda.

---

## 8. Higiene del repositorio

- **~49 ramas remotas `dependabot/npm_and_yarn/*`** — todas obsoletas (proyecto ya no usa npm).
- **~23 ramas remotas `copilot/*`** — fixes propuestos por GitHub Copilot, sin mergear
  (varios apuntan a problemas reales y reconocidos: `fix-empty-catch-blocks`,
  `fix-silent-exception-handling`, `fix-configservice-file-io-lock` ← coincide con el hallazgo
  C1, `fix-singleton-disposal-pattern`, etc.). **Vale la pena revisarlas y cerrarlas/mergearlas
  selectivamente** antes de borrarlas: contienen señal real.
- **`avalonia-port`** ya está integrada en `main` → stale.
- **Estado de mantenimiento:** activo pero pausado (~5 semanas sin commits). El CI corre en
  push/PR a main y develop sobre Linux/Windows/macOS con `dotnet test`. ✅

---

## 9. Plan de acción priorizado

### Prioridad alta
1. **Reescribir `CLAUDE.md`** para el stack real (Avalonia/.NET, singletons, servicios actuales).
2. **Decidir sobre "Block trackers" e incógnito:** implementar el aislamiento de sesión del
   WebView (S2) o retirar los controles fantasma de la UI (7.3).

### Prioridad media
3. **Resolver `_configLock`** (C1): usar el lock en Load/Save/Update o eliminarlo.
4. **Validar esquema `http(s)` antes de `Process.Start`** (S1).
5. **Arreglar `dependabot.yml`** (npm → nuget) y **purgar las ~49 ramas npm + ~23 `copilot/*`**
   (revisando antes las copilot por si tienen fixes válidos).
6. **Alinear versiones de Avalonia** (core 11.2.1 vs WebView 11.4.0).
7. **Marcar `SPEC.md` como histórico** o actualizarlo.

### Prioridad baja
8. Eliminar código muerto (`ConfigRecords.cs`, `NavigationState`).
9. Extraer lógica pura (config/shortcut/posición) y añadir tests.
10. Borrar artefactos residuales del working tree (`dist-electron/`, `coverage/`, `bin/Debug/net8.0`, `.codex`).
11. Hacer clickables los links del markdown (S5 / coherencia con CHANGELOG).
12. Aclarar el historial de tags (`v1.0.0` vs 0.7.0).

---

## 10. Veredicto

Proyecto **sano y bien construido** para ser un port reciente: compila limpio, tests verdes,
arquitectura coherente y buen criterio en async, errores y rendimiento. La deuda es sobre todo
de **documentación desactualizada** (el `CLAUDE.md` Electron es el riesgo más serio porque
desinforma activamente) y de **honestidad de la UI** (features de privacidad expuestas pero no
implementadas). Ninguno bloquea el uso; todos son abordables en una tarde de limpieza.

**Calificación global: 7.5/10** — código 8.5, documentación 4, higiene de repo 6.
