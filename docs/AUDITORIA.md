# Auditoría completa — NeuralDeck

**Fecha:** 2026-06-08 · **Versión auditada:** 0.7.0 (`NeuralDeck.csproj`)
**Stack:** .NET 10, Avalonia 11.2.1, Avalonia.Controls.WebView 11.4.0, CommunityToolkit.Mvvm 8.2.2, SharpHook 5.3.7
**Verificación previa:** `dotnet build -c Release` → **0 warnings / 0 errores**. `dotnet test` → **18/18 OK** (todos de `MarkdownParser`).

---

## Executive summary

NeuralDeck es una base sólida y limpia: compila sin warnings, el código es legible y la separación
Models → Services → ViewModels → Views es coherente. No hay secretos hardcodeados ni vulnerabilidades
de ejecución remota. El parser Markdown está bien testeado.

Los problemas reales son **de robustez, rendimiento y privacidad**, no de corrección funcional básica:

1. **Rendimiento (ALTO):** `ConfigChanged` se dispara en cada mutación mínima de config. En modo de
   ventana `"remember"`, **arrastrar la ventana provoca una escritura a disco + reconstrucción completa
   de la UI (sidebar, menú de bandeja, atajos, tema) por cada evento de movimiento**. Sin debounce.
2. **Streaming Ollama (ALTO):** `HttpClient.Timeout = 60s` aborta cualquier generación que dure más de
   60 s en total, incluso con `ResponseHeadersRead`. Modelos de razonamiento locales se cortan a la mitad.
3. **Privacidad WebView (ALTO):** sesión única compartida entre todos los proveedores y, sobre todo,
   `ClearOnClose` **solo borra el historial de Ollama, no las cookies/sesión del WebView** — la opción
   promete más de lo que hace.
4. **Apertura de URIs externas (ALTO):** `Process.Start(UseShellExecute=true)` se invoca con la URI que
   pide la página (`NewWindowRequested`) sin filtrar el esquema → `file://`, `mailto:`, handlers custom.
5. **Thread-safety (MEDIO):** `_configLock` declarado pero **nunca usado**; singletons `??=` sin bloqueo;
   `File.WriteAllText` de config sin serializar accesos concurrentes.
6. **Tests (MEDIO):** cobertura ≈ 0 fuera de `MarkdownParser`. La lógica con más riesgo (normalización de
   config, parsing de atajos, posicionamiento, parsing de streaming Ollama) no tiene ni un test.

Puntuación global: **7.5/10**. Listo para uso personal; los puntos ALTO conviene arreglarlos antes de
distribuir.

---

## Issues por severidad

### 🔴 ALTO

#### A1 — `ConfigChanged` sobre-disparado: escritura a disco + rebuild de UI por cada evento de arrastre
- **`Services/WindowService.cs:39-47`** — `PositionChanged` llama a `UpdateWindow(...)` **sin debounce**
  (a diferencia de `SizeChanged`, que sí lo tiene en :49-58). Cada `UpdateWindow` hace `SaveConfig()`
  (disco) + dispara `ConfigChanged`.
- Suscriptores de `ConfigChanged` que hacen trabajo caro en cada disparo:
  - `Services/ShortcutService.cs:44-47` → `Refresh()` → `UnregisterAll()` + re-registro + rebuild de
    `KeyBindings` de la ventana.
  - `Services/TrayService.cs:64-67` → `UpdateMenu()` reconstruye el `NativeMenu` completo.
  - `ViewModels/MainWindowViewModel.cs:158-165` → `LoadProviders()` recrea toda la colección
    `EnabledProviders` (todos los botones del sidebar) + `UpdateSelectedProvider()`.
  - `Services/ThemeService.cs:24-25` → `ApplyFromConfig()`.
- **Impacto:** en `Window.Position == "remember"`, arrastrar la ventana = N escrituras de
  `config.json` + N reconstrucciones de sidebar/menú/atajos/tema, una por evento de `PositionChanged`.
  Jank visible y desgaste de disco.
