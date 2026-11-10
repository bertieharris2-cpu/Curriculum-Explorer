/* Bettws Curriculum Explorer — the staff app.
 *
 * Plain JavaScript, no framework, no network calls, nothing tracked. The dataset is baked
 * in as JSON by build.py. The look and the shell follow Bertie's reviewed prototype of
 * 31-10: a green side menu of strands in six families, a slim top bar, progression levels
 * side by side on a rail you slide across, statements as plain rows that open into bulleted
 * small steps, three text sizes, light and dark.
 *
 * Content rules (CLAUDE.md): statements shown exactly as the dataset has them; the code
 * small at the end of the line; the main view carries no PFA labels, badges, counts or
 * mentions; the PFA section is its own mode in its own colour.
 */
(function () {
'use strict';
const D = JSON.parse(document.getElementById('data').textContent);
const VARIANT = D.variant || 'staff', SITE = !!D.site, BERTIE = VARIANT === 'bertie';
const A = window.LI_ASSETS || {};
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem('bx-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('bx-' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } } };
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

/* ---------- the dataset, shaped for the pages ---------- */
const CODE_OF = {}, BLURB = {};
Object.keys(D.strandShort).forEach(s => { const [c, b] = D.strandShort[s].split(' — '); CODE_OF[s] = c; BLURB[s] = b || ''; });
const NCP = 'Number, Calculation & Pattern';
const isLife = s => s.strand.indexOf('PFA ·') === 0;
const LO = {}; D.levelOrder.forEach((l, i) => LO[l] = i);
const lvIndex = l => LO[l] == null ? 99 : LO[l];
function cmp(a, b) {
  const so = (a.sort_order == null ? 9999 : a.sort_order) - (b.sort_order == null ? 9999 : b.sort_order); if (so) return so;
  const li = lvIndex(a.level) - lvIndex(b.level); if (li) return li;
  const ph = (a.phase_number == null ? 999 : a.phase_number) - (b.phase_number == null ? 999 : b.phase_number); if (ph) return ph;
  if (a.alg && b.alg && a.alg.order !== b.alg.order) return a.alg.order - b.alg.order;
  return a.row_order - b.row_order;
}
const mapLv = l => l === 'WPS 2.1/2.2 spiral' ? 'spiral' : l === 'WPS 2 (collapsed)' ? 'WPS 2' : l.indexOf('WPS 1') === 0 ? 'WPS 1' : l;
function shape(s) {
  const r = { id: s.bettws_id, lv: mapLv(s.level), level: s.level, t: s.statement, k: s.ladder_or_exposure === 'Ladder' ? 'L' : s.ladder_or_exposure ? 'R' : '',
    w: s.purpose && (isLife(s) || !/\bPFA\b/.test(s.purpose)) ? s.purpose : '', ph: s.phase_number, pt: s.phase_title || (s.level === 'WPS 2.1/2.2 spiral' ? s.sub_strand : null),
    code: CODE_OF[s.strand] || s.strand, strand: s.strand, sub: s.sub_strand, hl: s.headline, bsq: s.bsquared || [], pfa: s.pfa_class, area: s.pfa_area, label: s.label,
    thread: s.delivery === 'thread' || !!s.thread_tags, tags: s.thread_tags, sort: s.sort_order, curriculum: s.curriculum };
  if (s.alg) { r.rung = s.alg.rung; r.type = s.alg.type; r.gate = s.alg.gate; }
  if (s.steps.length || s.variations.length || s.questions.length || s.ask.length || s.counts.length || s.watch.length || s.notes.length)
    r.L = { s: s.steps.map(x => [x.text, x.subs]), v: s.variations, q: s.questions, a: s.ask, c: s.counts, w: s.watch, n: s.notes };
  return r;
}
const ALL = D.statements.slice().sort(cmp).map(shape);
const byId = {}; ALL.forEach(s => byId[s.id] = s);
const MAIN = ALL.filter(s => s.curriculum === 'main' && s.strand.indexOf('PFA') !== 0);
const ST = {}; MAIN.forEach(s => (ST[s.code] = ST[s.code] || []).push(s));
const SM = {}; Object.keys(D.strandShort).forEach(s => { SM[CODE_OF[s]] = { name: s, blurb: BLURB[s] }; });
const LIFE = ALL.filter(s => s.strand.indexOf('PFA ·') === 0);
const DEST = ALL.filter(s => s.pfa === 'PFA-direct' && s.strand.indexOf('PFA ·') !== 0 && s.strand !== NCP);
const ROUTE = ALL.filter(s => s.strand === NCP && (s.pfa === 'PFA-direct' || s.pfa === 'PFA-feeder'));
Object.assign(window.__ST = window.__ST || {}, ST);   /* the strand-shapes module (Bertie's version) reads the same statements */
const ENQ = D.enquiries.map(e => ({ title: e.title, phases: e.phases.map(p => ({ n: p.no, title: p.title, links: p.rows.map(r => ({ id: r.id, kind: r.kind, task: r.task, nested: !!r.nested_under, text: byId[r.id] ? byId[r.id].t : '' })) })) }));
const ANY_BSQ = ALL.some(s => s.bsq.length);

/* ---------- curriculum structure ---------- */
const FAMS = [['Number', 'number', ['NCP', 'FDP', 'ALG']], ['Money', 'money', ['MON']], ['Measures', 'measures', ['LEN', 'MAS', 'CAP', 'TEM', 'DUR']], ['Time', 'time', ['CAL', 'TTT', 'ACL']], ['Shape and space', 'shape', ['FIT', 'AAP', 'SHP', 'AR', 'PDM']], ['Data', 'data', ['STAT', 'PROB']]]
  .map(f => [f[0], f[1], f[2].filter(c => ST[c])]).filter(f => f[2].length);
const famOf = c => FAMS.find(f => f[2].includes(c)) || ['Other', 'number', []];
const famVar = c => `--fam:var(--f-${famOf(c)[1]})`;
const LVORDER = ['WPS 1', 'WPS 2.1', 'spiral', 'WPS 2', 'WPS 2.2', 'WPS 2.3', 'WPS 3'];
const LVNAME = { 'WPS 2': 'WPS 2 · one band', spiral: 'Spiral blocks' };
const LVSHORT = { 'WPS 1': '1', 'WPS 2.1': '2.1', spiral: 'Spiral', 'WPS 2': '2 band', 'WPS 2.2': '2.2', 'WPS 2.3': '2.3', 'WPS 3': '3' };
const LVSLUG = { 'WPS 1': 'w1', 'WPS 2.1': 'w21', spiral: 'spiral', 'WPS 2': 'w2', 'WPS 2.2': 'w22', 'WPS 2.3': 'w23', 'WPS 3': 'w3' };
const SLUGLV = Object.fromEntries(Object.entries(LVSLUG).map(([a, b]) => [b, a]));
const SHAPE = {
  ladder: ['Climb in order', 'L', 'ladder', 'Each level builds on the one before. Teach it in this order.'],
  loop: ['Climb, then keep using it', 'L', 'ladder', 'A ladder through WPS 2. From WPS 3 the skills are used again and again in enquiries and routine.'],
  measure: ['Measure it', 'R', 'repeat', 'Every measure has the same five moves: compare, own units, estimate and check, record with the unit, standard units.'],
  spiral: ['Come round again', 'R', 'repeat', 'The same ideas, revisited and deepened. No step has to wait for another.'],
  daily: ['Picked up every day', 'D', 'cal', 'Learned from the daily routine. The levels say what to expect by when, not what to teach next.']
};
const SHAPE_OF = { NCP: 'ladder', FDP: 'ladder', ACL: 'ladder', ALG: 'ladder', SHP: 'ladder', MON: 'loop', TTT: 'loop', LEN: 'measure', MAS: 'measure', CAP: 'measure', TEM: 'measure', DUR: 'measure', FIT: 'spiral', AAP: 'spiral', AR: 'spiral', PDM: 'spiral', STAT: 'spiral', PROB: 'spiral', CAL: 'daily' };
const levelsOf = c => LVORDER.filter(l => ST[c].some(s => s.lv === l)).map(l => ({ lv: l, items: ST[c].filter(s => s.lv === l) }));
const groups = list => { const g = []; list.forEach(s => { const k = (s.ph || '') + '|' + (s.pt || ''); const last = g[g.length - 1]; if (!last || last.k !== k) g.push({ k, n: s.ph, t: s.pt, items: [s], lv: s.lv }); else last.items.push(s); }); return g; };
const stepsCount = c => ST[c].filter(s => s.L && s.L.s.length).length;
const phaseMeta = (lv, n) => (D.phaseMeta || {})[lv + '|' + n] || {};
const levelIdea = (c, lv) => { const m = ((D.levelMeta || {})[SM[c] ? SM[c].name : ''] || {})[lv]; return m && m.idea ? m.idea[0] : ''; };

/* ---------- icons ---------- */
const P = {
  book: 'M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z', grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  shapes: 'M5 20V4 M5 8h6 M5 14h6 M5 20h6 M15 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0', compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5z',
  cards: 'M4 6h16v12H4z M8 10h8 M8 14h5', note: 'M5 4h14v12l-4 4H5z M15 20v-4h4 M8 9h8 M8 13h5', search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5L20 20',
  left: 'M14 6l-6 6 6 6', right: 'M10 6l6 6-6 6', plus: 'M12 5v14 M5 12h14', check: 'M5 12.5l4.5 4.5L19 7.5', x: 'M6 6l12 12 M18 6L6 18',
  ladder: 'M7 3v18 M17 3v18 M7 7.5h10 M7 12h10 M7 16.5h10', repeat: 'M4 11V8h13 M14 5l3 3-3 3 M20 13v3H7 M10 19l-3-3 3-3', cal: 'M4 6h16v14H4z M4 10h16 M9 3v5 M15 3v5',
  full: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5', exitfull: 'M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5', mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5 11a7 7 0 0 0 14 0 M12 18v3',
  flag: 'M5 21V4 M5 4h12l-2 4 2 4H5', collapse: 'M15 6l-6 6 6 6 M20 4v16', expand: 'M9 6l6 6-6 6 M4 4v16', up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4 12H2 M22 12h-2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',
  print: 'M6 9V3h12v6 M6 18H3v-9h18v9h-3 M6 14h12v7H6z', pfa: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 3', download: 'M12 4v12 M7 11l5 5 5-5 M4 20h16', open: 'M14 4h6v6 M20 4l-9 9 M19 13v7H4V5h7',
  pupils: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M16 4.3a3.5 3.5 0 0 1 0 6.4 M18 14a5 5 0 0 1 3 4.6V20'
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${P[n].split(' M').map((d, i) => `<path d="${i ? 'M' : ''}${d}"/>`).join('')}</svg>`;
const shapeChip = c => { const s = SHAPE[SHAPE_OF[c] || 'spiral']; return `<span class="chip ${s[1]}">${ic(s[2])}${s[0]}</span>`; };
const kindChip = s => s.k === 'L' ? `<span class="chip L">${ic('ladder')}Ladder</span>` : s.k === 'R' ? `<span class="chip R">${ic('repeat')}Met again and again</span>` : '';
const bsqChip = s => s.bsq.length ? `<span class="chip B" title="B Squared step">B² ${esc(s.bsq.join(', '))}</span>` : '';

/* ---------- state ---------- */
const S = {
  view: 'browse', strand: 'NCP', mode: 'side', level: null, q: '', focus: null, enq: 0,
  exp: new Set(), all: store.get('all', false), menu: store.get('menu', 'wide'), fs: store.get('fs', 1),
  theme: store.get('theme', window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  review: BERTIE && store.get('review', false), basket: (store.get('basket', []) || []).filter(id => byId[id]), panel: false
};
const PFA_VIEWS = ['pfa', 'outcomes', 'destinations', 'route'];
const inPfa = () => PFA_VIEWS.includes(S.view);

/* ---------- routing: plain #names only ---------- */
function hashOf() {
  if (S.view === 'strand') return '#s-' + S.strand.toLowerCase() + (S.mode === 'one' && S.level ? '-' + LVSLUG[S.level] : '');
  if (S.view === 'shapes' && window.XP && XP.state.tab !== 'shapes') return '#shapes-' + XP.state.tab;
  if (S.view === 'enquiry') return '#enquiry' + (S.enq ? '-' + S.enq : '');
  return '#' + S.view;
}
function fromHash() {
  const h = location.hash.replace('#', '');
  const m = /^s-([a-z]+)(?:-([a-z0-9]+))?$/.exec(h);
  if (m && ST[m[1].toUpperCase()]) { S.view = 'strand'; S.strand = m[1].toUpperCase(); S.mode = m[2] ? 'one' : 'side'; S.level = m[2] ? SLUGLV[m[2]] : null; return; }
  const sm = /^shapes-([a-z]+)$/.exec(h);
  if (sm && BERTIE && window.XP && XP.tabs.includes(sm[1])) { S.view = 'shapes'; XP.state.tab = sm[1]; return; }
  if (h === 'shapes' && window.XP) XP.state.tab = 'shapes';
  const em = /^enquiry-(\d+)$/.exec(h);
  if (em && ENQ[+em[1]]) { S.view = 'enquiry'; S.enq = +em[1]; return; }
  const views = ['browse', 'map', 'enquiries', 'enquiry', 'intentions', 'card', 'search', 'pfa', 'outcomes', 'destinations', 'route', 'pupils'];
  if (BERTIE) views.push('shapes', 'reviews');
  if (views.includes(h)) { S.view = h; return; }
  S.view = 'browse';
}
function go(patch, opts) {
  Object.assign(S, patch);
  const h = hashOf();
  if (location.hash !== h) { try { history.pushState(null, '', h); } catch (e) { location.hash = h; } }
  render(opts);
}
window.addEventListener('popstate', () => { fromHash(); render(); });
window.addEventListener('hashchange', () => { fromHash(); render(); });

/* ---------- statement row ---------- */
function isOpen(id) { return S.all !== S.exp.has(id); }
function stmt(s, o) {
  o = o || {};
  const L = s.L, open = L && isOpen(s.id), inB = S.basket.includes(s.id);
  const more = open ? `<div class="more">
      ${L.s.length ? `<h5>Small steps</h5><ul class="ss">${L.s.map(([t, subs]) => `<li>${esc(t)}${subs.length ? `<ul>${subs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>` : ''}
      ${L.v.length ? `<h5>Any of these count</h5><ul class="ss">${L.v.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${L.c.length ? L.c.map(t => `<p class="note"><b>What counts. </b>${esc(t)}</p>`).join('') : ''}
      ${L.q.length ? `<h5>Questions to ask</h5><ul class="qq">${L.q.map(q => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}
      ${L.a.length ? `<h5>Ask yourself</h5><ul class="qq a">${L.a.map(q => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}
      ${L.w.length ? L.w.map(t => `<p class="note"><b>Watch for. </b>${esc(t)}</p>`).join('') : ''}
      ${L.n.length ? L.n.map(t => `<p class="note"><b>Teaching note. </b>${esc(t)}</p>`).join('') : ''}
    </div>` : '';
  const tag = o.lvtag ? `<span class="lvtag">${esc(o.lvtag === true ? (LVNAME[s.lv] || s.lv) : o.lvtag)}</span>` : '';
  return `<div class="st ${L ? 'has' : ''} ${open ? 'open' : ''} ${o.stone ? 'stone' : ''}" data-id="${esc(s.id)}" style="${o.fam || famVar(s.code)}">
    <button class="chev ${L ? '' : 'none'}" data-act="tog" data-id="${esc(s.id)}" aria-expanded="${!!open}" aria-label="Small steps" ${L ? '' : 'tabindex="-1"'}>${ic('right')}</button>
    <button class="txt" ${L ? `data-act="tog" data-id="${esc(s.id)}"` : 'tabindex="-1"'}>${s.label && o.labels ? `<span class="lbl">${esc(s.label)}</span>` : ''}${esc(s.t)} <code>${esc(s.id)}</code>${bsqChip(s)}${tag}${o.kind ? kindChip(s) : ''}${o.pfaTags && s.thread ? `<span class="chip D">Thread${s.tags ? ' · ' + esc(s.tags) : ''}</span>` : ''}</button>
    <button class="add ${inB ? 'on' : ''}" data-act="add" data-id="${esc(s.id)}" aria-label="${inB ? 'Remove from' : 'Add to'} learning intentions" title="${inB ? 'On your learning intentions' : 'Add to learning intentions'}">${ic(inB ? 'check' : 'plus')}</button>
    ${s.w ? `<p class="why"><b>Why this matters.</b> ${esc(s.w)}</p>` : ''}${o.task ? `<p class="why"><b>In this enquiry.</b> ${esc(o.task)}</p>` : ''}${more}</div>`;
}
const phaseHead = (g, cls) => (g.n || g.t) ? `<div class="ph ${cls || ''}"><span>${g.n || ''}</span>${esc(g.t || '')}<span class="count">${g.items.length}</span></div>` : '';
const bigIdea = g => { const m = g.n ? phaseMeta(g.lv, g.n) : {}; const t = (m.bigidea && m.bigidea[0]) || ''; return t ? `<p class="idea">${esc(t)}</p>` : ''; };

/* ---------- pages ---------- */
function pBrowse() {
  const total = MAIN.length;
  return `<div class="page"><div class="pad"><div><h1 class="h1">Browse the curriculum</h1><p class="sub" style="margin-top:6px">${total} statements in ${Object.keys(ST).length} strands, in ${FAMS.length} families. Pick a strand to see its levels side by side.</p></div>
    <div class="fams">${FAMS.map(([f, k, cs]) => `<section class="fam" style="--fam:var(--f-${k})"><h2><i></i>${f} <span class="count">${cs.reduce((a, c) => a + ST[c].length, 0)}</span></h2><div class="tiles">${cs.map(c => { const lv = levelsOf(c).map(x => x.lv); const on = ['WPS 1', 'WPS 2.1', 'WPS 2.2', 'WPS 2.3', 'WPS 3'].map((l, i) => lv.includes(l) || (lv.includes('WPS 2') && i >= 1 && i <= 3)); return `<button class="tile" data-go="strand" data-strand="${c}" style="--fam:var(--f-${k})"><b>${esc(SM[c].name)}</b><small>${esc(SM[c].blurb[0].toUpperCase() + SM[c].blurb.slice(1))}</small><span class="ft">${shapeChip(c)}<span class="lvdots" aria-hidden="true">${on.map(o => `<i class="${o ? 'on' : ''}"></i>`).join('')}</span><span class="count">${ST[c].length}</span></span></button>`; }).join('')}</div></section>`).join('')}</div>
    ${printHead('Browse')}</div></div>`;
}
function strandHead(c) {
  const f = famOf(c), n = stepsCount(c);
  return `<header class="sh"><div><p class="crumb"><button data-go="browse">Browse</button> / ${esc(f[0])}</p><h1 class="h1" style="margin-top:4px"><i></i>${esc(SM[c].name)}</h1>
    <p class="meta">${shapeChip(c)}<span>${ST[c].length} statements</span><span>·</span><span>${n ? 'small steps written for ' + n : 'no small steps yet'}</span></p></div>
    <div class="ctl">
      ${S.mode === 'side' ? `<div class="mini" id="mini">${levelsOf(c).map((x, k) => `<button data-act="lvgo" data-v="${k}" title="${esc(LVNAME[x.lv] || x.lv)}">${LVSHORT[x.lv]}</button>`).join('')}<i class="win" id="win"></i></div><div class="arrows"><button data-act="lvprev" aria-label="Earlier level">${ic('left')}</button><button data-act="lvnext" aria-label="Later level">${ic('right')}</button></div>` : ''}
      <div class="seg" role="radiogroup" aria-label="View"><button data-act="mode" data-v="side" aria-pressed="${S.mode === 'side'}">Side by side</button><button data-act="mode" data-v="one" aria-pressed="${S.mode === 'one'}">One level</button></div>
      <div class="seg"><button data-act="all" aria-pressed="${S.all}" ${n ? '' : 'disabled title="No small steps written for this strand yet"'}>${n ? (S.all ? 'Hide' : 'Show') + ' all small steps' : 'No small steps yet'}</button></div>
    </div></header>`;
}
function pStrand() {
  const c = S.strand, lvs = levelsOf(c), sh = SHAPE_OF[c] || 'spiral';
  if (S.mode === 'one') {
    if (!S.level || !lvs.find(x => x.lv === S.level)) S.level = (lvs.find(x => x.lv === 'WPS 2.2') || lvs[0]).lv;
    const cur = lvs.find(x => x.lv === S.level), gs = groups(cur.items), idea = levelIdea(c, S.level);
    return `<div class="page" style="${famVar(c)}">${strandHead(c)}${printHead(SM[c].name + ' · ' + (LVNAME[S.level] || S.level))}<nav class="ruler">${lvs.map(x => `<button data-act="level" data-v="${x.lv}" aria-current="${x.lv === S.level}"><b>${esc(LVNAME[x.lv] || x.lv)}</b><small>${x.items.length} statements</small></button>`).join('')}</nav>
      <div class="onelist">${idea ? `<p class="idea top">${esc(idea)}</p>` : ''}${gs.map(g => `<div class="keep">${phaseHead(g)}${bigIdea(g)}${g.items.length ? stmt(g.items[0], { labels: true }) : ''}</div>${g.items.slice(1).map(s => stmt(s, { labels: true })).join('')}`).join('')}</div></div>`;
  }
  const climbing = k => sh === 'ladder' || (sh === 'loop' && lvs[k].lv !== 'WPS 3');
  const last = lvs.map((x, k) => climbing(k) ? k : -1).filter(k => k >= 0).pop();
  const rise = k => (sh === 'ladder' || sh === 'loop') ? (last - (climbing(k) ? k : last)) * 22 : 0;
  const join = k => { if (!lvs[k + 1]) return ''; const up = climbing(k) && climbing(k + 1); const lab = up ? 'then' : sh === 'loop' ? 'used again' : sh === 'daily' ? 'every day' : sh === 'measure' ? 'same 5 moves' : 'round again'; return `<div class="join" aria-hidden="true">${ic(up ? 'right' : 'repeat')}<span>${lab}</span></div>`; };
  const cols = lvs.map((x, k) => { const gs = groups(x.items), idea = levelIdea(c, x.lv); return `<section class="col" style="margin-top:${rise(k)}px;max-height:calc(100% - ${rise(k)}px)"><header><b>${esc(LVNAME[x.lv] || x.lv)}</b><span>${x.items.length} statements${gs.filter(g => g.n).length ? ' · ' + gs.filter(g => g.n).length + ' phases' : ''}</span>${idea ? `<p class="idea">${esc(idea)}</p>` : ''}</header><div class="cb">${gs.map(g => `${phaseHead(g)}${g.items.map(s => stmt(s, { labels: true })).join('')}`).join('')}</div></section>${join(k)}`; }).join('');
  return `<div class="strand-page" style="${famVar(c)}">${strandHead(c)}${printHead(SM[c].name)}<div class="rail" id="rail" tabindex="0" aria-label="Levels, scroll across">${cols}<div class="rail-end"></div></div></div>`;
}
function pMap() {
  const COLS = ['WPS 1', 'WPS 2.1', 'WPS 2.2', 'WPS 2.3', 'WPS 3'];
  const t = (n, c, lv, span) => n ? `<button class="bmt" data-go="strand" data-strand="${c}" data-level="${lv}" style="${span ? 'grid-column:span 3;' : ''}background:color-mix(in srgb, var(--fam) ${Math.min(85, 14 + n * 2.2)}%, var(--panel));color:${n > 22 ? 'var(--panel)' : 'var(--ink)'}">${n}</button>` : `<span class="bmt empty" ${span ? 'style="grid-column:span 3"' : ''}></span>`;
  return `<div class="page"><div class="pad"><div><h1 class="h1">Curriculum map</h1><p class="sub" style="margin-top:6px">Strands down the side, levels across. Darker tiles hold more statements; a wide tile is a strand taught as one band across WPS 2. Tap a tile to open that level.</p></div>
    <div class="bmap"><div class="bmrow h"><span></span>${COLS.map(c => `<span style="padding:0 4px">${c}</span>`).join('')}</div>
    ${FAMS.map(([f, k, cs]) => `<div class="bmfam">${f}</div>${cs.map(c => { const n = l => ST[c].filter(s => s.lv === l || (l === 'WPS 2.1' && s.lv === 'spiral')).length; const band = ST[c].filter(s => s.lv === 'WPS 2').length; const cells = band ? t(n('WPS 1'), c, 'WPS 1') + t(band, c, 'WPS 2', true) + t(n('WPS 3'), c, 'WPS 3') : COLS.map(l => t(n(l), c, l)).join(''); return `<div class="bmrow" style="--fam:var(--f-${k})"><button class="nm" data-go="strand" data-strand="${c}"><i></i>${esc(SM[c].name)}</button>${cells}</div>`; }).join('')}`).join('')}</div>${printHead('Curriculum map')}</div></div>`;
}
function pShapes() {
  return `<div class="page"><div class="pad"><div><h1 class="h1">How strands are taught</h1><p class="sub" style="margin-top:6px">Some strands are ladders: learn this, then this, then this. Others come round again. Some change shape partway: a ladder at WPS 2, used again and again at WPS 3.</p></div>
    <section id="xpSec" aria-label="Strand shapes"><div class="xp-tabs" id="xpTabs" role="tablist"></div><div class="xp" id="xpPanel"></div></section></div></div>`;
}
function pPupils() {
  return `<div class="page"><div class="pad"><div><h1 class="h1">My pupils</h1><p class="sub" style="margin-top:6px">Coming in phase 2. Pupil profiles will reach you by QR code from Bertie: a pseudonym, a working level per strand and a few focus statements. Nothing about any pupil is kept in this app yet.</p></div></div></div>`;
}

/* ---------- Preparing for adulthood: its own mode, its own colour ---------- */
const PFV = `--fam:var(--f-pfa)`;
function areaName(s) { return s.strand.replace('PFA · ', ''); }
function pPfa() {
  const parts = [['outcomes', 'The Outcomes', plural(LIFE.length, 'life statement', 'life statements') + ' in five areas, each with why it matters.'],
    ['destinations', 'The Destinations', plural(DEST.length, 'maths statement', 'maths statements') + ' beyond the number spine, by area.'],
    ['route', 'The Number Route', plural(ROUTE.filter(s => s.pfa === 'PFA-direct').length, 'goal', 'goals') + ' on the number spine, with the stepping stones beneath them.']];
  return `<div class="page" style="${PFV}"><div class="pad"><div><h1 class="h1"><i class="fambar"></i>Preparing for adulthood</h1><p class="sub" style="margin-top:6px">The PFA curriculum in three parts, as it stands in the master dataset. Statements here are the ones that matter most for life after school.</p></div>
    <div class="tiles">${parts.map(p => `<button class="tile" data-go="${p[0]}" style="${PFV}"><b>${p[1]}</b><small>${p[2]}</small></button>`).join('')}</div></div></div>`;
}
function pfaPage(title, lead, body) {
  return `<div class="page" style="${PFV}"><div class="pad"><div><p class="crumb"><button data-go="pfa">Preparing for adulthood</button></p><h1 class="h1" style="margin-top:4px"><i class="fambar"></i>${esc(title)}</h1><p class="sub" style="margin-top:6px">${lead}</p></div>${printHead('PFA · ' + title)}<div class="onelist pf">${body}</div></div></div>`;
}
function pOutcomes() {
  const areas = []; LIFE.forEach(s => { let a = areas.find(x => x.name === s.strand); if (!a) areas.push(a = { name: s.strand, items: [] }); a.items.push(s); });
  return pfaPage('The Outcomes', 'The life statements in five areas. Each carries why it matters and, behind a tap, the steps that practise it.',
    areas.map(a => `<div class="keep"><div class="ph big"><span></span>${esc(a.name.replace('PFA · ', ''))}<span class="count">${a.items.length}</span></div>${stmt(a.items[0], { pfaTags: true, fam: PFV })}</div>${a.items.slice(1).map(s => stmt(s, { pfaTags: true, fam: PFV })).join('')}${a.name === 'PFA · Joining In & Belonging' && D.entitlement.length ? `<div class="note" style="margin:10px 0 18px"><b>The experience entitlement.</b> ${D.entitlement.map(e => esc(e.text)).join(' ')}</div>` : ''}`).join(''));
}
function pDestinations() {
  const areas = []; DEST.forEach(s => { const k = s.area || s.strand; let a = areas.find(x => x.name === k); if (!a) areas.push(a = { name: k, items: [] }); a.items.push(s); });
  areas.forEach(a => a.items.sort((x, y) => lvIndex(x.level) - lvIndex(y.level) || x.id.localeCompare(y.id)));
  return pfaPage('The Destinations', 'The maths statements beyond the number spine that lead somewhere in adult life, grouped by area.',
    areas.map(a => `<div class="keep"><div class="ph big"><span></span>${esc(a.name)}<span class="count">${a.items.length}</span></div>${stmt(a.items[0], { lvtag: true, pfaTags: true, fam: PFV })}</div>${a.items.slice(1).map(s => stmt(s, { lvtag: true, pfaTags: true, fam: PFV })).join('')}`).join(''));
}
function pRoute() {
  const lvs = LVORDER.filter(l => ROUTE.some(s => s.lv === l)).map(l => ({ lv: l, items: ROUTE.filter(s => s.lv === l) }));
  return pfaPage('The Number Route', 'The number spine as the PFA route reads it. Goals are in full; the stepping stones beneath them are quieter. Statements that belong to the main curriculum only are left out.',
    lvs.map(x => `<div class="ph big"><span></span>${esc(LVNAME[x.lv] || x.lv)}<span class="count">${x.items.length}</span></div>${groups(x.items).map(g => `<div class="keep">${phaseHead(g)}${g.items.length ? stmt(g.items[0], { stone: g.items[0].pfa !== 'PFA-direct', fam: PFV }) : ''}</div>${g.items.slice(1).map(s => stmt(s, { stone: s.pfa !== 'PFA-direct', fam: PFV })).join('')}`).join('')}`).join(''));
}

/* ---------- enquiries ---------- */
function pEnquiries() {
  return `<div class="page"><div class="pad"><div><h1 class="h1">Enquiries</h1><p class="sub" style="margin-top:6px">Mapped enquiries, read-only. Have an idea? Bring it to Bertie and he'll map it.</p></div>
    ${ENQ.length ? `<div class="tiles" style="max-width:720px">${ENQ.map((e, i) => { const n = e.phases.reduce((a, p) => a + p.links.length, 0); return `<button class="tile" data-go="enquiry" data-enq="${i}" style="--fam:var(--f-number);min-height:0"><b style="font-size:calc(19px * var(--fs))">${esc(e.title)}</b><small>${e.phases.length} phases · ${n} links to statements. From "${esc(e.phases[0].title)}" to "${esc(e.phases[e.phases.length - 1].title)}".</small></button>`; }).join('')}</div>` : '<p class="sub">No enquiries mapped yet.</p>'}</div></div>`;
}
function pEnquiry() {
  const E = ENQ[S.enq] || ENQ[0]; if (!E) return pEnquiries();
  const kind = k => k === 'life-goal' ? 'Life goal' : k === 'dcf' ? 'Digital' : 'Maths';
  return `<div class="page"><div class="pad"><div><p class="crumb"><button data-go="enquiries">Enquiries</button></p><h1 class="h1" style="margin-top:4px">${esc(E.title)}</h1></div>${printHead('Enquiry · ' + E.title)}
    <div>${E.phases.map(p => `<section class="phaseblk keep"><span class="pn">${p.n}</span><div><h3>${esc(p.title)}</h3><ol class="links">${p.links.map(l => `<li class="${l.nested ? 'nested' : ''}"><span class="k">${kind(l.kind)}</span><div><p>${esc(l.task)}</p><p class="lt">${l.text ? esc(l.text) + ' ' : ''}${byId[l.id] ? `<button class="lk" data-act="open" data-id="${esc(l.id)}" title="Open in its strand"><code>${esc(l.id)}</code></button>` : `<code>${esc(l.id)}</code>`}</p></div></li>`).join('')}</ol></div></section>`).join('')}</div>
    <p class="sub">Have an idea? Bring it to Bertie and he'll map it.</p></div></div>`;
}

/* ---------- search ---------- */
function pSearch() {
  const q = S.q.trim().toLowerCase();
  if (q.length < 2) return `<div class="page"><div class="pad"><h1 class="h1">Search</h1><p class="sub">Type at least two letters. Searches the statements, their "why this matters" lines, their codes and their small steps.</p></div></div>`;
  const hit = [];
  const look = (list, grp) => list.forEach(s => { const inT = (s.t + ' ' + s.id + ' ' + (s.w || '')).toLowerCase().includes(q); const L = s.L; const step = !inT && L && L.s ? L.s.map(x => x[0]).find(t => t.toLowerCase().includes(q)) : null; if (inT || step) hit.push({ s, step, grp }); });
  look(MAIN, s => s.code); look(LIFE, () => 'PFA'); look(DEST.filter(s => s.curriculum !== 'main'), () => 'PFA');
  const mk = t => { const i = t.toLowerCase().indexOf(q); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };
  const by = {}; hit.forEach(h => { const k = h.grp(h.s); (by[k] = by[k] || []).push(h); });
  const title = k => k === 'PFA' ? 'Preparing for adulthood' : SM[k].name;
  return `<div class="page"><div class="pad"><div><h1 class="h1">${hit.length} result${hit.length === 1 ? '' : 's'} for "${esc(S.q)}"</h1><p class="sub" style="margin-top:6px">Statements and small steps. Tap one to open it where it lives.</p></div>${printHead('Search · ' + S.q)}
    ${Object.keys(by).map(c => `<section class="res-g" style="${c === 'PFA' ? PFV : famVar(c)}"><h3><i></i>${esc(title(c))} <span class="count">${by[c].length}</span></h3>${by[c].map(h => `<button class="res" data-act="open" data-id="${esc(h.s.id)}"><span class="lv">${esc(c === 'PFA' ? areaName(h.s) : (LVNAME[h.s.lv] || h.s.lv))}</span><span>${mk(h.s.t)} <code>${esc(h.s.id)}</code>${h.step ? `<small>Small step: ${mk(h.step)}</small>` : ''}</span></button>`).join('')}</section>`).join('') || '<p class="sub">Nothing matches. Try a shorter word.</p>'}</div></div>`;
}

/* ---------- learning intentions: the basket and the card ---------- */
const MAX_CARD = 6;
function pIntentions() {
  const items = S.basket.map(id => byId[id]).filter(Boolean);
  return `<div class="page"><div class="pad"><div><h1 class="h1">Learning intentions</h1><p class="sub" style="margin-top:6px">${items.length} of ${MAX_CARD} chosen. Add statements with the + on any statement; the card uses this order.${items.length >= MAX_CARD ? ' The card holds six: take one off to add another.' : ''}</p></div>
    <ol class="blist">${items.map((s, i) => `<li><span class="n">${i + 1}</span><span>${esc(s.t)} <code>${esc(s.id)}</code>${bsqChip(s)}<small class="where">${esc(isLife({ strand: s.strand }) ? areaName(s) : SM[s.code] ? SM[s.code].name : s.strand)} · ${esc(LVNAME[s.lv] || s.lv)}</small></span><span class="btns"><button class="btn small" data-act="up" data-v="${i}" aria-label="Move up">${ic('up')}</button><button class="btn small" data-act="add" data-id="${esc(s.id)}" aria-label="Remove">${ic('x')}</button></span></li>`).join('') || '<li><span></span><span class="sub">Nothing chosen yet.</span><span></span></li>'}</ol>
    <div class="btns"><button class="btn flame" data-go="card" ${items.length ? '' : 'disabled'}>${ic('cards')}Make the card</button>${items.length ? '<button class="btn" data-act="clearbasket">Clear the list</button>' : ''}<button class="btn" data-go="card">Or make a card from scratch</button></div></div></div>`;
}

/* The card maker: a port of Bertie's standalone Learning Intentions tool. The card is a list of
   drawing operations in millimetres, drawn once onto a canvas for the preview and once into
   jsPDF for the file, so what you see is what prints. */
const PT = 25.4 / 72, PAGE = { w: 210, h: 297, margin: 8 }, CARD = { w: 155, minW: 85, maxW: 194, facesCol: 35, gap: 2 };
const COLOUR = { green: '#1b3326', border: '#141c17', divider: '#c9d0c6', tint: '#f1f4ef', text: '#141c17', hint: '#4a574e' };
const HEAD = { size: 10, leading: 12 * PT, sidePad: 6 * PT }, ROW = { size: 14, leading: 6, left: 4, top: 1, bottom: 2, minContent: 10 }, FACES = { w: 29.5, h: 8.06, rightInset: 4.74 }, LONG_LINES = 3;
const LEARNER = !!A.learnerFont, FACES_URL = A.faces ? 'data:image/png;base64,' + A.faces : null, jsPDF = window.jspdf && window.jspdf.jsPDF;
let measurer = null, facesImg = null, learnerReady = false;
function addLearnerFont(doc) { if (LEARNER) { doc.addFileToVFS('BMD.ttf', A.learnerFont); doc.addFont('BMD.ttf', 'BMD', 'normal'); } }
function wrap(text, font, style, size, width) { if (!measurer) { measurer = new jsPDF({ unit: 'mm', format: 'a4' }); addLearnerFont(measurer); } measurer.setFont(font, style); measurer.setFontSize(size); return measurer.splitTextToSize(text, width); }
const tidy = t => String(t || '').replace(/\s+/g, ' ').trim();
const intentionLines = (text, width) => wrap(tidy(text), LEARNER ? 'BMD' : 'helvetica', 'normal', ROW.size, width - CARD.facesCol - ROW.left);
function buildCard(data) {
  const W = data.width, back = [], front = []; let y = 0;
  if (data.date) { const dl = wrap(data.date, 'helvetica', 'bold', HEAD.size, W - 2 * HEAD.sidePad); y += 2; dl.forEach((line, i) => front.push({ t: 'text', font: 'head', size: HEAD.size, colour: COLOUR.green, align: 'center', x: W / 2, y: y + HEAD.size * PT + i * HEAD.leading, text: line })); y += dl.length * HEAD.leading + 2; }
  if (data.progression) { const pl = wrap(data.progression, 'helvetica', 'bold', HEAD.size, W - ROW.left - HEAD.sidePad); y += data.date ? 1 : 2; pl.forEach((line, i) => front.push({ t: 'text', font: 'head', size: HEAD.size, colour: COLOUR.green, align: 'left', x: ROW.left, y: y + HEAD.size * PT + i * HEAD.leading, text: line })); y += pl.length * HEAD.leading + 2; }
  data.intentions.forEach((text, i) => {
    const lines = intentionLines(text, W), content = Math.max(ROW.minContent, lines.length * ROW.leading), rowH = ROW.top + content + ROW.bottom, middle = y + ROW.top + content / 2;
    if (i % 2 === 0) back.push({ t: 'rect', x: 0, y, w: W, h: rowH, fill: COLOUR.tint });
    const textTop = middle - (lines.length * ROW.leading) / 2;
    lines.forEach((line, k) => front.push({ t: 'text', font: 'learner', size: ROW.size, colour: COLOUR.text, align: 'left', x: ROW.left, y: textTop + ROW.size * PT + k * ROW.leading, text: line }));
    front.push({ t: 'image', x: W - FACES.rightInset - FACES.w, y: middle - FACES.h / 2, w: FACES.w, h: FACES.h });
    if (i < data.intentions.length - 1) front.push({ t: 'line', x1: 0, y1: y + rowH, x2: W, y2: y + rowH, width: 1 * PT, colour: COLOUR.divider });
    y += rowH;
  });
  if (!data.intentions.length) { y += 2; front.push({ t: 'text', font: 'head', size: HEAD.size, colour: COLOUR.hint, align: 'center', x: W / 2, y: y + 8, text: 'Type a learning intention to see it here' }); y += 13; }
  front.push({ t: 'box', x: 0, y: 0, w: W, h: y, width: 2.4 * PT, colour: COLOUR.border });
  return { h: y, ops: back.concat(front) };
}
function paginate(cardW, cardH, copies) {
  const usableW = PAGE.w - 2 * PAGE.margin, usableH = PAGE.h - 2 * PAGE.margin;
  const cols = Math.max(1, Math.floor((usableW + CARD.gap) / (cardW + CARD.gap))), rows = Math.max(1, Math.floor((usableH + CARD.gap) / (cardH + CARD.gap)));
  const x0 = (PAGE.w - (cols * cardW + (cols - 1) * CARD.gap)) / 2, perPage = cols * rows, pages = [];
  for (let c = 0; c < copies; c++) { const p = Math.floor(c / perPage), k = c % perPage; (pages[p] = pages[p] || []).push({ x: x0 + (k % cols) * (cardW + CARD.gap), y: PAGE.margin + Math.floor(k / cols) * (cardH + CARD.gap) }); }
  return { pages, cols, rows };
}
function drawPdf(doc, ops, ox, oy) {
  ops.forEach(op => { switch (op.t) {
    case 'rect': doc.setFillColor(op.fill); doc.rect(ox + op.x, oy + op.y, op.w, op.h, 'F'); break;
    case 'line': doc.setDrawColor(op.colour); doc.setLineWidth(op.width); doc.line(ox + op.x1, oy + op.y1, ox + op.x2, oy + op.y2); break;
    case 'box': doc.setDrawColor(op.colour); doc.setLineWidth(op.width); doc.rect(ox + op.x, oy + op.y, op.w, op.h, 'S'); break;
    case 'text': if (op.font === 'learner') doc.setFont(LEARNER ? 'BMD' : 'helvetica', 'normal'); else doc.setFont('helvetica', 'bold'); doc.setFontSize(op.size); doc.setTextColor(op.colour); doc.text(op.text, ox + op.x, oy + op.y, { align: op.align, baseline: 'alphabetic' }); break;
    case 'image': if (FACES_URL) doc.addImage(FACES_URL, 'PNG', ox + op.x, oy + op.y, op.w, op.h, 'faces', 'FAST'); break;
  } });
}
function drawCanvas(ctx, ops, ox, oy, s) {
  ops.forEach(op => { switch (op.t) {
    case 'rect': ctx.fillStyle = op.fill; ctx.fillRect((ox + op.x) * s, (oy + op.y) * s, op.w * s, op.h * s); break;
    case 'line': ctx.strokeStyle = op.colour; ctx.lineWidth = op.width * s; ctx.beginPath(); ctx.moveTo((ox + op.x1) * s, (oy + op.y1) * s); ctx.lineTo((ox + op.x2) * s, (oy + op.y2) * s); ctx.stroke(); break;
    case 'box': ctx.strokeStyle = op.colour; ctx.lineWidth = op.width * s; ctx.strokeRect((ox + op.x) * s, (oy + op.y) * s, op.w * s, op.h * s); break;
    case 'text': { const px = op.size * PT * s; ctx.font = op.font === 'learner' ? px + 'px ' + (LEARNER && learnerReady ? '"BMD Learners"' : 'Helvetica, Arial, sans-serif') : 'bold ' + px + 'px Helvetica, Arial, sans-serif'; ctx.fillStyle = op.colour; ctx.textAlign = op.align; ctx.textBaseline = 'alphabetic'; ctx.fillText(op.text, (ox + op.x) * s, (oy + op.y) * s); break; }
    case 'image': if (facesImg) ctx.drawImage(facesImg, (ox + op.x) * s, (oy + op.y) * s, op.w * s, op.h * s); break;
  } });
}
let viewerDownloads = null;
if (window.claude && typeof window.claude.use === 'function') { try { window.claude.use('downloads').then(d => { viewerDownloads = d || null; }).catch(() => { viewerDownloads = null; }); } catch (e) { /* no viewer */ } }
function saveFile(filename, blob) {
  if (viewerDownloads) return viewerDownloads.save({ filename, data: blob });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return Promise.resolve({ status: 'saved' });
}
const STEP_GROUPS = [['Pre', ['Pre-4', 'Pre-5', 'Pre-6']], ['Step 1', ['1.1', '1.2']], ['Step 2', ['2.1', '2.2', '2.3']], ['Step 3', ['3.1', '3.2', '3.3']]];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad2 = n => (n < 10 ? '0' : '') + n;
function loadDraft() {
  let d = null; try { d = JSON.parse(sessionStorage.getItem('bx-cardDraft')); } catch (e) { d = null; }
  if (d && d.ids && d.ids.join('|') === S.basket.join('|')) return d;
  const fromData = []; S.basket.forEach(id => (byId[id].bsq || []).forEach(b => { if (!fromData.includes(b)) fromData.push(b); }));
  const t = new Date();
  return { ids: S.basket.slice(), intentions: S.basket.map(id => byId[id].t), steps: fromData.filter(b => !/^WPS/.test(b)), fallback: fromData.filter(b => /^WPS/.test(b)), fromData,
    date: t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()), className: '', copies: 1, width: Number(store.get('cardWidth', CARD.w)) };
}
function pCard() {
  if (!jsPDF) return `<div class="page"><div class="pad"><h1 class="h1">The card maker needs its PDF library</h1><p class="sub">This build is missing jsPDF. Rebuild the Explorer.</p></div></div>`;
  const d = loadDraft();
  const chips = STEP_GROUPS.map(g => `<div class="step-group"><button class="step-all" data-cardact="allsteps" data-v="${g[0]}">${g[0]}</button>${g[1].map(code => `<button class="chip-step" data-cardact="step" aria-pressed="${d.steps.includes(code)}" aria-label="Progression Step ${code}">${code}</button>`).join('')}</div>`).join('');
  const boxes = Array.from({ length: MAX_CARD }, (_, i) => `<div class="intent"><span class="num" aria-hidden="true">${i + 1}</span><textarea class="input" rows="2" placeholder="I can…" aria-label="Learning intention ${i + 1}" data-i="${i}">${esc(d.intentions[i] || '')}</textarea>${d.ids[i] ? `<div class="src">From <code>${esc(d.ids[i])}</code></div>` : ''}<div class="note" data-note="${i}"></div></div>`).join('');
  return `<div class="page"><div class="pad" id="cardPage"><div><p class="crumb"><button data-go="intentions">Learning intentions</button></p><h1 class="h1" style="margin-top:4px">Make a learning intention card</h1><p class="sub" style="margin-top:6px">The card goes in pupils' books: a date, the progression line, up to six intentions and three faces on each row. Edit the wording freely. No pupil names go on the card.</p></div>
    <div class="card-grid"><div class="stack">
      <section class="panel"><h2>Card details</h2><div class="grid2"><div class="field"><label for="li-date">Date</label><input type="date" class="input" id="li-date" value="${esc(d.date)}"></div><div class="field"><label for="li-copies">Number of copies</label><input type="number" class="input" id="li-copies" min="1" max="50" value="${esc(d.copies)}" inputmode="numeric"></div><div class="field" style="grid-column:1/-1"><label for="li-class">Class or group <span class="hint">(for the file name only)</span></label><input type="text" class="input" id="li-class" value="${esc(d.className)}" placeholder="e.g. Tuesday maths group" autocomplete="off"></div></div>
        <fieldset class="field" style="border:0;padding:0;margin:14px 0 0"><legend>Progression step on the card <span class="hint">(B Squared, tap to switch on or off)</span></legend><div class="step-groups">${chips}</div>
        <p class="hint" style="margin-top:8px">${d.fromData.length ? 'Set from the B Squared steps recorded for these statements.' + (d.fallback.length ? ' Statements with no B Squared equivalent carry their WPS level instead (' + esc(d.fallback.join(', ')) + '), which is not written on the card.' : '') : (d.ids.length ? 'No B Squared step is recorded for these statements yet, so the line is left blank unless you choose one.' : 'With none switched on, the line is left off the card.')}</p></fieldset></section>
      <section class="panel"><div class="row-between"><h2 style="margin:0">Learning intentions <span class="hint">(up to six)</span></h2><button class="btn small" data-cardact="clear">Clear all</button></div><div id="intents">${boxes}</div>
        <div class="btns" style="margin-top:14px"><button class="btn flame" id="li-download">${ic('download')}Download PDF</button><button class="btn" id="li-print">${ic('open')}Open PDF to print</button></div><p class="status" id="li-status" role="status" aria-live="polite"></p></section>
    </div><div class="stack">
      <section class="panel"><div class="row-between" style="margin-bottom:10px"><h2 style="margin:0">Preview</h2><div class="seg" role="group" aria-label="Preview size"><button data-cardact="view" data-v="card" aria-pressed="true">Card</button><button data-cardact="view" data-v="page" aria-pressed="false">Whole page</button></div></div>
        <div class="stage" id="li-stage"><div class="canvas-wrap"><canvas id="li-canvas" role="img" aria-label="Preview of the learning intention card"></canvas><div class="grip" id="gripL" aria-hidden="true" title="Drag to change the card width"></div><div class="grip" id="gripR" aria-hidden="true" title="Drag to change the card width"></div></div></div>
        <div class="width-row"><label for="li-width" class="hint">Card width</label><input type="range" id="li-width" min="${CARD.minW}" max="${CARD.maxW}" step="1" value="${d.width}"><output id="li-width-out" for="li-width">${d.width} mm</output><button class="btn small" data-cardact="resetwidth">Reset</button></div>
        <p class="hint">Drag the handles on the card, or use the slider. Cards 96 mm or narrower fit two across the page.</p><p class="hint" id="li-fit"></p></section>
      <section class="panel"><h2>Favourites</h2><div class="field"><label for="favSelect">Saved sets</label><div class="btns"><select id="favSelect" class="input" style="flex:1 1 180px;min-height:40px"></select><button class="btn small" id="favLoad">Load</button><button class="btn small" id="favDelete">Delete</button></div></div>
        <div class="field" style="margin-top:12px"><label for="favName">Save the intentions you have typed as a favourite</label><div class="btns"><input type="text" class="input" id="favName" style="flex:1 1 180px" placeholder="Name it, e.g. Fractions week 1" maxlength="80" autocomplete="off"><button class="btn small" id="favSave">Save</button></div></div>
        <p class="status" id="favStatus" role="status" aria-live="polite"></p><div class="btns"><button class="btn small" id="favExport">Export to a file</button><button class="btn small" id="favImport">Import from a file</button><input type="file" id="favFile" accept=".json,application/json" hidden></div>
        <p class="hint">Favourites are kept in this browser on this device. Export them to back up, move to another device, or share with a colleague. The file works with the standalone Learning Intentions tool too.</p></section>
    </div></div></div></div>`;
}
function wireCard() {
  const root = $('#cardPage'); if (!root) return;
  const d = loadDraft();
  const q = s => root.querySelector(s);
  const dateIn = q('#li-date'), copiesIn = q('#li-copies'), classIn = q('#li-class'), widthIn = q('#li-width'), widthOut = q('#li-width-out'), canvas = q('#li-canvas'), stage = q('#li-stage'), gripL = q('#gripL'), gripR = q('#gripR'), fitInfo = q('#li-fit'), status = q('#li-status');
  const boxes = [...root.querySelectorAll('#intents textarea')], chips = [...root.querySelectorAll('.chip-step')];
  let view = 'card', preview = { s: 1, wMm: CARD.maxW + 8 }, queued = false;
  const clampW = w => { w = Math.round(Number(w)); if (isNaN(w)) w = CARD.w; return Math.min(CARD.maxW, Math.max(CARD.minW, w)); };
  const readDate = () => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIn.value); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const progressionText = () => { const on = chips.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.textContent); return on.length ? 'Progression Step ' + on.join(', ') : ''; };
  const setProgression = text => { const codes = String(text || '').match(/\b(?:Pre-[4-6]|[1-3]\.[1-3])\b/g) || []; chips.forEach(c => c.setAttribute('aria-pressed', String(codes.includes(c.textContent)))); };
  const readForm = () => { const dt = readDate(); let n = parseInt(copiesIn.value, 10); if (isNaN(n)) n = 1; return { dateObj: dt, date: dt ? DAYS[dt.getDay()] + ' ' + dt.getDate() + ' ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear() : '', progression: progressionText(), intentions: boxes.map(b => tidy(b.value)).filter(Boolean), copies: Math.min(50, Math.max(1, n)), width: clampW(widthIn.value), className: tidy(classIn.value) }; };
  const fileName = data => { const prefix = data.dateObj ? data.dateObj.getFullYear() + '-' + pad2(data.dateObj.getMonth() + 1) + '-' + pad2(data.dateObj.getDate()) : 'undated'; const name = data.className.replace(/ /g, '_').replace(/[<>:"\/\\|?*\x00-\x1f]/g, '') || 'Learning_intentions'; return prefix + '_' + name + '.pdf'; };
  const keep = () => { try { sessionStorage.setItem('bx-cardDraft', JSON.stringify({ ids: d.ids, intentions: boxes.map(b => b.value), steps: chips.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.textContent), fallback: d.fallback, fromData: d.fromData, date: dateIn.value, className: classIn.value, copies: copiesIn.value, width: widthIn.value })); } catch (e) { /* not kept */ } };
  const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; draw(); }); };
  function draw() {
    if (!document.body.contains(canvas)) return;
    const data = readForm(), card = buildCard(data), has = data.intentions.length > 0;
    boxes.forEach((b, i) => { const t = tidy(b.value); const n = t ? intentionLines(t, data.width).length : 0; const note = root.querySelector(`[data-note="${i}"]`); if (note) note.textContent = n >= LONG_LINES ? 'Quite long: this takes ' + n + ' lines on the card.' : ''; });
    q('#li-download').disabled = !has; q('#li-print').disabled = !has; widthOut.textContent = data.width + ' mm';
    const layout = paginate(data.width, card.h, data.copies), perPage = layout.cols * layout.rows;
    const fits = layout.cols > 1 ? layout.cols + ' across × ' + layout.rows + ' down, so ' + perPage + ' cards fit on an A4 page.' : 'Up to ' + perPage + (perPage === 1 ? ' card fits' : ' of these cards fit') + ' on an A4 page.';
    fitInfo.textContent = has ? data.copies + (data.copies === 1 ? ' copy' : ' copies') + ' → ' + layout.pages.length + (layout.pages.length === 1 ? ' page' : ' pages') + '. ' + fits : '';
    const ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio || 1, avail = Math.max(200, stage.clientWidth - 32); let wMm, hMm, s;
    if (view === 'page') { wMm = PAGE.w; hMm = PAGE.h; s = Math.min(avail, 560) / wMm; } else { wMm = CARD.maxW + 8; hMm = card.h + 8; s = Math.min(avail, 760) / wMm; }
    canvas.style.width = Math.round(wMm * s) + 'px'; canvas.style.height = Math.round(hMm * s) + 'px'; canvas.width = Math.round(wMm * s * dpr); canvas.height = Math.round(hMm * s * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, wMm * s, hMm * s);
    if (view === 'page') { layout.pages[0].forEach(pos => drawCanvas(ctx, card.ops, pos.x, pos.y, s)); gripL.style.display = gripR.style.display = 'none'; }
    else { const ox = (wMm - data.width) / 2; drawCanvas(ctx, card.ops, ox, 4, s); [[gripL, ox], [gripR, ox + data.width]].forEach(g => { g[0].style.display = 'block'; g[0].style.left = (g[1] * s) + 'px'; g[0].style.top = (4 * s) + 'px'; g[0].style.height = (card.h * s) + 'px'; }); }
    preview = { s, wMm }; keep();
  }
  const makePdf = data => { const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }); addLearnerFont(doc); doc.setProperties({ title: 'Learning intentions ' + data.date, creator: 'Bettws Curriculum Explorer' }); const card = buildCard(data); paginate(data.width, card.h, data.copies).pages.forEach((positions, p) => { if (p > 0) doc.addPage(); positions.forEach(pos => drawPdf(doc, card.ops, pos.x, pos.y)); }); return doc; };
  const say = (el, msg, warn) => { el.textContent = msg; el.classList.toggle('warn', !!warn); };
  q('#li-download').addEventListener('click', () => { const data = readForm(); if (!data.intentions.length) return; let blob; const name = fileName(data); try { blob = makePdf(data).output('blob'); } catch (err) { say(status, 'Sorry, the PDF could not be made: ' + err.message, true); return; } say(status, 'Saving ' + name + '…'); saveFile(name, blob).then(() => say(status, 'Saved ' + name + '.')).catch(err => say(status, err && err.code === 'declined' ? 'Not saved.' : 'Sorry, the PDF could not be saved' + (err && err.message ? ': ' + err.message : '.'), true)); });
  q('#li-print').addEventListener('click', () => { const data = readForm(); if (!data.intentions.length) return; const tab = window.open('', '_blank'); try { const url = makePdf(data).output('bloburl'); if (tab) { tab.location.href = url; say(status, 'PDF opened in a new tab. Use the print button there.'); } else say(status, 'Your browser blocked the new tab. Use Download PDF instead.', true); } catch (err) { if (tab) tab.close(); say(status, 'Sorry, the PDF could not be made: ' + err.message, true); } });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-cardact]'); if (!b) return; const act = b.dataset.cardact;
    if (act === 'step') { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); schedule(); }
    if (act === 'allsteps') { const grp = STEP_GROUPS.find(g => g[0] === b.dataset.v)[1]; const cs = chips.filter(c => grp.includes(c.textContent)); const allOn = cs.every(c => c.getAttribute('aria-pressed') === 'true'); cs.forEach(c => c.setAttribute('aria-pressed', String(!allOn))); schedule(); }
    if (act === 'clear') { if (boxes.some(x => x.value.trim()) && !confirm('Clear all the learning intentions on the card?')) return; boxes.forEach(x => x.value = ''); draw(); }
    if (act === 'view') { view = b.dataset.v; root.querySelectorAll('[data-cardact="view"]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); }
    if (act === 'resetwidth') setWidth(CARD.w);
  });
  [dateIn, classIn, copiesIn].forEach(x => { x.addEventListener('input', schedule); x.addEventListener('change', schedule); });
  boxes.forEach(b => b.addEventListener('input', schedule));
  const setWidth = w => { widthIn.value = String(clampW(w)); store.set('cardWidth', widthIn.value); schedule(); };
  widthIn.addEventListener('input', () => setWidth(widthIn.value));
  [gripL, gripR].forEach(grip => {
    grip.addEventListener('pointerdown', e => { e.preventDefault(); grip.setPointerCapture(e.pointerId); grip.classList.add('dragging'); });
    grip.addEventListener('pointermove', e => { if (!grip.hasPointerCapture(e.pointerId)) return; const rect = canvas.getBoundingClientRect(); const xMm = (e.clientX - rect.left) / preview.s; setWidth(2 * Math.abs(xMm - preview.wMm / 2)); });
    const stop = e => { if (grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId); grip.classList.remove('dragging'); };
    grip.addEventListener('pointerup', stop); grip.addEventListener('pointercancel', stop);
  });
  window.addEventListener('resize', schedule);
  /* favourites */
  const FAV_KEY = 'bettws.explorer.favourites.v1', favSelect = q('#favSelect'), favLoad = q('#favLoad'), favDelete = q('#favDelete'), favName = q('#favName'), favSave = q('#favSave'), favStatus = q('#favStatus'), favExport = q('#favExport'), favImport = q('#favImport'), favFile = q('#favFile');
  let favs = [], storageOk = true;
  const cleanFav = f => { if (!f || typeof f.name !== 'string' || !Array.isArray(f.intentions)) return null; const name = tidy(f.name).slice(0, 80); if (!name) return null; return { name, progression: typeof f.progression === 'string' ? f.progression : '', intentions: f.intentions.filter(t => typeof t === 'string').slice(0, MAX_CARD) }; };
  const loadFavs = () => { try { const arr = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); favs = (Array.isArray(arr) ? arr : []).map(cleanFav).filter(Boolean); } catch (e) { storageOk = false; favs = []; } };
  const storeFavs = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); return true; } catch (e) { storageOk = false; return false; } };
  const sortFavs = () => favs.sort((a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }));
  const findFav = name => { const key = name.toLowerCase(); return favs.findIndex(f => f.name.toLowerCase() === key); };
  const updateFavButtons = () => { const chosen = favSelect.value !== ''; favLoad.disabled = !chosen; favDelete.disabled = !chosen; favExport.disabled = !favs.length; };
  const fillFavSelect = selectName => { favSelect.innerHTML = `<option value="">${favs.length ? 'Choose a saved set…' : 'No favourites saved yet'}</option>` + favs.map((f, i) => `<option value="${i}">${esc(f.name)}</option>`).join(''); if (selectName) { const at = findFav(selectName); if (at >= 0) favSelect.value = String(at); } updateFavButtons(); };
  const saved = msg => { if (storeFavs()) say(favStatus, msg); else say(favStatus, msg + ' This browser will not keep it after closing, so use Export to keep a copy.', true); };
  favSelect.addEventListener('change', updateFavButtons);
  favSave.addEventListener('click', () => { const name = tidy(favName.value).slice(0, 80); if (!name) { say(favStatus, 'Give the favourite a name first.', true); favName.focus(); return; } const intentions = boxes.map(b => tidy(b.value)).filter(Boolean); if (!intentions.length) { say(favStatus, 'Type at least one learning intention to save.', true); return; } const existing = findFav(name); if (existing >= 0 && !confirm('Replace the saved favourite "' + favs[existing].name + '"?')) return; const fav = { name, progression: progressionText(), intentions }; if (existing >= 0) favs[existing] = fav; else favs.push(fav); sortFavs(); fillFavSelect(name); favName.value = ''; saved('Saved "' + name + '".'); });
  favLoad.addEventListener('click', () => { const fav = favs[+favSelect.value]; if (!fav) return; const current = boxes.map(b => tidy(b.value)).filter(Boolean); if (current.length && current.join('\n') !== fav.intentions.map(tidy).join('\n') && !confirm('Replace the learning intentions on the card with "' + fav.name + '"?')) return; boxes.forEach((b, i) => b.value = fav.intentions[i] || ''); if (fav.progression) setProgression(fav.progression); say(favStatus, 'Loaded "' + fav.name + '".'); draw(); });
  favDelete.addEventListener('click', () => { const i = +favSelect.value, fav = favs[i]; if (!fav || !confirm('Delete the favourite "' + fav.name + '"?')) return; favs.splice(i, 1); fillFavSelect(); saved('Deleted "' + fav.name + '".'); });
  favExport.addEventListener('click', () => { const blob = new Blob([JSON.stringify({ app: 'learning-intentions', version: 1, favourites: favs }, null, 2)], { type: 'application/json' }); saveFile('learning-intentions-favourites.json', blob).then(() => say(favStatus, 'Exported ' + plural(favs.length, 'favourite.', 'favourites.'))).catch(err => say(favStatus, err && err.code === 'declined' ? 'Not exported.' : 'Sorry, the file could not be saved.', true)); });
  favImport.addEventListener('click', () => favFile.click());
  favFile.addEventListener('change', () => { const file = favFile.files && favFile.files[0]; favFile.value = ''; if (!file) return; const reader = new FileReader(); reader.onload = () => { let list; try { const parsed = JSON.parse(String(reader.result)); list = Array.isArray(parsed) ? parsed : parsed && parsed.favourites; if (!Array.isArray(list)) throw new Error('not a favourites file'); } catch (err) { say(favStatus, 'That file does not look like a favourites export.', true); return; } let added = 0, replaced = 0; list.map(cleanFav).filter(Boolean).forEach(f => { const at = findFav(f.name); if (at >= 0) { favs[at] = f; replaced++; } else { favs.push(f); added++; } }); sortFavs(); fillFavSelect(); saved('Imported ' + added + ' new' + (replaced ? ' and updated ' + replaced : '') + (added + replaced === 1 ? ' favourite.' : ' favourites.')); }; reader.onerror = () => say(favStatus, 'Could not read that file.', true); reader.readAsText(file); });
  loadFavs(); sortFavs(); fillFavSelect(); if (!storageOk) say(favStatus, 'This browser is not letting the page save favourites. You can still export and import them.', true);
  if (FACES_URL && !facesImg) { const img = new Image(); img.onload = () => { FACES.h = FACES.w * img.naturalHeight / img.naturalWidth; facesImg = img; schedule(); }; img.src = FACES_URL; }
  if (LEARNER && !learnerReady && window.FontFace && document.fonts) { try { const bin = atob(A.learnerFont), bytes = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k); new FontFace('BMD Learners', bytes.buffer).load().then(face => { document.fonts.add(face); learnerReady = true; schedule(); }).catch(() => { /* the preview uses a system font; the PDF is unaffected */ }); } catch (e) { /* ignore */ } }
  setTimeout(draw, 0);
}

