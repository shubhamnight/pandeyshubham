const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const { enter, save } = require('./helpers/site.cjs');

const names = ['Figma', 'Sketch', 'HTML', 'CSS', 'JavaScript', 'Python', 'DBMS', 'React', 'Autodesk Maya', 'Claude', 'ChatGPT', 'Antigravity', 'Communication', 'Problem solving'];
const output = path.resolve(process.env.AUDIT_OUTPUT || 'output/regressions/skills-marquee');
const tracksSelector = '#about .skills-marquee-track';
const buttonsSelector = '#about [data-skills-primary] button.skills-orbit-disc';
async function playing(page, expected) {
  await page.waitForFunction(({ selector, expected }) => [...document.querySelectorAll(selector)].every(e =>
    getComputedStyle(e).animationPlayState === expected), { selector: tracksSelector, expected }, { polling: 50, timeout: 5000 });
  assert.equal(await page.locator('#about').getAttribute('data-skills-paused'), String(expected === 'paused'));
}
const times = page => page.locator(tracksSelector).evaluateAll(es => es.map(e => Number(e.getAnimations()[0]?.currentTime)));
async function blur(page, isTouch) {
  await page.locator('#about .skills-heading h2')[isTouch ? 'tap' : 'click']();
  if (!isTouch) await page.mouse.move(1, 1);
}
async function touch(cdp, type, points = []) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ id: i + 1, ...p })) });
}
// Real touchscreens deliver a swipe across multiple input frames, not at one instant.
async function swipe(cdp, start, distance) {
  await touch(cdp, 'touchStart', [start]);
  for (let i = 1; i <= 5; i++) {
    await touch(cdp, 'touchMove', [{ x: start.x + distance * i / 5, y: start.y }]);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
async function visiblePoint(row, exclude = '') {
  return row.evaluate((e, exclude) => {
    const r = e.getBoundingClientRect();
    for (const disc of e.querySelectorAll('.skills-orbit-disc')) {
      if (disc.dataset.skill === exclude) continue;
      const b = disc.getBoundingClientRect(), x = b.x + b.width / 2, y = b.y + b.height / 2;
      if (x > r.left + 12 && x < r.right - 12 && y > 0 && y < innerHeight) return { x, y };
    }
    throw Error('No visible Skills circle accepts input');
  }, exclude);
}

async function verifyPinch(context) {
  // Keep native zoom in its own page: resetting CDP scale does not reset the
  // browser's visual viewport pan and can corrupt subsequent input coordinates.
  const page=await context.newPage();
  try {
    await enter(page, '#about'); await page.bringToFront();
    const row=page.locator('#about .skills-marquee').first();
    await row.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
    const pinch=await row.evaluate(e=>{const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
    const cdp=await context.newCDPSession(page), initial=await page.evaluate(()=>visualViewport.scale);
    await touch(cdp,'touchStart',[{x:pinch.x-40,y:pinch.y},{x:pinch.x+40,y:pinch.y}]);
    for(let i=1;i<=8;i++) {
      await touch(cdp,'touchMove',[{x:pinch.x-40-i*10,y:pinch.y},{x:pinch.x+40+i*10,y:pinch.y}]);
      await page.waitForTimeout(20);
    }
    await touch(cdp,'touchEnd');
    await page.waitForFunction(scale=>visualViewport.scale>scale+.05,initial,{timeout:5000});
  } finally {await page.close();}
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  const results = [];
  try {
    for (const [width, height, isTouch] of [[1440, 900, false], [320, 568, true], [390, 844, true], [768, 1024, true], [844, 390, true]]) {
      if (process.env.SKILLS_WIDTH && width !== Number(process.env.SKILLS_WIDTH)) continue;
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: isTouch, isMobile: isTouch });
      const page = await context.newPage(), errors = [], requests = [];
      await page.addInitScript(() => {
        window.skillsHistoryRestores = [];
        addEventListener('pageshow', event => window.skillsHistoryRestores.push(event.persisted));
        window.skillsInputTrace = [];
        for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click']) document.addEventListener(type, e => {
          window.skillsInputTrace.push({ type, target: e.target.closest('[data-skill]')?.dataset.skill || e.target.tagName, x: e.clientX, y: e.clientY, pointer: e.pointerId, primary: e.isPrimary, detail: e.detail });
          if (window.skillsInputTrace.length > 50) window.skillsInputTrace.shift();
        }, true);
      });
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => requests.push(r.url()));
      await page.route('**/assets/skills/*.svg', route => route.abort());
      try {
        await enter(page, '#about'); await page.bringToFront();
        const rows = page.locator('#about .skills-marquee'), tracks = page.locator(tracksSelector), buttons = page.locator(buttonsSelector);
        await page.waitForFunction(() => document.querySelector('#about .skills-enhanced, #about.skills-enhanced'));
        await page.mouse.move(1, 1);
        assert.equal(await rows.count(), 2);
        assert.equal(await tracks.count(), 2);
        assert.ok(await buttons.evaluateAll(es=>es.every(e=>{
          const label=e.querySelector('.skills-orbit-name'), c=getComputedStyle(label);
          return c.visibility==='hidden' && c.opacity==='0' && c.backgroundColor!=='rgba(0, 0, 0, 0)' && label.offsetHeight<=parseFloat(c.lineHeight)*2+parseFloat(c.paddingTop)+parseFloat(c.paddingBottom)+1;
        })), 'colored skill names are hidden until interaction and fit within two lines');
        assert.deepEqual(await buttons.evaluateAll(es => es.map(e => e.dataset.skill)), names);
        assert.deepEqual(await tracks.evaluateAll(es => es.map(e => [...e.querySelectorAll('[data-skills-primary] button')].map(b => b.dataset.skill))), [names.slice(0, 7), names.slice(7)]);
        assert.equal(await page.locator('#about svg.skill-logo').count(), 28);
        assert.ok(await tracks.evaluateAll(es => es.every(e => {
          const copy = e.querySelector('ul[aria-hidden="true"]');
          return copy && copy.querySelectorAll('span.skills-orbit-disc').length === 7 && !copy.querySelector('button,a,input,select,textarea,[tabindex]:not([tabindex="-1"])');
        })), 'decorative copies have no keyboard controls or duplicate accessible skills');
        assert.ok(await page.locator('#about svg').evaluateAll(es => {
          const ids = es.flatMap(e => [...e.querySelectorAll('[id]')].map(n => n.id));
          return ids.length === new Set(ids).size && es.every(e => [...e.querySelectorAll('*')].every(n =>
            [...n.attributes].every(a => [...a.value.matchAll(/url\(#([^)]*)\)/g)].every(m => e.querySelector('[id="' + m[1] + '"]')))));
        }), 'copied SVG IDs and paint references remain local and unique');
        assert.deepEqual(await tracks.evaluateAll(es => es.map(e => {
          const c = getComputedStyle(e); return [c.animationName, c.animationDuration, c.animationDirection];
        })), [['skills-marquee-loop', '40s', 'normal'], ['skills-marquee-loop', '40s', 'reverse']]);
        await playing(page, 'running');
        const moving = await times(page);
        await page.waitForFunction(start => [...document.querySelectorAll('#about .skills-marquee-track')].every((e, i) =>
          Number(e.getAnimations()[0]?.currentTime) > start[i] + 30), moving, { polling: 50, timeout: 5000 });

        // Compare equivalent physical circles across the loop boundary, including reverse travel.
        const seams = await tracks.evaluateAll(es => es.map(e => {
          const a = e.getAnimations()[0], original = a.currentTime, groups = [...e.children];
          const reverse = getComputedStyle(e).animationDirection === 'reverse';
          a.currentTime = 0;
          const start = groups[reverse ? 1 : 0].firstElementChild.getBoundingClientRect();
          a.currentTime = 39999.999;
          const end = groups[reverse ? 0 : 1].firstElementChild.getBoundingClientRect();
          a.currentTime = original;
          return Math.max(...['x', 'y', 'width', 'height'].map(k => Math.abs(start[k] - end[k])));
        }));
        assert.ok(seams.every(delta => delta < .5), 'both repeated groups meet without a loop jump');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'marquee never widens the page');

        assert.equal(await page.locator('#about [data-skills-toggle], #about .skills-controls').count(), 0, 'manual pause control and its spacer are removed');
        // Real Tab navigation must expose and reveal every canonical circle, even when offscreen.
        await buttons.nth(1).focus();
        await page.keyboard.press('Shift+Tab');
        for (let i = 0; i < names.length; i++) {
          if (i) await page.keyboard.press('Tab');
          const active = buttons.nth(i);
          await page.waitForFunction(e => {
            const label = getComputedStyle(e.querySelector('.skills-orbit-name'));
            return label.visibility === 'visible' && Number(label.opacity) > .95;
          }, await active.elementHandle(), { timeout: 3000 });
          assert.ok(await active.evaluate(e => {
            const b = e.getBoundingClientRect(), r = e.closest('.skills-marquee').getBoundingClientRect();
            const tip = e.querySelector('.skills-orbit-name'), label = getComputedStyle(tip), t = tip.getBoundingClientRect();
            return t.left >= r.left - 1 && t.right <= r.right + 1 && t.bottom <= r.bottom + 1 && e === document.activeElement && e.matches(':focus-visible') && b.left >= r.left - 1 && b.right <= r.right + 1 && label.visibility === 'visible';
          }), names[i] + ' receives visible, unclipped keyboard focus and label');
          await playing(page, 'paused');
        }
        assert.ok(await rows.evaluateAll(es => es.every(e => {
          const row = e.getBoundingClientRect(), track = e.querySelector('.skills-marquee-track').getBoundingClientRect();
          return e.scrollLeft === 0 && track.left <= row.left + 1 && track.right >= row.right - 1;
        })), 'keyboard focus leaves no native scroll offset or blank strip in either loop');
        await tracks.evaluateAll(es => Promise.all(es.flatMap(e => e.getAnimations().map(a => a.ready))));
        const stopped = await times(page);
        await page.waitForTimeout(130);
        assert.ok((await times(page)).every((t, i) => Math.abs(t - stopped[i]) < 2), 'keyboard focus stops both timelines');
        if (!isTouch) {
          await page.keyboard.press('Enter');
          const mouseTarget = await visiblePoint(rows.first());
          await page.mouse.click(mouseTarget.x, mouseTarget.y);
          await page.mouse.move(1,1);
          assert.equal(await page.locator('#about [data-selected]').count(),0,'mouse input dismisses earlier keyboard selection');
          await playing(page,'running');
        }
        await blur(page, isTouch); await playing(page, 'running');

        const hit = await visiblePoint(rows.first());
        if (isTouch) {
          const cdp = await context.newCDPSession(page);
          await page.touchscreen.tap(hit.x, hit.y);
          assert.equal(await page.locator('#about .skills-orbit-disc[data-selected]').count(), 1, 'one tapped label is selected');
          await page.locator('#about .skills-orbit-disc[data-selected] .skills-orbit-name').waitFor({ state: 'visible' });
          await playing(page, 'paused');
          const selected = await page.locator('#about .skills-orbit-disc[data-selected]').getAttribute('data-skill');
          const other = await visiblePoint(rows.first(), selected);
          await page.touchscreen.tap(other.x, other.y);
          assert.equal(await page.locator('#about .skills-orbit-disc[data-selected]').count(), 1, 'tapping another circle replaces the selected label');
          assert.notEqual(await page.locator('#about .skills-orbit-disc[data-selected]').getAttribute('data-skill'), selected);
          await page.touchscreen.tap(other.x, other.y);
          assert.equal(await page.locator('#about .skills-orbit-disc[data-selected]').count(), 0, 'second tap dismisses');
          await playing(page, 'running');
          const before = await times(page);
          await swipe(cdp, hit, hit.x > 100 ? -70 : 70);
          await playing(page, 'paused');
          await page.waitForFunction(start => Math.abs(Number(document.querySelector('#about .skills-marquee-track').getAnimations()[0].currentTime) - start) > 400, before[0]);
          const dragged = await times(page);
          assert.ok(Math.abs(dragged[0] - before[0]) > 400, 'horizontal drag seeks the touched row');
          assert.ok(Math.abs(dragged[1] - before[1]) < 200, 'drag does not seek the other row');
          await touch(cdp, 'touchEnd'); await playing(page, 'running');
          assert.equal(await page.locator('#about .skills-orbit-disc[data-selected]').count(), 0, 'drag release never opens a tap label');
          await rows.last().scrollIntoViewIfNeeded();
          const reversePoint = await visiblePoint(rows.last());
          await page.touchscreen.tap(reversePoint.x, reversePoint.y); await playing(page, 'paused');
          const reverseDelta = reversePoint.x > 80 ? -50 : 50;
          const reverseX = await tracks.last().evaluate(e => e.getBoundingClientRect().x);
          await swipe(cdp, reversePoint, reverseDelta);
          assert.ok(Math.abs((await tracks.last().evaluate(e => e.getBoundingClientRect().x)) - reverseX - reverseDelta) < 2, 'reverse row follows the finger directly');
          await touch(cdp, 'touchEnd'); await playing(page, 'running');
          await rows.first().scrollIntoViewIfNeeded();
          const next = await visiblePoint(rows.first());
          await page.touchscreen.tap(next.x, next.y); await playing(page, 'paused');
          await page.locator('#about .skills-heading h2').tap(); await playing(page, 'running');
          assert.equal(await page.locator('#about .skills-orbit-disc[data-selected]').count(), 0, 'outside tap dismisses');
          await swipe(cdp, next, next.x > 80 ? -45 : 45);
          await page.setViewportSize({ width: height, height: width });
          await touch(cdp, 'touchCancel');
          await page.setViewportSize({ width, height }); await playing(page, 'running');
          const action = await rows.first().evaluate(e => getComputedStyle(e).touchAction);
          assert.match(action, /pan-y/); assert.match(action, /pinch-zoom/);
          await verifyPinch(context);
          const vertical = await visiblePoint(rows.first()), y = await page.evaluate(() => scrollY);
          await touch(cdp, 'touchStart', [vertical]);
          for (let i = 1; i <= 6; i++) {
            await touch(cdp, 'touchMove', [{ x: vertical.x, y: vertical.y - 140 * i / 6 }]);
            await page.waitForTimeout(20);
          }
          await touch(cdp, 'touchEnd');
          await page.waitForFunction(start => scrollY > start + 15, y);
          await page.locator('.floating-nav a[href="#about"]').click();
        } else {
          await page.mouse.move(hit.x, hit.y); await playing(page, 'paused');
          await page.waitForFunction(({ x, y }) => getComputedStyle(document.elementFromPoint(x, y).closest('.skills-orbit-disc').querySelector('.skills-orbit-name')).visibility === 'visible', hit);
          await page.mouse.click(hit.x,hit.y);
          assert.equal(await page.locator('#about [data-selected]').count(),0,'mouse clicks do not pin hover-only labels');
          const hovered = page.locator('#about [data-hovered]');
          const iconBox=await hovered.boundingBox(), labelBox=await hovered.locator('.skills-orbit-name').boundingBox();
          await page.mouse.move(labelBox.x+labelBox.width/2,labelBox.y+labelBox.height/2);
          await playing(page,'running');
          assert.equal(await page.locator('#about [data-hovered]').count(),0,'labels do not trigger icon hover');
          await page.waitForFunction(()=>[...document.querySelectorAll('#about .skills-orbit-name')].every(e=>getComputedStyle(e).visibility==='hidden'));
          await page.mouse.move(iconBox.x+1,iconBox.y+1);
          await playing(page,'running');
          assert.equal(await page.locator('#about [data-hovered]').count(),0,'square corners outside the circular icon do not hover');
          await page.mouse.move(1, 1); await playing(page, 'running');
          const resizeHit = await visiblePoint(rows.first());
          await page.mouse.move(resizeHit.x, resizeHit.y); await playing(page,'paused');
          await page.setViewportSize({width:640,height});
          await page.waitForFunction(()=>!document.querySelector('#about [data-hovered]'));
          await page.mouse.move(1,1); await playing(page,'running');
          await page.setViewportSize({width,height});
          const edge = await rows.first().boundingBox(), y = edge.y + edge.height / 2;
          await page.mouse.move(edge.x + edge.width - 2, y); await page.mouse.down();
          await page.mouse.move(edge.x + edge.width + 25, y); await page.mouse.up();
          await page.mouse.move(edge.x + edge.width - 25, y); await page.mouse.move(1, 1);
          await playing(page, 'running');
        }

        await page.locator('#contact').scrollIntoViewIfNeeded(); await playing(page, 'paused');
        await page.locator('.floating-nav a[href="#about"]').click(); await page.mouse.move(1, 1); await playing(page, 'running');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(e => e.getAnimations().length === 0), tracksSelector);
        assert.ok(await rows.evaluateAll(es => es.every(e => /auto|scroll/.test(getComputedStyle(e).overflowX))), 'reduced motion keeps both rows natively scrollable');
        assert.ok(await tracks.locator('ul[aria-hidden="true"]').evaluateAll(es => es.every(e => getComputedStyle(e).display === 'none')), 'reduced motion removes visual duplicates');
        await page.keyboard.press('Tab');
        for (const row of await rows.all()) {
          await row.locator('[data-skills-primary] button').last().focus();
          assert.ok(await row.evaluate(e => { const r=e.getBoundingClientRect(), last=e.querySelector('[data-skills-primary]').lastElementChild.firstElementChild.getBoundingClientRect(); return last.left>=r.left-1 && last.right<=r.right+1; }), 'last reduced-motion skill remains reachable');
        }
        await page.emulateMedia({ reducedMotion: 'no-preference' }); await blur(page, isTouch); await playing(page, 'running');
        // Leave from Skills so history restoration starts below the hero on short screens.
        await page.locator('#about').evaluate(section => section.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.goto('about:blank'); await page.goBack({ waitUntil: 'commit' });
        await page.locator('.floating-nav a[href="#about"]').click(); await page.mouse.move(1, 1); await playing(page, 'running');
        assert.equal(await page.locator(buttonsSelector).count(), 14, 'history restore does not duplicate controls');
        const bfcache = await page.evaluate(() => window.skillsHistoryRestores.includes(true));
        assert.ok(bfcache, 'history journey exercises an actual persisted BFCache restoration');
        assert.equal(requests.filter(url => /\/assets\/skills\/.*\.svg(?:\?|$)/.test(url)).length, 0, 'Skills needs no icon requests');
        assert.equal(requests.filter(url => /\/(?:react|react-dom)(?:[./-]|$)/i.test(url)).length, 0, 'Skills does not fetch React');
        assert.deepEqual(errors, []);
        await page.screenshot({ path: path.join(output, width + '-skills.png') });
        results.push({ viewport: [width, height], input: isTouch ? 'Chromium touch emulation' : 'mouse and keyboard', skills: 14, seams, bfcache, errors });
        console.log(width + 'x' + height + ': Skills marquee input, seams, focus, recovery and reduced motion passed');
      } catch (error) {
        await page.screenshot({ path: path.join(output, width + '-failure.png') });
        const state = await page.evaluate(() => ({ hidden: document.hidden, scroll: scrollY, body: document.body.className, focus: document.activeElement?.tagName, root: document.querySelector('#about')?.dataset, input: window.skillsInputTrace, tracks: [...document.querySelectorAll('.skills-marquee-track')].map(e => ({ css: getComputedStyle(e).animationPlayState, bounds: e.getBoundingClientRect().toJSON(), animations: e.getAnimations().map(a => ({ time: a.currentTime, state: a.playState })) })) }));
        await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ viewport: [width, height], error: error.stack, errors, state }, null, 2));
        throw error;
      } finally { await context.close(); }
    }
    // WebKit emits a compatibility MouseEvent after a touch pointerup.
    const safari = await webkit.launch({ headless: true });
    try {
      const page = await safari.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
      await enter(page, '#about'); await page.bringToFront();
      await page.waitForSelector('#about.skills-enhanced');
      const row=page.locator('#about .skills-marquee').first(), point=await visiblePoint(row);
      await page.touchscreen.tap(point.x,point.y);
      assert.equal(await page.locator('#about [data-selected]').count(),1, 'WebKit touch selects exactly once');
      await page.touchscreen.tap(point.x,point.y);
      assert.equal(await page.locator('#about [data-selected]').count(),0, 'WebKit second touch dismisses');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.locator(buttonsSelector).first().tap();
      assert.equal(await page.locator('#about [data-selected]').count(),1, 'static WebKit touch keeps its label');
      results.push({engine:'WebKit touch emulation',tapAndReducedMotion:true});
    } finally { await safari.close(); }
    // With scripting disabled the same two canonical lists remain usable through native scroll.
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 568 } });
    try {
      const page = await context.newPage(); await enter(page, '#about'); await page.bringToFront();
      assert.equal(await page.locator(buttonsSelector).count(), 14);
      assert.ok(await page.locator('#about .skills-marquee').evaluateAll(es => es.every(e => /auto|scroll/.test(getComputedStyle(e).overflowX))));
      assert.ok(await page.locator('#about ul[aria-hidden="true"]').evaluateAll(es => es.every(e => getComputedStyle(e).display === 'none')));
      const last = page.locator(buttonsSelector).last(); await last.focus();
      assert.ok(await last.evaluate(e => { const b = e.getBoundingClientRect(); return b.left >= -1 && b.right <= innerWidth + 1; }));
      results.push({ viewport: [320, 568], javaScript: false, nativeScroll: true });
    } finally { await context.close(); }
    // Playwright normally forces focus on its internal CDP session. Connect to an
    // isolated native window with noDefaults so minimizing changes real visibility.
    const profile = await fs.mkdtemp(path.join(output, 'native-profile-'));
    const native = require('node:child_process').spawn(process.env.BROWSER_EXECUTABLE || chromium.executablePath(),
      ['--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', 'about:blank'],
      { windowsHide: true, stdio: 'ignore' });
    let visibleBrowser, launchError;
    native.on('error', error => { launchError = error; });
    try {
      let port;
      for (let i = 0; i < 100 && !port; i++) {
        if (launchError) throw launchError;
        port = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split('\n')[0];
        if (!port) await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.ok(port, 'native Chromium starts its isolated lifecycle probe');
      visibleBrowser = await chromium.connectOverCDP('http://127.0.0.1:' + port, { noDefaults: true });
      const page = visibleBrowser.contexts()[0].pages()[0];
      await enter(page, '#about'); await page.bringToFront(); await page.mouse.move(1, 1); await playing(page, 'running');
      const lifecycle = await page.context().newCDPSession(page);
      const { windowId } = await lifecycle.send('Browser.getWindowForTarget');
      await lifecycle.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } });
      await page.waitForFunction(() => document.hidden, undefined, { polling: 50, timeout: 5000 });
      await playing(page, 'paused');
      await lifecycle.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
      await page.bringToFront(); await playing(page, 'running');
      results.push({ headed: true, nativeMinimizeVisibility: true });
    } finally { await visibleBrowser?.close(); if (native.exitCode === null) native.kill(); }
    assert.ok(results.length > 1, 'requested viewport exists in Skills matrix');
    await save('skills-marquee', results);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
