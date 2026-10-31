/* Drives the built staff Explorer in headless Chromium and checks the content rules.
 *
 *   node tests/explorer.test.js            (after `make build`)
 *   SHOTS=1 node tests/explorer.test.js    also saves screenshots to out/shots/
 *
 * Needs Playwright (npm i -g playwright, or the pre-installed copy in the cloud session).
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const FILE = path.resolve(__dirname, '..', 'out', 'bettws-curriculum-explorer.html');
const SHOTS = !!process.env.SHOTS;
const shotsDir = path.resolve(__dirname, '..', 'out', 'shots');
let failures = 0;
function check(ok, msg) { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failures++; }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  async function shot(name) { if (SHOTS) { fs.mkdirSync(shotsDir, { recursive: true }); await page.screenshot({ path: path.join(shotsDir, name + '.png'), fullPage: false }); } }
  async function open(hash) { await page.goto('file://' + FILE + hash); await page.waitForTimeout(150); }
  const text = async () => (await page.locator('#main').innerText());

  await open('#/');
  check((await page.title()).indexOf('Curriculum Explorer') >= 0, 'home opens');
  check(await page.locator('a.path[href="#/browse"]').count() === 1, 'home has Browse the curriculum');
  check(await page.locator('a.path.is-off').count() === 1, 'My pupils is greyed out (phase 2)');
  await shot('01-home');

  await open('#/browse');
  const strands = await page.locator('.list-row').count();
  check(strands >= 15, 'browse lists the strands (' + strands + ')');
  const browseText = await text();
  check(!/\bPFA\b/.test(browseText), 'main view mentions no PFA');
  await shot('02-browse');

  await open('#/browse/map');
  check(await page.locator('table.bx-map').count() === 1, 'the curriculum map renders');
  check(await page.locator('.bx-cell.is-gap').count() > 0, 'map shows gaps as words');
  await shot('03-map');

  await open('#/browse/s/Number%2C%20Calculation%20%26%20Pattern');
  check(await page.locator('.list-row').count() >= 5, 'NCP lists its progression steps');
  await open('#/browse/s/Number%2C%20Calculation%20%26%20Pattern/2.2');
  let cards = await page.locator('article.bx-statement').count();
  check(cards >= 25, 'NCP WPS 2.2 shows its statements (' + cards + ')');
  check((await text()).indexOf('Phase 4') >= 0, 'phases are headings on the spine');
  check(!/\bPFA\b/.test(await text()), 'NCP 2.2 mentions no PFA');
  check(await page.locator('.bx-statement-text .bx-code', { hasText: '2.2-' }).count() > 0, 'codes sit on the statement lines');
  await shot('04-ncp-2.2');

  await open('#/browse/s/Number%2C%20Calculation%20%26%20Pattern/3');
  check(await page.locator('#st-NCP-3-03').count() === 1, 'NCP-3-03 (new in v1.21) is present');
  check(!(await page.locator('#st-NCP-3-03 .bx-detail').isVisible()), 'small steps are hidden until tapped');
  await page.locator('#st-NCP-3-03 .bx-reveal').click();
  check(await page.locator('#st-NCP-3-03 .bx-detail').isVisible(), 'small steps open behind a tap');
  check((await page.locator('#st-NCP-3-03 .bx-detail').innerText()).indexOf('through zero') >= 0, 'NCP-3-03 has its small steps from NCP_WPS3_Layers');
  check((await page.locator('#st-NCP-3-03 .bx-detail').innerText()).indexOf('Questions to ask') >= 0, 'NCP-3-03 has probing questions');

  await open('#/browse/s/Algebra/3');
  const algCodes = await page.locator('article.bx-statement .bx-statement-text .bx-code').allInnerTexts();
  check(algCodes[0] === 'ALG-3-05', 'Algebra WPS 3 starts with the equals sign (presentation order): ' + algCodes.slice(0, 3).join(', '));

  // learning intentions basket
  await open('#/browse/s/Number%2C%20Calculation%20%26%20Pattern/2.2');
  const addBtns = page.locator('button.bx-add');
  const n = await addBtns.count();
  for (let i = 0; i < Math.min(6, n); i++) { await addBtns.nth(i).click(); await page.waitForTimeout(30); }
  const basketCount = await page.evaluate(() => JSON.parse(localStorage.getItem('bettws.explorer.basket.v1') || '[]').length);
  check(basketCount === 6, 'basket stops at six (' + basketCount + ')');
  check(await page.locator('button.bx-add:disabled').count() > 0, 'add button is disabled when the card is full');
  await open('#/basket');
  check(await page.locator('.basket-row').count() === 6, 'basket screen lists six statements');
  check((await text()).indexOf('The card holds six') >= 0, 'basket says plainly that it is full');
  await shot('05-basket');

  await open('#/card');
  await page.waitForTimeout(400);
  const filled = await page.locator('.intent textarea').evaluateAll(t => t.filter(x => x.value.trim()).length);
  check(filled === 6, 'card screen fills six intentions from the basket');
  check(await page.locator('canvas').count() === 1, 'card preview canvas is present');
  const canvasW = await page.locator('canvas').evaluate(c => c.width);
  check(canvasW > 100, 'preview drew (' + canvasW + 'px)');
  check(!(await page.locator('button.bx-hero').isDisabled()), 'Download PDF is enabled');
  const pdfOk = await page.evaluate(() => { try { const d = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }); d.text('x', 10, 10); return d.output('arraybuffer').byteLength > 500; } catch (e) { return 'ERR ' + e.message; } });
  check(pdfOk === true, 'jsPDF makes a PDF (' + pdfOk + ')');
  await shot('06-card');

  // PFA section
  await open('#/pfa');
  check(await page.locator('#appbar.is-pfa').count() === 1, 'PFA mode turns the app bar plum');
  check(await page.locator('a[href="#/pfa/outcomes"]').count() === 1, 'PFA has the Outcomes');
  await open('#/pfa/outcomes');
  cards = await page.locator('article.bx-statement').count();
  check(cards >= 50, 'Outcomes show the life statements (' + cards + ')');
  check((await text()).indexOf('Why this matters') >= 0, 'Outcomes carry Why this matters');
  await shot('07-outcomes');
  await open('#/pfa/destinations');
  check(await page.locator('article.bx-statement').count() >= 60, 'Destinations show the PFA-direct maths');
  await open('#/pfa/route');
  check(await page.locator('.bx-statement-text.is-stone').count() > 0 && await page.locator('.bx-statement-text:not(.is-stone)').count() > 0, 'Number Route has goals and stepping stones');

  // search
  await open('#/search?m=main&q=negative');
  await page.waitForTimeout(200);
  check(await page.locator('#st-NCP-3-03').count() === 1, 'search finds NCP-3-03 by wording');
  await open('#/search?m=main&q=NCP-3-07');
  await page.waitForTimeout(200);
  check(await page.locator('#st-NCP-3-07').count() === 1, 'search finds a statement by code');

  // enquiries
  await open('#/enquiries');
  check(await page.locator('.bx-enquiry').count() >= 1, 'enquiry library lists enquiries');
  check((await text()).indexOf('Bring it to Bertie') >= 0, 'enquiry library carries the mapper line');
  await open('#/enquiries/0');
  check(await page.locator('h2.t-title-2').count() >= 5, 'an enquiry shows its phases');
  check(await page.locator('.nest article').count() > 0, 'maths statements nest under their life goal');
  await shot('08-enquiry');

  await open('#/statement/TEM-3-01');
  check(await page.locator('#st-TEM-3-01 .bx-detail').count() >= 0 && (await text()).indexOf('Temperature') >= 0, 'statement detail opens');

  // print: the frame and the keep rule
  await open('#/browse/s/Number%2C%20Calculation%20%26%20Pattern/2.2');
  await page.emulateMedia({ media: 'print' });
  const frame = await page.locator('.print-frame').evaluate(e => getComputedStyle(e).display);
  check(frame === 'block', 'print shows the double frame');
  const appbar = await page.locator('#appbar').evaluate(e => getComputedStyle(e).display);
  check(appbar === 'none', 'print hides the app bar');
  const keep = await page.locator('.keep').first().evaluate(e => getComputedStyle(e).breakInside);
  check(keep === 'avoid', 'heading + first card keep together in print');
  if (SHOTS) await page.pdf({ path: path.join(shotsDir, 'print-ncp-2.2.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });

  // dark mode renders
  await page.emulateMedia({ colorScheme: 'dark' });
  await open('#/browse/s/Money/2.2');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(bg === 'rgb(18, 24, 19)', 'dark mode uses the surface token (' + bg + ')');
  await shot('09-dark');
  await page.emulateMedia({ colorScheme: 'light' });

  // narrow (iPad portrait split view / phone)
  await page.setViewportSize({ width: 390, height: 844 });
  await open('#/browse');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  check(!overflow, 'no sideways scroll at 390px');
  await shot('10-narrow');

  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'All checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
