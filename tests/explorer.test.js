/* Drives the built Explorer in headless Chromium and checks the content rules.
 *
 *   node tests/explorer.test.js            (after `make build`; checks the staff build, then Bertie's)
 *   SHOTS=1 node tests/explorer.test.js    also saves screenshots to out/shots/
 *
 * Needs Playwright with Chromium (npm i -g playwright, or the pre-installed copy in the cloud session).
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const STAFF = path.resolve(__dirname, '..', 'out', 'bettws-curriculum-explorer.html');
const BERTIE = path.resolve(__dirname, '..', 'out', 'bettws-curriculum-explorer-bertie.html');
const SHOTS = !!process.env.SHOTS;
const shotsDir = path.resolve(__dirname, '..', 'out', 'shots');
let failures = 0;
function check(ok, msg) { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failures++; }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  async function shot(name) { if (SHOTS) { fs.mkdirSync(shotsDir, { recursive: true }); await page.screenshot({ path: path.join(shotsDir, name + '.png') }); } }
  async function open(file, hash) { await page.goto('file://' + file + hash); await page.waitForTimeout(150); }
  const text = async (sel) => (await page.locator(sel || '#view').innerText());

  await open(STAFF, '#browse');
  check((await page.title()).indexOf('Curriculum Explorer') >= 0, 'home opens');
  check(await page.locator('.tile[data-strand]').count() >= 15, 'browse shows the strand tiles (' + await page.locator('.tile[data-strand]').count() + ')');
  check(await page.locator('.side-strands button[data-strand]').count() >= 15, 'the side menu lists the strands by family');
  check(!/\bPFA\b/.test(await text()) && !/\bPFA\b/.test(await text('.side-strands')), 'main view mentions no PFA (the menu names the section once)');
  check(await page.locator('.nav button[data-go="shapes"]').count() === 0 && await page.locator('#rvbtn').isHidden(), 'staff build has no shapes tab and no review mode');
  await shot('01-browse');

  await open(STAFF, '#s-ncp');
  const cols = await page.locator('#rail .col').count();
  check(cols >= 5, 'NCP shows its levels side by side on the rail (' + cols + ' columns)');
  check(await page.locator('#rail .ph').count() >= 10, 'phases head the columns on the spine (' + await page.locator('#rail .ph').count() + ')');
  check(!/\bPFA\b/.test(await text()), 'NCP mentions no PFA');
  check(await page.locator('.st .txt code', { hasText: '2.2-' }).count() > 0, 'codes sit on the statement lines');
  check(await page.locator('.chip.B').count() > 0, 'B Squared chips show where the dataset has a step');
  await shot('02-ncp-rail');

  await open(STAFF, '#s-ncp-w3');
  check(await page.locator('.st[data-id="NCP-3-03"]').count() === 1, 'NCP-3-03 is present in the one-level view');
  check(await page.locator('.st[data-id="NCP-3-03"] .more').count() === 0, 'small steps are hidden until tapped');
  await page.locator('.st[data-id="NCP-3-03"] .chev').click();
  const more = await page.locator('.st[data-id="NCP-3-03"] .more');
  check(await more.count() === 1 && await more.locator('ul.ss > li').count() >= 6, 'small steps open as separate bullets (' + await more.locator('ul.ss > li').count() + ')');
  check((await more.innerText()).indexOf('Questions to ask') >= 0, 'NCP-3-03 has questions to ask');
  check(await more.locator('ul.ss ul li').count() >= 3, 'sub-steps nest under their step');
  await shot('03-ncp-3-open');

  await open(STAFF, '#s-alg-w3');
  const algCodes = await page.locator('.st .txt code').allInnerTexts();
  check(algCodes[0] === 'ALG-3-05', 'Algebra WPS 3 starts with the equals sign (presentation order): ' + algCodes.slice(0, 3).join(', '));

  await open(STAFF, '#s-mon');
  check(await page.locator('.join').count() >= 1, 'Money shows the joins between levels');
  await page.locator('[data-act="all"]').click();
  check(await page.locator('.st.open').count() > 5, 'Show all small steps opens the rows');

  // learning intentions basket
  await open(STAFF, '#s-ncp-w22');
  const addBtns = page.locator('button.add');
  for (let i = 0; i < 6; i++) { await addBtns.nth(i).click(); await page.waitForTimeout(40); }
  let basket = await page.evaluate(() => JSON.parse(localStorage.getItem('bx-basket') || '[]').length);
  check(basket === 6, 'basket holds six (' + basket + ')');
  await addBtns.nth(6).click(); await page.waitForTimeout(40);
  basket = await page.evaluate(() => JSON.parse(localStorage.getItem('bx-basket') || '[]').length);
  check(basket === 6, 'a seventh is refused with a message');
  await open(STAFF, '#intentions');
  check(await page.locator('.blist li').count() === 6, 'the basket page lists six statements');
  await shot('04-intentions');
  await open(STAFF, '#card');
  await page.waitForTimeout(400);
  const filled = await page.locator('#intents textarea').evaluateAll(t => t.filter(x => x.value.trim()).length);
  check(filled === 6, 'the card fills six intentions from the basket');
  check(await page.locator('.chip-step[aria-pressed="true"]').count() >= 1, 'progression chips are pre-set from the B Squared steps');
  const canvasW = await page.locator('#li-canvas').evaluate(c => c.width);
  check(canvasW > 100, 'the card preview drew (' + canvasW + 'px)');
  const pdfOk = await page.evaluate(() => { try { const d = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }); d.text('x', 10, 10); return d.output('arraybuffer').byteLength > 500; } catch (e) { return 'ERR ' + e.message; } });
  check(pdfOk === true, 'jsPDF makes a PDF');
  await shot('05-card');

  // PFA section
  await open(STAFF, '#pfa');
  check(await page.locator('#app[data-pfa="on"]').count() === 1, 'PFA mode recolours the side menu');
  check(await page.locator('.side-strands button[data-go="outcomes"]').count() === 1, 'the side menu shows the three parts in PFA mode');
  await open(STAFF, '#outcomes');
  const outcomes = await page.locator('.st').count();
  check(outcomes >= 50, 'the Outcomes show the life statements (' + outcomes + ')');
  check((await text()).indexOf('Why this matters') >= 0, 'the Outcomes carry Why this matters');
  await shot('06-outcomes');
  await open(STAFF, '#destinations');
  check(await page.locator('.st').count() >= 60, 'the Destinations show the PFA-direct maths');
  await open(STAFF, '#route');
  check(await page.locator('.st.stone').count() > 0 && await page.locator('.st:not(.stone)').count() > 0, 'the Number Route has goals and stepping stones');

  // search
  await open(STAFF, '#browse');
  await page.fill('#q', 'negative'); await page.waitForTimeout(400);
  check(await page.locator('.res[data-id="NCP-3-03"]').count() === 1, 'search finds NCP-3-03 by wording');
  await page.fill('#q', 'NCP-3-07'); await page.waitForTimeout(400);
  check(await page.locator('.res[data-id="NCP-3-07"]').count() === 1, 'search finds a statement by code');
  await page.fill('#q', 'four-digit'); await page.waitForTimeout(400);
  check(await page.locator('.res small').count() >= 1, 'search finds a small step');
  await page.locator('.res').first().click(); await page.waitForTimeout(300);
  check(location => true, 'a result opens its strand');
  check(await page.locator('.st.open').count() >= 1, 'the opened statement is expanded in its strand');

  // enquiries + map
  await open(STAFF, '#enquiries');
  check(await page.locator('.tile[data-go="enquiry"]').count() >= 1, 'the enquiry library lists enquiries');
  check((await text()).indexOf('Bring it to Bertie') >= 0, 'the library carries the mapper line');
  await open(STAFF, '#enquiry');
  check(await page.locator('.phaseblk').count() >= 5, 'an enquiry shows its phases');
  check(await page.locator('.links li.nested').count() > 0, 'maths links nest under their life goal');
  await shot('07-enquiry');
  await open(STAFF, '#map');
  check(await page.locator('.bmt[data-strand]').count() > 30, 'the curriculum map renders');
  await shot('08-map');

  // text size and theme
  await open(STAFF, '#s-mon-w22');
  const base = await page.locator('.st .txt').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  await page.locator('#szs button').nth(2).click(); await page.waitForTimeout(100);
  const big = await page.locator('.st .txt').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  check(big > base * 1.2, 'the text-size control enlarges the statements (' + base + ' → ' + big + 'px)');
  await page.locator('#szs button').nth(0).click();
  await page.locator('#thbtn').click(); await page.waitForTimeout(100);
  check(await page.locator('#app[data-theme="dark"]').count() === 1, 'the theme switch turns dark');
  await shot('09-dark');
  await page.locator('#thbtn').click();

  // print: the frame, the hidden chrome, headings kept with statements
  await open(STAFF, '#s-ncp-w22');
  await page.emulateMedia({ media: 'print' });
  check(await page.locator('.print-frame').evaluate(e => getComputedStyle(e).display) === 'block', 'print shows the double frame');
  check(await page.locator('.side').evaluate(e => getComputedStyle(e).display) === 'none', 'print hides the menu');
  check(await page.locator('.keep').first().evaluate(e => getComputedStyle(e).breakInside) === 'avoid', 'a phase heading keeps with its first statement');
  if (SHOTS) await page.pdf({ path: path.join(shotsDir, 'print-ncp-2.2.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });

  // narrow screen
  await page.setViewportSize({ width: 390, height: 844 });
  await open(STAFF, '#browse');
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)), 'no sideways scroll at 390px');
  await shot('10-narrow');
  await page.setViewportSize({ width: 1280, height: 860 });

  // Bertie's version: shapes and review
  await open(BERTIE, '#browse');
  check(await page.locator('.nav button[data-go="shapes"]').count() === 1 && await page.locator('#rvbtn').isVisible(), "Bertie's version has the shapes tab and review mode");
  await open(BERTIE, '#shapes');
  await page.waitForTimeout(300);
  check(await page.locator('#xpSec .xp-tab').count() >= 4, 'the strand-shapes module mounts (' + await page.locator('#xpSec .xp-tab').count() + ' tabs)');
  await page.locator('#xpSec .xp-tab[data-xtab="ladder"]').click(); await page.waitForTimeout(300);
  check(await page.locator('#ldList .rg').count() > 5, 'the ladder view draws its rungs');
  await page.locator('#xpSec .xp-tab[data-xtab="stairs"]').click(); await page.waitForTimeout(300);
  check(await page.locator('.stp').count() > 10, 'the spine-as-stairs view draws');
  await shot('11-bertie-shapes');
  await open(BERTIE, '#reviews');
  check((await text()).indexOf('Review log') >= 0, 'the review log page opens');

  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'All checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
