const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { profiles, galleries, enter, hobbies, open, close, model, save } = require('./helpers/site.cjs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [profile, width, height, touch] of profiles) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await enter(page, '#about');
      await hobbies(page);
      await page.goBack();
      await page.waitForFunction(() => location.hash === '#about' && scrollY > 0);
      await page.goForward();
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(new URL(page.url()).hash, '#projects');
      const camera = page.locator('[data-hobby-model="photography-camera"]');
      const travel = page.locator('[data-hobby-model="travel-plane"]');
      let release;
      const stalled = new Promise(resolve => { release = resolve; });
      await page.route('**/photography-camera.js*', async route => {
        await stalled;
        await route.continue();
      });
      await camera.click();
      await travel.click();
      await page.locator('#travel-plane.camera-ready canvas').waitFor({ timeout: 25000 });
      release();
      await page.unrouteAll({ behavior: 'wait' });
      assert.equal(await page.locator('.hobby-orbit-center canvas').count(), 1);
      assert.equal(await page.locator('#photography-camera canvas').count(), 0, 'late canceled models cannot mount');
      await page.locator('#travel-plane canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
      await page.getByRole('button', { name: /Retry 3D/ }).waitFor();
      assert.equal(await page.locator('.hobby-orbit-center canvas').count(), 0);
      assert.ok(await page.locator('#travel-plane img').isVisible(), 'failed model restores its poster');
      const dialog = await open(page, galleries.find(([, name]) => name === 'travel'));
      await close(page, dialog);
      await model(page, 'travel-plane');
      if (touch) {
        await page.setViewportSize({ width: height, height: width });
        assert.ok(await page.locator('#travel-plane canvas').isVisible());
        await page.setViewportSize({ width, height });
      }
      await model(page, 'photography-camera');
      assert.equal(await page.locator('.hobby-orbit-center canvas').count(), 1);
      await camera.click();
      assert.equal(await page.locator('.hobby-orbit-center canvas').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(errors, []);
      results.push({ profile, history: true, cancelledImport: true, contextLossRecovered: true, oneRenderer: true });
      await page.close();
    }
  } finally { await browser.close(); }
  await save('rendering-reliability', results);
})().catch(error => { console.error(error); process.exitCode = 1; });
