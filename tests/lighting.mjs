// 光照模块的纯 Node 回归. 检查渲染预算/资源/材质兼容, 不启动浏览器或推算 GPU 帧率.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ShaderLib } from 'three';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = vm.createContext({ FPS: { models: {} }, AbortController });
vm.runInContext(read('vendor/three.min.js'), context);
for (const file of ['sun-rays', 'character-shadows']) vm.runInContext(read('models/' + file + '.js'), context);
const T = context.THREE, factories = context.FPS.models;
function renderer({ float = true, counts = [4, 2], maxSamples = 4, width = 1440, height = 900 } = {}) {
  let target = null;
  const calls = [], compiled = [], gl = { RGBA16F: 1, DEPTH_COMPONENT24: 2, RENDERBUFFER: 3, SAMPLES: 4,
    getInternalformatParameter: (_, format) => new Int32Array(Array.isArray(counts) ? counts : counts[format] ?? []) };
  return { calls, compiled, dimensions: { width, height }, capabilities: { maxSamples }, extensions: { has: () => float }, shadowMap: { autoUpdate: true }, autoClear: false,
    getContext: () => gl, getRenderTarget: () => target, setRenderTarget: value => { target = value; },
    getDrawingBufferSize(out) { return out.set(this.dimensions.width, this.dimensions.height); }, async compileAsync(scene) { compiled.push(scene.children[0]?.material); },
    render(scene, camera) { calls.push({ scene, camera, target, material: scene.children[0]?.material }); } };
}
function fixture() {
  const scene = new T.Scene(), view = new T.PerspectiveCamera(64, 1.6, .05, 8000);
  view.position.set(0, 1.7, 5); view.lookAt(0, 1, 0); view.updateMatrixWorld(true);
  const material = new T.MeshStandardMaterial({ color: 0x8f9478, roughness: .8 });
  const root = new T.Group(), box = new T.Mesh(new T.BoxGeometry(2, 2, 2), material);
  box.castShadow = box.receiveShadow = true; root.add(box); scene.add(root);
  return { scene, view, material, box, root };
}
function compile(material) {
  const shader = { vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader, uniforms: {} };
  material.onBeforeCompile(shader, {}); return shader;
}
function expand(shader) {
  return shader.replace(/#include <([\w]+)>/g, (_, name) => {
    assert.equal(typeof T.ShaderChunk[name], 'string', '缺少着色器片段 ' + name); return expand(T.ShaderChunk[name]);
  });
}
const f = fixture(), r = renderer(), outside = new T.WebGLRenderTarget(8, 8), effect = factories.sunRays(T, Object.freeze({}));
const originalCompile = f.material.onBeforeCompile, originalKey = f.material.customProgramCacheKey;
r.setRenderTarget(outside); effect.render(r, f.scene, f.view);
assert.equal(r.getRenderTarget(), outside);
assert.equal(r.calls.filter(c => c.scene === f.scene).length, 1, 'AO 不应重绘世界几何');
assert.equal(r.calls.length, 3, '背光帧只应包含世界/AO/合成, 不绘制光束或独立过滤');
const world = r.calls[0].target, sample = r.calls[1], composite = r.calls[2];
assert.equal(world.textures.length, 1, '不能重新引入全分辨率间接光附件'); assert.equal(world.samples, 4);
assert.equal(sample.target.width, 720); assert.equal(sample.target.height, 450);
assert.equal(sample.target.depthBuffer, false); assert.equal(sample.target.texture.minFilter, T.NearestFilter);
assert.equal(sample.material.uniforms.uDepthSize.value.y, 900);
assert.equal(sample.material.uniforms.uDistance.value, 40); assert.equal(sample.material.uniforms.uRadius.value, .85);
assert.equal(f.material.onBeforeCompile, originalCompile); assert.equal(f.material.customProgramCacheKey, originalKey, 'AO 不应触发世界材质重编译');
for (const material of [sample.material, composite.material]) for (const source of [material.vertexShader, material.fragmentShader]) assert(!expand(source).includes('#include'));
const resources = new Set([world, sample.target]), materials = new Set([sample.material, composite.material]);
const handles = r.calls.map(c => c.target); r.calls.length = 0;
for (let i = 0; i < 12; i++) {
  f.view.position.x += .3; f.view.rotation.y += .01; f.view.updateMatrixWorld(true); effect.render(r, f.scene, f.view);
}
assert(r.calls.every(c => handles.includes(c.target)), '移动/转向不能新建缓冲');
assert.equal(r.calls.filter(c => c.scene === f.scene).length, 12);
r.dimensions.width = 1920; r.dimensions.height = 1080; r.calls.length = 0; effect.render(r, f.scene, f.view);
assert.equal(r.calls[0].target, world); assert.equal(world.width, 1920); assert.equal(sample.target.width, 960);
f.view.lookAt(f.view.position.clone().add(new T.Vector3(-32, 48, -21))); f.view.updateMatrixWorld(true);
r.calls.length = 0; effect.render(r, f.scene, f.view);
assert.equal(r.calls.length, 4, '迎光帧至多追加一个小光束通道');
const shafts = r.calls[2].target; resources.add(shafts); materials.add(r.calls[2].material);
assert(shafts.width <= 512); assert(shafts.width <= world.width / 4);
await effect.prepare(r); assert.equal(r.compiled.length, 3); assert.equal(r.getRenderTarget(), outside);
let targetsReleased = 0, materialsReleased = 0;
for (const target of resources) target.addEventListener('dispose', () => targetsReleased++);
for (const material of materials) material.addEventListener('dispose', () => materialsReleased++);
const render = r.render; r.render = () => { throw Error('模拟绘制失败'); };
assert.throws(() => effect.render(r, f.scene, f.view), /模拟绘制/); assert.equal(r.getRenderTarget(), outside);
await assert.rejects(effect.prepare(r), /模拟绘制/); assert.equal(r.getRenderTarget(), outside); r.render = render;
effect.root.visible = false; r.calls.length = 0; effect.render(r, f.scene, f.view);
assert.equal(r.calls.length, 1); assert.equal(r.calls[0].target, outside);
effect.dispose(); effect.dispose(); assert.equal(targetsReleased, resources.size); assert.equal(materialsReleased, materials.size);
for (const [float, counts, maxSamples, expected] of [[false, [4, 2], 4, null], [true, [2], 4, 2], [true, [], 4, 0], [true, [4, 2], 1, 0], [true, { 1: [4, 2], 2: [2] }, 4, 2]]) {
  const f = fixture(), low = renderer({ float, counts, maxSamples, width: 1, height: 1 }), e = factories.sunRays(T);
  e.render(low, f.scene, f.view);
  if (expected === null) assert.equal(low.calls.length, 1);
  else {
    assert.equal(low.calls[0].target.samples, expected); assert.equal(low.calls[1].target.width, 1);
    assert.equal(low.calls.at(-1).material.uniforms.uAOSize.value.x, 1, '1x1 首帧不能除以零');
  }
  e.dispose();
}
console.log('PASS 单颜色/单世界绘制/半分辨率 AO, 光束跳过, MSAA 降级, 缓冲复用释放/状态恢复, 原材质兼容');