/* ---------- print ---------- */
function printHead(title) {
  return `<div class="print-head">${A.logo ? `<img src="${A.logo}" alt="">` : ''}<h1>${esc(title)}<small>Bettws Curriculum Explorer · dataset ${esc(D.version)} · printed ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</small></h1></div>`;
}
const PRINTABLE = ['strand', 'map', 'outcomes', 'destinations', 'route', 'enquiry', 'search', 'browse'];

/* ---------- review mode (Bertie's version only) ---------- */
const TAGS = ['Keep', 'Change', 'Question', 'Problem'];
let notes = [], dbRef = null, dbState = 'connecting', draftTag = 'Change';
function pageKey() { return hashOf(); }
function pageLabel() {
  if (S.view === 'strand') return `${SM[S.strand].name} · ${S.mode === 'side' ? 'levels side by side' : 'one level · ' + (LVNAME[S.level] || S.level)}${S.all ? ' · all small steps shown' : ''}`;
  return { browse: 'Browse', map: 'Curriculum map', shapes: 'How strands are taught · ' + (window.XP ? XP.label() : ''), enquiries: 'Enquiries', enquiry: 'Enquiry · ' + (ENQ[S.enq] ? ENQ[S.enq].title : ''), intentions: 'Learning intentions', card: 'Learning intention card', reviews: 'Review log', search: 'Search · "' + S.q + '"', pfa: 'Preparing for adulthood', outcomes: 'PFA · the Outcomes', destinations: 'PFA · the Destinations', route: 'PFA · the Number Route', pupils: 'My pupils' }[S.view] || S.view;
}
function noteState() { const X = window.XP ? XP.state : {}; return { view: S.view, strand: S.strand, mode: S.mode, level: S.level, all: S.all, q: S.q, enq: S.enq, open: [...S.exp], xp: { tab: X.tab, ld: X.ld, ldi: X.ldi, fam: X.fam, lane: X.lane, col: X.col, sl: X.sl, sti: X.sti, stm: X.stm } }; }
function loadLocal() { notes = store.get('notes', []); }
function initDb() {
  if (!BERTIE) return;
  const use = window.claude && window.claude.use ? window.claude.use('db') : Promise.resolve(null);
  use.then(db => {
    if (!db) { dbState = 'local'; loadLocal(); renderReview(); return; }
    dbRef = db; const t = setTimeout(() => { if (dbState === 'connecting') { dbState = 'slow'; renderReview(); } }, 10000);
    db.collection('reviews').orderBy('at', 'desc').onSnapshot(snap => { clearTimeout(t); notes = snap.docs.map(d => Object.assign({ id: d.id }, d.data())); if (!snap.metadata.fromCache) dbState = 'ok'; renderReview(); if (S.view === 'reviews') render(); },
      () => { clearTimeout(t); dbState = 'local'; dbRef = null; loadLocal(); renderReview(); });
  }).catch(() => { dbState = 'local'; loadLocal(); renderReview(); });
}
async function saveNote(tag, text) {
  const doc = { at: new Date().toISOString(), key: pageKey(), label: pageLabel(), tag, text: text || '', state: noteState() };
  if (dbRef) { try { await dbRef.collection('reviews').add(doc); toast(tag === 'Logged' ? 'Screen logged.' : 'Note saved.'); return true; } catch (e) { toast(e && e.code === 'quota_exceeded' ? 'The review log is full. Delete some old notes, then try again.' : 'Could not save to the shared log just now; kept on this device instead.'); } }
  notes.unshift(Object.assign({ id: 'l' + Date.now() }, doc)); store.set('notes', notes.filter(n => String(n.id).startsWith('l'))); toast(tag === 'Logged' ? 'Screen logged on this device.' : 'Note saved on this device.'); renderReview(); return true;
}
async function deleteNote(id) {
  if (dbRef && !String(id).startsWith('l')) { try { await dbRef.collection('reviews').doc(id).delete(); } catch (e) { toast('Could not delete that note just now.'); } return; }
  notes = notes.filter(n => n.id !== id); store.set('notes', notes.filter(n => String(n.id).startsWith('l'))); renderReview(); if (S.view === 'reviews') render();
}
const fmtTime = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDay = iso => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
function notesText() { return notes.slice().reverse().map(n => `[${fmtDay(n.at)} ${fmtTime(n.at)}] ${n.tag} · ${n.label}${n.text ? '\n' + n.text : ''}`).join('\n\n'); }
function pReviews() {
  const days = {}; notes.forEach(n => (days[fmtDay(n.at)] = days[fmtDay(n.at)] || []).push(n));
  const status = dbState === 'ok' ? 'Saved to this page\'s shared review log, so Claude can read it back.' : dbState === 'local' ? 'The shared log is not available in this view, so notes are kept on this device only. Use Copy or Download to pass them on.' : dbState === 'slow' ? 'The shared log is taking a while to answer; what you see may be out of date.' : 'Connecting to the shared review log…';
  return `<div class="page"><div class="pad"><div><h1 class="h1">Review log</h1><p class="sub" style="margin-top:6px">${notes.length} note${notes.length === 1 ? '' : 's'}. Click a page name to go back to exactly that view.</p></div>
    <p class="dbnote">${status}</p>
    <div class="btns"><button class="btn" data-act="copylog">Copy all as text</button><button class="btn" data-act="dllog">Download as a text file</button>${S.review ? '' : '<button class="btn flame" data-act="review">Start reviewing</button>'}</div>
    <div class="rvlog">${Object.keys(days).map(d => `<div class="day">${d}</div>${days[d].map(n => `<div class="row"><span class="tm">${fmtTime(n.at)}</span><span><span class="tg ${esc(n.tag)}">${esc(n.tag === 'Logged' ? 'Screen' : n.tag)}</span></span><div><button class="go" data-act="restore" data-id="${esc(n.id)}">${esc(n.label)}</button>${n.text ? `<p class="tx">${esc(n.text)}</p>` : ''}</div><span id="del-${esc(n.id)}"><button class="btn small" data-act="delask" data-id="${esc(n.id)}">Delete</button></span></div>`).join('')}`).join('') || '<p class="sub">No notes yet. Turn on Review in the top bar, then use "Add a note" on any page.</p>'}</div></div></div>`;
}
function renderReview() {
  const app = $('#app'); app.dataset.review = S.review ? 'on' : 'off';
  const rv = $('#rvbtn'); rv.hidden = !BERTIE;
  if (!BERTIE) { $('#rvbar').hidden = true; $('#rvpanel').hidden = true; return; }
  const here = notes.filter(n => n.key === pageKey());
  rv.classList.toggle('on', S.review); rv.innerHTML = `${ic('note')}<span class="lb">${S.review ? 'Reviewing' : 'Review'}</span>`; rv.setAttribute('aria-pressed', S.review);
  const bar = $('#rvbar');
  if (!S.review) { bar.hidden = true; $('#rvpanel').hidden = true; S.panel = false; }
  else {
    bar.hidden = false;
    bar.innerHTML = `<span class="dot"></span><span class="lbl"><b>${esc(pageLabel())}</b><span>${here.length ? here.length + ' note' + (here.length === 1 ? '' : 's') + ' on this page' : 'No notes on this page yet'}</span></span>
      <button class="flame" data-act="note">${ic('note')}Add a note</button><button data-act="log">${ic('flag')}Log this screen</button><button data-act="openlog">Review log · ${notes.length}</button><button data-act="review">Finish</button>`;
  }
  const nav = document.querySelector('[data-go="reviews"] .badge'); if (nav) nav.textContent = notes.length;
  if (S.panel) renderPanel();
}
function renderPanel() {
  const p = $('#rvpanel'); p.hidden = !S.panel; if (!S.panel) return;
  const here = notes.filter(n => n.key === pageKey()), keep = $('#rvtext') ? $('#rvtext').value : '';
  p.innerHTML = `<header><div><h2>Note on this page</h2><p class="pl">${esc(pageLabel())}</p></div><button class="btn small" data-act="closepanel" aria-label="Close">${ic('x')}</button></header>
    <div class="body"><div class="tags" role="radiogroup" aria-label="Kind of note">${TAGS.map(t => `<button data-act="tag" data-v="${t}" aria-pressed="${draftTag === t}">${t}</button>`).join('')}</div>
      <label for="rvtext" class="pl" style="font-weight:600;color:var(--ink)">What do you think?</label><textarea id="rvtext" placeholder="What works, what to change, what confused you…">${esc(keep)}</textarea>
      <p class="tip">${ic('mic')} To talk instead of type, use your computer's dictation in this box: on a Mac press the Globe or Fn key twice; on Windows press Windows + H; on an iPad tap the microphone on the keyboard.</p>
      <div class="btns"><button class="btn flame" data-act="savenote">Save note</button><button class="btn" data-act="closepanel">Cancel</button><span class="pl" style="align-self:center">Ctrl or ⌘ + Enter saves</span></div>
      ${here.length ? `<div class="here"><h4>Already noted on this page</h4>${here.map(n => `<div class="nt"><span class="nh"><span class="tg ${esc(n.tag)}">${esc(n.tag === 'Logged' ? 'Screen' : n.tag)}</span>${fmtTime(n.at)}</span>${n.text ? `<span>${esc(n.text)}</span>` : ''}</div>`).join('')}</div>` : ''}</div>`;
}
let toastT; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }

