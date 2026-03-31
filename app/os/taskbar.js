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
    if (startOpen) updateFullscreenCheck();
  }

  function closeStart() {
    startOpen = false;
    document.getElementById('start-menu').classList.remove('open');
    document.getElementById('start-btn').classList.remove('active');
  }

  function updateFullscreenCheck() {
    var el = document.getElementById('fullscreen-check');
    if (el && window.electronAPI) {
      el.classList.toggle('checked', window.electronAPI.isFullscreen());
    }
  }

  function update() {
    var wins = WM.getWindows();
    var topZ = WM.getTopZ();
    var c = document.getElementById('taskbar-items');
    c.innerHTML = Object.keys(wins).map(function(id) {
      var w = wins[id];
      var active = w.el.style.zIndex == topZ && !w.minimized ? ' active' : '';
      return '<div class="tb-item' + active + '" onclick="WM.toggleMin(\'' + id + '\')">' +
        '<img src="' + (w.icon || 'icons/computer-3.png') + '" alt=""> ' + w.title + '</div>';
    }).join('');
  }

  return { init: init, update: update, closeStart: closeStart };
})();

// Global start menu actions
function startAction(action) {
  Taskbar.closeStart();
  if (action === 'fullscreen' && window.electronAPI) {
    window.electronAPI.toggleFullscreen();
    setTimeout(function() {
      var el = document.getElementById('fullscreen-check');
      if (el) el.classList.toggle('checked', window.electronAPI.isFullscreen());
    }, 200);
  } else if (action === 'shutdown' && window.electronAPI) {
    window.electronAPI.shutdown();
  }
}
