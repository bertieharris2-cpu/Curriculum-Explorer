import pandas as pd, json, re, math

import glob, os, datetime
# Always use the highest-numbered dataset in ./dataset — never an older version.
HERE = os.path.dirname(os.path.abspath(__file__))
files = glob.glob(os.path.join(HERE, 'dataset', 'Bettws-Master-Dataset-v*.xlsx'))
if not files:
    raise SystemExit('No Bettws-Master-Dataset-v*.xlsx found in ./dataset — drop the current file there first.')
def vernum(p):
    m = re.search(r'v(\d+)[_.](\d+)', os.path.basename(p)); return (int(m.group(1)), int(m.group(2))) if m else (0, 0)
SRC = max(files, key=vernum)
VERSION = 'v%d.%d' % vernum(SRC)
print('Using', os.path.basename(SRC), '->', VERSION)
x = pd.ExcelFile(SRC)

def clean(v):
    if v is None: return None
    if isinstance(v, float) and math.isnan(v): return None
    if isinstance(v, str): return v.strip()
    return v

df = x.parse('Bettws_Statements')
live = df[df.status == 'live'].copy()

LEVEL_ORDER = ['WPS 1 · Phase 1','WPS 1 · Phase 2','WPS 1 · Phase 3','WPS 1 · Phase 4','WPS 1 · Phase 5',
  'WPS 1 · Phase 6','WPS 1 · Phase 7','WPS 1 · Phase 8','WPS 1 · Phase 9','WPS 1 · Phase 10',
  'WPS 2.1','WPS 2.1/2.2 spiral','WPS 2.2','WPS 2.3','WPS 2 (collapsed)','WPS 3','PFA']

STRAND_ORDER = ['Number, Calculation & Pattern','Fractions, Decimals & Percentages','Algebra','Money',
  'Length & Height','Mass','Capacity','Temperature',
  'Time — Telling the Time','Time — Analogue Clock','Time — Calendar Structure','Duration — Time as a Measure',
  'Shape in Use — Fitting & Constructing','Shape in Use — Area & Perimeter','Shape in Use — Formal Ladder',
  'Position, Direction & Movement','Angles & Rotation','Statistics','Probability',
  'PFA Maths','PFA · Joining In & Belonging','PFA · Managing Money','PFA · Managing a Home','PFA · Managing Myself','PFA · Participating in Society']

# short plain-language reminders per strand (Bertie's rule: codes always carry a reminder)
STRAND_SHORT = {
 'Number, Calculation & Pattern':'NCP — the number spine: counting, place value, calculation',
 'Fractions, Decimals & Percentages':'FDP — parts of a whole, decimals, percentages',
 'Algebra':'ALG — the equals sign, arithmetic laws, patterns, machines, unknowns (WPS 3 ladder)',
 'Money':'MON — coins, amounts, change, shopping, planning',
 'Length & Height':'LEN — measuring how long and how tall',
 'Mass':'MAS — measuring how heavy',
 'Capacity':'CAP — measuring how much a container holds',
 'Temperature':'TEM — reading and comparing temperatures',
 'Time — Telling the Time':'TTT — reading clocks and times',
 'Time — Analogue Clock':'ACL — the analogue clock pathway',
 'Time — Calendar Structure':'CAL — days, weeks, months, dates',
 'Duration — Time as a Measure':'DUR — how long something takes',
 'Shape in Use — Fitting & Constructing':'FIT — making, fitting and building with shapes',
 'Shape in Use — Area & Perimeter':'AAP — covering space and going round the edge',
 'Shape in Use — Formal Ladder':'SHP — formal shape properties (qualification track only)',
 'Position, Direction & Movement':'PDM — where things are, giving and following directions, maps',
 'Angles & Rotation':'AR — turning, angles, pie charts',
 'Statistics':'STAT — My Data and Critical Numeracy',
 'Probability':'PROB — chance and likelihood',
 'PFA Maths':'PFA-M — the number destinations and reasoning statements for the PFA route',
 'PFA · Joining In & Belonging':'JI — the people: interests, joining in, relationships',
 'PFA · Managing Money':'MM — money in real life',
 'PFA · Managing a Home':'MH — running a home',
 'PFA · Managing Myself':'MS — looking after myself, my time, my wellbeing',
 'PFA · Participating in Society':'PS — the systems: rights, services, safety, work',
}

ids = list(live.bettws_id)
idset = set(ids)
# regex to find ids inside layer refs (longest first)
id_re = re.compile('|'.join(sorted((re.escape(i) for i in ids), key=len, reverse=True)))

