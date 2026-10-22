import pymupdf as fitz, re, json, os, html, unicodedata, sys, warnings
warnings.filterwarnings('ignore')

UP = 'manuais'
OUT = '.'

MANUAIS = [
    dict(id='amt-8000', pdf='Manual_AMT_8000.pdf', marca='Intelbras', nome='AMT 8000', tipo='intelbras', zoom=3.2),
    dict(id='amt-4010-smart', pdf='Manual_AMT_4010_Smart.pdf', marca='Intelbras', nome='AMT 4010 Smart', tipo='intelbras', zoom=2.6),
    dict(id='amt-2018', pdf='Manual_AMT_2018E_2018EG.pdf', marca='Intelbras', nome='AMT 2018 E / EG', tipo='intelbras', zoom=2.6),
    dict(id='active', pdf='manual-actives.pdf', marca='JFL', nome='Active', tipo='jfl', zoom=1.7),
]
MODELOS_JFL = ['Active 8W', 'Active 20 Ultra', 'Active 20 Bus', 'Active 20', 'Active Full 32', 'Active 100 Bus']


def esc(s):
    return html.escape(s, quote=False)


def norm(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Z0-9]', '', s.upper())


def clean(s):
    s = s.replace('\u2009', ' ').replace('\u2002', ' ').replace('\u00ad', '').replace('\t', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def inside(r, box, tol=2):
    return r[0] >= box[0] - tol and r[1] >= box[1] - tol and r[2] <= box[2] + tol and r[3] <= box[3] + tol


def center_in(r, box):
    cx, cy = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2
    return box[0] <= cx <= box[2] and box[1] <= cy <= box[3]


def merge_rects(rects, gap=6):
    rects = [list(r) for r in rects]
    changed = True
    while changed:
        changed = False
        out = []
        while rects:
            a = rects.pop()
            i = 0
            while i < len(rects):
                b = rects[i]
                if a[0] - gap <= b[2] and b[0] - gap <= a[2] and a[1] - gap <= b[3] and b[1] - gap <= a[3]:
                    a = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    rects.pop(i)
                    changed = True
                else:
                    i += 1
            out.append(a)
        rects = out
    return rects


def cell_text(page, rect, words):
    ws = [w for w in words if center_in(w[:4], rect)]
    seen, out = [], []
    for w in sorted(ws, key=lambda w: (round(w[3] / 3), w[0])):
        key = (round(w[0]), round(w[1]))
        if any(abs(k[0] - key[0]) < 3 and abs(k[1] - key[1]) < 3 for k in seen):
            continue
        seen.append(key)
        out.append(w[4])
    return clean(' '.join(out))


def tables_on(page, words):
    res = []
    try:
        tf = page.find_tables()
    except Exception:
        return res
    for t in tf.tables:
        rows = []
        for row in t.rows:
            cells = []
            for c in row.cells:
                cells.append(cell_text(page, c, words) if c else None)
            if any(cells):
                rows.append(cells)
        if not rows:
            continue
        ncols = max(len(r) for r in rows)
        if ncols < 2 and len(rows) < 2:
            continue
        res.append(dict(bbox=tuple(t.bbox), rows=rows))
    return res


def table_html(rows):
    ncol = max(len(r) for r in rows)
    rows = [r + [''] * (ncol - len(r)) for r in rows]
    keep = [j for j in range(ncol) if any(r[j] for r in rows) or any(r[j] is None for r in rows)]
    keep = [j for j in keep if any((r[j] or '').strip() for r in rows) or any(r[j] is None and j > 0 and (r[j-1] or '').strip() for r in rows)]
    rows = [[r[j] for j in keep] for r in rows]
    if not rows or not rows[0]:
        return ''
    grid = []
    for r in rows:
        cells = []
        for c in r:
            if c is None and cells:
                cells[-1][1] += 1
            else:
                cells.append([c or '', 1])
        grid.append(cells)
    for lado in (0, -1):
        while True:
            multi = [g for g in grid if len(g) > 1]
            if not multi or not all(not g[lado][0].strip() and g[lado][1] == 1 for g in multi):
                break
            for g in multi:
                g.pop(lado)
    h = ['<div class="tbl"><table>']
    for i, cells in enumerate(grid):
        tag = 'th' if i == 0 else 'td'
        h.append('<tr>')
        for c, n in cells:
            cs = f' colspan="{n}"' if n > 1 else ''
            h.append(f'<{tag}{cs}>{esc(c)}</{tag}>')
        h.append('</tr>')
    h.append('</table></div>')
    return ''.join(h)
    for i, r in enumerate(rows):
        tag = 'th' if i == 0 else 'td'
        h.append('<tr>')
        span = 1
        for j in range(len(r) - 1, -1, -1):
            pass
        cells = []
        for c in r:
            if c is None and cells:
                cells[-1][1] += 1
            else:
                cells.append([c or '', 1])
        for c, n in cells:
            cs = f' colspan="{n}"' if n > 1 else ''
            h.append(f'<{tag}{cs}>{esc(c)}</{tag}>')
        h.append('</tr>')
    h.append('</table></div>')
    return ''.join(h)


def figures_on(page, tables, cfg, body_size):
    W, H = page.rect.width, page.rect.height
    cand = []
    for im in page.get_image_info():
        b = im['bbox']
        if (b[2] - b[0]) > 25 and (b[3] - b[1]) > 18:
            cand.append(b)
    for d in page.get_drawings():
        r = d['rect']
        if r.width > W * 0.82 or r.height > H * 0.82:
            continue
        if r.width < 1.5 and r.height < 1.5:
            continue
        if any(inside(r, t['bbox'], 4) for t in tables):
            continue
        if cfg['tipo'] == 'jfl' and r.width < 12 and r.height < 12:
            continue
        if r.y0 > H * 0.92 or r.y1 < H * 0.05:
            continue
        cand.append(tuple(r))
    clusters = merge_rects(cand, gap=8)
    figs = []
    tdict = page.get_text('dict')
    for c in clusters:
        w, h = c[2] - c[0], c[3] - c[1]
        if w < 40 or h < 30 or w * h < 3000 or w <= 0 or h <= 0:
            continue
        body_chars = 0
        for b in tdict['blocks']:
            for l in b.get('lines', []):
                if center_in(l['bbox'], c):
                    for s in l['spans']:
                        if s['size'] >= body_size - 0.3:
                            body_chars += len(s['text'].strip())
        if body_chars > 260:
            continue
        figs.append(list(c))
    for f in figs:
        for _ in range(2):
            for blk in tdict['blocks']:
                for l in blk.get('lines', []):
                    lb = l['bbox']
                    sz = max((sp['size'] for sp in l['spans'] if sp['text'].strip()), default=99)
                    if sz >= body_size - 0.3 or len(''.join(sp['text'] for sp in l['spans']).strip()) > 40:
                        continue
                    near = lb[0] < f[2] + 16 and lb[2] > f[0] - 16 and lb[1] < f[3] + 10 and lb[3] > f[1] - 10
                    if near:
                        f[0], f[1], f[2], f[3] = min(f[0], lb[0]), min(f[1], lb[1]), max(f[2], lb[2]), max(f[3], lb[3])
    return [[max(0, f[0] - 4), max(0, f[1] - 4), min(W, f[2] + 4), min(H, f[3] + 4)] for f in figs]


class Builder:
    def __init__(self, cfg):
        self.cfg = cfg
        self.doc = fitz.open(os.path.join(UP, cfg['pdf']))
        self.nodes = []
        self.cur = None
        self.figdir = os.path.join(OUT, 'assets', 'manuais', cfg['id'])
        os.makedirs(self.figdir, exist_ok=True)
        self.nfig = 0
        self.used_ids = set()

    def new_node(self, lvl, title, page):
        num = re.match(r'^(\d+(?:\.\d+)*)\.?\s', title)
        base = 's-' + (num.group(1).replace('.', '-') if num else re.sub(r'[^a-z0-9]+', '-', norm(title).lower())[:30])
        nid, k = base, 2
        while nid in self.used_ids:
            nid = f'{base}-{k}'; k += 1
        self.used_ids.add(nid)
        self.cur = dict(id=nid, lvl=lvl, t=title, pg=page + 1, h=[])
        self.nodes.append(self.cur)

    def emit(self, frag):
        if self.cur is None:
            self.new_node(1, 'Apresentação', 0)
        self.cur['h'].append(frag)

    def save_fig(self, page, bbox):
        rect = fitz.Rect(bbox) & page.rect
        if rect.is_empty or rect.width < 20 or rect.height < 15:
            return None
        self.nfig += 1
        name = f'p{page.number + 1:03d}-{self.nfig:03d}.webp'
        pix = page.get_pixmap(matrix=fitz.Matrix(self.cfg['zoom'], self.cfg['zoom']), clip=rect, alpha=False)
        from PIL import Image
        img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        k = min(1400 / img.width, 2000 / img.height, 1)
        if k < 1:
            img = img.resize((max(1, int(img.width * k)), max(1, int(img.height * k))), Image.LANCZOS)
        img.save(os.path.join(self.figdir, name), 'WEBP', quality=72, method=6)
        return f'assets/manuais/{self.cfg["id"]}/{name}', img.width, img.height


def line_text(l, rich=True):
    out = []
    for s in l['spans']:
        t = s['text'].replace('\u2009', ' ').replace('\u2002', ' ')
        if not t:
            continue
        if rich and 'Bold' in s['font'] and t.strip():
            out.append('<b>' + esc(t) + '</b>')
        else:
            out.append(esc(t))
    s = ''.join(out)
    s = s.replace('</b><b>', '')
    return s


BULLET = re.compile(r'^\s*(?:»+|•|▪|-\s)\s*')
CMD = re.compile(r'^(Enter|Anular|Ativar|Desativar|Prog|Menu)\b.*\+', re.I)
NOTE = re.compile(r'^(?:<b>)?\s*(Aten[cç][aã]o|ATEN[CÇ][AÃ]O|Obs\.?|Observa[cç][aã]o|Importante|IMPORTANTE|Nota|Cuidado|Dica)\b')


def flush_para(builder, buf, kind):
    if not buf:
        return
    txt = ''
    for i, part in enumerate(buf):
        raw = re.sub(r'<[^>]+>', '', part)
        if i == 0:
            txt = part.strip()
            continue
        prev_raw = re.sub(r'<[^>]+>', '', txt)
        if prev_raw.endswith('-') and raw[:1].islower():
            txt = re.sub(r'-(</b>)?$', r'\1', txt) + part.strip()
        else:
            txt = txt + ' ' + part.strip()
    txt = re.sub(r'\s+', ' ', txt).strip()
    txt = re.sub(r'</b>\s*<b>', ' ', txt)
    if not re.sub(r'<[^>]+>', '', txt).strip():
        return
    plain = re.sub(r'<[^>]+>', '', txt)
    last = builder.cur['h'][-1] if builder.cur and builder.cur['h'] else ''
    if plain[:1].islower() and re.search(r'</(p|li)>$', last) and not last.startswith('<p class="cmd"'):
        prev_plain = re.sub(r'<[^>]+>', '', last)
        glue = '' if prev_plain.endswith('-') else ' '
        base = re.sub(r'</(p|li)>$', '', last)
        if glue == '':
            base = re.sub(r'-(</b>)?$', r'\1', base)
        builder.cur['h'][-1] = base + glue + txt + re.search(r'</(p|li)>$', last).group(0)
        return
    if kind == 'li':
        builder.emit(f'<li>{txt}</li>')
    elif CMD.match(re.sub(r'<[^>]+>', '', txt)):
        builder.emit(f'<p class="cmd">{txt}</p>')
    elif NOTE.match(txt):
        builder.emit(f'<p class="nota">{txt}</p>')
    else:
        builder.emit(f'<p>{txt}</p>')


def classify_intelbras(l, page_no, solo=True):
    spans = [s for s in l['spans'] if s['text'].strip()]
    if not spans:
        return None
    s0 = spans[0]
    t = clean(''.join(s['text'] for s in l['spans']))
    if s0['size'] >= 13.4 and s0['font'] == 'FrutigerLTStd-Light' or (s0['size'] >= 13.4 and t == 'Índice'):
        return ('h1', t)
    if 8.8 <= s0['size'] <= 9.3 and 'BoldCn' in s0['font'] and re.match(r'^\d+\.\d+\.', t):
        return ('h2', t)
    if abs(s0['size'] - 8.5) < 0.2 and s0['font'] == 'FrutigerLTStd-Cn' and all(s['font'] == 'FrutigerLTStd-Cn' for s in spans) and len(t) < 110:
        return ('h4', t)
    if all('BoldCn' in s['font'] and 7.8 <= s['size'] <= 8.2 for s in spans) and 3 < len(t) < 90 and not NOTE.match(t) and not t.endswith((':', ',')) and solo:
        return ('h3', t)
    return None


def build(cfg):
    b = Builder(cfg)
    doc = b.doc
    jfl = cfg['tipo'] == 'jfl'
    body_size = 12 if jfl else 8.5
    toc_by_page = {}
    if jfl:
        for lvl, title, pg in doc.get_toc():
            toc_by_page.setdefault(pg - 1, []).append(dict(lvl=lvl, t=clean(title), n=norm(title), done=False))
    skip = False
    for page in doc:
        pn = page.number
        W, H = page.rect.width, page.rect.height
        if pn == 0 and not jfl:
            continue
        ptxt = page.get_text()
        if jfl and ptxt.count('.....') > 5:
            continue
        words = page.get_text('words')
        tables = tables_on(page, words)
        figs = figures_on(page, tables, cfg, body_size)
        items = []
        for t in tables:
            items.append((t['bbox'][1], 'table', t))
        for f in figs:
            items.append((f[1], 'fig', f))
        pend = toc_by_page.get(pn, [])
        d = page.get_text('dict')
        skip_lines = set()
        if jfl:
            cand = []
            for blk in d['blocks']:
                for l in blk.get('lines', []):
                    t = clean(''.join(s['text'] for s in l['spans']))
                    if t in MODELOS_JFL:
                        cand.append((l, t))
            rows = []
            for l, t in sorted(cand, key=lambda x: x[0]['bbox'][1]):
                yc = (l['bbox'][1] + l['bbox'][3]) / 2
                if rows and abs(rows[-1][0] - yc) < 3:
                    rows[-1][1].append((l, t))
                else:
                    rows.append([yc, [(l, t)]])
            for yc, grp in rows:
                if len(grp) >= 3:
                    for l, t in grp:
                        skip_lines.add(id(l))
                    items.append((grp[0][0]['bbox'][1], 'apl', grp))
        for blk in d['blocks']:
            if 'lines' not in blk:
                continue
            bb = blk['bbox']
            if any(center_in(bb, t['bbox']) for t in tables):
                continue
            if any(center_in(bb, f) for f in figs):
                continue
            if jfl and all(all(sp['color'] == 6710886 and sp['size'] >= 11 for sp in l['spans'] if sp['text'].strip()) for l in blk['lines']) \
                    and sum(len(sp['text']) for l in blk['lines'] for sp in l['spans']) < 160:
                items.append((bb[1], 'head', clean(' '.join(''.join(sp['text'] for sp in l['spans']) for l in blk['lines']))))
                continue
            lines = []
            for l in blk['lines']:
                if id(l) in skip_lines:
                    continue
                lb = l['bbox']
                if any(center_in(lb, t['bbox']) for t in tables) or any(center_in(lb, f) for f in figs):
                    continue
                t = clean(''.join(s['text'] for s in l['spans']))
                if not t:
                    continue
                if (lb[1] > H * 0.93 or lb[3] < H * 0.045) and (re.fullmatch(r'\d{1,3}', t) or len(t) < 25):
                    continue
                if jfl and (t == 'www.jfl.com.br' or (re.fullmatch(r'\d{1,3}', t) and lb[1] > H * 0.8)):
                    continue
                if not jfl and re.fullmatch(r'\d{1,3}', t) and (lb[1] > H * 0.9 or lb[3] < H * 0.08):
                    continue
                lines.append(l)
            if lines:
                items.append((lines[0]['bbox'][1], 'blk', lines))
        items.sort(key=lambda x: x[0])

        if jfl:
            for e in pend:
                e['done'] = False

        for y, kind, obj in items:
            if kind == 'apl':
                b.emit(apl_html(page, obj))
                continue
            if kind == 'head':
                nh = norm(obj)
                ent = None
                for e in pend:
                    if not e['done'] and (e['n'] == nh or e['n'].startswith(nh) or nh.startswith(e['n'])):
                        ent = e
                        break
                if ent:
                    ent['done'] = True
                    b.new_node(min(ent['lvl'], 4), ent['t'], pn)
                else:
                    mnum = re.match(r'^(\d+(?:\.\d+)*)\.?\s', obj)
                    if mnum:
                        b.new_node(min(mnum.group(1).count('.') + 1, 4), obj, pn)
                    else:
                        b.emit(f'<h6>{esc(obj)}</h6>')
                continue
            if kind == 'table':
                if skip:
                    continue
                b.emit(table_html(obj['rows']))
                continue
            if kind == 'fig':
                if skip:
                    continue
                r = b.save_fig(page, obj)
                if not r:
                    continue
                src, w, h = r
                b.emit(f'<figure><img src="{src}" width="{w}" height="{h}" loading="lazy" alt="Figura da página {pn + 1}"><figcaption>Figura · pág. {pn + 1}</figcaption></figure>')
                continue
            lines = obj
            buf, bkind = [], 'p'
            i = 0
            while i < len(lines):
                l = lines[i]
                raw = clean(''.join(s['text'] for s in l['spans']))
                head = None
                if jfl and False:
                    nl = norm(raw)
                    for e in pend:
                        if e['done'] or not nl:
                            continue
                        if nl == e['n']:
                            head = (e, 1)
                            break
                        if e['n'].startswith(nl) and len(nl) >= 4 and i + 1 < len(lines):
                            nl2 = nl + norm(clean(''.join(s['text'] for s in lines[i + 1]['spans'])))
                            if nl2 == e['n']:
                                head = (e, 2)
                                break
                    if head:
                        flush_para(b, buf, bkind); buf, bkind = [], 'p'
                        e, used = head
                        e['done'] = True
                        b.new_node(min(e['lvl'], 4), e['t'], pn)
                        i += used
                        continue
                    if all(any(raw == m or raw.startswith(m) for m in MODELOS_JFL) for _ in [0]) and is_apl_line(l):
                        flush_para(b, buf, bkind); buf, bkind = [], 'p'
                        b.emit(apl_html(page, l))
                        i += 1
                        continue
                elif not jfl:
                    nxt = lines[i + 1] if i + 1 < len(lines) else None
                    solo = nxt is None or not all('Bold' in s['font'] for s in nxt['spans'] if s['text'].strip()) or nxt['bbox'][1] - l['bbox'][3] > 4
                    prv = lines[i - 1] if i > 0 else None
                    if prv is not None and not re.sub(r'<[^>]+>', '', line_text(prv)).strip().endswith(('.', ':')) and l['bbox'][1] - prv['bbox'][3] < 2:
                        solo = False
                    c = classify_intelbras(l, pn, solo)
                    if c and c[0] in ('h1', 'h2'):
                        lvl0, t0 = c
                        while i + 1 < len(lines):
                            nl = lines[i + 1]
                            sp = [x for x in nl['spans'] if x['text'].strip()]
                            nt = clean(''.join(x['text'] for x in nl['spans']))
                            same = sp and abs(sp[0]['size'] - [x for x in l['spans'] if x['text'].strip()][0]['size']) < 0.4 and sp[0]['font'] == [x for x in l['spans'] if x['text'].strip()][0]['font']
                            if same and not re.match(r'^\d+\.', nt) and nl['bbox'][1] - l['bbox'][3] < 6:
                                t0 = t0 + ' ' + nt
                                l = nl
                                i += 1
                            else:
                                break
                        c = (lvl0, t0)
                    if c:
                        lvl, t = c
                        flush_para(b, buf, bkind); buf, bkind = [], 'p'
                        if lvl == 'h1':
                            if t in ('Índice', 'Manual do usuário'):
                                skip = True
                                i += 1
                                continue
                            skip = False
                            if b.cur and b.cur['lvl'] == 1 and not b.cur['h'] and b.cur['pg'] == pn + 1 and not re.match(r'^\d', t):
                                b.cur['t'] += ' ' + t
                            else:
                                b.new_node(1, t, pn)
                        elif not skip:
                            b.new_node({'h2': 2, 'h3': 3, 'h4': 4}[lvl], t, pn)
                        i += 1
                        continue
                if skip:
                    i += 1
                    continue
                rich = line_text(l)
                plain = re.sub(r'<[^>]+>', '', rich)
                if BULLET.match(plain):
                    flush_para(b, buf, bkind)
                    rich = BULLET.sub('', rich, count=1) if BULLET.match(rich) else re.sub(r'^(<b>)?\s*(?:»+|•|▪)\s*', r'\1', rich)
                    buf, bkind = [rich], 'li'
                elif re.match(r'^\d{1,2}[\.\)]\s', plain) and buf:
                    flush_para(b, buf, bkind)
                    buf, bkind = [rich], 'p'
                elif CMD.match(plain) or NOTE.match(rich):
                    flush_para(b, buf, bkind)
                    buf, bkind = [rich], 'p'
                else:
                    buf.append(rich)
                i += 1
            flush_para(b, buf, bkind)

        if jfl:
            for e in pend:
                if not e['done']:
                    b.new_node(min(e['lvl'], 4), e['t'], pn)
                    e['done'] = True

    for n in b.nodes:
        h = ''.join(n['h'])
        h = re.sub(r'((?:<li>.*?</li>)+)', r'<ul>\1</ul>', h)
        n['h'] = h
    return b.nodes, b.nfig


def is_apl_line(l):
    t = clean(''.join(s['text'] for s in l['spans']))
    rest = t
    found = 0
    for m in sorted(MODELOS_JFL, key=len, reverse=True):
        if m in rest:
            rest = rest.replace(m, ' ')
            found += 1
    return found >= 3 and not rest.strip()


_draw_cache = {}


def apl_html(page, grp):
    key = page.number
    if key not in _draw_cache:
        _draw_cache[key] = [(d['rect'], d.get('fill')) for d in page.get_drawings() if d['rect'].width < 12 and d['rect'].height < 12 and d.get('fill')]
    marks = _draw_cache[key]
    out = []
    for l, m in sorted(grp, key=lambda x: x[0]['bbox'][0]):
        x = l['bbox'][0]
        y = (l['bbox'][1] + l['bbox'][3]) / 2
        best = None
        for r, fill in marks:
            if abs((r.y0 + r.y1) / 2 - y) < 6 and -2 <= x - r.x1 < 14:
                best = fill
        ok = not (best and best[0] > 0.6 and best[2] < 0.3)
        out.append(f'<span class="apl {"ok" if ok else "no"}">{"✓" if ok else "✗"} {esc(m)}</span>')
    return '<p class="apls">' + ''.join(out) + '</p>'


def apl_html_old(page, l):
    key = page.number
    if key not in _draw_cache:
        _draw_cache[key] = [(d['rect'], d.get('fill')) for d in page.get_drawings() if d['rect'].width < 12 and d['rect'].height < 12 and d.get('fill')]
    marks = _draw_cache[key]
    y = (l['bbox'][1] + l['bbox'][3]) / 2
    words = page.get_text('words', clip=fitz.Rect(0, l['bbox'][1] - 1, page.rect.width, l['bbox'][3] + 1))
    words.sort(key=lambda w: w[0])
    out = []
    i = 0
    while i < len(words):
        matched = None
        for m in sorted(MODELOS_JFL, key=len, reverse=True):
            parts = m.split()
            seg = [w[4] for w in words[i:i + len(parts)]]
            if seg == parts:
                matched = (m, words[i][0], len(parts))
                break
        if not matched:
            i += 1
            continue
        m, x, k = matched
        ok = True
        best = None
        for r, fill in marks:
            if abs((r.y0 + r.y1) / 2 - y) < 6 and 0 <= x - r.x1 < 14:
                best = fill
        if best and best[0] > 0.6 and best[2] < 0.3:
            ok = False
        out.append(f'<span class="apl {"ok" if ok else "no"}">{"✓" if ok else "✗"} {esc(m)}</span>')
        i += k
    return '<p class="apls">' + ''.join(out) + '</p>'


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'data'), exist_ok=True)
    only = sys.argv[1:] or [m['id'] for m in MANUAIS]
    for cfg in MANUAIS:
        if cfg['id'] not in only:
            continue
        nodes, nf = build(cfg)
        data = dict(id=cfg['id'], marca=cfg['marca'], nome=cfg['nome'], pdf='manuais/' + cfg['pdf'],
                    paginas=len(fitz.open(os.path.join(UP, cfg['pdf']))), secoes=nodes)
        js = 'window.MANUAIS=window.MANUAIS||{};window.MANUAIS[' + json.dumps(cfg['id']) + ']=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
        with open(os.path.join(OUT, 'data', cfg['id'] + '.js'), 'w', encoding='utf-8') as f:
            f.write(js)
        print(cfg['id'], len(nodes), 'seções', nf, 'figuras', round(len(js) / 1024), 'KB')
