// 保留的手动集成检查工具, 场景使用离线 file:// 页面. 未获用户授权时不得执行.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.cwd(), temp = await mkdtemp(join(tmpdir(), 'zero-line-test-'));
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }),
  headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, offline: true });
await context.addInitScript(() => { let seed = 42; Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); });
let checks = 0;
async function check(name, fn) { await fn(); console.log('PASS', name); checks++; }
async function open(dir = root, fatal = false) {
  const page = await context.newPage(); const network = [];
  page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
  await page.goto(pathToFileURL(join(dir, 'index.html')).href);
  if (fatal) await page.waitForFunction(() => document.querySelector('#fault-list').textContent.length > 0);
  else await page.waitForFunction(() => FPS.inspect?.().ready);
  assert.deepEqual(network, [], 'Game must not request online assets'); return page;
}
async function advance(page, seconds) {
  const initial = await page.evaluate(() => FPS.inspect().time);
  await page.waitForFunction(t => FPS.inspect().time >= t, initial + seconds, { timeout: 15000 });
}
async function start(page) { await page.click('#start'); await page.waitForFunction(() => FPS.inspect().mode === 'playing'); }
async function fixture(name, modify, test, fatal = false) {
  const dir = join(temp, name); await mkdir(dir);
  for (const f of ['index.html', 'scene-layout.js', 'models', 'vendor']) await cp(join(root, f), join(dir, f), { recursive: true });
  await modify(dir); const page = await open(dir, fatal);
  try { await test(page); } finally { await page.close(); }
}
async function corrupt(dir, file, transform) {
  const path = join(dir, file); await writeFile(path, transform(await readFile(path, 'utf8')));
}
try {
  const page = await open();
  await check('offline file:// startup, independent models and scene instances', async () => {
    const s = await page.evaluate(() => { const s = FPS.inspect(); return { ready: s.ready, errors: s.failures, actors: s.total, models: Object.keys(FPS.models).length, debug: s.player.debug }; });
    assert.equal(s.ready, true); assert.deepEqual(s.errors, []); assert.equal(s.actors, 6); assert.equal(s.models, 11); assert.equal(s.debug, false);
    const east = await page.evaluate(() => { const b = FPS.inspect().solid.find(s => s.id === 'east').box; return { minX: b.min.x, maxZ: b.max.z }; });
    assert(Math.abs(east.minX - 26) < .001); assert(Math.abs(east.maxZ - 30) < .001);
    await mkdir(join(root, 'artifacts'), { recursive: true }); await page.screenshot({ path: join(root, 'artifacts/menu.png') });
  });
  await start(page);
  await page.screenshot({ path: join(root, 'artifacts/game.png') });
  await check('enemy movement and articulated walking animation', async () => {
    const before = await page.evaluate(() => FPS.inspect().actors[0].root.position.toArray());
    await advance(page, .7);
    const after = await page.evaluate(() => { const a = FPS.inspect().actors[0]; return { pos: a.root.position.toArray(), joints: a.root.children.filter(n => n.isGroup).map(n => n.rotation.x) }; });
    assert.notDeepEqual(after.pos, before); assert(after.joints.some(n => Math.abs(n) > .01));
  });
  await check('WASD movement stops at layout collision box', async () => {
    await page.evaluate(() => { FPS.inspect().player.position.set(5, 0, 13); yaw = 0; pitch = 0; });
    await page.keyboard.down('w'); await advance(page, .65); await page.keyboard.up('w');
    const p = await page.evaluate(() => FPS.inspect().player.position.toArray());
    assert(p[2] >= 11.85 && p[2] < 12.2, `unexpected collision position ${p}`);
  });
  await check('jump and gravity return the player to the floor', async () => {
    await page.evaluate(() => { FPS.inspect().player.position.set(0, 0, 22); }); await advance(page, .1);
    await page.keyboard.down('Space'); await advance(page, .15); await page.keyboard.up('Space');
    assert((await page.evaluate(() => FPS.inspect().player.position.y)) > .4);
    await advance(page, .9); assert.equal(await page.evaluate(() => FPS.inspect().player.position.y), 0);
  });
  await check('B flight follows pitched camera, has no gravity, shows collision debug', async () => {
    await page.evaluate(() => { pitch = .65; }); await advance(page, .05); await page.keyboard.press('b');
    await page.keyboard.down('w'); await advance(page, .3); await page.keyboard.up('w');
    const height = await page.evaluate(() => FPS.inspect().player.position.y); assert(height > 1);
    await advance(page, .25); assert.equal(await page.evaluate(() => FPS.inspect().player.position.y), height);
    assert.equal(await page.evaluate(() => helpers.length > 0 && helpers.every(h => h.visible)), true);
    // 在实体内部退出调试时返回有效出生点, 避免玩家卡在碰撞体内.
    await page.evaluate(() => FPS.inspect().player.position.set(-9, 1, 1)); await page.keyboard.press('b');
    assert.equal(await page.evaluate(() => FPS.inspect().player.debug), false);
    assert.equal(await page.evaluate(() => FPS.inspect().player.position.x), 0);
  });
  await check('raycast firing, headshot damage, death and reload', async () => {
    await page.evaluate(() => {
      const s = FPS.inspect(); s.player.position.set(0, 0, 12); yaw = pitch = 0;
      s.actors.forEach((a, i) => { a.update = () => {}; a.root.position.set(i ? -20 : 0, 0, i ? -25 : 5); });
    });
    await advance(page, .1);
    await page.mouse.down(); await page.mouse.up(); await advance(page, .17);
    assert.equal(await page.evaluate(() => FPS.inspect().ammo), 29);
    assert.equal(await page.evaluate(() => FPS.inspect().actors[0].health), 32);
    await page.mouse.down(); await page.mouse.up(); await advance(page, .17);
    assert.equal(await page.evaluate(() => FPS.inspect().kills), 1);
    assert.equal(await page.evaluate(() => FPS.inspect().actors[0].alive), false);
    await page.keyboard.press('r'); await advance(page, .2);
    assert((await page.evaluate(() => FPS.inspect().reloadLeft)) > 0);
    await advance(page, 1.6); assert.equal(await page.evaluate(() => FPS.inspect().ammo), 30);
  });
  await check('wall occlusion blocks damage for both teams', async () => {
    const result = await page.evaluate(() => {
      const s = FPS.inspect(), target = s.actors[1]; target.root.position.set(-9, 0, -8);
      const origin = new THREE.Vector3(-9, 1.65, 8), direction = new THREE.Vector3(0, 0, -1), health = target.health;
      shoot(origin, direction, 'player', 100);
      s.player.position.set(-9, 0, 8); const playerHealth = s.player.health;
      shoot(new THREE.Vector3(-9, 1.65, -8), new THREE.Vector3(0, 0, 1), 'enemy', 50);
      return { health, after: target.health, playerHealth, playerAfter: s.player.health };
    });
    assert.equal(result.after, result.health); assert.equal(result.playerAfter, result.playerHealth);
  });
  await check('ESC pauses simulation, then resumes', async () => {
    await page.keyboard.press('Escape'); const t = await page.evaluate(() => FPS.inspect().time);
    await page.waitForTimeout(200); assert.equal(await page.evaluate(() => FPS.inspect().time), t);
    assert.equal(await page.evaluate(() => FPS.inspect().mode), 'paused'); await start(page); await advance(page, .1);
  });
  await check('victory and replay control', async () => {
    await page.evaluate(() => { const s = FPS.inspect(); s.actors.filter(a => a.alive).forEach(a => a.damage(1000, api)); });
    await page.waitForFunction(() => FPS.inspect().mode === 'won');
    assert.equal(await page.locator('#start-label').textContent(), '重新部署');
    await page.click('#start'); await page.waitForFunction(() => FPS.inspect?.().mode === 'menu');
    assert.equal(await page.evaluate(() => FPS.inspect().kills), 0);
  });
  await page.close();
  const combat = await open(); await start(combat);
  await check('enemy aims, fires and damages the player; debug immunity', async () => {
    await combat.evaluate(() => {
      Math.random = () => .5;
      const s = FPS.inspect(); s.player.position.set(0, 0, 12);
      s.actors.forEach((a, i) => { if (i) a.update = () => {}; else a.root.position.set(0, 0, 7); });
    });
    await advance(combat, 3.2);
    assert((await combat.evaluate(() => FPS.inspect().actors[0].shots)) > 0);
    assert((await combat.evaluate(() => FPS.inspect().player.health)) < 100);
    await combat.keyboard.press('b'); const health = await combat.evaluate(() => FPS.inspect().player.health);
    await advance(combat, 1.5); assert.equal(await combat.evaluate(() => FPS.inspect().player.health), health);
    await combat.keyboard.press('b');
    await combat.evaluate(() => { damagePlayer(1000, new THREE.Vector3(0, 1.65, 7)); });
    assert.equal(await combat.evaluate(() => FPS.inspect().mode), 'dead');
  });
  await combat.close();
  const debugPage = await open(); await start(debugPage);
  await debugPage.evaluate(() => { actors.forEach(a => { a.update = () => {}; }); });
  await check('larger damage triangle points to the source and follows camera rotation', async () => {
    const result = await debugPage.evaluate(() => {
      player.position.set(0, 0, 22); yaw = 0; pitch = 0;
      damagePlayer(1, new THREE.Vector3(5, 1.65, 22));
      return { before: getComputedStyle($('damage'), '::before').borderBottomWidth, shadow: getComputedStyle($('damage')).boxShadow };
    });
    assert.equal(result.before, '24px'); assert.equal(result.shadow, 'none');
    await advance(debugPage, .05);
    const angle = await debugPage.evaluate(() => Number.parseFloat($('damage').style.transform.slice(7)));
    assert(Math.abs(angle - Math.PI / 2) < .001);
    await debugPage.screenshot({ path: join(root, 'artifacts/damage-direction.png') });
    await debugPage.evaluate(() => { yaw = Math.PI / 2; }); await advance(debugPage, .05);
    const turned = await debugPage.evaluate(() => Number.parseFloat($('damage').style.transform.slice(7)));
    assert(Math.abs(turned - Math.PI) < .001);
    await advance(debugPage, 1.2); assert.equal(await debugPage.locator('#damage').evaluate(e => e.style.opacity), '0');
  });
  await check('crates remain visible across debug toggles with matching collision bounds and live XYZ coordinates', async () => {
    assert.equal(await debugPage.evaluate(() => entries.filter(e => e.data.model === 'crate').length), 4);
    assert.equal(await debugPage.evaluate(() => entries.filter(e => e.data.model === 'crate').every(e => e.root.visible) && solid.filter(s => s.id.startsWith('crate-')).length === 4), true);
    await debugPage.keyboard.press('b');
    await debugPage.evaluate(() => { player.position.set(1.25, 3.5, 20.75); yaw = 0; pitch = -.3; });
    await advance(debugPage, .2);
    assert(await debugPage.locator('#debug').isVisible());
    const label = await debugPage.locator('#debug').textContent();
    assert(label.includes('玩家脚底坐标 (m)')); assert(label.includes('X  1.25\nY  3.50\nZ  20.75'));
    const bounds = await debugPage.evaluate(() => entries.filter(e => e.data.model === 'crate').map(e => {
      const visual = new THREE.Box3().setFromObject(e.root), collider = solid.find(s => s.root === e.root)?.box;
      return e.root.visible && !!collider && visual.min.distanceTo(collider.min) < .001 && visual.max.distanceTo(collider.max) < .001;
    }));
    assert(bounds.every(Boolean));
    assert.equal(await debugPage.evaluate(() => helpers.length === solid.length), true);
    await debugPage.screenshot({ path: join(root, 'artifacts/debug-crates.png') });
    await debugPage.keyboard.down('w'); await advance(debugPage, .2); await debugPage.keyboard.up('w'); await advance(debugPage, .15);
    assert.notEqual(await debugPage.locator('#debug').textContent(), label);
    // 木箱始终是实体, 从箱内退出调试时必须返回安全出生点.
    await debugPage.evaluate(() => { player.position.set(-4, .5, 17); }); await debugPage.keyboard.press('b');
    assert.equal(await debugPage.evaluate(() => entries.filter(e => e.data.model === 'crate').every(e => e.root.visible) && solid.filter(s => s.id.startsWith('crate-')).length === 4), true);
    assert.equal(await debugPage.evaluate(() => player.position.x), 0);
    assert.equal(await debugPage.locator('#debug').isVisible(), false);
    await debugPage.keyboard.press('b'); await debugPage.keyboard.press('b'); await debugPage.keyboard.press('b');
    assert.equal(await debugPage.evaluate(() => solid.filter(s => s.id.startsWith('crate-')).length), 4);
    assert.deepEqual(await debugPage.evaluate(() => FPS.inspect().failures), []);
  });
  await debugPage.close();
  await check('missing crate module preserves flight and creates no invisible collision', () => fixture('crate-missing', d => rm(join(d, 'models/crate.js')), async p => {
    await start(p); await p.keyboard.press('b'); await advance(p, .2);
    assert.equal(await p.evaluate(() => player.debug && !solid.some(s => s.id.startsWith('crate-'))), true);
    assert((await p.locator('#fault-list').textContent()).includes('crate.js'));
  }));
  await check('missing model reports error, skips its collisions and keeps running', () => fixture('missing', d => rm(join(d, 'models/container.js')), async p => {
    assert((await p.locator('#fault-list').textContent()).includes('container.js'));
    assert.equal(await p.evaluate(() => FPS.inspect().solid.some(s => s.id.startsWith('cargo'))), false);
    await start(p); await advance(p, .2);
  }));
  await check('missing weapon and effect files preserve player shooting', () => fixture('optional', async d => {
    for (const file of ['rifle.js', 'flash.js', 'tracer.js']) await rm(join(d, 'models', file));
  }, async p => {
    await start(p); await p.mouse.down(); await p.mouse.up(); await advance(p, .15);
    assert.equal(await p.evaluate(() => FPS.inspect().ammo), 29);
    assert((await p.locator('#fault-list').textContent()).includes('rifle.js'));
  }));
  await check('model syntax error cannot break the main program', () => fixture('syntax', d => writeFile(join(d, 'models/enemy.js'), 'FPS.models.enemy = (;'), async p => {
    assert.equal(await p.evaluate(() => FPS.inspect().total), 0);
    assert((await p.locator('#fault-list').textContent()).includes('enemy'));
    await start(p); await advance(p, .2);
  }));
  await check('factory exception skips only affected instances', () => fixture('factory', d => writeFile(join(d, 'models/barrier.js'), "FPS.models.barrier = () => { throw Error('injected factory fault'); };"), async p => {
    assert((await p.locator('#fault-list').textContent()).includes('injected factory fault'));
    assert.equal(await p.evaluate(() => FPS.inspect().solid.filter(s => s.id.startsWith('cover')).length), 0);
    await start(p); await advance(p, .2);
  }));
  await check('update exception disables the failing actor and preserves the loop', () => fixture('update', d => corrupt(d, 'models/enemy.js', s => s.replace('update(dt, api) {', "update(dt, api) { throw Error('injected update fault');")), async p => {
    await start(p); await advance(p, .3);
    assert((await p.locator('#fault-list').textContent()).includes('injected update fault'));
    assert.equal(await p.evaluate(() => FPS.inspect().actors.every(a => a.disabled)), true);
  }));
  await check('missing layout degrades to gravity-free empty scene', () => fixture('layout-missing', d => rm(join(d, 'scene-layout.js')), async p => {
    assert.equal(await p.evaluate(() => FPS.inspect().player.debug), true); await start(p); await advance(p, .2);
  }));
  await check('invalid layout item does not stop valid items', () => fixture('layout-invalid', d => corrupt(d, 'scene-layout.js', s => s.replace("position: [-9, 0, 1]", "position: [NaN, 0, 1]")), async p => {
    assert((await p.locator('#fault-list').textContent()).includes('cargo-left'));
    assert.equal(await p.evaluate(() => FPS.inspect().total), 6); await start(p); await advance(p, .2);
  }));
  await check('missing renderer keeps an actionable error interface', () => fixture('engine', d => rm(join(d, 'vendor/three.min.js')), async p => {
    await p.waitForFunction(() => document.querySelector('#start-label').textContent.includes('不可用'));
    assert(await p.locator('#faults').isVisible()); assert(await p.locator('#faults button').isEnabled());
  }, true));
  console.log(`\n${checks} checks passed. All pages used offline file://.`);
} finally { await browser.close(); await rm(temp, { recursive: true, force: true }); }