const receivers = fixture(), shadowRenderer = renderer(), character = factories.characterShadows(T);
const baseCompile = receivers.material.onBeforeCompile, baseKey = receivers.material.customProgramCacheKey();
let scans = 0; const traverse = receivers.root.traverse;
receivers.root.traverse = function(callback) { scans++; traverse.call(this, callback); };
character.beforeRender(shadowRenderer, receivers.scene, receivers.view); assert.equal(scans, 1);
const shader = compile(receivers.material); assert(shader.fragmentShader.includes('characterShadow()'));
assert(!expand(shader.vertexShader).includes('#include')); assert(!expand(shader.fragmentShader).includes('#include'));
for (let i = 0; i < 20; i++) character.beforeRender(shadowRenderer, receivers.scene, receivers.view);
assert.equal(scans, 1, '稳定帧不能重复遍历静态接收面');
assert.equal(shadowRenderer.calls.length, 21); assert(shadowRenderer.calls.every(c => c.scene !== receivers.scene), '动态投影只绘制角色');
assert.equal(shadowRenderer.shadowMap.autoUpdate, true); assert.equal(shadowRenderer.autoClear, false);
const added = fixture(); receivers.scene.add(added.root); character.beforeRender(shadowRenderer, receivers.scene, receivers.view);
assert(compile(added.material).fragmentShader.includes('characterShadow()'), '新插入模型应能接收角色阴影');
receivers.material.dispose(); character.beforeRender(shadowRenderer, receivers.scene, receivers.view); assert.equal(scans, 2);
assert.equal((compile(receivers.material).fragmentShader.match(/float characterShadow\(/g) ?? []).length, 1, '共享材质复用不能重复注入补丁');
character.dispose(); assert.equal(receivers.material.onBeforeCompile, baseCompile); assert.equal(receivers.material.customProgramCacheKey(), baseKey);
assert(!compile(added.material).fragmentShader.includes('characterShadow()')); outside.dispose();
console.log('PASS 接收面首次登记/稳定帧跳过/新 root 接入/共享材质复用/模块卸载与缓存键恢复');

// 模块绘制和清理同时失败时, 主流程也必须当帧恢复普通绘制.
const html = read('index.html'), begin = html.indexOf('function renderWorld()'), end = html.indexOf('function frame(stamp)');
assert(begin >= 0 && end > begin);
const guardBegin = html.indexOf('function guarded(scope, fn)'), guardEnd = html.indexOf('function eye()', guardBegin);
assert(guardBegin >= 0 && guardEnd > guardBegin);
const boundary = vm.createContext({});
vm.runInContext(`
  let draws = 0, targets = 0, beforeCalls = 0, renderCalls = 0;
  const scene = {}, camera = {}, errors = [], report = (id, error) => errors.push(id + ': ' + error.message);
  ${html.slice(guardBegin, guardEnd)}
  const renderer = { render() { draws++; }, setRenderTarget(value) { if (value === null) targets++; } };
  const entries = [{ id: 'bad-before', beforeRender() { beforeCalls++; throw Error('预渲染失败'); }, dispose() { throw Error('预渲染清理失败'); } }];
  const renderEffect = { id: 'bad-render', render() { renderCalls++; throw Error('绘制失败'); }, dispose() { throw Error('绘制清理失败'); } };
  ${html.slice(begin, end)}
  renderWorld(); renderWorld();
  globalThis.result = { draws, targets, beforeCalls, renderCalls, errors, disabled: entries[0].disabled && renderEffect.disabled };
`, boundary);
assert.equal(boundary.result.draws, 2); assert.equal(boundary.result.targets, 1);
assert.equal(boundary.result.beforeCalls, 1); assert.equal(boundary.result.renderCalls, 1);
assert.equal(boundary.result.errors.length, 4); assert(boundary.result.disabled);
console.log('PASS 预渲染/绘制及清理异常隔离, 当帧普通绘制与下一帧继续');
