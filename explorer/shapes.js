(function () {
'use strict';
const ST = window.__ST || (window.__ST = {}); /* filled by the app before this module mounts */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';

/* how each strand is taught: drawn from the ladder_note rulings in the dataset */
const SHAPE = {
  ladder: { name: 'Climb in order', line: 'Each step needs the one before. Teach it in this order.', kk: 'L' },
  loop: { name: 'Climb, then keep using it', line: 'A ladder through WPS 2. From WPS 3 the skills are used again and again in enquiries and routine.', kk: 'L' },
  measure: { name: 'Measure it', line: 'Every measure has the same five moves: compare, own units, estimate and check, record with the unit, standard units. Standard units come last and never hold the others back.', kk: 'R' },
  spiral: { name: 'Come round again', line: 'The same ideas, revisited and deepened. No step has to wait for another.', kk: 'R' },
  daily: { name: 'Picked up every day', line: 'Learned from the daily routine. The steps say what to expect by when, not what to teach next.', kk: 'D' }
};
const META = {
  NCP: { n: 'Number, Calculation & Pattern', s: 'ladder', m: 'Phase by phase. Times tables arrive through spiral blocks that come round alongside 2.1 and 2.2.' },
  FDP: { n: 'Fractions, Decimals & Percentages', s: 'ladder', m: 'Fair sharing, then naming parts, then fractions of amounts. Reading fraction notation is a gate at 2.3.' },
  ACL: { n: 'Time — Analogue Clock', s: 'ladder', m: 'From o\'clock to any time, to the minute.' },
  ALG: { n: 'Algebra', s: 'ladder', m: 'WPS 3 only. Short daily threads sit alongside taught blocks; four gates must be secure before the rung above.', p: 1 },
  SHP: { n: 'Shape in Use — Formal Ladder', s: 'ladder', m: 'Qualification track only. Assessed instead of the Shape in Use statements, never as well.', p: 1 },
  MON: { n: 'Money', s: 'loop', m: 'Coins differ, then amounts can be built and change comes back, then I can shop for myself. WPS 3 is used, not climbed.' },
  TTT: { n: 'Time — Telling the Time', s: 'loop', m: 'A ladder with routine moments inside it. At WPS 3 it is used, not taught.' },
  LEN: { n: 'Length & Height', s: 'measure', m: 'One band at WPS 2, then estimate, measure, calculate and apply at WPS 3.' },
  MAS: { n: 'Mass', s: 'measure', m: 'The same shape as Length. WPS 3 adds scaling a recipe and real limits.' },
  CAP: { n: 'Capacity', s: 'measure', m: 'The same shape as Length and Mass.' },
  TEM: { n: 'Temperature', s: 'measure', m: 'The same moves as the other measures. Below zero leans on negative numbers.' },
  DUR: { n: 'Duration — Time as a Measure', s: 'measure', m: 'Measuring time, not reading it. Works exactly like the other measures.' },
  FIT: { n: 'Shape in Use — Fitting & Constructing', s: 'spiral', m: 'Deepens through making, each time round.' },
  AAP: { n: 'Shape in Use — Area & Perimeter', s: 'spiral', m: 'Come round again, with one taught step: calculating area and perimeter.' },
  AR: { n: 'Angles & Rotation', s: 'spiral', m: 'One band, revisited and deepened.' },
  PDM: { n: 'Position, Direction & Movement', s: 'spiral', m: 'One band, revisited and deepened. Demand rises with route length and turns.' },
  STAT: { n: 'Statistics', s: 'spiral', m: 'Grows through real data. One gate: proportional reasoning.' },
  PROB: { n: 'Probability', s: 'spiral', m: 'Revisited regularly.' },
  CAL: { n: 'Time — Calendar Structure', s: 'daily', m: 'From the daily routine. The 2.1, 2.2, 2.3 steps are what to expect by then.' }
};
const prov = c => META[c].p ? '<span class="prov" title="Marked provisional in the dataset, awaiting your tick">provisional</span>' : '';
const kk = s => `<span class="kk ${SHAPE[s].kk}">${SHAPE[s].name}</span>`;
const X = { tab: 'shapes', ld: 'FDP', ldi: 0, sp: 'FIT', spi: null, meas: 'LEN', fam: 'Time', col: 1, lane: null, sl: 'NCP-3-04', fe: 0 };
let timers = {};
const stopAll = () => { Object.values(timers).forEach(clearInterval); timers = {}; document.querySelectorAll('.xp-play').forEach(b => { b.classList.remove('on'); b.textContent = b.dataset.lbl; }); };

/* ---------------- glyphs ---------------- */
function glyph(kind) {
  if (kind === 'ladder') {
    const r = [120, 100, 80, 60, 40, 20];
    return `<svg viewBox="0 0 150 140"><line class="g-rail" x1="55" y1="8" x2="55" y2="132"/><line class="g-rail" x1="95" y1="8" x2="95" y2="132"/>${r.map((y, i) => `<line class="${i === 3 ? 'g-gate' : 'g-rung'}" x1="55" y1="${y}" x2="95" y2="${y}"/>`).join('')}<rect class="g-dot" x="68" y="113" width="14" height="14"><animateTransform attributeName="transform" type="translate" calcMode="discrete" dur="6s" repeatCount="indefinite" values="0 0;0 -20;0 -40;0 -60;0 -80;0 -100" keyTimes="0;.17;.34;.5;.67;.84"/></rect></svg>`;
  }
  if (kind === 'loop') {
    return `<svg viewBox="0 0 150 140"><line class="g-rail" x1="57" y1="70" x2="57" y2="134"/><line class="g-rail" x1="93" y1="70" x2="93" y2="134"/>${[124, 104, 84].map(y => `<line class="g-rung" x1="57" y1="${y}" x2="93" y2="${y}"/>`).join('')}<circle class="g-rev" cx="75" cy="38" r="28"/><path id="gl-lp" d="M75 128 L75 66 A28 28 0 1 1 75.01 66 A28 28 0 1 1 75 66" fill="none"/><rect class="g-dot" x="-7" y="-7" width="14" height="14"><animateMotion dur="7s" repeatCount="indefinite" keyPoints="0;0.35;1" keyTimes="0;0.3;1" calcMode="linear"><mpath href="#gl-lp"/></animateMotion></rect></svg>`;
  }
  if (kind === 'measure') {
    const segs = [0, 1, 2, 3, 4].map(i => { const a0 = i * 72 + 6, a1 = (i + 1) * 72 - 6, p = a => [75 + 46 * Math.sin(a * Math.PI / 180), 70 - 46 * Math.cos(a * Math.PI / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `<path class="g-rev" style="stroke-width:9;stroke-opacity:.45" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A46 46 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`; }).join('');
    return `<svg viewBox="0 0 150 140">${segs}<text x="75" y="66" text-anchor="middle" style="font-size:11px;font-weight:700;fill:var(--x-rev);font-family:var(--w-f-body)">5 moves</text><text x="75" y="82" text-anchor="middle" style="font-size:10px;fill:var(--w-ink2);font-family:var(--w-f-body)">every time</text><path id="gl-ms" d="M75 24 A46 46 0 1 1 74.99 24" fill="none"/><circle class="g-dot" r="6"><animateMotion dur="5s" repeatCount="indefinite" calcMode="discrete" keyPoints="0;0.2;0.4;0.6;0.8" keyTimes="0;0.2;0.4;0.6;0.8"><mpath href="#gl-ms"/></animateMotion></circle></svg>`;
  }
  if (kind === 'spiral') {
    const pts = []; for (let i = 0; i <= 160; i++) { const t = i / 160 * 4 * Math.PI, r = 8 + 52 * t / (4 * Math.PI); pts.push([75 + r * Math.cos(t - Math.PI / 2), 70 + r * Math.sin(t - Math.PI / 2)]); }
    const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    const nodes = [20, 50, 80, 110, 135, 155].map(i => pts[i]);
    return `<svg viewBox="0 0 150 140"><path id="gl-sp" class="g-rev" d="${d}"/>${nodes.map(p => `<circle class="g-node" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4"/>`).join('')}<circle class="g-dot" r="6"><animateMotion dur="8s" repeatCount="indefinite"><mpath href="#gl-sp"/></animateMotion></circle></svg>`;
  }
  let g = ''; for (let w = 0; w < 4; w++) for (let d = 0; d < 7; d++) { const k = w * 7 + d; g += `<rect class="g-day f" x="${20 + d * 16}" y="${28 + w * 22}" width="13" height="18" style="animation-delay:${(k * 0.18).toFixed(2)}s"/>`; }
  return `<svg viewBox="0 0 150 140">${g}</svg>`;
}

/* ---------------- 1 · shapes overview ---------------- */
function pShapes() {
  return `<div class="xp-head"><div><h3>How each strand is taught</h3><p>B Squared treats every strand as a ladder. Ours doesn't. Five teaching shapes, read from the rulings in the dataset. Click a strand to see it in its own view.</p></div></div>
  <div class="sh-grid">${Object.keys(SHAPE).map(k => `<section class="sh-col"><div class="sh-glyph" aria-hidden="true">${glyph(k)}</div><h4>${SHAPE[k].name}</h4><p>${SHAPE[k].line}</p>
    <div class="sh-cards">${Object.keys(META).filter(c => META[c].s === k).map(c => `<button class="sh-card" data-xgo="${c}"><b><span class="nm">${esc(META[c].n)}${prov(c)}</span><span class="ct">${ST[c].length}</span></b><small>${esc(META[c].m)}</small></button>`).join('')}</div></section>`).join('')}</div>
  <div class="xp-note"><span><b>Provisional:</b> Algebra and the Formal Ladder are marked provisional throughout the dataset, and most WPS 3 rulings are still awaiting your tick (the number spine is ruled).</span><span>Money and Telling the Time change shape at WPS 3: the ladder stops and the skills are used.</span></div>`;
}

/* ---------------- 2 · the ladder ---------------- */
const LD_STRANDS = ['FDP', 'ACL', 'TTT', 'MON', 'ALG'];
const STOREY = {
  FDP: { 'WPS 2.1': ['WPS 2.1', 'Fair sharing'], 'WPS 2.2': ['WPS 2.2', 'The bottom number is an instruction'], 'WPS 2.3': ['WPS 2.3', 'Fractions work on amounts'], 'WPS 3': ['WPS 3', 'Three forms of one idea'] },
  ACL: { 'WPS 2.1': ['WPS 2.1', 'The hour'], 'WPS 2.2': ['WPS 2.2', 'Half and quarters'], 'WPS 2.3': ['WPS 2.3', 'The minutes'] },
  TTT: { 'WPS 2.1': ['WPS 2.1', ''], 'WPS 2.2': ['WPS 2.2', ''], 'WPS 2.3': ['WPS 2.3', ''] },
  MON: { 'WPS 2.1': ['WPS 2.1', 'Coins differ'], 'WPS 2.2': ['WPS 2.2', 'Amounts can be built; change comes back'], 'WPS 2.3': ['WPS 2.3', 'I can shop for myself'] }
};
const TIMES = { 'ANA-2.1-01': null, 'ANA-2.1-02': [3, 0], 'ANA-2.2-01': [3, 30], 'ANA-2.2-02': [3, 15], 'ANA-2.2-03': [3, 45], 'ANA-2.3-01': [3, 25], 'ANA-2.3-02': [3, 17] };
const DIGI = { 'TTT-2.1-01': ['3:00', 'o\'clock'], 'TTT-2.2-01': ['3:30', 'half past'], 'TTT-2.2-02': ['9:00 · 10:30', 'which comes first?'], 'TTT-2.2-03': ['12:00', 'lunch when the clock says'], 'TTT-2.3-01': ['3:17', 'any digital time'], 'TTT-2.3-02': ['3:17 pm', 'am and pm'], 'TTT-2.3-03': ['15:17', '24-hour'], 'TTT-2.3-04': ['15:17 → 16:00', '43 minutes to go'], 'TTT-2.3-05': ['15:40', 'the bus'], 'TTT-3-01': ['09:50 – 11:15', '1 hr 25 min'], 'TTT-3-02': ['7:45 pm = 19:45', ''], 'TTT-3-04': ['10:00 · 10:40 · 12:15', 'a planned day'] };
const FR = {
  'FDP-2.1-01': ['dots', 8, 2, 8], 'FDP-2.1-02': ['bar', 2, 0], 'FDP-2.1-03': ['bar', 2, 1, '½'], 'FDP-2.2-01': ['bar', 4, 1, '¼'], 'FDP-2.2-02': ['bar', 3, 1, '⅓'],
  'FDP-2.2-03': ['bar', 5, 0, 'bottom number 5 → 5 equal parts'], 'FDP-2.2-04': ['dots', 8, 4, 2], 'FDP-2.2-05': ['two', [4, 2], [2, 1], '2 quarters = 1 half'], 'FDP-2.2-06': ['unfair'],
  'FDP-2.3-01': ['dots', 12, 3, 4], 'FDP-2.3-02': ['bar', 4, 3, '¾'], 'FDP-2.3-03': ['two', [3, 2], [4, 3], '⅔ or ¾ — which is more?'], 'FDP-2.3-04': ['txt', '¾', '3 parts taken · 4 equal parts'], 'FDP-2.3-05': ['txt', '½ = 0.5 = 50%', 'in money and measures'],
  'FDP-3-01': ['txt', '¼ = 0.25 = 25%', 'the everyday set'], 'FDP-3-02': ['txt', '25% off £40', '= £10 off'], 'FDP-3-03': ['txt', '½ of 6 = 6 ÷ 2', '"of" means take a part'], 'FDP-3-04': ['txt', '0.3 · ¼ · 35%', 'order them by reasoning'],
  'FDP-3-05': ['txt', '£0.50 or ½ or 50%?', 'choose the useful form'], 'FDP-3-06': ['txt', '≈ 20% of £49 → about £10', 'estimate, calculate, check'], 'FDP-3-07': ['two', [4, 4], [4, 1], '1¼ = 125%']
};
function ldItems(c) {
  const all = ST[c].slice();
  if (META[c].s === 'loop') return { rungs: all.filter(s => s.lv !== 'WPS 3'), loop: all.filter(s => s.lv === 'WPS 3') };
  return { rungs: all, loop: [] };
}
function pLadder() {
  const c = X.ld, { rungs, loop } = ldItems(c);
  let prevSt = null;
  const rows = rungs.map((s, i) => {
    const key = c === 'ALG' ? 'r' + s.rung : s.lv;
    const st = c === 'ALG' ? ['Rung ' + s.rung, ''] : ((STOREY[c] || {})[s.lv] || [s.lv, '']);
    const first = key !== prevSt; prevSt = key;
    const gate = c === 'FDP' ? s.id === 'FDP-2.3-04' : (c === 'ALG' && s.gate);
    const thread = c === 'ALG' && s.type === 'THREAD';
    return `<li class="rg ${first ? 'storeystart' : ''} ${gate ? 'gate' : ''} ${thread ? 'thread' : ''}" data-ldi="${i}"><span class="sto">${first ? `<span>${esc(st[0])}<em>${esc(st[1])}</em></span>` : ''}</span><span class="gr"><i></i></span><span class="tx">${esc(s.t)}<code>${esc(s.id)}</code></span></li>`;
  }).join('');
  const deck = loop.length ? `<div class="loopdeck"><h5>WPS 3 · used again and again in enquiries and routine (provisional ruling)</h5><svg viewBox="0 0 64 90" aria-hidden="true"><path class="lp" d="M14 90 V60 M50 90 V60 M14 60 C14 20 50 20 50 60"/><circle class="lp" cx="32" cy="34" r="18"/><circle class="g-dot" r="5"><animateMotion dur="3.5s" repeatCount="indefinite" path="M32 16 A18 18 0 1 1 31.99 16"/></circle></svg>
    <div class="ld-items">${loop.map((s, j) => `<button data-ldi="${rungs.length + j}">${esc(s.t)} <code style="font-family:var(--w-f-mono);font-size:11px;color:var(--w-ink2)">${esc(s.id)}</code></button>`).join('')}</div></div>` : '';
  return `<div class="xp-head"><div><h3>The ladder</h3><p>A strand you climb, drawn as one. The rung you are on is lit; rungs above are still to come. Gold rungs are gates. Press Climb, or tap any rung.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div class="xp-pick">${LD_STRANDS.map(k => `<button data-ld="${k}" aria-pressed="${k === c}">${esc(META[k].n.replace('Time — ', '').replace('Fractions, Decimals & Percentages', 'Fractions'))}</button>`).join('')}</div><button class="xp-play" data-play="ld" data-lbl="▲ Climb">▲ Climb</button></div></div>
  <div class="ld"><div class="ld-scroll" id="ldScroll">${deck}<ol class="ld-list" id="ldList">${rows}</ol><span class="ld-climber" id="ldClimber"></span></div><div class="ld-focus" id="ldFocus"></div></div>
  <div class="xp-note"><span><b>${esc(META[c].n)}</b> ${kk(META[c].s)} ${prov(c)} · ${esc(META[c].m)}</span><span>Storey names come from your rulings; the clock, display and fraction pictures are examples.</span></div>`;
}
function vizFor(c, s) {
  if (c === 'ACL') {
    const t = TIMES[s.id];
    const ticks = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line class="tick" x1="${100 + 82 * Math.sin(a)}" y1="${100 - 82 * Math.cos(a)}" x2="${100 + 90 * Math.sin(a)}" y2="${100 - 90 * Math.cos(a)}"/><text x="${100 + 68 * Math.sin(a)}" y="${100 - 68 * Math.cos(a)}">${i || 12}</text>`; }).join('');
    const hA = t ? (t[0] % 12) * 30 + t[1] * 0.5 : 0, mA = t ? t[1] * 6 : 0;
    return `<svg class="clk ${t ? '' : 'spin'}" viewBox="0 0 200 200" width="190" height="190"><circle class="face" cx="100" cy="100" r="94"/>${ticks}<line class="hand h" x1="100" y1="100" x2="100" y2="52" stroke-width="7" style="transform:rotate(${hA}deg)"/><line class="hand m" x1="100" y1="100" x2="100" y2="26" stroke-width="4" style="transform:rotate(${mA}deg)"/><circle cx="100" cy="100" r="5" fill="var(--w-ink)"/></svg>`;
  }
  if (c === 'TTT') { const d = DIGI[s.id] || ['', '']; return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><span class="digi">${esc(d[0])}</span><span style="font-size:13px;color:var(--w-ink2)">${esc(d[1])}</span></div>`; }
  if (c === 'FDP') {
    const f = FR[s.id]; if (!f) return '';
    const bar = (n, k, y, w) => { w = w || 300; let o = ''; for (let i = 0; i < n; i++) o += `<rect x="${10 + i * w / n}" y="${y}" width="${w / n}" height="44" class="${i < k ? 'on' : ''}"/>`; return o; };
    if (f[0] === 'bar') return `<svg class="fr-bar" viewBox="0 0 320 110" width="320">${bar(f[1], f[2], 10)}<text class="fr-s" x="160" y="90" style="font-size:${f[3] && f[3].length < 3 ? 26 : 13}px;fill:var(--w-ink)">${esc(f[3] || '')}</text></svg>`;
    if (f[0] === 'two') return `<svg class="fr-bar" viewBox="0 0 320 150" width="320">${bar(f[1][0], f[1][1], 10)}${bar(f[2][0], f[2][1], 66)}<text class="fr-s" x="160" y="138" style="font-size:14px;fill:var(--w-ink)">${esc(f[3])}</text></svg>`;
    if (f[0] === 'unfair') return `<svg class="fr-bar" viewBox="0 0 320 110" width="320"><rect x="10" y="10" width="200" height="44" class="on"/><rect x="210" y="10" width="100" height="44"/><text class="fr-s" x="160" y="90" style="font-size:14px;fill:var(--w-ink)">Two parts, but not halves</text></svg>`;
    if (f[0] === 'dots') { const [, n, g, on] = f, per = n / g; let o = ''; for (let j = 0; j < g; j++) { o += `<rect x="${10 + j * (300 / g) + 4}" y="6" width="${300 / g - 8}" height="64" fill="none" stroke="var(--x-faint)"/>`; for (let i = 0; i < per; i++) o += `<circle class="fr-dot ${j * per + i < on ? 'on' : ''}" cx="${10 + j * (300 / g) + 18 + (i % 4) * 16}" cy="${24 + Math.floor(i / 4) * 24}" r="6"/>`; } return `<svg viewBox="0 0 320 100" width="320">${o}<text class="fr-s" x="160" y="92">${n} shared into ${g} equal groups</text></svg>`; }
    if (f[0] === 'txt') return `<svg viewBox="0 0 320 110" width="320"><text class="fr-t" x="160" y="52">${esc(f[1])}</text><text class="fr-s" x="160" y="86">${esc(f[2])}</text></svg>`;
  }
  return '';
}
function ldFocus() {
  const c = X.ld, { rungs, loop } = ldItems(c), all = rungs.concat(loop);
  X.ldi = Math.max(0, Math.min(X.ldi, all.length - 1));
  const s = all[X.ldi], inLoop = X.ldi >= rungs.length;
  document.querySelectorAll('#ldList .rg').forEach((li, i) => { li.classList.toggle('at', i === X.ldi); li.classList.toggle('above', i > X.ldi); });
  document.querySelectorAll('.loopdeck .ld-items button').forEach((b, j) => { b.classList.toggle('at', rungs.length + j === X.ldi); b.classList.toggle('above', rungs.length + j > X.ldi); });
  const cl = $('#ldClimber'), sc = $('#ldScroll');
  if (cl) {
    const el = inLoop ? document.querySelector('.loopdeck') : document.querySelector(`#ldList .rg[data-ldi="${X.ldi}"]`);
    if (el) {
      const top = inLoop ? el.offsetTop + 60 : el.offsetTop + el.offsetHeight / 2 + document.getElementById('ldList').offsetTop;
      cl.style.top = top + 'px'; cl.style.opacity = inLoop ? 0 : 1;
      const target = top - sc.clientHeight / 2; sc.scrollTo({ top: target, behavior: RM ? 'auto' : 'smooth' });
    }
  }
  const prev = all[X.ldi - 1], next = all[X.ldi + 1];
  const sto = c === 'ALG' ? 'Rung ' + s.rung + (s.type === 'THREAD' ? ' · thread' : ' · block') + (s.gate ? ' · gate' : '') : (inLoop ? 'WPS 3 · used again and again' : ((STOREY[c] || {})[s.lv] || [s.lv, '']).filter(Boolean).join(' · '));
  $('#ldFocus').innerHTML = `<div class="where"><span>${esc(META[c].n)}</span><span>·</span><span>${esc(sto)}</span><span>·</span><span>rung ${Math.min(X.ldi + 1, rungs.length)} of ${rungs.length}${inLoop ? ' + routine' : ''}</span></div>
    <p class="big">${esc(s.t)} <code>${esc(s.id)}</code></p>
    ${vizFor(c, s) ? `<div class="ld-viz">${vizFor(c, s)}</div>` : ''}
    <div class="ld-neigh"><div><b>Came before</b>${prev ? esc(prev.t) : 'The start of the strand.'}</div><div><b>${inLoop || X.ldi + 1 >= rungs.length && loop.length ? 'Then' : 'Next rung'}</b>${next ? esc(next.t) : 'The top of the ladder.'}</div></div>
    <div class="ld-nav"><button data-ldstep="-1">▼ Down a rung</button><button data-ldstep="1">▲ Up a rung</button></div>`;
}

/* ---------------- 3 · come round again ---------------- */
const SP_STRANDS = ['FIT', 'AAP', 'AR', 'PDM', 'MEAS'];
const PAIRS = {
  FIT: [['FIT-2-06', 'FIT-3-07'], ['FIT-2-P', 'FIT-3-06'], ['FIT-2-09', 'FIT-3-01'], ['FIT-2-03', 'FIT-3-05'], ['FIT-2-01', 'FIT-3-04'], ['FIT-2-05', 'FIT-3-03']],
  AAP: [['AAP-2-01', 'AAP-3-01'], ['AAP-2-03', 'AAP-3-02'], ['AAP-2-04', 'AAP-3-04'], ['AAP-2-05', 'AAP-3-03']],
  AR: [['AR-2.3-01', 'AR-3-03'], ['AR-2.3-04', 'AR-3-01'], ['AR-2.3-05', 'AR-3-02']],
  PDM: [['PDM-2.3-02', 'PDM-3-03'], ['PDM-2.3-04', 'PDM-3-01'], ['PDM-2.3-05', 'PDM-3-06'], ['PDM-2.3-01', 'PDM-3-07']]
};
const BEATS2 = [['Compare', /compare|order|hotter/i], ['Own units', /cubes|hands|footsteps|own units|weights, and count/i], ['Estimate and check', /estimate|guess/i], ['Record with the unit', /record|with its unit/i], ['Standard units', /centimetres|grams|thermometer|stopwatch|degrees|kilograms/i]];
const BEATS3 = [['Measure', /estimate, measure and record/i], ['Estimate', /estimate|judge/i], ['Calculate', /calculate|differences/i], ['Convert', /convert/i], ['Apply', /real|limits|interpret|data/i]];
const beatOf = (t, B) => { for (let i = 0; i < B.length; i++) if (B[i][1].test(t)) return i; return B.length - 1; };
function spiralPts(cx, cy, r0, r1, turns, n) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n * turns * 2 * Math.PI, r = r0 + (r1 - r0) * i / n; out.push([cx + r * Math.cos(t - Math.PI / 2), cy + r * Math.sin(t - Math.PI / 2), t]); } return out; }
function pSpiral() {
  const c = X.sp;
  const pick = `<div class="xp-pick">${SP_STRANDS.map(k => `<button data-sp="${k}" aria-pressed="${k === c}">${k === 'MEAS' ? 'Measures (all five)' : esc(META[k].n.replace('Shape in Use — ', '').replace(' & Movement', ''))}</button>`).join('')}</div>`;
  const head = `<div class="xp-head"><div><h3>Come round again</h3><p>A strand you revisit, drawn as a spiral. Inside is the first time round (WPS 2), outside is the next (WPS 3): the same ideas, further out. Orange dashes link an idea to where it comes round again.</p></div>${pick}</div>`;
  if (c === 'MEAS') return head + measures();
  const list = ST[c];
  const inner = list.filter(s => s.lv !== 'WPS 3'), outer = list.filter(s => s.lv === 'WPS 3');
  const P = spiralPts(300, 300, 70, 262, 2, 720);
  const d = 'M' + P.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const pos = {};
  inner.forEach((s, i) => { const k = Math.round((i + .5) / inner.length * 360); pos[s.id] = P[k]; });
  outer.forEach((s, i) => { const k = 360 + Math.round((i + .5) / outer.length * 360); pos[s.id] = P[Math.min(k, 720)]; });
  const pairs = (PAIRS[c] || []).filter(p => pos[p[0]] && pos[p[1]]);
  const pairLines = pairs.map(([a, b]) => `<path class="sp-pair" data-pair="${a}|${b}" d="M${pos[a][0].toFixed(1)} ${pos[a][1].toFixed(1)} Q300 300 ${pos[b][0].toFixed(1)} ${pos[b][1].toFixed(1)}" style="opacity:0"/>`).join('');
  const nodes = list.map(s => { const p = pos[s.id], w3 = s.lv === 'WPS 3', anchor = c === 'AAP' && s.id === 'AAP-3-01'; return `<g class="sp-node ${w3 ? 'w3' : ''} ${anchor ? 'anchor' : ''}" data-spid="${esc(s.id)}" transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})">${anchor ? '<rect x="-11" y="-11" width="22" height="22"/>' : `<circle r="${w3 ? 10 : 9}"/>`}<text y="${p[1] < 300 ? -16 : 24}">${esc(s.id.replace(/^[A-Z]+-/, ''))}</text></g>`; }).join('');
  const lab = `<text class="sp-ring-l" x="300" y="296" text-anchor="middle">First time round</text><text class="sp-ring-l" x="300" y="312" text-anchor="middle" style="fill:var(--w-ink2);font-weight:400">${esc(inner[0] ? (inner[0].lv === 'WPS 2' ? 'WPS 2 · one band' : inner[0].lv) : '')}</text><text class="sp-ring-l" x="40" y="40">Outer turn: WPS 3, next time round</text>`;
  const tb = c === 'FIT' ? `<div class="trackb"><svg viewBox="0 0 40 90" aria-hidden="true"><line class="g-rail" x1="8" y1="2" x2="8" y2="88"/><line class="g-rail" x1="32" y1="2" x2="32" y2="88"/>${[78, 58, 38, 18].map(y => `<line class="g-rung" x1="8" y1="${y}" x2="32" y2="${y}"/>`).join('')}</svg><div><b>Beside it: Track B, a ladder</b><p>For learners heading to a qualification, the Formal Ladder (SHP-3-01 to 04) is assessed instead of Track A. No learner is assessed on both.</p></div></div>` : '';
  return head + `<div class="sp"><div class="sp-stage"><svg viewBox="0 0 600 600" id="spSvg"><path class="sp-path" id="spPath" d="${d}"/>${lab}${pairLines}${nodes}${RM ? '' : '<circle class="sp-comet" r="7"><animateMotion dur="16s" repeatCount="indefinite"><mpath href="#spPath"/></animateMotion></circle>'}</svg></div>
    <div class="sp-side"><div class="where" style="font-size:12.5px;color:var(--w-ink2)">${esc(META[c].n)} · ${kk('spiral')} ${prov(c)}</div><p class="big" id="spBig"></p><div id="spAgain"></div>${tb}<div class="sp-list">${list.map(s => `<button data-spid="${esc(s.id)}"><span>${esc(s.id)}</span>${esc(s.t)}</button>`).join('')}</div></div></div>
    <div class="xp-note"><span>${esc(META[c].m)}${c === 'AAP' ? ' The gold square is the taught step.' : ''}</span><span>The orange links are my suggestions for where an idea comes round again; worth your check.</span></div>`;
}
function spFocus() {
  if (X.sp === 'MEAS') return;
  const list = ST[X.sp]; if (!X.spi || !list.find(s => s.id === X.spi)) X.spi = list[0].id;
  const s = list.find(x => x.id === X.spi);
  const pair = (PAIRS[X.sp] || []).find(p => p.includes(s.id));
  document.querySelectorAll('.sp-node').forEach(g => { const id = g.dataset.spid; g.classList.toggle('at', id === s.id); g.classList.toggle('dim', id !== s.id && !(pair && pair.includes(id))); });
  document.querySelectorAll('.sp-pair').forEach(p => p.style.opacity = pair && p.dataset.pair === pair.join('|') ? 1 : 0.0);
  document.querySelectorAll('.sp-list button').forEach(b => b.classList.toggle('at', b.dataset.spid === s.id));
  $('#spBig').innerHTML = `${esc(s.t)} <code>${esc(s.id)}</code>`;
  const other = pair ? list.find(x => x.id === pair.find(p => p !== s.id)) : null;
  $('#spAgain').innerHTML = other ? `<div class="again"><b>${s.lv === 'WPS 3' ? 'First time round' : 'Comes round again as'}</b>${esc(other.t)} <code style="font-family:var(--w-f-mono);font-size:11px;color:var(--w-ink2)">${esc(other.id)}</code></div>` : '';
}
const MEAS = ['LEN', 'MAS', 'CAP', 'TEM', 'DUR'];
function measures() {
  const c = X.meas, list = ST[c];
  const inner = list.filter(s => s.lv !== 'WPS 3'), outer = list.filter(s => s.lv === 'WPS 3');
  const arc = (r, a0, a1) => { const p = a => [300 + r * Math.cos(a - Math.PI / 2), 300 + r * Math.sin(a - Math.PI / 2)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const seg = 2 * Math.PI / 5, gap = 0.04;
  const ring = (r, B, items, cls) => {
    const by = B.map(() => []); items.forEach(s => by[beatOf(s.t, B)].push(s));
    return B.map((b, i) => { const a0 = i * seg + gap, a1 = (i + 1) * seg - gap, mid = (a0 + a1) / 2;
      const off = cls === 'o' ? 36 : -46; const lp = [300 + (r + off) * Math.cos(mid - Math.PI / 2), 300 + (r + off) * Math.sin(mid - Math.PI / 2)];
      const dots = by[i].map((s, j) => { const a = a0 + (j + 1) * (a1 - a0) / (by[i].length + 1); return `<g class="sp-node ${cls === 'o' ? 'w3' : ''}" data-mid="${esc(s.id)}" transform="translate(${(300 + r * Math.cos(a - Math.PI / 2)).toFixed(1)} ${(300 + r * Math.sin(a - Math.PI / 2)).toFixed(1)})"><circle r="9"/></g>`; }).join('');
      return `<path class="sp-beat-arc ${by[i].length ? 'on' : ''}" d="${arc(r, a0, a1)}"/><text class="sp-beat" x="${lp[0].toFixed(1)}" y="${lp[1].toFixed(1)}">${b[0]}</text>${dots}`; }).join('');
  };
  const orbit = `M300 ${300 - 130} A130 130 0 1 1 299.9 ${300 - 130} L300 ${300 - 230} A230 230 0 1 1 299.9 ${300 - 230}`;
  return `<div class="sp"><div class="sp-stage"><svg viewBox="0 0 600 600"><path id="mOrbit" d="${orbit}" fill="none"/>${ring(130, BEATS2, inner, 'i')}${ring(230, BEATS3, outer, 'o')}
      <text class="sp-ring-l" x="300" y="292" text-anchor="middle">WPS 2 · one band</text><text class="sp-ring-l" x="300" y="312" text-anchor="middle" style="fill:var(--w-ink2);font-weight:400">outer ring: WPS 3</text>
      ${RM ? '' : '<circle class="sp-comet" r="7"><animateMotion dur="12s" repeatCount="indefinite"><mpath href="#mOrbit"/></animateMotion></circle>'}</svg></div>
    <div class="sp-side"><div class="xp-pick">${MEAS.map(k => `<button data-meas="${k}" aria-pressed="${k === c}">${esc(META[k].n.split(' —')[0].replace(' & Height', ''))}</button>`).join('')}</div>
      <p style="margin:0;font-size:14px">Switch between the five measures and watch the rings stay the same shape. Only the words change: <b>the same five moves every time</b>, and standard units come last without holding the others back.</p>
      <p class="big" id="mBig" style="min-height:0;font-size:19px">Tap a dot on the rings.</p>
      <div class="sp-list" style="max-height:300px">${list.map(s => `<button data-mid="${esc(s.id)}"><span>${esc(s.id)}</span>${esc(s.t)}</button>`).join('')}</div></div></div>
    <div class="xp-note"><span>The five WPS 2 moves are your DUR ruling: compare, own units, estimate and check, record with the unit, standard units. I placed each statement on its move by its wording.</span><span>Converting units at WPS 3 depends on decimal place value: see Spotlight.</span></div>`;
}

/* ---------------- 4 · a family at once ---------------- */
const FAMS = { Time: ['TTT', 'ACL', 'CAL'], Measures: ['LEN', 'MAS', 'CAP', 'TEM', 'DUR'], 'Shape and space': ['FIT', 'AAP', 'AR', 'PDM', 'SHP'], Data: ['STAT', 'PROB'], Number: ['NCP', 'FDP', 'ALG', 'MON'] };
function cellShape(kind, span) {
  if (kind === 'L') return `<svg class="bgshape" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 V48 H25 V36 H50 V24 H75 V12 H100 V60 Z" fill="var(--x-ladder-bg)"/></svg>`;
  if (kind === 'D') { let o = ''; for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) o += `<rect x="${6 + i * 13}" y="${8 + j * 15}" width="9" height="10" fill="var(--x-daily-bg)"/>`; return `<svg class="bgshape" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">${o}</svg>`; }
  const n = span ? 7 : 3, pts = []; for (let i = 0; i <= 240; i++) { const t = i / 240 * n * 2 * Math.PI, a = 100 / (n * 2 * Math.PI); pts.push(((a * t - 1.6 * a * Math.sin(t)) + 3).toFixed(2) + ' ' + (32 - 16 * Math.cos(t)).toFixed(2)); }
  return `<svg class="bgshape" viewBox="0 0 106 60" preserveAspectRatio="none" aria-hidden="true"><path d="M${pts.join(' L')}" fill="none" stroke="var(--x-rev)" stroke-opacity=".35" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;
}
function pFamily() {
  const fam = FAMS[X.fam], cols = X.fam === 'Number' ? ['WPS 1', 'WPS 2.1', 'WPS 2.2', 'WPS 2.3', 'WPS 3'] : ['WPS 2.1', 'WPS 2.2', 'WPS 2.3', 'WPS 3'];
  X.col = Math.min(X.col, cols.length - 1);
  const rows = fam.map(c => {
    const sh = META[c].s;
    const kindAt = col => sh === 'daily' ? 'D' : (sh === 'spiral' || sh === 'measure' ? 'R' : (sh === 'loop' && col === 'WPS 3' ? 'R' : 'L'));
    const list = ST[c];
    let cells = '';
    const collapsed = list.some(s => s.lv === 'WPS 2');
    cols.forEach((col, ci) => {
      if (collapsed && col === 'WPS 2.2') return; if (collapsed && col === 'WPS 2.3') return;
      if (collapsed && col === 'WPS 2.1') {
        const it = list.filter(s => s.lv === 'WPS 2');
        cells += `<div class="fm-cell span" style="grid-column:span 3" data-c0="${ci}" data-c1="${ci + 2}">${cellShape('R', true)}<span class="fm-count">${it.length} · one band across WPS 2, revisited</span>${it.map(s => `<span class="fm-st R">${esc(s.t)}</span>`).join('')}</div>`; return;
      }
      const it = list.filter(s => s.lv === col);
      const extra = c === 'NCP' && col === 'WPS 2.1' ? list.filter(s => s.lv === 'spiral').length : 0;
      const k = kindAt(col);
      cells += `<div class="fm-cell" data-c0="${ci}" data-c1="${ci}">${it.length ? cellShape(k) : ''}${it.length ? `<span class="fm-count">${it.length}${extra ? ' + ' + extra + ' in spiral blocks' : ''}</span>` : ''}${it.slice(0, 6).map(s => `<span class="fm-st ${k}">${esc(s.t)}</span>`).join('')}${it.length > 6 ? `<span class="fm-st ${k}">and ${it.length - 6} more</span>` : ''}</div>`;
    });
    return `<div class="fm-row ${X.lane === c ? 'on' : ''}" data-lane="${c}"><button class="fm-name" data-lane="${c}"><b>${esc(META[c].n.replace('Time — ', '').replace('Shape in Use — ', ''))}</b>${kk(sh)}</button>${cells}</div>`;
  }).join('');
  return `<div class="xp-head"><div><h3>A family at once</h3><p>Every strand in a family on one grid, each drawn in its teaching shape: steps for ladders, loops for revisits, a filling calendar for daily routine. Press Play to sweep through the steps; tap a strand to focus it.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div class="xp-pick">${Object.keys(FAMS).map(f => `<button data-fam="${f}" aria-pressed="${f === X.fam}">${f}</button>`).join('')}</div><button class="xp-play" data-play="fm" data-lbl="▶ Play">▶ Play</button></div></div>
  <div class="fm"><div class="fm-grid ${X.lane ? 'focus' : ''}" id="fmGrid" style="grid-template-columns:200px repeat(${cols.length}, minmax(0, 1fr))"><span class="fm-h">Strand</span>${cols.map((c, i) => `<button class="fm-h" data-fcol="${i}" style="border-left:0;border-right:0;border-top:0;background:none;text-align:left">${c}</button>`).join('')}${rows}<span class="fm-col-hl" id="fmHl"></span></div><div class="fm-sum" id="fmSum"></div></div>
  <div class="xp-note"><span>Duration now sits with the measures: it is measured like Length, Mass and Capacity.</span><span>Steps = climb in order · loops = come round again · squares = picked up every day.</span></div>`;
}
function fmFocus() {
  const fam = FAMS[X.fam], cols = X.fam === 'Number' ? ['WPS 1', 'WPS 2.1', 'WPS 2.2', 'WPS 2.3', 'WPS 3'] : ['WPS 2.1', 'WPS 2.2', 'WPS 2.3', 'WPS 3'];
  const heads = document.querySelectorAll('#fmGrid button.fm-h'), grid = $('#fmGrid'), hl = $('#fmHl');
  const h = heads[X.col]; if (!h) return;
  hl.style.left = h.offsetLeft + 'px'; hl.style.width = h.offsetWidth + 'px';
  const col = cols[X.col];
  $('#fmSum').innerHTML = `<div style="border:0;grid-column:1/-1;padding:0"><b style="font-size:13px;color:var(--w-ink)">At ${col}</b></div>` + fam.map(c => {
    const sh = META[c].s, list = ST[c];
    let it = list.filter(s => s.lv === col), note = '';
    if (!it.length && list.some(s => s.lv === 'WPS 2') && col.startsWith('WPS 2.')) { it = list.filter(s => s.lv === 'WPS 2'); note = 'One band across WPS 2, revisited: '; }
    const k = sh === 'daily' ? 'D' : (sh === 'spiral' || sh === 'measure' || (sh === 'loop' && col === 'WPS 3') ? 'R' : 'L');
    return `<div class="${k}"><b>${esc(META[c].n.replace('Time — ', '').replace('Shape in Use — ', ''))}</b>${it.length ? note + esc(it[0].t) + (it.length > 1 ? ` <span style="color:var(--w-ink2)">+ ${it.length - 1} more</span>` : '') : '<span style="color:var(--w-ink2)">Nothing at this step.</span>'}</div>`;
  }).join('');
}

/* ---------------- 5 · spotlight ---------------- */
const SN = [
  ['SPIRAL', 30, 60, 'Spiral blocks M1–M8', 'M1–M8 · NCP 2.1/2.2'], ['NCP-3-04', 30, 170, 'Times tables to 10 × 10, by derivation', 'NCP-3-04'], ['NCP-3-03', 30, 280, 'Negative numbers, through zero', 'NCP-3-03'], ['NCP-3-06', 30, 390, 'Multiply and divide; digit shift', 'NCP-3-06'],
  ['MON', 330, 60, 'Money: pounds and pence (2dp)', 'Money · WPS 2'], ['FDP-2.3-04', 330, 170, 'Reading a fraction (the notation gate)', 'FDP-2.3-04'], ['FDP-3', 330, 280, 'Decimal place value', 'FDP · WPS 3'], ['FDP-3-02', 330, 390, 'Fractions and % of real amounts', 'FDP-3-02'],
  ['TEM-3-01', 630, 40, 'Temperature, including below zero', 'TEM-3-01'], ['TEM-3-02', 630, 110, 'Temperature differences across zero', 'TEM-3-02'], ['LEN-3-02', 630, 210, 'Convert units of length', 'LEN-3-02'], ['MAS-3-02', 630, 280, 'Convert units of mass', 'MAS-3-02'], ['CAP-3-02', 630, 350, 'Convert units of capacity', 'CAP-3-02'], ['DUR-3-02', 630, 420, 'Convert units of time', 'DUR-3-02']
];
const SE = [
  ['SPIRAL', 'NCP-3-04', 'The spiral blocks arriving at their destination.'], ['NCP-3-04', 'FDP-3-02', 'Tables secure before fractions of amounts.'],
  ['NCP-3-03', 'TEM-3-01', 'Negatives feed the across-zero work in Temperature.'], ['NCP-3-03', 'TEM-3-02', 'Negatives feed the across-zero work in Temperature.'],
  ['NCP-3-06', 'LEN-3-02', 'Digit shift (detail 6) feeds unit conversion.'], ['NCP-3-06', 'MAS-3-02', ''], ['NCP-3-06', 'CAP-3-02', ''], ['NCP-3-06', 'DUR-3-02', ''],
  ['FDP-3', 'LEN-3-02', 'Conversion by digit shift depends on decimal place value being secure.'], ['FDP-3', 'MAS-3-02', ''], ['FDP-3', 'CAP-3-02', ''], ['FDP-3', 'DUR-3-02', ''],
  ['MON', 'FDP-3', '2dp is the anchor: money is where decimals mean something before they are abstract.'], ['FDP-2.3-04', 'FDP-3', 'Reading fraction notation is a gate at 2.3.']
];
const SFULL = id => { for (const c in ST) { const s = ST[c].find(x => x.id === id); if (s) return s.t; } return { SPIRAL: 'Eight spiral blocks of grouping, sharing and early multiplication facts, revisited alongside WPS 2.1 and 2.2.', MON: 'The Money ladder at WPS 2: coins, amounts, change, shopping.', 'FDP-3': 'Decimal place value: the taught core of Fractions, Decimals & Percentages at WPS 3, anchored by money (2dp) and measures (1dp and 2dp).' }[id]; };
const W = 240, Hh = 54;
function pSpot() {
  const P = {}; SN.forEach(n => P[n[0]] = n);
  const edges = SE.map(([a, b], i) => { const A = P[a], B = P[b]; const x1 = A[1] + W, y1 = A[2] + Hh / 2, x2 = B[1], y2 = B[2] + Hh / 2; let d; if (A[1] === B[1] && B[2] - A[2] > Hh + 70) { const xl = A[1], ya = A[2] + Hh / 2, yb = B[2] + Hh / 2; d = `M${xl} ${ya} C${xl - 34} ${ya} ${xl - 34} ${yb} ${xl} ${yb}`; } else if (A[1] === B[1]) { d = `M${A[1] + W / 2} ${A[2] + Hh} C${A[1] + W / 2} ${A[2] + Hh + 30} ${B[1] + W / 2} ${B[2] - 30} ${B[1] + W / 2} ${B[2]}`; } else { const mx = (x1 + x2) / 2; d = `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`; } return `<path class="sl-edge" data-e="${i}" d="${d}"/>`; }).join('');
  const nodes = SN.map(([id, x, y, l, c]) => `<g class="sl-node" data-sl="${id}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(l)}"><rect width="${W}" height="${Hh}" rx="0"/><text x="12" y="22">${esc(l)}</text><text class="c" x="12" y="40">${esc(c)}</text></g>`).join('');
  return `<div class="sl"><div class="xp-head"><div><h3 style="color:var(--s-ink)">Spotlight</h3><p>Ladders and revisits meet. Pick a statement: it lights up, and so does everything it needs first and everything it opens up, across strands. The links are the "secure before" rulings in the dataset.</p></div></div>
    <div class="sl-wrap"><div class="sl-stage"><svg viewBox="0 0 900 470"><text class="sl-col" x="30" y="24">Number spine (ladder)</text><text class="sl-col" x="330" y="24">Fractions and money</text><text class="sl-col" x="630" y="24">Measures (come round again)</text>${edges}${nodes}</svg></div><div class="sl-side" id="slSide"></div></div>
    <div class="xp-note"><span><b>Why it helps:</b> a measures lesson on converting units is a revisit, but it leans on two ladders being secure first.</span><span>Sources: NCP_WPS3_Layers, FDP_Layers rulings.</span></div></div>`;
}
function slFocus() {
  const id = X.sl, P = {}; SN.forEach(n => P[n[0]] = n);
  const ins = SE.map((e, i) => [e, i]).filter(([e]) => e[1] === id), outs = SE.map((e, i) => [e, i]).filter(([e]) => e[0] === id);
  const lit = new Set([id, ...ins.map(([e]) => e[0]), ...outs.map(([e]) => e[1])]);
  document.querySelectorAll('.sl-node').forEach(g => { const k = g.dataset.sl; g.classList.toggle('at', k === id); g.classList.toggle('lit', lit.has(k) && k !== id); g.classList.toggle('off', !lit.has(k)); });
  const on = new Set([...ins, ...outs].map(([, i]) => String(i)));
  document.querySelectorAll('.sl-edge').forEach(p => { p.classList.toggle('on', on.has(p.dataset.e)); p.classList.toggle('off', !on.has(p.dataset.e)); });
  const why = [...ins, ...outs].map(([e]) => e[2]).filter(Boolean);
  $('#slSide').innerHTML = `<p class="big">${esc(SFULL(id))} <code>${esc(P[id][4])}</code></p>
    <div><h5>Needs first</h5>${ins.length ? `<ul>${ins.map(([e]) => `<li>${esc(P[e[0]][3])}</li>`).join('')}</ul>` : '<p style="margin:0;font-size:13px;color:var(--s-ink2)">Nothing in this view.</p>'}</div>
    <div><h5>Opens up</h5>${outs.length ? `<ul>${outs.map(([e]) => `<li>${esc(P[e[1]][3])}</li>`).join('')}</ul>` : '<p style="margin:0;font-size:13px;color:var(--s-ink2)">Nothing in this view.</p>'}</div>
    ${why.length ? `<p class="why">${esc([...new Set(why)].join(' '))}</p>` : ''}`;
}

/* ---------------- 6 · the whole spine ---------------- */
function pSpine() {
  const L = ST.NCP; let last = '';
  const base = { 'WPS 1': 0, 'WPS 2.1': 80, spiral: 150, 'WPS 2.2': 210, 'WPS 2.3': 280, 'WPS 3': 360 };
  let k = 0;
  const rows = L.map((s, i) => { const g = s.lv + '|' + (s.ph || s.pt || ''); const first = g !== last; last = g; const lab = s.lv === 'spiral' ? (s.pt || 'Spiral') : (s.lv + (s.ph ? ' · P' + s.ph : ''));
    const x = s.lv === 'spiral' ? base.spiral + Math.round(26 * Math.sin((k++) * 0.75)) : base[s.lv] + (s.ph || 0) * 6;
    return `<div class="fe-row ${s.lv === 'spiral' ? 'sp' : ''} ${first ? 'first' : ''}" data-fe="${i}"><span class="lv">${esc(lab)}</span><span class="ln"><i class="bar" style="margin-left:${x}px"></i><span class="t"><code>${esc(s.id)}</code>${esc(s.t)}</span></span></div>`; }).join('');
  if (!X.fe) X.fe = L.findIndex(s => s.lv === 'WPS 2.2');
  const lv = ['WPS 1', 'WPS 2.1', 'spiral', 'WPS 2.2', 'WPS 2.3', 'WPS 3'];
  return `<div class="xp-head"><div><h3>The whole spine</h3><p>All ${L.length} Number, Calculation &amp; Pattern statements on one screen, WPS 1 to WPS 3. Move over it (or drag on an iPad) and a lens opens where you point. Each step up the ladder moves to the right, so the spine reads as a staircase; the sand lines that weave are the spiral blocks that come round alongside 2.1 and 2.2.</p></div><button class="xp-play" data-play="fe" data-lbl="▶ Fly through">▶ Fly through</button></div>
  <div class="fe"><div class="fe-scroll" id="feScroll" tabindex="0" aria-label="Number spine, use arrow keys to move the lens">${rows}</div><div class="fe-side"><div class="lvl" id="feLv"></div><div class="ph" id="fePh"></div><div class="fe-mini" id="feMini">${lv.map(l => `<span data-felv="${l}"><span>${l === 'spiral' ? 'Spiral blocks (2.1/2.2)' : l}</span><span>${L.filter(s => s.lv === l).length}</span></span>`).join('')}</div><p style="margin:0;font-size:12.5px;color:var(--w-ink2)">Arrow keys move the lens too.</p></div></div>
  <div class="xp-note"><span>The lens shows the shape of the whole ladder: long phases, short phases, and where the spiral runs alongside.</span><span>Ladder, ruled 19-09.</span></div>`;
}
function feFocus(scroll) {
  const rows = document.querySelectorAll('.fe-row'); const L = ST.NCP; X.fe = Math.max(0, Math.min(X.fe, L.length - 1));
  rows.forEach((r, i) => { const d = Math.abs(i - X.fe); r.className = r.className.replace(/\bn[0-3]\b/g, '').trim() + (d <= 3 ? ' n' + d : ''); });
  const s = L[X.fe];
  $('#feLv').textContent = s.lv === 'spiral' ? 'Spiral' : s.lv; $('#fePh').textContent = s.pt ? (s.ph ? 'Phase ' + s.ph + ' · ' : '') + s.pt : '';
  document.querySelectorAll('#feMini > span').forEach(x => x.classList.toggle('on', x.dataset.felv === s.lv));
  if (scroll) { const r = rows[X.fe], sc = $('#feScroll'); sc.scrollTop = r.offsetTop - sc.clientHeight / 2; }
}

/* ---------------- 6b · the spine as stairs ---------------- */
X.sti = null; X.stm = null;
function stPhases() {
  const L = ST.NCP, out = [];
  L.forEach(s => { if (s.lv === 'spiral') return; const key = s.lv + '|' + (s.ph || ''); let g = out.find(x => x.key === key); if (!g) { g = { key, lv: s.lv, ph: s.ph, pt: s.pt || (s.lv === 'WPS 3' ? 'The WPS 3 storey' : ''), items: [] }; out.push(g); } g.items.push(s); });
  return out;
}
function stBlocks() { const B = []; ST.NCP.filter(s => s.lv === 'spiral').forEach(s => { let g = B.find(x => x.pt === s.pt); if (!g) { g = { pt: s.pt, items: [] }; B.push(g); } g.items.push(s); }); return B; }
function pStairs() {
  const P = stPhases(), B = stBlocks();
  if (X.sti == null) X.sti = P.findIndex(p => p.lv === 'WPS 2.2');
  const x0 = 40, base = 330, per = 4.4, pad = 7, rise = 8, lvGap = 16;
  let x = x0, y = base - 20, prevLv = null; const geo = []; const lvStart = {};
  P.forEach((p, i) => { if (prevLv && p.lv !== prevLv) { x += lvGap; y -= lvGap - rise; } if (!lvStart[p.lv]) lvStart[p.lv] = { x, i }; const w = p.items.length * per + pad; geo.push({ x, y, w }); x += w; y -= rise; prevLv = p.lv; });
  const lvls = Object.keys(lvStart);
  const LVC = { 'WPS 1': .55, 'WPS 2.1': .7, 'WPS 2.2': .85, 'WPS 2.3': 1, 'WPS 3': 1 };
  const steps = P.map((p, i) => { const g = geo[i]; return `<g class="stp" data-sti="${i}" style="cursor:pointer"><title>${esc(p.lv)}${p.ph ? ' · Phase ' + p.ph : ''}${p.pt ? ' · ' + esc(p.pt) : ''} · ${p.items.length} statements</title><rect class="stp-b" x="${g.x.toFixed(1)}" y="${g.y.toFixed(1)}" width="${(g.w - 1.5).toFixed(1)}" height="${(base - g.y).toFixed(1)}" style="fill-opacity:${LVC[p.lv]}"/>${g.w > 16 && p.ph ? `<text class="stp-n" x="${(g.x + g.w / 2).toFixed(1)}" y="${(g.y + 14).toFixed(1)}">${p.ph}</text>` : ''}</g>`; }).join('');
  const labels = lvls.map(l => { const s0 = lvStart[l], nxt = lvls[lvls.indexOf(l) + 1], xEnd = nxt ? lvStart[nxt].x - lvGap : x; const n = ST.NCP.filter(s => s.lv === l).length; return `<text class="stp-l" x="${s0.x}" y="${base + 20}">${l}</text><text class="stp-c" x="${s0.x}" y="${base + 35}">${n} statements</text><line x1="${s0.x}" x2="${xEnd - 2}" y1="${base + 4}" y2="${base + 4}" stroke="var(--x-ladder)" stroke-width="2"/>`; }).join('');
  const cs = lvStart['WPS 2.1'].x, ce = (lvStart['WPS 2.3'] || { x }).x - lvGap, n = B.length, lw = (ce - cs) / n;
  const coil = B.map((b, i) => { const cx = cs + lw * (i + .5); return `<g class="stc" data-stm="${esc(b.pt)}" style="cursor:pointer"><title>${esc(b.pt)} · ${b.items.length} statements</title><ellipse cx="${cx.toFixed(1)}" cy="${base + 74}" rx="${(lw / 2 - 3).toFixed(1)}" ry="14"/><text x="${cx.toFixed(1)}" y="${base + 78}">${esc(b.pt.replace('Spiral block ', ''))}</text></g>`; }).join('');
  return `<div class="xp-head"><div><h3>The spine as stairs</h3><p>All of Number, Calculation &amp; Pattern as one staircase. Each step is a phase; the longer the step, the more statements it holds. Underneath 2.1 and 2.2, the spiral blocks loop round alongside the climb. Click a step or a loop, or press Climb.</p></div><button class="xp-play" data-play="st" data-lbl="▲ Climb">▲ Climb</button></div>
    <div class="stw"><svg class="stsvg" viewBox="0 0 ${Math.ceil(x + 40)} ${base + 100}" role="img" aria-label="Number spine staircase">${steps}${labels}<text class="stp-c" x="${cs}" y="${base + 54}" style="fill:var(--x-rev);font-weight:700">Spiral blocks, alongside 2.1 and 2.2</text>${coil}<rect id="stClimber" class="stcl" width="12" height="12" x="0" y="0"/></svg></div>
    <div class="stpanel" id="stPanel"></div>
    <div class="xp-note"><span>Ladder, ruled 19-09: teach in this order. The spiral blocks run alongside and arrive at NCP-3-04, the times tables.</span><span>Step length = number of statements in the phase.</span></div>`;
}
function stFocus() {
  const P = stPhases(), B = stBlocks();
  X.sti = Math.max(0, Math.min(X.sti, P.length - 1));
  document.querySelectorAll('.stp').forEach(g => g.classList.toggle('at', !X.stm && +g.dataset.sti === X.sti));
  document.querySelectorAll('.stc').forEach(g => g.classList.toggle('at', g.dataset.stm === X.stm));
  const cl = document.getElementById('stClimber');
  if (cl) { if (X.stm) { const e = document.querySelector(`.stc[data-stm="${X.stm}"] ellipse`); cl.setAttribute('x', +e.getAttribute('cx') - 6); cl.setAttribute('y', +e.getAttribute('cy') - 34); } else { const r = document.querySelector(`.stp[data-sti="${X.sti}"] rect`); cl.setAttribute('x', (+r.getAttribute('x') + +r.getAttribute('width') / 2 - 6).toFixed(1)); cl.setAttribute('y', (+r.getAttribute('y') - 16).toFixed(1)); } }
  const g = X.stm ? B.find(b => b.pt === X.stm) : P[X.sti];
  const title = X.stm ? 'Alongside WPS 2.1 and 2.2' : `${esc(g.lv)}${g.ph ? ' · Phase ' + g.ph : ''} · step ${X.sti + 1} of ${P.length}`;
  $('#stPanel').innerHTML = `<div class="stp-h"><div><span class="stp-where">${title} · ${g.items.length} statements</span><h4>${esc(X.stm ? g.pt : (g.pt || ''))}</h4></div><div class="ld-nav"><button data-ststep="-1">▼ Down a step</button><button data-ststep="1">▲ Up a step</button></div></div><ol class="stp-list">${g.items.map(s => `<li>${esc(s.t)} <code>${esc(s.id)}</code></li>`).join('')}</ol>`;
}

/* ---------------- wiring ---------------- */
/* parked: ['spiral', 'Come round again'] and ['spine', 'The whole spine'] — code kept */
const TABS = [['shapes', 'Teaching shapes', 'All 19 strands'], ['ladder', 'The ladder', 'Climb in order'], ['family', 'A family at once', 'Time, Measures, Shape, Data, Number'], ['spot', 'Spotlight', 'What leans on what'], ['stairs', 'The spine as stairs', 'Number, phase by phase']];
function render() {
  stopAll();
  $('#xpTabs').innerHTML = TABS.map(([k, b, s]) => `<button class="xp-tab" role="tab" data-xtab="${k}" aria-selected="${X.tab === k}"><b>${b}</b><small>${s}</small></button>`).join('');
  const P = { shapes: pShapes, ladder: pLadder, spiral: pSpiral, family: pFamily, spot: pSpot, spine: pSpine, stairs: pStairs }[X.tab];
  const host = $('#xpPanel'); host.innerHTML = P(); host.className = 'xp' + (X.tab === 'spot' ? ' sl-host' : '');
  if (X.tab === 'spot') host.style.background = 'var(--s-bg)'; else host.style.background = '';
  if (RM) document.querySelectorAll('#xpPanel svg').forEach(s => s.pauseAnimations && s.pauseAnimations());
  requestAnimationFrame(() => {
    if (!$('#xpPanel')) return;
    if (X.tab === 'ladder') ldFocus(); if (X.tab === 'spiral') spFocus(); if (X.tab === 'family') fmFocus(); if (X.tab === 'spot') slFocus(); if (X.tab === 'spine') feFocus(true); if (X.tab === 'stairs') stFocus();
  });
}
function play(kind, btn) {
  if (timers[kind]) { stopAll(); return; }
  btn.classList.add('on'); btn.textContent = '■ Stop';
  if (kind === 'ld') { const { rungs, loop } = ldItems(X.ld); X.ldi = 0; ldFocus(); timers.ld = setInterval(() => { X.ldi++; if (X.ldi >= rungs.length + loop.length) { stopAll(); return; } ldFocus(); }, 1500); }
  if (kind === 'fm') { const n = X.fam === 'Number' ? 5 : 4; X.col = 0; fmFocus(); timers.fm = setInterval(() => { X.col = (X.col + 1) % n; fmFocus(); if (X.col === n - 1) setTimeout(stopAll, 2400); }, 2400); }
  if (kind === 'st') { timers.st = setInterval(() => { X.sti++; X.stm = null; if (X.sti >= stPhases().length) { stopAll(); return; } stFocus(); }, 1700); return; }
  if (kind === 'fe') { timers.fe = setInterval(() => { X.fe++; if (X.fe >= ST.NCP.length) { stopAll(); return; } feFocus(true); }, 140); }
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-sti],[data-stm],[data-ststep],[data-xtab],[data-xgo],[data-ld],[data-ldi],[data-ldstep],[data-play],[data-sp],[data-spid],[data-meas],[data-mid],[data-fam],[data-lane],[data-fcol],[data-sl],[data-felv]');
  if (!t || !t.closest('#xpSec')) return;
  handle(t);
  if (window.XP.onChange) window.XP.onChange();
});
function handle(t) {
  const d = t.dataset;
  if (d.sti != null && d.sti !== '') { stopAll(); X.sti = +d.sti; X.stm = null; return stFocus(); }
  if (d.stm) { stopAll(); X.stm = d.stm; return stFocus(); }
  if (d.ststep) { stopAll(); X.stm = null; X.sti = Math.max(0, Math.min(stPhases().length - 1, X.sti + (+d.ststep))); return stFocus(); }
  if (d.xtab) { X.tab = d.xtab; return render(); }
  if (d.xgo) { const c = d.xgo, s = META[c].s; if (c === 'NCP') X.tab = 'stairs'; else if (s === 'measure') { X.tab = 'family'; X.fam = 'Measures'; X.lane = c; } else if (s === 'spiral') { X.tab = 'family'; X.fam = (c === 'STAT' || c === 'PROB') ? 'Data' : 'Shape and space'; X.lane = c; } else if (s === 'ladder' || s === 'loop') { X.tab = LD_STRANDS.includes(c) ? 'ladder' : 'family'; if (LD_STRANDS.includes(c)) { X.ld = c; X.ldi = 0; } else { X.fam = c === 'SHP' ? 'Shape and space' : 'Number'; X.lane = c; } } else if (s === 'daily') { X.tab = 'family'; X.fam = 'Time'; X.lane = c; } else if (MEAS.includes(c)) { X.tab = 'spiral'; X.sp = 'MEAS'; X.meas = c; } else if (PAIRS[c]) { X.tab = 'spiral'; X.sp = c; X.spi = null; } else { X.tab = 'family'; X.fam = c === 'STAT' || c === 'PROB' ? 'Measures' : 'Shape and space'; X.lane = null; } render(); $('#xpSec').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); return; }
  if (d.ld) { X.ld = d.ld; X.ldi = 0; return render(); }
  if (d.ldi != null && d.ldi !== '') { stopAll(); X.ldi = +d.ldi; return ldFocus(); }
  if (d.ldstep) { stopAll(); X.ldi += +d.ldstep; return ldFocus(); }
  if (d.play) return play(d.play, t);
  if (d.sp) { X.sp = d.sp; X.spi = null; return render(); }
  if (d.spid) { X.spi = d.spid; return spFocus(); }
  if (d.meas) { X.meas = d.meas; return render(); }
  if (d.mid) { const s = ST[X.meas].find(x => x.id === d.mid); document.querySelectorAll('[data-mid]').forEach(el => { el.classList.toggle('at', el.dataset.mid === d.mid); if (el.tagName === 'g') el.classList.toggle('dim', el.dataset.mid !== d.mid); }); $('#mBig').innerHTML = `${esc(s.t)} <code>${esc(s.id)}</code>`; return; }
  if (d.fam) { X.fam = d.fam; X.lane = null; return render(); }
  if (d.lane) { X.lane = X.lane === d.lane ? null : d.lane; const g = $('#fmGrid'); g.classList.toggle('focus', !!X.lane); document.querySelectorAll('.fm-row').forEach(r => r.classList.toggle('on', r.dataset.lane === X.lane)); return requestAnimationFrame(fmFocus); }
  if (d.fcol) { stopAll(); X.col = +d.fcol; return fmFocus(); }
  if (d.sl) { X.sl = d.sl; return slFocus(); }
  if (d.felv) { const i = ST.NCP.findIndex(s => s.lv === d.felv); if (i >= 0) { X.fe = i; feFocus(true); } }
}
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('.sl-node') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); X.sl = e.target.closest('.sl-node').dataset.sl; slFocus(); if (window.XP.onChange) window.XP.onChange(); }
  if (X.tab === 'spine' && document.activeElement && document.activeElement.closest && document.activeElement.closest('#xpSec') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); X.fe += e.key === 'ArrowDown' ? 1 : -1; feFocus(true); }
});
let raf = 0;
function lens(ev) {
  const sc = ev.target.closest && ev.target.closest('#feScroll'); if (!sc) return;
  const y = ev.touches ? ev.touches[0].clientY : ev.clientY, x = ev.touches ? ev.touches[0].clientX : ev.clientX;
  if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const el = document.elementFromPoint(x, y); const row = el && el.closest && el.closest('.fe-row'); if (row && +row.dataset.fe !== X.fe) { X.fe = +row.dataset.fe; feFocus(false); } });
}
document.addEventListener('mousemove', lens); document.addEventListener('touchmove', lens, { passive: true });
/* hooks for the prototype shell: it mounts the tabs on "How strands are taught", stops timers when you leave, and names the view for review notes */
function label() {
  const tab = (TABS.find(t => t[0] === X.tab) || TABS[0])[1]; let d = '';
  if (X.tab === 'ladder') d = META[X.ld].n;
  if (X.tab === 'family') d = X.fam + (X.lane ? ' · ' + META[X.lane].n : '');
  if (X.tab === 'spot') { const n = SN.find(x => x[0] === X.sl); d = n ? n[3] : ''; }
  if (X.tab === 'stairs') { const P = stPhases(), g = P[X.sti]; d = X.stm ? X.stm : (g ? g.lv + (g.ph ? ' · Phase ' + g.ph : '') : ''); }
  return tab + (d ? ' · ' + d : '');
}
window.XP = { state: X, mount: render, stop: stopAll, label, tabs: TABS.map(t => t[0]), onChange: null };
})();
