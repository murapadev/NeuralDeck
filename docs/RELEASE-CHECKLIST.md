# Release checklist

Manual checks that CI cannot do. Work through this list before cutting a release tag
(`git push origin v*` — the tag drives `.github/workflows/release.yml`).

## Global hook / hotkeys

The global hotkey is a **system-wide** keyboard hook (SharpHook → uiohook), not an in-window
accelerator. CI can only cover the X11 path (see `scripts/smoke-global-hotkey.sh`, which runs
under Xvfb). The native Wayland path can only be checked by hand, on a real Wayland desktop.

- [ ] **X11 / XWayland session** — toggle + `Ctrl+Shift+1..5` + `Ctrl+,` all work.
      The `global-hotkey-smoke` CI job automates exactly this under Xvfb, but run it once on a
      real desktop too (a real WM exercises the same path with a real compositor).
- [ ] **Native Wayland session** — check the global hotkey, *or* document the limitation.

  On Linux the hook is deliberately pinned to `LinuxMode.XRecord` (`UioHookProvider.SetLinuxMode`),
  because the SharpHook 8 Wayland backend (`LinuxMode.UInput`) needs root. `XRecord` only captures
  the traffic that goes through XWayland, so **in a native Wayland session the global hotkeys are
  dead for keys pressed in native Wayland applications**. This is not a regression — SharpHook 7.x
  behaved exactly the same — but it used to fail *silently*: the app started fine and the hotkeys
  simply did nothing.

  Since the unreleased version the failure is no longer silent:

  - `ShortcutService` detects the session (`XDG_SESSION_TYPE` / `WAYLAND_DISPLAY`),
  - a hook failure is written to the log **and to stderr** (no longer a lone `Console.WriteLine`),
  - `ShortcutService.GlobalHookFailed` is raised,
  - a tray notification ("Global shortcuts unavailable") is shown,
  - Settings → Shortcuts shows a red warning banner explaining the situation.

  Manual check: on a native Wayland session, open Settings → Shortcuts and confirm the banner is
  visible and the hotkeys don't respond. On X11, confirm there is **no** banner.

- [ ] After any SharpHook bump: re-run the X11 smoke test and the Wayland check above.

## Build & packaging

- [ ] `dotnet restore` then `dotnet build -c Release` → **0 warnings, 0 errors**.
- [ ] `dotnet test` → all green (174 tests as of the unreleased version; 162 in v0.8.0).
- [ ] The release tarball/zip contains the app binary and **not** the test executable or the
      native `.pdb` files of SkiaSharp/HarfBuzz.

## Platforms

- [ ] Linux: WebKitGTK 4.1 present; a web provider loads without `free(): invalid pointer`
      and without blank pages on NVIDIA.
- [ ] Windows: WebView2 runtime present; provider sessions isolated.
- [ ] macOS: `WKWebView` runs; `Cmd`-style accelerators behave.
