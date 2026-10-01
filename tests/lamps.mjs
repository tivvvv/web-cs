// 可破坏灯泡集成检查: 外壳保护, 四面拾取, 熄灭与残片, 重复命中及碎片生命周期.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true });
const page = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 } }), errors = [], network = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
try {
  await page.goto(pathToFileURL(process.cwd() + '/index.html').href);
  await page.waitForFunction(() => window.FPS?.inspect?.().ready, {}, { timeout: 60000 });
  const result = await page.evaluate(() => {
    renderer.setAnimationLoop(null); mode = 'paused';
    const clear = () => { effects.forEach(e => dispose(e.root)); effects.length = 0; };
    const shootLocal = (entry, from, to, team = 'player') => {
      scene.updateMatrixWorld(true);
      const start = entry.root.localToWorld(new T.Vector3(...from)), end = entry.root.localToWorld(new T.Vector3(...to)), direction = end.sub(start).normalize();
      const contact = new T.Raycaster(start, direction, .025, 100).intersectObject(entry.root, true)[0];
      const response = shoot(start, direction, team, 10);
      return { contact, response };
    };
    const openings = entry => {
      scene.updateMatrixWorld(true);
      return [[0, 1.69, -1], [0, 1.69, 1], [-1, 1.69, 0], [1, 1.69, 0]].map(p => {
        const from = entry.root.localToWorld(new T.Vector3(...p)), to = entry.root.localToWorld(new T.Vector3(0, 1.69, 0));
        return new T.Raycaster(from, to.sub(from).normalize(), .025, 2).intersectObject(entry.root, true)[0]?.object.name ?? null;
      });
    };
    const lamps = entries.filter(e => e.data.model === 'stoneLantern'), transformed = createInstance({
      id: 'lamp-transform-fixture', model: 'stoneLantern', position: [400, 3, 0], rotation: [.16, .71, -.1], scale: [1.3, .85, 1.1]
    });
    const records = [];
    for (const [i, entry] of [...lamps, transformed].entries()) {
      clear();
      const body = entry.root.getObjectByName('stone-lantern-body'), bulb = entry.root.getObjectByName('stone-lantern-bulb');
      const oldGeometry = bulb.geometry, bodyGeometry = body.geometry, material = bulb.material, color = material.color.getHex(), collisionCount = solid.length;
      let disposed = false; oldGeometry.addEventListener('dispose', () => { disposed = true; });
      const before = openings(entry), shell = shootLocal(entry, [.25, 1.685, -1], [.25, 1.685, -.25]);
      const shellSafe = shell.contact?.object === body && bulb.geometry === oldGeometry && material.color.getHex() === color && !effects.some(e => e.name === 'lampShards') && effects.some(e => e.name === 'bulletmark' && e.root.parent === body);
      clear();
      const from = [[0, 1.69, -1], [0, 1.69, 1], [-1, 1.69, 0], [1, 1.69, 0]][i % 4];
      const shot = shootLocal(entry, from, [0, 1.69, 0], i % 2 ? 'enemy' : 'player');
      const shard = effects.find(e => e.name === 'lampShards'), center = bulb.getWorldPosition(new T.Vector3());
      const after = openings(entry), broken = bulb.geometry !== oldGeometry && material.color.getHex() !== color;
      const markFree = !effects.some(e => e.name === 'bulletmark');
      // 实际再击中最高的残片, 检查幂等性, 避免只调用回调而漏掉拾取或弹痕问题.
      const p = bulb.geometry.attributes.position, indices = bulb.geometry.index; let face = 0, top = -Infinity;
      for (let j = 0; j < indices.count; j += 3) {
        const y = (p.getY(indices.getX(j)) + p.getY(indices.getX(j + 1)) + p.getY(indices.getX(j + 2))) / 3;
        if (y > top) { top = y; face = j; }
      }
      const a = new T.Vector3().fromBufferAttribute(p, indices.getX(face)), b = new T.Vector3().fromBufferAttribute(p, indices.getX(face + 1)), c = new T.Vector3().fromBufferAttribute(p, indices.getX(face + 2));
      const point = bulb.localToWorld(a.clone().add(b).add(c).divideScalar(3));
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize().transformDirection(bulb.matrixWorld.clone().invert().transpose());
      const repeatFrom = point.clone().addScaledVector(normal, .05), repeatRay = new T.Raycaster(repeatFrom, normal.clone().negate(), .025, 1);
      const repeatContact = repeatRay.intersectObject(entry.root, true)[0];
      shoot(repeatFrom, normal.clone().negate(), 'player', 10);
      records.push({ id: entry.id, shellSafe, before, after, hitBulb: shot.contact?.object === bulb && shot.response.hit,
        broken, disposed, markFree, shardPosition: shard?.root.position.distanceTo(center),
        repeatedShardCount: effects.filter(e => e.name === 'lampShards').length, repeatHit: repeatContact?.object === bulb,
        repeatMarkFree: !effects.some(e => e.name === 'bulletmark'), sameBody: body.geometry === bodyGeometry,
        sameMaterial: bulb.material === material, sameCollisions: solid.length === collisionCount, meshes: entry.root.children.length });
    }
    clear();
    const savedEffect = FPS.models.lampShards, removable = createInstance({ id: 'lamp-missing-effect', model: 'stoneLantern', position: [410, 3, 0] });
    const bulb = removable.root.getObjectByName('stone-lantern-bulb'), geometry = bulb.geometry;
    delete FPS.models.lampShards;
    try { shootLocal(removable, [0, 1.69, -1], [0, 1.69, 0]); } finally { FPS.models.lampShards = savedEffect; }
    const missingEffectSafe = bulb.geometry !== geometry && !removable.disabled;
    clear();
    for (let i = 0; i < 6; i++) {
      const entry = createInstance({ id: 'lamp-limit-' + i, model: 'stoneLantern', position: [430 + i * 4, 3, 0] });
      shootLocal(entry, [0, 1.69, -1], [0, 1.69, 0]);
    }
    const limit = effects.filter(e => e.name === 'lampShards').length; mode = 'menu';
    for (let i = 0; i < 60; i++) frame((last || performance.now()) + 16);
    return { records, missingEffectSafe, limit, expired: !effects.some(e => e.name === 'lampShards'), failures: FPS.inspect().failures };
  });
  assert.equal(result.records.length, 5);
  for (const r of result.records) {
    assert(r.shellSafe && r.sameBody && r.sameCollisions, `石壳应保留, 不误碎或改变身体碰撞: ${JSON.stringify(r)}`);
    assert(r.before.every(n => n === 'stone-lantern-bulb') && r.after.every(n => n === null), `四面应可击碎, 碎后开口真正镂空: ${JSON.stringify(r)}`);
    assert(r.hitBulb && r.broken && r.disposed && r.markFree && r.sameMaterial, `灯泡应熄灭, 释放旧几何并避免弹痕: ${JSON.stringify(r)}`);
    assert(r.shardPosition < .00001, `碎片应在灯泡的世界坐标生成: ${r.id}`);
    assert(r.repeatHit && r.repeatMarkFree && r.repeatedShardCount === 1, `重复打到残片不能再次爆碎或留弹痕: ${JSON.stringify(r)}`);
    assert.equal(r.meshes, 2, '破碎不增加常驻网格');
  }
  assert(result.missingEffectSafe && result.expired); assert.equal(result.limit, 4);
  assert.deepEqual(result.failures, []); assert.deepEqual(errors, []); assert.deepEqual(network, []);
  console.log('PASS 4 盏现场长明灯及旋转/非均匀缩放实例, 四面灯泡拾取与空洞, 双方射击, 石壳保护, 熄灭/残片重复命中, 旧几何释放, 缺失特效容错及碎片限额/消失, 离线无报错.');
} finally { await browser.close(); }
