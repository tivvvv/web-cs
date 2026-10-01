// 立面回归: 新窗/雨檐/管线有实体支撑, 售货机绕行/命中正确, 静态细节保持合批.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true });
const page = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 } }), errors = [], network = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
try {
  await page.goto(pathToFileURL(process.cwd() + '/index.html').href);
  await page.waitForFunction(() => FPS?.inspect?.().ready, {}, { timeout: 60000 });
  await page.click('#start'); await page.evaluate(() => { toggleEnemies(); mode = 'paused'; });
  const result = await page.evaluate(() => {
    const targets = entries.filter(e => /^(coastal-home-\d+|station-shop-\d+|street-vending-\d+|station-vending-machine)$/.test(e.id));
    const ray = new THREE.Raycaster(), meshes = [], samples = [], bounds = [], labels = [], finishes = [];
    function supported(e, point) { return solid.some(s => s.id === e.id && s.box.clone().expandByScalar(.002).containsPoint(point)); }
    function probe(e, face, offset, glass = false) {
      const c = Math.cos(face.yaw), s = Math.sin(face.yaw), p = face.position;
      const point = e.root.localToWorld(new THREE.Vector3(p[0] + offset[0] * c + offset[2] * s, p[1] + offset[1], p[2] - offset[0] * s + offset[2] * c));
      const normal = new THREE.Vector3(s, 0, c).transformDirection(e.root.matrixWorld);
      ray.set(point.clone().addScaledVector(normal, 1), normal.clone().negate());
      const hit = ray.intersectObject(e.root, true)[0];
      let roughness;
      if (glass && hit?.uv) {
        const m = hit.object.material, map = m.roughnessMap, c = map?.image;
        if (c?.getContext) {
          const x = Math.min(c.width - 1, Math.floor(hit.uv.x * c.width)), y = Math.min(c.height - 1, Math.floor((map.flipY ? 1 - hit.uv.y : hit.uv.y) * c.height));
          roughness = c.getContext('2d').getImageData(x, y, 1, 1).data[1] / 255 * m.roughness;
        }
      }
      samples.push({ id: e.id, hit: !!hit, projection: hit ? hit.point.clone().sub(point).dot(normal) : null, supported: hit ? supported(e, hit.point) : false, glass, roughness });
    }
    for (const e of targets) {
      let count = 0, valid = true;
      e.root.traverse(n => { if (n.isMesh) { count++; valid &&= Object.values(n.geometry.attributes).every(a => a.array.every(Number.isFinite)); } });
      meshes.push({ id: e.id, count, limit: /^coastal-home/.test(e.id) ? 1 : 2, valid, static: !e.update });
      if (/^coastal-home|^station-shop/.test(e.id)) {
        const m = e.root.children[0].material, c = m.roughnessMap?.image;
        const pixels = c?.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let min = 1, max = 0, metal = 0;
        if (pixels) for (let i = 0; i < pixels.length; i += 4) { min = Math.min(min, pixels[i + 1] / 255); max = Math.max(max, pixels[i + 1] / 255); metal = Math.max(metal, pixels[i + 2] / 255); }
        finishes.push({ id: e.id, model: e.data.model, mapped: !!c && m.bumpMap === m.roughnessMap && m.metalnessMap === m.roughnessMap, color: m.map?.uuid, finish: m.roughnessMap?.uuid, min, max, metal });
      }
      const visual = new THREE.Box3().setFromObject(e.root), collision = new THREE.Box3();
      solid.filter(s => s.id === e.id).forEach(s => collision.union(s.box));
      bounds.push({ id: e.id, covered: collision.clone().expandByScalar(.003).containsBox(visual), visual: [visual.min.toArray(), visual.max.toArray()], collision: [collision.min.toArray(), collision.max.toArray()] });
      for (const f of e.data.options.windows || []) {
        // 避开中央分格, 探测玻璃与上方凸出的雨檐, 使用场景共享的尺寸/朝向.
        probe(e, f, [f.width * .22, f.height * .1, 0], true);
        if (f.hoodDepth) probe(e, f, [0, f.height / 2 + .08, 0]);
      }
      for (const p of e.data.options.pipes || []) {
        const point = e.root.localToWorld(new THREE.Vector3(...p.position));
        const normal = new THREE.Vector3(0, 0, -1).transformDirection(e.root.matrixWorld);
        ray.set(point.clone().addScaledVector(normal, 1), normal.clone().negate());
        const hit = ray.intersectObject(e.root, true)[0];
        samples.push({ id: e.id, hit: !!hit, projection: hit ? hit.point.clone().sub(point).dot(normal) : null, supported: hit ? supported(e, hit.point) : false });
      }
      if (/vending/.test(e.id)) {
        const point = e.root.localToWorld(new THREE.Vector3(0, 1.42, -.375)), normal = new THREE.Vector3(0, 0, -1).transformDirection(e.root.matrixWorld);
        ray.set(point.clone().addScaledVector(normal, 1), normal.clone().negate());
        const hits = ray.intersectObject(e.root, true);
        labels.push({ id: e.id, solidHit: hits[0]?.object === e.root.children[0], supported: hits[0] ? supported(e, hits[0].point) : false });
      }
    }
    function walk(id, points) {
      const e = entries.find(e => e.id === id), path = points.map(([x, z]) => e.root.localToWorld(new THREE.Vector3(x, 0, z)));
      player.debug = false; player.position.copy(path[0]); player.body.vy = 0; player.body.grounded = true;
      player.position.y = Math.max(e.root.position.y, ...solid.filter(s => s.box.max.y < e.root.position.y + .2 && footprint(player.position, player.body.radius, s.box)).map(s => s.box.max.y));
      for (const point of path.slice(1)) {
        const dx = point.x - player.position.x, dz = point.z - player.position.z, steps = Math.ceil(Math.hypot(dx, dz) / .08);
        for (let i = 0; i < steps; i++) { move(player, dx / steps, dz / steps); fall(player.body, 1 / 60); }
        if (Math.hypot(point.x - player.position.x, point.z - player.position.z) > .12) return { id, ok: false, position: player.position.toArray(), target: point.toArray() };
      }
      return { id, ok: true };
    }
    const walks = ['coastal-home-0', 'coastal-home-1', 'coastal-home-2'].map(id => walk(id, [[-4.2, 3.5], [-4.2, -4.2], [4.2, -4.2], [4.2, 3.5]]));
    walks.push(walk('street-vending-0', [[0, 1], [.91, 1], [.91, -.81], [-.91, -.81], [-.91, 1], [0, 1]]));
    return { meshes, samples, bounds, labels, walks, finishes, failures: FPS.inspect().failures };
  });
  for (const m of result.meshes) { assert(m.count <= m.limit, `立面细节未合批: ${m.id}`); assert(m.valid, `非有限几何: ${m.id}`); assert(m.static, `静态立面不应增加更新: ${m.id}`); }
  for (const s of result.samples) { assert(s.hit && s.projection > .01, `立面细节缺失: ${JSON.stringify(s)}`); assert(s.supported, `细节伸出碰撞: ${JSON.stringify(s)}`); }
  for (const s of result.samples.filter(s => s.glass)) assert(s.roughness < .42, `窗面应区别于粗糙墙体: ${JSON.stringify(s)}`);
  for (const f of result.finishes) {
    assert(f.mapped && f.min <= .2 && f.max >= .88 && f.metal >= .6, `材质区分缺失: ${f.id}`);
    const peers = result.finishes.filter(p => p.model === f.model);
    assert(peers.every(p => p.color === f.color && p.finish === f.finish), `相同模型应复用材质图集: ${f.model}`);
  }
  for (const b of result.bounds) assert(b.covered, `模型总体超出碰撞范围: ${JSON.stringify(b)}`);
  for (const l of result.labels) assert(l.solidHit && l.supported, `检修标识不能产生悬空弹痕: ${l.id}`);
  for (const w of result.walks) assert(w.ok, `侧背面绕行阻塞: ${JSON.stringify(w)}`);
  assert.equal(result.meshes.length, 17); assert(result.samples.length > 100);
  assert.deepEqual(result.failures, []); assert.deepEqual(errors, []); assert.deepEqual(network, []);
  console.log('PASS 12 栋住宅/2 间商亭/3 台售货机离线接入与合批, 窗框/雨檐/落水管实体与碰撞匹配, 三类住宅侧背面与售货机绕行, 背板命中忽略标签, 几何有限值.');
} finally { await browser.close(); }