stm = {}
for _, r in live.iterrows():
    d = {k: clean(r[k]) for k in ['bettws_id','curriculum','strand','sub_strand','level','statement','headline',
        'pfa_class','boundary_note','phase_number','phase_title','notes','delivery','thread_tags','purpose',
        'sort_order','pfa_area','contexts','ladder_or_exposure','ladder_note','number_demand']}
    d['layers'] = []   # {kind, text, src}
    stm[d['bettws_id']] = d

# strand-level notes (layer rows that name no statement)
strand_layers = {}  # strand -> [ {kind,text,ref} ]
SHEET_STRAND = {'Algebra_WPS3_Layers':'Algebra','Statistics_Layers':'Statistics','PDM_Layers':'Position, Direction & Movement',
  'Shape_Layers':'Shape in Use — Fitting & Constructing','DUR_Layers':'Duration — Time as a Measure','FDP_Layers':'Fractions, Decimals & Percentages'}

KIND_MAP = {'L2-detail':'step','L3-step':'step','L3-probe':'probe','L2-advice':'advice','L2-language':'advice',
  'L2-scaffold':'advice','L3-misconception':'misconception','L1-link':'link','L0b-rubric':'rubric','L0b-exit':'exit',
  'L0b-transition':'rubric','ruling':'ruling','pending':'pending','big-idea':'ruling','pedagogy':'advice',
  'context-tag':'link','L2-grid':'advice','taught':'advice','L0-strand':'ruling'}

for sheet, strand in SHEET_STRAND.items():
    d = x.parse(sheet)
    for _, r in d.iterrows():
        ref = clean(r['ref']) or ''; text = clean(r['text']); layer = clean(r['layer'])
        if not text: continue
        kind = KIND_MAP.get(layer, 'note')
        found = id_re.findall(ref)
        if found:
            for i in dict.fromkeys(found):
                stm[i]['layers'].append({'kind': kind, 'text': text, 'ref': ref if len(found) > 1 else None})
        else:
            strand_layers.setdefault(strand, []).append({'kind': kind, 'text': text, 'ref': ref})

# Algebra detail sheet
alg = x.parse('Algebra_WPS3_Detail')
AK = {'detail':'step','probing_question':'probe','sign_off_anchor':'anchor','pedagogy_note':'advice'}
algmeta = {}
for _, r in alg.iterrows():
    i = clean(r['bettws_id']); text = clean(r['text'])
    if i not in stm or not text: continue
    stm[i]['layers'].insert(0 if r['row_kind']=='detail' else len(stm[i]['layers']),
        {'kind': AK.get(r['row_kind'],'note'), 'text': text, 'ref': None})
    algmeta[i] = {'order': int(r['presentation_order']), 'rung': clean(r['rung']), 'type': clean(r['type']), 'gate': clean(r['gate'])}
for i, m in algmeta.items(): stm[i]['alg'] = m

# PFA layers
pl = x.parse('PFA_Layers')
pfa_entitlement = []
for _, r in pl.iterrows():
    i = clean(r['statement_id']); text = clean(r['text']); layer = clean(r['layer'])
    if not text: continue
    if i in stm:
        stm[i]['layers'].append({'kind': 'step' if layer == 'step' else layer, 'text': text, 'ref': None})
    elif i == 'PFA-JI':
        pfa_entitlement.append({'kind': layer, 'text': text})

gaps = [{k: clean(r[k]) for k in ['gap_id','item','status','note']} for _, r in x.parse('Gaps_Register').iterrows() if clean(r['gap_id'])]
def gap_open(s):
    s = (s or '').lower()
    return not any(w in s for w in ['resolved','superseded','done','closed','agreed','designed','unblocked'])
for g in gaps: g['open'] = gap_open(g['status'])

nlo = [{k: clean(r[k]) for k in ['order','phase','item','lands_in','needs_first','enquiry_homes','flag']} for _, r in x.parse('New_Learning_Order').iterrows()]

readme = [clean(v) for v in x.parse('README').iloc[:,0] if clean(v)]

data = {
  'version': VERSION, 'source': os.path.basename(SRC), 'built': datetime.date.today().isoformat(),
  'levelOrder': LEVEL_ORDER, 'strandOrder': STRAND_ORDER, 'strandShort': STRAND_SHORT,
  'statements': list(stm.values()), 'strandLayers': strand_layers, 'entitlement': pfa_entitlement,
  'gaps': gaps, 'newLearningOrder': nlo,
}
json.dump(data, open(os.path.join(HERE,'out','data.json'),'w'), ensure_ascii=False)
print(len(stm), 'statements;', sum(len(s['layers']) for s in stm.values()), 'layer rows attached;',
      sum(len(v) for v in strand_layers.values()), 'strand-level rows;', len(gaps), 'gaps')
