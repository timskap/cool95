(function() {
  var webampInstance = null;
  var container = null;
  var hidden = false;

  function open() {
    if (webampInstance && hidden) {
      hidden = false;
      webampInstance.reopen();
      Taskbar.updateCustomEntry('winamp', { active: true });
      return;
    }
    if (webampInstance) return;

    // Load Webamp script if not already loaded
    if (!window.Webamp) {
      var script = document.createElement('script');
      script.src = 'https://unpkg.com/webamp@1.5.0/built/webamp.bundle.min.js';
      script.onload = function() { initWebamp(); };
      document.head.appendChild(script);
    } else {
      initWebamp();
    }
  }

  function initWebamp() {
    container = document.createElement('div');
    container.id = 'winamp-container';
    container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:500;pointer-events:none';
    document.getElementById('desktop').appendChild(container);

    webampInstance = new Webamp({
      zIndex: 501,
      initialTracks: [
        {
          metaData: { artist: "DJ Mike Llama", title: "Llama Whippin' Intro" },
          url: "https://cdn.jsdelivr.net/gh/nicollasm/webamp-music@master/music/llama-2.91.mp3",
          duration: 5.322286,
        }
      ],
    });

    webampInstance.renderWhenReady(container).then(function() {
      var webampEl = document.getElementById('webamp');
      if (webampEl) {
        webampEl.style.pointerEvents = 'auto';
      }
    });

    // Add to taskbar
    Taskbar.addCustomEntry('winamp', {
      title: 'Winamp',
      icon: 'icons/winamp.png',
      onClick: function() {
        if (hidden) {
          hidden = false;
          if (webampInstance) webampInstance.reopen();
          Taskbar.updateCustomEntry('winamp', { active: true });
        } else {
          hidden = true;
          Taskbar.updateCustomEntry('winamp', { active: false });
        }
      },
    });

    webampInstance.onClose(function() {
      webampInstance.dispose();
      webampInstance = null;
      if (container) { container.remove(); container = null; }
      hidden = false;
      Taskbar.removeCustomEntry('winamp');
    });

    webampInstance.onMinimize(function() {
      hidden = true;
      Taskbar.updateCustomEntry('winamp', { active: false });
    });
  }

  AppRegistry.register('winamp', {
    title: 'Winamp',
    icon: 'icons/winamp.png',
    description: 'It really whips the llama\'s ass',
    open: open,
    startMenu: true,
    desktop: true,
  });
})();
