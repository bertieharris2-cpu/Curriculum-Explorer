import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
tpl = open(os.path.join(HERE,'hub_template.html'), encoding='utf-8').read()
data = json.load(open(os.path.join(HERE,'out','data.json'), encoding='utf-8'))
# Published artifact links — these stay fixed; republishing updates the same pages.
MAIN_URL = 'https://claude.ai/artifact/G7ZgXPAjHHUDJkphQ8K5ty'
PFA_URL  = 'https://claude.ai/artifact/7ecDGZ4qhk3cJs66RNoXBf'
main_url, pfa_url = MAIN_URL, PFA_URL
raw = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
def page(mode, title, other_url, other_label, out):
    h = (tpl.replace('__TITLE__', title).replace('__VERSION__', data['version']).replace('__BUILT__', data['built'])
           .replace('__OTHER_URL__', other_url).replace('__OTHER_LABEL__', other_label)
           .replace('__MODE__', mode).replace('__DATA__', raw))
    open(out, 'w', encoding='utf-8').write(h); print(out, len(h)//1024, 'KB')
page('main', 'Bettws Maths Curriculum Hub', pfa_url, 'Go to the PFA Curriculum Hub →', os.path.join(HERE,'out','bettws-maths-hub.html'))
page('pfa', 'Bettws PFA Curriculum Hub', main_url, '← Go to the Maths Curriculum Hub', os.path.join(HERE,'out','bettws-pfa-hub.html'))
