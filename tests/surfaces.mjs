// 表面稳定性回归: 格门/牌匾深度遮挡, 以及实际接触阴影下走近和横移时的门面明暗波动.
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
    const shrine = entries.find(e => e.id === 'park-shrine'), torii = entries.find(e => e.id === 'park-torii');
    const triangles = [], p = shrine.root.children[0].geometry.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      const t = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, i + j));
      const normal = t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).normalize();
      if (normal.z < -.999 && t.every(v => Math.abs(v.x) < 4.3 && v.y > .7 && v.y < 3.5 && v.z > -3.1 && v.z < -2.92))
        triangles.push({ z: t[0].z, points: t.map(v => [v.x, v.y]) });
    }
    const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    function overlap(a, b) {
      let polygon = a, sign = Math.sign(cross(b[0], b[1], b[2]));
      for (let i = 0; i < 3 && polygon.length; i++) {
        const start = b[i], end = b[(i + 1) % 3], clipped = [];
        for (let j = 0; j < polygon.length; j++) {
          const prev = polygon[(j + polygon.length - 1) % polygon.length], current = polygon[j];
          const d0 = cross(start, end, prev) * sign, d1 = cross(start, end, current) * sign;
          if ((d0 >= 0) !== (d1 >= 0)) { const t = d0 / (d0 - d1); clipped.push(prev.map((v, axis) => v + (current[axis] - v) * t)); }
          if (d1 >= 0) clipped.push(current);
        }
        polygon = clipped;
      }
      return Math.abs(polygon.reduce((sum, v, i) => { const next = polygon[(i + 1) % polygon.length]; return sum + v[0] * next[1] - next[0] * v[1]; }, 0)) / 2;
    }
    let intersections = 0;
    for (let i = 0; i < triangles.length; i++) for (let j = i + 1; j < triangles.length; j++)
      if (Math.abs(triangles[i].z - triangles[j].z) < .00001 && overlap(triangles[i].points, triangles[j].points) > .000001) intersections++;
    const ray = new THREE.Raycaster(), openingDistances = [-3.25, -1.1, 1.1, 3.25].map(x => {
      const origin = shrine.root.localToWorld(new THREE.Vector3(x, 2.6, -2.9001));
      ray.set(origin, new THREE.Vector3(0, 0, 1)); return ray.intersectObject(shrine.root, true)[0]?.distance ?? 0;
    });
    const signs = [shrine.root.children.find(n => n.name === 'shrine-plaque'), ...torii.root.children.filter(n => n.name.startsWith('torii-plaque-'))];
    const mappedFaces = signs.map(n => {
      const side = n.name === 'shrine-plaque' || n.position.z < 0 ? -1 : 1;
      const origin = n.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, side * 2));
      ray.set(origin, new THREE.Vector3(0, 0, -side)); const hit = ray.intersectObject(n)[0];
      return Boolean(hit && n.material[hit.face.materialIndex]?.map);
    });
    // 红色标记牌匾, 绿色标记其他结构; 消除字体抗锯齿/光照变化, 只检查真实深度遮挡.
    const canvas = document.createElement('canvas'); canvas.width = renderer.domElement.width; canvas.height = renderer.domElement.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const green = new THREE.MeshBasicMaterial({ color: 0x00ff00, toneMapped: false, fog: false }), red = new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false, fog: false });
    const saved = [], layer = camera.layers.mask, position = camera.position.clone(), quaternion = camera.quaternion.clone(), scans = [];
    for (const e of [shrine, torii]) e.root.traverse(n => { if (n.isMesh) { saved.push([n, n.material, n.layers.mask]); n.material = signs.includes(n) ? red : green; n.layers.set(2); } });
    camera.layers.set(2);
    try {
      for (const n of signs) {
        // 每次只绘制正在检查的模型, 避免另一座建筑正常遮住背面的牌匾.
        for (const [mesh] of saved) mesh.layers.set(mesh.parent === n.parent ? 2 : 0);
        const side = n.name === 'shrine-plaque' || n.position.z < 0 ? -1 : 1, center = n.getWorldPosition(new THREE.Vector3());
        n.geometry.computeBoundingBox(); center.z += side * n.geometry.boundingBox.max.z;
        let failedSamples = 0;
        for (let i = 0; i < 140; i++) {
          camera.position.set(.13, 4.064, center.z + side * (75 - i * .48)); camera.lookAt(center); camera.updateMatrixWorld(true);
          renderer.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0);
          for (const x of [-.075, 0, .075]) for (const y of [-.15, 0, .15]) {
            const projected = center.clone().add(new THREE.Vector3(x, y, 0)).project(camera);
            const pixel = ctx.getImageData(Math.round((projected.x * .5 + .5) * canvas.width), Math.round((.5 - projected.y * .5) * canvas.height), 1, 1).data;
            if (pixel[1] > 40 || pixel[0] < 200) failedSamples++;
          }
        }
        scans.push({ name: n.name, failedSamples });
      }
    } finally {
      for (const [n, material, mask] of saved) { n.material = material; n.layers.mask = mask; }
      camera.layers.mask = layer; camera.position.copy(position); camera.quaternion.copy(quaternion); camera.updateMatrixWorld(true); green.dispose(); red.dispose();
    }
    // 取四扇门格条之间的固定世界点, 双线性重投影, 避开前廊铃绳/奉纳箱与横档边缘.
    const points = [];
    for (const x of [-3.25, -1.1, 1.1, 3.25]) for (let col = 0; col < 8; col++) for (let row = 0; row < 10; row++) {
      const y = 1.42 + row * .12;
      if (Math.abs(y - 2.05) > .12) points.push(shrine.root.localToWorld(new THREE.Vector3(x - .7875 + col * .225, y, -2.945)));
    }
    const panelZ = points[0].z, shading = [];
    try {
      for (const [distance, sideways] of [[20, false], [35, false], [55, false], [35, true]]) {
        const frames = [];
        for (let i = 0; i < 80; i++) {
          camera.position.set(sideways ? -.8 + i * .02 : .13, 4.064, panelZ - distance + (sideways ? 0 : i * .025));
          camera.lookAt(0, 4.7, panelZ); camera.updateMatrixWorld(true); renderWorld(); ctx.drawImage(renderer.domElement, 0, 0);
          const pixels = points.map(p => { const v = p.clone().project(camera); return [(v.x * .5 + .5) * canvas.width - .5, (.5 - v.y * .5) * canvas.height - .5]; });
          const left = Math.floor(Math.min(...pixels.map(p => p[0]))), top = Math.floor(Math.min(...pixels.map(p => p[1])));
          const width = Math.ceil(Math.max(...pixels.map(p => p[0]))) - left + 2, height = Math.ceil(Math.max(...pixels.map(p => p[1]))) - top + 2;
          const image = ctx.getImageData(left, top, width, height).data;
          const luminance = (x, y) => { const k = (y * width + x) * 4; return .2126 * image[k] + .7152 * image[k + 1] + .0722 * image[k + 2]; };
          frames.push(pixels.map(([x, y]) => {
            const ix = Math.floor(x) - left, iy = Math.floor(y) - top, fx = x - Math.floor(x), fy = y - Math.floor(y);
            return (luminance(ix, iy) * (1 - fx) + luminance(ix + 1, iy) * fx) * (1 - fy) + (luminance(ix, iy + 1) * (1 - fx) + luminance(ix + 1, iy + 1) * fx) * fy;
          }));
          if (i % 20 === 0) await new Promise(requestAnimationFrame);
        }
        const spans = points.map((_, k) => { const sequence = frames.map(f => f[k]); return Math.max(...sequence) - Math.min(...sequence); }).sort((a, b) => a - b);
        shading.push({ distance, sideways, p95Span: spans[Math.floor(spans.length * .95)], maxSpan: spans.at(-1) });
      }
    } finally { camera.position.copy(position); camera.quaternion.copy(quaternion); camera.updateMatrixWorld(true); }
    return { triangleCount: triangles.length, intersections, openingDistances, mappedFaces, scans, shading, failures: FPS.inspect().failures };
  });
  assert(result.triangleCount > 80); assert.equal(result.intersections, 0, '格门的可见正面不能共面重叠');
  assert(result.openingDistances.every(d => d > 5), '四扇格门后应有真实门洞');
  assert.equal(result.mappedFaces.length, 3); assert(result.mappedFaces.every(Boolean), '字面应直接绘制在牌匾实体的正面');
  for (const scan of result.scans) assert.equal(scan.failedSamples, 0, `远近移动时底板穿透: ${JSON.stringify(scan)}`);
  for (const scan of result.shading) assert(scan.p95Span < 5 && scan.maxSpan < 8, `门面接触阴影闪烁: ${JSON.stringify(scan)}`);
  assert.deepEqual(result.failures, []); assert.deepEqual(errors, []); assert.deepEqual(network, []);
  console.log('PASS 格门无共面重叠/四处门洞, 3 组 420 帧牌匾深度遮挡, 4 组 320 帧实际阴影下神社门面走近/横移明暗稳定, 离线运行无报错.', JSON.stringify(result.shading));
} finally { await browser.close(); }
