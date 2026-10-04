// 双场景的模型/玩法核心回归. DOM/绘制使用桩, 音频不执行, 不打开页面或验证 GPU/浏览器输入.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const html = read('index.html'), inline = html.split('<script>')[1].split('</script>')[0];
const bootCall = inline.lastIndexOf('\nboot().catch(');
assert(bootCall > 0, '找不到独立的启动调用');
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function surface() {
  const context = { pixels: null, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData(image) { this.pixels = image.data; }, drawImage(canvas) { this.pixels = canvas.context.pixels; },
    getImageData(x, y, w, h) { return { data: this.pixels ?? new Uint8ClampedArray(w * h * 4) }; },
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    measureText: text => ({ width: String(text).length * 12 }) };
  for (const name of ['setTransform', 'resetTransform', 'save', 'restore', 'clearRect', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'ellipse', 'rect', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo', 'stroke', 'fill', 'clip', 'translate', 'rotate', 'scale', 'setLineDash']) context[name] = () => {};
  return { width: 300, height: 150, context, getContext(type) { assert.equal(type, '2d'); return context; },
    cloneNode() { const canvas = surface(); canvas.width = this.width; canvas.height = this.height; return canvas; } };
}
function fixture(file) {
  const elements = new Map(), listeners = new Map(), faults = [];
  function node(id) {
    if (elements.has(id)) return elements.get(id);
    const callbacks = new Map(), classes = new Set(), element = { ...surface(), style: {}, dataset: {}, textContent: '', children: [],
      append(child) { this.children.push(child); }, remove() {},
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), toggle(name, on) { on ? classes.add(name) : classes.delete(name); } },
      addEventListener(name, callback) { callbacks.set(name, callback); }, dispatch(name, data) { callbacks.get(name)?.(data); },
      requestPointerLock: async () => {} };
    elements.set(id, element); return element;
  }
  const document = { body: node('body'), hidden: false, pointerLockElement: null, getElementById: node,
    createElement: name => name === 'canvas' ? surface() : node(Symbol(name)),
    addEventListener(name, callback) { listeners.set(name, callback); }, exitPointerLock() {}, querySelector: node, querySelectorAll: () => [] };
  const c = vm.createContext({ document, console: { log() {}, warn() {}, error: message => faults.push(message) },
    performance, setTimeout, clearTimeout, navigator: { hardwareConcurrency: 4 }, AbortController,
    location: { search: file === 'scene-layout.js' ? '?scene=industrial' : '', reload() {} } });
  c.window = c; c.addEventListener = (name, callback) => listeners.set('window:' + name, callback);
  vm.runInContext(read('vendor/three.min.js'), c);
  vm.runInContext(inline.slice(0, bootCall), c); vm.runInContext(read(file), c);
  const layout = c.FPS_LAYOUT;
  for (const [name, path] of Object.entries(layout.catalog)) {
    assert(/^[\w./-]+\.js$/.test(path) && !path.includes('..'), '模型路径无效 ' + name);
    const source = read(path), isolated = vm.createContext({ FPS: { models: {} }, document, AbortController });
    assert(!/\b(?:fetch|requestAnimationFrame|setInterval|setTimeout)\s*\(/.test(source), path + ' 含运行时依赖/循环');
    vm.runInContext(source, isolated);
    assert.deepEqual(Object.keys(isolated.FPS.models), [name], path + ' 必须只注册自身');
    c.FPS.models[name] = isolated.FPS.models[name];
  }
  vm.runInContext(`
    T = THREE; layout = FPS_LAYOUT; scene = new T.Scene(); camera = new T.PerspectiveCamera(64, 1.6, .05, 8000); scene.add(camera);
    player.position = new T.Vector3(...layout.player.position);
    renderer = { info: { autoReset: false, render: { calls: 0, triangles: 0 }, reset() {} },
      shadowMap: {}, domElement: { width: 1280, height: 800 }, clearDepth() {}, render() {}, setRenderTarget() {} };
    // 绘制在此测试的边界外; 仍执行原帧循环中的物理, 模型更新, 特效寿命和 HUD.
    renderWorld = () => {};
    api = { player, eye, move, visible, shoot, effect, spawn: player.position.clone(), flash: new T.PointLight(), killed() { kills++; } };
    globalThis.core = {
      api, createInstance, shoot, playerFire, reload, frame, pause, toggleEnemies, toggleDebug, move, fall, footprint, blockedAt, dispose, syncPlayerCamera,
      snapshot: () => ({ scene, camera, player, entries, solid, actors, effects, failures, weapon, ammo, reloadLeft, mode, time, kills, total, enemiesEnabled, keys, stepView }),
      ready() { enemySpawns = actors.map(a => a.data); total = actors.length; ready = true; mode = 'playing'; weapon.root.visible = true; },
      pose(p, y = 0, t = 0) { player.position.set(...p); yaw = y; pitch = t; stepView.offset = 0; player.body.vy = 0; player.body.grounded = false; keys.clear(); syncPlayerCamera(); },
      reset() { mode = 'playing'; cooldown = reloadLeft = 0; ammo = 30; player.health = 100; keys.clear(); },
      mode(value) { mode = value; },
      clearEffects() { for (const e of effects) dispose(e.root); effects.length = 0; }
    };`, c);
  const t = c.core;
  for (const data of layout.instances) {
    const options = freeze(structuredClone(data.options ?? {})), before = JSON.stringify(options);
    t.createInstance({ ...data, options }); assert.equal(JSON.stringify(options), before, data.id + ' 修改了配置');
  }
  t.ready();
  let stamp = 1000;
  const advance = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) t.frame(stamp += 1000 / 60); };
  const key = (code, down = true) => listeners.get(down ? 'keydown' : 'keyup')?.({ code, repeat: false, preventDefault() {} });
  return { c, t, layout, document, node, faults, advance, key, listeners };
}
const reports = [];
for (const file of ['scene-layout.js', 'scene-kamakura.js']) {
  const f = fixture(file), { t, c, layout, advance, key } = f, T = c.THREE, s = t.snapshot();
  assert.equal(s.entries.length, layout.instances.length); assert.equal(new Set(s.entries.map(e => e.id)).size, s.entries.length);
  assert.equal(s.actors.length, file === 'scene-layout.js' ? 6 : 4); assert.equal(s.player.debug, false);
  let meshes = 0, triangles = 0;
  s.scene.updateMatrixWorld(true);
  for (const entry of s.entries) entry.root.traverse(mesh => {
    if (!mesh.isMesh) return; meshes++;
    const geometry = mesh.geometry, count = geometry.attributes.position.count;
    for (const attribute of Object.values(geometry.attributes)) {
      assert(attribute.array.every(Number.isFinite), entry.id + ' 顶点出现非有限值');
      assert.equal(attribute.count, count, entry.id + ' 顶点属性数量不一致');
    }
    if (geometry.index) assert(geometry.index.array.every(i => i < count), entry.id + ' 索引越界');
    if (mesh.isInstancedMesh) assert(mesh.instanceMatrix.array.every(Number.isFinite), entry.id + ' 实例矩阵无效');
    triangles += (geometry.index?.count ?? count) / 3 * (mesh.isInstancedMesh ? mesh.count : 1);
  });
  assert(!t.blockedAt(s.player.position, .32, 1.75, []), '场景出生点位于实体内部');
  s.actors.forEach(a => a.update = () => {});
  advance(.2);
  assert(s.player.body.grounded, '场景出生点缺少地面');
  const spawn = s.player.position.clone(); key('KeyW'); advance(.3); key('KeyW', false);
  assert(s.player.position.distanceTo(spawn) > .2, '出生区前进受阻');
  key('Space'); advance(.1); key('Space', false); const jumpY = s.player.position.y;
  assert(jumpY > spawn.y + .15, '跳跃未抬升'); advance(1); assert(s.player.body.grounded, '跳跃后未落地');
  t.pause(); const paused = t.snapshot().time; advance(.3); assert.equal(t.snapshot().time, paused);
  t.reset();
  key('KeyB'); assert(s.player.debug); key('KeyB', false); key('Space'); advance(.2); key('Space', false);
  const flightY = s.player.position.y; advance(.2); assert.equal(s.player.position.y, flightY, '自由飞行仍受重力');
  t.pose(layout.player.position); key('KeyB'); key('KeyB', false); assert(!s.player.debug);
  t.toggleEnemies(); assert.equal(t.snapshot().actors.length, 0); assert.equal(t.snapshot().total, 0);
  assert.equal(t.snapshot().mode, 'playing', '关闭敌人错误触发结算'); t.toggleEnemies();
  assert.equal(t.snapshot().actors.length, s.actors.length); assert(t.snapshot().actors.every(a => a.health === 100));
  const active = t.snapshot().actors, updates = active.map(a => a.update); active.forEach(a => a.update = () => {});
  // 独立空地保留场景其他模型, 只移动角色, 检查原武器/射线/伤害与实际敌人网格.
  c.FPS.models.coreFloor = T => ({ root: new T.Mesh(new T.BoxGeometry(30, .2, 30), new T.MeshStandardMaterial()) });
  t.createInstance({ id: 'core-floor', model: 'coreFloor', position: [600, -.1, 0], collision: { enabled: true, size: [30, .2, 30] } });
  active.forEach((a, i) => a.root.position.set(i ? 650 + i * 5 : 600, 0, 0));
  t.pose([600, 0, 10]); t.reset(); advance(.1);
  t.playerFire(); assert.equal(t.snapshot().ammo, 29); assert.equal(active[0].health, 32, '准星射击未按头部计算伤害');
  advance(.14); t.pose([600, 0, 10]); t.playerFire(); assert.equal(active[0].health, 0); assert.equal(t.snapshot().kills, 1);
  active[0].damage(100, t.api); assert.equal(t.snapshot().kills, 1, '死亡重复计数');
  t.reload(); assert(t.snapshot().reloadLeft > 0); advance(1.8); assert.equal(t.snapshot().ammo, 30);
  const ammo = t.snapshot().ammo; t.pause(); t.playerFire(); assert.equal(t.snapshot().ammo, ammo, '暂停仍可开枪'); t.reset();
  t.createInstance({ id: 'core-wall', model: 'coreFloor', position: [600, 1, 4], scale: [.1, 20, .04], collision: { enabled: true, size: [30, .2, 30] } });
  const target = active[1]; target.root.position.set(600, 0, 0); const health = target.health;
  t.shoot(new T.Vector3(600, 1.2, 10), new T.Vector3(0, 0, -1), 'player', 100); assert.equal(target.health, health, '墙体未挡住玩家子弹');
  const playerHealth = s.player.health;
  t.shoot(new T.Vector3(600, 1.2, 0), new T.Vector3(0, 0, 1), 'enemy', 100); assert.equal(s.player.health, playerHealth, '墙体未挡住敌方子弹');
  t.pose([610, 0, 10]); t.shoot(new T.Vector3(610, 1.2, 0), new T.Vector3(0, 0, 1), 'enemy', 9);
  assert.equal(s.player.health, 91); s.player.debug = true; t.shoot(new T.Vector3(610, 1.2, 0), new T.Vector3(0, 0, 1), 'enemy', 9);
  assert.equal(s.player.health, 91, '调试飞行仍受到伤害'); s.player.debug = false;
  // 检查实际 AI 的移动/开火接口, 桩只记录射击请求, 不替代方向和移动计算.
  let shots = 0; const actor = active[2], originalShoot = t.api.shoot, originalPosition = new T.Vector3(610, 0, 0);
  actor.root.position.set(610, 0, 0); actor.update = updates[2];
  t.api.shoot = (from, direction, team, damage) => { assert(from.toArray().every(Number.isFinite)); assert(Math.abs(direction.length() - 1) < 1e-8); assert.equal(team, 'enemy'); assert(damage > 0); shots++; };
  for (let i = 0; i < 240; i++) actor.update(1 / 60, t.api);
  assert(actor.root.position.distanceTo(originalPosition) > .1, '敌人 AI 未移动');
  assert(shots > 0, '敌人 AI 未开火'); t.api.shoot = originalShoot; actor.update = () => {};
  const beforeBlur = t.snapshot().time; f.listeners.get('window:blur')(); advance(.2); assert.equal(t.snapshot().time, beforeBlur); t.reset();
  t.clearEffects();
  const cases = file === 'scene-layout.js' ? [['yard', 0, 22, false]] : [
    ['station-lawns', 17, 8.6, true], ['northwest-park-ground', 10, 88, true], ['northwest-park-ground', 0, 115, false],
    ['park-dry-garden', 0, -2, true], ['station-cycle-court', 0, -3.7, false]
  ];
  for (const [id, x, z, soft] of cases) {
    const entry = t.snapshot().entries.find(e => e.id === id); t.clearEffects();
    const from = entry.root.localToWorld(new T.Vector3(x, 8, z)), direction = new T.Vector3(0, -1, 0);
    const contact = new T.Raycaster(from, direction, .025, 100).intersectObject(entry.root, true).find(hit => hit.face);
    const response = t.shoot(from, direction, 'player', 10);
    assert(response.hit && Math.abs(response.distance - contact.distance) < 1e-4, id + ' 未命中实际可见表面');
    assert.equal(t.snapshot().effects.filter(e => e.name === 'bulletmark').length, soft ? 0 : 1, id + ' 弹痕软硬规则错误');
  }
  if (file === 'scene-kamakura.js') {
    const ground = t.snapshot().entries.find(e => e.id === 'northwest-park-ground');
    const paths = [...ground.data.options.trails.map(r => r.points),
      [[3, 123], [48, 123]], [[48, 123], [3, 123]], [[46.5, 108], [46.5, 120]],
      [[0, 78.5], [0, 127.1], [0, 128.6]], [[-19, 101.3], [-19, 102.85], [-19, 103.2]]];
    for (const [route, points] of paths.entries()) {
      t.pose([points[0][0], 2.4, points[0][1]]);
      s.player.position.y = Math.max(2.4, ...t.snapshot().solid.filter(part => part.box.max.y < 3.2 && t.footprint(s.player.position, .32, part.box)).map(part => part.box.max.y));
      s.player.body.grounded = true;
      for (const [x, z] of points.slice(1)) {
        const dx = x - s.player.position.x, dz = z - s.player.position.z, steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .1));
        for (let i = 0; i < steps; i++) { t.move(s.player, dx / steps, dz / steps); t.fall(s.player.body, 1 / 60); }
        assert(Math.hypot(x - s.player.position.x, z - s.player.position.z) < .12, '公园通路受阻 ' + route + ' ' + JSON.stringify(s.player.position.toArray()));
        assert(!t.blockedAt(s.player.position, .32, 1.75, []), '公园通路进入实体 ' + route);
      }
    }
    const lamps = t.snapshot().entries.filter(e => e.data.model === 'stoneLantern'); assert.equal(lamps.length, 4);
    for (const entry of lamps) {
      t.clearEffects(); s.scene.updateMatrixWorld(true);
      const bulb = entry.root.getObjectByName('stone-lantern-bulb'), geometry = bulb.geometry; let released = false;
      geometry.addEventListener('dispose', () => released = true);
      for (const p of [[0, 1.69, -1], [0, 1.69, 1], [-1, 1.69, 0], [1, 1.69, 0]]) {
        const from = entry.root.localToWorld(new T.Vector3(...p)), target = bulb.getWorldPosition(new T.Vector3());
        const first = new T.Raycaster(from, target.sub(from).normalize(), .025, 2).intersectObject(entry.root, true)[0];
        assert.equal(first?.object, bulb, entry.id + ' 灯泡四面不可拾取');
      }
      const from = entry.root.localToWorld(new T.Vector3(0, 1.69, -1)), direction = bulb.getWorldPosition(new T.Vector3()).sub(from).normalize();
      t.shoot(from, direction, 'player', 10);
      assert(bulb.geometry !== geometry && released, entry.id + ' 灯泡未破碎/旧几何未释放');
      assert.equal(t.snapshot().effects.filter(e => e.name === 'lampShards').length, 1);
      assert(!t.snapshot().effects.some(e => e.name === 'bulletmark'), entry.id + ' 灯泡留下弹痕');
    }
    for (const entry of t.snapshot().entries.filter(e => e.data.model === 'streetLamp')) {
      t.clearEffects(); s.scene.updateMatrixWorld(true);
      const lens = entry.root.children[1], geometry = lens.geometry;
      const from = entry.root.localToWorld(new T.Vector3(0, 3.5, .78)), direction = lens.getWorldPosition(new T.Vector3()).sub(from).normalize();
      t.shoot(from, direction, 'player', 10);
      assert(lens.geometry !== geometry, entry.id + ' 路灯未击碎');
      assert.equal(t.snapshot().effects.filter(e => e.name === 'lampShards').length, 1);
      assert(!t.snapshot().effects.some(e => e.name === 'bulletmark'));
      const broken = lens.geometry; t.shoot(from, direction, 'player', 10);
      assert.equal(lens.geometry, broken); assert.equal(t.snapshot().effects.filter(e => e.name === 'lampShards').length, 1, entry.id + ' 重复破碎');
    }
    t.clearEffects(); const pond = t.snapshot().entries.find(e => e.id === 'park-pond');
    const water = pond.root.localToWorld(new T.Vector3(-5, pond.data.options.waterLevel, 0));
    t.shoot(water.clone().add(new T.Vector3(0, 3, 0)), new T.Vector3(0, -1, 0), 'player', 10);
    assert.deepEqual(t.snapshot().effects.map(e => e.name).sort().join(','), 'tracer,waterSplash');
    for (const [position, dx, dz, steps, coordinate, target] of [
      [[0, .078, 14], 0, .05, 180, 2, 22], [[-5.4, 0, 4.2], -.05, 0, 80, 0, -9]
    ]) {
      t.pose(position); s.player.body.grounded = true;
      for (let i = 0; i < steps; i++) { t.move(s.player, dx, dz); t.fall(s.player.body, 1 / 60); }
      assert(coordinate === 2 ? s.player.position.z > target : s.player.position.x < target, '车站入口/月台台阶受阻');
      assert(Math.abs(s.player.position.y - (coordinate === 2 ? 2.4 : .68)) < .001);
    }
    console.log('PASS 公园六条园路/拱桥/观景台/参道/枯山水入口, 车站台阶, 长明灯/路灯击碎, 水面中弹');
  }
  t.clearEffects();
  for (let i = 0; i < 70; i++) t.shoot(new T.Vector3(600, 3, -10), new T.Vector3(0, -1, 0), 'player', 10);
  assert.equal(t.snapshot().effects.filter(e => e.name === 'bulletmark').length, 64, '弹痕限额未生效'); t.clearEffects();
  // 使用原结算与输入保护, 避免只验证伤害数值而遗漏死亡/胜利状态.
  t.pose([610, 0, 10]); t.reset();
  t.shoot(new T.Vector3(610, 1.2, 0), new T.Vector3(0, 0, 1), 'enemy', 100);
  assert.equal(t.snapshot().mode, 'dead'); assert.equal(s.player.health, 0);
  const deadAmmo = t.snapshot().ammo; t.playerFire(); assert.equal(t.snapshot().ammo, deadAmmo);
  t.reset(); for (const enemy of t.snapshot().actors) enemy.damage(1000, t.api); advance(.02);
  assert.equal(t.snapshot().mode, 'won'); assert.equal(t.snapshot().kills, t.snapshot().total);
  assert(t.snapshot().effects.length > 0, '没有可检查寿命的射击特效');
  t.mode('menu'); advance(1); assert.equal(t.snapshot().effects.length, 0, '短暂特效未过期');
  assert.deepEqual([...t.snapshot().failures], []); assert.deepEqual(f.faults, []);
  reports.push({ scene: file, configuredInstances: layout.instances.length, configuredModels: Object.keys(layout.catalog).length, meshes, triangles });
  console.log('PASS 双场景核心 ' + file + ': 全模型独立装配/有限顶点/只读配置, 出生/移动/跳跃/飞行, 暂停/失焦, 敌人刷新/AI, 真实射击/头伤/死亡计数/换弹/双向遮挡/地面命中/胜败结算');
}
const output = new URL('../artifacts/scene-core/', import.meta.url); mkdirSync(output, { recursive: true });
writeFileSync(new URL('report.json', output), JSON.stringify({ scope: '纯 Node 模型/玩法核心, 非 GPU/浏览器输入验证', scenes: reports }, null, 2) + '\n');
