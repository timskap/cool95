(function() {
  var GAME_URL = 'https://dos.zone/ru/grand-theft-auto2/';

  var INJECT_JS = '(' + function() {
    function cleanup() {
      var canvas = document.querySelector('canvas');
      if (!canvas) return;

      // Walk up from canvas, at each level hide all siblings
      var el = canvas;
      while (el.parentElement) {
        var parent = el.parentElement;
        Array.from(parent.children).forEach(function(sibling) {
          if (sibling === el) return;
          if (sibling.tagName === 'SCRIPT' || sibling.tagName === 'STYLE' || sibling.tagName === 'LINK') return;
          // Check if sibling contains the canvas (shouldn't, but be safe)
          if (sibling.contains(canvas)) return;
          sibling.style.setProperty('display', 'none', 'important');
        });
        // Expand this element
        if (parent !== document.documentElement) {
          parent.style.setProperty('width', '100vw', 'important');
          parent.style.setProperty('height', '100vh', 'important');
          parent.style.setProperty('max-width', 'none', 'important');
          parent.style.setProperty('max-height', 'none', 'important');
          parent.style.setProperty('padding', '0', 'important');
          parent.style.setProperty('margin', '0', 'important');
          parent.style.setProperty('overflow', 'hidden', 'important');
          parent.style.setProperty('position', 'fixed', 'important');
          parent.style.setProperty('top', '0', 'important');
          parent.style.setProperty('left', '0', 'important');
        }
        el = parent;
      }

      canvas.style.setProperty('width', '100vw', 'important');
      canvas.style.setProperty('height', '100vh', 'important');
      canvas.style.setProperty('object-fit', 'contain', 'important');
      canvas.style.setProperty('display', 'block', 'important');

      document.body.style.setProperty('background', '#000', 'important');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('margin', '0', 'important');
      document.body.style.setProperty('padding', '0', 'important');
    }

    var attempts = 0;
    var interval = setInterval(function() {
      if (document.querySelector('canvas')) {
        cleanup();
        setTimeout(cleanup, 500);
        setTimeout(cleanup, 1500);
        setTimeout(cleanup, 3000);
        setTimeout(cleanup, 6000);
        clearInterval(interval);
      }
      if (++attempts > 120) clearInterval(interval);
    }, 1000);

    new MutationObserver(function() {
      if (document.querySelector('canvas')) cleanup();
    }).observe(document.documentElement, { childList: true, subtree: true });
  } + ')();';

  function open() {
    if (WM.exists('gta2')) { WM.show('gta2'); return; }

    var body = WM.create('gta2', {
      title: 'Grand Theft Auto 2',
      icon: 'icons/minesweeper.png',
      x: 80, y: 20, width: 900, height: 620,
    });

    body.innerHTML =
      '<div class="gta2-content">' +
        '<webview id="wv-gta2" src="' + GAME_URL + '" partition="persist:browser" allowpopups></webview>' +
      '</div>';

    var wv = document.getElementById('wv-gta2');
    wv.addEventListener('dom-ready', function() {
      wv.executeJavaScript(INJECT_JS);
    });
  }

  var style = document.createElement('style');
  style.textContent =
    '.gta2-content{flex:1;overflow:hidden;width:100%;height:100%;background:#000}' +
    '.gta2-content webview{width:100%;height:100%}';
  document.head.appendChild(style);

  AppRegistry.register('gta2', {
    title: 'GTA 2',
    icon: 'icons/minesweeper.png',
    description: 'Grand Theft Auto 2',
    open: open,
    startMenu: true,
    desktop: true,
  });
})();
