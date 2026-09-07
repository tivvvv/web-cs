// 一张圆桌与两把相向的木椅, 沿 X 排列, 整组静态合并.
FPS.models.cafeTableSet = T => {
  const root = new T.Group(), parts = [], wood = 0xa28a63, metal = 0x46564e;
  function add(source, p, color) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); g.translate(...p);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s), p, c);
  add(new T.CylinderGeometry(.325, .325, .04, 24), [0, .73, 0], wood);
  add(new T.CylinderGeometry(.035, .05, .69, 8), [0, .365, 0], metal);
  for (let i = 0; i < 3; i++) add(new T.BoxGeometry(.48, .035, .055).rotateY(i * Math.PI / 3), [0, .0175, 0], metal);
  for (const side of [-1, 1]) {
    const x = side * .75;
    add(new T.CylinderGeometry(.22, .22, .04, 16), [x, .43, 0], wood);
    for (const dx of [-.14, .14]) for (const z of [-.14, .14]) box([.03, .41, .03], [x + dx, .205, z], metal);
    for (const z of [-.17, .17]) box([.035, .44, .035], [x + side * .18, .61, z], metal);
    for (let i = 0; i < 3; i++) box([.045, .065, .4], [x + side * .18, .6 + i * .095, 0], wood);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .73 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
