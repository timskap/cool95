var WM = (function() {
  var windows = {};
  var zIndex = 100;
  var dragState = null;
  var resizeState = null;

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
      '<div class="w-body" id="wbody-' + id + '"></div>' +
      '<div class="w-resize" data-winid="' + id + '"></div>';
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

  // Drag & resize
  document.addEventListener('mousedown', function(e) {
    var tb = e.target.closest('.w-titlebar');
    var rs = e.target.closest('.w-resize');
    if (tb && !e.target.closest('.w-btns')) {
      var id = tb.dataset.winid;
      if (!windows[id] || windows[id].el.classList.contains('maximized')) return;
      focus(id);
      dragState = { id: id, startX: e.clientX, startY: e.clientY, origX: windows[id].el.offsetLeft, origY: windows[id].el.offsetTop };
      e.preventDefault();
    } else if (rs) {
      var id = rs.dataset.winid;
      if (!windows[id] || windows[id].el.classList.contains('maximized')) return;
      focus(id);
      resizeState = { id: id, startX: e.clientX, startY: e.clientY, origW: windows[id].el.offsetWidth, origH: windows[id].el.offsetHeight };
      e.preventDefault();
    } else {
      var win = e.target.closest('.w98-win');
      if (win) focus(win.id.replace('win-', ''));
    }
  });
  document.addEventListener('mousemove', function(e) {
    if (dragState) {
      var w = windows[dragState.id].el;
      w.style.left = (dragState.origX + e.clientX - dragState.startX) + 'px';
      w.style.top = Math.max(0, dragState.origY + e.clientY - dragState.startY) + 'px';
    }
    if (resizeState) {
      var w = windows[resizeState.id].el;
      w.style.width = Math.max(300, resizeState.origW + e.clientX - resizeState.startX) + 'px';
      w.style.height = Math.max(200, resizeState.origH + e.clientY - resizeState.startY) + 'px';
    }
  });
  document.addEventListener('mouseup', function() { dragState = null; resizeState = null; });

  return { create: create, exists: exists, focus: focus, minimize: minimize, show: show, toggleMin: toggleMin, toggleMax: toggleMax, close: close, setTitle: setTitle, getWindows: getWindows, getTopZ: getTopZ };
})();
