// Real browser/input against the real editor scripts, with synthetic images and
// a routed in-memory API. Backend persistence is covered separately by backend-stress.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { profiles, origin, save } = require('./helpers/site.cjs');
const root = path.resolve(__dirname, '..');
const ratio = crop => crop.width * 400 / (crop.height * 300);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < .015, `${actual} != ${expected}`);

async function frameRatio(page, expected) {
  await page.waitForFunction(expected => {
    const box = document.querySelector('#crop-canvas').getBoundingClientRect();
    return box.width > 0 && Math.abs(box.width / box.height - expected) < .015;
  }, expected);
}

(async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'editor simulation stays on loopback');
  const png = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><path fill="#f80" d="M0 0h200v300H0z"/><path fill="#08f" d="M200 0h200v300H200z"/><circle fill="white" cx="200" cy="150" r="60"/></svg>')).png().toBuffer();
  const source = Object.fromEntries(await Promise.all(['image-manager.html', 'image-manager.js', 'image-manager.css'].map(async name => [name, await fs.readFile(path.join(root, name.startsWith('image-manager') ? 'apps/media-studio/public' : '', name), 'utf8')])));
  const browser = await chromium.launch({ headless: true }), results = [];
  try { for (const [profile, width, height, touch] of profiles) {
    if (process.env.BROWSER_PROFILE && process.env.BROWSER_PROFILE !== profile) continue;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    context.setDefaultTimeout(15000);
    const page = await context.newPage(), errors = [], requests = [], checks = [];
    const item = (id, alt) => ({ id, alt, source: '/qa-editor.png', preview: '/qa-editor.png', added: false, deleted: false });
    const library = { revision: 'fixture-0', photography: [item('PHOTOGRAPHY/fixture.png', 'Fixture photograph')], travel: [item('TRAVEL/fixture.png', 'Fixture travel')] };
    let failNext = false, revision = 0, siteLoads = 0;
    context.on('page', tab => tab.on('pageerror', error => errors.push(error.message)));
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/image-manager.*', route => {
      const name = new URL(route.request().url()).pathname.slice(1);
      return source[name] ? route.fulfill({ contentType: name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : 'text/javascript', body: source[name] }) : route.abort();
    });
    await context.route('**/qa-editor.png', route => route.fulfill({ contentType: 'image/png', body: png }));
    await context.route('**/qa-editor-site.html', route => {
      siteLoads++;
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Editor notification fixture</title><script type="module">import "/hobby-boot.js"; window.qaReady=true;</script>' });
    });
    // No API request may reach the real server, including a future unexpected route.
    await context.route('**/api/**', async route => {
      if (new URL(route.request().url()).pathname !== '/api/media-manager') return route.abort();
      if (route.request().method() === 'GET') return route.fulfill({ json: library });
      assert.equal(route.request().method(), 'POST');
      const input = route.request().postDataJSON(); requests.push(input);
      if (failNext) { failNext = false; return route.fulfill({ status: 503, json: { error: 'Injected save failure; retry' } }); }
      const collection = library[input.category];
      let target = collection.find(entry => entry.id === input.id);
      if (input.action === 'save') {
        if (!target) { target = { ...item('upload-' + revision, input.alt), added: true }; collection.push(target); }
        target.alt = input.alt; target.edited = true;
        target[input.mode === 'backdrop' ? 'backdropCrop' : 'crop'] = input.crop;
      } else if (input.action === 'delete' || input.action === 'restore') target.deleted = input.action === 'delete';
      else return route.fulfill({ status: 400, json: { error: 'Unexpected fixture action' } });
      library.revision = 'fixture-' + ++revision;
      return route.fulfill({ json: library });
    });
    const choose = async () => { await page.getByRole('button', { name: 'Crop / update', exact: true }).first().click(); await page.waitForFunction(() => !document.querySelector('#save-image').disabled); };
    const saved = async () => { await page.locator('#save-image').click(); await page.locator('#editor-controls').waitFor({ state: 'hidden' }); return requests.at(-1); };
    const file = { name: 'fixture.png', mimeType: 'image/png', buffer: png };
    const pick = async button => {
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator(button).click()]);
      await chooser.setFiles(file); await page.waitForFunction(() => !document.querySelector('#save-image').disabled);
    };
    try {
      await page.goto(origin + '/image-manager.html');
      await choose(); await frameRatio(page, 3 / 4);
      await page.locator('#ratio').selectOption('square'); await frameRatio(page, 1);
      await page.locator('#ratio').selectOption('placeholder'); await frameRatio(page, 3 / 4);
      await page.locator('#zoom').focus(); await page.keyboard.press('End');
      const canvas = page.locator('#crop-canvas'); await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(350); // Let the editor's existing mobile scroll settle before native input.
      const box = await canvas.boundingBox(), x = box.x + box.width * .7, y = box.y + box.height * .5;
      if (touch) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
        for (let step = 1; step <= 6; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 30 * step / 6, y, id: 1 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
      } else { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 30, y, { steps: 6 }); await page.mouse.up(); }
      await page.locator('#image-description').fill('Updated fixture');
      const site = await context.newPage(); await site.goto(origin + '/qa-editor-site.html'); await site.waitForFunction(() => window.qaReady);
      await page.bringToFront();
      const first = await saved();
      assert.equal(first.category, 'photography'); assert.equal(first.mode, 'card'); assert.equal(first.id, library.photography[0].id);
      assert.ok(first.crop.x > .44375 + 15 / box.width * .1125, 'native drag must move the zoomed crop at least half the dispatched distance');
      near(first.crop.width, .1125); near(first.crop.height, .2); near(ratio(first.crop), 3 / 4); assert.equal(first.upload, undefined);
      for (let i = 0; i < 50 && siteLoads < 2; i++) await page.waitForTimeout(20);
      await page.waitForTimeout(100); assert.equal(siteLoads, 2, 'one save refreshes an open local tab once across both notification channels');
      await site.waitForFunction(() => window.qaReady); await site.close();
      await choose(); await canvas.focus(); await page.keyboard.press('ArrowRight');
      const keyboard = await saved();
      assert.ok(Math.abs(keyboard.crop.x - first.crop.x - first.crop.width * .005) < .00001, 'native keyboard fine adjustment is saved');
      assert.equal(keyboard.crop.y, first.crop.y);
      checks.push('preset ratio, native crop and save payload; real cross-tab refresh module');

      await choose(); await page.locator('#crop-mode').selectOption('backdrop'); await page.locator('#screen-size').selectOption('phone');
      await frameRatio(page, 390 / 844); failNext = true; await page.locator('#save-image').click();
      await page.getByRole('status').filter({ hasText: 'Injected save failure' }).waitFor();
      assert.ok(await page.locator('#editor-controls').isVisible()); assert.equal(await page.locator('#save-image').isEnabled(), true);
      const failed = requests.at(-1), retried = await saved(); assert.deepEqual(retried, failed);
      assert.equal(retried.mode, 'backdrop'); near(ratio(retried.crop), 390 / 844);
      checks.push('separate backdrop preset and recoverable save failure retain exact edit');

      await choose(); await pick('#replace-image');
      const replacement = await saved(); assert.equal(replacement.id, first.id); assert.equal(replacement.alt, 'Updated fixture');
      assert.equal(replacement.upload, 'data:image/png;base64,' + png.toString('base64'));
      await pick('#add-image'); await page.locator('#image-description').fill('Fixture added');
      const added = await saved(); assert.equal(added.id, null); assert.equal(added.upload, replacement.upload);
      assert.equal(await page.locator('.image-card').count(), 2);
      const uploaded = page.locator('.image-card').filter({ has: page.getByRole('heading', { name: 'Fixture added', exact: true }) });
      await uploaded.getByRole('button', { name: 'Delete', exact: true }).click(); await uploaded.waitFor({ state: 'detached' });
      await page.locator('#show-deleted').check(); await uploaded.getByRole('button', { name: 'Restore image', exact: true }).click();
      await uploaded.getByRole('button', { name: 'Crop / update', exact: true }).waitFor(); assert.equal(library.photography.filter(entry => entry.deleted).length, 0);
      checks.push('native file picker replace/add, delete visibility and restore');

      await page.locator('[data-category="travel"]').click();
      await page.evaluate(() => localStorage.setItem('shub-travel-frame', JSON.stringify({ ratio: 9 / 16, screenWidth: innerWidth, screenHeight: innerHeight })));
      await choose(); await page.locator('#screen-size').selectOption('current'); await frameRatio(page, 9 / 16);
      const travel = await saved(); assert.equal(travel.category, 'travel'); assert.equal(travel.mode, 'card'); near(ratio(travel.crop), 9 / 16);
      assert.ok(requests.every(input => !input.crop || input.crop.x >= 0 && input.crop.y >= 0 && input.crop.width > 0 && input.crop.height > 0 && input.crop.x + input.crop.width <= 1.000001 && input.crop.y + input.crop.height <= 1.000001));
      assert.deepEqual(errors, []); checks.push('Travel uses live placeholder metric; bounded crops and no page errors');
      results.push({ profile, emulated: true, evidence: 'real editor/source and input; synthetic images; routed API contract, not backend persistence', passed: true, checks, requests: requests.map(({ upload, ...input }) => ({ ...input, uploadedBytes: upload ? png.length : 0 })), errors });
    } catch (error) { await save('editor-contract', [...results, { profile, emulated: true, passed: false, checks, error: error.stack, errors }]); results.push({ profile, emulated: true, passed: false, checks, error: error.stack, errors }); }
    finally { await context.close(); }
    console.log(JSON.stringify(results.at(-1)));
  } } finally { await browser.close(); }
  await save('editor-contract', results);
  assert.ok(results.length && results.every(result => result.passed), 'editor contract regression failed; see results.json');
})().catch(error => { console.error(error); process.exitCode = 1; });
