// 启动线程协议回归. 使用真正的 Node Worker, 不启动游戏/浏览器或测算硬件加载时长.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Worker as NodeWorker } from 'node:worker_threads';
import vm from 'node:vm';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8'), html = read('index.html');
const start = html.indexOf('function createStartupTasks()'), end = html.indexOf('function yieldStartup(');
assert(start >= 0 && end > start, '找不到完整的启动任务函数');
const source = html.slice(start, end);
function fixture({ cores = 8, blocked = false, silent = false, afterMessage } = {}) {
  const urls = new Map(), bridge = { active: 0, peak: 0, terminated: 0 }; let serial = 0;
  class Worker {
    constructor(url) {
      if (blocked) throw Error('线程不可用');
      this.ended = false; bridge.active++; bridge.peak = Math.max(bridge.peak, bridge.active);
      const script = urls.get(url);
      this.thread = new NodeWorker(`const { parentPort } = require('node:worker_threads');
        global.self = { postMessage: (value, transfers) => parentPort.postMessage(value, transfers) };
        parentPort.on('message', data => self.onmessage({ data }));
        ${silent ? 'self.onmessage = () => {};' : script}`, { eval: true });
      this.thread.on('message', data => { this.onmessage?.({ data }); afterMessage?.(); });
      this.thread.on('error', error => this.onerror?.({ message: error.message, preventDefault() {} }));
    }
    postMessage(input) { this.thread.postMessage(input); }
    terminate() { if (this.ended) return; this.ended = true; bridge.active--; bridge.terminated++; void this.thread.terminate(); }
  }
  const context = vm.createContext({ navigator: { hardwareConcurrency: cores }, Worker,
    Blob: class { constructor(parts) { this.source = parts.join(''); } },
    URL: { createObjectURL(blob) { const url = 'blob:' + serial++; urls.set(url, blob.source); return url; }, revokeObjectURL: url => urls.delete(url) },
    setTimeout: (callback, delay) => setTimeout(callback, delay === 30000 ? (silent ? 5 : 10000) : delay), clearTimeout,
    yieldStartup: async () => {} });
  vm.runInContext(source, context);
  return { tasks: context.createStartupTasks(), bridge, urls };
}
const parallel = fixture(), input = new Uint8Array([3, 7, 11]);
function calculate(input) {
  const values = new Uint8Array(input.length);
  for (let i = 0; i < values.length; i++) values[i] = input[i] * 2;
  return { values, alias: new Uint8Array(values.buffer) };
}
try {
  const results = await Promise.all(Array.from({ length: 6 }, () => parallel.tasks.compute(calculate, input)));
  assert.equal(parallel.bridge.peak, 3); assert.equal(parallel.tasks.stats.completed, 6);
  assert.equal(input.byteLength, 3); assert.deepEqual([...input], [3, 7, 11], '输入配置缓冲不能被转移或修改');
  for (const result of results) { assert.deepEqual([...result.values], [6, 14, 22]); assert.equal(result.values.buffer, result.alias.buffer); }
  assert.equal(parallel.bridge.active, 0); assert.equal(parallel.urls.size, 0);
} finally { parallel.tasks.dispose(); }
for (const options of [{ blocked: true }, { silent: true }]) {
  const fallback = fixture(options);
  try {
    const result = await fallback.tasks.compute(calculate, input);
    assert.deepEqual([...result.values], [6, 14, 22]); assert.equal(fallback.tasks.stats.fallbacks, 1);
    assert.equal(fallback.bridge.active, 0); assert.equal(fallback.urls.size, 0);
  } finally { fallback.tasks.dispose(); }
}
const single = fixture({ cores: 1 });
try { await Promise.all([single.tasks.compute(calculate, input), single.tasks.compute(calculate, input)]); assert.equal(single.bridge.peak, 1); }
finally { single.tasks.dispose(); }
const invalid = fixture();
try {
  await assert.rejects(invalid.tasks.compute(function fail() { throw Error('无效数据'); }, {}), /无效数据/);
  assert.equal(invalid.bridge.active, 0); assert.equal(invalid.urls.size, 0);
} finally { invalid.tasks.dispose(); }
const cancelled = fixture({ silent: true });
const pending = Array.from({ length: 5 }, () => cancelled.tasks.compute(calculate, input));
const settlement = Promise.allSettled(pending); cancelled.tasks.dispose();
assert((await settlement).every(result => result.status === 'rejected'));
assert.equal(cancelled.bridge.active, 0); assert.equal(cancelled.urls.size, 0);
await assert.rejects(cancelled.tasks.compute(calculate, input), /关闭/);
// 收到结果后关闭队列, 未交付的任务仍应取消, 不计为完成或重新回退计算.
let closing;
closing = fixture({ afterMessage: () => closing.tasks.dispose() });
try {
  await assert.rejects(closing.tasks.compute(calculate, input), /关闭/);
  assert.equal(closing.tasks.stats.completed, 0); assert.equal(closing.tasks.stats.fallbacks, 0);
  assert.equal(closing.bridge.active, 0); assert.equal(closing.urls.size, 0);
} finally { closing.tasks.dispose(); }

