var AppRegistry = (function() {
  var apps = {};

  function register(id, def) {
    apps[id] = def;
  }

  function open(id, opts) {
    if (!apps[id]) return;
    apps[id].open(opts || {});
  }

  function getAll() { return apps; }

  return { register: register, open: open, getAll: getAll };
})();
