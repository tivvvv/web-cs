// 湖水回归: 实际倒影下走近/横移/微转向的明暗稳定, 反射同步与静止限频, 远景退场和水花接口.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true });
const page = await browser.newPage({ offline: true, viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1.5 }), errors = [], network = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
try {
  await page.goto(pathToFileURL(process.cwd() + '/index.html').href);
  await page.waitForFunction(() => FPS?.inspect?.().ready, {}, { timeout: 60000 });
  await page.click('#start');
  const result = await page.evaluate(async () => {
    toggleEnemies(); mode = 'paused'; weapon.root.visible = false;
    const pond = entries.find(e => e.id === 'park-pond'), water = pond.root.children.find(n => n.material?.transparent), post = entries.find(e => e.id === 'sun-rays');
    const canvas = document.createElement('canvas'); canvas.width = renderer.domElement.width; canvas.height = renderer.domElement.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }), saved = [], scans = [];
    const green = new THREE.MeshBasicMaterial({ color: 0x00ff00, toneMapped: false, fog: false }), red = new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false, fog: false });
    const points = []; for (let x = 16; x <= 36; x += 2) for (let z = 105; z <= 117; z += 2) points.push(new THREE.Vector3(x, 2.22, z));
    const pose = (path, i) => {
      camera.position.set(...(path === 'east' ? [46.5 - i * .008, 4.064, 112 + i * .012] : path === 'bridge' ? [25 + i * .014, 7.584, 122.25] : [4 + (path === 'turn' ? 0 : i * .012), 4.064, 112 + (path === 'turn' ? 0 : i * .005)]));
      camera.lookAt(25, 2.22, path === 'bridge' ? 109 : 112);
      if (path === 'turn') camera.rotation.y += Math.sin(i * .04) * .003;
      camera.updateMatrixWorld(true);
    };
    const pixelsAt = () => points.map(p => { const v = p.clone().project(camera); return [(v.x * .5 + .5) * canvas.width - .5, (.5 - v.y * .5) * canvas.height - .5]; });
    scene.traverse(n => { if (n.isMesh) saved.push([n, n.material]); });
    const now = performance.now; let stamp = now.call(performance) + 1000; performance.now = () => stamp;
    try {
      for (const path of ['west', 'east', 'bridge', 'turn']) {
        // 用真实深度遮挡预筛选, 排除桥栏/岸草/荷叶等直接遮住采样点的正常变化.
        saved.forEach(([n]) => n.material = n === water ? red : green); post.root.visible = false;
        const valid = points.map(() => true);
        for (let i = 0; i < 90; i++) {
          pose(path, i); renderer.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0);
          pixelsAt().forEach(([x, y], k) => {
            const ix = Math.round(x), iy = Math.round(y);
            if (ix < 2 || ix > canvas.width - 3 || iy < 2 || iy > canvas.height - 3) { valid[k] = false; return; }
            const pixel = ctx.getImageData(ix - 1, iy - 1, 3, 3).data;
            for (let j = 0; j < pixel.length; j += 4) if (pixel[j] < 240 || pixel[j + 1] > 10) valid[k] = false;
          });
          if (i % 15 === 0) await new Promise(requestAnimationFrame);
        }
        saved.forEach(([n, m]) => n.material = m);
        for (const fallback of [false, true]) {
          post.root.visible = !fallback; const frames = [];
          for (let i = 0; i < 90; i++) {
            stamp += 1000 / 60; pose(path, i); renderWorld(); ctx.drawImage(renderer.domElement, 0, 0);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const luminance = (x, y) => { const k = (y * canvas.width + x) * 4; return .2126 * image[k] + .7152 * image[k + 1] + .0722 * image[k + 2]; };
            frames.push(pixelsAt().map(([x, y], k) => {
              if (!valid[k]) return 0;
              const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
              return (luminance(ix, iy) * (1 - fx) + luminance(ix + 1, iy) * fx) * (1 - fy) + (luminance(ix, iy + 1) * (1 - fx) + luminance(ix + 1, iy + 1) * fx) * fy;
            }));
            if (i % 15 === 0) await new Promise(requestAnimationFrame);
          }
          const changes = frames.slice(1).flatMap((f, i) => f.flatMap((v, k) => valid[k] ? [Math.abs(v - frames[i][k])] : [])).sort((a, b) => a - b);
          scans.push({ path, fallback, points: valid.filter(Boolean).length, p95Step: changes[Math.floor(changes.length * .95)], maxStep: changes.at(-1) });
        }
      }
      post.root.visible = true;
      const original = renderer.render, calls = [];
      renderer.render = function(s, c) { if (s === scene && c !== camera) calls.push({ stamp, matrix: c.matrixWorld.clone(), target: this.getRenderTarget() }); return original.call(this, s, c); };
      let cadence;
      try {
        pose('west', 0); stamp += 100; pond.beforeRender(renderer, scene, camera); const target = calls.at(-1).target;
        const mipmapped = target.texture.generateMipmaps && target.texture.minFilter === THREE.LinearMipmapLinearFilter;
        calls.length = 0;
        for (let i = 1; i <= 12; i++) { pose('west', i); stamp += 1000 / 60; pond.beforeRender(renderer, scene, camera); }
        const moving = calls.length; calls.length = 0;
        for (let i = 0; i < 12; i++) { stamp += 1000 / 60; pond.beforeRender(renderer, scene, camera); }
        const still = calls.length; calls.length = 0;
        camera.fov += 1; camera.updateProjectionMatrix(); pond.beforeRender(renderer, scene, camera); const lens = calls.length;
        camera.fov -= 1; camera.updateProjectionMatrix();
        const uniforms = renderer.properties.get(water.material).uniforms, center = new THREE.Vector3(25, 2.22, 123);
        const fades = [59, 65, 70, 74, 76].map(d => { camera.position.copy(center).add(new THREE.Vector3(-d, 3, 0)); camera.lookAt(center); camera.updateMatrixWorld(true); stamp += 40; pond.beforeRender(renderer, scene, camera); return uniforms.lakeReflectionReady.value; });
        const scaleY = pond.root.scale.y, scaled = [];
        try {
          for (const scale of [3, .25]) {
            pond.root.scale.y = scale; pond.root.updateWorldMatrix(true, false);
            const surface = new THREE.Vector3(0, pond.data.options.waterLevel, 0).applyMatrix4(pond.root.matrixWorld);
            for (const above of [true, false]) {
              camera.position.copy(surface).add(new THREE.Vector3(0, above ? .09 : -.02, -8)); camera.lookAt(surface); camera.updateMatrixWorld(true);
              calls.length = 0; stamp += 40; pond.beforeRender(renderer, scene, camera);
              scaled.push({ scale, above, calls: calls.length, ready: uniforms.lakeReflectionReady.value });
            }
          }
        } finally { pond.root.scale.y = scaleY; pond.root.updateWorldMatrix(true, false); }
        cadence = { moving, still, lens, mipmapped, fades, scaled, restored: renderer.getRenderTarget() === null && renderer.shadowMap.autoUpdate && water.visible };
      } finally { renderer.render = original; }
      const hits = []; pond.onHit({ object: water, point: pond.root.localToWorld(new THREE.Vector3(2, -.18, -3)), direction: new THREE.Vector3(0, -1, 0) }, { effect: (name, options) => hits.push({ name, limit: options.limit }) });
      pond.update(1 / 60);
      return { scans, cadence, hits, failures: FPS.inspect().failures };
    } finally { performance.now = now; saved.forEach(([n, m]) => n.material = m); post.root.visible = true; green.dispose(); red.dispose(); }
  });
  await mkdir('artifacts', { recursive: true }); await writeFile('artifacts/pond-regression.json', JSON.stringify({ ...result, errors, network }, null, 2));
  for (const s of result.scans) {
    assert(s.points >= 10, `水面采样点不足: ${JSON.stringify(s)}`);
    assert(s.p95Step < 3.5 && s.maxStep < 12, `移动时倒影闪烁: ${JSON.stringify(s)}`);
  }
  assert.equal(result.cadence.moving, 12, '移动视角必须同步更新倒影'); assert(result.cadence.still > 0 && result.cadence.still <= 6, '静止视角应保持 30 Hz 上限');
  assert.equal(result.cadence.lens, 1, '改变视角范围后应立即更新倒影'); assert(result.cadence.mipmapped && result.cadence.restored);
  assert(result.cadence.fades[0] === 1 && result.cadence.fades.at(-1) === 0 && result.cadence.fades.every((v, i, a) => !i || v < a[i - 1]), '远处倒影应平滑淡出, 不保留旧画面');
  assert(result.cadence.scaled.every(s => s.calls === (s.above ? 1 : 0) && (s.above ? s.ready > 0 : s.ready === 0)), '缩放后的池塘应按实际水面高度启停倒影');
  assert.deepEqual(result.hits, [{ name: 'waterSplash', limit: 6 }]); assert.deepEqual(result.failures, []); assert.deepEqual(errors, []); assert.deepEqual(network, []);
  console.log('PASS 湖岸/桥上/微转向共 720 帧水面明暗稳定, 普通渲染回退, 移动同步/静止限频/镜头变化/远景淡出, 缩放后水面高度, 倒影 mipmap 与状态恢复, 中弹水花接口, 离线无报错.', JSON.stringify(result.scans));
} finally { await browser.close(); }
