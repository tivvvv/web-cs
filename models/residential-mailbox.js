// 门旁立式信箱, 正面 +Z; 邮政符号也用几何体制作, 静态单网格.
FPS.models.residentialMailbox = T => {
  const root = new T.Group(), parts = [];
  function box(size, position, color) {
    const source = new T.BoxGeometry(...size), g = source.toNonIndexed(); source.dispose(); g.translate(...position);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  box([.2, .06, .22], [0, .03, 0], 0x92998d);
  box([.055, .88, .055], [0, .44, 0], 0x55675e);
  box([.34, .4, .23], [0, .94, 0], 0x925b4d);
  box([.38, .035, .28], [0, 1.1575, .015], 0x705046);
  box([.24, .018, .008], [0, 1.09, .119], 0x303b35);
  for (const y of [1.01, .98]) box([.11, .012, .008], [0, y, .12], 0xe3ddc6);
  box([.013, .045, .008], [0, .956, .12], 0xe3ddc6);
  box([.1, .04, .008], [0, .85, .12], 0xc7c8b8);
  box([.016, .07, .012], [.13, .9, .122], 0x444f48);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .76 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
