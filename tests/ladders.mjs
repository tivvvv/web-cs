// 纯 Node 竖梯回归, 执行主流程原装配/控制/物理, 不启动浏览器.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8'), html = read('index.html');
const document = { createElement() { return { width: 1, height: 1, getContext() { return { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }; } }; } };
const context = vm.createContext({ window: {}, FPS: { models: {} }, document, console, AbortController });
vm.runInContext(read('vendor/three.min.js'), context);
vm.runInContext(read('scene-kamakura.js'), context);
vm.runInContext(read('models/vertical-ladder.js'), context);
vm.runInContext(`
  const T=THREE, scene=new T.Scene(), camera=new T.PerspectiveCamera(), solid=[], actors=[], entries=[], ladders=[], keys=new Set(), hints={};
  const player={position:new T.Vector3(),debug:false}; player.body={root:player,radius:.32,height:1.75,vy:0,grounded:false};
  let yaw=0,pitch=0,walk=0,weapon,renderEffect; const api={spawn:new T.Vector3(78,2.4,44)}, $=id=>hints[id]??=( {} );
  ${html.slice(html.indexOf('const STEP_HEIGHT'), html.indexOf('function separateBodies()'))}
  ${html.slice(html.indexOf('function createInstance('), html.indexOf('function toggleEnemies()'))}
  ${html.slice(html.indexOf('function updatePlayer(dt)'), html.indexOf('function showMenu('))}
  globalThis.test={T,scene,solid,actors,entries,ladders,keys,player,hints,createInstance,updatePlayer,fall,blockedAt,physicalBodies,nearbyLadder,
    face:n=>{yaw=Math.atan2(n.x,n.z);},buildClimbRoutes};
`, context);
const t = context.test, layout = context.window.FPS_LAYOUT, data = layout.instances.find(i => i.model === 'verticalLadder');
assert(data && data.traversal.ladders.length === 4);
for (const entry of layout.instances.filter(i => i !== data && i.collision.enabled && !i.collision.dynamic)) {
  const pose = new t.T.Object3D(); pose.position.set(...entry.position); pose.rotation.set(...entry.rotation); pose.scale.set(...entry.scale); pose.updateMatrix();
  for (const part of entry.collision.boxes) {
    const center = new t.T.Vector3(...part.offset), half = new t.T.Vector3(...part.size).multiplyScalar(.5);
    t.solid.push({ box: new t.T.Box3(center.clone().sub(half), center.clone().add(half)).applyMatrix4(pose.matrix), id: entry.id });
  }
}
const instance = t.createInstance(data), routes = [...t.ladders];
assert.equal(t.entries.length, 1); assert.equal(routes.length, 4);
const ray = new t.T.Raycaster(); ray.far = .9;
for (const route of routes) {
  const origin = route.line.clone().addScaledVector(route.normal, .35); origin.y += .16;
  ray.set(origin, route.normal.clone().negate()); const rung = ray.intersectObject(instance.root, true)[0];
  assert(rung && Math.abs(rung.distance - .752) < .004, '竖梯踏棍没有真实射击面');
  const h = route.top.y - route.bottom.y, count = Math.ceil((h - .12) / .28); origin.y += (h - .24) / (count - 1) / 2;
  ray.set(origin, route.normal.clone().negate()); assert.equal(ray.intersectObject(instance.root, true).length, 0, '踏棍空隙被隐藏面封住');
}
const gallery = routes[3], post = gallery.top.clone().addScaledVector(gallery.side, .7).addScaledVector(gallery.normal, -.18); post.y += .4;
ray.set(post.addScaledVector(gallery.normal, .2), gallery.normal.clone().negate()); ray.far = .3;
assert.equal(ray.intersectObject(instance.root, true).length, 0, '夹层原立柱处生成了重复梯柱');
console.log('PASS 踏棍射击面/真实空隙及夹层立柱复用');
const tick = (count = 1, dt = 1 / 60) => {
  for (let i = 0; i < count; i++) {
    t.updatePlayer(dt);
    assert(!t.blockedAt(t.player.position, .32, 1.75, t.physicalBodies(t.player)), '攀爬进入实体: ' + JSON.stringify(t.player.position.toArray()));
  }
};
function place(p, normal) {
  t.keys.clear(); t.player.position.copy(p); Object.assign(t.player.body, { ladder: null, nearLadder: null, climbCooldown: 0, ladderTop: false, vy: 0, grounded: false });
  t.face(normal); for (let i = 0; i < 5; i++) t.fall(t.player.body, 1 / 60);
  assert(!t.blockedAt(t.player.position, .32, 1.75, []), '竖梯入口嵌入实体');
}
function untilExit() {
  let frames = 0; while (t.player.body.ladder && frames++ < 800) tick();
  assert(frames < 800, '竖梯卡在中途或出口'); t.keys.clear(); tick(3);
}
function finish(key) {
  t.keys.clear(); t.keys.add(key); tick(); assert(t.player.body.ladder, '竖梯无法挂接: ' + key); untilExit();
}
for (const [i, route] of routes.entries()) {
  place(route.line.clone().addScaledVector(route.normal, .2), route.normal);
  finish('KeyW'); assert(t.player.position.distanceTo(route.exit) < .03 && t.player.body.grounded, '梯顶无法落脚: ' + i);
  finish('KeyS'); assert(Math.abs(t.player.position.y - route.bottom.y) < .03 && t.player.body.grounded, '梯底无法落脚: ' + i);
  console.log('PASS 竖梯上下与顶部出口 ' + data.traversal.ladders[i].id);
}
for (const route of [routes[0], routes[3]]) {
  place(route.line.clone().addScaledVector(route.normal, .15).addScaledVector(route.side, .25), route.normal);
  t.keys.add('KeyW'); tick(1, .05); assert(t.player.body.ladder);
  let frames = 0; while (t.player.body.ladder && frames++ < 300) tick(1, .05);
  assert(frames < 300 && t.player.position.distanceTo(route.exit) < .03, '偏位或大步长攀爬卡住'); t.keys.clear(); tick(3);
}
console.log('PASS 偏位进入和 50 ms 步长的攀爬/出口扫掠');
const route = routes[0];
place(route.line, route.normal); t.keys.add('KeyW'); tick(35);
t.keys.clear(); const hanging = t.player.position.clone(); tick(60);
assert(t.player.position.distanceTo(hanging) < .001 && !t.player.body.grounded && t.player.body.vy === 0, '松键后没有停在梯子上');
assert.equal(t.hints['climb-help'].hidden, false);
t.keys.add('Space'); tick(); assert(!t.player.body.ladder && t.player.body.vy > 0, 'Space 没有跳离');
assert(t.player.position.clone().sub(hanging).dot(route.normal) > .25, '跳离没有向梯外移动');
t.keys.add('KeyW'); tick(8); assert(!t.player.body.ladder, '跳离后立即被吸回竖梯');
place(route.line, route.normal); t.keys.add('KeyW'); tick(25); t.keys.clear(); const beforeSide = t.player.position.clone(); t.keys.add('KeyA'); tick(10);
assert(!t.player.body.ladder && t.player.position.clone().sub(beforeSide).dot(route.side) < -.7, '侧移脱离被梯框碰撞困住');
console.log('PASS 悬停, 跳离, 侧移脱离和重新挂接保护');
place(route.line, route.normal.clone().negate()); t.keys.add('KeyW'); tick(8); assert(!t.player.body.ladder && t.player.body.grounded, '背向梯子行走被误吸附');
t.player.position.copy(route.bottom).addScaledVector(route.normal, -.5); t.player.position.y += 1;
assert(!t.nearbyLadder(), '从背墙内侧挂接竖梯');
console.log('PASS 朝向与正反面挂接限制');
const ceiling = { box: new t.T.Box3().setFromCenterAndSize(route.line.clone().add(new t.T.Vector3(0, 2.3, 0)), new t.T.Vector3(1.4, .3, 1.4)) };
t.solid.push(ceiling); place(route.line, route.normal); t.keys.add('KeyW'); tick(180);
assert(t.player.body.ladder && t.player.position.y < route.bottom.y + .45, '爬梯穿过顶部障碍'); t.solid.splice(t.solid.indexOf(ceiling), 1);
untilExit(); assert(t.player.position.distanceTo(route.exit) < .03, '障碍移除后不能继续攀爬');
const enemyRoot = new t.T.Object3D(); enemyRoot.position.copy(route.exit);
const enemy = { alive: true, body: { root: enemyRoot, radius: .4, height: 1.75 } }; t.actors.push(enemy);
place(route.line, route.normal); t.keys.add('KeyW'); tick(230);
assert(t.player.body.ladder && t.player.position.distanceTo(route.exit) >= .715, '顶部出口穿过动态身体');
t.actors.pop(); untilExit(); assert(!t.player.body.ladder && t.player.position.distanceTo(route.exit) < .03, '出口让开后不能落脚');
console.log('PASS 头顶扫掠与动态身体堵住/释放出口');
place(route.line, route.normal); t.keys.add('KeyW'); tick(30); const oldY = t.player.position.y;
instance.disabled = true; tick(); assert(!t.player.body.ladder && t.player.position.y < oldY, '失效模型仍可悬挂'); instance.disabled = false;
place(route.line, route.normal); t.keys.add('KeyW'); tick(30); instance.root.removeFromParent(); tick(); assert(!t.player.body.ladder, '已移除模型仍可攀爬'); t.scene.add(instance.root);
console.log('PASS 模块失效与卸载释放攀爬状态');
const transformed = t.createInstance({ ...data, id: 'transformed-ladder', position: [4, 1, -8], rotation: [0, .4, 0], scale: [1.2, 1.4, .8] });
const transformedRoute = t.ladders[routes.length];
assert(Math.abs(transformedRoute.width - 1.08) < .001 && Math.abs(transformedRoute.normal.length() - 1) < 1e-6);
assert(Math.abs(transformedRoute.normal.dot(transformedRoute.side)) < 1e-6);
assert(Math.abs(transformedRoute.top.y - transformedRoute.bottom.y - 8.4) < .001, '缩放后梯高错误');
assert(transformedRoute.line.clone().sub(transformedRoute.bottom).length() >= .4, '缩放后离墙间距不足');
const before = { entries: t.entries.length, roots: t.scene.children.length, ladders: t.ladders.length };
for (const invalid of [
  { traversal: { ladders: [{ ...data.traversal.ladders[0], width: 0 }] } },
  { traversal: { ladders: [{ ...data.traversal.ladders[0], exit: [0, 0, 0] }] } },
  { rotation: [.2, 0, 0] }, { attach: 'camera' }
]) assert.throws(() => t.createInstance({ ...data, id: 'invalid', ...invalid }));
assert.deepEqual({ entries: t.entries.length, roots: t.scene.children.length, ladders: t.ladders.length }, before, '无效路线留下孤立对象');
for (const e of [instance, transformed]) { e.dispose(); e.root.traverse(n => { n.geometry?.dispose(); n.material?.dispose(); }); }
console.log('PASS 旋转/缩放及错误配置隔离, 纯 Node 竖梯回归完成');
