var WM = (function() {
  var windows = {};
  var zIndex = 100;
  var dragState = null;
  var resizeState = null;

  var EDGE = 6; // resize handle thickness in px
  var MIN_W = 300, MIN_H = 200;

  function create(id, opts) {
    var w = document.createElement('div');
    w.className = 'w98-win';
    w.id = 'win-' + id;
    w.style.cssText = 'left:' + (opts.x || 50) + 'px;top:' + (opts.y || 30) + 'px;width:' + (opts.width || 700) + 'px;height:' + (opts.height || 450) + 'px;z-index:' + (++zIndex) + ';';
    w.innerHTML =
      '<div class="w-titlebar active" data-winid="' + id + '">' +
        '<div class="w-title"><img src="' + (opts.icon || 'icons/computer-3.png') + '" alt=""> <span class="w-title-text">' + (opts.title || 'Window') + '</span></div>' +
        '<div class="w-btns">' +
          '<div class="w-btn" onclick="WM.minimize(\'' + id + '\')">_</div>' +
          '<div class="w-btn" onclick="WM.toggleMax(\'' + id + '\')">&#9633;</div>' +
          '<div class="w-btn" style="font-weight:bold" onclick="WM.close(\'' + id + '\')">&times;</div>' +
        '</div>' +
      '</div>' +
      '<div class="w-body" id="wbody-' + id + '"></div>';
    document.getElementById('desktop').appendChild(w);
    windows[id] = { el: w, title: opts.title, icon: opts.icon, minimized: false, onClose: opts.onClose || null };
    focus(id);
    if (typeof Taskbar !== 'undefined') Taskbar.update();
    return document.getElementById('wbody-' + id);
  }

  function exists(id) { return !!windows[id]; }

  function focus(id) {
    if (!windows[id]) return;
    windows[id].el.style.zIndex = ++zIndex;
    Object.keys(windows).forEach(function(k) {
      var tb = windows[k].el.querySelector('.w-titlebar');
      tb.className = 'w-titlebar ' + (k === id ? 'active' : 'inactive');
    });
    if (typeof Taskbar !== 'undefined') Taskbar.update();
  }

  function minimize(id) {
    if (!windows[id]) return;
    windows[id].el.classList.add('minimized');
    windows[id].minimized = true;
    if (typeof Taskbar !== 'undefined') Taskbar.update();
  }

  function show(id) {
    if (!windows[id]) return;
    windows[id].el.classList.remove('minimized');
    windows[id].minimized = false;
    focus(id);
  }

  function toggleMin(id) {
    if (!windows[id]) return;
    windows[id].minimized ? show(id) : minimize(id);
  }

  function toggleMax(id) {
    if (!windows[id]) return;
    windows[id].el.classList.toggle('maximized');
  }

  function close(id) {
    if (!windows[id]) return;
    if (windows[id].onClose) windows[id].onClose();
    windows[id].el.remove();
    delete windows[id];
    if (typeof Taskbar !== 'undefined') Taskbar.update();
  }

  function setTitle(id, title) {
    if (!windows[id]) return;
    windows[id].title = title;
    windows[id].el.querySelector('.w-title-text').textContent = title;
    if (typeof Taskbar !== 'undefined') Taskbar.update();
  }

  function getWindows() { return windows; }
  function getTopZ() { return zIndex; }

  // ── Detect which edge/corner the mouse is on ──
  function getResizeDir(el, e) {
    var rect = el.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var w = rect.width;
    var h = rect.height;

    var left = x < EDGE;
    var right = x > w - EDGE;
    var top = y < EDGE;
    var bottom = y > h - EDGE;

    if (top && left) return 'nw';
    if (top && right) return 'ne';
    if (bottom && left) return 'sw';
    if (bottom && right) return 'se';
    if (top) return 'n';
    if (bottom) return 's';
    if (left) return 'w';
    if (right) return 'e';
    return null;
  }

  var cursorMap = {
    'n': 'ns-resize', 's': 'ns-resize',
    'e': 'ew-resize', 'w': 'ew-resize',
    'nw': 'nwse-resize', 'se': 'nwse-resize',
    'ne': 'nesw-resize', 'sw': 'nesw-resize',
  };

  // Full-screen overlay to prevent webviews from stealing mouse during drag/resize
  var interactOverlay = null;
  function showOverlay(cursor) {
    if (interactOverlay) return;
    interactOverlay = document.createElement('div');
    interactOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;cursor:' + (cursor || 'default');
    document.body.appendChild(interactOverlay);
  }
  function hideOverlay() {
    if (interactOverlay) { interactOverlay.remove(); interactOverlay = null; }
  }

  // ── Drag & Resize ──
  document.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;

    var win = e.target.closest('.w98-win');
    if (!win) return;
    var id = win.id.replace('win-', '');
    if (!windows[id]) return;

    var tb = e.target.closest('.w-titlebar');

    // Check if on edge for resize
    if (!windows[id].el.classList.contains('maximized')) {
      var dir = getResizeDir(win, e);
      if (dir) {
        focus(id);
        resizeState = {
          id: id, dir: dir,
          startX: e.clientX, startY: e.clientY,
          origX: win.offsetLeft, origY: win.offsetTop,
          origW: win.offsetWidth, origH: win.offsetHeight,
        };
        showOverlay(cursorMap[dir]);
        e.preventDefault();
        return;
      }
    }

    // Titlebar drag
    if (tb && !e.target.closest('.w-btns')) {
      if (windows[id].el.classList.contains('maximized')) return;
      focus(id);
      dragState = { id: id, startX: e.clientX, startY: e.clientY, origX: win.offsetLeft, origY: win.offsetTop };
      showOverlay('move');
      e.preventDefault();
    } else {
      focus(id);
    }
  });

  document.addEventListener('mousemove', function(e) {
    // Drag
    if (dragState) {
      var w = windows[dragState.id].el;
      w.style.left = (dragState.origX + e.clientX - dragState.startX) + 'px';
      w.style.top = Math.max(0, dragState.origY + e.clientY - dragState.startY) + 'px';
      return;
    }

    // Resize
    if (resizeState) {
      var rs = resizeState;
      var w = windows[rs.id].el;
      var dx = e.clientX - rs.startX;
      var dy = e.clientY - rs.startY;

      var newX = rs.origX, newY = rs.origY, newW = rs.origW, newH = rs.origH;

      if (rs.dir.indexOf('e') !== -1) newW = Math.max(MIN_W, rs.origW + dx);
      if (rs.dir.indexOf('s') !== -1) newH = Math.max(MIN_H, rs.origH + dy);
      if (rs.dir.indexOf('w') !== -1) {
        newW = Math.max(MIN_W, rs.origW - dx);
        if (newW > MIN_W) newX = rs.origX + dx;
      }
      if (rs.dir.indexOf('n') !== -1) {
        newH = Math.max(MIN_H, rs.origH - dy);
        if (newH > MIN_H) newY = Math.max(0, rs.origY + dy);
      }

      w.style.left = newX + 'px';
      w.style.top = newY + 'px';
      w.style.width = newW + 'px';
      w.style.height = newH + 'px';
      return;
    }

    // Hover cursor for edges
    var win = e.target.closest('.w98-win');
    if (win) {
      var id = win.id.replace('win-', '');
      if (windows[id] && !windows[id].el.classList.contains('maximized')) {
        var dir = getResizeDir(win, e);
        win.style.cursor = dir ? cursorMap[dir] : '';
      }
    }
  });

  document.addEventListener('mouseup', function() {
    dragState = null;
    resizeState = null;
    hideOverlay();
  });

  return { create: create, exists: exists, focus: focus, minimize: minimize, show: show, toggleMin: toggleMin, toggleMax: toggleMax, close: close, setTitle: setTitle, getWindows: getWindows, getTopZ: getTopZ };
})();