- **Fix:**
  1. Debounce de `PositionChanged` igual que `SizeChanged` (timer de ~350 ms).
  2. Separar señales: un evento ligero `WindowGeometryChanged` que NO dispare el `ConfigChanged` global,
     o que `ConfigService` emita un `ConfigChanged` con la sección cambiada para que cada suscriptor
     decida si recomputar (p. ej. `TrayService`/`ShortcutService`/`LoadProviders` solo deberían
     reaccionar a cambios de `Providers`/`Shortcuts`, no de `Window.LastX/LastY`).

#### A2 — `HttpClient.Timeout = 60s` corta los streams largos de Ollama
- **`Services/OllamaService.cs:24`** — `_httpClient.Timeout = TimeSpan.FromSeconds(60);`
- Aunque se usa `HttpCompletionOption.ResponseHeadersRead` (`OllamaService.cs:117-120`), el
  `HttpClient.Timeout` cubre **toda la operación**, incluida la lectura del stream tras recibir cabeceras.
  Una generación que tarde >60 s en total se aborta con `TaskCanceledException`.
- Como `TaskCanceledException : OperationCanceledException`, en `ChatViewModel.cs:209-212` se trata como
  "el usuario pulsó Stop": la respuesta se trunca **en silencio**, sin mensaje de error y sin que el
  usuario sepa que se cortó.
- **Fix:** poner `_httpClient.Timeout = Timeout.InfiniteTimeSpan;` y controlar el tiempo con el
  `CancellationToken` (que ya se pasa) + opcionalmente un timeout *por lectura/idle* con un
  `CancellationTokenSource.CreateLinkedTokenSource` reiniciado en cada chunk. El health-check ya usa su
  propio CTS de 3 s (`OllamaService.cs:45-46`), así que el timeout global no aporta nada útil al chat.

#### A3 — Privacidad del WebView: sesión compartida y `ClearOnClose` que no limpia la web
- **`App.axaml.cs:69-70`** — al salir, `ClearOnClose` solo hace `ConversationStore.Clear()` (historial
  Ollama). **No se borran cookies, localStorage ni sesión del WebKitGTK.** Un usuario que active "Clear on
  close" creyendo que cierra sus sesiones de ChatGPT/Claude se queda logueado.
- **CLAUDE.md + diseño:** un único control `Browser` con `Navigate()` (`Views/WebBrowserView.axaml.cs`),
  sin aislamiento por proveedor → todos comparten un mismo perfil/almacén persistente.
- **Barra de direcciones libre** (`WebBrowserView.axaml.cs:177-190`, `WebBrowserViewModel.NormalizeUrl`):
  convierte el WebView (que porta cookies de sesión de los proveedores) en un navegador de propósito
  general. Navegar a un sitio arbitrario dentro de ese contexto con login persistente es superficie de
  phishing.
- **Riesgo real:** medio-bajo en uso personal (es tu propia máquina), pero la **promesa rota de
  `ClearOnClose` es lo más grave**: es un fallo de expectativa de privacidad explícita.
- **Fix:**
  1. Renombrar/documentar la opción como "Clear Ollama history on close", **o** implementar limpieza real
     de datos del WebView al salir (borrar el directorio de perfil de WebKitGTK que use el control, o
     llamar a la API de limpieza de datos del WebView si está expuesta en 11.4).
  2. Considerar restringir la barra de direcciones a navegación dentro del dominio del proveedor activo,
     o marcar claramente que es navegación libre.
  3. (Opcional) aislamiento por proveedor si en el futuro WebView soporta perfiles independientes.

#### A4 — `Process.Start` con esquema arbitrario controlado por la página
- **`Views/WebBrowserView.axaml.cs:111-121`** (`OpenExternalBrowser`) y **:167-175** (`OnNewWindowRequested`).
  La URI viene de `navArgs.Request` (la página) y se pasa directa a
  `Process.Start(new ProcessStartInfo { FileName = uri, UseShellExecute = true })`.
- Con `UseShellExecute=true` en Linux eso va a `xdg-open`, que despacha **cualquier esquema**: `file://`,
  `mailto:`, `tel:`, handlers de protocolo personalizados, etc. Una página maliciosa (o un proveedor
  comprometido) puede forzar `window.open("file:///...")` o un esquema con handler peligroso.
