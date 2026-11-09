const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { enter, origin, save } = require('./helpers/site.cjs');

const ready = '.hero-dot-grid[data-grid-ready]';
const draws = page => page.evaluate(() => window.gridDraws);
async function idle(page) {
  await page.waitForFunction(() => performance.now() - window.lastGridDraw > 250);
  const count = await draws(page);
  await page.waitForTimeout(100);
  assert.equal(await draws(page), count, 'the settled grid stops drawing');
  return count;
}

async function trackDraws(page) {
  await page.addInitScript(() => {
    window.gridDraws = 0;
    window.lastGridDraw = 0;
    const draw = WebGL2RenderingContext.prototype.drawArraysInstanced;
    WebGL2RenderingContext.prototype.drawArraysInstanced = function (...args) {
      if (this.canvas.matches('.dot-grid__canvas')) {
        window.gridDraws++;
        window.lastGridDraw = performance.now();
      }
      return draw.apply(this, args);
    };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await trackDraws(page);
    const start = Date.now();
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.locator('#page-loading[open]').waitFor();
    assert.equal(await page.locator('.hero-dot-grid canvas').count(), 0);
    await page.locator(ready).waitFor();
    assert.ok(Date.now() - start >= 2500);
    assert.ok(await page.locator(ready + ' canvas').evaluate(canvas => {
      const ratio = canvas.width / canvas.clientWidth;
      return ratio > 0 && ratio <= 1.35 * Math.sqrt(.70) + .002 &&
        getComputedStyle(canvas).pointerEvents === 'none' && canvas.tabIndex === -1;
    }), 'canvas follows the adaptive backing-buffer budget and never captures input');

    let count = await idle(page);
    await page.mouse.move(32, 32);
    await page.waitForFunction(count => window.gridDraws > count, count);
    count = await idle(page);
    await page.mouse.click(32, 32);
    await page.waitForFunction(count => window.gridDraws > count, count);
    await page.locator('#about').evaluate(section => section.scrollIntoView());
    await page.waitForFunction(() => document.querySelector('#home').classList.contains('hero-idle'));
    count = await idle(page);
    await page.locator('#home').evaluate(section => section.scrollIntoView());
    await page.waitForFunction(count => window.gridDraws > count, count);
    count = await idle(page);
    await page.mouse.click(32, 32);
    await page.waitForFunction(count => window.gridDraws > count, count);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await idle(page);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.locator(ready + ' canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.locator(ready).waitFor({ state: 'detached' });
    await idle(page);
    assert.deepEqual(errors, []);
    await page.close();

    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await trackDraws(phone);
    await enter(phone, '#home');
    await phone.locator(ready).waitFor();
    count = await idle(phone);
    await phone.touchscreen.tap(32, 80);
    await phone.waitForFunction(count => window.gridDraws > count, count);
    count = await idle(phone);
    await phone.locator('.badge').tap();
    const cdp = await phone.context().newCDPSession(phone);
    const touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await touch('touchStart', [{ id: 1, x: 36, y: 200 }]);
    await touch('touchMove', [{ id: 1, x: 36, y: 100 }]);
    await touch('touchEnd', []);
    await phone.waitForTimeout(300);
    assert.ok(await phone.evaluate(() => scrollY > 0), 'vertical swipes keep native scrolling');
    assert.equal(await draws(phone), count, 'the card tap and vertical swipe do not launch a ripple');
    await touch('touchStart', [{ id: 1, x: 35, y: 100 }]);
    await touch('touchStart', [{ id: 1, x: 35, y: 100 }, { id: 2, x: 85, y: 100 }]);
    await touch('touchCancel', []);
    await phone.waitForTimeout(200);
    assert.equal(await draws(phone), count, 'multi-touch and cancellation do not launch a ripple');
    await phone.emulateMedia({ reducedMotion: 'reduce' });
    await phone.locator('.hero-dot-grid canvas').waitFor({ state: 'detached' });
    await phone.close();

    for (const fallback of ['reduced-motion', 'webgl-unavailable', 'no-javascript']) {
      const test = await browser.newPage({
        javaScriptEnabled: fallback !== 'no-javascript',
        reducedMotion: fallback === 'reduced-motion' ? 'reduce' : 'no-preference',
      });
      if (fallback === 'webgl-unavailable') await test.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return kind === 'webgl2' && this.matches('.dot-grid__canvas') ? null : get.call(this, kind, ...args);
        };
      });
      await enter(test, '#home');
      if (fallback === 'webgl-unavailable') await test.locator('.hero-dot-grid canvas').waitFor({ state: 'attached' });
      assert.equal(await test.locator(ready).count(), 0);
      assert.match(await test.locator('.hero-dot-grid').evaluate(node => getComputedStyle(node).backgroundImage), /radial-gradient/);
      await test.close();
    }
    const deepLink = await browser.newPage();
    const gridRequests = [];
    deepLink.on('request', request => { if (request.url().includes('/hero-dot-grid.js')) gridRequests.push(request.url()); });
    await enter(deepLink, '#about');
    await deepLink.waitForFunction(() => document.querySelector('#home').classList.contains('hero-idle'));
    assert.deepEqual(gridRequests, []);
    await deepLink.close();
    await save('hero-dot-grid', { loader: true, density: true, idle: true, mouse: true, touch: true, contextLoss: true, fallbacks: true, deepLink: true });
    console.log('Hero grid loader, gestures, idle, density, context loss and static fallbacks passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
