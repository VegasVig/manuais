/* Alternância de tema claro/escuro (persistida no navegador) */
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('themeToggle');
  var label = document.getElementById('themeLabel');

  function apply(t) {
    root.setAttribute('data-theme', t);
    var dark = t === 'dark';
    if (label) label.textContent = dark ? 'Tema escuro' : 'Tema claro';
    if (btn) btn.setAttribute('aria-pressed', String(!dark));
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = dark ? '#07090d' : '#eef2f7';
  }

  apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  if (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('vegas-tema', next); } catch (e) {}
    });
  }

  // Segue o sistema enquanto o usuário não escolher manualmente
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: light)');
    var onChange = function (e) {
      var saved = null;
      try { saved = localStorage.getItem('vegas-tema'); } catch (err) {}
      if (!saved) apply(e.matches ? 'light' : 'dark');
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  }
})();
