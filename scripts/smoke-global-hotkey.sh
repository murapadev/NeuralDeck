#!/usr/bin/env bash
#
# Smoke test for the *global* hotkey (SharpHook/uiohook) of NeuralDeck on Linux.
#
# The global hotkey is not an in-window accelerator: it is a system-wide
# keyboard hook (uiohook → XRecord on Linux). It can be exercised in CI as
# long as there is an X server to hook into — Xvfb is enough, no window
# manager needed.
#
# What is NOT covered here: the Wayland/uinput backend (it needs root), which
# is exactly the backend NeuralDeck disables on purpose
# (UioHookProvider.SetLinuxMode(LinuxMode.XRecord)).
#
# Usage:  APP_BIN=/path/to/NeuralDeck scripts/smoke-global-hotkey.sh
#
set -euo pipefail

APP_BIN="${APP_BIN:-}"
SCREEN="${SCREEN:-1024x768x24}"
STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-90}"
ACTION_TIMEOUT="${ACTION_TIMEOUT:-20}"
HOOK_TIMEOUT="${HOOK_TIMEOUT:-30}"
DISPLAY_NUM="${DISPLAY_NUM:-77}"

log() { echo "[hotkey-smoke] $*"; }
fail() { echo "[hotkey-smoke] FAIL: $*" >&2; exit 1; }

if [[ -z "$APP_BIN" ]]; then
  fail "APP_BIN is not set (path to the published NeuralDeck binary)"
fi
[[ -x "$APP_BIN" ]] || fail "APP_BIN is not executable: $APP_BIN"

for tool in xdotool xwininfo Xvfb; do
  command -v "$tool" >/dev/null 2>&1 || fail "missing required tool: $tool"
done

WORKDIR="$(mktemp -d)"
export HOME="$WORKDIR/home"
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_RUNTIME_DIR="$WORKDIR/run"
mkdir -p "$HOME" "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_CACHE_HOME" "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

