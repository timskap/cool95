var Desktop = (function() {
  var icons = [];
  var selectRect = null;
  var selectStart = null;
  var customIcons = [];

  function addShortcut(opts) {
    customIcons.push(opts);
  }

  function init() {
    var desktop = document.getElementById('desktop');
    var allApps = AppRegistry.getAll();
    var row = 0, col = 0;
    var maxRows = Math.floor((desktop.clientHeight - 24) / 76) || 6;

    function placeIcon(id, label, icon, appId, appOpts) {
      var el = document.createElement('div');
      el.className = 'desktop-icon';
      el.dataset.appId = appId;
      if (appOpts) el.dataset.appOpts = JSON.stringify(appOpts);
      el.style.position = 'absolute';
      el.style.left = (12 + col * 80) + 'px';
      el.style.top = (12 + row * 76) + 'px';
      el.innerHTML = '<img src="' + icon + '" alt=""><div class="di-label">' + label + '</div>';
      desktop.appendChild(el);
      icons.push({ el: el, appId: appId, appOpts: appOpts });
      row++;
      if (row >= maxRows) { row = 0; col++; }
    }

    // Register apps with desktop: true
    Object.keys(allApps).forEach(function(id) {
      var app = allApps[id];
      if (app.desktop) placeIcon(id, app.title, app.icon, id, null);
    });

    // Custom shortcuts
    customIcons.forEach(function(s) {
      placeIcon(s.id, s.label, s.icon, s.appId, s.appOpts);
    });

    // Double-click opens app
    desktop.addEventListener('dblclick', function(e) {
      var iconEl = e.target.closest('.desktop-icon');
      if (!iconEl) return;
      var appId = iconEl.dataset.appId;
      var opts = iconEl.dataset.appOpts ? JSON.parse(iconEl.dataset.appOpts) : {};
      AppRegistry.open(appId, opts);
    });

    // Single click selects
    desktop.addEventListener('mousedown', function(e) {
      if (e.target.closest('.w98-win') || e.target.closest('.taskbar') || e.target.closest('.start-menu')) return;

      var iconEl = e.target.closest('.desktop-icon');
      if (iconEl) {
        if (!e.ctrlKey && !e.metaKey) deselectAll();
        iconEl.classList.toggle('selected');
        e.preventDefault();
        return;
      }

      // Drag select on empty desktop
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

      icons.forEach(function(icon) {
        var r = icon.el.getBoundingClientRect();
        var hit = !(r.right < x1 || r.left > x2 || r.bottom < y1 || r.top > y2);
        icon.el.classList.toggle('selected', hit);
      });
    });

    document.addEventListener('mouseup', function() {
      if (selectRect) { selectRect.remove(); selectRect = null; }
      selectStart = null;
    });
  }

  function deselectAll() {
    icons.forEach(function(i) { i.el.classList.remove('selected'); });
  }

  return { init: init, addShortcut: addShortcut, deselectAll: deselectAll };
})();
