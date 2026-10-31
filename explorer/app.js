/* Bettws Curriculum Explorer — the staff app.
 *
 * Plain JavaScript, no framework, no network calls, nothing tracked. The dataset is
 * baked in as JSON by build.py. Screens are hash routes so the back button works and
 * the whole app is one cacheable file.
 *
 * Content rules (CLAUDE.md): statements shown exactly as the dataset has them; the
 * code small at the end of the line; the main view carries no PFA labels, badges,
 * counts or mentions; the PFA section is its own mode in its own colour.
 */
(function () {
  'use strict';

  var D = JSON.parse(document.getElementById('data').textContent);
  var VARIANT = D.variant || 'staff';
  var SITE = !!D.site;
  var A = window.LI_ASSETS || {};
  var S = D.statements;
  var byId = {};
  S.forEach(function (s) { byId[s.bettws_id] = s; });
  var NCP = 'Number, Calculation & Pattern';
  var LO = {}; D.levelOrder.forEach(function (l, i) { LO[l] = i; });
  var SO = {}; D.strandOrder.forEach(function (l, i) { SO[l] = i; });
  function isLife(s) { return s.strand.indexOf('PFA ·') === 0; }

  // Pools. The main view: curriculum = main, never a life statement. (The four
  // statements with curriculum = both belong to the strand "PFA Maths", which cannot be
  // named in the main view, so they live in the PFA section only.)
  var MAIN = S.filter(function (s) { return s.curriculum === 'main' && !isLife(s); });
  var PFA = S.filter(function (s) { return s.pfa_class === 'PFA-direct'; });
  var SPINE = S.filter(function (s) { return s.strand === NCP; });
  var ANY_BSQ = S.some(function (s) { return s.bsquared && s.bsquared.length; });

  var STEPS = [
    { key: 'wps1', label: 'WPS 1', test: function (l) { return l.indexOf('WPS 1') === 0; } },
    { key: '2.1', label: 'WPS 2.1', test: function (l) { return l === 'WPS 2.1' || l === 'WPS 2.1/2.2 spiral'; } },
    { key: '2.2', label: 'WPS 2.2', test: function (l) { return l === 'WPS 2.2'; } },
    { key: '2.3', label: 'WPS 2.3', test: function (l) { return l === 'WPS 2.3'; } },
    { key: '2', label: 'WPS 2 (one level)', test: function (l) { return l === 'WPS 2 (collapsed)'; } },
    { key: '3', label: 'WPS 3', test: function (l) { return l === 'WPS 3'; } }
  ];
  var STEP_BY_KEY = {}; STEPS.forEach(function (st) { STEP_BY_KEY[st.key] = st; });

  // ------------------------------------------------------------------ DOM helpers
  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (k === 'style') e.style.cssText = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(e, x); });
    else if (typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(String(c)));
    else e.appendChild(c);
  }
  var PATHS = {
    search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5L21 21',
    close: 'M5 5l14 14 M19 5L5 19',
    'chevron-down': 'M5 9l7 7 7-7',
    'chevron-right': 'M9 5l7 7-7 7',
    check: 'M4 12.5l5 5L20 6.5',
    print: 'M6 9V3h12v6 M6 18H3v-9h18v9h-3 M6 14h12v7H6z',
    ladder: 'M7 3v18 M17 3v18 M7 7h10 M7 12h10 M7 17h10',
    repeat: 'M4 11V7h13 M14 4l3 3-3 3 M20 13v4H7 M10 20l-3-3 3-3',
    plus: 'M12 5v14 M5 12h14',
    book: 'M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z',
    pupils: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M16 4.3a3.5 3.5 0 0 1 0 6.4 M18 14a5 5 0 0 1 3 4.6V20',
    compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5z',
    thread: 'M4 6h16 M4 12h10 M4 18h6',
    map: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',
    list: 'M4 6h16 M4 12h16 M4 18h16',
    card: 'M3 5h18v14H3z M7 10h7 M7 14h5 M16 10h2 M16 14h2',
    minus: 'M5 12h14',
    download: 'M12 4v12 M7 11l5 5 5-5 M4 20h16',
    open: 'M14 4h6v6 M20 4l-9 9 M19 13v7H4V5h7',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14 M10 11v6 M14 11v6',
    qr: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v1 M17 20h4 M20 17v3'
  };
  function icon(name, cls) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bx-icon' + (cls ? ' ' + cls : ''));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    (PATHS[name] || '').split(' M').forEach(function (seg, i) {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', (i ? 'M' : '') + seg);
      svg.appendChild(p);
    });
    return svg;
  }
  function uniq(arr) { var o = {}, r = []; arr.forEach(function (v) { if (v != null && !o[v]) { o[v] = 1; r.push(v); } }); return r; }
  function groupBy(arr, f) { var m = {}, keys = []; arr.forEach(function (x) { var k = f(x); if (!(k in m)) { m[k] = []; keys.push(k); } m[k].push(x); }); return { m: m, keys: keys }; }
  function short(strand) { return D.strandShort[strand] || ''; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; } }

  // -------------------------------------------------------------------- ordering
  function levelIndex(l) { return LO[l] == null ? 99 : LO[l]; }
  function cmpStatements(a, b) {
    var so = (a.sort_order == null ? 9999 : a.sort_order) - (b.sort_order == null ? 9999 : b.sort_order);
    if (so) return so;
    var li = levelIndex(a.level) - levelIndex(b.level);
    if (li) return li;
    var ph = (a.phase_number == null ? 999 : a.phase_number) - (b.phase_number == null ? 999 : b.phase_number);
    if (ph) return ph;
    if (a.strand === 'Algebra' && b.strand === 'Algebra' && a.alg_order != null && b.alg_order != null && a.alg_order !== b.alg_order) return a.alg_order - b.alg_order;
    return a.row_order - b.row_order;
  }
  function sorted(list) { return list.slice().sort(cmpStatements); }
  function strandsOf(pool) {
    return uniq(pool.map(function (s) { return s.strand; })).sort(function (a, b) { return (SO[a] == null ? 99 : SO[a]) - (SO[b] == null ? 99 : SO[b]); });
  }
  function kindOf(list) {
    var kinds = uniq(list.map(function (s) { return s.ladder_or_exposure; }).filter(Boolean));
    if (kinds.length === 1) return kinds[0] === 'Ladder' ? 'ladder' : 'exposure';
    return kinds.length ? 'mixed' : null;
  }
  function stepsOf(list) {
    return STEPS.map(function (st) {
      var cell = list.filter(function (s) { return st.test(s.level); });
      return { step: st, list: cell, kind: kindOf(cell) };
    }).filter(function (c) { return c.list.length; });
  }
  function levelChipText(s) {
    if (s.level === 'WPS 2 (collapsed)') return 'WPS 2';
    if (s.level === 'PFA') return 'Outcome';
    if (s.phase_number != null && s.level.indexOf('WPS 1') !== 0) return s.level + ' · Phase ' + s.phase_number;
    return s.level;
  }
  function phaseHeading(s) {
    if (s.phase_number != null) return 'Phase ' + s.phase_number + (s.phase_title ? ' · ' + s.phase_title : '');
    if (s.level === 'WPS 2.1/2.2 spiral') return 'WPS 2.1/2.2 spiral';
    return null;
  }

  // -------------------------------------------------------------------- basket
  var BASKET_KEY = 'bettws.explorer.basket.v1', MAX_CARD = 6;
  var basket = (store(BASKET_KEY) || []).filter(function (i) { return byId[i]; });
  function saveBasket() { store(BASKET_KEY, basket); }
  function inBasket(id) { return basket.indexOf(id) >= 0; }
  function toggleBasket(id) {
    var at = basket.indexOf(id);
    if (at >= 0) { basket.splice(at, 1); saveBasket(); toast('Taken off your learning intentions.'); return; }
    if (basket.length >= MAX_CARD) { toast('The card holds six. Take one off to add another.'); return; }
    basket.push(id); saveBasket();
    toast('Added to learning intentions (' + basket.length + ' of ' + MAX_CARD + ').');
  }
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2200);
    renderBar();
  }

  // -------------------------------------------------------------------- router
  var route = { path: [], query: {}, raw: '' };
  var openCards = {};
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var q = {}, qi = h.indexOf('?');
    if (qi >= 0) {
      h.slice(qi + 1).split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); });
      h = h.slice(0, qi);
    }
    route = { path: h ? h.split('/').map(decodeURIComponent) : [], query: q, raw: location.hash };
  }
  function go(path, query) {
    var h = '#/' + path.map(encodeURIComponent).join('/');
    if (query) { var qs = Object.keys(query).filter(function (k) { return query[k] != null && query[k] !== ''; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]); }).join('&'); if (qs) h += '?' + qs; }
    if (h === location.hash) render(); else location.hash = h;
  }
  function href(path, query) {
    var h = '#/' + path.map(encodeURIComponent).join('/');
    if (query) { var qs = Object.keys(query).filter(function (k) { return query[k] != null && query[k] !== ''; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]); }).join('&'); if (qs) h += '?' + qs; }
    return h;
  }
  function mode() { return route.path[0] === 'pfa' || (route.path[0] === 'search' && route.query.m === 'pfa') ? 'pfa' : 'main'; }

  window.addEventListener('hashchange', function () { parseHash(); render(); window.scrollTo(0, 0); });

  // -------------------------------------------------------------------- app bar
  function renderBar() {
    var bar = document.getElementById('appbar');
    bar.textContent = '';
    var m = mode();
    bar.className = 'bx-appbar' + (m === 'pfa' ? ' is-pfa' : '');
    var home = el('a', { class: 'bx-appbar-home', href: '#/', 'aria-label': 'Home' },
      A.logo ? el('img', { class: 'bx-appbar-logo', src: A.logo, alt: '' }) : null,
      el('p', { class: 'bx-appbar-title' }, 'Curriculum Explorer', el('small', null, VARIANT === 'bertie' ? "Bertie's version · " + D.version : 'Bettws · dataset ' + D.version)));
    bar.appendChild(home);
    var tabs = el('nav', { class: 'bx-tabs', 'aria-label': 'Sections' });
    var current = route.path[0] || '';
    [['pupils', 'My pupils', 'pupils', true], [m === 'pfa' ? 'pfa' : 'browse', 'Browse', 'book', false], ['enquiries', 'Enquiries', 'compass', false]].forEach(function (t) {
      var active = (t[0] === 'browse' && (current === 'browse' || current === 'search' || current === 'statement' || current === '')) || (t[0] === 'pfa' && (current === 'pfa' || current === 'search')) || current === t[0];
      var b = el('a', { class: 'bx-tab', href: '#/' + t[0], 'aria-selected': active ? 'true' : 'false', role: 'link' }, icon(t[2]), t[1]);
      if (t[3]) { b.setAttribute('aria-disabled', 'true'); b.title = 'Coming in phase 2'; b.addEventListener('click', function (e) { e.preventDefault(); go(['pupils']); }); }
      tabs.appendChild(b);
    });
    bar.appendChild(tabs);
    bar.appendChild(el('a', { class: 'basket-btn', href: '#/basket', 'aria-current': current === 'basket' || current === 'card' ? 'page' : null, 'aria-label': 'Learning intentions, ' + basket.length + ' chosen' },
      icon('card'), el('span', { class: 'lbl' }, 'Learning intentions'), basket.length ? el('span', { class: 'n' }, basket.length) : null));
  }

  // -------------------------------------------------------------------- pieces
  function crumbs(items) {
    var c = el('nav', { class: 'crumbs', 'aria-label': 'You are here' });
    items.forEach(function (it, i) {
      if (i) c.appendChild(el('span', { class: 'sep' }, '›'));
      c.appendChild(it.href ? el('a', { href: it.href }, it.label) : el('span', null, it.label));
    });
    return c;
  }
  function printHead(title) {
    return el('div', { class: 'print-head' }, A.logo ? el('img', { src: A.logo, alt: '' }) : null,
      el('h1', null, title, el('small', null, 'Bettws Curriculum Explorer · dataset ' + D.version + ' · printed ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))));
  }
  function printButton() {
    return el('button', { type: 'button', class: 'bx-btn bx-btn-sm noprint', onclick: function () { window.print(); } }, icon('print'), 'Print this list');
  }
  function levelChip(text) { return el('span', { class: 'bx-level' }, text); }
  function strandBadge(kind) {
    if (kind === 'ladder') return el('span', { class: 'bx-badge bx-badge-ladder' }, icon('ladder'), 'Ladder');
    if (kind === 'exposure') return el('span', { class: 'bx-badge bx-badge-exposure' }, icon('repeat'), 'Met again and again');
    return null;
  }
  function bsqChip(s) { return s.bsquared && s.bsquared.length ? el('span', { class: 'bx-badge bx-badge-bsq', title: 'B Squared step' }, 'B² ' + s.bsquared.join(', ')) : null; }
  function modeSwitch(m) {
    var sw = el('div', { class: 'bx-mode', role: 'group', 'aria-label': 'Which curriculum' });
    sw.appendChild(el('button', { type: 'button', 'data-m': 'main', 'aria-checked': m === 'main' ? 'true' : 'false', role: 'radio', onclick: function () { go(['browse']); } }, icon('book'), 'Main curriculum'));
    sw.appendChild(el('button', { type: 'button', 'data-m': 'pfa', 'aria-checked': m === 'pfa' ? 'true' : 'false', role: 'radio', onclick: function () { go(['pfa']); } }, icon('compass'), 'Preparing for adulthood'));
    return sw;
  }
  function searchBar(m, value, live) {
    var input = el('input', { type: 'search', placeholder: 'Search statements', 'aria-label': 'Search statements', value: value || '', autocomplete: 'off', autocapitalize: 'off' });
    var clear = el('button', { type: 'button', class: 'bx-clear', 'aria-label': 'Clear search', style: value ? '' : 'display:none', onclick: function () { input.value = ''; if (live) live(''); else go([m === 'pfa' ? 'pfa' : 'browse']); } }, icon('close'));
    var timer = null;
    input.addEventListener('input', function () {
      clear.style.display = input.value ? '' : 'none';
      if (live) { live(input.value); return; }
      clearTimeout(timer);
      timer = setTimeout(function () { if (input.value.trim().length >= 2) go(['search'], { m: m, q: input.value }); }, 250);
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!live) go(['search'], { m: m, q: input.value }); } });
    return el('label', { class: 'bx-search' }, icon('search'), input, clear);
  }
  function empty(title, body, name) {
    return el('section', { class: 'bx-empty' }, icon(name || 'book', 'bx-empty-mark'), el('h3', null, title), body ? el('p', null, body) : null);
  }

  // One curriculum statement. opts: {mode, stone, task, showStrand, showSub, open}
  function card(s, opts) {
    opts = opts || {};
    var m = opts.mode || 'main';
    var art = el('article', { class: 'bx-statement', id: 'st-' + s.bettws_id });
    var main = el('div', { class: 'bx-statement-main' });
    if (opts.showSub && s.sub_strand) main.appendChild(el('p', { class: 'bx-statement-sub' }, s.sub_strand));
    main.appendChild(el('p', { class: 'bx-statement-text' + (opts.stone ? ' is-stone' : '') }, s.statement, ' ', el('span', { class: 'bx-code' }, s.bettws_id)));
    var why = s.purpose;
    if (why && (m === 'pfa' || !/\bPFA\b/.test(why))) main.appendChild(el('p', { class: 'bx-why' }, el('b', null, 'Why this matters'), why));
    if (opts.task) main.appendChild(el('p', { class: 'bx-task' }, el('b', null, 'In this enquiry'), opts.task));
    var chips = el('div', { class: 'bx-chiprow bx-statement-meta' });
    chips.appendChild(levelChip(levelChipText(s)));
    if (opts.showStrand) chips.appendChild(el('span', { class: 'bx-badge bx-badge-thread' }, isLife(s) ? s.strand.replace('PFA · ', '') : s.strand));
    if (s.ladder_or_exposure) add(chips, strandBadge(s.ladder_or_exposure === 'Ladder' ? 'ladder' : 'exposure'));
    add(chips, bsqChip(s));
    if (m === 'pfa' && (s.delivery === 'thread' || s.thread_tags)) chips.appendChild(el('span', { class: 'bx-badge bx-badge-thread' }, icon('thread'), 'Thread' + (s.thread_tags ? ' · ' + s.thread_tags : '')));
    main.appendChild(chips);
    art.appendChild(main);

    var hasMore = (s.steps && s.steps.length) || (s.probes && s.probes.length) || (s.counts && s.counts.length);
    var actions = el('div', { class: 'bx-statement-actions' });
    var detail = null;
    if (hasMore) {
      var open = opts.open || openCards[s.bettws_id];
      detail = el('div', { class: 'bx-detail', id: 'detail-' + s.bettws_id, style: open ? '' : 'display:none' });
      if (s.steps && s.steps.length) {
        detail.appendChild(el('h4', null, 'Small steps'));
        detail.appendChild(el('ol', null, s.steps.map(function (st) { return el('li', { class: st.sub ? 'sub' : null }, st.text); })));
      }
      if (s.counts && s.counts.length) { detail.appendChild(el('h4', null, 'What counts')); s.counts.forEach(function (c) { detail.appendChild(el('p', null, c)); }); }
      if (s.probes && s.probes.length) {
        detail.appendChild(el('h4', null, 'Questions to ask'));
        detail.appendChild(el('ul', null, s.probes.map(function (p) { return el('li', null, p); })));
      }
      var reveal = el('button', { type: 'button', class: 'bx-reveal', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': 'detail-' + s.bettws_id },
        el('span', null, open ? 'Hide small steps and questions' : 'Small steps and questions'), icon('chevron-down'));
      reveal.addEventListener('click', function () {
        var now = reveal.getAttribute('aria-expanded') !== 'true';
        openCards[s.bettws_id] = now;
        reveal.setAttribute('aria-expanded', now ? 'true' : 'false');
        reveal.firstChild.textContent = now ? 'Hide small steps and questions' : 'Small steps and questions';
        detail.style.display = now ? '' : 'none';
      });
      actions.appendChild(reveal);
    } else {
      actions.appendChild(el('span', { class: 'bx-reveal bx-reveal-none', 'aria-hidden': 'true' }));
    }
    var on = inBasket(s.bettws_id);
    var addBtn = el('button', { type: 'button', class: 'bx-add', 'aria-pressed': on ? 'true' : 'false', title: on ? 'Tap to take it off the card' : 'Add to learning intentions' },
      icon(on ? 'check' : 'plus'), on ? 'On your learning intentions' : 'Add to learning intentions');
    if (!on && basket.length >= MAX_CARD) { addBtn.disabled = true; addBtn.title = 'The card holds six. Take one off to add another.'; }
    addBtn.addEventListener('click', function () { toggleBasket(s.bettws_id); render(); });
    actions.appendChild(addBtn);
    art.appendChild(actions);
    if (detail) art.appendChild(detail);
    return art;
  }

  // A heading + its statements, wrapped so the heading never strands at a page foot.
  function group(title, list, opts, headline, chips) {
    var frag = document.createDocumentFragment();
    var showSub = uniq(list.map(function (s) { return s.sub_strand; })).length > 1;
    var head = title ? el('div', { class: 'group-head' }, el('h2', { class: 't-title-2' }, title), headline ? el('p', { class: 'headline t-body' }, headline) : null, chips || null) : null;
    list.forEach(function (s, i) {
      var c = card(s, Object.assign({ showSub: showSub }, opts || {}, opts && opts.per ? opts.per(s) : {}));
      if (i === 0 && head) { var keep = el('div', { class: 'keep' }, head, el('div', { class: 'cards' }, c)); frag.appendChild(keep); }
      else frag.appendChild(el('div', { class: 'cards', style: 'margin-top:var(--space-4)' }, c));
    });
    if (!list.length && head) frag.appendChild(head);
    return frag;
  }
  // Statements grouped by phase (the number spine) or shown as one list.
  function phaseGroups(list, opts, singleTitle) {
    var frag = document.createDocumentFragment();
    var byPhase = groupBy(sorted(list), function (s) { return phaseHeading(s) || '—'; });
    if (byPhase.keys.length === 1 && byPhase.keys[0] === '—') {
      var hl = uniq(list.map(function (s) { return s.headline; }).filter(Boolean));
      frag.appendChild(group(singleTitle || null, byPhase.m['—'], opts, hl.length === 1 ? hl[0] : null));
      return frag;
    }
    byPhase.keys.forEach(function (k) {
      var lst = byPhase.m[k];
      var hl = uniq(lst.map(function (s) { return s.headline; }).filter(Boolean));
      frag.appendChild(group(k === '—' ? 'Other' : k, lst, opts, hl.length === 1 ? hl[0] : null));
    });
    return frag;
  }

  // -------------------------------------------------------------------- screens
  function vHome() {
    var page = el('div', { class: 'stack-lg' });
    page.appendChild(el('div', null, el('h1', { class: 't-title-1' }, 'Curriculum Explorer'),
      el('p', { class: 'lead' }, 'The Bettws maths curriculum, read straight from the master dataset: strands, progression steps and every statement, with its small steps and probing questions.')));
    var paths = el('div', { class: 'paths' });
    paths.appendChild(el('a', { class: 'path', href: '#/browse' }, icon('book'), el('h2', null, 'Browse the curriculum'), el('p', null, 'Strand, then progression step, then the statements.')));
    paths.appendChild(el('a', { class: 'path is-off', href: '#/pupils', 'aria-disabled': 'true' }, icon('pupils'), el('h2', null, 'My pupils'), el('p', null, 'Coming in phase 2. Profiles will arrive by QR code.')));
    page.appendChild(paths);
    var tiles = el('div', { class: 'tiles' });
    tiles.appendChild(el('a', { class: 'tile', href: '#/enquiries' }, icon('compass'), el('span', null, el('b', null, 'Enquiries'), el('span', { class: 'sub' }, 'Mapped enquiries, read-only: ' + plural(D.enquiries.length, 'enquiry', 'enquiries') + ' so far.')), icon('chevron-right', 'go')));
    tiles.appendChild(el('a', { class: 'tile', href: '#/basket' }, icon('card'), el('span', null, el('b', null, 'Learning intentions'), el('span', { class: 'sub' }, basket.length ? plural(basket.length, 'statement', 'statements') + ' chosen for the card.' : 'Choose statements as you browse, then make the card.')), icon('chevron-right', 'go')));
    if (VARIANT === 'bertie') tiles.appendChild(el('a', { class: 'tile is-off', href: '#/pupils', 'aria-disabled': 'true' }, icon('qr'), el('span', null, el('b', null, 'Profile builder'), el('span', { class: 'sub' }, 'Phase 2: pseudonym, working levels, focus statements, QR code.'))));
    page.appendChild(tiles);
    return page;
  }

  function browseHeader(m, sub) {
    var head = el('div', { class: 'stack' });
    head.appendChild(el('div', { class: 'row row-between' }, modeSwitch(m)));
    head.appendChild(searchBar(m));
    return head;
  }

  function vBrowse() {
    var page = el('div', { class: 'stack-lg' });
    page.appendChild(browseHeader('main'));
    var showMap = route.path[1] === 'map';
    var strands = strandsOf(MAIN);
    var head = el('div', { class: 'row row-between controls' },
      el('div', null, el('h1', { class: 't-title-1' }, showMap ? 'The curriculum map' : 'Strands'),
        el('p', { class: 'lead' }, showMap ? 'Strands down the side, progression steps across. Tap a count to open those statements.' : plural(MAIN.length, 'statement', 'statements') + ' in ' + strands.length + ' strands. Tap a strand to see its progression steps.')),
      el('a', { class: 'bx-btn bx-btn-sm', href: showMap ? '#/browse' : '#/browse/map' }, icon(showMap ? 'list' : 'map'), showMap ? 'See the list' : 'See the map'));
    page.appendChild(head);
    if (showMap) { page.appendChild(curriculumMap(strands)); return page; }
    var list = el('div', { class: 'list' });
    strands.forEach(function (st) {
      var lst = MAIN.filter(function (s) { return s.strand === st; });
      list.appendChild(el('a', { class: 'list-row is-plain', href: href(['browse', 's', st]) },
        el('span', { class: 'main' }, el('b', null, st), el('span', { class: 'sub' }, short(st))),
        el('span', { class: 'count' }, lst.length), icon('chevron-right', 'go')));
    });
    page.appendChild(list);
    return page;
  }

  function curriculumMap(strands) {
    var wrap = el('div', { class: 'map-wrap' });
    var table = el('table', { class: 'bx-map' });
    table.appendChild(el('thead', null, el('tr', null, el('th', { scope: 'col' }, 'Strand'), STEPS.map(function (st) { return el('th', { scope: 'col' }, st.label); }))));
    var body = el('tbody');
    strands.forEach(function (st) {
      var lst = MAIN.filter(function (s) { return s.strand === st; });
      var kind = kindOf(lst);
      var tr = el('tr', null, el('th', { scope: 'row', class: kind === 'ladder' ? 'is-ladder' : kind === 'exposure' ? 'is-exposure' : 'is-mixed' }, st,
        el('small', null, kind === 'ladder' ? 'Ladder' : kind === 'exposure' ? 'Met again and again' : 'Ladder and exposure cells')));
      STEPS.forEach(function (sp) {
        var cell = lst.filter(function (s) { return sp.test(s.level); });
        if (!cell.length) { tr.appendChild(el('td', null, el('div', { class: 'bx-cell is-gap' }, 'Gap'))); return; }
        var k = kindOf(cell);
        tr.appendChild(el('td', null, el('a', { class: 'bx-cell' + (k === 'ladder' ? ' is-l' : k === 'exposure' ? ' is-e' : ''), href: href(['browse', 's', st, sp.key]), 'aria-label': st + ', ' + sp.label + ', ' + plural(cell.length, 'statement', 'statements') },
          cell.length, el('small', null, k === 'ladder' ? 'Ladder' : k === 'exposure' ? 'Met again' : 'statements'))));
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
    var out = el('div', null, wrap, el('div', { class: 'legend' },
      el('span', null, strandBadge('ladder'), ' taught in a set order'), el('span', null, strandBadge('exposure'), ' accrues through routine, provision and enquiries'),
      el('span', null, el('span', { class: 'bx-badge bx-badge-note' }, 'Gap'), ' no statements at that step')));
    return out;
  }

  function vStrand() {
    var st = route.path[2];
    var lst = MAIN.filter(function (s) { return s.strand === st; });
    if (!lst.length) return empty('No such strand', 'Go back to the strands and choose one.');
    var page = el('div', { class: 'stack-lg' });
    page.appendChild(crumbs([{ label: 'Strands', href: '#/browse' }, { label: st }]));
    var cells = stepsOf(lst);
    var stepKey = route.path[3];
    if (stepKey) return vStep(st, lst, cells, stepKey);
    page.appendChild(el('div', null, el('h1', { class: 't-title-1' }, st), el('p', { class: 'lead' }, short(st) + '. ' + plural(lst.length, 'statement', 'statements') + ' across ' + plural(cells.length, 'progression step', 'progression steps') + '.')));
    var list = el('div', { class: 'list' });
    cells.forEach(function (c) {
      var phases = uniq(c.list.map(function (s) { return phaseHeading(s); }).filter(Boolean)).length;
      list.appendChild(el('a', { class: 'list-row ' + (c.kind === 'ladder' ? 'is-ladder' : c.kind === 'exposure' ? 'is-exposure' : 'is-plain'), href: href(['browse', 's', st, c.step.key]) },
        el('span', { class: 'main' }, el('b', null, c.step.label), el('span', { class: 'sub' }, (c.kind === 'ladder' ? 'Ladder: taught in a set order' : c.kind === 'exposure' ? 'Met again and again' : 'Ladder and exposure') + (phases > 1 ? ' · ' + plural(phases, 'phase', 'phases') : ''))),
        el('span', { class: 'count' }, c.list.length), icon('chevron-right', 'go')));
    });
    page.appendChild(list);
    return page;
  }

  function vStep(st, lst, cells, stepKey) {
    var cell = null; cells.forEach(function (c) { if (c.step.key === stepKey) cell = c; });
    if (!cell) return empty('Nothing at that step', 'This strand has no statements there.');
    var page = el('div', { class: 'stack-lg' });
    page.appendChild(crumbs([{ label: 'Strands', href: '#/browse' }, { label: st, href: href(['browse', 's', st]) }, { label: cell.step.label }]));
    page.appendChild(printHead(st + ' · ' + cell.step.label));
    var chips = el('div', { class: 'bx-chiprow' }, levelChip(cell.step.label));
    add(chips, strandBadge(cell.kind));
    page.appendChild(el('div', { class: 'row row-between controls' },
      el('div', null, el('div', { class: 'page-title' }, el('h1', { class: 't-title-1' }, st), chips), el('p', { class: 'lead' }, short(st) + '. ' + plural(cell.list.length, 'statement', 'statements') + (st === 'Algebra' && stepKey === '3' ? ', in teaching order' : '') + '.')),
      printButton()));
    var body = el('div');
    if (stepKey === 'wps1') {
      var byLevel = groupBy(sorted(cell.list), function (s) { return s.level; });
      byLevel.keys.sort(function (a, b) { return levelIndex(a) - levelIndex(b); });
      byLevel.keys.forEach(function (lv) { var l = byLevel.m[lv]; var hl = uniq(l.map(function (s) { return s.headline; }).filter(Boolean)); body.appendChild(group(phaseHeading(l[0]) || lv, l, { mode: 'main' }, hl.length === 1 ? hl[0] : null)); });
    } else {
      body.appendChild(phaseGroups(cell.list, { mode: 'main' }));
    }
    page.appendChild(body);
    return page;
  }

  // ------------------------------------------------------------------ search
  function vSearch() {
    var m = route.query.m === 'pfa' ? 'pfa' : 'main';
    var pool = m === 'pfa' ? PFA : MAIN;
    var page = el('div', { class: 'stack-lg' + (m === 'pfa' ? ' is-pfa-page' : '') });
    var state = { q: route.query.q || '', ladder: route.query.f === 'ladder', exposure: route.query.f === 'exposure', bsq: route.query.b || '' };
    var results = el('div');
    var head = el('div', { class: 'stack' });
    head.appendChild(el('div', { class: 'row row-between' }, modeSwitch(m)));
    var bar = searchBar(m, state.q, function (v) { state.q = v; history.replaceState(null, '', href(['search'], { m: m, q: v, f: state.ladder ? 'ladder' : state.exposure ? 'exposure' : null, b: state.bsq })); draw(); });
    head.appendChild(bar);
    var filters = el('div', { class: 'row noprint' });
    if (m === 'main') {
      ['ladder', 'exposure'].forEach(function (k) {
        var chip = el('button', { type: 'button', class: 'bx-filter', 'aria-pressed': state[k] ? 'true' : 'false' }, state[k] ? icon('check') : null, k === 'ladder' ? 'Ladder' : 'Met again and again');
        chip.addEventListener('click', function () { var on = !state[k]; state.ladder = state.exposure = false; state[k] = on; draw(true); });
        filters.appendChild(chip);
      });
    }
    if (ANY_BSQ) {
      var sel = el('select', { 'aria-label': 'B Squared step' }, el('option', { value: '' }, 'Any B Squared step'), D.bsquaredSteps.map(function (b) { return el('option', { value: b, selected: state.bsq === b ? true : null }, 'B² ' + b); }));
      sel.addEventListener('change', function () { state.bsq = sel.value; draw(); });
      filters.appendChild(el('label', { class: 'select' }, sel, icon('chevron-down')));
    }
    head.appendChild(filters);
    page.appendChild(head);
    page.appendChild(results);
    function draw(refilters) {
      if (refilters) { filters.querySelectorAll('.bx-filter').forEach(function (c, i) { var k = i === 0 ? 'ladder' : 'exposure'; c.setAttribute('aria-pressed', state[k] ? 'true' : 'false'); c.textContent = ''; if (state[k]) c.appendChild(icon('check')); c.appendChild(document.createTextNode(k === 'ladder' ? 'Ladder' : 'Met again and again')); }); }
      results.textContent = '';
      var q = state.q.trim().toLowerCase();
      var filtered = pool.filter(function (s) {
        if (state.ladder && s.ladder_or_exposure !== 'Ladder') return false;
        if (state.exposure && s.ladder_or_exposure !== 'Repeated exposure') return false;
        if (state.bsq && (!s.bsquared || s.bsquared.indexOf(state.bsq) < 0)) return false;
        return true;
      });
      if (q.length < 2 && !state.ladder && !state.exposure && !state.bsq) { results.appendChild(el('p', { class: 'lead' }, 'Type two or more letters. Searches the statements, the "Why this matters" lines and the codes.')); return; }
      var hits = q.length < 2 ? filtered : filtered.filter(function (s) {
        return (s.statement + ' ' + (s.purpose || '') + ' ' + s.bettws_id).toLowerCase().indexOf(q) >= 0;
      });
      results.appendChild(printHead('Search: ' + state.q));
      results.appendChild(el('div', { class: 'row row-between controls' }, el('p', { class: 'lead' }, hits.length ? plural(hits.length, 'statement matches.', 'statements match.') : 'Nothing matches. Try fewer words.'), hits.length ? printButton() : null));
      var byS = groupBy(hits, function (s) { return s.strand; });
      byS.keys.sort(function (a, b) { return (SO[a] == null ? 99 : SO[a]) - (SO[b] == null ? 99 : SO[b]); });
      byS.keys.forEach(function (st) {
        results.appendChild(group(isLife({ strand: st }) ? st.replace('PFA · ', '') : st, sorted(byS.m[st]), { mode: m, showSub: false }, null));
      });
    }
    draw();
    setTimeout(function () { var i = bar.querySelector('input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0);
    return page;
  }

  // ------------------------------------------------------------------ PFA
  function vPfa() {
    var part = route.path[1];
    if (part === 'outcomes') return vOutcomes();
    if (part === 'destinations') return vDestinations();
    if (part === 'route') return vRoute();
    var page = el('div', { class: 'stack-lg is-pfa-page' });
    page.appendChild(browseHeader('pfa'));
    page.appendChild(el('div', null, el('h1', { class: 't-title-1' }, 'Preparing for adulthood'),
      el('p', { class: 'lead' }, 'The PFA curriculum in three parts, as it stands in the master dataset. Statements here are the ones that matter most for life after school.')));
    var life = S.filter(isLife), dest = PFA.filter(function (s) { return !isLife(s) && s.strand !== NCP; }), goals = SPINE.filter(function (s) { return s.pfa_class === 'PFA-direct'; });
    var tiles = el('div', { class: 'tiles' });
    [['outcomes', 'The Outcomes', plural(life.length, 'life statement', 'life statements') + ' in five areas, each with why it matters.'],
     ['destinations', 'The Destinations', plural(dest.length, 'maths statement', 'maths statements') + ' beyond the number spine, by area.'],
     ['route', 'The Number Route', plural(goals.length, 'goal', 'goals') + ' on the number spine, with the stepping stones beneath them.']].forEach(function (t) {
      tiles.appendChild(el('a', { class: 'tile', href: '#/pfa/' + t[0] }, icon('compass'), el('span', null, el('b', null, t[1]), el('span', { class: 'sub' }, t[2])), icon('chevron-right', 'go')));
    });
    page.appendChild(tiles);
    return page;
  }
  function pfaPage(title, lead, bodyFn) {
    var page = el('div', { class: 'stack-lg is-pfa-page' });
    page.appendChild(crumbs([{ label: 'Preparing for adulthood', href: '#/pfa' }, { label: title }]));
    page.appendChild(printHead('PFA · ' + title));
    page.appendChild(el('div', { class: 'row row-between controls' }, el('div', null, el('h1', { class: 't-title-1' }, title), el('p', { class: 'lead' }, lead)), printButton()));
    page.appendChild(bodyFn());
    return page;
  }
  function vOutcomes() {
    return pfaPage('The Outcomes', 'The life statements in five areas. Each carries why it matters and, behind a tap, the steps that practise it.', function () {
      var body = el('div');
      var life = sorted(S.filter(isLife));
      var byA = groupBy(life, function (s) { return s.strand; });
      byA.keys.sort(function (a, b) { return (SO[a] == null ? 99 : SO[a]) - (SO[b] == null ? 99 : SO[b]); });
      byA.keys.forEach(function (a) {
        var lst = byA.m[a].slice().sort(function (x, y) { return (x.sort_order == null ? 9999 : x.sort_order) - (y.sort_order == null ? 9999 : y.sort_order) || x.row_order - y.row_order; });
        var frag = group(a.replace('PFA · ', ''), lst, { mode: 'pfa' }, short(a).split(' — ')[1] || null);
        body.appendChild(frag);
        if (a === 'PFA · Joining In & Belonging' && D.entitlement && D.entitlement.length) {
          var box = el('div', { class: 'note-box', style: 'margin-top:var(--space-4)' }, el('p', { class: 't-label-sm', style: 'color:var(--note)' }, 'The experience entitlement'));
          D.entitlement.forEach(function (e) { box.appendChild(el('p', { class: 't-body-sm' }, e.text)); });
          body.appendChild(box);
        }
      });
      return body;
    });
  }
  function vDestinations() {
    return pfaPage('The Destinations', 'The maths statements beyond the number spine that lead somewhere in adult life, grouped by area.', function () {
      var body = el('div');
      var dest = PFA.filter(function (s) { return !isLife(s) && s.strand !== NCP; });
      var byA = groupBy(dest, function (s) { return s.pfa_area || s.strand; });
      byA.keys.sort(function (a, b) { var ia = SO[a] == null ? 50 : SO[a], ib = SO[b] == null ? 50 : SO[b]; return ia - ib || a.localeCompare(b); });
      byA.keys.forEach(function (a) {
        var lst = byA.m[a].slice().sort(function (x, y) { return levelIndex(x.level) - levelIndex(y.level) || x.bettws_id.localeCompare(y.bettws_id); });
        body.appendChild(group(a, lst, { mode: 'pfa', per: function (s) { return { showStrand: s.strand !== a }; } }, short(a) ? short(a).split(' — ')[1] : null));
      });
      return body;
    });
  }
  function vRoute() {
    return pfaPage('The Number Route', 'The number spine as the PFA route reads it. Goals are in full; the stepping stones beneath them are quieter. Statements that belong to the main curriculum only are left out.', function () {
      var body = el('div');
      var lst = SPINE.filter(function (s) { return s.pfa_class === 'PFA-direct' || s.pfa_class === 'PFA-feeder'; });
      var byLevel = groupBy(sorted(lst), function (s) { return s.level.indexOf('WPS 1') === 0 ? 'WPS 1' : s.level; });
      byLevel.keys.forEach(function (lv) {
        body.appendChild(el('div', { class: 'section-head' }, el('h2', { class: 't-title-1' }, lv === 'WPS 2 (collapsed)' ? 'WPS 2' : lv)));
        var l = byLevel.m[lv];
        if (lv === 'WPS 1') {
          var byL = groupBy(l, function (s) { return s.level; });
          byL.keys.forEach(function (k) { var ll = byL.m[k]; var hl = uniq(ll.map(function (s) { return s.headline; }).filter(Boolean)); body.appendChild(group(phaseHeading(ll[0]) || k, ll, { mode: 'pfa', per: function (s) { return { stone: s.pfa_class !== 'PFA-direct' }; } }, hl.length === 1 ? hl[0] : null)); });
        } else {
          body.appendChild(phaseGroups(l, { mode: 'pfa', per: function (s) { return { stone: s.pfa_class !== 'PFA-direct' }; } }));
        }
      });
      return body;
    });
  }

  // ------------------------------------------------------------------ enquiries
  function vEnquiries() {
    var idx = route.path[1];
    if (idx != null && D.enquiries[idx]) return vEnquiry(D.enquiries[idx], Number(idx));
    var page = el('div', { class: 'stack-lg' });
    page.appendChild(el('div', null, el('h1', { class: 't-title-1' }, 'Enquiries'),
      el('p', { class: 'lead' }, 'Mapped enquiries from the dataset: each one is a run of phases, and each phase names the statements it carries. Read-only.')));
    if (!D.enquiries.length) page.appendChild(empty('No enquiries mapped yet', 'When Bertie maps one it appears here.', 'compass'));
    var list = el('div', { class: 'stack' });
    D.enquiries.forEach(function (e, i) {
      var n = e.phases.length, bars = [];
      for (var k = 0; k < n; k++) bars.push(el('i'));
      var first = e.phases[0], last = e.phases[n - 1];
      list.appendChild(el('a', { class: 'bx-enquiry', href: '#/enquiries/' + i },
        el('span', { class: 'bx-enquiry-body' }, el('span', { class: 'bx-enquiry-title' }, e.title),
          el('span', { class: 'bx-enquiry-hook' }, n > 1 ? 'From "' + first.title + '" to "' + last.title + '".' : first.title),
          el('span', { class: 'bx-enquiry-meta' }, el('span', { class: 'bx-phases', 'aria-hidden': 'true' }, bars), plural(n, 'phase', 'phases') + ' · ' + plural(e.statement_count, 'statement', 'statements'))),
        el('span', { class: 'bx-enquiry-go' }, icon('chevron-right'))));
    });
    page.appendChild(list);
    page.appendChild(el('p', { class: 'lead' }, "Have an idea? Bring it to Bertie and he'll map it."));
    return page;
  }
  function vEnquiry(e, i) {
    var page = el('div', { class: 'stack-lg' });
    page.appendChild(crumbs([{ label: 'Enquiries', href: '#/enquiries' }, { label: e.title }]));
    page.appendChild(printHead('Enquiry · ' + e.title));
    page.appendChild(el('div', { class: 'row row-between controls' }, el('div', null, el('h1', { class: 't-title-1' }, e.title),
      el('p', { class: 'lead' }, plural(e.phases.length, 'phase', 'phases') + ' · ' + plural(e.statement_count, 'statement', 'statements') + '. Life goals carry the phase; the maths beneath each one is what the activity practises.')), printButton()));
    e.phases.forEach(function (ph) {
      var head = el('div', { class: 'group-head' }, el('h2', { class: 't-title-2' }, 'Phase ' + ph.no + ' · ' + ph.title));
      var rows = ph.rows, done = {}, nodes = [];
      function rowNode(r) {
        if (!r.live) return el('div', { class: 'text-row' }, el('span', null, r.task || r.id), el('span', { class: 'bx-code' }, r.id));
        var s = byId[r.id];
        return card(s, { mode: isLife(s) ? 'pfa' : 'main', task: r.task, showStrand: true });
      }
      rows.forEach(function (r, k) {
        if (done[k]) return;
        done[k] = true;
        var node = rowNode(r);
        var kids = rows.map(function (x, j) { return { x: x, j: j }; }).filter(function (p) { return !done[p.j] && p.x.nested_under && p.x.nested_under === r.id; });
        if (kids.length) {
          var nest = el('div', { class: 'nest' });
          kids.forEach(function (p) { done[p.j] = true; nest.appendChild(rowNode(p.x)); });
          nodes.push(el('div', { class: 'stack', style: 'gap:var(--space-3)' }, node, nest));
        } else nodes.push(node);
      });
      // The phase heading keeps with its first statement on paper; the rest follow.
      var sec = el('section');
      nodes.forEach(function (node, i) {
        if (i === 0) sec.appendChild(el('div', { class: 'keep' }, head, el('div', { class: 'cards' }, node)));
        else sec.appendChild(el('div', { class: 'cards', style: 'margin-top:var(--space-4)' }, node));
      });
      if (!nodes.length) sec.appendChild(head);
      page.appendChild(sec);
    });
    page.appendChild(el('p', { class: 'lead' }, "Have an idea? Bring it to Bertie and he'll map it."));
    return page;
  }

  // ------------------------------------------------------------------ statement
  function vStatement() {
    var s = byId[route.path[1]];
    if (!s) return empty('No such statement', 'Check the code and try again.');
    var inMain = MAIN.indexOf(s) >= 0, m = inMain ? 'main' : 'pfa';
    var page = el('div', { class: 'stack-lg' + (m === 'pfa' ? ' is-pfa-page' : '') });
    var cell = null; if (inMain) STEPS.forEach(function (st) { if (st.test(s.level)) cell = st; });
    page.appendChild(crumbs(inMain
      ? [{ label: 'Strands', href: '#/browse' }, { label: s.strand, href: href(['browse', 's', s.strand]) }, cell ? { label: cell.label, href: href(['browse', 's', s.strand, cell.key]) } : null, { label: s.bettws_id }].filter(Boolean)
      : [{ label: 'Preparing for adulthood', href: '#/pfa' }, { label: isLife(s) ? s.strand.replace('PFA · ', '') : s.strand }, { label: s.bettws_id }]));
    page.appendChild(el('div', null, el('h1', { class: 't-title-1' }, inMain ? s.strand : isLife(s) ? s.strand.replace('PFA · ', '') : s.strand), el('p', { class: 'lead' }, (phaseHeading(s) ? phaseHeading(s) + '. ' : '') + (short(s.strand) || ''))));
    page.appendChild(el('div', { class: 'cards' }, card(s, { mode: m, open: true, showSub: true })));
    return page;
  }

  function vPupils() {
    var page = el('div', { class: 'stack-lg' });
    page.appendChild(empty('My pupils arrives in phase 2', 'Pupil profiles will reach you by QR code from Bertie: a pseudonym, a working level per strand and a few focus statements. Nothing about any pupil is kept in this app yet.', 'pupils'));
    return page;
  }

  // ------------------------------------------------------------------ basket
  function vBasket() {
    var page = el('div', { class: 'stack-lg' });
    page.appendChild(el('div', null, el('h1', { class: 't-title-1' }, 'Learning intentions'),
      el('p', { class: 'lead' }, basket.length ? plural(basket.length, 'statement', 'statements') + ' chosen. The card holds up to six; their wording fills the card and you can edit it before printing.' : 'Choose statements as you browse: every statement has an "Add to learning intentions" button. They collect here, then one tap makes the card.')));
    if (basket.length >= MAX_CARD) page.appendChild(el('div', { class: 'note-box' }, el('b', null, 'Full'), 'The card holds six. Take one off to add another.'));
    if (basket.length) {
      var list = el('div', { class: 'basket-list' });
      basket.forEach(function (id, i) {
        var s = byId[id];
        list.appendChild(el('div', { class: 'basket-row' }, el('span', { class: 'num' }, i + 1),
          el('span', { class: 'txt' }, s.statement, ' ', el('span', { class: 'bx-code' }, s.bettws_id), el('small', null, (isLife(s) ? s.strand.replace('PFA · ', '') : s.strand) + ' · ' + levelChipText(s) + (s.bsquared && s.bsquared.length ? ' · B² ' + s.bsquared.join(', ') : ''))),
          el('button', { type: 'button', class: 'bx-btn bx-btn-sm bx-btn-quiet', 'aria-label': 'Take off ' + s.bettws_id, onclick: function () { toggleBasket(id); render(); } }, icon('minus'), 'Take off')));
      });
      page.appendChild(list);
    }
    page.appendChild(el('div', { class: 'actions' },
      el('a', { class: 'bx-hero' + (basket.length ? '' : ' is-off'), href: basket.length ? '#/card' : null, 'aria-disabled': basket.length ? null : 'true', onclick: function (e) { if (!basket.length) e.preventDefault(); } }, icon('card'), 'Make the card'),
      basket.length ? el('button', { type: 'button', class: 'bx-btn bx-btn-quiet', onclick: function () { if (confirm('Take every statement off the list?')) { basket = []; saveBasket(); render(); } } }, 'Clear the list') : null,
      el('a', { class: 'bx-btn bx-btn-quiet', href: '#/card' }, 'Or make a card from scratch')));
    return page;
  }

  // ------------------------------------------------------------------ the card maker
  // A port of the standalone Learning Intentions tool (the reference): the card is a list
  // of drawing operations in millimetres, drawn once onto a canvas for the preview and
  // once into jsPDF for the file, so what you see is what prints.
  var PT = 25.4 / 72;
  var PAGE = { w: 210, h: 297, margin: 8 };
  var CARD = { w: 155, minW: 85, maxW: 194, facesCol: 35, gap: 2 };
  // Print colours from the design system (print is always light): green-deep, print-ink, print-rule, surface-sunken.
  var COLOUR = { green: '#33503c', border: '#141c17', divider: '#c9d0c6', tint: '#ecefe8', text: '#141c17', hint: '#4a574e' };
  var HEAD = { size: 10, leading: 12 * PT, sidePad: 6 * PT };
  var ROW = { size: 14, leading: 6, left: 4, top: 1, bottom: 2, minContent: 10 };
  var FACES = { w: 29.5, h: 8.06, rightInset: 4.74 };
  var LONG_LINES = 3;
  var LEARNER = !!A.learnerFont;
  var FACES_URL = A.faces ? 'data:image/png;base64,' + A.faces : null;
  var jsPDF = window.jspdf && window.jspdf.jsPDF;
  var measurer = null, facesImg = null, learnerReady = false;

  function addLearnerFont(doc) { if (LEARNER) { doc.addFileToVFS('BMD.ttf', A.learnerFont); doc.addFont('BMD.ttf', 'BMD', 'normal'); } }
  function getMeasurer() { if (!measurer) { measurer = new jsPDF({ unit: 'mm', format: 'a4' }); addLearnerFont(measurer); } return measurer; }
  function wrap(text, font, style, size, width) { var mm = getMeasurer(); mm.setFont(font, style); mm.setFontSize(size); return mm.splitTextToSize(text, width); }
  function tidy(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function intentionLines(text, width) { return wrap(tidy(text), LEARNER ? 'BMD' : 'helvetica', 'normal', ROW.size, width - CARD.facesCol - ROW.left); }

  function buildCard(data) {
    var W = data.width, back = [], front = [], y = 0;
    if (data.date) {
      var dateLines = wrap(data.date, 'helvetica', 'bold', HEAD.size, W - 2 * HEAD.sidePad);
      y += 2;
      dateLines.forEach(function (line, i) { front.push({ t: 'text', font: 'head', size: HEAD.size, colour: COLOUR.green, align: 'center', x: W / 2, y: y + HEAD.size * PT + i * HEAD.leading, text: line }); });
      y += dateLines.length * HEAD.leading + 2;
    }
    if (data.progression) {
      var progLines = wrap(data.progression, 'helvetica', 'bold', HEAD.size, W - ROW.left - HEAD.sidePad);
      y += data.date ? 1 : 2;
      progLines.forEach(function (line, i) { front.push({ t: 'text', font: 'head', size: HEAD.size, colour: COLOUR.green, align: 'left', x: ROW.left, y: y + HEAD.size * PT + i * HEAD.leading, text: line }); });
      y += progLines.length * HEAD.leading + 2;
    }
    data.intentions.forEach(function (text, i) {
      var lines = intentionLines(text, W);
      var content = Math.max(ROW.minContent, lines.length * ROW.leading);
      var rowH = ROW.top + content + ROW.bottom;
      var middle = y + ROW.top + content / 2;
      if (i % 2 === 0) back.push({ t: 'rect', x: 0, y: y, w: W, h: rowH, fill: COLOUR.tint });
      var textTop = middle - (lines.length * ROW.leading) / 2;
      lines.forEach(function (line, k) { front.push({ t: 'text', font: 'learner', size: ROW.size, colour: COLOUR.text, align: 'left', x: ROW.left, y: textTop + ROW.size * PT + k * ROW.leading, text: line }); });
      front.push({ t: 'image', x: W - FACES.rightInset - FACES.w, y: middle - FACES.h / 2, w: FACES.w, h: FACES.h });
      if (i < data.intentions.length - 1) front.push({ t: 'line', x1: 0, y1: y + rowH, x2: W, y2: y + rowH, width: 1 * PT, colour: COLOUR.divider });
      y += rowH;
    });
    if (!data.intentions.length) {
      y += 2;
      front.push({ t: 'text', font: 'head', size: HEAD.size, colour: COLOUR.hint, align: 'center', x: W / 2, y: y + 8, text: 'Type a learning intention to see it here' });
      y += 13;
    }
    front.push({ t: 'box', x: 0, y: 0, w: W, h: y, width: 2.4 * PT, colour: COLOUR.border });
    return { h: y, ops: back.concat(front) };
  }
  function paginate(cardW, cardH, copies) {
    var usableW = PAGE.w - 2 * PAGE.margin, usableH = PAGE.h - 2 * PAGE.margin;
    var cols = Math.max(1, Math.floor((usableW + CARD.gap) / (cardW + CARD.gap)));
    var rows = Math.max(1, Math.floor((usableH + CARD.gap) / (cardH + CARD.gap)));
    var x0 = (PAGE.w - (cols * cardW + (cols - 1) * CARD.gap)) / 2;
    var perPage = cols * rows, pages = [];
    for (var c = 0; c < copies; c++) {
      var p = Math.floor(c / perPage), k = c % perPage;
      if (!pages[p]) pages[p] = [];
      pages[p].push({ x: x0 + (k % cols) * (cardW + CARD.gap), y: PAGE.margin + Math.floor(k / cols) * (cardH + CARD.gap) });
    }
    return { pages: pages, cols: cols, rows: rows };
  }
  function drawPdf(doc, ops, ox, oy) {
    ops.forEach(function (op) {
      switch (op.t) {
        case 'rect': doc.setFillColor(op.fill); doc.rect(ox + op.x, oy + op.y, op.w, op.h, 'F'); break;
        case 'line': doc.setDrawColor(op.colour); doc.setLineWidth(op.width); doc.line(ox + op.x1, oy + op.y1, ox + op.x2, oy + op.y2); break;
        case 'box': doc.setDrawColor(op.colour); doc.setLineWidth(op.width); doc.rect(ox + op.x, oy + op.y, op.w, op.h, 'S'); break;
        case 'text':
          if (op.font === 'learner') doc.setFont(LEARNER ? 'BMD' : 'helvetica', 'normal'); else doc.setFont('helvetica', 'bold');
          doc.setFontSize(op.size); doc.setTextColor(op.colour);
          doc.text(op.text, ox + op.x, oy + op.y, { align: op.align, baseline: 'alphabetic' }); break;
        case 'image': if (FACES_URL) doc.addImage(FACES_URL, 'PNG', ox + op.x, oy + op.y, op.w, op.h, 'faces', 'FAST'); break;
      }
    });
  }
  function drawCanvas(ctx, ops, ox, oy, s) {
    ops.forEach(function (op) {
      switch (op.t) {
        case 'rect': ctx.fillStyle = op.fill; ctx.fillRect((ox + op.x) * s, (oy + op.y) * s, op.w * s, op.h * s); break;
        case 'line': ctx.strokeStyle = op.colour; ctx.lineWidth = op.width * s; ctx.beginPath(); ctx.moveTo((ox + op.x1) * s, (oy + op.y1) * s); ctx.lineTo((ox + op.x2) * s, (oy + op.y2) * s); ctx.stroke(); break;
        case 'box': ctx.strokeStyle = op.colour; ctx.lineWidth = op.width * s; ctx.strokeRect((ox + op.x) * s, (oy + op.y) * s, op.w * s, op.h * s); break;
        case 'text':
          var px = op.size * PT * s;
          ctx.font = op.font === 'learner' ? px + 'px ' + (LEARNER && learnerReady ? '"BMD Learners"' : 'Helvetica, Arial, sans-serif') : 'bold ' + px + 'px Helvetica, Arial, sans-serif';
          ctx.fillStyle = op.colour; ctx.textAlign = op.align; ctx.textBaseline = 'alphabetic';
          ctx.fillText(op.text, (ox + op.x) * s, (oy + op.y) * s); break;
        case 'image': if (facesImg) ctx.drawImage(facesImg, (ox + op.x) * s, (oy + op.y) * s, op.w * s, op.h * s); break;
      }
    });
  }

  var STEP_GROUPS = [['Pre', ['Pre-4', 'Pre-5', 'Pre-6']], ['Step 1', ['1.1', '1.2']], ['Step 2', ['2.1', '2.2', '2.3']], ['Step 3', ['3.1', '3.2', '3.3']]];
  var DRAFT_KEY = 'bettws.explorer.cardDraft.v1', FAV_KEY = 'bettws.explorer.favourites.v1';
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function loadDraft() {
    var d = null; try { d = JSON.parse(sessionStorage.getItem(DRAFT_KEY)); } catch (e) { d = null; }
    if (d && d.ids && d.ids.join('|') === basket.join('|')) return d;
    var fromData = [];
    basket.forEach(function (id) { (byId[id].bsquared || []).forEach(function (b) { if (fromData.indexOf(b) < 0) fromData.push(b); }); });
    var t = new Date();
    return { ids: basket.slice(), intentions: basket.map(function (id) { return byId[id].statement; }), steps: fromData, fromData: fromData,
      date: t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()), className: '', copies: 1, width: Number(store('bettws.explorer.cardWidth') || CARD.w) };
  }
  function saveDraft(d) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* not kept */ } }

  function vCard() {
    if (!jsPDF) return empty('The card maker needs its PDF library', 'This build is missing jsPDF. Rebuild the Explorer.', 'card');
    var draft = loadDraft();
    var page = el('div', { class: 'stack-lg' });
    page.appendChild(crumbs([{ label: 'Learning intentions', href: '#/basket' }, { label: 'Make the card' }]));
    page.appendChild(el('div', null, el('h1', { class: 't-title-1' }, 'Make a learning intention card'),
      el('p', { class: 'lead' }, 'The card goes in pupils’ books: a date, the progression line, up to six intentions and three faces on each row. Edit the wording freely. No pupil names go on the card.')));
    var grid = el('div', { class: 'card-grid' });
    var left = el('div', { class: 'stack' }), right = el('div', { class: 'stack' });
    grid.appendChild(left); grid.appendChild(right);
    page.appendChild(grid);

    // --- details
    var dateIn = el('input', { type: 'date', class: 'input', id: 'li-date', value: draft.date });
    var copiesIn = el('input', { type: 'number', class: 'input', id: 'li-copies', min: '1', max: '50', value: String(draft.copies), inputmode: 'numeric' });
    var classIn = el('input', { type: 'text', class: 'input', id: 'li-class', value: draft.className, placeholder: 'e.g. Tuesday maths group', autocomplete: 'off' });
    var details = el('section', { class: 'panel' }, el('h2', null, 'Card details'),
      el('div', { class: 'grid2' }, el('div', { class: 'field' }, el('label', { for: 'li-date' }, 'Date'), dateIn),
        el('div', { class: 'field' }, el('label', { for: 'li-copies' }, 'Number of copies'), copiesIn),
        el('div', { class: 'field', style: 'grid-column:1/-1' }, el('label', { for: 'li-class' }, 'Class or group ', el('span', { class: 'hint' }, '(for the file name only)')), classIn)));
    var stepsWrap = el('div', { class: 'step-groups' });
    var stepChips = [];
    STEP_GROUPS.forEach(function (g) {
      var grp = el('div', { class: 'step-group' });
      var all = el('button', { type: 'button', class: 'step-all', title: 'Switch all of ' + g[0] + ' on or off' }, g[0]);
      grp.appendChild(all);
      var chips = g[1].map(function (code) {
        var on = draft.steps.indexOf(code) >= 0;
        var chip = el('button', { type: 'button', class: 'chip-step', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Progression Step ' + code }, code);
        chip.addEventListener('click', function () { chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); schedule(); });
        grp.appendChild(chip); stepChips.push(chip); return chip;
      });
      all.addEventListener('click', function () { var allOn = chips.every(function (c) { return c.getAttribute('aria-pressed') === 'true'; }); chips.forEach(function (c) { c.setAttribute('aria-pressed', allOn ? 'false' : 'true'); }); schedule(); });
      stepsWrap.appendChild(grp);
    });
    details.appendChild(el('fieldset', { class: 'field', style: 'border:0;padding:0;margin:var(--space-4) 0 0' }, el('legend', null, 'Progression step on the card ', el('span', { class: 'hint' }, '(B Squared, tap to switch on or off)')), stepsWrap,
      el('p', { class: 't-caption muted', style: 'margin-top:var(--space-2)' }, draft.fromData.length ? 'Set from the B Squared steps recorded for these statements. With none switched on, the line is left off the card.' :
        (draft.ids.length ? 'No B Squared step is recorded for these statements yet, so the line is left blank unless you choose one.' : 'With none switched on, the line is left off the card.'))));
    left.appendChild(details);

    // --- intentions
    var boxes = [];
    var intents = el('div');
    for (var i = 0; i < MAX_CARD; i++) (function (i) {
      var ta = el('textarea', { class: 'input', rows: '2', placeholder: 'I can…', 'aria-label': 'Learning intention ' + (i + 1) });
      ta.value = draft.intentions[i] || '';
      var note = el('div', { class: 'note' });
      var src = draft.ids[i] ? el('div', { class: 'src' }, 'From ', el('span', { class: 'bx-code' }, draft.ids[i])) : null;
      intents.appendChild(el('div', { class: 'intent' }, el('span', { class: 'num', 'aria-hidden': 'true' }, i + 1), ta, src, note));
      boxes.push({ input: ta, note: note });
      ta.addEventListener('input', schedule);
    })(i);
    var downloadBtn = el('button', { type: 'button', class: 'bx-hero' }, icon('download'), 'Download PDF');
    var printBtn = el('button', { type: 'button', class: 'bx-btn' }, icon('open'), 'Open PDF to print');
    var clearBtn = el('button', { type: 'button', class: 'bx-btn bx-btn-quiet' }, 'Clear all');
    var actionStatus = el('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
    left.appendChild(el('section', { class: 'panel' }, el('div', { class: 'row row-between' }, el('h2', { style: 'margin:0' }, 'Learning intentions ', el('span', { class: 'hint t-caption muted' }, '(up to six)')), clearBtn),
      intents, el('div', { class: 'actions' }, downloadBtn, printBtn), actionStatus));

    // --- preview
    var canvas = el('canvas', { role: 'img', 'aria-label': 'Preview of the learning intention card' });
    var gripL = el('div', { class: 'grip', 'aria-hidden': 'true', title: 'Drag to change the card width' }), gripR = el('div', { class: 'grip', 'aria-hidden': 'true', title: 'Drag to change the card width' });
    var stage = el('div', { class: 'stage' }, el('div', { class: 'canvas-wrap' }, canvas, gripL, gripR));
    var viewCard = el('button', { type: 'button', 'aria-pressed': 'true' }, 'Card'), viewPage = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Whole page');
    var widthIn = el('input', { type: 'range', id: 'li-width', min: String(CARD.minW), max: String(CARD.maxW), step: '1', value: String(clampWidth(draft.width)) });
    var widthOut = el('output', { for: 'li-width' }, clampWidth(draft.width) + ' mm');
    var widthReset = el('button', { type: 'button', class: 'bx-btn bx-btn-sm bx-btn-quiet' }, 'Reset');
    var fitInfo = el('p', { class: 't-body-sm muted', style: 'margin-top:var(--space-2)' });
    right.appendChild(el('section', { class: 'panel' }, el('div', { class: 'row row-between', style: 'margin-bottom:var(--space-3)' }, el('h2', { style: 'margin:0' }, 'Preview'), el('div', { class: 'seg', role: 'group', 'aria-label': 'Preview size' }, viewCard, viewPage)),
      stage, el('div', { class: 'width-row' }, el('label', { for: 'li-width', class: 't-label-sm muted' }, 'Card width'), widthIn, widthOut, widthReset),
      el('p', { class: 't-caption muted' }, 'Drag the handles on the card, or use the slider. Cards 96 mm or narrower fit two across the page.'), fitInfo));

    // --- favourites
    var favSelect = el('select', { 'aria-label': 'Saved sets' }), favLoad = el('button', { type: 'button', class: 'bx-btn bx-btn-sm' }, 'Load'), favDelete = el('button', { type: 'button', class: 'bx-btn bx-btn-sm bx-btn-quiet' }, 'Delete');
    var favName = el('input', { type: 'text', class: 'input', placeholder: 'Name it, e.g. Fractions week 1', maxlength: '80', autocomplete: 'off', 'aria-label': 'Name for the favourite' });
    var favSave = el('button', { type: 'button', class: 'bx-btn bx-btn-sm' }, 'Save'), favStatus = el('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
    var favExport = el('button', { type: 'button', class: 'bx-btn bx-btn-sm bx-btn-quiet' }, 'Export to a file'), favImport = el('button', { type: 'button', class: 'bx-btn bx-btn-sm bx-btn-quiet' }, 'Import from a file');
    var favFile = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
    right.appendChild(el('section', { class: 'panel' }, el('h2', null, 'Favourites'),
      el('div', { class: 'field' }, el('label', null, 'Saved sets'), el('div', { class: 'row' }, el('label', { class: 'select', style: 'flex:1 1 180px' }, favSelect, icon('chevron-down')), favLoad, favDelete)),
      el('hr', { class: 'sep' }),
      el('div', { class: 'field' }, el('label', null, 'Save the intentions you have typed as a favourite'), el('div', { class: 'row' }, el('span', { style: 'flex:1 1 180px' }, favName), favSave)),
      favStatus, el('div', { class: 'row' }, favExport, favImport, favFile),
      el('p', { class: 't-caption muted' }, 'Favourites are kept in this browser on this device. Export them to back up, move to another device, or share with a colleague. The file works with the standalone Learning Intentions tool too.')));

    // --- behaviour
    var view = 'card', preview = { s: 1, wMm: CARD.maxW + 8 }, queued = false;
    function clampWidth(w) { w = Math.round(Number(w)); if (isNaN(w)) w = CARD.w; return Math.min(CARD.maxW, Math.max(CARD.minW, w)); }
    function readDate() { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIn.value); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; }
    function progressionText() { var on = stepChips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; }).map(function (c) { return c.textContent; }); return on.length ? 'Progression Step ' + on.join(', ') : ''; }
    function setProgression(text) { var codes = String(text || '').match(/\b(?:Pre-[4-6]|[1-3]\.[1-3])\b/g) || []; stepChips.forEach(function (c) { c.setAttribute('aria-pressed', codes.indexOf(c.textContent) >= 0 ? 'true' : 'false'); }); }
    function readForm() {
      var d = readDate(), n = parseInt(copiesIn.value, 10); if (isNaN(n)) n = 1;
      return { dateObj: d, date: d ? DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '', progression: progressionText(),
        intentions: boxes.map(function (b) { return tidy(b.input.value); }).filter(Boolean), copies: Math.min(50, Math.max(1, n)), width: clampWidth(widthIn.value), className: tidy(classIn.value) };
    }
    function fileName(data) {
      var prefix = data.dateObj ? data.dateObj.getFullYear() + '-' + pad2(data.dateObj.getMonth() + 1) + '-' + pad2(data.dateObj.getDate()) : 'undated';
      var name = data.className.replace(/ /g, '_').replace(/[<>:"\/\\|?*\x00-\x1f]/g, '') || 'Learning_intentions';
      return prefix + '_' + name + '.pdf';
    }
    function keep() {
      saveDraft({ ids: draft.ids, intentions: boxes.map(function (b) { return b.input.value; }), steps: stepChips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; }).map(function (c) { return c.textContent; }),
        fromData: draft.fromData, date: dateIn.value, className: classIn.value, copies: copiesIn.value, width: widthIn.value });
    }
    function schedule() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; draw(); }); }
    function draw() {
      if (!document.body.contains(canvas)) return;
      var data = readForm(), cardOps = buildCard(data), has = data.intentions.length > 0;
      boxes.forEach(function (b) { var t = tidy(b.input.value); var n = t ? intentionLines(t, data.width).length : 0; b.note.textContent = n >= LONG_LINES ? 'Quite long: this takes ' + n + ' lines on the card.' : ''; });
      downloadBtn.disabled = !has; printBtn.disabled = !has;
      widthOut.textContent = data.width + ' mm';
      var layout = paginate(data.width, cardOps.h, data.copies), perPage = layout.cols * layout.rows;
      var fits = layout.cols > 1 ? layout.cols + ' across × ' + layout.rows + ' down, so ' + perPage + ' cards fit on an A4 page.' : 'Up to ' + perPage + (perPage === 1 ? ' card fits' : ' of these cards fit') + ' on an A4 page.';
      fitInfo.textContent = has ? data.copies + (data.copies === 1 ? ' copy' : ' copies') + ' → ' + layout.pages.length + (layout.pages.length === 1 ? ' page' : ' pages') + '. ' + fits : '';
      var ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio || 1, avail = Math.max(200, stage.clientWidth - 32), wMm, hMm, s;
      if (view === 'page') { wMm = PAGE.w; hMm = PAGE.h; s = Math.min(avail, 560) / wMm; }
      else { wMm = CARD.maxW + 8; hMm = cardOps.h + 8; s = Math.min(avail, 760) / wMm; }
      canvas.style.width = Math.round(wMm * s) + 'px'; canvas.style.height = Math.round(hMm * s) + 'px';
      canvas.width = Math.round(wMm * s * dpr); canvas.height = Math.round(hMm * s * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, wMm * s, hMm * s);
      if (view === 'page') { layout.pages[0].forEach(function (pos) { drawCanvas(ctx, cardOps.ops, pos.x, pos.y, s); }); gripL.style.display = gripR.style.display = 'none'; }
      else {
        var ox = (wMm - data.width) / 2;
        drawCanvas(ctx, cardOps.ops, ox, 4, s);
        [[gripL, ox], [gripR, ox + data.width]].forEach(function (g) { g[0].style.display = 'block'; g[0].style.left = (g[1] * s) + 'px'; g[0].style.top = (4 * s) + 'px'; g[0].style.height = (cardOps.h * s) + 'px'; });
      }
      preview = { s: s, wMm: wMm };
      keep();
    }
    function makePdf(data) {
      var doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      addLearnerFont(doc);
      doc.setProperties({ title: 'Learning intentions ' + data.date, creator: 'Bettws Curriculum Explorer' });
      var cardOps = buildCard(data);
      paginate(data.width, cardOps.h, data.copies).pages.forEach(function (positions, p) { if (p > 0) doc.addPage(); positions.forEach(function (pos) { drawPdf(doc, cardOps.ops, pos.x, pos.y); }); });
      return doc;
    }
    function say(elm, msg, warn) { elm.textContent = msg; elm.classList.toggle('warn', !!warn); }
    downloadBtn.addEventListener('click', function () {
      var data = readForm(); if (!data.intentions.length) return;
      try { var name = fileName(data); makePdf(data).save(name); say(actionStatus, 'Saved ' + name + '.'); }
      catch (err) { say(actionStatus, 'Sorry, the PDF could not be made: ' + err.message, true); }
    });
    printBtn.addEventListener('click', function () {
      var data = readForm(); if (!data.intentions.length) return;
      var tab = window.open('', '_blank');
      try { var url = makePdf(data).output('bloburl'); if (tab) { tab.location.href = url; say(actionStatus, 'PDF opened in a new tab. Use the print button there.'); } else say(actionStatus, 'Your browser blocked the new tab. Use Download PDF instead.', true); }
      catch (err) { if (tab) tab.close(); say(actionStatus, 'Sorry, the PDF could not be made: ' + err.message, true); }
    });
    clearBtn.addEventListener('click', function () { if (boxes.some(function (b) { return b.input.value.trim(); }) && !confirm('Clear all the learning intentions on the card?')) return; boxes.forEach(function (b) { b.input.value = ''; }); draw(); });
    [dateIn, classIn, copiesIn].forEach(function (x) { x.addEventListener('input', schedule); x.addEventListener('change', schedule); });
    viewCard.addEventListener('click', function () { view = 'card'; viewCard.setAttribute('aria-pressed', 'true'); viewPage.setAttribute('aria-pressed', 'false'); draw(); });
    viewPage.addEventListener('click', function () { view = 'page'; viewCard.setAttribute('aria-pressed', 'false'); viewPage.setAttribute('aria-pressed', 'true'); draw(); });
    function setWidth(w) { widthIn.value = String(clampWidth(w)); store('bettws.explorer.cardWidth', widthIn.value); schedule(); }
    widthIn.addEventListener('input', function () { setWidth(widthIn.value); });
    widthReset.addEventListener('click', function () { setWidth(CARD.w); });
    [gripL, gripR].forEach(function (grip) {
      grip.addEventListener('pointerdown', function (e) { e.preventDefault(); grip.setPointerCapture(e.pointerId); grip.classList.add('dragging'); });
      grip.addEventListener('pointermove', function (e) { if (!grip.hasPointerCapture(e.pointerId)) return; var rect = canvas.getBoundingClientRect(); var xMm = (e.clientX - rect.left) / preview.s; setWidth(2 * Math.abs(xMm - preview.wMm / 2)); });
      function stop(e) { if (grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId); grip.classList.remove('dragging'); }
      grip.addEventListener('pointerup', stop); grip.addEventListener('pointercancel', stop);
    });
    window.addEventListener('resize', schedule);

    // favourites
    var favs = [], storageOk = true;
    function cleanFav(f) {
      if (!f || typeof f.name !== 'string' || !Array.isArray(f.intentions)) return null;
      var name = tidy(f.name).slice(0, 80); if (!name) return null;
      return { name: name, progression: typeof f.progression === 'string' ? f.progression : '', intentions: f.intentions.filter(function (t) { return typeof t === 'string'; }).slice(0, MAX_CARD) };
    }
    function loadFavs() { try { var arr = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); favs = (Array.isArray(arr) ? arr : []).map(cleanFav).filter(Boolean); } catch (e) { storageOk = false; favs = []; } }
    function storeFavs() { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); return true; } catch (e) { storageOk = false; return false; } }
    function sortFavs() { favs.sort(function (a, b) { return a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }); }); }
    function findFav(name) { var key = name.toLowerCase(); for (var j = 0; j < favs.length; j++) if (favs[j].name.toLowerCase() === key) return j; return -1; }
    function fillFavSelect(selectName) {
      favSelect.textContent = '';
      favSelect.appendChild(el('option', { value: '' }, favs.length ? 'Choose a saved set…' : 'No favourites saved yet'));
      favs.forEach(function (f, idx) { favSelect.appendChild(el('option', { value: String(idx) }, f.name)); });
      if (selectName) { var at = findFav(selectName); if (at >= 0) favSelect.value = String(at); }
      updateFavButtons();
    }
    function updateFavButtons() { var chosen = favSelect.value !== ''; favLoad.disabled = !chosen; favDelete.disabled = !chosen; favExport.disabled = !favs.length; }
    function saved(msg) { if (storeFavs()) say(favStatus, msg); else say(favStatus, msg + ' This browser will not keep it after closing, so use Export to keep a copy.', true); }
    favSelect.addEventListener('change', updateFavButtons);
    favSave.addEventListener('click', function () {
      var name = tidy(favName.value).slice(0, 80);
      if (!name) { say(favStatus, 'Give the favourite a name first.', true); favName.focus(); return; }
      var intentions = boxes.map(function (b) { return tidy(b.input.value); }).filter(Boolean);
      if (!intentions.length) { say(favStatus, 'Type at least one learning intention to save.', true); return; }
      var existing = findFav(name);
      if (existing >= 0 && !confirm('Replace the saved favourite "' + favs[existing].name + '"?')) return;
      var fav = { name: name, progression: progressionText(), intentions: intentions };
      if (existing >= 0) favs[existing] = fav; else favs.push(fav);
      sortFavs(); fillFavSelect(name); favName.value = ''; saved('Saved "' + name + '".');
    });
    favLoad.addEventListener('click', function () {
      var fav = favs[Number(favSelect.value)]; if (!fav) return;
      var current = boxes.map(function (b) { return tidy(b.input.value); }).filter(Boolean);
      if (current.length && current.join('\n') !== fav.intentions.map(tidy).join('\n') && !confirm('Replace the learning intentions on the card with "' + fav.name + '"?')) return;
      boxes.forEach(function (b, idx) { b.input.value = fav.intentions[idx] || ''; });
      if (fav.progression) setProgression(fav.progression);
      say(favStatus, 'Loaded "' + fav.name + '".'); draw();
    });
    favDelete.addEventListener('click', function () {
      var idx = Number(favSelect.value), fav = favs[idx];
      if (!fav || !confirm('Delete the favourite "' + fav.name + '"?')) return;
      favs.splice(idx, 1); fillFavSelect(); saved('Deleted "' + fav.name + '".');
    });
    favExport.addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ app: 'learning-intentions', version: 1, favourites: favs }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'learning-intentions-favourites.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      say(favStatus, 'Exported ' + plural(favs.length, 'favourite.', 'favourites.'));
    });
    favImport.addEventListener('click', function () { favFile.click(); });
    favFile.addEventListener('change', function () {
      var file = favFile.files && favFile.files[0]; favFile.value = ''; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var list;
        try { var parsed = JSON.parse(String(reader.result)); list = Array.isArray(parsed) ? parsed : parsed && parsed.favourites; if (!Array.isArray(list)) throw new Error('not a favourites file'); }
        catch (err) { say(favStatus, 'That file does not look like a favourites export.', true); return; }
        var added = 0, replaced = 0;
        list.map(cleanFav).filter(Boolean).forEach(function (f) { var at = findFav(f.name); if (at >= 0) { favs[at] = f; replaced++; } else { favs.push(f); added++; } });
        sortFavs(); fillFavSelect();
        saved('Imported ' + added + ' new' + (replaced ? ' and updated ' + replaced : '') + (added + replaced === 1 ? ' favourite.' : ' favourites.'));
      };
      reader.onerror = function () { say(favStatus, 'Could not read that file.', true); };
      reader.readAsText(file);
    });
    loadFavs(); sortFavs(); fillFavSelect();
    if (!storageOk) say(favStatus, 'This browser is not letting the page save favourites. You can still export and import them.', true);

    // assets
    if (FACES_URL && !facesImg) { var img = new Image(); img.onload = function () { FACES.h = FACES.w * img.naturalHeight / img.naturalWidth; facesImg = img; schedule(); }; img.src = FACES_URL; }
    if (LEARNER && !learnerReady && window.FontFace && document.fonts) {
      try {
        var bin = atob(A.learnerFont), bytes = new Uint8Array(bin.length);
        for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
        new FontFace('BMD Learners', bytes.buffer).load().then(function (face) { document.fonts.add(face); learnerReady = true; schedule(); }).catch(function () { /* the preview uses a system font; the PDF is unaffected */ });
      } catch (e) { /* ignore */ }
    }
    setTimeout(draw, 0);
    return page;
  }

  // ------------------------------------------------------------------ render
  function render() {
    renderBar();
    var main = document.getElementById('main');
    main.textContent = '';
    var p = route.path[0] || '';
    var view;
    try {
      if (p === '') view = vHome();
      else if (p === 'browse') view = route.path[1] === 's' ? vStrand() : vBrowse();
      else if (p === 'pfa') view = vPfa();
      else if (p === 'search') view = vSearch();
      else if (p === 'enquiries') view = vEnquiries();
      else if (p === 'statement') view = vStatement();
      else if (p === 'pupils') view = vPupils();
      else if (p === 'basket') view = vBasket();
      else if (p === 'card') view = vCard();
      else view = empty('Nothing here', 'That link does not lead anywhere in this Explorer.');
    } catch (err) {
      view = empty('Something went wrong on this screen', String(err && err.message || err));
      if (window.console) console.error(err);
    }
    main.className = 'page' + (mode() === 'pfa' ? ' is-pfa-page' : '');
    main.appendChild(view);
    document.title = (p === '' ? 'Curriculum Explorer' : p === 'pfa' ? 'Preparing for adulthood' : p === 'card' ? 'Learning intention card' : p === 'basket' ? 'Learning intentions' : p === 'enquiries' ? 'Enquiries' : p === 'search' ? 'Search' : 'Browse') + ' · Bettws Curriculum Explorer';
  }

  parseHash();
  render();

  if (SITE && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* still works online */ });
  }
})();