- **Fix:** validar esquema antes de abrir:
  ```csharp
  if (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
      Process.Start(new ProcessStartInfo { FileName = uri.ToString(), UseShellExecute = true });
  // si no, ignorar o loguear
  ```
  Aplicar el mismo filtro en `SettingsViewModel.OpenGitHub` no hace falta (URL fija), pero centralizar el
  helper de "abrir URL externa" con whitelist sería lo limpio.

---

### 🟡 MEDIO

#### M1 — `_configLock` declarado pero nunca usado; escrituras de config no serializadas
- **`Services/ConfigService.cs:27`** — `private readonly object _configLock = new();` no se referencia en
  todo el archivo. La protección de hilos es **ficticia**.
- `SaveConfig()` (`:151-162`) hace `File.WriteAllText` sin coordinación. Hay varias rutas que pueden
  guardar casi a la vez: debounce de tamaño (`WindowService.cs:56`), `PositionChanged` (:45), guardado de
  Settings, `UpdateGeneral` desde `ChatViewModel.OnSelectedModelChanged` (`ChatViewModel.cs:261`). Dos
  `WriteAllText` concurrentes sobre el mismo fichero → `IOException` / fichero truncado.
- **Fix:** usar de verdad `_configLock` en todas las lecturas/escrituras de `_config` y en `SaveConfig`
  (escribir a `.tmp` + `File.Move` atómico para evitar config corrupta a medio escribir).

#### M2 — Singletons `_instance ??= new()` no son thread-safe
- `ConfigService.cs:30`, `OllamaService.cs:19`, `WindowService.cs:21`, `ShortcutService.cs:28`,
  `ThemeService.cs:17`, `TrayService.cs:19`. El patrón `??=` puede construir dos instancias si dos hilos
  entran a la vez. Hoy se inicializan casi todo en el hilo de UI, pero `OllamaService.Instance` se toca
  desde el poll y el hook global despacha a UI — es un bug latente.
- **Fix:** `private static readonly Lazy<T> _lazy = new(() => new T());` o inicialización ansiosa en
  `App.OnFrameworkInitializationCompleted` (que de hecho ya es el orden real de arranque).

#### M3 — Multi-monitor: solo `Screens.Primary` y posición "remember" sin clamping
- **`Services/WindowService.cs:125`** — `CalculateWindowPosition()` usa siempre `Screens.Primary`. En
  multi-monitor la ventana fantasma aparece siempre en el monitor primario, ignorando dónde está el
  cursor o la bandeja (el modo "near-tray" ni siquiera localiza la bandeja: cae al default top-right,
  `:162`).
- **`WindowService.cs:148-151`** — en modo `"remember"` se devuelven `LastX/LastY` absolutos **sin
  comprobar que sigan dentro de algún monitor**. Si se desconecta el monitor secundario, la ventana
  reaparece fuera de pantalla y queda inaccesible (con `SystemDecorations="None"` no hay forma fácil de
  recuperarla salvo el atajo de toggle, que la muestra pero en la misma posición).
- **Fix:** elegir la pantalla bajo el cursor (`Screens.ScreenFromPoint`) para "near-tray"/posiciones
  relativas; y para "remember" hacer clamp de `(LastX, LastY)` contra el `Bounds` de la pantalla más
  cercana antes de aplicarlo.

#### M4 — El polling de Ollama recarga modelos y parpadea "Connecting..." cada 30 s
- **`ViewModels/ChatViewModel.cs:70-83`** (`PollConnectionAsync`) llama a `CheckConnectionAsync()` cada
  `OllamaPollIntervalMs` (30 s), que **siempre** pone `IsLoadingModels = true` + `ConnectionStatus =
  "Connecting..."` (`:88-89`) y, si está conectado, hace `LoadModelsAsync()` → `Models.Clear()` +
  refill (`:121-127`).
