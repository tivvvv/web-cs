// 港内牵引车与空骨架挂车. 前方 +Z, 挂车保留底部空隙, 五网格合批.
FPS.models.portTerminalTractor = (T, o = {}) => {
  const root = new T.Group(), parts = Array.from({ length: 5 }, () => []), pose = new T.Object3D();
  const paint = o.color ?? 0x557b79;
  function add(source, color, batch = 0, p = [0, 0, 0], r = [0, 0, 0]) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), rgb = []; for (let i = 0; i < g.attributes.position.count; i++) rgb.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (s, p, c = paint, batch = 0, r) => add(new T.BoxGeometry(...s), c, batch, p, r);
  const cyl = (radius, length, p, c, batch = 2, r = [0, 0, 0], n = 16) => add(new T.CylinderGeometry(radius, radius, length, n), c, batch, p, r);
  box([2.35, .3, 4.4], [0, .91, 0], 0x354d4b, 2);
  box([1.75, .52, 1.3], [.19, 1.25, -1.13], 0x556b60, 2);
  cyl(.53, .13, [0, 1.55, -1.6], 0x283d3c, 2);
  box([2.25, 1.04, 1.83], [0, 1.54, .88]);
  box([2.25, 1.05, 1.83], [0, 2.585, .88], 0x809b92);
  for (const side of [-1, 1]) {
    box([.055, .83, 1.55], [side * 1.143, 2.585, .88], 0x32515c, 3);
    for (const z of [.04, 1.7]) box([.085, 1.07, .08], [side * 1.128, 2.59, z], 0xa8b5a2, 2);
    box([.06, .055, 1.67], [side * 1.143, 2.03, .88], 0xa1b1a0, 2);
    box([.055, .33, .48], [side * 1.19, 1.53, .49], 0x536f6b, 2);
    box([.075, .05, .25], [side * 1.205, 1.8, .76], 0xc2c7b2, 2);
    box([.2, .38, .25], [side * 1.42, 2.61, 1.68], 0x344c4c, 1);
    box([.19, .04, .46], [side * 1.21, .65, .48], 0x99a898, 2);
    box([.3, .05, .47], [side * 1.18, 1.02, .48], 0x6d8277, 2);
  }
  for (const z of [-.064, 1.824]) box([2.02, .82, .055], [0, 2.585, z], 0x315660, 3);
  box([.06, .91, .075], [0, 2.585, 1.853], 0xb8c2ab, 2);
  box([2.39, .12, 2.04], [0, 3.19, .88], 0xc1c8af);
  for (const x of [-.8, .8]) cyl(.073, .14, [x, 3.31, .89], 0xe6ad44, 0);
  box([2.46, .24, .23], [0, .66, 2.21], 0x4a615c, 2);
  box([1.1, .44, .035], [0, 1.55, 1.821], 0x2c4343, 1);
  for (let i = 0; i < 7; i++) box([1.06, .022, .036], [0, 1.36 + i * .055, 1.85], 0x82998d, 2);
  for (const side of [-1, 1]) { box([.38, .19, .075], [side * .83, 1.26, 1.857], 0xe0d9b9, 3); box([.08, .19, .081], [side * 1.07, 1.26, 1.861], 0xc29b4f); }
  cyl(.07, 1.84, [.95, 2.18, -.86], 0x596e65, 2); cyl(.09, .2, [.95, 3.15, -.86], 0x314745, 2);
  // 挂车不是实心大盒: 纵梁/横梁/角锁与三轴轮组构成开放底架.
  const trailer = o.trailer ?? true;
  if (trailer) {
    for (const x of [-.82, .82]) box([.22, .35, 9.2], [x, 1.47, -6.04], 0x9f8251);
    for (const z of [-1.55, -3.4, -5.6, -7.6, -10.5]) box([2.55, .27, .19], [0, 1.47, z], 0x8d764b);
    for (const x of [-1.12, 1.12]) for (const z of [-1.55, -10.5]) { box([.33, .13, .37], [x, 1.71, z], 0xb7a16b); cyl(.055, .12, [x, 1.825, z], 0x465e56, 2); }
    for (const x of [-.91, .91]) { box([.13, .82, .13], [x, .94, -4.08], 0x5f7468, 2); box([.35, .08, .4], [x, .5, -4.08], 0x78877b, 2); }
    box([2.4, .23, .23], [0, .67, -10.63], 0x546b60, 2);
    for (const x of [-1.1, 1.1]) { box([.3, .13, .06], [x, .86, -10.71], 0xb15c46); box([.06, .15, 2.91], [x, .91, -8.68], 0x596f62, 2); }
  }
  for (const z of [1.03, -1.38, ...(trailer ? [-7.8, -8.75, -9.7] : [])]) for (const side of [-1, 1]) {
    const x = side * 1.075;
    cyl(.53, .32, [x, .53, z], 0x273430, 1, [0, 0, Math.PI / 2], 20);
    cyl(.3, .335, [x, .53, z], 0x9aa993, 2, [0, 0, Math.PI / 2]);
    cyl(.12, .37, [x, .53, z], 0x596f61, 2, [0, 0, Math.PI / 2]);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cyl(.025, .026, [x + side * .179, .53 + .21 * Math.sin(a), z + .21 * Math.cos(a)], 0xc0c6ae, 2, [0, 0, Math.PI / 2], 6); }
    box([.48, .055, 1.08], [side * 1.02, 1.12, z], 0x526b63, 2);
  }
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256; const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#557b79'; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = '#dfddbd'; ctx.font = '800 57px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SHONAN', 256, 110); ctx.font = '32px monospace'; ctx.fillText('TERMINAL  /  T-08', 256, 170);
  box([1.62, .48, .075], [0, 1.76, -.085], 0xffffff, 4);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const grainCanvas = document.createElement('canvas'); grainCanvas.width = grainCanvas.height = 128;
  const gc = grainCanvas.getContext('2d'), pixels = gc.createImageData(128, 128); let seed = 413;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 239 + (seed / 4294967296 - .5) * 12 + Math.sin(x * .11) * Math.cos(y * .08) * 5; pixels.data.set([v, v, v, 255], (y * 128 + x) * 4);
  }
  gc.putImageData(pixels, 0, 0); const grain = new T.CanvasTexture(grainCanvas); grain.colorSpace = T.SRGBColorSpace; grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.anisotropy = 8;
  const materials = [new T.MeshStandardMaterial({ vertexColors: true, roughness: .68, metalness: .3 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .94 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .54, metalness: .58 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .2, metalness: .4 }), new T.MeshStandardMaterial({ map, vertexColors: true, roughness: .73 })];
  for (const i of [0, 2]) { materials[i].map = materials[i].bumpMap = materials[i].roughnessMap = grain; materials[i].bumpScale = .0015; }
  parts.forEach((p, i) => { const mesh = new T.Mesh(T.mergeGeometries(p), materials[i]); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); p.forEach(g => g.dispose()); });
  return { root, dispose() { map.dispose(); grain.dispose(); } };
};
