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
    const bridgePaths = [-.75, 0, .75].flatMap(side => [
      Array.from({ length: 91 }, (_, i) => [3 + i * .5, 123 + side]),
      Array.from({ length: 91 }, (_, i) => [48 - i * .5, 123 + side])
    ]);
    const bridge = bridgePaths.map(walk);
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
  walks.bridge.forEach((r, i) => assert(r.ok, `桥面双向通行 ${i}: ${JSON.stringify(r)}`));
  for (const key of ['deck', 'hill', 'northShore', 'eastShore', 'shrineSteps', 'basinLoop', 'gardenGate', 'westBoundary', 'northBoundary']) assert(walks[key].ok, `${key}: ${JSON.stringify(walks[key])}`);
  assert(walks.hill.maxHeight > 2.8, '缓丘应提供升高支撑');
  const bridgeSupport = await page.evaluate(() => {
    const e = entries.find(e => e.id === 'park-lake-bridge'), deck = e.data.options.deck;
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), heights = [];
    for (const step of deck) {
      const point = e.root.position.clone().add(new THREE.Vector3(...step.offset)), expected = point.y + step.size[1] / 2;
      ray.set(new THREE.Vector3(point.x, expected + 10, point.z), down);
      const visual = ray.intersectObject(e.root, true)[0]?.point.y;
      const collision = Math.max(...solid.filter(s => s.id === e.id && footprint(point, .001, s.box)).map(s => s.box.max.y));
      heights.push({ expected, visual, collision });
    }
    return { heights, stepLimit: STEP_HEIGHT, maxRiser: Math.max(...heights.slice(1).map((h, i) => Math.abs(h.expected - heights[i].expected))) };
  });
  assert(bridgeSupport.maxRiser <= bridgeSupport.stepLimit, '桥面级差不能超过自动登阶高度');
  bridgeSupport.heights.forEach(h => {
    assert(Math.abs(h.visual - h.expected) < .001, '桥面造型应与踏步配置一致');
    assert(Math.abs(h.collision - h.visual) < .001, '合并桥面/拱腹碰撞后, 支撑顶面应与造型一致');
  });
  const bamboo = await page.evaluate(() => {
    const e = entries.find(e => e.id === 'park-bamboo-groves'), culms = e.data.options.culms, boxes = solid.filter(s => s.id === e.id);
    const ray = new THREE.Raycaster(), offsets = [], stops = [], stopDetails = [], faceMatches = [];
    for (const c of culms) {
      const y = 1, t = y / c.height, x = c.foot[0] + c.lean[0] * t, z = c.foot[2] + c.lean[1] * t;
      ray.set(new THREE.Vector3(x - .2, e.root.position.y + c.foot[1] + y, z), new THREE.Vector3(1, 0, 0));
      const hit = ray.intersectObject(e.root, true)[0]; offsets.push(hit ? Math.abs(hit.point.x - x) : Infinity);
      if (hit) {
        const index = hit.object.geometry.index, i = hit.faceIndex * 3;
        faceMatches.push(index.getX(i) === hit.face.a && index.getX(i + 1) === hit.face.b && index.getX(i + 2) === hit.face.c);
      }
    }
    let area = 0, fullArea = 0, openCorners = 0;
    for (let i = 0; i < boxes.length; i += 3) {
      const group = boxes.slice(i, i + 3), bounds = new THREE.Box3(); group.forEach(s => bounds.union(s.box));
      area += group.reduce((sum, s) => sum + (s.box.max.x - s.box.min.x) * (s.box.max.z - s.box.min.z), 0);
      const members = culms.filter(c => bounds.clone().expandByScalar(.001).containsPoint(new THREE.Vector3(c.foot[0], e.root.position.y + c.foot[1], c.foot[2]))), full = new THREE.Box3();
      for (const c of members) for (const t of [0, 1]) {
        const p = new THREE.Vector3(c.foot[0] + c.lean[0] * t, e.root.position.y + c.foot[1] + c.height * t, c.foot[2] + c.lean[1] * t);
        const r = new THREE.Vector3(c.radius * 1.2, 0, c.radius * 1.2); full.expandByPoint(p.clone().sub(r)); full.expandByPoint(p.clone().add(r));
      }
      fullArea += (full.max.x - full.min.x) * (full.max.z - full.min.z);
      for (const axis of ['x', 'z']) for (const side of [-1, 1]) {
        const center = bounds.getCenter(new THREE.Vector3()), start = center.clone(); start.y = bounds.min.y;
        start[axis] = (side > 0 ? bounds.max[axis] : bounds.min[axis]) + side * .5;
        // 北侧靠近低花坛, 从实际支撑面开始, 避免将玩家脚底直接放进花坛.
        start.y = Math.max(start.y, ...solid.filter(s => s.root !== e.root && s.box.max.y <= start.y + STEP_HEIGHT && footprint(start, player.body.radius, s.box)).map(s => s.box.max.y));
        player.position.copy(start); player.body.vy = 0; player.body.grounded = true; player.debug = false;
        const distance = bounds.max[axis] - bounds.min[axis] + 1, moved = move(player, axis === 'x' ? -side * distance : 0, axis === 'z' ? -side * distance : 0);
        stops.push(moved > .08 && side * (player.position[axis] - center[axis]) > .3 && group.some(s => footprint(player.position, .34, s.box)));
        stopDetails.push({ cluster: i / 3, axis, side, moved, position: player.position.toArray(), center: center.toArray(), touching: group.some(s => footprint(player.position, .34, s.box)) });
      }
      for (const x of [full.min.x + .12, full.max.x - .12]) for (const z of [full.min.z + .12, full.max.z - .12]) {
        const p = new THREE.Vector3(x, bounds.min.y, z);
        if (blockedAt(p, player.body.radius, player.body.height, [])) continue;
        player.position.copy(p); const moved = move(player, .06, 0);
        if (moved > .055) openCorners++;
      }
    }
    const covered = culms.every(c => [0, 2.8 / c.height].every(t => boxes.some(({ box }) => box.clone().expandByScalar(.001).containsPoint(new THREE.Vector3(c.foot[0] + c.lean[0] * t, e.root.position.y + c.foot[1] + c.height * t, c.foot[2] + c.lean[1] * t)))));
    // 共用实体盒不参与射击, 簇内空隙仍可透过; 命中点继续贴合真实竹竿.
    let gaps = 0;
    for (const { box } of boxes) {
      const center = box.getCenter(new THREE.Vector3()); center.y = box.min.y + .6;
      for (let i = 0; i < 20; i++) {
        const p = center.clone(); p.x += (i % 5 - 2) * .15; p.z += (Math.floor(i / 5) - 1.5) * .15;
        const clear = culms.every(c => { const t = (p.y - e.root.position.y - c.foot[1]) / c.height; return Math.hypot(p.x - c.foot[0] - c.lean[0] * t, p.z - c.foot[2] - c.lean[1] * t) > .2; });
        if (!clear) continue;
        ray.set(p, new THREE.Vector3(1, 0, 0)); ray.near = .001; ray.far = .08;
        if (!ray.intersectObject(e.root, true).length) gaps++;
      }
    }
    const original = { position: e.root.position.clone(), quaternion: e.root.quaternion.clone(), scale: e.root.scale.clone() }, transformed = [];
    try {
      e.root.position.set(2, 3, -4); e.root.rotation.set(.12, .43, -.08); e.root.scale.set(1.3, .8, .9); e.root.updateWorldMatrix(true, true);
      const mesh = e.root.children[0]; ray.near = .001; ray.far = 2;
      for (const i of [0, 16, 38, 72]) for (const angle of [0, 1.1, 2.4]) {
        const c = culms[i], t = 1 / c.height, center = new THREE.Vector3(c.foot[0] + c.lean[0] * t, c.foot[1] + 1, c.foot[2] + c.lean[1] * t);
        const from = e.root.localToWorld(center.clone().add(new THREE.Vector3(Math.cos(angle) * .3, 0, Math.sin(angle) * .3))), to = e.root.localToWorld(center.clone());
        ray.set(from, to.sub(from).normalize()); const actual = [], expected = [];
        mesh.raycast(ray, actual); THREE.Mesh.prototype.raycast.call(mesh, ray, expected);
        actual.sort((a, b) => a.distance - b.distance); expected.sort((a, b) => a.distance - b.distance);
        transformed.push(!!actual[0] && !!expected[0] && actual[0].point.distanceTo(expected[0].point) < .00001 && actual[0].faceIndex === expected[0].faceIndex && actual[0].face.normal.distanceTo(expected[0].face.normal) < .00001);
      }
    } finally {
      e.root.position.copy(original.position); e.root.quaternion.copy(original.quaternion); e.root.scale.copy(original.scale); e.root.updateWorldMatrix(true, true);
    }
    return { count: culms.length, boxes: boxes.length, covered, matched: offsets.every(d => d > .02 && d < .08), faceMatches, stops, stopDetails, gaps, transformed, areaReduction: 1 - area / fullArea, openCorners, heights: boxes.map(s => s.box.max.y - s.box.min.y) };
  });
  assert.equal(bamboo.count, 73); assert.equal(bamboo.boxes, 15); assert(bamboo.covered && bamboo.matched, '5 簇分带实体盒应覆盖人物可接触的竿身, 射击仍精确命中竿面');
  assert(bamboo.stops.length === 20 && bamboo.stops.every(Boolean), `竹簇四向应阻挡实际移动: ${JSON.stringify(bamboo.stopDetails.filter((_, i) => !bamboo.stops[i]))}`);
  assert(bamboo.areaReduction > .25 && bamboo.openCorners >= 5, '碰撞占地应收紧至少四分之一, 原矩形角落应能正常移动');
  assert(bamboo.heights.every(h => Math.abs(h - 3) < .001), '竹梢不应扩张下部实体范围, 3 米竿身仍覆盖正常跳跃时的身体');
  assert(bamboo.faceMatches.length === 73 && bamboo.faceMatches.every(Boolean), '竹竿命中的对象/面编号应指向可见网格, 保持弹痕法线正确');
  assert(bamboo.gaps > 10, '共用实体盒不能成为簇内空隙的虚假射击遮挡');
  assert(bamboo.transformed.every(Boolean), '旋转/非均匀缩放后, 竹竿命中点/面编号/法线应与原生射线一致');
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
  console.log('PASS 公园离线接入, 6 条园路, 石桥中间/两侧双向通行与踏面支撑一致, 缓丘, 观景台, 湖岸/沿墙环路, 参道台阶, 枯山水观景铺地/园墙入口, 手水舍绕行与动画, 岸草避水/桥口, 湖岸阻挡, 73 根竹竿精确射击/面编号与 5 簇分带碰撞收紧/四向阻挡/角落通行/空隙可透过, 地形/植被支撑, 网格属性有限值.');
} finally { await browser.close(); }