- **Impacto:** cada 30 s el dropdown de modelos se vacía y se reconstruye y el estado parpadea a
  "Connecting..." aunque ya estuviera conectado. Si el usuario está con el dropdown abierto o mid-stream,
  hay churn innecesario.
- **Fix:** en el poll, hacer solo `HealthCheckAsync()`; recargar modelos **solo** en la transición
  desconectado→conectado. No tocar `IsLoadingModels`/`ConnectionStatus` si el estado no cambia.

#### M5 — Cobertura de tests casi nula fuera de `MarkdownParser`
- Único test: `NeuralDeck.Tests/MarkdownParserTests.cs` (18 casos). Lógica de alto riesgo **sin tests**:
  - `ConfigService.NormalizeConfig` (`ConfigService.cs:115-146`): defaults, re-inserción de proveedores,
    clamping de ventana, migración del color de Ollama.
  - `ShortcutService.MatchesAccelerator` / `MapToKeyCode` / `ParseAvaloniaKey` / `ParseAvaloniaModifiers`
    (`ShortcutService.cs:102-263`): parsing de cadenas tipo `"CommandOrControl+Shift+1"`, lógica pura.
  - `WindowService.CalculateWindowPosition` (`:122-164`): matemática de posicionamiento (refactorizable a
    función pura `(config, screenMetrics) -> (x,y)` para testear sin singleton).
  - `OllamaService`: parsing de `/api/tags` (`:61-96`) y de las líneas de streaming (`:131-161`),
    `FormatModelSize`, `GetModelDisplayName`.
  - `WebBrowserViewModel.NormalizeUrl` (`:116-124`).
- **Fix prioritario:** empezar por las funciones puras (parsing de atajos, normalización de config,
  posicionamiento extraído, parsing de tamaños/streaming Ollama). Son las que más bugs silenciosos
  esconden y las más baratas de cubrir.

#### M6 — Logging por `Console.WriteLine` invisible en `WinExe`; errores tragados
- El binario es `OutputType=WinExe` (`NeuralDeck.csproj:3`): no hay consola, así que **todos** los
  `Console.WriteLine($"[Servicio] ...")` de error (ConfigService, OllamaService, ConversationStore,
  WebBrowserView, ShortcutService, TrayService, ViewModels) se pierden. Sumado a `catch { }` mudos
  (`OllamaService.cs:157-160`, `WebBrowserView.cs:148,164`, `ChatViewModel.cs:81`), los fallos son
  invisibles al diagnosticar.
- **Fix:** un logger mínimo a fichero (`~/.config/NeuralDeck/neuraldeck.log`) tras el que esconder los
  `Console.WriteLine`. No hace falta una librería; un `static Log.Write(...)` con append y lock basta.

---

### 🟢 BAJO

- **B1 — Sin framework de migración por versión.** `NormalizeConfig` no actualiza `config.Version`
  (`ConfigService.cs:115-146`) y la única "migración" es el parche ad-hoc del color de Ollama (:134-137).
  Si el esquema cambia, no hay forma de aplicar migraciones por versión. Sugerencia: setear
  `config.Version = GetAssemblyVersion()` al normalizar y prever un switch por versión.
- **B2 — Acoplamiento por singletons, sin DI.** Los ViewModels leen/escriben `ConfigService.Instance`
  directamente (p. ej. `MainWindowViewModel`, `ChatViewModel`, `SettingsViewModel`), y los servicios se
  referencian entre sí por `.Instance` (`ShortcutService`→`WindowService.Instance`,
  `TrayService`→`WindowService.Instance`). Funciona, pero impide testear ViewModels/servicios de forma
  aislada (raíz del problema M5). Migrar a `Microsoft.Extensions.DependencyInjection` (que el SPEC.md ya
  preveía) e inyectar interfaces (`IConfigService`, `IOllamaClient`, `IWindowService`) desbloquearía los
  tests. Cambio grande; no urgente para uso personal.
- **B3 — Normalización inconsistente de `OllamaUrl`.** `ConfigService.UpdateGeneral` guarda con `.Trim()`
  (`:218`), `OllamaService` recorta `/` final (`:25,40`), pero `ChatViewModel.OllamaBaseUrl` (`:41`)
  devuelve el valor crudo de config. Diferencias cosméticas de visualización.
