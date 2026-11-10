"""Bake the extracted data into the pages.

    python3 build.py          out/: the two hubs and the two Explorer files (single, self-contained HTML)
    python3 build.py --site   site/: the GitHub Pages copy (hubs, Explorer with its offline files, landing page)

The Explorer is assembled from explorer/: index.html (shell), proto-core.css (the stylesheet
of Bertie's reviewed prototype), app.css (additions: PFA mode, print, the card maker), app.js,
the fonts (Lexend and Atkinson Hyperlegible Mono), the logo and faces images, jsPDF, and, for
Bertie's version only, shapes.css + shapes.js (the strand-shapes module). Everything is inlined,
so each file works offline on its own. Run extract.py first (and validate.py before that).
"""
import json, sys, os, base64
HERE = os.path.dirname(os.path.abspath(__file__))
tpl = open(os.path.join(HERE,'hub_template.html'), encoding='utf-8').read()
data = json.load(open(os.path.join(HERE,'out','data.json'), encoding='utf-8'))
# Published artifact links — these stay fixed; republishing updates the same pages.
MAIN_URL = 'https://claude.ai/artifact/G7ZgXPAjHHUDJkphQ8K5ty'
PFA_URL  = 'https://claude.ai/artifact/7ecDGZ4qhk3cJs66RNoXBf'
# `python3 build.py --site` builds the GitHub Pages copy into site/: same pages, but the
# hubs link to each other by relative path, plus an index.html landing page.
SITE = '--site' in sys.argv[1:]
if SITE:
    OUT = os.path.join(HERE, 'site')
    main_url, pfa_url = 'bettws-maths-hub.html', 'bettws-pfa-hub.html'
else:
    OUT = os.path.join(HERE, 'out')
    main_url, pfa_url = MAIN_URL, PFA_URL
