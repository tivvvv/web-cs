// 转向回归: 入场后不再首次编译/上传静态资源, 湖面不可见时不绘制倒影, 主景石高度与碰撞一致.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true });
const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const page = await context.newPage(), errors = [], network = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
try {
  await page.goto(pathToFileURL(process.cwd() + '/index.html').href);
  await page.waitForFunction(() => window.FPS?.inspect?.().ready, {}, { timeout: 60000 });
  const result = await page.evaluate(async () => {
    mode = 'paused'; player.debug = true;
    await new Promise(requestAnimationFrame);
    const resources = () => [renderer.info.programs.length, renderer.info.memory.textures, renderer.info.memory.geometries];
    const initial = resources(), scans = [];
    for (const fallback of [false, true]) {
      entries.find(e => e.id === 'sun-rays').root.visible = !fallback;
      for (const position of [[.4, 4, 29], [0, 4, 116], [46.5, 4.16, 114]]) {
        camera.position.set(...position);
        for (let i = 0; i < 72; i++) {
          camera.rotation.set(.06, i * Math.PI * 2 / 72, 0, 'YXZ'); camera.updateMatrixWorld(true);
          await new Promise(requestAnimationFrame);
        }
        scans.push({ position, fallback, resources: resources() });
      }
    }
    entries.find(e => e.id === 'sun-rays').root.visible = true;
    const stone = entries.find(e => e.id === 'park-garden-stones'), p = stone.root.children[0].geometry.attributes.position;
    const count = p.count / stone.data.options.stones.length;
    const stones = stone.data.options.stones.map((s, index) => {
      const bounds = new THREE.Box3();
      for (let i = index * count; i < (index + 1) * count; i++) bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(p, i));
      return { top: bounds.max.y, expected: s[3], collision: stone.data.collision.boxes[index], min: bounds.min.toArray(), max: bounds.max.toArray() };
    });
    return { initial, scans, stones, failures: FPS.inspect().failures };
  });
  for (const scan of result.scans) assert.deepEqual(scan.resources, result.initial, `转向后新增资源: ${JSON.stringify(scan)}`);
  assert.equal(result.stones.length, 7);
  for (const stone of result.stones) {
    assert(Math.abs(stone.top - stone.expected) < .001); assert.equal(stone.collision.size[1], stone.expected);
    for (const axis of [0, 2]) {
      assert(stone.min[axis] >= stone.collision.offset[axis] - stone.collision.size[axis] / 2 - .001, '景石不能伸出碰撞盒');
      assert(stone.max[axis] <= stone.collision.offset[axis] + stone.collision.size[axis] / 2 + .001, '景石不能伸出碰撞盒');
    }
    assert(stone.min[1] < 0, '石根应埋入苔岛和砂面');
  }
  assert.equal(Math.max(...result.stones.map(s => s.expected)), 1.95);
  const garden = await page.evaluate(() => {
    const e = entries.find(e => e.id === 'park-dry-garden'), sand = e.root.getObjectByName('dry-garden-sand'), moss = e.root.getObjectByName('dry-garden-moss'), drainage = e.root.getObjectByName('dry-garden-drainage');
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
    const hits = (mesh, x, z) => { ray.set(new THREE.Vector3(x + e.root.position.x, e.root.position.y + 1, z + e.root.position.z), down); return ray.intersectObject(mesh); };
    return e.data.options.islands.map(([x, z, radius]) => ({
      sandUnderMoss: hits(sand, x, z).length, drainageUnderSand: hits(drainage, x, z).length,
      moundRise: hits(moss, x, z)[0]?.point.y - e.root.position.y - e.data.options.sandHeight,
      whiteSand: hits(sand, x + radius * 1.4, z).length > 0
    }));
  });
  for (const island of garden) {
    assert.equal(island.sandUnderMoss, 0, '苔岛下方不能叠加砂面'); assert.equal(island.drainageUnderSand, 0, '排水碎石只绘制露出的边带');
    assert(island.moundRise > .1 && island.moundRise < .18, '苔岛应有低矮起伏'); assert(island.whiteSand, '石组外保留白砂');
  }
  const reflection = await page.evaluate(async () => {
    const pond = entries.find(e => e.id === 'park-pond'), render = renderer.render; let calls = 0;
    renderer.render = function(s, c) { if (s === scene) calls++; return render.call(this, s, c); };
    try {
      camera.position.set(46.5, 4.16, 114); camera.lookAt(60, 12, 114); camera.updateMatrixWorld(true);
      // 游戏主循环仍在绘制, 暂停仅冻结模拟; 先让朝外的视角稳定下来.
      await new Promise(resolve => setTimeout(resolve, 50)); calls = 0;
      pond.beforeRender(renderer, scene, camera); const away = calls;
      camera.lookAt(25, 2.22, 123); camera.updateMatrixWorld(true); calls = 0;
      pond.beforeRender(renderer, scene, camera); pond.beforeRender(renderer, scene, camera); const visible = calls;
      camera.position.set(.4, 4, 29); camera.lookAt(25, 2.22, 123); camera.updateMatrixWorld(true); calls = 0;
      pond.beforeRender(renderer, scene, camera); const far = calls;
      return { away, visible, far, restored: renderer.getRenderTarget() === null && renderer.shadowMap.autoUpdate && pond.root.children.find(n => n.material?.transparent).visible };
    } finally { renderer.render = render; }
  });
  assert.equal(reflection.away, 0); assert.equal(reflection.visible, 1); assert.equal(reflection.far, 0); assert(reflection.restored);
  const stairs = await page.evaluate(() => {
    const terrace = entries.find(e => e.id === 'station-neighborhood'), { height, start, steps, tread } = terrace.data.options;
    const ray = new THREE.Raycaster(), heights = [];
    for (let i = 0; i < steps; i++) {
      const z = start - (steps - i - .5) * tread;
      ray.set(new THREE.Vector3(0, height + 1, z), new THREE.Vector3(0, -1, 0));
      heights.push({ actual: ray.intersectObject(terrace.root, true)[0]?.point.y, expected: height * (i + 1) / steps });
    }
    function walk(position, delta, count) {
      player.debug = false; player.position.set(...position); player.body.vy = 0; player.body.grounded = true;
      for (let i = 0; i < count; i++) { move(player, ...delta); fall(player.body, 1 / 60); }
      return player.position.toArray();
    }
    return { heights, terrace: walk([0, .078, 14], [0, .05], 180), platform: walk([-5.4, 0, 4.2], [-.05, 0], 80) };
  });
  for (const step of stairs.heights) assert(Math.abs(step.actual - step.expected) < .001, '倒角后踏面高度应与台阶碰撞一致');
  assert(stairs.terrace[2] > 22 && Math.abs(stairs.terrace[1] - 2.4) < .001, `车站入口台阶应能正常登阶: ${JSON.stringify(stairs.terrace)}`);
  assert(stairs.platform[0] < -9 && Math.abs(stairs.platform[1] - .68) < .001, `月台台阶应能正常登阶: ${JSON.stringify(stairs.platform)}`);
  const preparation = await page.evaluate(async () => {
    const gl = renderer.getContext(), wait = gl.clientWaitSync, mask = camera.layers.mask, target = renderer.getRenderTarget(), flags = [];
    scene.traverse(n => { if (n.isMesh || n.isLine) flags.push([n, n.frustumCulled]); });
    let rejected = false;
    // 模拟驱动等待失败, 准备过程应结束并恢复状态, 不能让入场按钮永久等待.
    gl.clientWaitSync = () => gl.WAIT_FAILED;
    try { await prepareScene(); } catch { rejected = true; }
    finally { gl.clientWaitSync = wait; }
    return { rejected, restored: camera.layers.mask === mask && renderer.getRenderTarget() === target && flags.every(([n, v]) => n.frustumCulled === v) };
  });
  assert(preparation.rejected && preparation.restored, 'GPU 等待失败后应退出准备并恢复渲染状态');
  assert.deepEqual(result.failures, []); assert.deepEqual(errors, []); assert.deepEqual(network, []);
  console.log('PASS 6 组全角度转向无新增着色器/纹理/几何上传, 普通渲染回退, 倒影视野剔除与限频/状态恢复, GPU 等待失败恢复, 台阶倒角顶面/入口及月台登阶, 7 块景石高度/埋根/碰撞包围, 苔岛起伏/砂面挖空/排水带无叠面.');
} finally { await browser.close(); }
