(function() {
  var count = 0;
  var DEFAULT_HOME = 'https://www.google.com';
  var HOME_URL = (window.electronAPI ? window.electronAPI.storageRead('home-url', DEFAULT_HOME) : DEFAULT_HOME);
  var SEARCH_URL = 'https://www.google.com/search?q=';
  var openWindows = {};

  // ── Persistence helpers ──
  function store(key, fallback) { return window.electronAPI ? window.electronAPI.storageRead(key, fallback) : fallback; }
  function save(key, data) { if (window.electronAPI) window.electronAPI.storageWrite(key, data); }

  function saveSession() {
    var urls = [];
    Object.keys(openWindows).forEach(function(id) { if (openWindows[id]) urls.push(openWindows[id]); });
    save('session', urls);
  }

  // ── History ──
  function loadHistory() { return store('history', []); }
  function saveHistory(h) { save('history', h); }
  function addHistory(title, url) {
    if (!url || url === 'about:blank') return;
    var h = loadHistory();
    // Remove duplicate if exists
    h = h.filter(function(e) { return e.url !== url; });
    h.unshift({ title: title || url, url: url, time: Date.now() });
    if (h.length > 200) h.length = 200;
    saveHistory(h);
  }

  // ── Favorites ──
  function loadFavorites() { return store('favorites', []); }
  function saveFavorites(f) { save('favorites', f); }

  // ── URL / Search logic ──
  function normalizeInput(input) {
    input = input.trim();
    if (/^https?:\/\//.test(input)) return input;
    // Looks like a domain (has dot and no spaces)
    if (/^[^\s]+\.[^\s]+$/.test(input)) return 'https://' + input;
    // Otherwise treat as search
    return SEARCH_URL + encodeURIComponent(input);
  }

  // ── Dropdown menu helper ──
  function showDropdown(x, y, items) {
    document.querySelectorAll('.ctx-menu').forEach(function(m) { m.remove(); });
    var menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    items.forEach(function(mi) {
      if (mi === '---') {
        var sep = document.createElement('div'); sep.className = 'ctx-sep'; menu.appendChild(sep); return;
      }
      var el = document.createElement('div');
      el.className = 'ctx-item';
      if (mi.disabled) el.classList.add('disabled');
      el.textContent = mi.label;
      if (mi.action) el.addEventListener('mousedown', function(e) { e.stopPropagation(); menu.remove(); mi.action(); });
      menu.appendChild(el);
    });
    document.body.appendChild(menu);
    // Keep in viewport
    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight - 32) menu.style.top = (y - rect.height) + 'px';
    setTimeout(function() {
      document.addEventListener('mousedown', function h(e) {
        if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', h); }
      });
    }, 0);
  }

  // ══════════════════════════════════════
  //  OPEN BROWSER WINDOW
  // ══════════════════════════════════════
  function open(opts) {
    var url = (opts && opts.url) || HOME_URL;
    var id = 'browser-' + (++count);
    openWindows[id] = url;
    var zoomLevel = 0;
    var findBarOpen = false;

    var body = WM.create(id, {
      title: new URL(url).hostname,
      icon: 'icons/internet_connection_wiz-5.png',
      x: 60 + count * 25, y: 15 + count * 25,
      width: 850, height: 550,
      onClose: function() { delete openWindows[id]; saveSession(); },
    });

    body.innerHTML =
      // Menu bar
      '<div class="w-menubar">' +
        '<div class="w-menu-item" data-ie-menu="file" data-id="' + id + '"><u>F</u>ile</div>' +
        '<div class="w-menu-item" data-ie-menu="edit" data-id="' + id + '"><u>E</u>dit</div>' +
        '<div class="w-menu-item" data-ie-menu="view" data-id="' + id + '"><u>V</u>iew</div>' +
        '<div class="w-menu-item" data-ie-menu="go" data-id="' + id + '"><u>G</u>o</div>' +
        '<div class="w-menu-item" data-ie-menu="favorites" data-id="' + id + '">F<u>a</u>vorites</div>' +
        '<div class="w-menu-item" data-ie-menu="tools" data-id="' + id + '"><u>T</u>ools</div>' +
      '</div>' +
      // Toolbar
      '<div class="w-toolbar">' +
        '<div class="w-tb" onclick="IEApp.back(\'' + id + '\')">&#9664; Back</div>' +
        '<div class="w-tb" onclick="IEApp.fwd(\'' + id + '\')">&#9654;</div>' +
        '<div class="w-sep"></div>' +
        '<div class="w-tb" onclick="IEApp.refresh(\'' + id + '\')">Refresh</div>' +
        '<div class="w-tb" onclick="IEApp.stop(\'' + id + '\')">Stop</div>' +
        '<div class="w-tb" onclick="IEApp.home(\'' + id + '\')"><img src=\'icons/computer-3.png\'> Home</div>' +
        '<div class="w-sep"></div>' +
        '<div class="w-tb" onclick="IEApp.toggleFav(\'' + id + '\')">&#9733; Favorites</div>' +
      '</div>' +
      // Address bar
      '<div class="ie-bar">' +
        '<span class="ie-lock" id="lock-' + id + '" title="Not secure">&#9888;</span>' +
        '<span class="ie-bar-label">Address</span>' +
        '<input class="ie-url" id="url-' + id + '" value="' + url + '" onkeydown="if(event.key===\'Enter\')IEApp.go(\'' + id + '\')">' +
        '<button class="ie-go" onclick="IEApp.go(\'' + id + '\')">Go</button>' +
      '</div>' +
      // Find bar (hidden)
      '<div class="ie-find" id="find-' + id + '" style="display:none">' +
        '<span style="font-size:11px">Find:</span>' +
        '<input class="ie-find-input" id="find-input-' + id + '" onkeydown="if(event.key===\'Enter\')IEApp.findNext(\'' + id + '\');if(event.key===\'Escape\')IEApp.closeFind(\'' + id + '\')">' +
        '<button class="ie-go" onclick="IEApp.findNext(\'' + id + '\')">Next</button>' +
        '<button class="ie-go" onclick="IEApp.findPrev(\'' + id + '\')">Prev</button>' +
        '<button class="ie-go" onclick="IEApp.closeFind(\'' + id + '\')">&times;</button>' +
      '</div>' +
      // Main area
      '<div class="ie-main">' +
        '<div class="ie-fav-panel" id="favpanel-' + id + '" style="display:none">' +
          '<div class="ie-fav-header">Favorites<button class="ie-fav-add" onclick="IEApp.addFav(\'' + id + '\')">Add</button></div>' +
          '<div class="ie-fav-list" id="favlist-' + id + '"></div>' +
        '</div>' +
        '<div class="ie-content"><webview id="wv-' + id + '" src="' + url + '" partition="persist:browser" allowpopups useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"></webview></div>' +
      '</div>' +
      // Status bar with progress
      '<div class="w-statusbar">' +
        '<span class="w-status" id="st-' + id + '"><span class="ie-progress" id="prog-' + id + '"></span>Loading...</span>' +
        '<span class="w-status" id="zoom-' + id + '" style="flex:0 0 60px;text-align:center;cursor:default">100%</span>' +
      '</div>';

    var wv = document.getElementById('wv-' + id);

    // ── Webview events ──
    // Focus window when clicking inside webview content
    wv.addEventListener('focus', function() { WM.focus(id); });

    // Close context menus when interacting with webview content
    // Inject a click listener inside the webview that notifies the parent via console
    wv.addEventListener('dom-ready', function() {
      wv.executeJavaScript("document.addEventListener('mousedown', function() { console.log('__webview_click__'); })");
    });
    wv.addEventListener('console-message', function(e) {
      if (e.message === '__webview_click__') {
        document.querySelectorAll('.ctx-menu').forEach(function(m) { m.remove(); });
      }
    });

    wv.addEventListener('did-finish-load', function() {
      document.getElementById('st-' + id).innerHTML = 'Done';
      hideProgress(id);
      WM.setTitle(id, wv.getTitle() || url);
      document.getElementById('url-' + id).value = wv.getURL();
      addHistory(wv.getTitle(), wv.getURL());
      updateLock(id, wv.getURL());
    });

    wv.addEventListener('did-start-loading', function() {
      document.getElementById('st-' + id).innerHTML = '<span class="ie-progress ie-progress-anim" id="prog-' + id + '"></span>Loading...';
    });

    wv.addEventListener('did-fail-load', function(e) {
      if (e.errorCode !== -3) {
        document.getElementById('st-' + id).textContent = 'Error: ' + (e.errorDescription || 'Failed');
        hideProgress(id);
      }
    });

    wv.addEventListener('page-title-updated', function(e) { WM.setTitle(id, e.title); });

    wv.addEventListener('did-navigate', function(e) {
      document.getElementById('url-' + id).value = e.url;
      openWindows[id] = e.url;
      saveSession();
      updateLock(id, e.url);
    });

    wv.addEventListener('did-navigate-in-page', function(e) {
      document.getElementById('url-' + id).value = e.url;
    });

    // Context menu inside webview
    wv.addEventListener('context-menu', function(e) {
      var params = e.params;
      var items = [];
      if (params.linkURL) {
        items.push({ label: 'Open Link in New Window', action: function() { AppRegistry.open('internet-explorer', { url: params.linkURL }); } });
        items.push({ label: 'Copy Link', action: function() { navigator.clipboard.writeText(params.linkURL); } });
        items.push('---');
      }
      if (params.srcURL && (params.mediaType === 'image')) {
        items.push({ label: 'Open Image in New Window', action: function() { AppRegistry.open('internet-explorer', { url: params.srcURL }); } });
        items.push({ label: 'Copy Image URL', action: function() { navigator.clipboard.writeText(params.srcURL); } });
        items.push('---');
      }
      if (params.selectionText) {
        items.push({ label: 'Copy', action: function() { wv.copy(); } });
        items.push({ label: 'Search Google for "' + params.selectionText.substring(0, 30) + '"', action: function() {
          AppRegistry.open('internet-explorer', { url: SEARCH_URL + encodeURIComponent(params.selectionText) });
        }});
        items.push('---');
      }
      items.push({ label: 'Back', action: function() { IEApp.back(id); } });
      items.push({ label: 'Forward', action: function() { IEApp.fwd(id); } });
      items.push({ label: 'Refresh', action: function() { IEApp.refresh(id); } });
      items.push('---');
      items.push({ label: 'View Source', action: function() { IEApp.viewSource(id); } });
      items.push({ label: 'Create Desktop Shortcut', action: function() { createDesktopShortcut(id); } });
      showDropdown(e.params.x, e.params.y, items);
    });

    // Keyboard shortcuts inside the window
    body.closest('.w98-win').addEventListener('keydown', function(e) {
      // Ctrl+F = Find
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); IEApp.openFind(id); }
      // Ctrl+P = Print
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); IEApp.print(id); }
      // Ctrl+Plus/Minus = Zoom
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); IEApp.zoomIn(id); }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); IEApp.zoomOut(id); }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); IEApp.zoomReset(id); }
      // Ctrl+U = View Source
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); IEApp.viewSource(id); }
    });

    renderFavorites(id);

    // Menu bar clicks
    body.querySelectorAll('[data-ie-menu]').forEach(function(menuEl) {
      menuEl.addEventListener('click', function() {
        var menu = menuEl.dataset.ieMenu;
        var rect = menuEl.getBoundingClientRect();
        handleMenu(id, menu, rect.left, rect.bottom);
      });
    });

    // Store zoom for this window
    body._zoomLevel = 0;
  }

  // ── Lock icon ──
  function updateLock(id, url) {
    var lock = document.getElementById('lock-' + id);
    if (!lock) return;
    if (url && url.indexOf('https://') === 0) {
      lock.innerHTML = '&#128274;';
      lock.title = 'Secure (HTTPS)';
      lock.className = 'ie-lock ie-lock-secure';
    } else {
      lock.innerHTML = '&#9888;';
      lock.title = 'Not secure';
      lock.className = 'ie-lock';
    }
  }

  // ── Progress ──
  function hideProgress(id) {
    var prog = document.getElementById('prog-' + id);
    if (prog) prog.remove();
  }

  // ── Menus ──
  function handleMenu(id, menu, x, y) {
    var items = [];
    if (menu === 'file') {
      items = [
        { label: 'New Window', action: function() { AppRegistry.open('internet-explorer', {}); } },
        '---',
        { label: 'Print...', action: function() { IEApp.print(id); } },
        '---',
        { label: 'Create Desktop Shortcut...', action: function() { createDesktopShortcut(id); } },
        '---',
        { label: 'Close', action: function() { WM.close(id); } },
      ];
    } else if (menu === 'edit') {
      items = [
        { label: 'Find on This Page...', action: function() { IEApp.openFind(id); } },
        '---',
        { label: 'Copy URL', action: function() { navigator.clipboard.writeText(document.getElementById('url-' + id).value); } },
        '---',
        { label: 'View Source', action: function() { IEApp.viewSource(id); } },
      ];
    } else if (menu === 'view') {
      items = [
        { label: 'Refresh', action: function() { IEApp.refresh(id); } },
        { label: 'Stop', action: function() { IEApp.stop(id); } },
        '---',
        { label: 'Zoom In', action: function() { IEApp.zoomIn(id); } },
        { label: 'Zoom Out', action: function() { IEApp.zoomOut(id); } },
        { label: 'Reset Zoom', action: function() { IEApp.zoomReset(id); } },
        '---',
        { label: 'View Source', action: function() { IEApp.viewSource(id); } },
      ];
    } else if (menu === 'go') {
      items = [
        { label: 'Back', action: function() { IEApp.back(id); } },
        { label: 'Forward', action: function() { IEApp.fwd(id); } },
        { label: 'Home Page', action: function() { IEApp.home(id); } },
        '---',
      ];
      // Recent history
      var h = loadHistory().slice(0, 15);
      if (h.length === 0) {
        items.push({ label: '(no history)', disabled: true });
      } else {
        h.forEach(function(entry) {
          items.push({ label: entry.title.substring(0, 50), action: function() {
            document.getElementById('wv-' + id).src = entry.url;
          }});
        });
        items.push('---');
        items.push({ label: 'View All History...', action: function() { openHistoryWindow(); } });
        items.push({ label: 'Clear History', action: function() { saveHistory([]); Toast.show('History cleared'); } });
      }
    } else if (menu === 'favorites') {
      var favs = loadFavorites();
      items = [
        { label: 'Add to Favorites...', action: function() { IEApp.addFav(id); } },
        '---',
      ];
      if (favs.length === 0) {
        items.push({ label: '(empty)', disabled: true });
      } else {
        favs.forEach(function(f) {
          items.push({ label: f.title.substring(0, 50), action: function() {
            document.getElementById('wv-' + id).src = f.url;
            document.getElementById('url-' + id).value = f.url;
          }});
        });
      }
    } else if (menu === 'tools') {
      items = [
        { label: 'Set Current as Home Page', action: function() {
          var wv = document.getElementById('wv-' + id);
          if (wv) {
            HOME_URL = wv.getURL();
            if (window.electronAPI) window.electronAPI.storageWrite('home-url', HOME_URL);
            Toast.show('Home page set to ' + HOME_URL);
          }
        }},
        { label: 'Change Home Page...', action: function() {
          var current = HOME_URL;
          // Reuse Desktop's dialog if available
          if (typeof Desktop !== 'undefined') {
            var overlay = document.createElement('div');
            overlay.className = 'dlg-overlay';
            var dlg = document.createElement('div');
            dlg.className = 'dlg-win';
            dlg.innerHTML = '<div class="dlg-titlebar"><span>Home Page</span></div><div class="dlg-body">' +
              '<div class="dlg-field"><label>URL:</label><input class="dlg-input" id="dlg-home-url" type="text" value="' + HOME_URL + '"></div>' +
              '</div><div class="dlg-buttons"><button class="dlg-btn" id="dlg-home-ok">OK</button><button class="dlg-btn" id="dlg-home-cancel">Cancel</button></div>';
            overlay.appendChild(dlg);
            document.body.appendChild(overlay);
            document.getElementById('dlg-home-url').focus();
            document.getElementById('dlg-home-url').select();
            document.getElementById('dlg-home-ok').onclick = function() {
              var val = document.getElementById('dlg-home-url').value.trim();
              if (val) {
                HOME_URL = val;
                if (window.electronAPI) window.electronAPI.storageWrite('home-url', HOME_URL);
                Toast.show('Home page set');
              }
              overlay.remove();
            };
            document.getElementById('dlg-home-cancel').onclick = function() { overlay.remove(); };
            dlg.addEventListener('keydown', function(e) {
              if (e.key === 'Enter') document.getElementById('dlg-home-ok').click();
              if (e.key === 'Escape') overlay.remove();
            });
          }
        }},
        '---',
        { label: 'Downloads', action: function() { openDownloadsWindow(); } },
        { label: 'Extensions...', action: function() { openExtensionsManager(); } },
      ];
    }
    showDropdown(x, y, items);
  }

  // ── Desktop shortcut ──
  function createDesktopShortcut(id) {
    var wv = document.getElementById('wv-' + id);
    if (!wv) return;
    Desktop.addItem({ type: 'shortcut', label: wv.getTitle() || 'Website', icon: 'icons/internet_connection_wiz-5.png', url: wv.getURL() || document.getElementById('url-' + id).value });
    Toast.show('Shortcut created on desktop');
  }

  // ── Favorites panel ──
  function renderFavorites(id) {
    var list = document.getElementById('favlist-' + id);
    if (!list) return;
    var favs = loadFavorites();
    list.innerHTML = '';
    favs.forEach(function(f, idx) {
      var el = document.createElement('div');
      el.className = 'ie-fav-item';
      el.innerHTML = '<img src="icons/internet_connection_wiz-5.png"><span>' + f.title + '</span><button class="ie-fav-del" data-idx="' + idx + '">&times;</button>';
      el.addEventListener('dblclick', function() {
        document.getElementById('wv-' + id).src = f.url;
        document.getElementById('url-' + id).value = f.url;
      });
      el.querySelector('.ie-fav-del').addEventListener('click', function(e) {
        e.stopPropagation();
        favs.splice(idx, 1);
        saveFavorites(favs);
        renderFavorites(id);
      });
      list.appendChild(el);
    });
  }

  // ── History window ──
  function openHistoryWindow() {
    if (WM.exists('history-win')) { WM.show('history-win'); return; }
    var body = WM.create('history-win', { title: 'History', icon: 'icons/help_book_cool-1.png', x: 120, y: 50, width: 500, height: 400 });
    var h = loadHistory();
    var html = '<div style="flex:1;overflow-y:auto;background:#fff;font-size:11px">';
    if (h.length === 0) html += '<div style="padding:12px;color:#808080">No history</div>';
    h.forEach(function(entry) {
      var d = new Date(entry.time);
      var time = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
      html += '<div class="ie-fav-item" ondblclick="AppRegistry.open(\'internet-explorer\',{url:\'' + entry.url.replace(/'/g, "\\'") + '\'})">' +
        '<img src="icons/internet_connection_wiz-5.png"><span title="' + entry.url + '">' + entry.title + '</span>' +
        '<span style="flex:0 0 auto;color:#808080;font-size:10px;margin-left:8px">' + time + '</span></div>';
    });
    html += '</div>';
    body.innerHTML = html;
  }

  // ── Downloads window ──
  var downloads = [];
  function openDownloadsWindow() {
    if (WM.exists('downloads-win')) { WM.show('downloads-win'); renderDownloads(); return; }
    WM.create('downloads-win', { title: 'Downloads', icon: 'icons/directory_folder_options-5.png', x: 140, y: 70, width: 450, height: 300 });
    renderDownloads();
  }
  function renderDownloads() {
    var body = document.getElementById('wbody-downloads-win');
    if (!body) return;
    var html = '<div style="flex:1;overflow-y:auto;background:#fff;font-size:11px;padding:4px">';
    if (downloads.length === 0) html += '<div style="padding:12px;color:#808080">No downloads</div>';
    downloads.forEach(function(dl) {
      var pct = dl.total > 0 ? Math.round(dl.received / dl.total * 100) : 0;
      var status = dl.state === 'completed' ? 'Done' : dl.state === 'cancelled' ? 'Cancelled' : pct + '%';
      html += '<div style="padding:4px 6px;border-bottom:1px solid #e0e0e0;display:flex;align-items:center;gap:6px">' +
        '<img src="icons/directory_folder_options-5.png" style="width:16px;height:16px;image-rendering:pixelated">' +
        '<div style="flex:1"><div>' + dl.filename + '</div>' +
        '<div class="ie-dl-bar"><div class="ie-dl-fill" style="width:' + (dl.state === 'completed' ? 100 : pct) + '%"></div></div></div>' +
        '<span style="color:#808080;min-width:50px;text-align:right">' + status + '</span></div>';
    });
    html += '</div>';
    body.innerHTML = html;
  }

  // Listen for download events from main process
  if (window.electronAPI) {
    window.electronAPI.onDownloadStarted(function(data) {
      downloads.push({ filename: data.filename, received: 0, total: data.totalBytes, state: 'progressing' });
      Toast.show('Downloading: ' + data.filename);
      renderDownloads();
    });
    window.electronAPI.onDownloadProgress(function(data) {
      var dl = downloads.find(function(d) { return d.filename === data.filename && d.state === 'progressing'; });
      if (dl) { dl.received = data.received; dl.total = data.total; }
      renderDownloads();
    });
    window.electronAPI.onDownloadDone(function(data) {
      var dl = downloads.find(function(d) { return d.filename === data.filename && d.state === 'progressing'; });
      if (dl) { dl.state = data.state; dl.received = dl.total; }
      Toast.show(data.state === 'completed' ? 'Download complete: ' + data.filename : 'Download failed: ' + data.filename, data.state === 'completed' ? '' : 'error');
      renderDownloads();
    });
  }

  // ── Extensions Manager ──
  function openExtensionsManager() {
    if (WM.exists('extensions')) { WM.show('extensions'); return; }
    var body = WM.create('extensions', { title: 'Extensions', icon: 'icons/help_book_cool-1.png', x: 150, y: 80, width: 400, height: 300 });
    function render() {
      var exts = window.electronAPI ? window.electronAPI.getExtensions() : [];
      var html = '<div style="padding:8px"><div style="margin-bottom:8px"><button class="ie-go" onclick="IEApp.installExtension()">Install Extension (Unpacked)...</button></div>' +
        '<div style="border:1px solid #808080;background:#fff;padding:4px;min-height:100px">';
      if (exts.length === 0) html += '<div style="padding:12px;color:#808080">No extensions installed</div>';
      else exts.forEach(function(ext) {
        html += '<div style="padding:4px 6px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e0e0e0">' +
          '<span>' + ext.name + '</span><button class="ie-fav-del" style="display:block;position:static;color:#808080" onclick="IEApp.removeExtension(\'' + ext.id + '\')">&times;</button></div>';
      });
      html += '</div></div>';
      body.innerHTML = html;
    }
    render();
    window._renderExtensions = render;
  }

  // ══════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════
  window.IEApp = {
    go: function(id) {
      var u = normalizeInput(document.getElementById('url-' + id).value);
      document.getElementById('url-' + id).value = u;
      document.getElementById('wv-' + id).src = u;
    },
    back: function(id) { var wv = document.getElementById('wv-' + id); if (wv && wv.canGoBack()) wv.goBack(); },
    fwd: function(id) { var wv = document.getElementById('wv-' + id); if (wv && wv.canGoForward()) wv.goForward(); },
    refresh: function(id) { var wv = document.getElementById('wv-' + id); if (wv) wv.reload(); },
    stop: function(id) { var wv = document.getElementById('wv-' + id); if (wv) wv.stop(); },
    home: function(id) { var wv = document.getElementById('wv-' + id); if (wv) wv.src = HOME_URL; },

    // Favorites
    toggleFav: function(id) {
      var panel = document.getElementById('favpanel-' + id);
      if (!panel) return;
      var show = panel.style.display === 'none';
      panel.style.display = show ? '' : 'none';
      if (show) renderFavorites(id);
    },
    addFav: function(id) {
      var wv = document.getElementById('wv-' + id);
      var title = wv ? (wv.getTitle() || '') : '';
      var currentUrl = wv ? wv.getURL() : document.getElementById('url-' + id).value;
      var favs = loadFavorites();
      if (favs.some(function(f) { return f.url === currentUrl; })) { Toast.show('Already in favorites'); return; }
      favs.push({ title: title || currentUrl, url: currentUrl });
      saveFavorites(favs);
      renderFavorites(id);
      Toast.show('Added to favorites');
    },

    // Find on page
    openFind: function(id) {
      var bar = document.getElementById('find-' + id);
      if (bar) { bar.style.display = ''; document.getElementById('find-input-' + id).focus(); }
    },
    closeFind: function(id) {
      var bar = document.getElementById('find-' + id);
      if (bar) bar.style.display = 'none';
      var wv = document.getElementById('wv-' + id);
      if (wv) wv.stopFindInPage('clearSelection');
    },
    findNext: function(id) {
      var text = document.getElementById('find-input-' + id).value;
      if (!text) return;
      var wv = document.getElementById('wv-' + id);
      if (wv) wv.findInPage(text);
    },
    findPrev: function(id) {
      var text = document.getElementById('find-input-' + id).value;
      if (!text) return;
      var wv = document.getElementById('wv-' + id);
      if (wv) wv.findInPage(text, { forward: false });
    },

    // Zoom
    zoomIn: function(id) {
      var wv = document.getElementById('wv-' + id);
      var win = wv && wv.closest('.w98-win');
      if (!win) return;
      var body = document.getElementById('wbody-' + id);
      var z = (body._zoomLevel || 0) + 1;
      body._zoomLevel = z;
      wv.setZoomLevel(z);
      document.getElementById('zoom-' + id).textContent = Math.round(Math.pow(1.2, z) * 100) + '%';
    },
    zoomOut: function(id) {
      var wv = document.getElementById('wv-' + id);
      var body = document.getElementById('wbody-' + id);
      if (!wv || !body) return;
      var z = (body._zoomLevel || 0) - 1;
      body._zoomLevel = z;
      wv.setZoomLevel(z);
      document.getElementById('zoom-' + id).textContent = Math.round(Math.pow(1.2, z) * 100) + '%';
    },
    zoomReset: function(id) {
      var wv = document.getElementById('wv-' + id);
      var body = document.getElementById('wbody-' + id);
      if (!wv || !body) return;
      body._zoomLevel = 0;
      wv.setZoomLevel(0);
      document.getElementById('zoom-' + id).textContent = '100%';
    },

    // Print
    print: function(id) {
      var wv = document.getElementById('wv-' + id);
      if (wv) wv.print();
    },

    // View Source
    viewSource: function(id) {
      var wv = document.getElementById('wv-' + id);
      if (!wv) return;
      wv.executeJavaScript('document.documentElement.outerHTML').then(function(html) {
        var srcId = 'source-' + id;
        if (WM.exists(srcId)) { WM.show(srcId); return; }
        var body = WM.create(srcId, { title: 'Source: ' + wv.getURL(), icon: 'icons/help_book_cool-1.png', x: 100, y: 40, width: 700, height: 450 });
        var pre = document.createElement('pre');
        pre.style.cssText = 'flex:1;overflow:auto;background:#fff;padding:8px;font-size:11px;font-family:monospace;white-space:pre-wrap;word-break:break-all;margin:0;user-select:text';
        pre.textContent = html;
        body.appendChild(pre);
      });
    },

    // Extensions
    installExtension: function() {
      if (!window.electronAPI) return;
      window.electronAPI.pickFolder().then(function(folderPath) {
        if (!folderPath) return;
        window.electronAPI.loadExtension(folderPath).then(function(result) {
          if (result.success) {
            var saved = window.electronAPI.storageRead('extensions', []);
            if (saved.indexOf(folderPath) === -1) { saved.push(folderPath); window.electronAPI.storageWrite('extensions', saved); }
            Toast.show('Extension "' + result.name + '" installed');
            if (window._renderExtensions) window._renderExtensions();
          } else { Toast.show('Failed: ' + result.error, 'error'); }
        });
      });
    },
    removeExtension: function(extId) {
      if (!window.electronAPI) return;
      window.electronAPI.removeExtension(extId).then(function() {
        Toast.show('Extension removed');
        if (window._renderExtensions) window._renderExtensions();
      });
    },
  };

  // ══════════════════════════════════════
  //  CSS
  // ══════════════════════════════════════
  var style = document.createElement('style');
  style.textContent =
    '.ie-bar{background:#c0c0c0;padding:2px 5px;display:flex;align-items:center;gap:4px;border-bottom:1px solid #808080;flex-shrink:0}' +
    '.ie-bar-label{font-size:11px;font-weight:bold}' +
    '.ie-lock{font-size:12px;cursor:default;min-width:16px;text-align:center}' +
    '.ie-lock-secure{color:#008000}' +
    '.ie-url{flex:1;height:20px;background:#fff;border:2px solid;border-color:#808080 #dfdfdf #dfdfdf #808080;box-shadow:inset 1px 1px 0px #000;padding:0 5px;font-family:inherit;font-size:12px}' +
    '.ie-go{height:20px;padding:0 8px;background:#c0c0c0;border:2px solid;border-color:#dfdfdf #000 #000 #dfdfdf;box-shadow:inset 1px 1px 0px #fff,inset -1px -1px 0px #808080;font-family:inherit;font-size:11px;cursor:pointer}' +
    '.ie-go:active{border-color:#000 #dfdfdf #dfdfdf #000;box-shadow:inset -1px -1px 0px #fff,inset 1px 1px 0px #808080}' +
    '.ie-main{flex:1;display:flex;overflow:hidden}' +
    '.ie-content{flex:1;overflow:hidden}.ie-content webview{width:100%;height:100%}' +
    // Find bar
    '.ie-find{background:#c0c0c0;padding:2px 5px;display:flex;align-items:center;gap:4px;border-bottom:1px solid #808080;flex-shrink:0}' +
    '.ie-find-input{width:200px;height:20px;background:#fff;border:2px solid;border-color:#808080 #dfdfdf #dfdfdf #808080;box-shadow:inset 1px 1px 0px #000;padding:0 5px;font-family:inherit;font-size:12px}' +
    // Progress bar
    '.ie-progress{display:inline-block;width:80px;height:10px;border:1px solid #808080;margin-right:6px;vertical-align:middle;background:#fff}' +
    '.ie-progress-anim{background:linear-gradient(90deg,#000080 0%,#000080 30%,#fff 30%,#fff 100%);background-size:200% 100%;animation:ie-loading 1.5s linear infinite}' +
    '@keyframes ie-loading{0%{background-position:100% 0}100%{background-position:-100% 0}}' +
    // Download bar
    '.ie-dl-bar{height:8px;background:#fff;border:1px solid #808080;margin-top:2px}' +
    '.ie-dl-fill{height:100%;background:#000080;transition:width 0.3s}' +
    // Favorites panel
    '.ie-fav-panel{width:200px;background:#fff;border-right:2px solid;border-color:#808080 #dfdfdf;display:flex;flex-direction:column;flex-shrink:0}' +
    '.ie-fav-header{background:#c0c0c0;padding:4px 6px;font-size:11px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #808080}' +
    '.ie-fav-add{font-size:10px;padding:1px 6px;background:#c0c0c0;border:1px solid;border-color:#dfdfdf #808080 #808080 #dfdfdf;cursor:pointer}' +
    '.ie-fav-list{flex:1;overflow-y:auto;font-size:11px}' +
    '.ie-fav-item{padding:3px 6px;display:flex;align-items:center;gap:4px;cursor:default;position:relative}' +
    '.ie-fav-item:hover{background:#000080;color:#fff}' +
    '.ie-fav-item img{width:16px;height:16px;image-rendering:pixelated}' +
    '.ie-fav-item span{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}' +
    '.ie-fav-del{position:absolute;right:4px;background:none;border:none;cursor:pointer;font-size:14px;color:#808080;display:none}' +
    '.ie-fav-item:hover .ie-fav-del{display:block;color:#fff}' +
    // Folder content (for desktop folders)
    '.folder-toolbar{background:#c0c0c0;padding:2px 4px;border-bottom:1px solid #808080}' +
    '.folder-content{flex:1;background:#fff;overflow-y:auto;padding:8px}' +
    '.folder-item{display:inline-flex;flex-direction:column;align-items:center;width:72px;padding:4px;cursor:default;vertical-align:top}' +
    '.folder-item:hover{background:rgba(0,0,128,0.15)}' +
    '.folder-item img{width:32px;height:32px;image-rendering:pixelated}' +
    '.folder-item span{font-size:11px;text-align:center;word-break:break-word}';
  document.head.appendChild(style);

  // ── Session restore ──
  function restoreSession() {
    var urls = store('session', []);
    urls.forEach(function(url) { if (url) open({ url: url }); });
  }

  // ── Handle popup URLs from main process (OAuth, sign-in windows) ──
  if (window.electronAPI && window.electronAPI.onOpenUrl) {
    window.electronAPI.onOpenUrl(function(url) {
      open({ url: url });
    });
  }

  AppRegistry.register('internet-explorer', {
    title: 'Internet Explorer',
    icon: 'icons/internet_connection_wiz-5.png',
    description: 'Browse the web',
    open: open,
    startMenu: true,
    desktop: true,
    restoreSession: restoreSession,
  });
})();
