"""Check the master dataset before anything is built, and write the change report.

    python3 validate.py            check the workbook; exit 1 if a check fails
    python3 validate.py --record   also write CHANGES.md and build/manifest.json
                                   (run only after a successful build)

Checks (the brief's list):
  1. the required sheets and columns exist;
  2. no duplicate bettws_id among live rows;
  3. every layer row that names a statement names one the dataset knows. A reference to a
     statement that is no longer live is a WARNING (the row is dropped by extract.py and
     listed here); a reference to an id the dataset has never had is a FAILURE (a typo);
  4. live statements counted by curriculum and strand and compared with the last recorded
     build (build/manifest.json). A changed count is reported, not failed; an empty
     dataset, or a main/PFA split of zero, fails.
  5. the bsquared_step column: unknown labels are listed; missing values are counted.
If any check fails nothing is published: fix the workbook (or report the problem) first.
"""
import sys, os, re, json, glob, math, datetime
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RECORD = '--record' in sys.argv[1:]
MANIFEST = os.path.join(HERE, 'build', 'manifest.json')
CHANGES = os.path.join(HERE, 'CHANGES.md')

REQUIRED = {
  'Bettws_Statements': ['bettws_id','curriculum','strand','sub_strand','level','statement','headline','status','pfa_class',
                        'phase_number','phase_title','notes','delivery','thread_tags','purpose','sort_order','pfa_area','ladder_or_exposure'],
  'NCP_WPS3_Layers': ['layer','ref','text'], 'FDP_Layers': ['layer','ref','text'], 'Shape_Layers': ['layer','ref','text'],
  'PDM_Layers': ['layer','ref','text'], 'DUR_Layers': ['layer','ref','text'], 'Statistics_Layers': ['layer','ref','text'],
  'Algebra_WPS3_Layers': ['layer','ref','text'],
  'Algebra_WPS3_Detail': ['bettws_id','presentation_order','row_kind','text'],
  'PFA_Layers': ['statement_id','layer','text'],
  'Enquiry_Links': ['enquiry','phase_no','phase','bettws_id','kind','task'],
  'Gaps_Register': ['gap_id','item','status','note'], 'New_Learning_Order': ['order','phase','item'], 'README': [],
}
BSQUARED_STEPS = ['Pre-4','Pre-5','Pre-6','1.1','1.2','2.1','2.2','2.3','3.1','3.2','3.3']
ID_SHAPE = re.compile(r'\b[A-Z]{2,4}-(?:W1-P\d+-|\d(?:\.\d)?-|M-|[A-Z]{2}-)\d+[A-Z]?\b')

fails, warns, info = [], [], []

def clean(v):
    if v is None or (isinstance(v, float) and math.isnan(v)): return None
    return v.strip() if isinstance(v, str) else v

files = glob.glob(os.path.join(HERE, 'dataset', 'Bettws-Master-Dataset-v*.xlsx'))
def vernum(p):
    m = re.search(r'v(\d+)[_.](\d+)', os.path.basename(p)); return (int(m.group(1)), int(m.group(2))) if m else (0, 0)
if not files:
    fails.append('No Bettws-Master-Dataset-v*.xlsx in dataset/.')
    src = None
else:
    src = max(files, key=vernum)
    if sum(1 for f in files if vernum(f) == vernum(src)) > 1:
        fails.append('Two dataset files share version v%d.%d. Keep one.' % vernum(src))
VERSION = 'v%d.%d' % vernum(src) if src else '?'

x = pd.ExcelFile(src) if src and not fails else None
if x is not None:
    for sheet, cols in REQUIRED.items():
        if sheet not in x.sheet_names:
            fails.append('Sheet %s is missing.' % sheet); continue
        have = list(x.parse(sheet, nrows=0).columns)
        missing = [c for c in cols if c not in have]
        if missing: fails.append('Sheet %s is missing column(s): %s.' % (sheet, ', '.join(missing)))

