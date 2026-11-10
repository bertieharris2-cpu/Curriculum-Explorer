"""Read the Bettws master dataset into JSON for the three pages.

    python3 extract.py

Writes two files:
  out/data.json           everything the two hubs show (Bertie's working views)
  out/explorer-data.json  only what the staff Curriculum Explorer shows: live
                          statements, their small steps and questions, the B Squared
                          step, phase and level notes, and the mapped enquiries.
                          Working columns (qc_verdict, qc_comment, source, boundary_note,
                          ladder_note, notes) and working sheets (BSquared_Archive,
                          BSquared_Links, Gaps_Register, Checks, Mappings, CfW_Reference,
                          README) never reach it.
Layer sheets are found by name: every sheet called *_Layers (layer / ref / text), plus
Algebra_WPS3_Detail and PFA_Layers. A blank ref repeats the ref above it (a merged cell).
Run validate.py first; it checks the workbook before anything is built.
"""
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
if sum(1 for f in files if vernum(f) == vernum(SRC)) > 1:
    raise SystemExit('Two dataset files share version v%d.%d — keep one and remove the other.' % vernum(SRC))
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
live['row_order'] = range(len(live))   # dataset row order, the last tie-breaker when sorting

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
CODE_OF = {s: v.split(' — ')[0] for s, v in STRAND_SHORT.items()}
STRAND_OF_CODE = {c: s for s, c in CODE_OF.items()}

# B Squared steps, as the BSquared_Archive sheet labels them, plus the WPS fallback labels
# (ruled 01-11-26) for ladder statements that have no B Squared equivalent.
BSQUARED_STEPS = ['Pre-4','Pre-5','Pre-6','1.1','1.2','2.1','2.2','2.3','3.1','3.2','3.3']
WPS_FALLBACK = ['WPS 1','WPS 2.1','WPS 2.2','WPS 2.3','WPS 2.1/2.2','WPS 3']
def parse_bsquared(v):
    """'2.1, 2.2' -> ['2.1','2.2']; 'WPS 2.1+' kept as given; blank or unknown -> [] (never guessed)."""
    v = clean(v)
    if v is None: return []
    if isinstance(v, float) and v == int(v): v = str(v)
    parts = [p.strip() for p in re.split(r'[,;/·]+(?!\d)', str(v)) if p.strip()]
    out = []
    for p in parts:
        if p in BSQUARED_STEPS or p in WPS_FALLBACK or (p.endswith('+') and p[:-1] in WPS_FALLBACK): out.append(p)
    return out

ids = list(live.bettws_id.astype(str))
idset = set(ids)
all_ids = set(df.bettws_id.dropna().astype(str))
# regex to find ids inside layer refs (longest first)
id_re = re.compile('|'.join(sorted((re.escape(i) for i in ids), key=len, reverse=True)))

HAS_BSQ = 'bsquared_step' in live.columns
stm = {}
for _, r in live.iterrows():
    d = {k: clean(r[k]) for k in ['bettws_id','curriculum','strand','sub_strand','level','statement','headline',
        'pfa_class','boundary_note','phase_number','phase_title','notes','delivery','thread_tags','purpose',
        'sort_order','pfa_area','contexts','ladder_or_exposure','ladder_note','number_demand']}
    d['bettws_id'] = str(d['bettws_id'])
    d['row_order'] = int(r['row_order'])
    d['bsquared'] = parse_bsquared(r['bsquared_step']) if HAS_BSQ else []
    d['layers'] = []   # {kind, text, ref, src}
    d['raw'] = []      # {layer, text} as the sheet labels them, for the Explorer
    stm[d['bettws_id']] = d

# ------------------------------------------------------------------ layer sheets
# Hub kinds (the hubs' coloured rows). The Explorer reads the raw layer labels instead.
KIND_MAP = {'L2-detail':'step','L2-subdetail':'substep','L2-step':'step','L3-step':'step','L2-variation':'step',
  'L3-probe':'probe','L3-pattern-probe':'probe','L3-ask-yourself':'probe',
  'L2-advice':'advice','L2-language':'advice','L2-scaffold':'advice','L2-grid':'advice','pedagogy':'advice','taught':'advice',
  'L1-intro':'advice','L1-teaching-note':'advice','L1-example':'advice','L1-teach-order':'advice','L1-vocabulary':'advice',
  'L3-misconception':'misconception','L1-link':'link','L1-related':'link','L1-secure-first':'link','context-tag':'link',
  'L0b-rubric':'rubric','L0b-transition':'rubric','L0b-exit':'exit','L2-what-counts':'anchor',
  'ruling':'ruling','big-idea':'ruling','L0-strand':'ruling','L1-bigidea':'ruling','L1-level-idea':'ruling','L1-strand-tagline':'ruling','thread':'ruling',
  'pending':'pending','L1-wording-proposal':'pending','L1-proposed-statement':'pending',
  'L1-label':'note','L1-nsm-ref':'note','L1-note':'note'}

