// 木条长椅, 正面 +Z, 宽 2 米; 所有构件静态合批.
FPS.models.parkBench = T => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function box(s, p, color, tilt = 0) {
    const source = new T.BoxGeometry(...s), g = source.toNonIndexed(); source.dispose();
    pose.position.set(...p); pose.rotation.x = tilt; pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  for (let i = 0; i < 4; i++) box([2, .055, .115], [0, .465, -.18 + i * .13], i % 2 ? 0x9b7953 : 0xad8d63);
  for (let i = 0; i < 3; i++) box([2, .105, .05], [0, .66 + i * .125, -.25 - i * .016], 0xa4865d, -.13);
  for (const x of [-.73, .73]) {
    for (const z of [-.2, .2]) box([.065, .43, .065], [x, .215, z], 0x3c504b);
    box([.11, .025, .56], [x, .013, 0], 0x3c504b);
    box([.065, .065, .54], [x, .41, 0], 0x3c504b);
    box([.065, .57, .055], [x, .655, -.28], 0x3c504b, -.13);
    box([.045, .2, .045], [x, .565, .14], 0x3c504b);
    box([.075, .045, .47], [x, .68, -.015], 0x3c504b);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .8 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
