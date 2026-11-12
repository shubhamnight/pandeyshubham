const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { enter, save } = require('./helpers/site.cjs');

const animationModule = '**/assets/ui/animated-content.js';
const sections = ['profile', 'playground', 'about', 'projects', 'contact'];
const clear = page => page.waitForFunction(() =>
  [...document.querySelectorAll('[data-animated-content]')].every(node => !node.style.transform), null, { timeout: 2200 });
const entering = (page, id) => page.waitForFunction(id =>
  [...document.querySelectorAll('#' + id + ' [data-animated-content]')].some(node =>
    node.style.opacity !== '' && Number(node.style.opacity) < 1 && node.style.transform.includes('translate')), id, { timeout: 2200 });

async function jump(page, id) {
  await page.locator('#' + id).evaluate(section => window.scrollTo(0, section.offsetTop));
}

async function approach(page, id) {
  const selector = '#' + id + ' [data-animated-content]';
  await page.locator(selector).evaluateAll(nodes => {
    const top = Math.min(...nodes.map(node => node.getBoundingClientRect().top));
    window.scrollTo(0, Math.max(0, Math.floor(scrollY + top - innerHeight - 40)));
  });
  await page.waitForFunction(selector => {
    const nodes = [...document.querySelectorAll(selector)];
    const first = nodes.reduce((a, b) => a.getBoundingClientRect().top < b.getBoundingClientRect().top ? a : b);
    return first.getBoundingClientRect().top > innerHeight && first.style.opacity === '0' && !first.style.transform;
  }, selector, { timeout: 2200 });
}

async function returnToHero(page) {
  await jump(page, 'home');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await clear(page);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    for (const [width, height] of [[1440, 900], [390, 844], [820, 1180]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1100, isMobile: width < 1100 });
      const errors = [];
      const requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.url().endsWith('/animated-content.js')) requests.push(request.url()); });
      await enter(page, '#home');
      assert.equal(await page.locator('#home [data-animated-content]').count(), 0);
      assert.deepEqual(requests, [], 'the hero does not load the reveal engine');
      const preload = page.waitForResponse(response => response.url().endsWith('/animated-content.js') && response.ok());
      await page.evaluate(() => scrollTo(0, 10));
      await preload;
      await page.evaluate(() => import('./assets/ui/animated-content.js'));
      await page.evaluate(() => {
        window.revealedSections = new Set();
        const record = new MutationObserver(records => {
          for (const { target } of records) {
            if (target.matches('[data-animated-content]') && target.style.opacity && target.style.transform) {
              window.revealedSections.add(target.closest('.section').id);
            }
          }
        });
        record.observe(document.querySelector('main'), { subtree: true, attributes: true, attributeFilter: ['style'] });
      });
      for (const id of sections) {
        await approach(page, id);
        await jump(page, id);
        // A tall viewport can reveal part of the next section before its jump.
        await page.waitForFunction(id => window.revealedSections.has(id), id, { timeout: 2200 })
          .catch(error => { throw new Error(width + 'px initial entrance for ' + id, { cause: error }); });
        if (id === 'projects' && width === 1440) {
          const card = page.locator('#photography-camera');
          await card.focus({ preventScroll: true });
          assert.equal(await card.evaluate(node => node.closest('[data-animated-content]').style.opacity), '');
          await card.evaluate(node => node.blur());
        }
        await clear(page);
      }
      await jump(page, 'playground');
      await page.waitForTimeout(180);
      assert.equal(await page.locator('#playground .play-heading').evaluate(node => node.style.opacity), '', 'revisiting a section does not replay its reveal');
      if (width === 1440) {
        await approach(page, 'playground');
        await jump(page, 'playground');
        await page.waitForFunction(() => {
          const [heading, stage] = document.querySelectorAll('#playground [data-animated-content]');
          return heading.style.opacity !== '' && stage.style.opacity !== '' &&
            Math.abs(Number(heading.style.opacity) - Number(stage.style.opacity)) > .02;
        }, null, { timeout: 2200 });
        await clear(page);
        await jump(page, 'contact');
        await page.waitForTimeout(150);
        await jump(page, 'profile');
        assert.equal(await page.locator('#profile .personal-copy').evaluate(node => node.style.transform), '');
        await approach(page, 'playground');
        await jump(page, 'playground');
        await entering(page, 'playground');
      }
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const replayOrder = [...sections, 'profile', 'projects', 'about'];
      for (const [lap, id] of replayOrder.entries()) {
        await returnToHero(page);
        await approach(page, id).catch(error => {
          throw new Error(width + 'px preparation for replay ' + (lap + 1) + ' for ' + id, { cause: error });
        });
        await jump(page, id);
        await entering(page, id).catch(error => {
          throw new Error(width + 'px replay ' + (lap + 1) + ' for ' + id, { cause: error });
        });
        if (lap === 0 && width === 390) {
          await page.setViewportSize({ width, height: height - 24 });
          await entering(page, id);
          await page.setViewportSize({ width, height });
          await entering(page, id);
        }
        if (lap === 1) {
          await page.setViewportSize({ width: height, height: width });
          await clear(page);
          await page.setViewportSize({ width, height });
        }
        if (lap === 2) {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await clear(page);
          await page.emulateMedia({ reducedMotion: 'no-preference' });
        }
      }
      await returnToHero(page);
      assert.equal(requests.length, 1, 'returning to the hero reuses the loaded engine');
      assert.deepEqual(errors, []);
      results.push({ width, height, heroUnaffected: true, sections, focusSettles: true, replayTrips: replayOrder.length, cpuThrottle: 4 });
      console.log(width+'x'+height+': all five sections and '+replayOrder.length+' throttled replay trips passed');
      await page.close();
    }
    for (const mode of ['direct-link', 'reduced-motion', 'unavailable-module', 'no-javascript']) {
      const page = await browser.newPage({
        reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference',
        javaScriptEnabled: mode !== 'no-javascript',
      });
      if (mode === 'unavailable-module') await page.route(animationModule, route => route.abort());
      await enter(page, mode === 'direct-link' ? '#profile' : '#home');
      await jump(page, 'profile');
      await page.waitForTimeout(180);
      assert.equal(await page.locator('#profile .personal-copy').evaluate(node => getComputedStyle(node).opacity), '1', mode + ' keeps the content readable');
      await clear(page);
      if (mode === 'direct-link') {
        await returnToHero(page);
        await page.evaluate(() => import('./assets/ui/animated-content.js'));
        await approach(page, 'profile');
        await jump(page, 'profile');
        await entering(page, 'profile');
        await clear(page);
      }
      await page.close();
      results.push({ mode, readable: true });
    }
    await save('animated-content', results);
    console.log('Section reveals and 24 throttled replay trips passed, including toolbar resize, rotation and motion changes');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
