var Toast = (function() {
  function show(msg, type, linkUrl) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var icon = type === 'error' ? '&#10060;' : '&#9989;';
    var link = linkUrl ? '<br><a onclick="AppRegistry.open(\'internet-explorer\',{url:\'' + linkUrl + '\'})">Open post &rarr;</a>' : '';
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML =
      '<div class="toast-hdr"><img src="icons/help_book_cool-1.png"> Blog Admin</div>' +
      '<div class="toast-body"><span style="font-size:24px">' + icon + '</span><div>' + msg + link + '</div></div>';
    document.body.appendChild(el);
    setTimeout(function() { el.style.opacity = '0'; setTimeout(function() { el.remove(); }, 400); }, 4000);
  }
  return { show: show };
})();