os.makedirs(OUT, exist_ok=True)
raw = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
def page(mode, title, other_url, other_label, out):
    h = (tpl.replace('__TITLE__', title).replace('__VERSION__', data['version']).replace('__BUILT__', data['built'])
           .replace('__OTHER_URL__', other_url).replace('__OTHER_LABEL__', other_label)
           .replace('__MODE__', mode).replace('__DATA__', raw))
    open(out, 'w', encoding='utf-8').write(h); print(out, len(h)//1024, 'KB')
page('main', 'Bettws Maths Curriculum Hub', pfa_url, 'Go to the PFA Curriculum Hub →', os.path.join(OUT,'bettws-maths-hub.html'))
page('pfa', 'Bettws PFA Curriculum Hub', main_url, '← Go to the Maths Curriculum Hub', os.path.join(OUT,'bettws-pfa-hub.html'))

# ------------------------------------------------------------------ the Explorer
EX = os.path.join(HERE, 'explorer')
def read(*p): return open(os.path.join(EX, *p), encoding='utf-8').read()
def b64(*p): return base64.b64encode(open(os.path.join(EX, *p), 'rb').read()).decode('ascii')
def script_safe(js): return js.replace('</script', '<\\/script')   # a literal </script would end the inline block

# The fonts: Lexend (OFL, variable weight, two unicode-range subsets) for everything, Atkinson
# Hyperlegible Mono (OFL) for the codes. Both come from the reviewed prototype.
FONTS = [('Lexend', 'Lexend-Variable-latin.woff2', '100 900', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'),
         ('Lexend', 'Lexend-Variable-latin-ext.woff2', '100 900', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'),
         ('Atkinson Hyperlegible Mono', 'AtkinsonHyperlegibleMono-Variable.woff2', '200 800', None)]
def font_css():
    return '\n'.join('@font-face{font-family:\'%s\';font-style:normal;font-display:swap;font-weight:%s;src:url(data:font/woff2;base64,%s) format(\'woff2\');%s}'
                     % (fam, wt, b64('fonts', f), ('unicode-range:%s;' % ur) if ur else '') for fam, f, wt, ur in FONTS)

edata = json.load(open(os.path.join(HERE,'out','explorer-data.json'), encoding='utf-8'))
learner = None
for name in sorted(os.listdir(os.path.join(EX, 'private'))) if os.path.isdir(os.path.join(EX, 'private')) else []:
    if name.lower().endswith('.ttf'): learner = b64('private', name)
assets = json.dumps({'logo': 'data:image/png;base64,' + b64('assets', 'bettws-logo.png'), 'faces': b64('assets', 'faces.png'), 'learnerFont': learner or ''})
print('Explorer: learner font', ('embedded from explorer/private/' if learner else 'not present (explorer/private/ is empty) — the card uses Helvetica'))

shell = read('index.html'); core_css = read('proto-core.css'); app_css = read('app.css'); app_js = read('app.js'); jspdf = read('vendor', 'jspdf.umd.min.js')
shapes_css = read('shapes.css'); shapes_js = read('shapes.js'); fonts = font_css()
def explorer(variant, out, site):
    d = dict(edata); d['variant'] = variant; d['site'] = site
    head = '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icon-180.png">' if site else ''
    bertie = variant == 'bertie'
    h = (shell.replace('__TITLE__', 'Bettws Curriculum Explorer' + (" (Bertie's version)" if bertie else ''))
              .replace('__VERSION__', edata['version']).replace('__BUILT__', edata['built']).replace('__HEAD_EXTRA__', head).replace('__VARIANT__', variant)
              .replace('__FONT_CSS__', fonts).replace('__CORE_CSS__', core_css).replace('__APP_CSS__', app_css)
              .replace('__SHAPES_CSS__', ('<style>\n' + shapes_css + '\n</style>') if bertie else '')
              .replace('__SHAPES_JS__', ('<script>\n' + script_safe(shapes_js) + '\n</script>') if bertie else '')
              .replace('__DATA__', json.dumps(d, ensure_ascii=False).replace('</', '<\\/'))
              .replace('/*__JSPDF__*/', script_safe(jspdf)).replace('__ASSETS__', script_safe(assets)).replace('__APP_JS__', script_safe(app_js)))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(h); print(out, len(h)//1024, 'KB')

def icons(folder):
    """Home-screen icons: the logo on its white plate."""
    try:
        from PIL import Image
    except ImportError:
        print('  (Pillow not installed: no icons made)'); return
    logo = Image.open(os.path.join(EX, 'assets', 'bettws-logo.png')).convert('RGBA')
    for size in (180, 192, 512):
        plate = Image.new('RGBA', (size, size), (255, 255, 255, 255))
        inner = int(size * 0.82); w, h = logo.size; sc = min(inner / w, inner / h)
        im = logo.resize((max(1, int(w * sc)), max(1, int(h * sc))), Image.LANCZOS)
        plate.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
        plate.convert('RGB').save(os.path.join(folder, 'icon-%d.png' % size), optimize=True)

if SITE:
    for variant, folder in (('staff', 'explorer'), ('bertie', 'explorer-bertie')):
        dest = os.path.join(OUT, folder); os.makedirs(dest, exist_ok=True)
        explorer(variant, os.path.join(dest, 'index.html'), True)
        open(os.path.join(dest, 'sw.js'), 'w', encoding='utf-8').write(read('sw.js').replace('__VERSION__', edata['version']).replace('__BUILT__', edata['built']))
        json.dump({'name': 'Bettws Curriculum Explorer' + (" (Bertie's version)" if variant == 'bertie' else ''), 'short_name': 'Curriculum', 'start_url': './', 'scope': './',
                   'display': 'standalone', 'background_color': '#e8ede7', 'theme_color': '#1b3326', 'lang': 'en-GB',
                   'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'}]},
                  open(os.path.join(dest, 'manifest.webmanifest'), 'w', encoding='utf-8'), indent=1)
        icons(dest)
    index = open(os.path.join(HERE,'index_template.html'), encoding='utf-8').read()
    index = index.replace('__VERSION__', data['version']).replace('__BUILT__', data['built'])
    open(os.path.join(OUT,'index.html'), 'w', encoding='utf-8').write(index); print(os.path.join(OUT,'index.html'))
else:
    explorer('staff', os.path.join(OUT, 'bettws-curriculum-explorer.html'), False)
    explorer('bertie', os.path.join(OUT, 'bettws-curriculum-explorer-bertie.html'), False)
