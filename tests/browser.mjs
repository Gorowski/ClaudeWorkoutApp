/* End-to-end tests, run against a real browser.

   These are integration tests on purpose. The things most likely to break in
   an app like this are not pure functions — they are "does the number I typed
   still exist after I close the app", "does the page still open in a gym with
   no signal", and "does typing in a box throw focus out of it". None of those
   can be tested without a browser.

   Run with:  npm test          (starts its own static server) */

import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8899';
const fails = [];
const ok = [];
const check = (name, cond, detail = '') => (cond ? ok : fails).push(name + (cond ? '' : ' :: ' + detail));

const browser = await chromium.launch({
  // Set CHROMIUM_PATH to use a browser Playwright did not download itself.
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: process.env.NO_SANDBOX ? ['--no-sandbox'] : [],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') { const t=m.text(); if(!/fonts\.googleapis|ERR_CONNECTION_RESET/.test(t)) errors.push(t); }; });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForSelector('.masthead h1', { timeout: 5000 });

check('renders masthead', (await page.textContent('.masthead h1')) === 'Night Unit Call Sheet');
check('seeded 6 routines', (await page.locator('.pick button').count()) === 7, 'six routines + Rest');
check('no console errors on boot', errors.length === 0, errors.join(' | '));

// The seeded session lives on 2026-08-26; navigate the calendar to it.
await page.click('button[data-act="tab"][data-v="calendar"]');
await page.waitForSelector('.recent .rrow');
const rows = await page.locator('.recent .rrow').count();
check('seeded session appears in log', rows === 1, `rows=${rows}`);
const rowText = await page.textContent('.recent .rrow');
check('seeded session summary', /Push A/.test(rowText), rowText);

await page.click('.recent .rrow');
await page.waitForSelector('.ex');
check('opened seeded session', (await page.textContent('.shead .bar h2')).includes('Push A'));

const bench = page.locator('.ex[data-ex="pushA_e1"]');
const benchSets = await bench.locator('.setbox input[data-f="w"]').nth(1).inputValue();
check('bench 100kg preserved', benchSets === '100', `got ${benchSets}`);

// --- write a new set and confirm it survives a reload (IndexedDB) ---
// Move to the next day, which the default week has down as a rest day, and
// override it. That exercises a fresh draft and the rest-day override at once.
await page.click('button[data-act="day"][data-v="1"]');
await page.waitForSelector('.pick');
check('rest day shows as rest', (await page.locator('.empty h2').count()) === 1);
await page.click('.pick button[data-v="legsA"]');
await page.waitForSelector('.ex[data-ex="legsA_e1"]');

const pend = page.locator('.ex[data-ex="legsA_e1"]');
await pend.locator('input[data-f="r"]').first().fill('11');
await pend.locator('input[data-f="w"]').first().fill('62.5');
await page.waitForFunction(() => !window.nucs.store.status.pending, null, { timeout: 4000 });
check('set box marked filled', await pend.locator('.setbox').first().evaluate((el) => el.classList.contains('filled')));

await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.ex[data-ex="legsA_e1"]');
const r2 = await page.locator('.ex[data-ex="legsA_e1"] input[data-f="r"]').first().inputValue();
const w2 = await page.locator('.ex[data-ex="legsA_e1"] input[data-f="w"]').first().inputValue();
check('reps survive reload', r2 === '11', `got "${r2}"`);
check('weight survives reload', w2 === '62.5', `got "${w2}"`);

// Load carry-forward: pendulum squat seeded at 60, logged 62.5 -> template updates
const tgt = await page.textContent('.ex[data-ex="legsA_e1"] .tgt');
check('load carried forward to program', /62\.5/.test(tgt), `target reads "${tgt}"`);

// --- focus must not be stolen while typing ---
const curl = page.locator('.ex[data-ex="legsA_e4"] input[data-f="r"]').first();
await curl.click();
await curl.type('12', { delay: 40 });
const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-f'));
check('focus retained while typing', focused === 'r', `activeElement data-f=${focused}`);

// --- program editor ---
await page.click('button[data-act="tab"][data-v="program"]');
await page.waitForSelector('.rt');
await page.locator('.rt[data-rt="legsA"] summary').click();
const nameInput = page.locator('.rt[data-rt="legsA"] .pe').first().locator('input[data-p="name"]');
await nameInput.fill('Pendulum Squat (deep)');
await page.waitForFunction(() => !window.nucs.store.status.pending, null, { timeout: 4000 });
await page.reload({ waitUntil: 'load' });
// The UI remembers the tab you were on, so come back to Session deliberately.
await page.waitForSelector('.nav');
await page.click('button[data-act="tab"][data-v="session"]');
await page.waitForSelector('.ex');
check('program edit persists', (await page.textContent('.ex[data-ex="legsA_e1"] .nm')) === 'Pendulum Squat (deep)');

// --- export shape ---
const exp = await page.evaluate(() => window.nucs.store.exportAll());
check('export has format tag', exp.format === 'nucs.export');
check('export carries both days', Object.keys(exp.sessions).length === 2, JSON.stringify(Object.keys(exp.sessions)));
check('export preserves seeded bench', JSON.stringify(exp.sessions['2026-08-26']).includes('"w":100'));

// --- service worker + offline ---
const swReady = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active).catch(() => false));
check('service worker active', swReady);
await ctx.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.masthead h1', { timeout: 5000 });
check('app boots offline', (await page.locator('.ex').count()) > 0, 'no exercise cards offline');
const offlineReps = await page.locator('.ex[data-ex="legsA_e1"] input[data-f="r"]').first().inputValue();
check('log readable offline', offlineReps === '11', `got "${offlineReps}"`);
await ctx.setOffline(false);

if (process.argv[2]) await page.screenshot({ path: process.argv[2] });

await browser.close();
console.log('\nPASS ' + ok.length);
ok.forEach((t) => console.log('  ok   ' + t));
if (fails.length) { console.log('\nFAIL ' + fails.length); fails.forEach((t) => console.log('  FAIL ' + t)); process.exit(1); }
console.log('\nall green');