- **B4 — Código muerto.** `Models/ConfigRecords.cs` (documentado como muerto en CLAUDE.md) y
  `Models/ChatModels.cs:39-44` `NavigationState` (sin usos). Borrarlos reduce ruido.
- **B5 — Se pueden deshabilitar todos los proveedores, incluido Ollama.** No hay invariante que garantice
  ≥1 proveedor activo. Con todo deshabilitado, `EnabledProviders` queda vacío (sidebar vacío) aunque
  `ShowChatView`/`ShowProviderView` sigan funcionando por `SelectedProviderId`
  (`MainWindowViewModel.cs:28-29`). No crashea, pero deja una UI confusa. Sugerencia: impedir
  deshabilitar el último proveedor en `ToggleProvider`.
- **B6 — Escritura de config en cada arranque.** `LoadConfig` llama a `SaveConfig()` siempre tras
  normalizar (`ConfigService.cs:61`), incluso si nada cambió. Escritura de disco innecesaria por sesión.

---

## Notas de cosas que están BIEN (no tocar)

- Cancelación del chat por usuario: correcta (`ChatViewModel.cs:189,253` + `OperationCanceledException`).
- Inyección de CSS idempotente con marcador `__nd_s` y `InvokeScript` (`WebBrowserView.cs:136-149`).
- Debounce del guardado de tamaño de ventana (`WindowService.cs:49-58`).
- `Tmds.DBus.Protocol` pinneado a 0.21.3 para esquivar GHSA-xrw6-gwf8-vvr9 (`csproj:23`). Mantener.
- Sin secretos hardcodeados (solo URLs públicas y `localhost:11434`). Cumple la norma `no-hardcode`.
- `MarkdownParser` puro y bien testeado.

---

## Top 10 action items (prioridad)

1. **[A2]** `OllamaService.cs:24` → `Timeout = Timeout.InfiniteTimeSpan`; controlar duración con el
   `CancellationToken` (+ timeout de idle por lectura). *Arregla cortes silenciosos del chat a 60 s.*
2. **[A1]** Debounce de `PositionChanged` en `WindowService.cs:39-47` y dejar de disparar el
   `ConfigChanged` global por cambios de geometría. *Arregla jank + escritura a disco al arrastrar.*
3. **[A3]** Hacer que `ClearOnClose` borre de verdad la sesión del WebView **o** renombrar la opción a
   "Clear Ollama history on close" (`App.axaml.cs:69`). *Cierra la promesa de privacidad rota.*
4. **[A4]** Filtrar esquema (`http`/`https`) antes de `Process.Start` en `WebBrowserView.cs:111-121,167`.
5. **[M1]** Usar de verdad `_configLock` y escritura atómica (`.tmp` + `File.Move`) en `ConfigService`.
6. **[M4]** Poll de Ollama: solo `HealthCheckAsync`; recargar modelos solo en transición
   desconectado→conectado (`ChatViewModel.cs:70-114`). *Quita el parpadeo cada 30 s.*
7. **[M5]** Tests para funciones puras: `NormalizeConfig`, parsing de atajos (`MatchesAccelerator`/
   `MapToKeyCode`), parsing de streaming/`tags` de Ollama, `NormalizeUrl`.
8. **[M3]** Multi-monitor: pantalla bajo el cursor para posiciones relativas + clamp de la posición
   "remember" contra el `Bounds` de pantalla (`WindowService.cs:122-164`).
9. **[M2]** Cambiar singletons a `Lazy<T>` o inicialización ansiosa en `App.OnFrameworkInitializationCompleted`.
10. **[M6]** Logger mínimo a fichero detrás de los `Console.WriteLine`; eliminar `catch {}` mudos.

> Cambios de fondo (B2 — DI container) quedan fuera del top 10: alto coste, bajo retorno para uso
> personal, pero es el verdadero desbloqueo para subir cobertura de tests si NeuralDeck crece.
