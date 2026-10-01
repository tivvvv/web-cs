// 地面命中集成检查: 真实射击分辨软硬面, 装饰地面挡住地基, 水花及特效生命周期回归.
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
  const result = await page.evaluate(() => {
    renderer.setAnimationLoop(null); mode = 'paused';
    const cases = [], fixtures = [], clear = () => { effects.forEach(e => dispose(e.root)); effects.length = 0; };
    const fire = (label, entry, x, z, soft, y = 8) => {
      clear(); scene.updateMatrixWorld(true);
      const origin = entry.root.localToWorld(new T.Vector3(x, y, z));
      const direction = new T.Vector3(0, -1, 0).transformDirection(entry.root.matrixWorld);
      const contact = new T.Raycaster(origin, direction, .025, 100).intersectObject(entry.root, true).find(h => h.object.isMesh && h.face);
      const response = shoot(origin, direction, 'player', 10), mark = effects.find(e => e.name === 'bulletmark'), impact = effects.find(e => e.name === 'impact');
      cases.push({ label, soft, hit: response.hit, distance: response.distance, expectedDistance: contact?.distance,
        instanceId: contact?.instanceId,
        marks: effects.filter(e => e.name === 'bulletmark').length, parentMatches: mark?.root.parent === contact?.object,
        impactMeshes: impact?.root.children.length, impactDuration: impact?.duration });
    };
    const fixture = (model, options, tests, transformed = false) => {
      const position = [600 + fixtures.length * 400, 0, 0];
      const entry = createInstance({ id: 'impact-fixture-' + fixtures.length, model, position, options,
        ...(transformed ? { rotation: [.13, .63, .08], scale: [1.4, .85, 1.1] } : {}) });
      // 每个被测模型下面都有硬地基, 没有装饰面射击检测时会留下错误弹痕.
      const base = { size: [330, .2, 100], offset: [0, -.8, -20] };
      createInstance({ id: entry.id + '-foundation', model: 'districtGround', position, options: { slabs: [base] }, collision: { enabled: true, boxes: [base] } });
      fixtures.push(entry);
      for (const [label, x, z, soft] of tests) fire(label, entry, x, z, soft);
      return entry;
    };
    fixture('lawn', { patches: [[0, 0, 0, 4, 3]] }, [['草坪', 0, 0, true], ['草坪土带', 1.875, 0, true], ['草坪石沿', 1.95, .2, false]], true);
    fixture('shrineParkGround', { bounds: [-4, -4, 4, 4], surfaces: [[-4, -4, 0, 4, 2], [0, -4, 2, 4, 1]] },
      [['公园草地', -2, 0, true], ['公园石板', 1, 0, false], ['公园砂砾', 3, 0, true], ['公园草地石沿', -.025, .2, false]]);
    fixture('parkTerrain', { cells: [{ size: [2, .4, 2], offset: [0, .2, 0], surface: [.1, .2, .3, .4] }] }, [['缓丘草土', 0, 0, true]]);
    fixture('coastalBeach', { sandStart: 0, sandLevel: 0, slope: .02 }, [['沙滩', 0, -3, true]]);
    fixture('dryGarden', { width: 8, depth: 6, islands: [[1, 1, .5, .45, 0]] },
      [['枯山水砂面', -1, 0, true], ['枯山水排水砂砾', 0, 2.8, true], ['枯山水苔岛', 1, 1, true], ['枯山水石沿', 0, 2.92, false]]);
    fixture('pocketPaving', { width: 19, depth: 8, garden: true }, [['口袋花园砂砾', 0, 2, true], ['口袋花园踏石', -8.85, -.5, false], ['口袋花园石沿', 0, 3.945, false]]);
    fixture('pocketPaving', { width: 6, depth: 4 }, [['混凝土铺地', 0, 0, false]]);
    fixture('pocketPaving', { width: 6, depth: 4, stone: true }, [['石板铺地', 0, 0, false]]);
    fixture('stoneFlowerbed', { width: 4, depth: 2, rocks: [[0, 0, .3]] }, [['花坛泥土', 1, 0, true], ['花坛石沿', 1.94, 0, false], ['花坛景石', 0, 0, false]], true);
    fixture('treePlanter', {}, [['树池土面', .2, .2, true], ['树池石沿', 1.23, .2, false], ['树池金属栏', 1.23, .6, false]]);
    fixture('parkFlowerbed', { width: 4, depth: 2, count: 0 }, [['花境土面', 0, 0, true], ['花境石圈', 1.99, 0, false]]);
    fixture('japaneseYard', {}, [['宅院砂砾', 1, 3.3, true], ['宅院土带', 3.55, 0, true], ['宅院踏石', 0, 3.66, false], ['宅院石沿', 3.92, 0, false]], true);
    const track = fixture('kamakuraGround', {}, [['沥青道路', 1, 20, false], ['混凝土地面', 10, 20, false], ['铁路道砟', 20, 1.9, true], ['铁路钢轨', 20, .5335, false]]);
    const ballast = track.root.children.find(n => n.isInstancedMesh && n.count === 1300), matrix = new T.Matrix4(), point = new T.Vector3();
    for (let i = 0; i < ballast.count; i++) {
      ballast.getMatrixAt(i, matrix); point.setFromMatrixPosition(matrix);
      if (Math.abs(point.z) > 1.2) { fire('实例化道砟石粒', track, point.x, point.z, true); break; }
    }
    // 检查当前场景实际放置, 防止独立模型正确而现场仍命中被覆盖的地基.
    const find = id => entries.find(e => e.id === id);
    for (const [label, id, x, z, soft] of [
      ['现场站前草坪', 'station-lawns', 17, 8.6, true], ['现场高台草坪', 'station-lawns', 35, 33, true],
      ['现场公园草地', 'northwest-park-ground', 10, 88, true], ['现场参道石板', 'northwest-park-ground', 0, 115, false],
      ['现场枯山水白砂', 'park-dry-garden', 0, -2, true], ['现场站前混凝土', 'station-cycle-court', 0, -3.7, false]
    ]) fire(label, find(id), x, z, soft);
    fire('现场观景台木地板', find('park-east-viewing-deck'), 0, .1, false, .8);
    const stepping = find('park-grove-stepping-stones'), [sx, sz] = stepping.data.options.stones[0];
    fire('现场林间踏石', stepping, sx, sz, false, .7);
    clear();
    const pond = find('park-pond');
    const waterPoint = pond.root.localToWorld(new T.Vector3(-5, pond.data.options.waterLevel, 0));
    shoot(waterPoint.clone().add(new T.Vector3(0, 3, 0)), new T.Vector3(0, -1, 0), 'player', 10);
    const waterEffects = effects.map(e => e.name);
    clear();
    const expiry = [];
    for (const entry of [find('station-lawns'), find('station-cycle-court')]) {
      fire('生命周期', entry, entry.id === 'station-lawns' ? 17 : 0, entry.id === 'station-lawns' ? 8.6 : -3.7, entry.id === 'station-lawns', 1);
      const before = effects.map(e => e.name); mode = 'menu';
      for (let i = 0; i < 40; i++) frame((last || performance.now()) + 16);
      expiry.push({ before, after: effects.map(e => e.name) }); mode = 'paused';
    }
    clear();
    const hard = find('station-cycle-court');
    for (let i = 0; i < 70; i++) {
      const point = hard.root.localToWorld(new T.Vector3(0, 1, -3.7)); shoot(point, new T.Vector3(0, -1, 0), 'player', 10);
    }
    const limit = effects.filter(e => e.name === 'bulletmark').length;
    clear();
    return { cases, waterEffects, expiry, limit, fixturesHaveBodies: fixtures.some(e => e.body || solid.some(s => s.root === e.root)), failures: FPS.inspect().failures };
  });
  const mismatches = result.cases.filter(c => !c.hit || Math.abs(c.distance - c.expectedDistance) >= .0001 || c.marks !== (c.soft ? 0 : 1) || c.impactMeshes !== (c.soft ? 8 : 9) || (!c.soft && !c.parentMatches));
  assert.deepEqual(mismatches, [], '可见地面命中与软硬规则不匹配');
  for (const c of result.cases) {
    assert(c.hit && Math.abs(c.distance - c.expectedDistance) < .0001, `没有命中可见表面: ${JSON.stringify(c)}`);
    assert.equal(c.marks, c.soft ? 0 : 1, `软硬地面规则错误: ${JSON.stringify(c)}`);
    assert.equal(c.impactMeshes, c.soft ? 8 : 9, `碎屑/火花错误: ${JSON.stringify(c)}`);
    assert.equal(c.impactDuration, c.soft ? .6 : .45);
    if (!c.soft) assert(c.parentMatches, `弹痕未附着实际命中面: ${c.label}`);
  }
  assert.deepEqual(result.waterEffects.sort(), ['tracer', 'waterSplash']);
  assert(Number.isInteger(result.cases.find(c => c.label === '实例化道砟石粒')?.instanceId), '应覆盖真正的实例化石粒命中');
  assert(!result.fixturesHaveBodies, '命中规则不应依赖被测地面的身体碰撞');
  assert.deepEqual(result.expiry[0].after, []); assert.deepEqual(result.expiry[1].after, ['bulletmark']);
  assert.equal(result.limit, 64);
  assert.deepEqual(result.failures, []); assert.deepEqual(errors, []); assert.deepEqual(network, []);
  console.log(`PASS ${result.cases.length} 处软硬地面真实射击, 非均匀缩放/旋转, 可见面遮挡地基, 水面特效, 碎屑寿命及 64 处弹痕上限, 离线无报错.`);
} finally { await browser.close(); }
