// 公园饮水台, 正面 +Z, 下凹水盆与短龙头为静态几何, 无流水和反射通道.
FPS.models.drinkingFountain = T => {
  const root = new T.Group(), parts = [];
  function add(source, p, color) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); g.translate(...p);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s), p, c), steel = 0xa8b4ac;
  box([.55, .065, .5], [0, .0325, 0], 0x949e8f);
  box([.3, .66, .27], [0, .395, -.035], 0x7b9185);
  box([.46, .035, .4], [0, .7225, 0], 0x596d66);
  for (const side of [-1, 1]) {
    box([.055, .065, .45], [side * .2225, .75, 0], steel);
    box([.39, .065, .045], [0, .75, side * .2025], steel);
  }
  add(new T.CylinderGeometry(.025, .025, .007, 12), [0, .744, 0], 0x293e38);
  add(new T.CylinderGeometry(.018, .025, .11, 8), [0, .8375, -.19], steel);
  add(new T.CylinderGeometry(.018, .018, .12, 8).rotateX(Math.PI / 2), [0, .881, -.14], steel);
  add(new T.CylinderGeometry(.018, .018, .035, 8), [0, .869, -.08], steel);
  box([.055, .025, .045], [.1, .795, -.2], 0x688c80);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .62, metalness: .15 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