cleanup() {
  [[ -n "${APP_PID:-}" ]] && kill "$APP_PID" 2>/dev/null || true
  [[ -n "${XVFB_PID:-}" ]] && kill "$XVFB_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  # Keep the app log around when the caller asked for it (CI uploads it on failure).
  if [[ -n "${APP_LOG:-}" ]]; then
    cp -f "$WORKDIR/app.log" "$APP_LOG" 2>/dev/null || true
    cp -f "$WORKDIR/xvfb.log" "${APP_LOG%.log}.xvfb.log" 2>/dev/null || true
  fi
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

dump_app_log() {
  [[ -f "$WORKDIR/app.log" ]] || return 0
  echo "[hotkey-smoke] --- app log ---" >&2
  sed 's/^/    /' "$WORKDIR/app.log" >&2 || true
}

# ---------------------------------------------------------------------------
# X server
# ---------------------------------------------------------------------------
Xvfb ":${DISPLAY_NUM}" -screen 0 "$SCREEN" -ac >"$WORKDIR/xvfb.log" 2>&1 &
XVFB_PID=$!
export DISPLAY=":${DISPLAY_NUM}"

for _ in $(seq 1 50); do
  if xdotool getdisplaygeometry >/dev/null 2>&1; then break; fi
  sleep 0.2
done
xdotool getdisplaygeometry >/dev/null 2>&1 || fail "Xvfb did not come up (see $WORKDIR/xvfb.log)"
log "Xvfb ready on $DISPLAY"

# ---------------------------------------------------------------------------
# Config: disable HideOnBlur (it would hide the window for reasons unrelated
# to the hotkey) and skip the first-run onboarding so the real window shows.
# ---------------------------------------------------------------------------
mkdir -p "$XDG_CONFIG_HOME/NeuralDeck"
cat >"$XDG_CONFIG_HOME/NeuralDeck/config.json" <<'JSON'
{
  "version": "0.0.0-smoke",
  "debug": false,
  "firstRun": false,
  "ollamaUrl": "http://localhost:11434",
  "window": {
    "width": 420,
    "height": 700,
    "position": "top-left",
    "alwaysOnTop": false,
    "hideOnBlur": false,
    "opacity": 1.0
  },
  "shortcuts": {
    "toggleWindow": "CommandOrControl+Shift+Space",
    "openSettings": "CommandOrControl+,",
    "providers": [
      "CommandOrControl+Shift+1",
      "CommandOrControl+Shift+2",
      "CommandOrControl+Shift+3",
      "CommandOrControl+Shift+4",
      "CommandOrControl+Shift+5"
    ],
    "reload": "CommandOrControl+R",
    "goBack": "CommandOrControl+Left",
    "goForward": "CommandOrControl+Right"
  },
  "privacy": { "clearOnClose": false }
}
JSON

# ---------------------------------------------------------------------------
# Launch the real published binary
# ---------------------------------------------------------------------------
log "starting $APP_BIN"
"$APP_BIN" >"$WORKDIR/app.log" 2>&1 &
APP_PID=$!

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Window id whose name matches exactly $1 (first match wins).
find_window() {
  local wanted="$1" w n
  for w in $(xdotool search --name "$wanted" 2>/dev/null || true); do
    n="$(xdotool getwindowname "$w" 2>/dev/null || true)"
    if [[ "$n" == "$wanted" ]]; then echo "$w"; return 0; fi
  done
  return 1
}

map_state() {
  xwininfo -id "$1" 2>/dev/null | awk '/Map State/ {print $3}'
}

# Poll until the map state of window $1 equals $2 (up to ACTION_TIMEOUT).
wait_for_state() {
  local win="$1" want="$2"
  local deadline=$((SECONDS + ACTION_TIMEOUT))
  while (( SECONDS < deadline )); do
    [[ "$(map_state "$win")" == "$want" ]] && return 0
    sleep 0.25
  done
  return 1
}

# ---------------------------------------------------------------------------
# 1. The main window must come up
# ---------------------------------------------------------------------------
MAIN_WIN=""
for _ in $(seq 1 $((STARTUP_TIMEOUT * 2))); do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    dump_app_log
    fail "the app died before the window appeared"
  fi
  MAIN_WIN="$(find_window "NeuralDeck" || true)"
  if [[ -n "$MAIN_WIN" && "$(map_state "$MAIN_WIN")" == "IsViewable" ]]; then break; fi
  sleep 0.5
done
[[ -n "$MAIN_WIN" ]] || fail "no window titled 'NeuralDeck' appeared within ${STARTUP_TIMEOUT}s"
[[ "$(map_state "$MAIN_WIN")" == "IsViewable" ]] || fail "main window never became viewable"
log "main window $MAIN_WIN is viewable"

# ---------------------------------------------------------------------------
# 2. The hook must really be loaded in-process before we send any key.
#    The XRecord backend is dlopen'd from the extracted single-file bundle.
# ---------------------------------------------------------------------------
HOOK_LIB=""
deadline=$((SECONDS + HOOK_TIMEOUT))
while (( SECONDS < deadline )); do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    dump_app_log
    fail "the app died before the global hook was ready"
  fi
  HOOK_LIB="$(grep -o 'libuiohook[^ ]*\.so' "/proc/$APP_PID/maps" 2>/dev/null | head -1 || true)"
  [[ -n "$HOOK_LIB" ]] && break
  sleep 0.5
done
if [[ -n "$HOOK_LIB" ]]; then
  log "global hook backend loaded: $HOOK_LIB"
  # The .so being mapped does not mean the XRecord client is already listening:
  # the first key event after startup can still be swallowed while uiohook
  # finishes connecting to the X server. Give it a moment before pressing.
  sleep 2
else
  # Not fatal on its own: the real assertion is the behaviour below. If uiohook
  # ever renames its .so, this warning must not fail the build by itself.
  log "WARNING: no libuiohook backend in /proc/$APP_PID/maps after ${HOOK_TIMEOUT}s"
fi

# ---------------------------------------------------------------------------
# 3. Ctrl+Shift+Space toggles the main window (hide -> show)
# ---------------------------------------------------------------------------
press_until() {
  # press_until <window> <expected state> <key combo>
  local win="$1" want="$2" key="$3" attempt
  for attempt in 1 2 3; do
    xdotool key --clearmodifiers "$key" 2>/dev/null || true
    if wait_for_state "$win" "$want"; then return 0; fi
    log "attempt $attempt: state is '$(map_state "$win")', expected '$want' — retrying"
    sleep 1
  done
  return 1
}

log "sending ctrl+shift+space (toggle)"
if ! press_until "$MAIN_WIN" "IsUnMapped" "ctrl+shift+space"; then
  dump_app_log
  fail "Ctrl+Shift+Space did not hide the main window (state: $(map_state "$MAIN_WIN"))"
fi
log "main window hidden by the global hotkey"

log "sending ctrl+shift+space again (toggle back)"
if ! press_until "$MAIN_WIN" "IsViewable" "ctrl+shift+space"; then
  dump_app_log
  fail "Ctrl+Shift+Space did not show the main window again (state: $(map_state "$MAIN_WIN"))"
fi
log "main window visible again"

# ---------------------------------------------------------------------------
# 4. Ctrl+, opens the settings window
# ---------------------------------------------------------------------------
log "sending ctrl+comma (open settings)"
SETTINGS_WIN=""
for attempt in 1 2 3; do
  xdotool key --clearmodifiers ctrl+comma 2>/dev/null || true
  deadline=$((SECONDS + ACTION_TIMEOUT))
  while (( SECONDS < deadline )); do
    SETTINGS_WIN="$(find_window "NeuralDeck Settings" || true)"
    if [[ -n "$SETTINGS_WIN" && "$(map_state "$SETTINGS_WIN")" == "IsViewable" ]]; then break 2; fi
    sleep 0.25
  done
  log "attempt $attempt: no settings window yet — retrying"
  sleep 1
done
if [[ -z "$SETTINGS_WIN" ]]; then
  dump_app_log
  fail "Ctrl+, did not open a window titled 'NeuralDeck Settings'"
fi
[[ "$(map_state "$SETTINGS_WIN")" == "IsViewable" ]] || fail "settings window exists but is not viewable"
log "settings window $SETTINGS_WIN is viewable"

log "OK: the global hotkey works under Xvfb (X11/XRecord backend)"
