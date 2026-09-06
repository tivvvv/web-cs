// 树池由真实土面, 石收边与低围栏组成, 原点为地面中心, 外宽 2.6 米.
FPS.models.treePlanter = T => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function box(s, p, color) {
    const source = new T.BoxGeometry(...s), g = source.toNonIndexed(); source.dispose();
    pose.position.set(...p); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  box([2.32, .08, 2.32], [0, .04, 0], 0x6d5a40);
  for (const side of [-1, 1]) {
    box([2.6, .18, .14], [0, .09, side * 1.23], 0xa5a38e);
    box([.14, .18, 2.32], [side * 1.23, .09, 0], 0xa5a38e);
    for (const y of [.39, .74]) {
      box([2.46, .045, .045], [0, y, side * 1.23], 0x455d52);
      box([.045, .045, 2.46], [side * 1.23, y, 0], 0x455d52);
    }
    for (const x of [-1.23, 0, 1.23]) box([.065, .79, .065], [x, .395, side * 1.23], 0x455d52);
    box([.065, .79, .065], [side * 1.23, .395, 0], 0x455d52);
  }
  for (let i = 0; i < 32; i++) {
    const a = i * 2.4, r = .35 + (i % 7) * .11;
    box([.075, .012, .045], [Math.cos(a) * r, .087, Math.sin(a) * r], i % 3 ? 0x8b7650 : 0x546640);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .94 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