live = None
if x is not None and not fails:
    df = x.parse('Bettws_Statements')
    live = df[df.status == 'live']
    dup = live.bettws_id[live.bettws_id.duplicated()].unique().tolist()
    if dup: fails.append('Duplicate bettws_id among live rows: %s.' % ', '.join(map(str, dup)))
    all_ids = set(df.bettws_id.dropna().astype(str))
    live_ids = set(live.bettws_id.astype(str))
    id_re = re.compile('|'.join(sorted((re.escape(i) for i in all_ids), key=len, reverse=True)))
    for sheet in ['NCP_WPS3_Layers','FDP_Layers','Shape_Layers','PDM_Layers','DUR_Layers','Statistics_Layers','Algebra_WPS3_Layers']:
        d = x.parse(sheet)
        for _, r in d.iterrows():
            ref = str(clean(r['ref']) or '')
            known = set(id_re.findall(ref))
            for k in known:
                if k not in live_ids: warns.append('%s: "%s" names %s, which is not live; the row is dropped.' % (sheet, ref, k))
            for shaped in ID_SHAPE.findall(ref):
                pass
            for m in ID_SHAPE.finditer(ref):
                cand = m.group(0)
                if cand not in all_ids and not any(cand in k for k in known) and not cand.startswith('GAP-'):
                    fails.append('%s: "%s" names %s, an id the dataset has never had (typo?).' % (sheet, ref, cand))
    pl = x.parse('PFA_Layers')
    for i in pl.statement_id.dropna().astype(str).unique():
        if i == 'PFA-JI': continue
        if i not in all_ids: fails.append('PFA_Layers names %s, an id the dataset has never had.' % i)
        elif i not in live_ids: warns.append('PFA_Layers: rows for %s point at a statement that is not live; dropped.' % i)
    al = x.parse('Algebra_WPS3_Detail')
    for i in al.bettws_id.dropna().astype(str).unique():
        if i not in all_ids: fails.append('Algebra_WPS3_Detail names %s, an id the dataset has never had.' % i)
        elif i not in live_ids: warns.append('Algebra_WPS3_Detail: rows for %s point at a statement that is not live; dropped.' % i)
    el = x.parse('Enquiry_Links')
    for i in el.bettws_id.dropna().astype(str).unique():
        if i not in live_ids and not i.startswith('DCF-'):
            warns.append('Enquiry_Links names %s, which is not a live statement; shown as text only.' % i)
    # counts
    n = len(live); by_cur = live.curriculum.value_counts().to_dict(); by_strand = live.strand.value_counts().to_dict()
    if n == 0: fails.append('No live statements.')
    if by_cur.get('main', 0) == 0 or (by_cur.get('pfa', 0) + by_cur.get('both', 0)) == 0:
        fails.append('Live statements are missing a whole curriculum: %s.' % by_cur)
    info.append('%d live statements: %s.' % (n, ', '.join('%s %d' % (k, v) for k, v in sorted(by_cur.items()))))
    # B Squared column
    if 'bsquared_step' in live.columns:
        bad, empty = [], 0
        for _, r in live.iterrows():
            v = clean(r['bsquared_step'])
            if v is None: empty += 1; continue
            if isinstance(v, float) and v == int(v): v = str(v)
            parts = [p.strip() for p in re.split(r'[,;/·]+', str(v)) if p.strip()]
            for p in parts:
                if p not in BSQUARED_STEPS: bad.append('%s: %s' % (r['bettws_id'], p))
        if bad: warns.append('bsquared_step has labels that are not B Squared steps (ignored, never guessed): %s.' % ', '.join(bad))
        info.append('%d of %d live statements have no B Squared step yet.' % (empty, n))
    else:
        info.append('No bsquared_step column yet: all %d live statements count as "no B Squared step". The card line is left blank for them.' % n)

# ------------------------------------------------------------- compare with the last build
def snapshot():
    out = {}
    for _, r in live.iterrows():
        out[str(r['bettws_id'])] = {'strand': clean(r['strand']), 'level': clean(r['level']), 'curriculum': clean(r['curriculum']),
                                   'text': clean(r['statement'])}
    return out

