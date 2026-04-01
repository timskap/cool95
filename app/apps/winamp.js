(function() {
  var webampInstance = null;
  var container = null;
  var hidden = false;

  function open() {
    if (webampInstance && hidden) {
      hidden = false;
      webampInstance.reopen();
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
      // Make all Webamp windows interactive but let clicks pass through the container
      var webampEl = document.getElementById('webamp');
      if (webampEl) {
        webampEl.style.pointerEvents = 'auto';
      }
    });

    webampInstance.onClose(function() {
      hidden = true;
    });

    webampInstance.onMinimize(function() {
      hidden = true;
    });
  }

  AppRegistry.register('winamp', {
    title: 'Winamp',
    icon: 'icons/loudspeaker_rays-0.png',
    description: 'It really whips the llama\'s ass',
    open: open,
    startMenu: true,
    desktop: true,
  });
})();
