// 仓库叉车. 双叉, 升降链条, 顶棚, 座椅和仪表均为静态模型, 四网格.
FPS.models.portForklift = (T, o = {}) => {
  const root = new T.Group(), parts = [[], [], [], []], pose = new T.Object3D(), paint = o.color ?? 0xb28d43;
  function add(source, color, batch = 0, p = [0, 0, 0], r = [0, 0, 0]) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), rgb = []; for (let i = 0; i < g.attributes.position.count; i++) rgb.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (s, p, c = paint, batch = 0, r) => add(new T.BoxGeometry(...s), c, batch, p, r);
  const cyl = (r, h, p, c, batch = 2, rotation = [0, 0, 0], n = 16) => add(new T.CylinderGeometry(r, r, h, n), c, batch, p, rotation);
  box([1.5, .5, 2.35], [0, .58, -.17], 0x475f5c, 2);
  box([1.53, .75, .75], [0, .97, -.99]); box([1.62, .15, .9], [0, 1.4, -.94]);
  for (const z of [-.91, .72]) for (const side of [-1, 1]) {
    const r = z > 0 ? .44 : .33, x = side * .78;
    cyl(r, .3, [x, r, z], 0x283431, 1, [0, 0, Math.PI / 2], 20);
    cyl(r * .56, .32, [x, r, z], 0xa3ad9c, 2, [0, 0, Math.PI / 2]);
    cyl(.09, .36, [x, r, z], 0x61766d, 2, [0, 0, Math.PI / 2]);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; cyl(.023, .025, [x + side * .175, r + r * .36 * Math.sin(a), z + r * .36 * Math.cos(a)], 0xb9bfac, 2, [0, 0, Math.PI / 2], 6); }
    box([.42, .08, .95], [side * .67, .98, z]);
  }
  box([1.22, .1, 1.3], [0, .96, -.14], 0x62726b, 2);
  box([.7, .18, .63], [0, 1.23, -.27], 0x313e3a, 1);
  box([.7, .65, .16], [0, 1.53, -.57], 0x394640, 1, [-.12, 0, 0]);
  for (const side of [-1, 1]) {
    box([.085, 1.52, .085], [side * .61, 1.65, -.79], 0x536c66, 2);
    box([.085, 1.57, .085], [side * .61, 1.66, .48], 0x536c66, 2);
    box([.35, .08, .52], [side * .86, .51, -.29], 0x70837b, 2);
    box([.1, .35, .13], [side * .74, 2.14, .61], 0x283e3c, 1);
  }
  box([1.4, .08, 1.66], [0, 2.46, -.15], 0x5e7770, 2);
  for (let z = -.82; z < .62; z += .22) box([1.45, .05, .065], [0, 2.53, z], 0x819187, 2);
  cyl(.07, .16, [.5, 2.61, -.57], 0xe3a643, 3);
  box([.85, .29, .28], [0, 1.41, .52], 0x435e5b, 2);
  box([.58, .02, .2], [0, 1.565, .52], 0x1f393a, 1);
  for (const x of [-.15, .15]) cyl(.05, .013, [x, 1.58, .52], 0xc3c8b1, 2);
  cyl(.032, .4, [0, 1.55, .37], 0x7d9187, 2, [.45, 0, 0]);
  add(new T.TorusGeometry(.19, .027, 6, 20), 0x263933, 1, [0, 1.77, .24], [1.08, 0, 0]);
  for (const x of [.38, .49]) cyl(.017, .35, [x, 1.38, .14], 0x899b8e, 2, [.17, 0, 0]);
  // 门架是两侧槽钢, 中间保留真实视线空隙; 双叉前端略薄.
  for (const side of [-1, 1]) {
    box([.17, 2.62, .18], [side * .52, 1.43, 1.09], 0x3e5654, 2);
    box([.095, 2.16, .12], [side * .35, 1.6, 1.16], 0x95a496, 2);
    cyl(.07, 2.17, [side * .17, 1.46, 1.08], 0x82978b, 2);
    for (let y = .63; y < 2.52; y += .13) box([.025, .065, .027], [side * .28, y, 1.2], 0x263b37, 1);
    box([.16, .63, .1], [side * .38, .58, 1.28], 0x617b71, 2);
    box([.16, .07, 1.36], [side * .38, .295, 1.91], 0x6a8176, 2);
    box([.16, .035, .25], [side * .38, .2775, 2.715], 0xa5afa0, 2);
  }
  box([1.26, .16, .22], [0, 2.79, 1.09], 0x3e5654, 2);
  box([1.22, .2, .14], [0, .88, 1.26], 0x607a70, 2);
  box([1.5, .13, .12], [0, .54, -1.41], 0x3d5350, 2);
  for (let x = -.58; x < .6; x += .14) box([.035, .43, .028], [x, 1.04, -1.38], 0x4a6056, 2);
  for (const x of [-.61, .61]) box([.17, .1, .055], [x, 1.33, -1.4], 0xb25943, 3);
  const grainCanvas = document.createElement('canvas'); grainCanvas.width = grainCanvas.height = 128;
  const gc = grainCanvas.getContext('2d'), pixels = gc.createImageData(128, 128); let seed = 413;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 239 + (seed / 4294967296 - .5) * 12 + Math.sin(x * .11) * Math.cos(y * .08) * 5; pixels.data.set([v, v, v, 255], (y * 128 + x) * 4);
  }
  gc.putImageData(pixels, 0, 0); const grain = new T.CanvasTexture(grainCanvas); grain.colorSpace = T.SRGBColorSpace; grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.anisotropy = 8;
  const materials = [new T.MeshStandardMaterial({ vertexColors: true, roughness: .65, metalness: .3 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .92 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .52, metalness: .58 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .31, metalness: .25 })];
  for (const i of [0, 2]) { materials[i].map = materials[i].bumpMap = materials[i].roughnessMap = grain; materials[i].bumpScale = .0015; }
  parts.forEach((p, i) => { const mesh = new T.Mesh(T.mergeGeometries(p), materials[i]); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); p.forEach(g => g.dispose()); });
  return { root, dispose() { grain.dispose(); } };
};
