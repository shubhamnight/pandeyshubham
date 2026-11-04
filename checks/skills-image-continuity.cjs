const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { enter, profiles, save } = require('./helpers/site.cjs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [profile, width, height, touch] of profiles) {
      if (process.env.BROWSER_PROFILE && process.env.BROWSER_PROFILE !== profile) continue;
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
      let iconRequests = 0;
      await page.route('**/assets/skills/*.svg', route => {
        iconRequests++;
        return route.abort();
      });
      if (process.env.PHONE_REFERENCE) await page.route('**/', async route => {
        const response = await route.fetch();
        const body = (await response.text()).replace('</head>', '<style>#about .skills-orbit-slot:nth-child(2){visibility:hidden}</style></head>');
        await route.fulfill({ response, body });
      });
      await enter(page);
      if (touch) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const x = 8, start = height * .9;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: start }] });
        for (let step = 1; step <= 10; step++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove', touchPoints: [{ x, y: start - height * .72 * step / 10 }],
          });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else await page.mouse.wheel(0, height * .85);
      await page.waitForFunction(() => scrollY > 300);
      await page.evaluate(() => scrollBy(0, -1));
      // Test native input during entry, then freeze any entry reveal for inspection.
      const skills = page.locator('.skills-orbit-disc');
      await skills.first().focus();
      assert.equal(await skills.count(), 14);
      assert.ok(await skills.evaluateAll(discs => discs.every(disc => {
        const icon = disc.querySelector('svg.skill-logo');
        const bounds = icon?.getBoundingClientRect();
        const { visibility, opacity } = getComputedStyle(disc);
        return icon?.getBBox().width > 0 && bounds.width > 20 && bounds.height > 20 &&
          visibility === 'visible' && opacity === '1';
      })), 'all Skills icons are visible immediately despite blocked icon downloads');
      assert.equal(iconRequests, 0);
      await page.screenshot({ path: require('node:path').join(process.env.AUDIT_OUTPUT || 'output', profile + '-skills.png') });
      results.push({ profile, icons: 14, iconRequests });
      await page.close();
    }
  } finally { await browser.close(); }
  await save('skills-image-continuity', results);
})().catch(error => { console.error(error); process.exitCode = 1; });
