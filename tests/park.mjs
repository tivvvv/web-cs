// 公园手动集成检查: 离线接入, 连通路径, 地形支撑, 观景台与湖岸阻挡. 获授权后执行.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true
});
const context = await browser.newContext({ offline: true, viewport: { width: 1280, height: 800 } });
const page = await context.newPage(), errors = [], network = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
try {
  await page.goto(pathToFileURL(process.cwd() + '/index.html').href);
  await page.waitForFunction(() => window.FPS?.inspect?.().ready, {}, { timeout: 60000 });
  const initial = await page.evaluate(() => {
    const s = FPS.inspect();
    return { failures: s.failures, enemies: s.total, trees: s.entries.filter(e => /^park-tree-\d+$/.test(e.id)).length, models: ['parkTerrain', 'parkTrailStones', 'parkGroundcover', 'parkReeds', 'parkViewingDeck', 'parkTree', 'parkFerns', 'parkBamboo', 'parkGardenWall', 'dryGardenCourt'].every(n => typeof FPS.models[n] === 'function') };
  });
  assert.deepEqual(initial.failures, []); assert.equal(initial.enemies, 4); assert.equal(initial.trees, 45); assert(initial.models);
  await page.click('#start'); await page.evaluate(() => { toggleEnemies(); mode = 'paused'; });
  const walks = await page.evaluate(() => {
    const ground = entries.find(e => e.id === 'northwest-park-ground');
    function walk(points) {
      player.debug = false; player.position.set(points[0][0], 2.4, points[0][1]); player.body.vy = 0; player.body.grounded = true;
      // 从实际支撑顶面开始, 避免把玩家直接传送进桥头或观景台的薄地板.
      player.position.y = Math.max(2.4, ...solid.filter(s => s.box.max.y < 3.2 && footprint(player.position, player.body.radius, s.box)).map(s => s.box.max.y));
      let maxHeight = player.position.y;
      for (let j = 1; j < points.length; j++) {
        const [x, z] = points[j], dx = x - player.position.x, dz = z - player.position.z, n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .08));
        for (let i = 0; i < n; i++) { move(player, dx / n, dz / n); fall(player.body, 1 / 60); maxHeight = Math.max(maxHeight, player.position.y); }
        if (Math.hypot(x - player.position.x, z - player.position.z) > .12) return { ok: false, target: [x, z], position: player.position.toArray() };
      }
      return { ok: true, position: player.position.toArray(), maxHeight };
    }
    const trails = ground.data.options.trails.map(t => walk(t.points));
    const bridge = walk(Array.from({ length: 91 }, (_, i) => [3 + i * .5, 123]));
    const deck = walk(Array.from({ length: 61 }, (_, i) => [46.5, 108 + i * .2]));
    const hill = walk(Array.from({ length: 81 }, (_, i) => [-25 + i * .125, 132]));
    const northShore = walk(Array.from({ length: 89 }, (_, i) => [4 + i * .5, 146.1]));
    const eastShore = walk(Array.from({ length: 93 }, (_, i) => [46.7, 100 + i * .5]));
    const shrineSteps = walk([[0, 78.5], [0, 127.1], [0, 128.6]]);
    const basinLoop = walk([[-21.7, 102.95], [-21.7, 107.5], [-16.3, 107.5], [-16.3, 102.95], [-21.7, 102.95]]);
    const gardenGate = walk([[-19, 101.3], [-19, 102.85], [-19, 103.2]]);
    const westBoundary = walk(Array.from({ length: 137 }, (_, i) => [-48.4, 84 + i * .5]));
    const northBoundary = walk(Array.from({ length: 191 }, (_, i) => [-47.5 + i * .5, 152.65]));
    return { trails, bridge, deck, hill, northShore, eastShore, shrineSteps, basinLoop, gardenGate, westBoundary, northBoundary };
  });
  walks.trails.forEach((r, i) => assert(r.ok, `园路 ${i}: ${JSON.stringify(r)}`));
  for (const key of ['bridge', 'deck', 'hill', 'northShore', 'eastShore', 'shrineSteps', 'basinLoop', 'gardenGate', 'westBoundary', 'northBoundary']) assert(walks[key].ok, `${key}: ${JSON.stringify(walks[key])}`);
  assert(walks.hill.maxHeight > 2.8, '缓丘应提供升高支撑');
  const safety = await page.evaluate(() => {
    player.position.set(46, 2.4, 130); player.body.grounded = true; player.body.vy = 0;
    for (let i = 0; i < 120; i++) { move(player, -.1, 0); fall(player.body, 1 / 60); }
    const lakeStopped = player.position.x > 41;
    player.position.set(46.5, 2.54, 114); player.body.grounded = true; player.body.vy = 0;
    for (let i = 0; i < 120; i++) { move(player, -.1, 0); fall(player.body, 1 / 60); }
    const deckStopped = player.position.x > 42.7 && Math.abs(player.position.y - 2.54) < .001;
    const cells = entries.find(e => e.id === 'park-soft-landforms').data.options.cells;
    const terrain = entries.find(e => e.id === 'park-soft-landforms');
    const visual = new THREE.Box3().setFromObject(terrain.root), collider = new THREE.Box3();
    solid.filter(s => s.id === terrain.id).forEach(s => collider.union(s.box));
    const matching = visual.min.distanceTo(collider.min) < .001 && visual.max.distanceTo(collider.max) < .001;
    const valid = cells.every(c => c.size.every(v => Number.isFinite(v) && v > 0));
    const treesSupported = entries.filter(e => /^park-tree-\d+$/.test(e.id)).every(e => {
      const p = e.root.position, bottom = e.id === 'park-tree-15' ? p.y - .08 : p.y;
      const tops = solid.filter(s => s.id === 'park-soft-landforms' && footprint(p, .001, s.box)).map(s => s.box.max.y);
      return Math.abs(bottom - Math.max(2.424, ...tops)) < .001;
    });
    const fern = entries.find(e => e.id === 'park-fern-understorey'), plants = fern.root.children[0], matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    const fernRoots = Array.from({ length: plants.count }, (_, i) => {
      plants.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix);
      const cell = cells.find(({ size: s, offset: p }) => Math.abs(position.x - p[0]) <= s[0] / 2 && Math.abs(position.z - p[2]) <= s[2] / 2);
      if (!cell) return Math.abs(position.y - .024) < .001;
      const u = (position.x - cell.offset[0]) / cell.size[0] + .5, v = (position.z - cell.offset[2]) / cell.size[2] + .5, [a, b, d, e] = cell.surface;
      const y = u + v <= 1 ? a + (b - a) * u + (d - a) * v : e + (d - e) * (1 - u) + (b - e) * (1 - v);
      return Math.abs(position.y - y) < .001;
    });
    const fernsSupported = plants.count > 200 && fernRoots.every(Boolean);
    const basin = entries.find(e => e.id === 'park-temizuya'), count = basin.root.children.length, rings = basin.root.children.filter(n => n.geometry.type === 'RingGeometry');
    const before = rings.map(n => n.scale.x);
    for (let i = 0; i < 50; i++) basin.update(.016, api);
    const basinAnimation = basin.root.children.length === count && rings.length === 2 && rings.some((n, i) => n.scale.x !== before[i]) && rings.every(n => n.scale.x >= 1 && n.scale.x <= 4 && n.material.opacity >= 0 && n.material.opacity <= .24);
    const bank = entries.find(e => e.id === 'park-bank-groundcover'), grass = bank.root.children[0], water = entries.find(e => e.id === 'park-pond').root.children.find(n => n.material?.transparent);
    const waterBox = new THREE.Box3().setFromObject(water), ray = new THREE.Raycaster();
    let bankClear = grass.count > 100;
    for (let i = 0; i < grass.count; i++) {
      grass.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix).add(bank.root.position);
      ray.set(new THREE.Vector3(position.x, waterBox.max.y + 1, position.z), new THREE.Vector3(0, -1, 0));
      if (ray.intersectObject(water).length || position.z > 120.4 && position.z < 125.6) bankClear = false;
    }
    let nonfinite = 0;
    scene.traverse(n => { if (n.isMesh && Object.values(n.geometry.attributes).some(a => !a.array.every(Number.isFinite))) nonfinite++; });
    return { lakeStopped, deckStopped, matching, valid, treesSupported, fernsSupported, basinAnimation, bankClear, nonfinite, failures: FPS.inspect().failures };
  });
  for (const key of ['lakeStopped', 'deckStopped', 'matching', 'valid', 'treesSupported', 'fernsSupported', 'basinAnimation', 'bankClear']) assert(safety[key], key);
  assert.equal(safety.nonfinite, 0); assert.deepEqual(safety.failures, []); assert.deepEqual(errors, []); assert.deepEqual(network, []);
  console.log('PASS 公园离线接入, 6 条园路, 石桥, 缓丘, 观景台, 湖岸/沿墙环路, 参道台阶, 枯山水观景铺地/园墙入口, 手水舍绕行与动画, 岸草避水/桥口, 湖岸阻挡, 地形/植被支撑, 网格属性有限值.');
} finally { await browser.close(); }