changes = None
if live is not None and not fails:
    now = snapshot()
    prev = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else None
    if prev:
        was = prev['statements']
        added = sorted(i for i in now if i not in was)
        retired = sorted(i for i in was if i not in now)
        reworded = sorted(i for i in now if i in was and (was[i]['text'] or '') != (now[i]['text'] or ''))
        moved = sorted(i for i in now if i in was and (was[i]['strand'], was[i]['level']) != (now[i]['strand'], now[i]['level']))
        changes = {'from': prev['version'], 'added': added, 'retired': retired, 'reworded': reworded, 'moved': moved, 'was': was, 'now': now,
                   'wasCounts': prev['counts'], 'nowCounts': {'total': len(now), 'curriculum': by_cur, 'strand': by_strand}}
        for k, v in sorted(by_strand.items()):
            w = prev['counts']['strand'].get(k, 0)
            if w != v: info.append('%s: was %d live statements, now %d.' % (k, w, v))
        for k, w in prev['counts']['strand'].items():
            if k not in by_strand: info.append('%s: was %d live statements, now none.' % (k, w))
        if not (added or retired or reworded or moved): info.append('No statement added, retired, reworded or moved since %s.' % prev['version'])
    else:
        info.append('No earlier build recorded, so there is nothing to compare this one with.')

# ------------------------------------------------------------------------ report
print('Dataset %s%s' % (VERSION, ' (' + os.path.basename(src) + ')' if src else ''))
for f in fails: print('FAIL ', f)
for w in warns: print('warn ', w)
for i in info: print('info ', i)
if fails:
    print('\n%d check(s) failed. Nothing is published; the previous site stays live.' % len(fails))
    sys.exit(1)
print('\nAll checks passed.' + (' %d warning(s) above are known dataset quirks, not page bugs.' % len(warns) if warns else ''))

if RECORD:
    today = datetime.date.today().isoformat()
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    lines = ['# Changes', '', 'Written by `validate.py --record` after each successful build. WAS is the last recorded build, NOW is this one.', '']
    old = ''
    if os.path.exists(CHANGES):
        old = open(CHANGES, encoding='utf-8').read()
        old = old.split('\n', 4)[-1] if old.startswith('# Changes') else old   # keep earlier entries under the new one
    hdr = ['## %s · built %s' % (VERSION, today)]
    if changes:
        hdr.append('')
        hdr.append('WAS %s: %d live statements. NOW %s: %d live statements.' % (changes['from'], changes['wasCounts']['total'], VERSION, changes['nowCounts']['total']))
        def row(i, extra=''):
            s = changes['now'].get(i) or changes['was'].get(i)
            return '- `%s` · %s · %s%s' % (i, s['strand'], s['level'], extra)
        sections = [('Added', changes['added'], lambda i: row(i)),
                    ('Retired (no longer live)', changes['retired'], lambda i: row(i)),
                    ('Reworded', changes['reworded'], lambda i: row(i, '\n  - WAS: ' + (changes['was'][i]['text'] or '') + '\n  - NOW: ' + (changes['now'][i]['text'] or ''))),
                    ('Moved', changes['moved'], lambda i: row(i, ' (WAS %s · %s)' % (changes['was'][i]['strand'], changes['was'][i]['level'])))]
        for title, items, fmt in sections:
            hdr.append(''); hdr.append('### %s (%d)' % (title, len(items)))
            hdr.extend(fmt(i) for i in items) if items else hdr.append('- none')
    else:
        hdr.append('')
        hdr.append('First recorded build: %d live statements (%s). Nothing earlier to compare with.' %
                   (len(now), ', '.join('%s %d' % (k, v) for k, v in sorted(by_cur.items()))))
    hdr.append('')
    for w in warns: hdr.append('- Warning: ' + w)
    for i in info: hdr.append('- ' + i)
    open(CHANGES, 'w', encoding='utf-8').write('\n'.join(lines + hdr) + '\n\n' + old.lstrip('\n'))
    json.dump({'version': VERSION, 'built': today, 'counts': {'total': len(now), 'curriculum': by_cur, 'strand': by_strand},
               'statements': now}, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('Wrote CHANGES.md and build/manifest.json for', VERSION)
