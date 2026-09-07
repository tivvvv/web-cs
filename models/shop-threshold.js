// 低矮石门槛, 后缘贴门面, 分块踏面与前缘防滑条静态合批.
FPS.models.shopThreshold = (T, o = {}) => {
  const w = o.width ?? 1.16, d = .5, h = .06, root = new T.Group(), parts = [];
  function box(s, p, color) {
    const source = new T.BoxGeometry(...s), g = source.toNonIndexed(); source.dispose(); g.translate(...p);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  box([w, h - .014, d], [0, (h - .014) / 2, 0], 0x7b827c);
  for (const side of [-1, 1]) {
    box([w / 2 - .004, .014, d], [side * w / 4, h - .007, 0], side < 0 ? 0xb1b4a7 : 0xa6ac9f);
    box([w / 2 - .045, .003, .035], [side * w / 4, h + .0015, .18], 0x626e68);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .94 }));
  mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
