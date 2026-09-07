// 沿 X 的浅框排水格栅, 暗槽底和横档合成单网格; 离铺地留毫米间隔防止共面.
FPS.models.drainGrate = (T, o = {}) => {
  const length = o.length ?? 3.2, depth = .22, root = new T.Group(), parts = [];
  function box(s, p, color) {
    const source = new T.BoxGeometry(...s), g = source.toNonIndexed(); source.dispose(); g.translate(...p);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  box([length, .003, depth], [0, .0035, 0], 0x28332f);
  for (const side of [-1, 1]) {
    box([length, .01, .018], [0, .01, side * (depth - .018) / 2], 0x7c8983);
    box([.018, .01, depth - .036], [side * (length - .018) / 2, .01, 0], 0x7c8983);
  }
  const n = Math.ceil(length / .12), span = length - .036;
  for (let i = 0; i < n; i++) box([.025, .009, depth - .036], [(i + .5) * span / n - span / 2, .0095, 0], 0x586960);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .76, metalness: .3 }));
  mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
