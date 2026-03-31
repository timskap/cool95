(function() {
  var count = 0;

  function open(opts) {
    var url = (opts && opts.url) || 'https://timur.cool';
    var id = 'browser-' + (++count);
    var body = WM.create(id, {
      title: new URL(url).hostname,
      icon: 'icons/internet_connection_wiz-5.png',
      x: 60 + count * 25, y: 15 + count * 25,
      width: 800, height: 500,
    });

    body.innerHTML =
      '<div class="w-menubar">' +
        '<div class="w-menu-item"><u>F</u>ile</div><div class="w-menu-item"><u>E</u>dit</div>' +
        '<div class="w-menu-item"><u>V</u>iew</div><div class="w-menu-item">F<u>a</u>vorites</div>' +
      '</div>' +
      '<div class="w-toolbar">' +
        '<div class="w-tb" onclick="IEApp.back(\'' + id + '\')">&#9664; Back</div>' +
        '<div class="w-tb" onclick="IEApp.fwd(\'' + id + '\')">&#9654;</div>' +
        '<div class="w-sep"></div>' +
        '<div class="w-tb" onclick="IEApp.refresh(\'' + id + '\')">Refresh</div>' +
        '<div class="w-tb" onclick="IEApp.home(\'' + id + '\')"><img src=\'icons/computer-3.png\'> Home</div>' +
      '</div>' +
      '<div class="ie-bar">' +
        '<span class="ie-bar-label">Address</span>' +
        '<input class="ie-url" id="url-' + id + '" value="' + url + '" onkeydown="if(event.key===\'Enter\')IEApp.go(\'' + id + '\')">' +
        '<button class="ie-go" onclick="IEApp.go(\'' + id + '\')">Go</button>' +
      '</div>' +
      '<div class="ie-content"><webview id="wv-' + id + '" src="' + url + '" allowpopups></webview></div>' +
      '<div class="w-statusbar"><span class="w-status" id="st-' + id + '">Loading...</span></div>';

    var wv = document.getElementById('wv-' + id);
    wv.addEventListener('did-finish-load', function() {
      document.getElementById('st-' + id).textContent = 'Done';
      WM.setTitle(id, wv.getTitle() || url);
      document.getElementById('url-' + id).value = wv.getURL();
    });
    wv.addEventListener('did-start-loading', function() {
      document.getElementById('st-' + id).textContent = 'Loading...';
    });
    wv.addEventListener('page-title-updated', function(e) { WM.setTitle(id, e.title); });
    wv.addEventListener('did-navigate', function(e) { document.getElementById('url-' + id).value = e.url; });
  }

  // Public nav methods
  window.IEApp = {
    go: function(id) { var u = document.getElementById('url-' + id).value; if (!/^https?:\/\//.test(u)) u = 'https://' + u; document.getElementById('wv-' + id).src = u; },
    back: function(id) { var wv = document.getElementById('wv-' + id); if (wv.canGoBack()) wv.goBack(); },
    fwd: function(id) { var wv = document.getElementById('wv-' + id); if (wv.canGoForward()) wv.goForward(); },
    refresh: function(id) { document.getElementById('wv-' + id).reload(); },
    home: function(id) { document.getElementById('wv-' + id).src = 'https://timur.cool'; },
  };

  // Inject CSS
  var style = document.createElement('style');
  style.textContent =
    '.ie-bar{background:#c0c0c0;padding:2px 5px;display:flex;align-items:center;gap:4px;border-bottom:1px solid #808080;flex-shrink:0}' +
    '.ie-bar-label{font-size:11px;font-weight:bold}' +
    '.ie-url{flex:1;height:20px;background:#fff;border:2px solid;border-color:#808080 #dfdfdf #dfdfdf #808080;box-shadow:inset 1px 1px 0px #000;padding:0 5px;font-family:inherit;font-size:12px}' +
    '.ie-go{height:20px;padding:0 8px;background:#c0c0c0;border:2px solid;border-color:#dfdfdf #000 #000 #dfdfdf;box-shadow:inset 1px 1px 0px #fff,inset -1px -1px 0px #808080;font-family:inherit;font-size:11px;cursor:pointer}' +
    '.ie-go:active{border-color:#000 #dfdfdf #dfdfdf #000;box-shadow:inset -1px -1px 0px #fff,inset 1px 1px 0px #808080}' +
    '.ie-content{flex:1;overflow:hidden}.ie-content webview{width:100%;height:100%}';
  document.head.appendChild(style);

  AppRegistry.register('internet-explorer', {
    title: 'Internet Explorer',
    icon: 'icons/internet_connection_wiz-5.png',
    description: 'Browse the web',
    open: open,
    startMenu: true,
    desktop: true,
  });
})();
