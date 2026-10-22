import os, json, hashlib, glob
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
shell = ['./', 'index.html', 'leitor.html', 'manifest.json', 'css/style.css', 'css/leitor.css',
         'js/app.js', 'js/theme.js', 'js/leitor.js', 'js/pwa.js',
         'assets/logo-vegas.png', 'assets/vegon-poster.jpg'] + sorted(glob.glob('assets/icons/*.png')) + sorted(glob.glob('data/*.js'))
figuras = sorted(glob.glob('assets/manuais/*/*.webp'))
h = hashlib.sha1()
for f in shell + figuras:
    if f != './':
        h.update(open(f, 'rb').read())
versao = h.hexdigest()[:10]
tpl = open('tools/sw.template.js', encoding='utf-8').read()
out = tpl.replace('__VERSAO__', versao).replace('__SHELL__', json.dumps(shell)).replace('__FIGURAS__', json.dumps(figuras))
open('sw.js', 'w', encoding='utf-8').write(out)
print('sw.js versão', versao, '|', len(shell), 'arquivos base +', len(figuras), 'figuras')
