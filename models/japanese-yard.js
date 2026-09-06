// 紧凑宅院, 砂砾地面, 门前踏石和后院灌木. 正面 +Z, 尺寸 8 x 8.6 米.
FPS.models.japaneseYard = T => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function add(g, p, color, scale = [1, 1, 1]) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose();
    pose.position.set(...p); pose.scale.set(...scale); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s), p, c);
  box([8, .06, 8.6], [0, .03, 0], 0xb9b29d);
  for (const side of [-1, 1]) {
    box([.16, .035, 8.6], [side * 3.92, .078, 0], 0x8d9283);
    box([.52, .03, 5.9], [side * 3.55, .08, -.65], 0x69734d);
    box([3.25, .035, .16], [side * 2.3, .078, 4.22], 0x8d9283);
    for (let i = 0; i < 5; i++) add(new T.IcosahedronGeometry(1, 1), [side * (1.5 + i * .5), .38, -3.8], i % 2 ? 0x57704a : 0x647c51, [.42, .37, .4]);
  }
  for (let i = 0; i < 3; i++) box([1.2, .035, .19], [0, .078, 3.66 + i * .25], 0x989c8d);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .96 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
