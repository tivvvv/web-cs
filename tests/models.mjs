// 独立接入回归: 每次只注册一个模型, 用通用 Three.js 环境编译/绘制, 不加载主程序或其他模型.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true });
const page = await browser.newPage({ offline: true, viewport: { width: 640, height: 400 } }), errors = [], network = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
try {
  await page.addScriptTag({ path: 'vendor/three.min.js' });
  await page.evaluate(() => {
    window.modelRenderer = new THREE.WebGLRenderer({ antialias: true }); modelRenderer.setSize(640, 400);
    modelRenderer.toneMapping = THREE.ACESFilmicToneMapping; document.body.appendChild(modelRenderer.domElement);
  });
  const cases = [
    ['stone-lantern', 'stoneLantern', {}, 2],
    ['japanese-yard', 'japaneseYard', { seed: 94 }, 2],
    ['sakura-tree', 'sakuraTree', { seed: 702 }, 2], ['zelkova-tree', 'zelkovaTree', { seed: 701 }, 2],
    ['park-tree', 'parkTree', { seed: 511, spread: 1.12 }, 2],
    ['park-bamboo', 'parkBamboo', { culms: [{ foot: [0, 0, 0], height: 6, radius: .065, lean: [.2, -.2], seed: 3 }] }, 3],
    ['park-bamboo', 'parkBamboo', { clumps: [[0, 0, 1.4, 13, 6, 0]] }, 3],
    ['park-pond', 'parkPond', { width: 20, depth: 20, bottom: -.55, waterLevel: -.18, rim: .024, shore: Array.from({ length: 40 }, (_, i) => [8 * Math.cos(i * Math.PI / 20), 8 * Math.sin(i * Math.PI / 20)]) }, 2],
    ['japanese-cottage', 'japaneseCottage', {}, 1], ['japanese-machiya', 'japaneseMachiya', {}, 1],
    ['japanese-residence', 'japaneseResidence', {}, 1], ['station-shop', 'stationShop', { kind: 'tea' }, 2],
    ['station-shop', 'stationShop', { kind: 'kiosk' }, 2],
    ['coastal-street', 'coastalStreet', { kind: 'wall', length: 8, height: 1.8 }, 2],
    ['coastal-street', 'coastalStreet', { kind: 'sign' }, 3],
    ['coastal-street', 'coastalStreet', { kind: 'railing', length: 8 }, 2],
    ['coastal-foliage', 'coastalFoliage', { seed: 92, blooms: 8 }, 3],
    ['stone-flowerbed', 'stoneFlowerbed', { width: 6, depth: 1.2 }, 1],
    ['pocket-paving', 'pocketPaving', { width: 6, depth: 3, stone: true }, 1],
    ['landscape-rocks', 'landscapeRocks', { stones: [[0, 0, 1.9, 1.95, 1.55]], weathered: true, moss: false, exactHeight: true }, 1],
    ['dry-garden', 'dryGarden', { width: 12, depth: 8, islands: [[0, 0, 1.5, 1, 0]] }, 5],
    ['port-ground', 'portGround', {}, 1], ['cargo-container', 'cargoContainer', {}, 3],
    ['cargo-container', 'cargoContainer', { units: [{ width: 2.6, height: 3, length: 6, yaw: .4, openEnds: [-1, 1], doorAngle: Math.PI * .8 }] }, 3],
    ['port-access', 'portAccess', {}, 2], ['port-warehouse', 'portWarehouse', {}, 5],
    ['port-crane', 'portCrane', {}, 4], ['cargo-ship', 'cargoShip', {}, 3],
    ['port-fixtures', 'portFixtures', {}, 3],
    ['port-reachstacker', 'portReachstacker', {}, 5], ['port-forklift', 'portForklift', {}, 4],
    ['port-terminal-tractor', 'portTerminalTractor', {}, 5], ['port-terminal-tractor', 'portTerminalTractor', { trailer: false }, 5],
    ['port-cargo-workarea', 'portCargoWorkarea', {}, 4], ['port-service', 'portService', {}, 6], ['port-utilities', 'portUtilities', {}, 4], ['vertical-ladder', 'verticalLadder', {}, 2]
  ];
  for (const [file, name, options, limit] of cases) {
    await page.evaluate(() => { window.FPS = { models: {} }; });
    await page.addScriptTag({ path: `models/${file}.js` });
    const result = await page.evaluate(async ({ name, options }) => {
      const before = JSON.stringify(options), model = FPS.models[name](THREE, options), scene = new THREE.Scene();
      if (!model?.root?.isObject3D) throw Error('模型未返回 root');
      scene.add(model.root, new THREE.HemisphereLight(0xc8e5f4, 0x8c8065, 1.15));
      const sun = new THREE.DirectionalLight(0xffedce, 3.15); sun.position.set(-10, 12, 8); scene.add(sun);
      const camera = new THREE.PerspectiveCamera(55, 1.6, .1, 100); camera.position.set(9, 8, 12); camera.lookAt(0, 2, 0);
      let meshes = 0, finite = true;
      model.root.traverse(n => { if (n.isMesh) { meshes++; finite &&= Object.values(n.geometry.attributes).every(a => a.array.every(Number.isFinite)); if (n.isInstancedMesh) finite &&= n.instanceMatrix.array.every(Number.isFinite); } });
      try {
        model.update?.(.016, {}); await model.prepare?.(modelRenderer, scene, camera); await modelRenderer.compileAsync(scene, camera); model.beforeRender?.(modelRenderer, scene, camera); modelRenderer.render(scene, camera);
        return { meshes, finite, immutable: before === JSON.stringify(options), factories: Object.keys(FPS.models), error: modelRenderer.getContext().getError() };
      } finally { model.dispose?.(); model.root.removeFromParent(); }
    }, { name, options });
    assert(result.meshes > 0 && result.meshes <= limit, `模型未合批: ${name}`); assert(result.finite, `非有限几何: ${name}`);
    assert(result.immutable, `模型不应修改场景配置: ${name}`); assert.deepEqual(result.factories, [name]); assert.equal(result.error, 0, `WebGL 错误: ${name}`);
  }
  assert.deepEqual(errors, []); assert.deepEqual(network, []);
  console.log(`PASS ${new Set(cases.map(c => c[1])).size} 个模型/${cases.length} 种配置在仅加载自身脚本的环境独立装配, 几何有限, 配置只读, 材质编译/绘制无误, 合批网格符合预算, 无 HTTP 请求.`);
} finally { await browser.close(); }
