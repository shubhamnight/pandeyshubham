const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { profiles, enter, hobbies, save } = require('./helpers/site.cjs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [profile, width, height, touch] of profiles) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
      const modelRequests = [];
      page.on('request', request => {
        if (/three\.module|\/(?:photography-camera|gaming-controller|travel-plane|music-walkman)\.js/.test(request.url()))
          modelRequests.push(request.url());
      });
      await enter(page);
      const sample = await page.evaluate(() => new Promise(resolve => {
        const end = document.querySelector('#projects').offsetTop;
        const gaps = [], started = performance.now();
        let previous = started;
        function frame(now) {
          const progress = Math.min(1, (now - started) / 2400);
          gaps.push(now - previous);
          previous = now;
          scrollTo(0, end * progress);
          if (progress < 1) requestAnimationFrame(frame);
          else resolve({ y: scrollY, end, gaps });
        }
        requestAnimationFrame(frame);
      }));
      assert.ok(Math.abs(sample.y - sample.end) < 2, 'native scroll reaches Hobbies after Skills');
      assert.ok(sample.gaps.length > 30, 'trace contains actual frames');
      const sorted = sample.gaps.toSorted((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * .95)];
      assert.ok(p95 < 34, profile + ' sustained frame gaps exceed 34 ms');
      await hobbies(page);
      assert.deepEqual(modelRequests, [], 'ordinary scrolling never prepares 3D');
      results.push({ profile, p95, max: sorted.at(-1), over33: sorted.filter(gap => gap > 33).length });
      await page.close();
    }
  } finally { await browser.close(); }
  await save('runtime-budget', results);
})().catch(error => { console.error(error); process.exitCode = 1; });
