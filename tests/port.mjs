// 纯 Node 码头回归: 使用离线依赖, 实际模型三角面与 HTML 原有物理, 不启动浏览器.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const document = { createElement(name) {
  assert.equal(name, 'canvas');
  const context = { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  context.putImageData = image => { context.pixels = image.data; };
  for (const method of ['fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'stroke', 'fill', 'fillText', 'setTransform']) context[method] = () => {};
  return { width: 300, height: 150, getContext: () => context };
} };
const context = vm.createContext({ window: {}, console, document, AbortController });
vm.runInContext(read('vendor/three.min.js'), context);
vm.runInContext(read('scene-kamakura.js'), context);
const T = context.THREE, layout = context.window.FPS_LAYOUT, port = layout.instances.filter(i => i.id.startsWith('port-'));
const before = vm.createContext({ window: {} });
vm.runInContext(execFileSync('git', ['show', 'HEAD:scene-kamakura.js'], { encoding: 'utf8' }), before);
const json = value => JSON.stringify(value);
for (const old of before.window.FPS_LAYOUT.instances) {
  // 山区改动由 mountain/mountain-detail 回归覆盖, 此处保护车站/公园/连接区.
  if (old.id.startsWith('port-') || old.id.startsWith('mountain-') || ['reserved-district-ground', 'sagami-bay', 'coastal-beach'].includes(old.id)) continue;
  const current = layout.instances.find(i => i.id === old.id);
  assert.equal(json(current), json(old), old.id + ' 被意外修改');
}
assert.equal(new Set(layout.instances.map(i => i.id)).size, layout.instances.length);
assert.equal(layout.regionPlan.corners[3].status, 'developed');
const transform = data => {
  const pose = new T.Object3D(); pose.position.set(...data.position); pose.rotation.set(...data.rotation); pose.scale.set(...data.scale); pose.updateMatrix(); return pose.matrix;
};
const solids = layout.instances.filter(i => i.collision.enabled && !i.collision.dynamic).flatMap(i => i.collision.boxes.map(b => {
  assert(b.size.every(n => Number.isFinite(n) && n > 0) && b.offset.every(Number.isFinite), i.id);
  const center = new T.Vector3(...b.offset), half = new T.Vector3(...b.size).multiplyScalar(.5);
  return { id: i.id, box: new T.Box3(center.clone().sub(half), center.clone().add(half)).applyMatrix4(transform(i)) };
}));
const html = read('index.html');
const physics = vm.createContext({ THREE: T, solids });
vm.runInContext(`const T = THREE, solid = solids, actors = [], api = {spawn: new T.Vector3(78,2.4,44)};
  const player = {position:new T.Vector3(), debug:false}; player.body={root:player,radius:.32,height:1.75,vy:0,grounded:false};
  ${html.slice(html.indexOf('const STEP_HEIGHT'), html.indexOf('function separateBodies()'))}
  globalThis.test = {player,move,fall,blockedAt,footprint};`, physics);
const { player, move, fall, blockedAt } = physics.test;
function spawn(p) {
  player.position.set(...p); player.body.vy = 0; player.body.grounded = false;
  for (let i = 0; i < 30; i++) fall(player.body, 1 / 60);
  assert(!blockedAt(player.position, .32, 1.75, []), '出生点挤入实体: ' + json(p));
}
function walkTo(target, speed = 4.7) {
  const length = Math.hypot(target[0] - player.position.x, target[2] - player.position.z);
  for (let i = 0; i < Math.ceil((length / speed + 1) * 60); i++) {
    const dx = target[0] - player.position.x, dz = target[2] - player.position.z, distance = Math.hypot(dx, dz);
    if (distance > .001) { const step = Math.min(distance, speed / 60); move(player, dx / distance * step, dz / distance * step); }
    fall(player.body, 1 / 60);
    assert(!blockedAt(player.position, .32, 1.75, []), '行走进入实体: ' + json(player.position.toArray()));
  }
  assert(Math.hypot(target[0] - player.position.x, target[2] - player.position.z) < .05, '路径受阻: ' + json({ target, actual: player.position.toArray() }));
  assert(Math.abs(player.position.y - target[1]) < .05, '落脚高度错误: ' + json({ target, actual: player.position.toArray() }));
}
const routes = layout.regionPlan.corners[3].routes;
for (const route of routes.stairs) {
  const direction = new T.Vector3(...route.b).sub(new T.Vector3(...route.a)); direction.y = 0; direction.normalize();
  const a = route.a.map((v, i) => v - direction.getComponent(i) * .7), b = route.b.map((v, i) => v + direction.getComponent(i) * .4);
  spawn([a[0], a[1] + .1, a[2]]); walkTo(b);
  spawn([b[0], b[1] + .1, b[2]]); walkTo(a);
  console.log('PASS 楼梯往返 ' + route.id);
}
for (const path of [
  [[60, 2.4, 44], [78, 2.4, 44]],
  [[95, 8.4, 34.9], [100, 8.4, 34.9]],
  [[103.2, 8.4, 34.6], [100, 8.4, 34.6]],
  [[152, 8.4, 23.6], [156, 8.4, 23.6]],
  [[163.5, 8.4, 23.4], [159.2, 8.4, 23.4]],
  [[122.8, 5.4, 47], [126, 5.4, 47], [137, 5.4, 47], [155, 5.4, 47]],
  [[146, 2.4, 29], [146, 2.44, 34], [146, 2.44, 50], [146, 2.4, 54]],
  [[146, 2.44, 42], [161, 2.4, 42]],
  [[92, 2.4, 25], [97, 2.4, 25]]
]) {
  spawn([path[0][0], path[0][1] + .1, path[0][2]]);
  for (const target of path.slice(1)) walkTo(target);
  for (const target of path.slice(0, -1).reverse()) walkTo(target);
}
console.log('PASS 箱顶连接, 西侧入口, 仓库门洞及夹层往返');
spawn([100, .7, -4.3]);
for (const target of [[100, 1.35, -5.8], [98.4, 2.1, -6.6], [96.8, 2.85, -7.4], [96, 3.6, -9.5]]) {
  assert(player.body.grounded); player.body.vy = 6.1; player.body.grounded = false; walkTo(target);
}
console.log('PASS 原有跳跃能力登上沿岸货柜');
spawn([80, .7, -15]);
for (let i = 0; i < 150; i++) { move(player, 0, -.1); fall(player.body, 1 / 60); }
assert(player.position.z > -17.5 && player.position.y > .59);
const supporting = (x, z) => solids.filter(({ box }) => x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z).map(s => s.box.max.y);
assert(Math.abs(Math.max(...supporting(78, -7)) - .6) < .0001, '旧台地仍覆盖低处码头');
assert.equal(port.length, 14);
const budgets = { portGround: 1, cargoContainer: 3, portAccess: 2, portWarehouse: 5, portCrane: 4, cargoShip: 3, portFixtures: 3,
  portReachstacker: 5, portForklift: 4, portTerminalTractor: 5, portCargoWorkarea: 4, portService: 6, portUtilities: 4, verticalLadder: 2 };
const models = [];
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
for (const data of port) {
  const source = read(layout.catalog[data.model]);
  assert(!/\b(?:import|fetch|requestAnimationFrame|setInterval|setTimeout)\s*\(/.test(source), data.model);
  const standalone = vm.createContext({ FPS: { models: {} }, document, console });
  vm.runInContext(source, standalone);
  assert.equal(Object.keys(standalone.FPS.models).length, 1);
  const options = freeze(structuredClone(data.options)), snapshot = json(options), instance = standalone.FPS.models[data.model](T, options);
  assert.equal(json(options), snapshot); assert(instance.root.isObject3D); assert(!instance.update);
  instance.root.position.set(...data.position); instance.root.rotation.set(...data.rotation); instance.root.scale.set(...data.scale); instance.root.updateWorldMatrix(true, true);
  const meshes = []; let triangles = 0;
  instance.root.traverse(n => {
    if (!n.isMesh) return;
    meshes.push(n); triangles += (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3;
    for (const a of Object.values(n.geometry.attributes)) assert(a.array.every(Number.isFinite), data.model + ' 非有限顶点');
    n.geometry.computeBoundingBox(); n.geometry.computeBoundingSphere();
    assert(n.geometry.boundingSphere.radius > 0 && Number.isFinite(n.geometry.boundingSphere.radius));
  });
  assert.equal(meshes.length, budgets[data.model], data.model + ' 绘制预算');
  models.push({ data, instance, meshes });
  console.log(`PASS 独立装配 ${data.model}: ${meshes.length} meshes / ${Math.round(triangles)} triangles`);
}
const cargo = models.find(m => m.data.model === 'cargoContainer'), ray = new T.Raycaster();
for (const path of [
  [[78, 2.4, 4.6], [78, 2.4, 56]],
  [[113, 2.4, 43], [119.7, 2.4, 43], [119.7, 2.4, 55], [114, 2.4, 55]],
  [[114, 2.4, 24], [114, 2.4, 27.6], [130.5, 2.4, 27.6], [130.5, 2.4, 22.9]],
  [[147.5, 2.44, 34], [147.5, 2.44, 41.5], [152.3, 2.44, 41.5], [152.3, 2.44, 34]],
  [[146, 5.4, 47], [146, 5.4, 49.7]],
  [[112, .6, -7], [120, .6, -7], [120, .6, -13.5]]
]) {
  spawn([path[0][0], path[0][1] + .1, path[0][2]]); for (const p of path.slice(1)) walkTo(p);
  for (const p of path.slice(0, -1).reverse()) walkTo(p);
}
console.log('PASS 新增车辆绕行, 西侧完整车道, 仓库货位/夹层与岸边通行');
// 新设备以真实三角面遮挡射击, 保留机械空隙; 身体碰撞不按细构件膨胀.
const equipment = name => models.find(m => m.data.model === name);
for (const [name, origin, direction, distance] of [
  ['portReachstacker', [116.6, 4.4, 56], [0, 0, -1], 4],
  ['portForklift', [150, 3.6, 41], [0, 0, -1], 4],
  ['portTerminalTractor', [115, 4, 25], [1, 0, 0], 6],
  ['portCargoWorkarea', [141.6, 4.9, 35], [0, 0, 1], 5],
  ['portService', [73.5, 4, 40], [0, 0, -1], 5]
]) {
  ray.set(new T.Vector3(...origin), new T.Vector3(...direction)); ray.far = distance;
  const hit = ray.intersectObject(equipment(name).instance.root, true)[0]; assert(hit, '新增设施无法命中: ' + name);
  assert(Number.isFinite(hit.distance) && hit.face.normal.length() > .9);
}
const rig = equipment('portTerminalTractor');
ray.set(new T.Vector3(125.04, 5.4, 25), new T.Vector3(0, -1, 0)); ray.far = 2.2;
assert.equal(ray.intersectObject(rig.instance.root, true).length, 0, '开放挂车骨架被隐藏大盒封住');
ray.set(new T.Vector3(141, 4.9, 35), new T.Vector3(0, 0, 1)); ray.far = 5;
assert.equal(ray.intersectObject(equipment('portCargoWorkarea').instance.root, true).length, 0, '货架中间空隙被隐藏挡板封住');
const ground = equipment('portGround');
for (const inset of ground.data.options.insets) {
  const [x, y, z] = inset.position, alongZ = inset.size[1] > inset.size[0], length = Math.max(...inset.size), count = Math.ceil(length / .14);
  const local = [x + (alongZ ? 0 : -inset.size[0] / 2 + length / count), y + .15, z + (alongZ ? -inset.size[1] / 2 + length / count : 0)];
  ray.set(new T.Vector3(local[0] + 120, local[1], local[2] + 20), new T.Vector3(0, -1, 0)); ray.far = .3;
  const hit = ray.intersectObject(ground.instance.root, true)[0]; assert(hit && hit.point.y < y - .02, '格栅空隙下存在未挖去的共面顶面');
}
const crane = equipment('portCrane');
for (const x of [143, 157]) for (const z of [-12.5, -4.5]) {
  ray.set(new T.Vector3(x - .62, 1.025, z - .5), new T.Vector3(0, 0, 1)); ray.far = .6;
  const side = ray.intersectObject(crane.instance.root, true)[0]; assert(side && Math.abs(side.distance - .39) < .003 && side.face.normal.z < -.99, '岸吊轮轴方向未对齐轨道');
  ray.set(new T.Vector3(x - .62, .62, z), new T.Vector3(0, 1, 0)); ray.far = .1;
  const foot = ray.intersectObject(crane.instance.root, true)[0]; assert(foot && Math.abs(foot.point.y - .655) < .001, '岸吊轮组与轨面悬空或相穿');
}
for (const [x, z, footY] of [[144.85, -12.85, 16.6], [154.2, -5.5, 16.525]]) {
  // 从房体内部向下取样, 前面剔除会略过房底, 必须命中其下方朝上的实际托台.
  ray.set(new T.Vector3(x, footY + .2, z), new T.Vector3(0, -1, 0)); ray.far = .25;
  const support = ray.intersectObject(crane.instance.root, true)[0]; assert(support && Math.abs(support.point.y - footY) < .001 && support.face.normal.y > .99, '吊机偏置房体没有支承底座');
}
for (const name of ['portReachstacker', 'portForklift', 'portTerminalTractor']) {
  const m = equipment(name), bounds = new T.Box3().setFromObject(m.instance.root);
  assert(Math.abs(bounds.min.y - m.data.position[1]) < .005, '车辆轮胎悬空或沉入地面: ' + name);
}
console.log('PASS 新设施射击, 挂车真实空隙, 格栅下地面挖空');
const utilities = equipment('portUtilities');
for (const [origin, direction] of [[[150.6, 7.2, 31.8], [0, 0, 1]], [[139, 7.4, 52.2], [0, 0, -1]], [[159.2, 9.45, 45.6], [-1, 0, 0]]]) {
  ray.set(new T.Vector3(...origin), new T.Vector3(...direction)); ray.far = 1.2;
  const hit = ray.intersectObject(utilities.instance.root, true)[0]; assert(hit && hit.distance < .65, '通风格栅朝向或面法线错误');
  assert(hit.face.normal.dot(ray.ray.direction) < -.8);
}
for (const vent of utilities.data.options.roofVents) {
  const [x, y, z] = vent.position; ray.set(new T.Vector3(x + 120, y + 1.7, z + 20), new T.Vector3(0, -1, 0)); ray.far = .4;
  const hit = ray.intersectObject(utilities.instance.root, true)[0]; assert(hit && Math.abs(hit.point.y - y - 1.48) < .001, '排气罩顶部悬空或方向错误');
}
for (const [x, z] of [[157.1, 32.9], [134.7, 51.1]]) {
  ray.set(new T.Vector3(x - .2, 3.1, z), new T.Vector3(1, 0, 0)); ray.far = .3;
  const bracket = ray.intersectObject(utilities.instance.root, true)[0]; assert(bracket && Math.abs(bracket.distance - .175) < .003, '管线卡箍没有接回墙面');
}
ray.set(new T.Vector3(145.5, 10.15, 42), new T.Vector3(1, 0, 0)); ray.far = 1.3;
const suspension = ray.intersectObject(utilities.instance.root, true)[0]; assert(suspension && Math.abs(suspension.distance - .341) < .003, '电缆桥架没有连接屋架的吊杆');
const groundMaterial = ground.meshes[0].material, roughMap = groundMaterial.roughnessMap;
assert.equal(roughMap.image.width, 512); assert.equal(roughMap.colorSpace, '');
const roughPixels = roughMap.image.getContext('2d').pixels;
const roughAt = (x, z) => {
  const px = Math.floor((x / ground.data.options.width + .5) * 512), py = Math.floor((z / ground.data.options.depth + .5) * 512);
  return roughPixels[(py * 512 + px) * 4 + 1];
};
assert(roughAt(0, 0) > 240, '干地面意外变得光滑');
for (const patch of ground.data.options.dampPatches) assert(roughAt(...patch.position) < 190, '湿润区没有对应粗糙度');
assert(roughPixels.every((value, i) => i % 4 === 3 ? value === 255 : value >= 135 && value <= 245), '粗糙度蒙版越界');
console.log('PASS 三面通风设备, 排气罩和静态潮湿蒙版');
const access = models.find(m => m.data.model === 'portAccess');
const landingIds = ['stack-a-west', 'stack-a-roof', 'stack-b-south', 'stack-b-back', 'warehouse-inside-137', 'warehouse-inside-155'];
for (const route of routes.stairs.filter(s => landingIds.includes(s.id))) for (const side of [-1, 1]) {
  const end = new T.Vector3(route.b[0] + side * (route.width / 2 - .03), route.b[1], route.b[2]);
  const connections = routes.rails.filter(r => [r.a, r.b].some(p => new T.Vector3(...p).distanceTo(end) < 1e-5));
  assert(connections.length >= 2, '平台平栏没有接到楼梯端柱: ' + route.id);
}
for (const route of routes.stairs.filter(s => s.id.startsWith('warehouse-inside-'))) for (const side of [-1, 1]) for (const lift of [.55, 1.1]) {
  const x = route.b[0] + side * (route.width / 2 - .03);
  // 沿图中断缝所在位置密集取样, 用真实三角面验证连续性, 不只检查配置点.
  for (let i = 0; i <= 20; i++) {
    ray.set(new T.Vector3(x + side * i * .02, route.b[1] + lift, route.b[2] - .45), new T.Vector3(0, 0, 1)); ray.near = 0; ray.far = .9;
    assert(ray.intersectObject(access.instance.root, true).length, '夹层横栏存在可见断缝');
  }
}
const fixtures = models.find(m => m.data.model === 'portFixtures');
for (let y = .7; y < 3.59; y += .04) {
  ray.set(new T.Vector3(169.25, y, 3.4), new T.Vector3(1, 0, 0)); ray.far = .6;
  assert(ray.intersectObject(fixtures.instance.root, true).length, '高低岸护栏共用立柱不连续');
}
console.log('PASS 夹层断缝三角面取样, 六处楼梯落台连接, 码头高低护栏整柱');
for (const rope of fixtures.data.options.ropes) {
  const a = new T.Vector3(...rope.a), b = new T.Vector3(...rope.b), axis = b.clone().sub(a), cross = new T.Vector3(-axis.z, 0, axis.x).normalize();
  const middle = a.clone().add(b).multiplyScalar(.5); middle.y -= rope.sag; middle.add(new T.Vector3(120, 0, 20));
  ray.set(middle.clone().addScaledVector(cross, .25), cross.clone().negate()); ray.far = .3;
  const hit = ray.intersectObject(fixtures.instance.root, true)[0];
  assert(hit && Math.abs(hit.distance - .205) < .004 && hit.face.normal.dot(cross) > .8, '缆绳曲面绕序/法线错误');
  const t = (-17.7 - (a.z + 20)) / axis.z;
  const lowerEdge = a.y + axis.y * t - rope.sag * 4 * t * (1 - t) - .045;
  assert(lowerEdge > 1.23 && lowerEdge < 1.7, '缆绳穿入岸边横栏');
}
for (const sign of fixtures.data.options.signs) {
  const face = new T.Vector3(Math.sin(sign.yaw), 0, Math.cos(sign.yaw)), center = new T.Vector3(...sign.position).add(new T.Vector3(120, 0, 20));
  ray.set(center.addScaledVector(face, .5), face.clone().negate()); ray.far = .6;
  const hit = ray.intersectObject(fixtures.instance.root, true)[0]; assert(hit && Math.abs(hit.distance - .39) < .002 && hit.object.material.map, '港区标牌没有真实印字面');
}
console.log('PASS 缆绳真实曲面, 岸栏净距和港区实体标牌');
const opened = cargo.data.options.units.filter(u => u.openEnds.length);
assert.equal(opened.length, 6); assert.equal(cargo.data.options.units.length - opened.length, 20);
function unitPoint(u, p) {
  const pose = new T.Object3D(); pose.position.set(...u.position); pose.rotation.y = u.yaw; pose.updateMatrix();
  return new T.Vector3(...p).applyMatrix4(pose.matrix).applyMatrix4(cargo.instance.root.matrixWorld);
}
function unitDirection(u, sign) { return new T.Vector3(Math.sin(u.yaw) * sign, 0, Math.cos(u.yaw) * sign); }
for (const u of opened) {
  for (const sign of u.openEnds) {
    const outside = unitPoint(u, [0, .1, sign * (u.length / 2 + 1)]), inside = unitPoint(u, [0, u.skin.floor, 0]);
    spawn(outside.toArray()); walkTo(inside.toArray());
    walkTo(unitPoint(u, [0, 0, sign * (u.length / 2 + 1)]).toArray());
    const origin = unitPoint(u, [0, 1.2, sign * (u.length / 2 + 1)]);
    ray.set(origin, unitDirection(u, -sign)); ray.far = u.length / 2 + 1.1;
    assert.equal(ray.intersectObject(cargo.instance.root, true).length, 0, '开门箱中存在隐藏端墙');
    for (const side of [-1, 1]) {
      const leaf = (u.width - .28) / 2, yaw = sign * side * u.doorAngle, angle = u.yaw + yaw;
      const middle = unitPoint(u, [side * (u.width / 2 - .14) - side * leaf / 2 * Math.cos(yaw), 1.2, sign * (u.length / 2 - .055) + side * leaf / 2 * Math.sin(yaw)]);
      const normal = new T.Vector3(Math.sin(angle) * sign, 0, Math.cos(angle) * sign);
      ray.set(middle.clone().addScaledVector(normal, .4), normal.clone().negate()); ray.far = .8;
      const door = ray.intersectObject(cargo.instance.root, true)[0]; assert(door && door.distance < .5, '门扇没有真实射击面');
      assert(blockedAt(door.point.clone().add(new T.Vector3(0, -1, 0)), .32, 1.75, []), '打开的门扇没有身体阻挡');
    }
  }
  if (u.openEnds.length === 2) {
    spawn(unitPoint(u, [0, .1, -u.length / 2 - 1]).toArray());
    walkTo(unitPoint(u, [0, u.skin.floor, 0]).toArray()); walkTo(unitPoint(u, [0, 0, u.length / 2 + 1]).toArray());
    ray.set(unitPoint(u, [0, 1.2, -u.length / 2 - 1]), unitDirection(u, 1)); ray.far = u.length + 2;
    assert.equal(ray.intersectObject(cargo.instance.root, true).length, 0, '双开箱无法前后射击');
  } else {
    const sign = -u.openEnds[0], origin = unitPoint(u, [0, 1.2, 0]); ray.set(origin, unitDirection(u, sign)); ray.far = u.length / 2 + .1;
    const back = ray.intersectObject(cargo.instance.root, true)[0];
    assert(back && Math.abs(back.distance - (u.length / 2 - u.skin.end)) < .002, '封闭背墙没有真实内表面');
    spawn(unitPoint(u, [0, u.skin.floor + .1, sign * (u.length / 2 - 1)]).toArray());
    const direction = unitDirection(u, sign);
    for (let i = 0; i < 30; i++) { move(player, direction.x * .1, direction.z * .1); fall(player.body, 1 / 60); }
    const gap = back.point.clone().sub(player.position).dot(direction); assert(gap >= .31 && gap < .35, '身体穿过封闭背墙');
  }
}
for (const u of cargo.data.options.units.filter(u => !u.openEnds.length)) {
  // 相邻箱/楼梯可能占据入口外侧, 只检查关门表面与箱内实体.
  const center = unitPoint(u, [0, .2, 0]); assert(blockedAt(center, .32, 1.75, []), '关门箱没有实体阻挡');
  ray.set(unitPoint(u, [0, 1.2, -u.length / 2 - .7]), unitDirection(u, 1)); ray.far = .8;
  assert(ray.intersectObject(cargo.instance.root, true).length, '关闭箱门没有射击表面');
}
console.log('PASS 六个开门箱进出, 双开箱穿行/射击, 内部背墙和二十个关门箱');
const original = T.Mesh.prototype.raycast;
function compareRay(origin, direction) {
  ray.set(origin, direction); ray.near = 0; ray.far = 200;
  for (const mesh of cargo.meshes.filter(n => n.name !== 'cargo-print')) {
    const fast = [], reference = []; mesh.raycast(ray, fast); original.call(mesh, ray, reference);
    fast.sort((a, b) => a.distance - b.distance || a.faceIndex - b.faceIndex); reference.sort((a, b) => a.distance - b.distance || a.faceIndex - b.faceIndex);
    assert.equal(fast.length, reference.length, '逐箱射线遗漏');
    fast.forEach((hit, i) => {
      const expected = reference[i]; assert.equal(hit.object, mesh); assert.equal(hit.faceIndex, expected.faceIndex);
      assert(hit.point.distanceTo(expected.point) < 1e-7 && hit.face.normal.distanceTo(expected.face.normal) < 1e-7);
      assert.equal(hit.face.a, expected.face.a); assert.equal(hit.face.b, expected.face.b); assert.equal(hit.face.c, expected.face.c);
    });
  }
}
for (const u of cargo.data.options.units) {
  const center = new T.Vector3(...u.position).add(new T.Vector3(120, u.height / 2, 20));
  for (const axis of [new T.Vector3(1, 0, 0), new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1)]) for (const sign of [-1, 1])
    compareRay(center.clone().addScaledVector(axis, sign * 30), axis.clone().multiplyScalar(-sign));
}
// 非均匀缩放/旋转后的世界命中点与原始面编号保持一致.
cargo.instance.root.position.set(13, 4, -6); cargo.instance.root.rotation.set(.13, .43, -.08); cargo.instance.root.scale.set(1.2, .9, 1.05); cargo.instance.root.updateWorldMatrix(true, true);
for (const u of cargo.data.options.units.slice(0, 5)) {
  const center = new T.Vector3(...u.position).add(new T.Vector3(0, 1.5, 0)).applyMatrix4(cargo.instance.root.matrixWorld);
  compareRay(center.clone().add(new T.Vector3(0, 30, 0)), new T.Vector3(0, -1, 0));
}
cargo.instance.root.position.set(...cargo.data.position); cargo.instance.root.rotation.set(...cargo.data.rotation); cargo.instance.root.scale.set(...cargo.data.scale); cargo.instance.root.updateWorldMatrix(true, true);
for (const u of cargo.data.options.units) {
  const world = new T.Vector3(...u.position).add(new T.Vector3(120, u.height + .2, 20)); ray.set(world, new T.Vector3(0, -1, 0)); ray.far = .3;
  const hit = ray.intersectObject(cargo.instance.root, true)[0]; assert(hit && hit.distance <= .215, '箱顶碰撞悬空');
}
console.log('PASS 六面射击, 逐箱剔除与原网格等价, 仿射变换, 箱顶支撑');
const samples = cargo.data.options.units.map(u => new T.Vector3(...u.position).add(new T.Vector3(140, 1.5, 20)));
function rayCost(optimized) {
  const start = performance.now();
  for (let i = 0; i < 260; i++) {
    ray.set(samples[i % samples.length], new T.Vector3(-1, 0, 0)); ray.near = .025; ray.far = 100;
    for (const mesh of cargo.meshes.filter(n => n.name !== 'cargo-print')) (optimized ? mesh.raycast : original).call(mesh, ray, []);
  }
  return (performance.now() - start) / 260;
}
rayCost(true); rayCost(false);
console.log(`CPU 射线抽样: 逐箱剔除 ${rayCost(true).toFixed(3)} ms / 原合批遍历 ${rayCost(false).toFixed(3)} ms; 不代表 GPU 帧数`);
const warehouse = models.find(m => m.data.model === 'portWarehouse');
const floor = warehouse.meshes[3], wall = warehouse.meshes[0];
assert.notEqual(floor.material.map, wall.material.map, '仓内地面仍共用板墙纹理');
for (let i = 0; i < floor.geometry.attributes.position.count; i++) if (floor.geometry.attributes.normal.getY(i) > .5) {
  const uv = floor.geometry.attributes.uv; assert(uv.getX(i) >= 0 && uv.getX(i) <= 1 && uv.getY(i) >= 0 && uv.getY(i) <= 1, '仓内分区标线 UV 越界');
}
for (const [model, origin, direction, distance] of [[warehouse, [146, 7.86, 32], [0, 0, 1], .8], [crane, [150, 15, -3], [0, 0, -1], .97]]) {
  ray.set(new T.Vector3(...origin), new T.Vector3(...direction)); ray.far = 1.5;
  const hit = ray.intersectObject(model.instance.root, true)[0]; assert(hit && Math.abs(hit.distance - distance) < .002 && hit.object.material.map, '仓库/岸吊印字牌几何错位');
}
for (const [origin, direction] of [[[146, 4, 29], [0, 0, 1]], [[161, 4, 42], [-1, 0, 0]], [[132, 6.2, 47], [1, 0, 0]]]) {
  ray.set(new T.Vector3(...origin), new T.Vector3(...direction)); ray.far = 4;
  assert.equal(ray.intersectObject(warehouse.instance.root, true).length, 0, '门洞中存在可见或射击挡板');
}
let disposedMaps = 0;
for (const model of models) {
  const privateMaps = new Set(), released = new Set();
  model.meshes.forEach(mesh => Object.values(mesh.material).forEach(value => { if (value?.isTexture) privateMaps.add(value); }));
  privateMaps.forEach(map => map.addEventListener('dispose', () => released.add(map)));
  model.instance.dispose?.(); assert.equal(released.size, privateMaps.size, model.data.model + ' 未释放私有纹理'); disposedMaps += released.size;
  const geometries = new Set(), materials = new Set();
  model.instance.root.traverse(n => { if (n.geometry) geometries.add(n.geometry); if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => materials.add(m)); });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}
console.log(`PASS 仓内地面材质/标线, 实体牌面, ${disposedMaps} 张私有纹理释放`);
// 默认配置同样只加载自身文件, 删除场景配置后仍能独立接入.
for (const data of port) {
  const standalone = vm.createContext({ FPS: { models: {} }, document, console }); vm.runInContext(read(layout.catalog[data.model]), standalone);
  const model = standalone.FPS.models[data.model](T, {}); let meshes = 0;
  model.root.traverse(n => { if (n.isMesh) { meshes++; assert(Object.values(n.geometry.attributes).every(a => a.array.every(Number.isFinite))); } });
  assert(meshes > 0 && meshes <= budgets[data.model]); model.dispose?.();
}
console.log('PASS 十四个模型的默认配置独立装配');
// 港池海床与海面共用深度, 原车站前方沙滩顶点/颜色/法线保持一致.
const coast = vm.createContext({ FPS: { models: {} }, document });
for (const file of ['coastal-beach', 'kamakura-ocean']) vm.runInContext(read(`models/${file}.js`), coast);
const beachData = layout.instances.find(i => i.id === 'coastal-beach'), oceanData = layout.instances.find(i => i.id === 'sagami-bay');
const beach = coast.FPS.models.coastalBeach(T, beachData.options), oldBeach = coast.FPS.models.coastalBeach(T, { ...beachData.options, basins: [] });
const beachGeometry = beach.root.children[0].geometry, oldGeometry = oldBeach.root.children[0].geometry;
for (let i = 0; i < beachGeometry.attributes.position.count; i++) {
  const p = beachGeometry.attributes.position;
  if (p.getX(i) <= 50) for (const name of ['position', 'color', 'normal', 'uv']) {
    const a = beachGeometry.attributes[name], b = oldGeometry.attributes[name];
    for (let j = 0; j < a.itemSize; j++) assert.equal(a.array[i * a.itemSize + j], b.array[i * b.itemSize + j]);
  }
  if (p.getX(i) >= 70) assert(p.getY(i) <= -6, '港池中残留浅沙滩');
}
assert.equal(json(beachData.options.basins[0]), json(oceanData.options.harbor));
const ocean = coast.FPS.models.kamakuraOcean(T, oceanData.options); ocean.root.updateWorldMatrix(true, true);
const edge = mesh => {
  const p = mesh.geometry.attributes.position, xs = [], point = new T.Vector3();
  for (let i = 0; i < p.count; i++) { point.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld); if (Math.abs(point.z + 30) < 1e-5) xs.push(point.x); }
  return xs;
};
const nearEdge = edge(ocean.root.children[0]), harborEdge = edge(ocean.root.children.at(-1));
assert(harborEdge.length > 2); harborEdge.forEach(x => assert(nearEdge.some(oldX => Math.abs(oldX - x) < 1e-6), '海面接边顶点未对齐'));
assert.equal(ocean.root.children.at(-1).material, ocean.root.children[0].material);
console.log('PASS 港池深度/海面接边, 车站前方沙滩几何保持一致');
console.log(`PASS 码头回归完成: ${routes.stairs.length} 条楼梯往返, ${port.length} 个独立模型, ${solids.filter(s => s.id.startsWith('port-')).length} 个静态碰撞盒`);
