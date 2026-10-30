<p align="center">
  <img src="Assets/Icons/app.svg" width="96" alt="NeuralDeck logo"/>
</p>

<h1 align="center">NeuralDeck</h1>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License"/></a>
  <img src="https://img.shields.io/badge/.NET-10-512BD4" alt=".NET 10"/>
  <img src="https://img.shields.io/badge/Avalonia-12.1-blue" alt="Avalonia UI"/>
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20macOS-lightgrey" alt="Platforms"/>
  <img src="https://img.shields.io/badge/status-stable-green" alt="Status"/>
</p>

> Tu centro de mando de IA invisible. Accede a ChatGPT, Gemini, Claude, DeepSeek, Perplexity y modelos locales Ollama desde una interfaz flotante, siempre a mano con un atajo de teclado.

---

## Características

- **Acceso instantáneo** — vive en la bandeja del sistema; `Ctrl+Shift+Space` la muestra u oculta
- **Multi-AI Hub** — ChatGPT, Gemini, DeepSeek, Perplexity (y Grok, Copilot, Mistral, Meta AI opcionales) embebidos en WebView nativo. Claude se abre en el navegador del sistema: Cloudflare bloquea los motores WebKit embebidos
- **Sesiones aisladas por proveedor** — cada proveedor tiene su propio perfil de navegador (cookies, almacenamiento); iniciar sesión en uno no es visible para los demás, y al cambiar de proveedor la página se conserva
- **Ollama local** — chat con streaming, Markdown con enlaces clicables, historial persistente, selector de modelos en vivo, prompt de sistema, exportación a Markdown
- **Privacidad** — "Clear on close" borra el historial de Ollama y ejecuta los proveedores web en sesiones privadas
- **Providers personalizados** — añade cualquier URL como proveedor en Settings → Providers
- **Atajos por proveedor** — `Ctrl+Shift+1..5` para saltar directamente a cada IA
- **Stealth mode** — `HideOnBlur` oculta la ventana al perder el foco; siempre encima opcional
- **Temas y acento** — Dark/Light/System + 8 colores de acento con preview en vivo
- **Zero-bloat** — .NET 10 nativo, sin Electron, ~60 MB autocontenido

## Instalación (desarrollo)

```bash
git clone https://github.com/murapadev/NeuralDeck.git
cd NeuralDeck

# Linux: necesita WebKitGTK 4.1
sudo apt install libwebkit2gtk-4.1-dev   # Debian/Ubuntu
sudo pacman -S webkit2gtk-4.1            # Arch

dotnet restore
dotnet run
```

## Build

```bash
# Debug local
dotnet build
dotnet test

# Release autocontenido (sin .NET instalado en el sistema destino)
dotnet publish -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true
dotnet publish -c Release -r win-x64   --self-contained true -p:PublishSingleFile=true
dotnet publish -c Release -r osx-arm64 --self-contained true -p:PublishSingleFile=true
```

## Atajos de teclado

| Acción | Atajo |
|--------|-------|
| Mostrar / ocultar | `Ctrl+Shift+Space` |
| Abrir ajustes | `Ctrl+,` |
| Provider 1..5 | `Ctrl+Shift+1..5` |
| Recargar proveedor web | `Ctrl+R` / `F5` |
| Atrás / adelante | `Ctrl+←` / `Ctrl+→` |
| Salir | `Ctrl+Q` |
| Cerrar ajustes | `Esc` o `Ctrl+W` |

## Configuración

La configuración se guarda en `~/.config/NeuralDeck/config.json` (Linux/macOS) o `%APPDATA%\NeuralDeck\config.json` (Windows).

El historial del chat de Ollama se guarda sin cifrar en `ollama-history.json`, en la misma carpeta que la configuración.

Los perfiles de navegador de cada proveedor están en `~/.local/share/NeuralDeck/WebProfiles` (Linux) o `%LOCALAPPDATA%\NeuralDeck\WebProfiles` (Windows); en macOS los gestiona WKWebView. Borrar la carpeta de un proveedor cierra su sesión.

**Límites del aislamiento:** en macOS anterior a 14 y en Windows con un runtime de WebView2 sin soporte de perfiles, todos los proveedores comparten el mismo almacén.

## Stack

- [.NET 10](https://dotnet.microsoft.com/) + [Avalonia UI 12.1](https://avaloniaui.net/)
- Avalonia.Controls.WebView 12.1 — WebKitGTK en Linux, WebView2 en Windows, WKWebView en macOS
- [CommunityToolkit.Mvvm](https://github.com/CommunityToolkit/dotnet) — MVVM source generators
- [SharpHook 8](https://github.com/TolikPylypchuk/SharpHook) — atajos globales (en Linux, X11/XWayland)
- xUnit v3 sobre Microsoft.Testing.Platform — `dotnet test`

## Contribución

Las contribuciones son bienvenidas. Abre un issue o pull request.

## Licencia

MIT — ver [LICENSE](LICENSE).

---

*Hecho con ❤️ por [murapadev](https://github.com/murapadev)*