SHEET_STRAND = {'NCP_WPS3_Layers':'Number, Calculation & Pattern','NCP_WPS2_Layers':'Number, Calculation & Pattern','NCP_WPS1_Layers':'Number, Calculation & Pattern',
  'Algebra_WPS3_Layers':'Algebra','Statistics_Layers':'Statistics','PDM_Layers':'Position, Direction & Movement',
  'Shape_Layers':'Shape in Use — Fitting & Constructing','DUR_Layers':'Duration — Time as a Measure','FDP_Layers':'Fractions, Decimals & Percentages',
  'Money_Layers':'Money','Time_Layers':'Time — Telling the Time','Measures_Layers':'Length & Height','AR_Layers':'Angles & Rotation','Probability_Layers':'Probability'}
layer_sheets = [s for s in x.sheet_names if s.endswith('_Layers') and s != 'PFA_Layers']

def strand_of_ref(ref, sheet):
    """Which strand a strand-level row belongs to: a strand name or code at the start of the ref, else the sheet's own."""
    for s in STRAND_ORDER:
        if ref.startswith(s): return s
    m = re.match(r'^([A-Z]{2,4})\b', ref)
    if m and m.group(1) in STRAND_OF_CODE: return STRAND_OF_CODE[m.group(1)]
    return SHEET_STRAND.get(sheet, sheet.replace('_Layers', ''))

PHASE_RE = re.compile(r'^WPS (\d(?:\.\d)?) · Phase (\d+)')
LEVEL_RE = re.compile(r'^(.+?) · (WPS [0-9.]+(?:/[0-9.]+)?(?: [a-z]+)?)$')
strand_layers = {}   # strand -> [ {kind,text,ref} ]  (hubs)
phase_meta = {}      # 'WPS 2.1|1' -> {'bigidea': [...], 'note': [...]}  (Explorer: the number spine's phases)
level_meta = {}      # strand -> level -> {'idea': [...], 'tagline': [...], 'vocabulary': [...]}  (Explorer)
dropped_refs = []    # layer rows that name a statement which is not live (reported, never shown)
for sheet in layer_sheets:
    d = x.parse(sheet)
    last_ref = ''
    for _, r in d.iterrows():
        ref = clean(r['ref']); text = clean(r['text']); layer = clean(r['layer'])
        if ref is None or ref == '': ref = last_ref        # a blank ref repeats the one above (merged cell)
        else: last_ref = ref
        if not text or not layer: continue
        kind = KIND_MAP.get(layer, 'note')
        found = id_re.findall(ref)
        if found:
            for i in dict.fromkeys(found):
                stm[i]['layers'].append({'kind': kind, 'text': text, 'ref': ref if len(found) > 1 else None, 'src': sheet})
                stm[i]['raw'].append({'layer': layer, 'text': text, 'src': sheet})
            continue
        if re.search(r'\b[A-Z]{2,4}-(W1-P\d+-|\d(\.\d)?-)\d+', ref) and not any(k in ref for k in all_ids):
            dropped_refs.append((sheet, ref)); continue
        strand = strand_of_ref(ref, sheet)
        pm = PHASE_RE.match(ref)
        if pm and sheet.startswith('NCP_'):
            key = 'WPS %s|%s' % (pm.group(1), pm.group(2))
            slot = 'bigidea' if layer == 'L1-bigidea' else 'note'
            phase_meta.setdefault(key, {}).setdefault(slot, []).append(text)
        lm = LEVEL_RE.match(ref)
        if lm and layer in ('L1-level-idea', 'L1-strand-tagline', 'L1-vocabulary'):
            slot = {'L1-level-idea': 'idea', 'L1-strand-tagline': 'tagline', 'L1-vocabulary': 'vocabulary'}[layer]
            level_meta.setdefault(strand, {}).setdefault(lm.group(2), {}).setdefault(slot, []).append(text)
        strand_layers.setdefault(strand, []).append({'kind': kind, 'text': text, 'ref': ref, 'layer': layer})

