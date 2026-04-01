var Toast = (function() {
  function show(msg, type) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var icon = type === 'error' ? 'icons/msg_error-1.png' : 'icons/msg_information-0.png';
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML =
      '<div class="toast-hdr"><img src="icons/computer-3.png"> Cool 95</div>' +
      '<div class="toast-body"><img src="' + icon + '">' + msg + '</div>';
    document.body.appendChild(el);
    setTimeout(function() { el.style.opacity = '0'; setTimeout(function() { el.remove(); }, 400); }, 3000);
  }
  return { show: show };
})();
