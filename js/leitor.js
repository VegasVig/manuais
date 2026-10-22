(function () {
  var CENTRAIS = [
    { id: 'active', nome: 'Active', marca: 'JFL' },
    { id: 'amt-8000', nome: 'AMT 8000', marca: 'Intelbras' },
    { id: 'amt-4010-smart', nome: 'AMT 4010 Smart', marca: 'Intelbras' },
    { id: 'amt-2018', nome: 'AMT 2018 E / EG', marca: 'Intelbras' }
  ];
  var STOP = ('a o as os um uma uns umas de do da dos das no na nos nas em por para pra pro com sem e ou que ' +
    'como qual quais onde quando eu me meu minha voce se ser esta este isso isto faco fazer faz preciso quero ' +
    'manual central alarme ao aos pelo pela pelos pelas sobre mais tem ter vou consigo posso procurar buscar mostrar').split(' ');
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });

  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var atualId = params.get('central') || 'amt-8000';
  if (!CENTRAIS.some(function (c) { return c.id === atualId; })) atualId = 'amt-8000';

  var input = $('q'), escopo = $('escopo'), mic = $('mic');
  var resBox = $('resultados'), resLista = $('resLista'), resInfo = $('resInfo');
  var conteudo = $('conteudo'), cab = $('cab'), toc = $('tocLista');
  var indices = {}, carregando = {}, selecionado = -1, ultimos = [];

  /* ---------- utilidades de texto ---------- */
  function semAcento(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function norm(s) { return semAcento(String(s).toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim(); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function textoDe(html) {
    return html.replace(/<\/(p|li|tr|th|td|figure)>/g, ' $&').replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ').trim();
  }
  function porChar(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) out += semAcento(s[i].toLowerCase()).charAt(0) || ' ';
    return out;
  }

  /* números falados: "oito mil" → 8000, "dois mil e dezoito" → 2018 */
  var NUM = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
    onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
    cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600,
    setecentos: 700, oitocentos: 800, novecentos: 900 };
  function numerosFalados(q) {
    var w = q.split(' '), out = [], acc = null, parcial = 0;
    function fecha() { if (acc !== null) { out.push(String(acc + parcial)); acc = null; parcial = 0; } }
    for (var i = 0; i < w.length; i++) {
      var p = w[i];
      if (NUM.hasOwnProperty(p)) { if (acc === null) acc = 0; parcial += NUM[p]; }
      else if (p === 'mil') { if (acc === null) acc = 0; acc += (parcial || 1) * 1000; parcial = 0; }
      else if (p === 'e' && acc !== null && i + 1 < w.length && (NUM.hasOwnProperty(w[i + 1]))) { continue; }
      else { fecha(); out.push(p); }
    }
    fecha();
    return out.join(' ');
  }

  function termos(q) {
    var n = numerosFalados(norm(q));
    var t = n.split(' ').filter(function (w) { return w && !STOPSET[w]; });
    var uniq = [];
    t.forEach(function (w) { if (uniq.indexOf(w) < 0) uniq.push(w); });
    return uniq.map(function (w) {
      var num = /\d/.test(w);
      return { w: w, stem: num ? w : radical(w), exato: num || w.length <= 3 };
    });
  }
  var SUFIXOS = ['amentos', 'imentos', 'amento', 'imento', 'acoes', 'icoes', 'adoras', 'adores', 'adora', 'ador', 'acao', 'icao', 'coes', 'cao',
    'ados', 'adas', 'idos', 'idas', 'ado', 'ada', 'ido', 'ida', 'ando', 'endo', 'indo', 'ar', 'er', 'ir', 'os', 'as', 'es', 'o', 'a', 'e', 's'];
  function radical(w) {
    for (var i = 0; i < SUFIXOS.length; i++) {
      var s = SUFIXOS[i];
      if (w.length - s.length >= 4 && w.slice(-s.length) === s) return w.slice(0, -s.length);
    }
    return w;
  }
  function bate(palavra, t) { return t.exato ? palavra === t.w : palavra.indexOf(t.stem) === 0; }

  /* ---------- carregamento ---------- */
  function carregar(id) {
    if (window.MANUAIS && window.MANUAIS[id]) return Promise.resolve(window.MANUAIS[id]);
    if (carregando[id]) return carregando[id];
    carregando[id] = new Promise(function (ok, falha) {
      var s = document.createElement('script');
      s.src = 'data/' + id + '.js';
      s.onload = function () { window.MANUAIS && window.MANUAIS[id] ? ok(window.MANUAIS[id]) : falha(new Error('vazio')); };
      s.onerror = function () { delete carregando[id]; falha(new Error('Falha ao carregar ' + id)); };
      document.head.appendChild(s);
    });
    return carregando[id];
  }

  function indexar(m) {
    if (indices[m.id]) return indices[m.id];
    var pilha = [];
    var idx = m.secoes.map(function (s) {
      pilha = pilha.filter(function (p) { return p.lvl < s.lvl; });
      var caminho = pilha.map(function (p) { return p.t; });
      pilha.push(s);
      var texto = textoDe(s.h);
      var corpoN = norm(texto), tituloN = norm(s.t);
      var cont = {};
      corpoN.split(' ').forEach(function (w) { if (w) cont[w] = (cont[w] || 0) + 1; });
      return { m: m, s: s, caminho: caminho, texto: texto, corpoN: corpoN, tituloN: tituloN,
        tituloP: tituloN.split(' '), cont: cont, palavras: Object.keys(cont), contextoP: norm(caminho.join(' ')).split(' ') };
    });
    indices[m.id] = idx;
    return idx;
  }

  function pontuar(e, ts, frase) {
    var total = 0, achados = 0;
    ts.forEach(function (t) {
      var tit = e.tituloP.some(function (p) { return bate(p, t); });
      var ctx = e.contextoP.some(function (p) { return bate(p, t); });
      var n = 0;
      for (var i = 0; i < e.palavras.length; i++) if (bate(e.palavras[i], t)) n += e.cont[e.palavras[i]];
      if (tit || n || ctx) achados++;
      total += (tit ? 20 : 0) + (ctx ? 4 : 0) + Math.min(n, 8) * (e.texto.length > 8000 ? 0.5 : 1);
    });
    if (frase && frase.indexOf(' ') > 0) {
      if (e.tituloN.indexOf(frase) >= 0) total += 40;
      else if (e.corpoN.indexOf(frase) >= 0) total += 18;
    }
    return { pontos: total, achados: achados };
  }

  function buscar(q) {
    var ts = termos(q);
    if (!ts.length) { fecharResultados(); return; }
    var frase = ts.map(function (t) { return t.w; }).join(' ');
    var ids = escopo.value === 'todas' ? CENTRAIS.map(function (c) { return c.id; }) : [atualId];
    resInfo.textContent = 'Buscando…';
    abrirResultados();
    Promise.all(ids.map(function (id) { return carregar(id).then(indexar).catch(function () { return []; }); })).then(function (listas) {
      var todos = [].concat.apply([], listas);
      var exatos = [], parciais = [];
      todos.forEach(function (e) {
        var r = pontuar(e, ts, frase);
        if (!r.pontos) return;
        var item = { e: e, p: r.pontos + (e.m.id === atualId ? 2 : 0) };
        if (r.achados === ts.length) exatos.push(item);
        else if (r.achados >= Math.ceil(ts.length / 2)) parciais.push(item);
      });
      var lista = exatos.length ? exatos : parciais;
      lista.sort(function (a, b) { return b.p - a.p; });
      ultimos = lista.slice(0, 40);
      mostrarResultados(ultimos, ts, !exatos.length && parciais.length > 0, q);
    });
  }

  function marcarTexto(txt, ts) {
    var base = porChar(txt), html = '', i = 0;
    var re = new RegExp('(^|[^a-z0-9])(' + ts.map(function (t) {
      return t.exato ? t.w.replace(/[^a-z0-9]/g, '') + '(?![a-z0-9])' : t.stem.replace(/[^a-z0-9]/g, '') + '[a-z0-9]*';
    }).join('|') + ')', 'g');
    var m;
    while ((m = re.exec(base))) {
      var ini = m.index + m[1].length, fim = ini + m[2].length;
      html += esc(txt.slice(i, ini)) + '<mark>' + esc(txt.slice(ini, fim)) + '</mark>';
      i = fim;
      if (re.lastIndex === m.index) re.lastIndex++;
    }
    return html + esc(txt.slice(i));
  }

  function trecho(e, ts) {
    var base = porChar(e.texto), pos = -1;
    ts.forEach(function (t) {
      var r = new RegExp('(^|[^a-z0-9])' + (t.exato ? t.w : t.stem)).exec(base);
      if (r && (pos < 0 || r.index < pos)) pos = r.index;
    });
    if (pos < 0) return e.texto.slice(0, 160) + (e.texto.length > 160 ? '…' : '');
    var ini = Math.max(0, pos - 70), fim = Math.min(e.texto.length, pos + 150);
    while (ini > 0 && e.texto[ini] !== ' ') ini--;
    return (ini > 0 ? '…' : '') + e.texto.slice(ini, fim).trim() + (fim < e.texto.length ? '…' : '');
  }

  function mostrarResultados(lista, ts, aprox, q) {
    selecionado = -1;
    if (!lista.length) {
      resInfo.textContent = 'Nada encontrado para “' + q + '”. Tente outras palavras ou “Todas as centrais”.';
      resLista.innerHTML = '';
      return;
    }
    resInfo.textContent = lista.length + (lista.length === 40 ? '+' : '') + ' resultado' + (lista.length > 1 ? 's' : '') +
      (aprox ? ' aproximados (nem todas as palavras foram encontradas)' : '') + ' · Enter abre o primeiro';
    resLista.innerHTML = lista.map(function (r, i) {
      var e = r.e, cam = (escopo.value === 'todas' ? e.m.nome + ' · ' : '') + e.caminho.join(' › ');
      return '<li><button class="res" type="button" data-i="' + i + '">' +
        (cam ? '<span class="res__cam">' + esc(cam) + '</span>' : '') +
        '<span class="res__tit">' + marcarTexto(e.s.t, ts) + ' <span class="res__pg">pág. ' + e.s.pg + '</span></span>' +
        '<span class="res__trecho">' + marcarTexto(trecho(e, ts), ts) + '</span></button></li>';
    }).join('');
  }

  function abrirResultados() { resBox.hidden = false; }
  function fecharResultados() { resBox.hidden = true; selecionado = -1; }

  function irPara(r) {
    var e = r.e, q = input.value;
    if (e.m.id !== atualId) {
      location.href = 'leitor.html?central=' + encodeURIComponent(e.m.id) + '&q=' + encodeURIComponent(q) + '#' + e.s.id;
      return;
    }
    fecharResultados();
    abrirSecao(e.s.id, termos(q));
  }

  /* ---------- realce dentro do manual ---------- */
  function limparMarcas() {
    conteudo.querySelectorAll('mark').forEach(function (m) {
      var p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize();
    });
  }
  function realcar(el, ts) {
    if (!ts || !ts.length) return null;
    var re = new RegExp('(^|[^a-z0-9])(' + ts.map(function (t) { return t.exato ? t.w + '(?![a-z0-9])' : t.stem + '[a-z0-9]*'; }).join('|') + ')', 'g');
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nos = [], n, primeira = null;
    while ((n = walker.nextNode())) if (n.nodeValue.trim()) nos.push(n);
    nos.forEach(function (no) {
      var txt = no.nodeValue, base = porChar(txt), m, partes = [], i = 0;
      re.lastIndex = 0;
      while ((m = re.exec(base))) {
        var ini = m.index + m[1].length, fim = ini + m[2].length;
        partes.push([i, ini, fim]); i = fim;
        if (re.lastIndex === m.index) re.lastIndex++;
      }
      if (!partes.length) return;
      var frag = document.createDocumentFragment();
      partes.forEach(function (p) {
        frag.appendChild(document.createTextNode(txt.slice(p[0], p[1])));
        var mk = document.createElement('mark'); mk.textContent = txt.slice(p[1], p[2]);
        frag.appendChild(mk);
        if (!primeira) primeira = mk;
      });
      frag.appendChild(document.createTextNode(txt.slice(i)));
      no.parentNode.replaceChild(frag, no);
    });
    return primeira;
  }

  function abrirSecao(id, ts) {
    var alvo = document.getElementById(id);
    if (!alvo) return;
    var bloco = alvo.closest('.sec') || alvo;
    limparMarcas();
    var escopoEl = alvo.classList.contains('sec') ? alvo : (alvo.closest('.subsec') || alvo);
    var primeira = realcar(escopoEl, ts);
    if (primeira) primeira.classList.add('atual');
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    alvo.scrollIntoView({ block: 'start' });
    if (primeira && primeira.getBoundingClientRect().top > window.innerHeight * 0.7) {
      primeira.scrollIntoView({ block: 'center' });
    }
    bloco.classList.remove('flash'); void bloco.offsetWidth; bloco.classList.add('flash');
    fecharSumario();
  }

  /* ---------- renderização ---------- */
  var ICON_OUVIR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var ICON_PDF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>';

  function renderizar(m) {
    var info = CENTRAIS.filter(function (c) { return c.id === m.id; })[0] || {};
    document.title = m.nome + ' — Manual · Vegas Vigilância e Segurança';
    cab.innerHTML = '<span class="tag tag--' + esc(m.marca) + '">' + esc(m.marca) + '</span>' +
      '<h1>' + esc(m.nome) + '</h1><p>Manual do usuário · ' + m.paginas + ' páginas no original · ' + m.secoes.length + ' seções pesquisáveis</p>' +
      '<div class="acoes"><a class="btn" href="' + esc(m.pdf) + '" target="_blank" rel="noopener">' + ICON_PDF + ' PDF original</a>' +
      '<select class="btn" id="trocar" aria-label="Trocar de central">' + CENTRAIS.map(function (c) {
        return '<option value="' + c.id + '"' + (c.id === m.id ? ' selected' : '') + '>' + esc(c.marca + ' · ' + c.nome) + '</option>';
      }).join('') + '</select></div>';
    if ($('pdfOffline')) $('pdfOffline').addEventListener('click', function () { if (window.vegasBaixarPdfs) window.vegasBaixarPdfs(); });
    $('trocar').addEventListener('change', function () { location.href = 'leitor.html?central=' + encodeURIComponent(this.value); });

    var html = [], aberto = false;
    m.secoes.forEach(function (s) {
      var ferr = '<span class="sec__ferr">' +
        (window.speechSynthesis ? '<button type="button" class="ico-btn ouvir" data-id="' + s.id + '" title="Ouvir esta seção">' + ICON_OUVIR + '<span>Ouvir</span></button>' : '') +
        '<a class="ico-btn" href="' + esc(m.pdf) + '#page=' + s.pg + '" target="_blank" rel="noopener" title="Abrir a página no PDF original">pág. ' + s.pg + '</a></span>';
      if (s.lvl <= 2) {
        if (aberto) html.push('</section>');
        var tag = s.lvl === 1 ? 'h2' : 'h3';
        html.push('<section class="sec" id="' + s.id + '"><div class="sec__cab"><' + tag + '>' + esc(s.t) + '</' + tag + '>' + ferr + '</div>' + s.h);
        aberto = true;
      } else {
        if (!aberto) { html.push('<section class="sec">'); aberto = true; }
        var t2 = s.lvl === 3 ? 'h4' : 'h5';
        html.push('<div class="subsec" id="' + s.id + '"><div class="sec__cab"><' + t2 + '>' + esc(s.t) + '</' + t2 + '>' + ferr + '</div>' + s.h + '</div>');
      }
    });
    if (aberto) html.push('</section>');
    conteudo.innerHTML = html.join('');

    toc.innerHTML = m.secoes.filter(function (s) { return s.lvl <= 2 || (s.lvl === 3 && /^[0-9]/.test(s.t)); }).map(function (s) {
      return '<li><a class="n' + s.lvl + '" href="#' + s.id + '" data-id="' + s.id + '">' + esc(s.t) + '</a></li>';
    }).join('');

    observarAtivo();
  }

  function observarAtivo() {
    if (!('IntersectionObserver' in window)) return;
    var links = {};
    toc.querySelectorAll('a').forEach(function (a) { links[a.getAttribute('data-id')] = a; });
    var atual = null;
    var obs = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting && links[en.target.id]) {
          if (atual) atual.classList.remove('ativo');
          atual = links[en.target.id]; atual.classList.add('ativo');
          if (!$('sumario').classList.contains('aberto')) {
            var r = atual.getBoundingClientRect(), sr = $('sumario').getBoundingClientRect();
            if (r.top < sr.top || r.bottom > sr.bottom) atual.scrollIntoView({ block: 'nearest' });
          }
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    conteudo.querySelectorAll('.sec[id], .subsec[id]').forEach(function (el) { obs.observe(el); });
  }

  /* ---------- sumário (mobile) ---------- */
  function abrirSumario() { $('sumario').classList.add('aberto'); $('veu').hidden = false; $('btnSumario').setAttribute('aria-expanded', 'true'); }
  function fecharSumario() { $('sumario').classList.remove('aberto'); $('veu').hidden = true; $('btnSumario').setAttribute('aria-expanded', 'false'); }
  $('btnSumario').addEventListener('click', abrirSumario);
  $('fecharSumario').addEventListener('click', fecharSumario);
  $('veu').addEventListener('click', fecharSumario);
  toc.addEventListener('click', function (ev) {
    var a = ev.target.closest('a'); if (!a) return;
    ev.preventDefault(); limparMarcas(); abrirSecao(a.getAttribute('data-id'), null);
  });

  /* ---------- eventos da busca ---------- */
  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    var v = input.value;
    if (!v.trim()) { fecharResultados(); return; }
    timer = setTimeout(function () { buscar(v); }, 180);
  });
  input.addEventListener('focus', function () { if (input.value.trim() && resLista.children.length) abrirResultados(); });
  input.addEventListener('keydown', function (ev) {
    var itens = resLista.querySelectorAll('.res');
    if (ev.key === 'Enter') {
      ev.preventDefault();
      clearTimeout(timer);
      if (selecionado >= 0 && ultimos[selecionado]) irPara(ultimos[selecionado]);
      else if (ultimos.length && !resBox.hidden) irPara(ultimos[0]);
      else buscar(input.value);
    } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      if (!itens.length) return;
      ev.preventDefault();
      selecionado = (selecionado + (ev.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
      itens.forEach(function (b, i) { b.classList.toggle('is-sel', i === selecionado); });
      itens[selecionado].scrollIntoView({ block: 'nearest' });
    } else if (ev.key === 'Escape') { fecharResultados(); }
  });
  resLista.addEventListener('click', function (ev) {
    var b = ev.target.closest('.res'); if (!b) return;
    irPara(ultimos[+b.getAttribute('data-i')]);
  });
  $('fecharRes').addEventListener('click', fecharResultados);
  escopo.addEventListener('change', function () {
    try { localStorage.setItem('vegas-manuais-escopo', escopo.value); } catch (e) {}
    if (input.value.trim()) buscar(input.value);
  });
  try { var esSalvo = localStorage.getItem('vegas-manuais-escopo'); if (esSalvo) escopo.value = esSalvo; } catch (e) {}
  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && document.activeElement !== input && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      ev.preventDefault(); input.focus(); input.select();
    }
  });
  document.addEventListener('click', function (ev) {
    if (!resBox.hidden && !ev.target.closest('#barraBusca')) fecharResultados();
  });

  /* ---------- busca por voz ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, ouvindo = false;
  if (!SR) {
    mic.disabled = true;
    mic.title = 'Busca por voz indisponível neste navegador (use Chrome, Edge ou Safari)';
  } else {
    rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = function () {
      ouvindo = true; mic.classList.add('on'); mic.setAttribute('aria-label', 'Parar de ouvir');
      $('ouvindo').hidden = false; $('ouvindoTxt').textContent = 'Ouvindo… fale o que procura';
    };
    rec.onresult = function (ev) {
      var txt = '', final = false;
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        txt += ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final = true;
      }
      input.value = txt.trim();
      $('ouvindoTxt').textContent = '“' + txt.trim() + '”';
      if (final) buscar(input.value);
    };
    rec.onerror = function (ev) {
      var msg = {
        'not-allowed': 'Microfone bloqueado. Libere o acesso ao microfone nas permissões do navegador.',
        'service-not-allowed': 'Microfone bloqueado. Libere o acesso ao microfone nas permissões do navegador.',
        'no-speech': 'Não ouvi nada. Toque no microfone e fale de novo.',
        'audio-capture': 'Nenhum microfone encontrado.',
        'network': 'Busca por voz precisa de internet.'
      }[ev.error] || 'Não foi possível usar a voz agora.';
      $('ouvindoTxt').textContent = msg;
      setTimeout(function () { if (!ouvindo) $('ouvindo').hidden = true; }, 3500);
    };
    rec.onend = function () {
      ouvindo = false; mic.classList.remove('on'); mic.setAttribute('aria-label', 'Buscar por voz');
      setTimeout(function () { if (!ouvindo && !/bloqueado|ouvi|microfone|internet|possível/.test($('ouvindoTxt').textContent)) $('ouvindo').hidden = true; }, 800);
    };
    mic.addEventListener('click', function () {
      if (ouvindo) { rec.stop(); return; }
      if (!navigator.onLine) {
        $('ouvindo').hidden = false;
        $('ouvindoTxt').textContent = 'Sem internet: a busca por voz não funciona offline. Use a busca escrita.';
        setTimeout(function () { $('ouvindo').hidden = true; }, 4000);
        return;
      }
      pararLeitura();
      try { rec.start(); } catch (e) {}
    });
  }

  /* ---------- leitura em voz alta ---------- */
  var lendo = null;
  function pararLeitura() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (lendo) lendo.classList.remove('on');
    lendo = null;
  }
  conteudo.addEventListener('click', function (ev) {
    var img = ev.target.closest('figure img');
    if (img) {
      var d = document.createElement('dialog'); d.className = 'zoom';
      d.innerHTML = '<img src="' + img.getAttribute('src') + '" alt="">';
      d.addEventListener('click', function () { d.close(); d.remove(); });
      document.body.appendChild(d); d.showModal ? d.showModal() : d.setAttribute('open', '');
      return;
    }
    var b = ev.target.closest('.ouvir'); if (!b) return;
    if (lendo === b) { pararLeitura(); return; }
    pararLeitura();
    var el = document.getElementById(b.getAttribute('data-id'));
    var clone = el.cloneNode(true);
    clone.querySelectorAll('.sec__ferr, .subsec, figure, .tbl').forEach(function (x) { x.remove(); });
    var texto = clone.textContent.replace(/»+/g, ' ').replace(/\s+/g, ' ').trim();
    var partes = texto.match(/[^.!?;:]+[.!?;:]?/g) || [texto];
    var vozes = speechSynthesis.getVoices().filter(function (v) { return /^pt(-|_)BR/i.test(v.lang); });
    lendo = b; b.classList.add('on');
    partes.forEach(function (p, i) {
      var u = new SpeechSynthesisUtterance(p.trim());
      u.lang = 'pt-BR'; u.rate = 1.02;
      if (vozes[0]) u.voice = vozes[0];
      if (i === partes.length - 1) u.onend = function () { if (lendo === b) pararLeitura(); };
      speechSynthesis.speak(u);
    });
  });
  window.addEventListener('pagehide', pararLeitura);

  /* ---------- topo ---------- */
  var topo = $('topoBtn');
  window.addEventListener('scroll', function () { topo.hidden = window.scrollY < 800; }, { passive: true });
  topo.addEventListener('click', function () { window.scrollTo({ top: 0 }); });

  if (window.innerWidth < 560) input.placeholder = 'Buscar ou falar…';

  /* ---------- início ---------- */
  carregar(atualId).then(function (m) {
    renderizar(m);
    var q = params.get('q');
    if (q) input.value = q;
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash && document.getElementById(hash)) {
      requestAnimationFrame(function () { abrirSecao(hash, q ? termos(q) : null); });
    }
  }).catch(function () {
    conteudo.innerHTML = '<p class="erro">Não foi possível carregar este manual. Verifique se a pasta <code>data/</code> foi publicada junto com o site.</p>';
  });
})();