# Algebra detail sheet
alg = x.parse('Algebra_WPS3_Detail')
AK = {'detail':'step','probing_question':'probe','sign_off_anchor':'anchor','pedagogy_note':'advice'}
ARAW = {'detail':'L2-detail','probing_question':'L3-probe','sign_off_anchor':'L2-what-counts','pedagogy_note':'L2-advice'}
algmeta = {}
for _, r in alg.iterrows():
    i = str(clean(r['bettws_id'])); text = clean(r['text'])
    if i not in stm or not text: continue
    stm[i]['layers'].insert(0 if r['row_kind']=='detail' else len(stm[i]['layers']),
        {'kind': AK.get(r['row_kind'],'note'), 'text': text, 'ref': None, 'src': 'Algebra_WPS3_Detail'})
    stm[i]['raw'].append({'layer': ARAW.get(r['row_kind'], 'L1-note'), 'text': text, 'src': 'Algebra_WPS3_Detail'})
    algmeta[i] = {'order': int(r['presentation_order']), 'rung': clean(r['rung']), 'type': clean(r['type']), 'gate': clean(r['gate'])}
for i, m in algmeta.items(): stm[i]['alg'] = m

# PFA layers
pl = x.parse('PFA_Layers')
pfa_entitlement = []
for _, r in pl.iterrows():
    i = str(clean(r['statement_id'])); text = clean(r['text']); layer = clean(r['layer'])
    if not text: continue
    if i in stm:
        stm[i]['layers'].append({'kind': 'step' if layer == 'step' else layer, 'text': text, 'ref': None, 'src': 'PFA_Layers'})
        stm[i]['raw'].append({'layer': 'pfa-step' if layer == 'step' else 'pfa-' + str(layer), 'text': text, 'src': 'PFA_Layers'})
    elif i == 'PFA-JI':
        pfa_entitlement.append({'kind': layer, 'text': text})
    else:
        dropped_refs.append(('PFA_Layers', i))

gaps = [{k: clean(r[k]) for k in ['gap_id','item','status','note']} for _, r in x.parse('Gaps_Register').iterrows() if clean(r['gap_id'])]
def gap_open(s):
    s = (s or '').lower()
    return not any(w in s for w in ['resolved','superseded','done','closed','agreed','designed','unblocked'])
for g in gaps: g['open'] = gap_open(g['status'])

nlo = [{k: clean(r[k]) for k in ['order','phase','item','lands_in','needs_first','enquiry_homes','flag']} for _, r in x.parse('New_Learning_Order').iterrows()]

readme = [clean(v) for v in x.parse('README').iloc[:,0] if clean(v)]

# Mapped enquiries (Enquiry_Links): enquiry -> phases -> rows. Read-only in the Explorer.
enquiries = []
if 'Enquiry_Links' in x.sheet_names:
    el = x.parse('Enquiry_Links')
    byname = {}
    for _, r in el.iterrows():
        name = clean(r['enquiry']); i = clean(r['bettws_id'])
        if not name or not i: continue
        i = str(i)
        e = byname.setdefault(name, {'title': name, 'phases': {}})
        try: pno = int(r['phase_no'])
        except (TypeError, ValueError): pno = 99
        ph = e['phases'].setdefault(pno, {'no': pno, 'title': clean(r['phase']) or ('Phase %d' % pno), 'rows': []})
        ph['rows'].append({'id': i, 'live': i in stm, 'kind': clean(r['kind']), 'nested_under': clean(r['nested_under']),
                           'context': clean(r['context']), 'task': clean(r['task']), 'status': clean(r['status']), 'note': clean(r['note'])})
    for e in byname.values():
        e['phases'] = [e['phases'][k] for k in sorted(e['phases'])]
        e['statement_count'] = len({row['id'] for ph in e['phases'] for row in ph['rows'] if row['live']})
        enquiries.append(e)

built = datetime.date.today().isoformat()
data = {
  'version': VERSION, 'source': os.path.basename(SRC), 'built': built,
  'levelOrder': LEVEL_ORDER, 'strandOrder': STRAND_ORDER, 'strandShort': STRAND_SHORT,
  'statements': [{k: v for k, v in s.items() if k != 'raw'} for s in stm.values()], 'strandLayers': strand_layers, 'entitlement': pfa_entitlement,
  'gaps': gaps, 'newLearningOrder': nlo, 'enquiries': enquiries,
}
os.makedirs(os.path.join(HERE,'out'), exist_ok=True)
json.dump(data, open(os.path.join(HERE,'out','data.json'),'w'), ensure_ascii=False)
print(len(stm), 'statements;', sum(len(s['layers']) for s in stm.values()), 'layer rows attached from', len(layer_sheets), 'layer sheets;',
      sum(len(v) for v in strand_layers.values()), 'strand-level rows;', len(gaps), 'gaps;', len(enquiries), 'enquiries')
