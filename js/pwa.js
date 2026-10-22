(function () {
  if (!('serviceWorker' in navigator)) return;
  var PDFS = ['manuais/Manual_AMT_8000.pdf', 'manuais/Manual_AMT_4010_Smart.pdf', 'manuais/Manual_AMT_2018E_2018EG.pdf', 'manuais/manual-actives.pdf'];

  var css = document.createElement('style');
  css.textContent =
    '.pwa-aviso{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:60;' +
    'display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);padding:10px 14px;border-radius:12px;font-size:14px;' +
    'background:var(--text);color:var(--bg);box-shadow:0 10px 30px rgba(0,0,0,.35)}' +
    '.pwa-aviso button{background:none;border:1px solid currentColor;color:inherit;border-radius:8px;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}' +
    '.pwa-off{position:fixed;bottom:calc(20px + env(safe-area-inset-bottom,0px));left:12px;z-index:70;padding:4px 10px;border-radius:999px;font-size:12px;background:#e0a100;color:#111}';
  document.head.appendChild(css);

  var aviso = null, timer = null;
  function mostrar(txt, botao, acao, fixo) {
    if (!aviso) { aviso = document.createElement('div'); aviso.className = 'pwa-aviso'; aviso.setAttribute('role', 'status'); document.body.appendChild(aviso); }
    aviso.innerHTML = '<span></span>';
    aviso.firstChild.textContent = txt;
    if (botao) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = botao;
      b.addEventListener('click', function () { acao(); });
      aviso.appendChild(b);
    }
    var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Fechar');
    x.addEventListener('click', esconder); aviso.appendChild(x);
    clearTimeout(timer);
    if (!fixo) timer = setTimeout(esconder, 6000);
  }
  function esconder() { if (aviso) { aviso.remove(); aviso = null; } }

  var pronto = false;
  try { pronto = localStorage.getItem('vegas-manuais-offline') === '1'; } catch (e) {}

  if ('BroadcastChannel' in window) {
    var canal = new BroadcastChannel('manuais-sw');
    canal.onmessage = function (ev) {
      var d = ev.data || {};
      if (d.tipo === 'progresso' && !pronto) mostrar('Baixando manuais para uso offline… ' + Math.round(d.feitos / d.total * 100) + '%', null, null, true);
      if (d.tipo === 'pronto') {
        try { localStorage.setItem('vegas-manuais-offline', '1'); } catch (e) {}
        if (!pronto) mostrar('Pronto! Os manuais já funcionam sem internet.', 'Baixar PDFs também', baixarPdfs);
        pronto = true;
      }
      if (d.tipo === 'pdf') mostrar(d.feitos < d.total ? 'Baixando PDFs originais… ' + d.feitos + ' de ' + d.total : 'PDFs originais salvos para uso offline.', null, null, d.feitos < d.total);
    };
  }

  function baixarPdfs() {
    navigator.serviceWorker.ready.then(function (reg) {
      var base = new URL('.', location.href).href;
      reg.active.postMessage({ tipo: 'baixar-pdfs', urls: PDFS.map(function (p) { return base + p; }) });
      mostrar('Baixando PDFs originais (≈23 MB)…', null, null, true);
    });
  }
  window.vegasBaixarPdfs = baixarPdfs;

  var adiado = null;
  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault(); adiado = ev;
    mostrar('Instale os Manuais no celular para abrir mesmo sem internet.', 'Instalar', function () {
      esconder(); adiado.prompt(); adiado = null;
    }, true);
  });
  window.addEventListener('appinstalled', function () { mostrar('App instalado. Procure o ícone “Manuais” na tela inicial.'); });

  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
  if (ios) {
    var visto = null;
    try { visto = localStorage.getItem('vegas-manuais-ios'); } catch (e) {}
    if (!visto) setTimeout(function () {
      mostrar('No iPhone: toque em Compartilhar e depois “Adicionar à Tela de Início”.', 'Entendi', function () {
        try { localStorage.setItem('vegas-manuais-ios', '1'); } catch (e) {} esconder();
      }, true);
    }, 2500);
  }

  var selo = null;
  function rede() {
    if (navigator.onLine) { if (selo) { selo.remove(); selo = null; } return; }
    if (!selo) { selo = document.createElement('div'); selo.className = 'pwa-off'; selo.textContent = 'Offline'; document.body.appendChild(selo); }
  }
  window.addEventListener('online', rede); window.addEventListener('offline', rede); rede();

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
})();