/* ---------- full screen ---------- */
async function toggleFull() {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
  catch (e) { S.menu = 'narrow'; store.set('menu', 'narrow'); render(); toast('Full screen is not available in this view, so the menu is slimmed instead. Opening the page in its own browser tab allows full screen.'); }
}
function fsLabel() { const b = $('#fsbtn'); if (b) { b.innerHTML = document.fullscreenElement ? `${ic('exitfull')}<span class="lb">Exit full screen</span>` : `${ic('full')}<span class="lb">Full screen</span>`; b.title = document.fullscreenElement ? 'Exit full screen (Esc)' : 'Full screen'; } }
document.addEventListener('fullscreenchange', () => { fsLabel(); setTimeout(railFx, 120); });

/* ---------- shell + render ---------- */
function shell() {
  const pfa = inPfa();
  const cur = { browse: 'browse', strand: 'browse', search: 'browse', map: 'map', shapes: 'shapes', enquiries: 'enquiries', enquiry: 'enquiries', intentions: 'intentions', card: 'intentions', reviews: 'reviews', pfa: 'pfa', outcomes: 'pfa', destinations: 'pfa', route: 'pfa', pupils: 'pupils' }[S.view];
  const nav = [['browse', 'book', 'Browse'], ['map', 'grid', 'Curriculum map']];
  if (BERTIE) nav.push(['shapes', 'shapes', 'How strands are taught']);
  nav.push(['pfa', 'pfa', 'Preparing for adulthood'], ['enquiries', 'compass', 'Enquiries'], ['intentions', 'cards', 'Learning intentions', S.basket.length], ['pupils', 'pupils', 'My pupils']);
  if (BERTIE) nav.push(['reviews', 'note', 'Review log', notes.length]);
  const strands = pfa
    ? `<h5 style="--fam:var(--f-pfa)"><i></i><span>The three parts</span></h5>${[['outcomes', 'The Outcomes', LIFE.length, 'OUT'], ['destinations', 'The Destinations', DEST.length, 'DEST'], ['route', 'The Number Route', ROUTE.length, 'ROUTE']].map(p => `<button data-go="${p[0]}" style="--fam:var(--f-pfa)" aria-current="${S.view === p[0]}" title="${p[1]}"><span class="nm">${p[1]}</span><span class="ct">${p[2]}</span><span class="cd">${p[3]}</span></button>`).join('')}`
    : FAMS.map(([f, k, cs]) => `<h5 style="--fam:var(--f-${k})"><i></i><span>${f}</span></h5>${cs.map(c => `<button data-go="strand" data-strand="${c}" style="--fam:var(--f-${k})" aria-current="${S.view === 'strand' && S.strand === c}" title="${esc(SM[c].name)}"><span class="nm">${esc(SM[c].name)}</span><span class="ct">${ST[c].length}</span><span class="cd">${c}</span></button>`).join('')}`).join('');
  $('#side').innerHTML = `<div class="brand"><span class="logo"><img src="${A.logo || ''}" alt="Bettws school logo"></span><div class="bt"><b>Curriculum Explorer</b><small>${BERTIE ? "Bertie's version · " : 'Bettws · '}dataset ${esc(D.version)}</small></div><button class="collapse" data-act="menu" aria-label="${S.menu === 'wide' ? 'Collapse the menu' : 'Expand the menu'}" title="${S.menu === 'wide' ? 'Collapse the menu' : 'Expand the menu'}">${ic(S.menu === 'wide' ? 'collapse' : 'expand')}</button></div>
    <nav class="nav">${nav.map(([g, i, l, b]) => `<button data-go="${g}" aria-current="${cur === g}" title="${l}" ${g === 'pupils' ? 'class="off"' : ''}>${ic(i)}<span>${l}</span>${b != null ? `<span class="badge">${b}</span>` : ''}</button>`).join('')}</nav>
    <div class="side-strands">${strands}</div>
    <div class="side-foot">Built from dataset ${esc(D.version)} · ${esc(D.built)}<br>No login, no server, nothing tracked. Works offline once opened.</div>`;
}
function render(opts) {
  opts = opts || {};
  const app = $('#app'); app.dataset.menu = S.menu; app.dataset.theme = S.theme; app.dataset.pfa = inPfa() ? 'on' : 'off'; app.style.setProperty('--fs', S.fs);
  shell();
  $('#szs').innerHTML = [[1, 'A', 13], [8 / 7, 'A', 15], [9 / 7, 'A', 17]].map(([v, l, px], i) => `<button data-act="fs" data-v="${v}" aria-pressed="${Math.abs(S.fs - v) < .01}" title="${['Standard', 'Larger', 'Largest'][i]} text" style="font-size:${px}px">${l}</button>`).join('');
  $('#thbtn').innerHTML = `${ic('sun')}<span class="lb">${S.theme === 'light' ? 'Light' : 'Dark'}</span>`; fsLabel();
  const pr = $('#prbtn'); pr.hidden = !PRINTABLE.includes(S.view); pr.innerHTML = `${ic('print')}<span class="lb">Print</span>`;
  const qi = $('#q'); if (qi && document.activeElement !== qi) qi.value = S.view === 'search' ? S.q : '';
  const prevRail = $('#rail'), keepX = opts.keepScroll && prevRail ? prevRail.scrollLeft : null;
  const prevPage = $('#view .page'), keepY = opts.keepScroll && prevPage ? prevPage.scrollTop : null;
  const colY = opts.keepScroll ? [...document.querySelectorAll('#rail .cb')].map(e => e.scrollTop) : null;
  if (window.XP) XP.stop();
  const PG = { browse: pBrowse, strand: pStrand, map: pMap, shapes: BERTIE ? pShapes : pBrowse, enquiries: pEnquiries, enquiry: pEnquiry, intentions: pIntentions, card: pCard, search: pSearch, reviews: BERTIE ? pReviews : pBrowse, pfa: pPfa, outcomes: pOutcomes, destinations: pDestinations, route: pRoute, pupils: pPupils }[S.view] || pBrowse;
  $('#view').innerHTML = PG();
  const rail = $('#rail');
  if (rail) { if (keepX != null) { rail.style.scrollBehavior = 'auto'; rail.scrollLeft = keepX; rail.style.scrollBehavior = ''; } if (colY) document.querySelectorAll('#rail .cb').forEach((e, i) => e.scrollTop = colY[i] || 0); railFx(); }
  if (S.view === 'shapes' && window.XP) XP.mount();
  if (S.view === 'card') wireCard();
  const page = $('#view .page'); if (page && keepY != null) page.scrollTop = keepY;
  if (S.focus) { const el = document.querySelector(`.st[data-id="${CSS.escape(S.focus)}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); } S.focus = null; }
  document.title = (pageLabel() || 'Curriculum Explorer') + ' · Bettws Curriculum Explorer';
  renderReview();
}

/* rail: scroll-along effect and moves */
function railFx() {
  const rail = $('#rail'); if (!rail) return;
  const cols = [...rail.querySelectorAll('.col')], win = $('#win'), mini = $('#mini');
  const L = rail.scrollLeft, R = L + rail.clientWidth; let a0 = 0, a1 = 0;
  cols.forEach(c => { const a = c.offsetLeft, b = a + c.offsetWidth, vis = Math.max(0, Math.min(b, R) - Math.max(a, L)) / c.offsetWidth; c.classList.toggle('out', vis < .6); c.classList.toggle('in', vis > .98); a0 += Math.min(1, Math.max(0, (L - a) / c.offsetWidth)); a1 += Math.min(1, Math.max(0, (R - a) / c.offsetWidth)); });
  if (win && mini && cols.length) { const bw = mini.clientWidth / cols.length; win.style.left = (a0 * bw) + 'px'; win.style.width = Math.max(bw * .6, (a1 - a0) * bw) + 'px'; }
}
document.addEventListener('scroll', e => { if (e.target && e.target.id === 'rail') railFx(); }, true);
window.addEventListener('resize', railFx);
function railMove(how, v) {
  const rail = $('#rail'); if (!rail) return; const cols = [...rail.querySelectorAll('.col')];
  let i = 0, best = 1e9; cols.forEach((c, k) => { const d = Math.abs(c.offsetLeft - 28 - rail.scrollLeft); if (d < best) { best = d; i = k; } });
  const k = how === 'go' ? +v : Math.max(0, Math.min(cols.length - 1, i + (how === 'next' ? 1 : -1)));
  rail.scrollTo({ left: cols[k].offsetLeft - 28, behavior: 'smooth' });
}

/* ---------- events ---------- */
function openStatement(id) {
  const s = byId[id]; if (!s) return;
  S.exp.add(id); S.focus = id;
  if (ST[s.code] && ST[s.code].includes(s)) return go({ view: 'strand', strand: s.code, mode: 'one', level: s.lv });
  if (s.strand.indexOf('PFA ·') === 0) return go({ view: 'outcomes' });
  if (s.strand === NCP) return go({ view: 'route' });
  return go({ view: 'destinations' });
}
document.addEventListener('click', async e => {
  const a = e.target.closest('[data-act]'), g = e.target.closest('[data-go]');
  if (a) {
    const act = a.dataset.act, v = a.dataset.v, id = a.dataset.id;
    if (act === 'tog') { S.exp.has(id) ? S.exp.delete(id) : S.exp.add(id); return render({ keepScroll: true }); }
    if (act === 'all') { S.all = !S.all; S.exp.clear(); store.set('all', S.all); return render({ keepScroll: true }); }
    if (act === 'add') { const i = S.basket.indexOf(id); if (i >= 0) { S.basket.splice(i, 1); toast('Taken off your learning intentions.'); } else if (S.basket.length >= MAX_CARD) toast('The card holds six. Take one off to add another.'); else { S.basket.push(id); toast('Added to learning intentions (' + S.basket.length + ' of ' + MAX_CARD + ').'); } store.set('basket', S.basket); return render({ keepScroll: true }); }
    if (act === 'up') { const i = +v; if (i > 0) { const t = S.basket[i - 1]; S.basket[i - 1] = S.basket[i]; S.basket[i] = t; store.set('basket', S.basket); } return render({ keepScroll: true }); }
    if (act === 'clearbasket') { if (confirm('Take every statement off the list?')) { S.basket = []; store.set('basket', S.basket); render(); } return; }
    if (act === 'mode') { const lvs = levelsOf(S.strand); const lv = S.level && lvs.find(x => x.lv === S.level) ? S.level : (lvs.find(x => x.lv === 'WPS 2.2') || lvs[0]).lv; return go({ mode: v, level: lv }); }
    if (act === 'level') return go({ level: v });
    if (act === 'lvgo' || act === 'lvnext' || act === 'lvprev') return railMove(act.slice(2), v);
    if (act === 'menu') { S.menu = S.menu === 'wide' ? 'narrow' : 'wide'; store.set('menu', S.menu); return render({ keepScroll: true }); }
    if (act === 'fs') { S.fs = +v; store.set('fs', S.fs); return render({ keepScroll: true }); }
    if (act === 'theme') { S.theme = S.theme === 'light' ? 'dark' : 'light'; store.set('theme', S.theme); return render({ keepScroll: true }); }
    if (act === 'full') return toggleFull();
    if (act === 'print') return window.print();
    if (act === 'open') return openStatement(id);
    if (act === 'review') { S.review = !S.review; store.set('review', S.review); if (!S.review) S.panel = false; renderReview(); if (S.view === 'reviews') render({ keepScroll: true }); return; }
    if (act === 'note') { S.panel = true; renderPanel(); const t = $('#rvtext'); if (t) t.focus(); return; }
    if (act === 'closepanel') { S.panel = false; $('#rvpanel').hidden = true; return; }
    if (act === 'tag') { draftTag = v; const keep = $('#rvtext').value; renderPanel(); $('#rvtext').value = keep; return; }
    if (act === 'savenote') { const txt = $('#rvtext').value.trim(); if (!txt) { toast('Write or dictate a note first, or use "Log this screen".'); return; } $('#rvtext').value = ''; S.panel = false; $('#rvpanel').hidden = true; await saveNote(draftTag, txt); return; }
    if (act === 'log') { await saveNote('Logged', ''); return; }
    if (act === 'openlog') return go({ view: 'reviews' });
    if (act === 'restore') { const n = notes.find(x => x.id === id); if (n && n.state) { S.exp = new Set(n.state.open || []); if (n.state.xp && window.XP) Object.assign(XP.state, n.state.xp); return go({ view: n.state.view, strand: n.state.strand || S.strand, mode: n.state.mode || 'side', level: n.state.level, all: !!n.state.all, q: n.state.q || '', enq: n.state.enq || 0 }); } return; }
    if (act === 'delask') { const sp = document.getElementById('del-' + id); if (sp) sp.innerHTML = `<span class="btns"><button class="btn small" data-act="delyes" data-id="${esc(id)}">Delete</button><button class="btn small" data-act="delno">Keep</button></span>`; return; }
    if (act === 'delyes') return deleteNote(id);
    if (act === 'delno') return render({ keepScroll: true });
    if (act === 'copylog') { const txt = notesText(); try { await navigator.clipboard.writeText(txt); toast('Copied ' + notes.length + ' notes.'); } catch (err) { toast('Copy is blocked here; use Download instead.'); } return; }
    if (act === 'dllog') { try { await saveFile('explorer-review-' + new Date().toISOString().slice(0, 10) + '.txt', new Blob([notesText()], { type: 'text/plain' })); } catch (err) { /* declined */ } return; }
  }
  if (g) {
    const v = g.dataset.go;
    if (g.disabled) return;
    if (v === 'shapes' && window.XP) XP.state.tab = 'shapes';
    if (v === 'strand') { const lvl = g.dataset.level; return go({ view: 'strand', strand: g.dataset.strand, mode: lvl ? 'one' : 'side', level: lvl || null }); }
    if (v === 'enquiry') return go({ view: 'enquiry', enq: +(g.dataset.enq || 0) });
    return go({ view: v });
  }
});
document.addEventListener('keydown', e => {
  if (e.target && e.target.id === 'rvtext' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('[data-act="savenote"]').click(); }
  if (e.target && e.target.id === 'rail' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); railMove(e.key === 'ArrowRight' ? 'next' : 'prev'); }
  if (e.key === '/' && !/input|textarea|select/i.test(e.target.tagName)) { e.preventDefault(); $('#q').focus(); }
  if (e.key === 'Escape' && S.panel) { S.panel = false; $('#rvpanel').hidden = true; }
});
let qT; document.addEventListener('input', e => { if (e.target.id !== 'q') return; clearTimeout(qT); qT = setTimeout(() => { S.q = e.target.value; if (S.q.trim().length >= 2) go({ view: 'search' }); else if (S.view === 'search') go({ view: 'browse' }); }, 220); });
window.addEventListener('beforeprint', () => { document.querySelectorAll('#rail .cb').forEach(e => e.scrollTop = 0); });

if (window.XP) XP.onChange = () => { const h = hashOf(); if (location.hash !== h) { try { history.pushState(null, '', h); } catch (e) { /* ignore */ } } renderReview(); };
fromHash(); render(); initDb();
if (SITE && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { /* still works online */ });
})();
