// 树冠移动稳定性: 同一透明轮廓在硬裁切与 MSAA 覆盖率下的微转向重投影误差, 同时检查树冠面积与风动.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true });
const page = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
const errors = [], network = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
try {
  await page.goto(pathToFileURL(process.cwd() + '/index.html').href);
  await page.waitForFunction(() => FPS?.inspect?.().ready, {}, { timeout: 60000 });
  const result = await page.evaluate(async () => {
    mode = 'paused'; player.debug = true;
    const trees = ['parkTree', 'zelkovaTree', 'sakuraTree'].map(model => entries.find(e => e.data.model === model));
    const leaves = trees.map(e => e.root.children.find(n => n.material?.alphaTest)), saved = leaves.map(n => [n, n.layers.mask]);
    const materials = leaves.map(n => n.material), settings = materials.map(m => [m, m.onBeforeCompile, m.customProgramCacheKey, m.alphaToCoverage, m.toneMapped, m.fog, m.userData.wind.value]);
    const clear = renderer.getClearColor(new THREE.Color()), clearAlpha = renderer.getClearAlpha(), background = scene.background;
    const position = camera.position.clone(), quaternion = camera.quaternion.clone(), layer = camera.layers.mask;
    const canvas = document.createElement('canvas'); canvas.width = renderer.domElement.width; canvas.height = renderer.domElement.height;
    const target=new THREE.WebGLRenderTarget(canvas.width,canvas.height,{type:THREE.HalfFloatType,samples:4});
    const post=new THREE.Scene(), view=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{image:{value:target.texture}},
      vertexShader:'varying vec2 uvImage;void main(){uvImage=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:'uniform sampler2D image;varying vec2 uvImage;void main(){gl_FragColor=vec4(texture2D(image,uvImage).rgb,1.);\n#include <colorspace_fragment>\n}'});
    const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);post.add(quad);
    const draw=()=>{renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(post,view);};
    const ctx = canvas.getContext('2d', { willReadFrequently: true }), scans = [];
    const textures = materials.map(m => {
      const pixels = m.map.image.data; let empty = 0, dark = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] === 0) { empty++; if (Math.max(...pixels.subarray(i, i + 3)) < 40) dark++; }
      return { empty, dark, padded: m.map.isDataTexture && m.map.generateMipmaps };
    });
    try {
      scene.background = null; renderer.setClearColor(0x000000, 1); camera.layers.set(2);
      for (const [m, compile] of settings) {
        m.toneMapped = m.fog = false; m.userData.wind.value = 0;
        // 强制白色轮廓消除光照/贴图明暗干扰, 仍保留模型真实的几何体、alpha 与风动顶点代码.
        m.onBeforeCompile = function(shader, r) { compile.call(this, shader, r); shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight=vec3(1.);\n#include <opaque_fragment>'); };
      }
      for (const [index, e] of trees.entries()) for (const distance of [16, 40]) {
        for (const n of leaves) n.layers.set(n === leaves[index] ? 2 : 0);
        const target = e.root.localToWorld(new THREE.Vector3(0, 4, 0));
        const base = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far);
        base.position.copy(target).add(new THREE.Vector3(.3, -1, -distance)); base.lookAt(target); base.updateMatrixWorld(true);
        const q = base.quaternion.clone(), projected = new THREE.Vector3(), box = new THREE.Box3().setFromObject(leaves[index]), corners = [];
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z).project(base));
        const left = Math.max(4, Math.floor((Math.min(...corners.map(v => v.x)) * .5 + .5) * canvas.width));
        const right = Math.min(canvas.width - 4, Math.ceil((Math.max(...corners.map(v => v.x)) * .5 + .5) * canvas.width));
        const top = Math.max(4, Math.floor((.5 - Math.max(...corners.map(v => v.y)) * .5) * canvas.height));
        const bottom = Math.min(canvas.height - 4, Math.ceil((.5 - Math.min(...corners.map(v => v.y)) * .5) * canvas.height));
        const width = right - left + 8, height = bottom - top + 8, comparisons = [];
        for (const coverage of [false, true]) {
          const m = materials[index], originalKey = settings[index][2]; m.alphaToCoverage = coverage;
          m.customProgramCacheKey = () => originalKey.call(m) + '/contour/' + coverage; m.needsUpdate = true;
          let previous, totalDelta = 0, totalMass = 0, count = 0;
          for (let i = 0; i < 45; i++) {
            camera.position.copy(base.position); camera.quaternion.copy(q).multiply(q.clone().setFromEuler(new THREE.Euler(0, (i - 22) * .00007, 0))); camera.updateMatrixWorld(true);
            draw(); ctx.drawImage(renderer.domElement, 0, 0);
            const image = ctx.getImageData(left - 4, top - 4, width, height).data, samples = [];
            const at = (x, y) => image[(y * width + x) * 4];
            for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
              projected.set((x + .5) / canvas.width * 2 - 1, 1 - (y + .5) / canvas.height * 2, .5).unproject(base).project(camera);
              const px = (projected.x * .5 + .5) * canvas.width - .5, py = (.5 - projected.y * .5) * canvas.height - .5;
              const ix = Math.floor(px) - left + 4, iy = Math.floor(py) - top + 4, fx = px - Math.floor(px), fy = py - Math.floor(py);
              samples.push((at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy) + (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy);
            }
            if (previous) for (let k = 0; k < samples.length; k++) { totalDelta += Math.abs(samples[k] - previous[k]); count++; }
            totalMass += samples.reduce((s, v) => { const c=v/255; return s+(c<=.04045?c/12.92:((c+.055)/1.055)**2.4); }, 0) / samples.length; previous = samples;
            if (i % 15 === 0) await new Promise(requestAnimationFrame);
          }
          comparisons.push({ coverage, meanDelta: totalDelta / count, area: totalMass / 45 });
        }
        scans.push({ model: e.data.model, distance, comparisons });
      }
      const wind = leaves.map((n, i) => {
        const m = materials[i], target = trees[i].root.localToWorld(new THREE.Vector3(0, 4, 0));
        camera.position.copy(target).add(new THREE.Vector3(0, -1, -12)); camera.lookAt(target); camera.updateMatrixWorld(true);
        for (const leaf of leaves) leaf.layers.set(leaf === n ? 2 : 0);
        m.alphaToCoverage = true; m.userData.wind.value = 0; renderer.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0);
        const before = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        m.userData.wind.value = 1.5; renderer.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0);
        const after = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let changed = 0;
        for (let k = 0; k < before.length; k += 4) if (Math.abs(before[k] - after[k]) > 5) changed++;
        return changed;
      });
      const fallback=[];
      for(const [index,n] of leaves.entries()){
        for(const leaf of leaves)leaf.layers.set(leaf===n?2:0);
        const m=n.material, center=trees[index].root.localToWorld(new THREE.Vector3(0,4,0));
        camera.position.copy(center).add(new THREE.Vector3(0,-1,-16));camera.lookAt(center);camera.updateMatrixWorld(true);
        m.alphaToCoverage=false;m.needsUpdate=true;renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);const a=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        m.alphaToCoverage=true;m.needsUpdate=true;renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);const b=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let different=0;for(let k=0;k<a.length;k+=4)if(Math.abs(a[k]-b[k])>1)different++;
        fallback.push({different,coverage:m.userData.coverage.value});
      }
      return { textures, scans, wind, fallback, samples: renderer.getContext().getParameter(renderer.getContext().SAMPLES), failures: FPS.inspect().failures };
    } finally {
      for (const [n, mask] of saved) n.layers.mask = mask;
      for (const [m, compile, key, coverage, mapped, fog, wind] of settings) { m.onBeforeCompile = compile; m.customProgramCacheKey = key; m.alphaToCoverage = coverage; m.toneMapped = mapped; m.fog = fog; m.userData.wind.value = wind; m.needsUpdate = true; }
      renderer.setRenderTarget(null);target.dispose();quad.geometry.dispose();material.dispose();scene.background = background; renderer.setClearColor(clear, clearAlpha); camera.layers.mask = layer; camera.position.copy(position); camera.quaternion.copy(quaternion); camera.updateMatrixWorld(true);
    }
  });
  assert(result.samples >= 4, '此回归需要至少 4 重采样');
  for (const texture of result.textures) { assert(texture.empty > 100); assert.equal(texture.dark, 0, '透明区 RGB 不应留下黑底'); assert(texture.padded); }
  for (const scan of result.scans) {
    const [legacy, fixed] = scan.comparisons;
    assert(fixed.meanDelta < legacy.meanDelta, `叶缘转向闪烁未减少: ${JSON.stringify(scan)}`);
    assert(Math.abs(fixed.area / legacy.area - 1) < .1, `平滑不能显著改变树冠面积: ${JSON.stringify(scan)}`);
  }
  const legacyError = result.scans.reduce((sum, scan) => sum + scan.comparisons[0].meanDelta, 0);
  const fixedError = result.scans.reduce((sum, scan) => sum + scan.comparisons[1].meanDelta, 0);
  assert(fixedError < legacyError * .9, '六组视角的轮廓误差合计应降低至少 10%');
  assert(result.fallback.every(r=>r.different===0 && r.coverage===0),'普通画布的硬裁切回退应保持轮廓');
  assert(result.wind.every(n => n > 100), '三类树木的风动应保留');
  assert.deepEqual(result.failures, []); assert.deepEqual(errors, []); assert.deepEqual(network, []);
  console.log('PASS 3 类树木 16/40 米共 540 帧微转向叶缘稳定, 树冠面积保持, 透明纹理无黑底, 风动保留, 普通画布回退一致, 离线运行无报错.', JSON.stringify(result.scans));
} finally { await browser.close(); }
