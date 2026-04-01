(function() {
  function open() {
    if (WM.exists('about')) { WM.show('about'); return; }

    var body = WM.create('about', {
      title: 'About Cool 95',
      icon: 'icons/msg_information-0.png',
      x: 200, y: 80, width: 420, height: 460,
    });

    body.innerHTML =
      '<div class="about-content">' +
        '<div class="about-header">' +
          '<div class="about-logo">Cool 95</div>' +
          '<div class="about-version">Version 1.0.0</div>' +
          '<div class="about-by">by <a href="#" onclick="AppRegistry.open(\'internet-explorer\',{url:\'https://timur.cool\'});return false" style="color:#000080">timur.cool</a></div>' +
        '</div>' +
        '<div class="about-sep"></div>' +
        '<div class="about-section">' +
          '<div class="about-label">Platform</div>' +
          '<div class="about-item"><b>Electron</b> 33 — Chromium-based desktop app framework</div>' +
          '<div class="about-item"><b>Node.js</b> 20 — JavaScript runtime</div>' +
          '<div class="about-item"><b>Chromium</b> — Browser engine powering all webviews</div>' +
        '</div>' +
        '<div class="about-section">' +
          '<div class="about-label">Build Tools</div>' +
          '<div class="about-item"><b>electron-builder</b> — macOS .app / .dmg packaging</div>' +
        '</div>' +
        '<div class="about-section">' +
          '<div class="about-label">Libraries</div>' +
          '<div class="about-item"><b>Webamp</b> 1.5.0 — Winamp 2 reimplementation in HTML5/JS<br><span class="about-link" onclick="AppRegistry.open(\'internet-explorer\',{url:\'https://github.com/nicollasm/webamp\'})">github.com/nicollasm/webamp</span></div>' +
          '<div class="about-item"><b>js-dos</b> — DOS/Win9x emulator for browser games<br><span class="about-link" onclick="AppRegistry.open(\'internet-explorer\',{url:\'https://js-dos.com\'})">js-dos.com</span></div>' +
        '</div>' +
        '<div class="about-section">' +
          '<div class="about-label">Built With</div>' +
          '<div class="about-item">Vanilla JavaScript — no frameworks, no bundlers</div>' +
          '<div class="about-item">Custom window manager, desktop, and taskbar</div>' +
          '<div class="about-item">CSS with Win95/98 3D beveled border styling</div>' +
        '</div>' +
        '<div class="about-section">' +
          '<div class="about-label">Features</div>' +
          '<div class="about-item">Full web browser with history, favorites, downloads</div>' +
          '<div class="about-item">Find on page, zoom, print, view source</div>' +
          '<div class="about-item">Persistent cookies, logins, and cache</div>' +
          '<div class="about-item">Chromium extension support</div>' +
          '<div class="about-item">Desktop icons, folders, shortcuts, wallpapers</div>' +
          '<div class="about-item">Drag &amp; resize windows from any edge</div>' +
          '<div class="about-item">Session restore across restarts</div>' +
        '</div>' +
        '<div class="about-footer">Made with madness and Claude Code</div>' +
      '</div>';
  }

  var style = document.createElement('style');
  style.textContent =
    '.about-content{flex:1;overflow-y:auto;background:#c0c0c0;padding:16px;font-size:12px}' +
    '.about-header{text-align:center;margin-bottom:12px}' +
    '.about-logo{font-size:28px;font-weight:bold;color:#0a246a;letter-spacing:1px}' +
    '.about-version{font-size:11px;color:#808080;margin-top:2px}' +
    '.about-by{font-size:11px;margin-top:4px}' +
    '.about-sep{border-top:1px solid #808080;border-bottom:1px solid #fff;margin:8px 0}' +
    '.about-section{margin-bottom:10px}' +
    '.about-label{font-size:11px;font-weight:bold;color:#0a246a;margin-bottom:4px}' +
    '.about-item{font-size:11px;padding:2px 0 2px 8px;line-height:1.4}' +
    '.about-link{color:#000080;cursor:pointer;font-size:10px}' +
    '.about-link:hover{text-decoration:underline}' +
    '.about-footer{text-align:center;font-size:10px;color:#808080;margin-top:12px;padding-top:8px;border-top:1px solid #808080}';
  document.head.appendChild(style);

  AppRegistry.register('about', {
    title: 'About Cool 95',
    icon: 'icons/msg_information-0.png',
    description: 'About this app',
    open: open,
    startMenu: true,
    desktop: false,
  });
})();
