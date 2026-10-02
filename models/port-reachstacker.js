// 静态集装箱正面吊. 车轮, 液压机构与驾驶室自包含, 五材质合批.
FPS.models.portReachstacker = (T, o = {}) => {
  const root = new T.Group(), parts = Array.from({ length: 5 }, () => []), pose = new T.Object3D();
  const paint = o.color ?? 0xb58b43, dark = 0x283438, steel = 0x83958e;
  function add(source, color, batch = 0, p = [0, 0, 0], r = [0, 0, 0]) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), rgb = [], n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) { const k = .88 + .12 * Math.max(0, n.getY(i)); rgb.push(c.r * k, c.g * k, c.b * k); }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (s, p, c = paint, batch = 0, r) => add(new T.BoxGeometry(...s), c, batch, p, r);
  const cylinder = (radius, length, p, c = steel, batch = 2, r = [0, 0, 0], segments = 16) => add(new T.CylinderGeometry(radius, radius, length, segments), c, batch, p, r);
  function beam(a, b, width, depth, c = paint, batch = 0) {
    const mid = new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5), delta = new T.Vector3(...b).sub(new T.Vector3(...a));
    const g = new T.BoxGeometry(width, delta.length(), depth); g.applyQuaternion(pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize())).translate(...mid.toArray()); add(g, c, batch);
  }
  function rounded(s, p, c = paint, batch = 0) {
    const b = Math.min(.09, ...s.map(v => v / 5)), [w, h, d] = s, shape = new T.Shape();
    shape.moveTo(-w / 2 + b, -h / 2 + b); shape.lineTo(w / 2 - b, -h / 2 + b); shape.lineTo(w / 2 - b, h / 2 - b); shape.lineTo(-w / 2 + b, h / 2 - b); shape.closePath();
    add(new T.ExtrudeGeometry(shape, { depth: d - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, steps: 1 }).translate(0, 0, -d / 2 + b), c, batch, p);
  }
  // 原点为轮胎脚点, 前方为 +Z; 六只宽胎与轮拱分开, 保留底盘间隙.
  box([3.7, .46, 6.8], [0, 1.18, -.65], dark, 2);
  rounded([3.9, 1.35, 2.4], [0, 1.88, -2.75]);
  box([3.8, .18, 6.6], [0, 1.49, -.5]);
  for (const z of [-2.4, 1.9]) for (const side of [-1, 1]) {
    const x = side * 1.98, r = z > 0 ? .91 : .79, y = r + .0365;
    cylinder(r, .56, [x, y, z], 0x28302d, 1, [0, 0, Math.PI / 2], 24);
    if (z > 0) cylinder(r, .5, [x - side * .55, y, z], 0x242c29, 1, [0, 0, Math.PI / 2], 24);
    cylinder(r * .55, .59, [x, y, z], steel, 2, [0, 0, Math.PI / 2]);
    cylinder(r * .27, .65, [x, y, z], 0x536661, 2, [0, 0, Math.PI / 2]);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5; cylinder(.035, .035, [x + side * .34, y + r * .38 * Math.sin(a), z + r * .38 * Math.cos(a)], 0xb0b5a6, 2, [0, 0, Math.PI / 2], 6);
    }
    // 胎面块贴合圆周, 不增加单独对象或碰撞.
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; box([.48, .045, .12], [x, y + (r + .014) * Math.cos(a), z + (r + .014) * Math.sin(a)], 0x39403a, 1, [a, 0, 0]); }
    box([.75, .09, 1.8], [side * 1.85, y + r + .15, z], paint);
  }
  rounded([2.15, 1.65, 1.9], [0, 2.95, -.6], 0x61777b);
  // 深色玻璃独立嵌在厚窗框内, 不叠透明面.
  for (const side of [-1, 1]) {
    box([.055, 1.08, 1.46], [side * 1.093, 3.14, -.58], 0x294751, 3);
    for (const z of [-1.38, .23]) box([.095, 1.44, .095], [side * 1.07, 3.04, z], 0xc2c3a5, 2);
    box([.065, .05, 1.46], [side * 1.125, 3.04, -.58], 0x93a8a4, 2);
    box([.12, .08, .31], [side * 1.18, 2.62, -.84], steel, 2);
    box([.17, .38, .26], [side * 1.48, 3.35, .34], dark, 1);
    beam([side * 1.07, 3.38, .16], [side * 1.47, 3.38, .34], .035, .035, steel, 2);
    for (let i = 0; i < 3; i++) box([.42, .12, .6], [side * 1.32, .4 + i * .38, -.7], 0x697d72, 2);
    beam([side * 1.6, .75, -1.11], [side * 1.6, 2.52, -1.11], .04, .04, steel, 2);
  }
  for (const z of [-1.57, .37]) box([1.94, 1.08, .055], [0, 3.14, z], 0x365c63, 3);
  box([.075, 1.16, .095], [0, 3.14, .405], 0xc2c3a5, 2);
  rounded([2.4, .14, 2.15], [0, 3.86, -.6], 0xc3c5ad);
  cylinder(.105, .17, [.8, 4.01, -.95], 0xe9af43, 0);
  // 两段箱形臂和两侧液压缸构成真实机械轮廓; 吊具停在作业区上方.
  const pivot = [0, 2.12, 1.05], elbow = [0, 5.45, 3.5], tip = [0, 6.5, 5.4];
  beam(pivot, elbow, .85, 1.04); beam([0, 4.64, 2.9], tip, .62, .7, 0x657c75);
  for (const side of [-1, 1]) {
    const a = [side * .6, 1.66, 1.45], b = [side * .6, 4.22, 2.62], c = [side * .6, 5.01, 3.2];
    beam(a, b, .23, .23, 0x596d63, 2); beam(b, c, .105, .105, 0xc6c9b3, 2);
    cylinder(.21, 1.5, [0, 2.12, 1.05], 0x455d5c, 2, [0, 0, Math.PI / 2]);
    beam([side * .38, 4.05, 2.33], [side * .38, 5.99, 4.87], .042, .042, 0x283b39, 1);
  }
  cylinder(.27, .36, tip, 0x4c6362, 2);
  box([2.58, .28, .62], [0, 6.1, 5.4], 0x9b814b);
  box([.58, .26, 3], [0, 5.89, 5.4], 0x546b68, 2);
  for (const x of [-1.1, 1.1]) for (const z of [4.18, 6.62]) {
    box([.2, .34, .27], [x, 5.7, z], 0xa68d4f); beam([0, 6.1, 5.4], [x, 5.9, z], .12, .12, 0x526b68, 2);
  }
  for (const side of [-1, 1]) {
    box([.72, .42, .1], [side * 1.3, 1.46, 2.92], dark, 1);
    box([.28, .15, .11], [side * 1.3, 1.46, 2.982], 0xdddac1, 3);
    box([.2, .13, .09], [side * 1.45, 1.25, -4.02], 0x994e42);
    for (let i = 0; i < 8; i++) box([.032, .55, .032], [side * 1.964, 2.02, -3.63 + i * .12], 0x344b4c, 2);
  }
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256; const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b58b43'; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = '#e6dec0'; ctx.font = '800 65px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SHONAN', 256, 107); ctx.font = '28px monospace'; ctx.fillText('RS-04 / 45 t', 256, 164);
  box([2.4, .66, .08], [0, 2.09, -3.99], 0xffffff, 4);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const grainCanvas = document.createElement('canvas'); grainCanvas.width = grainCanvas.height = 128;
  const gc = grainCanvas.getContext('2d'), pixels = gc.createImageData(128, 128); let seed = 413;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 239 + (seed / 4294967296 - .5) * 12 + Math.sin(x * .11) * Math.cos(y * .08) * 5; pixels.data.set([v, v, v, 255], (y * 128 + x) * 4);
  }
  gc.putImageData(pixels, 0, 0); const grain = new T.CanvasTexture(grainCanvas); grain.colorSpace = T.SRGBColorSpace; grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.anisotropy = 8;
  const materials = [new T.MeshStandardMaterial({ vertexColors: true, roughness: .62, metalness: .32 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .96 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .66 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .22, metalness: .42 }), new T.MeshStandardMaterial({ map, vertexColors: true, roughness: .68, metalness: .2 })];
  for (const i of [0, 2]) { materials[i].map = materials[i].bumpMap = materials[i].roughnessMap = grain; materials[i].bumpScale = .0015; }
  parts.forEach((p, i) => { const mesh = new T.Mesh(T.mergeGeometries(p), materials[i]); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); p.forEach(g => g.dispose()); });
  return { root, dispose() { map.dispose(); grain.dispose(); } };
};