// 装配使用画布桩, 只对照数值缓冲; 不模拟 OffscreenCanvas 的绘制结果.
const document = { createElement() {
  const context = new Proxy({ pixels: null, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    drawImage(canvas) { this.pixels = canvas.context.pixels; },
    putImageData(image) { this.pixels = image.data; }, getImageData() { return { data: this.pixels }; },
    createRadialGradient: () => ({ addColorStop() {} }) }, { get: (target, name) => name in target ? target[name] : (() => {}) });
  return { width: 1, height: 1, getContext: () => context, context };
} };
const context = vm.createContext({ FPS: { models: {} }, document, AbortController });
vm.runInContext(read('vendor/three.min.js'), context);
for (const file of ['coastal-mountain', 'dry-garden', 'shrine-park-ground']) vm.runInContext(read('models/' + file + '.js'), context);
const T = context.THREE;
const fixtures = [
  ['coastalMountain', { bounds: [-4, -4, 4, 4], columns: 3, rows: 3, heights: [2, 3, 2, 3, 7, 3, 2, 3, 2] }],
  ['dryGarden', { width: 6, depth: 4, islands: [[0, 0, .6, .4, 0]] }],
  ['shrineParkGround', { bounds: [-3, -3, 3, 3], surfaces: [[-3, -3, 3, 3, 2]], trails: [] }]
];
function snapshot(model) {
  const meshes = []; model.root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const material = mesh.material;
    meshes.push({ name: mesh.name, positions: mesh.geometry.attributes.position.array,
      map: material.map?.image.context.pixels ?? null });
  }); return meshes;
}
function release(model) {
  model.dispose?.(); const materials = new Set();
  model.root.traverse(mesh => { if (!mesh.isMesh) return; mesh.geometry.dispose(); materials.add(mesh.material); });
  for (const material of materials) { for (const value of Object.values(material)) if (value?.isTexture) value.dispose(); material.dispose(); }
}
// 仿射变换快速跳步, 独立检查原 LCG 消耗的次数, 不重复像素生成循环.
function advanceSeed(seed, steps) {
  let factor = 1, offset = 0, multiplier = 1664525, increment = 1013904223;
  while (steps) {
    if (steps % 2) { offset = (Math.imul(offset, multiplier) + increment) >>> 0; factor = Math.imul(factor, multiplier) >>> 0; }
    increment = Math.imul(increment, multiplier + 1) >>> 0; multiplier = Math.imul(multiplier, multiplier) >>> 0;
    steps = Math.floor(steps / 2);
  }
  return (Math.imul(seed, factor) + offset) >>> 0;
}
for (const [name, options] of fixtures) {
  const factory = context.FPS.models[name], before = JSON.stringify(options); let task, input;
  factory.preload(options, { compute(fn, data) { task = fn; input = data; } });
  // 从源码重新构建函数, 不继承模型闭包; 检查预生成函数真正自包含.
  const unavailableCanvas = class { getContext() { return null; } };
  if (name === 'shrineParkGround') {
    // 在线程中明确失败, 主线程有 DOM 时必须成功使用普通画布.
    const withoutDOM = vm.runInNewContext('(' + task.toString() + ')', { OffscreenCanvas: unavailableCanvas });
    assert.throws(() => withoutDOM(structuredClone(input)), /不支持离屏画布/);
  }
  const compute = vm.runInNewContext('(' + task.toString() + ')', { document, OffscreenCanvas: unavailableCanvas });
  const assets = compute(structuredClone(input));
  if (name === 'dryGarden') assert.equal(assets.seed, advanceSeed(918, input * input), '砂底后续造型应沿用原随机序列');
  const direct = factory(T, options), prepared = factory(T, options, assets);
  try { assert.deepEqual(snapshot(direct), snapshot(prepared), name + ' 预生成改变了网格或纹理/随机序列'); assert.equal(JSON.stringify(options), before); }
  finally { release(direct); release(prepared); }
}
console.log('PASS 并发上限/真正线程/输入保留/输出转移/异常超时回退/取消释放, 独立装配与预生成一致.');
