// 低石花坛, 土面低于分块石沿; 花木由场景单独摆放, 无跨模型调用.
FPS.models.stoneFlowerbed = (T, o = {}) => {
  const w = o.width ?? 6, d = o.depth ?? 1.3, h = o.height ?? .24, root = new T.Group(), parts = [];
  function add(source, p, color) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); g.translate(...p);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (s, p, color) => add(new T.BoxGeometry(...s), p, color);
  box([w - .22, h - .08, d - .22], [0, (h - .08) / 2, 0], 0x75664e);
  const nx = Math.ceil(w / .65), nz = Math.ceil((d - .28) / .65);
  for (const side of [-1, 1]) {
    for (let i = 0; i < nx; i++) box([w / nx - .012, h, .14], [(i + .5) * w / nx - w / 2, h / 2, side * (d / 2 - .07)], i % 2 ? 0x999e91 : 0xa6a899);
    for (let i = 0; i < nz; i++) box([.14, h, (d - .28) / nz - .012], [side * (w / 2 - .07), h / 2, (i + .5) * (d - .28) / nz - (d - .28) / 2], 0x999e91);
  }
  for (const [x, z, r] of o.rocks ?? []) add(new T.IcosahedronGeometry(1, 1).scale(r, r * .65, r * .8), [x, h - .08, z], 0x858d81);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .96 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
