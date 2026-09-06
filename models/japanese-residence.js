// 两层海边住宅, 浅色灰泥, 金属阳台, 玄关与室外机; 正面 +Z, 单网格.
FPS.models.japaneseResidence = (T, o = {}) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function box(s, p, color, r = [0, 0, 0]) {
    const source = new T.BoxGeometry(...s), g = source.toNonIndexed(); source.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const wall = o.color ?? 0xdbd7c6, trim = 0x617577, glass = 0x8ca6a2;
  box([6.6, .3, 6.2], [0, .15, 0], 0x9e9d90);
  box([6.4, 3, 6], [0, 1.8, 0], wall); box([5.8, 2.75, 5.8], [-.3, 4.675, -.1], wall);
  for (const y of [3.34, 6.12]) box([6.7, .18, 6.35], [0, y, 0], 0x6b7777);
  box([6.6, .13, 6.28], [0, 6.275, 0], 0xb5b7a8);
  for (const y of [1.85, 4.68]) for (const x of [-1.85, .85]) {
    box([1.75, 1.5, .07], [x, y, y < 3 ? 3.05 : 2.85], trim);
    box([1.61, 1.36, .04], [x, y, y < 3 ? 3.105 : 2.905], glass);
    box([.04, 1.42, .04], [x, y, y < 3 ? 3.14 : 2.94], 0xcad0c3);
    box([1.9, .07, .35], [x, y + .83, y < 3 ? 3.16 : 2.96], trim);
  }
  box([4.9, .16, 1.06], [-.55, 3.48, 3.28], 0xb9b9aa);
  for (const y of [3.68, 4.45]) box([4.9, .055, .055], [-.55, y, 3.79], trim);
  for (let i = 0; i < 15; i++) box([.035, .8, .04], [-2.94 + i * .34, 4.06, 3.79], trim);
  for (const side of [-1, 1]) box([.055, .82, .96], [-.55 + side * 2.42, 4.06, 3.29], trim);
  box([.82, 2.1, .08], [2.48, 1.35, 3.05], 0x705e4d);
  box([.045, .24, .05], [2.19, 1.34, 3.12], 0xc6cabf);
  box([1.15, .13, .85], [2.45, .065, 3.38], 0xb6b4a1);
  box([.36, .35, .18], [3.36, 1.15, 2.65], 0x516964);
  for (const y of [.75, 3.95]) {
    box([.42, .61, .93], [-3.36, y, -.8], 0xc7c9ba);
    for (let i = 0; i < 6; i++) box([.03, .034, .77], [-3.59, y - .22 + i * .088, -.8], 0x7a8985);
    box([.055, 1.9, .055], [-3.25, y + .7, -.25], 0xd4d3c1);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .73 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
