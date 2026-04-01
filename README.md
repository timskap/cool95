# Cool 95

![Cool 95](Screenshots/Screenshot%202026-04-01%20at%2016.20.20.png)

A web browser that looks and feels like Windows 95.

![Cool 95 Browser](Screenshots/Screenshot%202026-04-01%20at%2016.20.56.png)

Built with Electron. No frameworks, no bundlers — just vanilla JavaScript and pixel-perfect CSS.

## Features

**Browser**
- Full Chromium-based web browser inside a retro desktop
- Tabs as separate draggable windows
- Address bar with search (type words to Google, URLs to navigate)
- Favorites, browsing history, downloads manager
- Find on page, zoom, print, view source
- Right-click context menu with open in new window, copy link, search selection
- HTTPS padlock indicator
- Persistent cookies, logins, and cache across sessions
- Session restore — reopens your tabs on restart
- Chromium extension support
- Configurable home page

**Desktop**
- Draggable desktop icons with grid snapping
- Create folders and website shortcuts
- Right-click context menu (new folder, new shortcut, properties)
- Wallpaper picker with built-in wallpapers
- UI scaling (75% to 200%)
- Rename and delete items

**Apps**
- Internet Explorer — the main browser
- Minesweeper — classic
- Winamp — via Webamp, the HTML5 Winamp reimplementation
- GTA 2 — via js-dos browser emulator

**Window Manager**
- Drag windows by title bar
- Resize from any edge or corner
- Minimize, maximize, close
- Taskbar with window list and clock
- Start menu

## Install

Download the DMG from releases, drag to Applications, done.

## Dev

```
npm install
npm start
```

## Build

```
npm run build
```

Outputs `dist/Cool 95-1.0.0-arm64.dmg`.

## Tech

- **Electron 33** — Chromium + Node.js desktop runtime
- **Webamp** — Winamp 2 in the browser ([github.com/captbaritone/webamp](https://github.com/captbaritone/webamp))
- **js-dos** — DOS emulator ([js-dos.com](https://js-dos.com))
- **electron-builder** — macOS packaging

## License

MIT