if dropped_refs:
    print(len(dropped_refs), 'layer rows name a statement that is not live and were dropped:',
          ', '.join(sorted({'%s: %s' % d for d in dropped_refs})))

# ---------------------------------------------------------------- staff Explorer data
# Only the staff-facing fields. The raw layer labels decide what each row is:
#   steps      L2-step, L2-detail, L3-step (+ Algebra details; PFA steps where a statement has no others)
#   subs       L2-subdetail, nested under the step before it
#   variations L2-variation ("any of these count")
#   questions  L3-probe, L3-pattern-probe (asked of the child)      ask  L3-ask-yourself (for the adult)
#   counts     L2-what-counts, the Algebra sign-off anchors           watch L3-misconception
#   notes      L1-intro, L1-teaching-note, L2-advice, L2-scaffold, L2-grid, L1-example, L1-related, L1-secure-first
#   label      L1-label (the WPS 1 row label)
# Working rows (L1-note, pending, ruling, L1-wording-proposal, L1-proposed-statement, L1-nsm-ref,
# L1-teach-order, context-tag, thread) stay in the hubs only.
NUM_RE = re.compile(r'^(?:\d+(?:\.\d+)*|[①②③④⑤⑥⑦⑧⑨])\s{2,}')
def unnumber(t): return NUM_RE.sub('', t)
STAFF_FIELDS = ['bettws_id','curriculum','strand','sub_strand','level','statement','headline','pfa_class','pfa_area',
                'phase_number','phase_title','purpose','sort_order','delivery','thread_tags','ladder_or_exposure','row_order','bsquared']
explorer_statements = []
for s in stm.values():
    e = {k: s.get(k) for k in STAFF_FIELDS}
    steps, variations, questions, ask, counts, watch, notes, labels = [], [], [], [], [], [], [], []
    for row in s['raw']:
        L, t = row['layer'], row['text']
        if L in ('L2-step', 'L2-detail', 'L3-step'): steps.append({'text': unnumber(t), 'subs': []})
        elif L == 'L2-subdetail':
            if steps: steps[-1]['subs'].append(unnumber(t))
            else: steps.append({'text': unnumber(t), 'subs': []})
        elif L == 'L2-variation': variations.append(unnumber(t))
        elif L in ('L3-probe', 'L3-pattern-probe'): questions.append(t)
        elif L == 'L3-ask-yourself': ask.append(t)
        elif L == 'L2-what-counts': counts.append(t)
        elif L == 'L3-misconception': watch.append(t)
        elif L in ('L1-intro', 'L1-teaching-note', 'L2-advice', 'L2-scaffold', 'L2-grid', 'L1-example', 'L1-related', 'L1-secure-first', 'L2-language'):
            notes.append(('Secure first: ' + t) if L == 'L1-secure-first' else t)
        elif L == 'L1-label': labels.append(t)
    if not steps:
        steps = [{'text': unnumber(row['text']), 'subs': []} for row in s['raw'] if row['layer'] == 'pfa-step']
    e.update({'steps': steps, 'variations': variations, 'questions': questions, 'ask': ask, 'counts': counts, 'watch': watch, 'notes': notes,
              'label': labels[0] if labels else None})
    if 'alg' in s: e['alg'] = s['alg']
    explorer_statements.append(e)

no_bsq = [s['bettws_id'] for s in explorer_statements if not s['bsquared'] and s['ladder_or_exposure'] == 'Ladder']
explorer = {
  'version': VERSION, 'source': os.path.basename(SRC), 'built': built,
  'levelOrder': LEVEL_ORDER, 'strandOrder': STRAND_ORDER, 'strandShort': STRAND_SHORT, 'bsquaredSteps': BSQUARED_STEPS + WPS_FALLBACK,
  'statements': explorer_statements, 'entitlement': pfa_entitlement, 'enquiries': enquiries,
  'phaseMeta': phase_meta, 'levelMeta': level_meta,
  'report': {'live': len(explorer_statements), 'ladderNoBsquared': len(no_bsq), 'bsquaredColumn': HAS_BSQ,
             'withSteps': sum(1 for s in explorer_statements if s['steps'])},
}
json.dump(explorer, open(os.path.join(HERE,'out','explorer-data.json'),'w'), ensure_ascii=False)
print('Explorer:', len(explorer_statements), 'live statements;', explorer['report']['withSteps'], 'with small steps;',
      ('bsquared_step column present; ' if HAS_BSQ else 'no bsquared_step column yet; ') +
      '%d ladder statements have no B Squared step or fallback label' % len(no_bsq))
