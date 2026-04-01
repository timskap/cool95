var Taskbar = (function() {
  var startOpen = false;

  function init() {
    // Build start menu items from registry
    var menu = document.getElementById('start-menu-apps');
    var apps = AppRegistry.getAll();
    Object.keys(apps).forEach(function(id) {
      var app = apps[id];
      if (!app.startMenu) return;
      var el = document.createElement('div');
      el.className = 'sm-item';
      el.onclick = function() { closeStart(); AppRegistry.open(id); };
      el.innerHTML = '<img src="' + app.icon + '" alt=""><div><strong>' + app.title + '</strong>' +
        (app.description ? '<br><span style="font-size:10px;color:#808080">' + app.description + '</span>' : '') + '</div>';
      menu.appendChild(el);
    });

    // Clock
    function tick() {
      var now = new Date(), h = now.getHours(), m = now.getMinutes();
      var ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; m = m < 10 ? '0' + m : m;
      document.getElementById('tb-clock').textContent = h + ':' + m + ' ' + ampm;
    }
    tick(); setInterval(tick, 1000);

    // Start button
    document.getElementById('start-btn').addEventListener('click', toggleStart);

    // Close start on outside click
    document.addEventListener('mousedown', function(e) {
      if (startOpen && !document.getElementById('start-menu').contains(e.target) && !document.getElementById('start-btn').contains(e.target)) closeStart();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && startOpen) closeStart();
    });

    update();
  }

  function toggleStart() {
    startOpen = !startOpen;
    document.getElementById('start-menu').classList.toggle('open', startOpen);
    document.getElementById('start-btn').classList.toggle('active', startOpen);
  }

  function closeStart() {
    startOpen = false;
    document.getElementById('start-menu').classList.remove('open');
    document.getElementById('start-btn').classList.remove('active');
  }

  // Custom taskbar entries for apps that don't use WM (like Winamp)
  var customEntries = {};

  function addCustomEntry(id, opts) {
    customEntries[id] = { title: opts.title, icon: opts.icon, active: !opts.hidden, onClick: opts.onClick };
    update();
  }

  function updateCustomEntry(id, opts) {
    if (!customEntries[id]) return;
    if (opts.title !== undefined) customEntries[id].title = opts.title;
    if (opts.active !== undefined) customEntries[id].active = opts.active;
    update();
  }

  function removeCustomEntry(id) {
    delete customEntries[id];
    update();
  }

  function update() {
    var wins = WM.getWindows();
    var topZ = WM.getTopZ();
    var c = document.getElementById('taskbar-items');
    var html = Object.keys(wins).map(function(id) {
      var w = wins[id];
      var active = w.el.style.zIndex == topZ && !w.minimized ? ' active' : '';
      return '<div class="tb-item' + active + '" onclick="WM.toggleMin(\'' + id + '\')">' +
        '<img src="' + (w.icon || 'icons/computer-3.png') + '" alt=""> ' + w.title + '</div>';
    }).join('');

    // Add custom entries
    Object.keys(customEntries).forEach(function(id) {
      var e = customEntries[id];
      var active = e.active ? ' active' : '';
      html += '<div class="tb-item' + active + '" onclick="Taskbar._customClick(\'' + id + '\')">' +
        '<img src="' + (e.icon || 'icons/computer-3.png') + '" alt=""> ' + e.title + '</div>';
    });

    c.innerHTML = html;
  }

  function _customClick(id) {
    if (customEntries[id] && customEntries[id].onClick) customEntries[id].onClick();
  }

  return { init: init, update: update, closeStart: closeStart, addCustomEntry: addCustomEntry, updateCustomEntry: updateCustomEntry, removeCustomEntry: removeCustomEntry, _customClick: _customClick };
})();

// Global start menu actions
function startAction(action) {
  Taskbar.closeStart();
  if (action === 'reset' && window.electronAPI) {
    if (confirm('This will delete ALL data: favorites, history, desktop layout, cookies, cache, and saved logins.\n\nThe app will restart fresh.\n\nContinue?')) {
      window.electronAPI.resetAllData();
    }
  } else if (action === 'shutdown' && window.electronAPI) {
    window.electronAPI.shutdown();
  }
}
