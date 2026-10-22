/* Página inicial: escolha da central */
(function () {
  var CENTRAIS = [
    { id: 'active', marca: 'JFL', nome: 'Active',
      modelos: 'Active 8W · 20 Ultra · 20 · 20 Bus · Full 32 · 100 Bus',
      versao: 'Manual do usuário · firmware 8.1 ou superior' },
    { id: 'amt-8000', marca: 'Intelbras', nome: 'AMT 8000',
      modelos: 'Central de alarme sem fio',
      versao: 'Manual do usuário' },
    { id: 'amt-4010-smart', marca: 'Intelbras', nome: 'AMT 4010 Smart',
      modelos: 'AMT 4010 Smart · AMT 4010 Smart Net',
      versao: 'Manual do usuário' },
    { id: 'amt-2018', marca: 'Intelbras', nome: 'AMT 2018 E / EG',
      modelos: 'AMT 2018 E · 2018 EG · 2118 EG · 2018 E3G',
      versao: 'Manual do usuário' }
  ];

  var grid = document.getElementById('grid');
  var vazio = document.getElementById('vazio');
  var stats = document.getElementById('stats');
  var filtro = document.getElementById('filtro');
  var chips = document.querySelectorAll('.chip');
  var marca = 'all';

  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render() {
    var q = norm(filtro.value);
    var lista = CENTRAIS.filter(function (c) {
      if (marca !== 'all' && c.marca !== marca) return false;
      return !q || norm(c.nome + ' ' + c.modelos + ' ' + c.marca).indexOf(q) !== -1;
    });

    grid.innerHTML = lista.map(function (c) {
      return '<a class="card" href="leitor.html?central=' + encodeURIComponent(c.id) + '">' +
        '<span class="tag tag--' + c.marca + '">' + esc(c.marca) + '</span>' +
        '<h2>' + esc(c.nome) + '</h2>' +
        '<p>' + esc(c.modelos) + '</p>' +
        '<div class="card__meta"><span>' + esc(c.versao) + '</span><span class="card__go">Abrir →</span></div>' +
        '</a>';
    }).join('');

    vazio.hidden = lista.length > 0;
    var marcas = {};
    CENTRAIS.forEach(function (c) { marcas[c.marca] = 1; });
    stats.textContent = lista.length + ' de ' + CENTRAIS.length + ' centrais · ' + Object.keys(marcas).length + ' marcas';
  }

  filtro.addEventListener('input', render);
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      marca = b.getAttribute('data-marca');
      render();
    });
  });
  render();

  /* Vídeo de fundo: sem áudio, pausado se o usuário preferir menos movimento */
  var v = document.getElementById('bgVideo');
  if (v) {
    v.muted = true; v.defaultMuted = true; v.volume = 0;
    var reduzir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzir) { v.removeAttribute('autoplay'); v.pause(); }
    else {
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* autoplay bloqueado: fica o pôster */ });
    }
    document.addEventListener('visibilitychange', function () {
      if (reduzir) return;
      if (document.hidden) v.pause(); else v.play().catch(function () {});
    });
  }
})();
