var Desktop = (function() {
  var items = [];
  var GRID_W = 80, GRID_H = 76, PAD_X = 12, PAD_Y = 12;
  var maxRows = 6;
  var nextId = 1;
  var selectRect = null, selectStart = null;
  var dragItem = null, dragGhost = null, dragStartCol, dragStartRow;
  var contextTarget = null;

  // ── Persistence ──
  function save() {
    if (!window.electronAPI) return;
    window.electronAPI.storageWrite('desktop', items.map(function(i) {
      var o = { id: i.id, type: i.type, label: i.label, icon: i.icon, col: i.col, row: i.row };
      if (i.appId) o.appId = i.appId;
      if (i.url) o.url = i.url;
      if (i.items) o.items = i.items;
      if (i.system) o.system = true;
      return o;
    }));
  }

  function load() {
    if (!window.electronAPI) return null;
    return window.electronAPI.storageRead('desktop', null);
  }

  // ── Grid helpers ──
  function gridPos(col, row) {
    return { x: PAD_X + col * GRID_W, y: PAD_Y + row * GRID_H };
  }

  function posToGrid(x, y) {
    return { col: Math.max(0, Math.round((x - PAD_X) / GRID_W)), row: Math.max(0, Math.round((y - PAD_Y) / GRID_H)) };
  }

  function isOccupied(col, row, excludeId) {
    return items.some(function(i) { return i.col === col && i.row === row && i.id !== excludeId; });
  }

  function findFreeSlot() {
    var desktop = document.getElementById('desktop');
    var maxCols = Math.floor((desktop.clientWidth - PAD_X * 2) / GRID_W) || 10;
    for (var c = 0; c < maxCols; c++) {
      for (var r = 0; r < maxRows; r++) {
        if (!isOccupied(c, r)) return { col: c, row: r };
      }
    }
    return { col: 0, row: 0 };
  }

  // ── DOM ──
  function createIconEl(item) {
    var el = document.createElement('div');
    el.className = 'desktop-icon';
    el.dataset.itemId = item.id;
    var pos = gridPos(item.col, item.row);
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    var img = document.createElement('img');
    img.src = item.icon || 'icons/computer-3.png';
    img.alt = '';
    img.onerror = function() { this.src = 'icons/computer-3.png'; };
    var label = document.createElement('div');
    label.className = 'di-label';
    label.textContent = item.label;
    el.appendChild(img);
    el.appendChild(label);
    return el;
  }

  function addItem(data, doSave) {
    if (!data.id) data.id = 'item-' + (nextId++);
    if (data.col === undefined || data.row === undefined) {
      var slot = findFreeSlot();
      data.col = slot.col;
      data.row = slot.row;
    }
    var el = createIconEl(data);
    document.getElementById('desktop').appendChild(el);
    var item = {
      id: data.id, type: data.type, label: data.label, icon: data.icon,
      col: data.col, row: data.row, el: el,
      appId: data.appId || null, url: data.url || null, items: data.items || null, system: data.system || false,
    };
    items.push(item);
    if (data.id.indexOf('item-') === 0) {
      var num = parseInt(data.id.replace('item-', ''), 10);
      if (num >= nextId) nextId = num + 1;
    }
    if (doSave !== false) save();
    return item;
  }

  function removeItem(id) {
    var idx = items.findIndex(function(i) { return i.id === id; });
    if (idx === -1) return;
    items[idx].el.remove();
    items.splice(idx, 1);
    save();
  }

  function getItem(id) {
    return items.find(function(i) { return i.id === id; });
  }

  function updateItemEl(item) {
    var pos = gridPos(item.col, item.row);
    item.el.style.left = pos.x + 'px';
    item.el.style.top = pos.y + 'px';
    item.el.querySelector('.di-label').textContent = item.label;
  }

  // ── Context Menu ──
  function showContextMenu(x, y, menuItems) {
    hideContextMenu();
    var menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    menuItems.forEach(function(mi) {
      if (mi === '---') {
        var sep = document.createElement('div');
        sep.className = 'ctx-sep';
        menu.appendChild(sep);
        return;
      }
      var item = document.createElement('div');
      item.className = 'ctx-item';
      if (mi.disabled) item.classList.add('disabled');
      if (mi.sub) {
        item.innerHTML = mi.label + '<span style="float:right;margin-left:12px">&#9654;</span>';
        var sub = document.createElement('div');
        sub.className = 'ctx-menu ctx-sub';
        mi.sub.forEach(function(si) {
          var subItem = document.createElement('div');
          subItem.className = 'ctx-item';
          subItem.textContent = si.label;
          subItem.addEventListener('mousedown', function(e) { e.stopPropagation(); hideContextMenu(); if (si.action) si.action(); });
          sub.appendChild(subItem);
        });
        item.appendChild(sub);
      } else {
        item.textContent = mi.label;
        item.addEventListener('mousedown', function(e) { e.stopPropagation(); hideContextMenu(); if (mi.action) mi.action(); });
      }
      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // Keep in viewport
    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight - 32) menu.style.top = (y - rect.height) + 'px';

    contextTarget = menu;
  }

  function hideContextMenu() {
    if (contextTarget) { contextTarget.remove(); contextTarget = null; }
    document.querySelectorAll('.ctx-menu').forEach(function(m) { m.remove(); });
  }

  // ── Dialogs ──
  function showDialog(title, fields, onOk) {
    var overlay = document.createElement('div');
    overlay.className = 'dlg-overlay';
    var dlg = document.createElement('div');
    dlg.className = 'dlg-win';
    var html = '<div class="dlg-titlebar"><span>' + title + '</span></div><div class="dlg-body">';
    fields.forEach(function(f) {
      html += '<div class="dlg-field"><label>' + f.label + '</label>';
      html += '<input class="dlg-input" id="dlg-' + f.name + '" type="text" value="' + (f.value || '') + '" placeholder="' + (f.placeholder || '') + '"></div>';
    });
    html += '</div><div class="dlg-buttons"><button class="dlg-btn" id="dlg-ok">OK</button><button class="dlg-btn" id="dlg-cancel">Cancel</button></div>';
    dlg.innerHTML = html;
    overlay.appendChild(dlg);
    document.body.appendChild(overlay);

    var firstInput = dlg.querySelector('.dlg-input');
    if (firstInput) firstInput.focus();

    function close() { overlay.remove(); }

    dlg.querySelector('#dlg-ok').onclick = function() {
      var values = {};
      fields.forEach(function(f) { values[f.name] = document.getElementById('dlg-' + f.name).value; });
      close();
      onOk(values);
    };
    dlg.querySelector('#dlg-cancel').onclick = close;

    // Enter to submit
    dlg.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') dlg.querySelector('#dlg-ok').click();
      if (e.key === 'Escape') close();
    });
  }

  // ── Inline rename ──
  function startRename(item) {
    var labelEl = item.el.querySelector('.di-label');
    var input = document.createElement('input');
    input.className = 'di-rename';
    input.value = item.label;
    input.style.width = '68px';
    labelEl.textContent = '';
    labelEl.appendChild(input);
    input.focus();
    input.select();

    function finish() {
      var val = input.value.trim();
      if (val) item.label = val;
      labelEl.textContent = item.label;
      save();
    }
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = item.label; input.blur(); }
    });
  }

  // ── Folder window ──
  function openFolder(item) {
    var winId = 'folder-' + item.id;
    if (WM.exists(winId)) { WM.show(winId); return; }

    var body = WM.create(winId, {
      title: item.label,
      icon: 'icons/directory_folder_options-5.png',
      x: 100, y: 60, width: 500, height: 350,
    });

    function render() {
      var folderItems = item.items || [];
      var html = '<div class="folder-toolbar">' +
        '<div class="w-tb" onclick="Desktop.addShortcutToFolder(\'' + item.id + '\')">New Shortcut</div>' +
        '</div><div class="folder-content">';
      folderItems.forEach(function(fi, idx) {
        html += '<div class="folder-item" data-idx="' + idx + '" ondblclick="Desktop.openFolderItem(\'' + item.id + '\',' + idx + ')">' +
          '<img src="' + (fi.icon || 'icons/internet_connection_wiz-5.png') + '">' +
          '<span>' + fi.label + '</span></div>';
      });
      if (folderItems.length === 0) html += '<div style="padding:20px;color:#808080">Empty folder</div>';
      html += '</div>';
      body.innerHTML = html;

      // Right-click on folder items
      body.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        var fi = e.target.closest('.folder-item');
        if (fi) {
          var idx = parseInt(fi.dataset.idx, 10);
          showContextMenu(e.clientX, e.clientY, [
            { label: 'Open', action: function() { Desktop.openFolderItem(item.id, idx); } },
            '---',
            { label: 'Delete', action: function() {
              item.items.splice(idx, 1);
              save();
              render();
            }},
          ]);
        } else {
          showContextMenu(e.clientX, e.clientY, [
            { label: 'New Shortcut...', action: function() { Desktop.addShortcutToFolder(item.id); } },
          ]);
        }
      });
    }
    render();
    item._renderFolder = render;
  }

  // ── Public API for folder items ──
  function openFolderItem(folderId, idx) {
    var folder = getItem(folderId);
    if (!folder || !folder.items || !folder.items[idx]) return;
    var fi = folder.items[idx];
    AppRegistry.open('internet-explorer', { url: fi.url });
  }

  function addShortcutToFolder(folderId) {
    var folder = getItem(folderId);
    if (!folder) return;
    showDialog('New Shortcut', [
      { name: 'label', label: 'Name:', placeholder: 'Google' },
      { name: 'url', label: 'URL:', placeholder: 'https://google.com' },
    ], function(v) {
      if (!v.label || !v.url) return;
      if (!folder.items) folder.items = [];
      folder.items.push({ label: v.label, url: v.url, icon: 'icons/internet_connection_wiz-5.png' });
      save();
      if (folder._renderFolder) folder._renderFolder();
    });
  }

  // ── Wallpaper ──
  var WALLPAPERS = [
    'Baseball 4K.jpg', 'Chess 4K.jpg', 'Dangerous Creatures 4K.jpg',
    'Inside 4K.jpg', 'Jungle 4K.jpg',
    'Mystery 4K.jpg', 'Nature 4K.jpg',
    'Party 4K (Circles).jpg', 'Party 4K.jpg', 'Ribbons 4K.jpg',
    'Science 4K.jpg', 'Space 4K.jpg', 'Sports 4K.jpg',
    'The Golden Era 4K.jpg', 'Travel 4K.jpg', 'Underwater 4K.jpg',
    'Windows 95 Install 4K.jpg', 'da Vinci 4K.jpg',
  ];

  // ── Screen Scale ──
  var SCALE_OPTIONS = [
    { label: 'Small (75%)', value: 0.75 },
    { label: 'Normal (100%)', value: 1 },
    { label: 'Large (125%)', value: 1.25 },
    { label: 'Extra Large (150%)', value: 1.5 },
    { label: 'Huge (200%)', value: 2 },
  ];

  function loadScale() {
    if (!window.electronAPI) return;
    var scale = window.electronAPI.storageRead('ui-scale', 1);
    applyScale(scale);
  }

  function saveScale(scale) {
    if (window.electronAPI) window.electronAPI.storageWrite('ui-scale', scale);
    applyScale(scale);
  }

  function applyScale(scale) {
    document.documentElement.style.fontSize = (12 * scale) + 'px';
    document.body.style.fontSize = (12 * scale) + 'px';
    // Scale all UI via CSS custom property
    document.documentElement.style.setProperty('--ui-scale', scale);
  }

  function loadWallpaper() {
    if (!window.electronAPI) return;
    var wp = window.electronAPI.storageRead('wallpaper', 'Underwater 4K.jpg');
    applyWallpaper(wp);
  }

  function saveWallpaper(wp) {
    if (window.electronAPI) window.electronAPI.storageWrite('wallpaper', wp);
    applyWallpaper(wp);
  }

  function applyWallpaper(wp) {
    if (wp) {
      document.body.style.background = 'url(wallpapers/' + encodeURIComponent(wp) + ') center/cover no-repeat fixed';
    } else {
      document.body.style.background = '#008080';
    }
  }

  function showWallpaperPicker() {
    var overlay = document.createElement('div');
    overlay.className = 'dlg-overlay';
    var dlg = document.createElement('div');
    dlg.className = 'dlg-win';
    dlg.style.width = '520px';

    var currentWp = window.electronAPI ? window.electronAPI.storageRead('wallpaper', 'Underwater 4K.jpg') : 'Underwater 4K.jpg';
    var currentScale = window.electronAPI ? window.electronAPI.storageRead('ui-scale', 1) : 1;
    var selectedWp = currentWp;
    var selectedScale = currentScale;

    // ── Tabs ──
    var html = '<div class="dlg-titlebar"><span>Display Properties</span></div>' +
      '<div class="dp-tabs">' +
        '<div class="dp-tab dp-tab-active" data-tab="wallpaper">Wallpaper</div>' +
        '<div class="dp-tab" data-tab="screen">Screen Size</div>' +
      '</div>' +
      // Wallpaper tab
      '<div class="dp-panel" id="dp-wallpaper">' +
        '<div style="margin-bottom:6px;font-size:11px;font-weight:bold">Wallpaper:</div>' +
        '<div class="wp-preview" id="wp-preview"></div>' +
        '<div class="wp-list" id="wp-list">' +
          '<div class="wp-item' + (!currentWp ? ' wp-selected' : '') + '" data-wp="">(None - Teal)</div>';
    WALLPAPERS.forEach(function(name) {
      var label = name.replace(' 4K', '').replace('.jpg', '');
      html += '<div class="wp-item' + (currentWp === name ? ' wp-selected' : '') + '" data-wp="' + name + '">' + label + '</div>';
    });
    html += '</div></div>' +
      // Screen Size tab
      '<div class="dp-panel" id="dp-screen" style="display:none">' +
        '<div style="margin-bottom:6px;font-size:11px;font-weight:bold">Screen element size:</div>' +
        '<div style="margin-bottom:8px;font-size:11px;color:#808080">Changes the size of text, icons, title bars, and all UI elements.</div>' +
        '<div class="wp-list" id="scale-list" style="height:180px">';
    SCALE_OPTIONS.forEach(function(opt) {
      html += '<div class="wp-item' + (currentScale === opt.value ? ' wp-selected' : '') + '" data-scale="' + opt.value + '">' + opt.label + '</div>';
    });
    html += '</div>' +
        '<div style="margin-top:10px">' +
          '<div style="font-size:11px;margin-bottom:4px">Preview:</div>' +
          '<div class="dp-scale-preview" id="scale-preview">' +
            '<div class="dp-sp-titlebar">Window Title</div>' +
            '<div class="dp-sp-body">Sample text</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="dlg-buttons">' +
        '<button class="dlg-btn" id="wp-ok">OK</button>' +
        '<button class="dlg-btn" id="wp-cancel">Cancel</button>' +
        '<button class="dlg-btn" id="wp-apply">Apply</button>' +
      '</div>';

    dlg.innerHTML = html;
    overlay.appendChild(dlg);
    document.body.appendChild(overlay);

    // ── Tab switching ──
    dlg.querySelectorAll('.dp-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        dlg.querySelectorAll('.dp-tab').forEach(function(t) { t.classList.remove('dp-tab-active'); });
        tab.classList.add('dp-tab-active');
        dlg.querySelectorAll('.dp-panel').forEach(function(p) { p.style.display = 'none'; });
        document.getElementById('dp-' + tab.dataset.tab).style.display = '';
      });
    });

    // ── Wallpaper tab ──
    function updatePreview() {
      var prev = document.getElementById('wp-preview');
      if (selectedWp) {
        prev.style.background = 'url(wallpapers/' + encodeURIComponent(selectedWp) + ') center/cover no-repeat';
      } else {
        prev.style.background = '#008080';
      }
    }
    updatePreview();

    document.getElementById('wp-list').addEventListener('click', function(e) {
      var item = e.target.closest('.wp-item');
      if (!item) return;
      this.querySelectorAll('.wp-item').forEach(function(el) { el.classList.remove('wp-selected'); });
      item.classList.add('wp-selected');
      selectedWp = item.dataset.wp || null;
      updatePreview();
    });

    // ── Screen Size tab ──
    function updateScalePreview() {
      var prev = document.getElementById('scale-preview');
      if (prev) prev.style.transform = 'scale(' + selectedScale + ')';
    }
    updateScalePreview();

    document.getElementById('scale-list').addEventListener('click', function(e) {
      var item = e.target.closest('.wp-item');
      if (!item) return;
      this.querySelectorAll('.wp-item').forEach(function(el) { el.classList.remove('wp-selected'); });
      item.classList.add('wp-selected');
      selectedScale = parseFloat(item.dataset.scale);
      updateScalePreview();
    });

    // ── Buttons ──
    function close() { overlay.remove(); }

    function apply() {
      saveWallpaper(selectedWp);
      saveScale(selectedScale);
    }

    document.getElementById('wp-ok').onclick = function() { apply(); close(); };
    document.getElementById('wp-cancel').onclick = close;
    document.getElementById('wp-apply').onclick = apply;

    dlg.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') { apply(); close(); }
    });
  }

  // ── Init ──
  function init() {
    var desktop = document.getElementById('desktop');
    maxRows = Math.floor((desktop.clientHeight - PAD_Y * 2) / GRID_H) || 6;
    loadWallpaper();
    loadScale();

    var saved = load();
    var allApps = AppRegistry.getAll();

    if (saved && saved.length > 0) {
      saved.forEach(function(s) { addItem(s, false); });
      // Add any new registered apps that aren't in saved state yet
      var savedIds = {};
      saved.forEach(function(s) { savedIds[s.id] = true; });
      Object.keys(allApps).forEach(function(id) {
        var app = allApps[id];
        if (app.desktop && !savedIds[id]) {
          addItem({ id: id, type: 'app', label: app.title, icon: app.icon, appId: id }, true);
        }
      });
    } else {
      var row = 0, col = 0;
      Object.keys(allApps).forEach(function(id) {
        var app = allApps[id];
        if (app.desktop) {
          addItem({ id: id, type: 'app', label: app.title, icon: app.icon, appId: id, col: col, row: row }, false);
          row++;
          if (row >= maxRows) { row = 0; col++; }
        }
      });
      save();
    }

    // Ensure system shortcuts always exist
    var systemShortcuts = [
      { id: 'sys-timur-cool', type: 'shortcut', label: 'timur.cool', icon: 'icons/internet_connection_wiz-5.png', url: 'https://timur.cool', system: true },
    ];
    systemShortcuts.forEach(function(sc) {
      if (!getItem(sc.id)) addItem(sc, true);
    });

    setupEvents(desktop);
  }

  function setupEvents(desktop) {
    // Double-click: open item
    desktop.addEventListener('dblclick', function(e) {
      var iconEl = e.target.closest('.desktop-icon');
      if (!iconEl) return;
      var item = getItem(iconEl.dataset.itemId);
      if (!item) return;
      if (item.type === 'app') {
        AppRegistry.open(item.appId, {});
      } else if (item.type === 'shortcut') {
        AppRegistry.open('internet-explorer', { url: item.url });
      } else if (item.type === 'folder') {
        openFolder(item);
      }
    });

    // Mouse down: select or start drag
    desktop.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      if (e.target.closest('.w98-win') || e.target.closest('.taskbar') || e.target.closest('.start-menu')) return;
      hideContextMenu();

      var iconEl = e.target.closest('.desktop-icon');
      if (iconEl) {
        var item = getItem(iconEl.dataset.itemId);
        if (!item) return;

        if (!e.ctrlKey && !e.metaKey) deselectAll();
        iconEl.classList.add('selected');
        e.preventDefault();

        // Start drag after small movement
        var startX = e.clientX, startY = e.clientY;
        var moved = false;

        function onMove(ev) {
          var dx = ev.clientX - startX, dy = ev.clientY - startY;
          if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;

          if (!moved) {
            moved = true;
            dragItem = item;
            dragStartCol = item.col;
            dragStartRow = item.row;
            iconEl.classList.add('dragging');
          }

          var pos = gridPos(item.col, item.row);
          iconEl.style.left = (pos.x + dx) + 'px';
          iconEl.style.top = (pos.y + dy) + 'px';
        }

        function onUp(ev) {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);

          if (moved && dragItem) {
            iconEl.classList.remove('dragging');
            var deskRect = desktop.getBoundingClientRect();
            var newGrid = posToGrid(ev.clientX - deskRect.left, ev.clientY - deskRect.top);

            if (!isOccupied(newGrid.col, newGrid.row, item.id)) {
              item.col = newGrid.col;
              item.row = newGrid.row;
            }
            updateItemEl(item);
            save();
            dragItem = null;
          }
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return;
      }

      // Drag-select on empty desktop
      deselectAll();
      var deskRect = desktop.getBoundingClientRect();
      selectStart = { x: e.clientX, y: e.clientY, deskLeft: deskRect.left, deskTop: deskRect.top };
      selectRect = document.createElement('div');
      selectRect.className = 'select-rect';
      desktop.appendChild(selectRect);
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!selectStart || !selectRect) return;
      var x1 = Math.min(selectStart.x, e.clientX);
      var y1 = Math.min(selectStart.y, e.clientY);
      var x2 = Math.max(selectStart.x, e.clientX);
      var y2 = Math.max(selectStart.y, e.clientY);

      selectRect.style.left = (x1 - selectStart.deskLeft) + 'px';
      selectRect.style.top = (y1 - selectStart.deskTop) + 'px';
      selectRect.style.width = (x2 - x1) + 'px';
      selectRect.style.height = (y2 - y1) + 'px';

      items.forEach(function(icon) {
        var r = icon.el.getBoundingClientRect();
        var hit = !(r.right < x1 || r.left > x2 || r.bottom < y1 || r.top > y2);
        icon.el.classList.toggle('selected', hit);
      });
    });

    document.addEventListener('mouseup', function() {
      if (selectRect) { selectRect.remove(); selectRect = null; }
      selectStart = null;
    });

    // Right-click context menu
    desktop.addEventListener('contextmenu', function(e) {
      if (e.target.closest('.w98-win')) return;
      e.preventDefault();
      hideContextMenu();

      var iconEl = e.target.closest('.desktop-icon');
      if (iconEl) {
        var item = getItem(iconEl.dataset.itemId);
        if (!item) return;
        deselectAll();
        iconEl.classList.add('selected');

        var menuItems = [
          { label: 'Open', action: function() { iconEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); } },
          '---',
          { label: 'Rename', action: function() { startRename(item); } },
        ];
        if (item.type !== 'app' && !item.system) {
          menuItems.push({ label: 'Delete', action: function() { removeItem(item.id); } });
        }
        showContextMenu(e.clientX, e.clientY, menuItems);
      } else {
        // Desktop background context menu
        showContextMenu(e.clientX, e.clientY, [
          { label: 'New', sub: [
            { label: 'Folder', action: function() {
              showDialog('New Folder', [{ name: 'label', label: 'Name:', value: 'New Folder' }], function(v) {
                if (!v.label) return;
                var slot = findFreeSlot();
                addItem({ type: 'folder', label: v.label, icon: 'icons/directory_folder_options-5.png', col: slot.col, row: slot.row, items: [] });
              });
            }},
            { label: 'Shortcut', action: function() {
              showDialog('New Shortcut', [
                { name: 'label', label: 'Name:', placeholder: 'Google' },
                { name: 'url', label: 'URL:', placeholder: 'https://google.com' },
              ], function(v) {
                if (!v.label || !v.url) return;
                addItem({ type: 'shortcut', label: v.label, icon: 'icons/internet_connection_wiz-5.png', url: v.url });
              });
            }},
          ]},
          '---',
          { label: 'Refresh', action: function() { location.reload(); } },
          '---',
          { label: 'Properties...', action: function() { showWallpaperPicker(); } },
        ]);
      }
    });

    // Hide context menu on click elsewhere
    document.addEventListener('mousedown', function(e) {
      if (!e.target.closest('.ctx-menu')) hideContextMenu();
    });
  }

  function deselectAll() {
    items.forEach(function(i) { i.el.classList.remove('selected'); });
  }

  return {
    init: init,
    addItem: addItem,
    removeItem: removeItem,
    deselectAll: deselectAll,
    openFolderItem: openFolderItem,
    addShortcutToFolder: addShortcutToFolder,
  };
})();
