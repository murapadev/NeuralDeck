# Propuesta de cambio en `CLAUDE.md` (pendiente de aprobación)

Motivo: el guard de Hermes bloquea la escritura directa en `CLAUDE.md`
(archivo de instrucciones de agente) sin aprobación humana. Este fichero
contiene el cambio exacto proposed, listo para aplicarse.

## Ubicación

`CLAUDE.md`, líneas 23-27, dentro del bullet de **SharpHook 8.0** en la
sección `## Stack`.

## Texto actual (incorrecto)

```markdown
- **SharpHook 8.0** — global keyboard shortcuts (types live in `SharpHook.Data`). SharpHook 8
  renumbered every `KeyCode` value: only ever use the symbolic names. On Linux the hook is
  forced to `LinuxMode.XRecord` (pre-8 behaviour; the Wayland backend needs root/uinput) and
  runs keyboard-only. The global hotkey can't be exercised in CI — test it by hand after any
  SharpHook bump (toggle, `Ctrl+Shift+1..5`, `Ctrl+,`).
```

## Texto propuesto

```markdown
- **SharpHook 8.0** — global keyboard shortcuts (types live in `SharpHook.Data`). SharpHook 8
  renumbered every `KeyCode` value: only ever use the symbolic names. On Linux the hook is
  forced to `LinuxMode.XRecord` (pre-8 behaviour; the Wayland backend needs root/uinput) and
  runs keyboard-only. The global hotkey **is** exercised in CI: `scripts/smoke-global-hotkey.sh`
  runs the published single-file bundle under `Xvfb` and drives it with `xdotool`
  (`Ctrl+Shift+Space` must hide/show the main window, `Ctrl+,` must open the settings window).
  Run it locally with `APP_BIN=publish/linux-x64/NeuralDeck bash scripts/smoke-global-hotkey.sh`.
  What stays manual is the **Wayland/uinput backend** — it needs root, and on Linux NeuralDeck
  deliberately does not use it (`SetLinuxMode(LinuxMode.XRecord)`). So the CI smoke covers
  X11/XWayland only; test the Wayland path by hand after a SharpHook bump.
```

## Por qué el cambio es correcto

- La frase anterior era **falsa**: con Xvfb + xdotool el hotkey global sí se
  puede ejercitar, y está comprobado contra el **binario single-file publicado**
  (no contra un test sintético).
- Lo único que **no** automatiza es el backend **Wayland/uinput**, que necesita
  root — y que la app desactiva a propósito con `SetLinuxMode(LinuxMode.XRecord)`.
  La nueva redacción dice exactamente eso.
- El script referenciado (`scripts/smoke-global-hotkey.sh`) y los jobs
  (`global-hotkey-smoke`, `global-hotkey-smoke-negative` en `.github/workflows/ci.yml`)
  están en el mismo commit, así que la instrucción es ejecutable tal cual.

## Alternativa rápida (equivalente)

```bash
cd /home/pablorm/Proyectos/Propios/NeuralDeck
python3 - <<'PY'
import pathlib
p = pathlib.Path("CLAUDE.md")
s = p.read_text()
old = """  runs keyboard-only. The global hotkey can't be exercised in CI — test it by hand after any
  SharpHook bump (toggle, `Ctrl+Shift+1..5`, `Ctrl+,`)."""
new = """  runs keyboard-only. The global hotkey **is** exercised in CI: `scripts/smoke-global-hotkey.sh`
  runs the published single-file bundle under `Xvfb` and drives it with `xdotool`
  (`Ctrl+Shift+Space` must hide/show the main window, `Ctrl+,` must open the settings window).
  Run it locally with `APP_BIN=publish/linux-x64/NeuralDeck bash scripts/smoke-global-hotkey.sh`.
  What stays manual is the **Wayland/uinput backend** — it needs root, and on Linux NeuralDeck
  deliberately does not use it (`SetLinuxMode(LinuxMode.XRecord)`). So the CI smoke covers
  X11/XWayland only; test the Wayland path by hand after a SharpHook bump."""
assert old in s, "anchor not found"
p.write_text(s.replace(old, new))
print("CLAUDE.md updated")
PY
```
