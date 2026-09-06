// 两层町屋, 窄立面, 深色木格窗与一层店檐. 正面 +Z, 单网格.
FPS.models.japaneseMachiya = (T, o = {}) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function add(g, color, p, r = [0, 0, 0]) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  const box = (s, p, c, r) => add(new T.BoxGeometry(...s), c, p, r);
  const wall = o.color ?? 0xc9c5ac, wood = 0x4e453b, tile = 0x4a5559;
  box([5.9, .26, 6.5], [0, .13, 0], 0x95978c); box([5.7, 5.55, 6.2], [0, 3.035, 0], wall);
  const gable = new T.Shape(); gable.moveTo(-2.85, 0); gable.lineTo(2.85, 0); gable.lineTo(0, 1.18); gable.closePath();
  add(new T.ExtrudeGeometry(gable, { depth: 6.2, bevelEnabled: false }), wall, [0, 5.81, -3.1]);
  for (const side of [-1, 1]) {
    box([3.53, .18, 7], [side * 1.56, 6.365, 0], tile, [0, 0, -side * .393]);
    for (let i = 0; i < 17; i++) box([3.53, .03, .05], [side * 1.56, 6.47, -3.35 + i * .42], 0x6e7774, [0, 0, -side * .393]);
    box([.08, 1.3, 1.5], [side * 2.89, 4.45, -.5], 0x708681);
  }
  box([.2, .17, 7.1], [0, 7.06, 0], tile);
  for (const y of [.42, 3.05, 5.72]) box([5.77, .16, 6.26], [0, y, 0], wood);
  for (const x of [-2.78, 0, 2.78]) box([.13, 5.5, .16], [x, 3.05, 3.16], wood);
  for (const x of [-1.4, 1.4]) {
    box([2.35, 1.52, .06], [x, 4.5, 3.15], 0x72857d);
    for (let i = 0; i < 8; i++) box([.055, 1.59, .065], [x - 1.12 + i * .32, 4.5, 3.21], wood);
    for (const y of [3.72, 4.52, 5.28]) box([2.4, .05, .07], [x, y, 3.21], wood);
    box([2.35, 2.05, .07], [x, 1.43, 3.15], 0xb7b9a1);
    for (let i = 0; i < 8; i++) box([.043, 2.08, .05], [x - 1.12 + i * .32, 1.43, 3.22], wood);
  }
  box([6.1, .14, 1.1], [0, 2.94, 3.48], tile, [.18, 0, 0]);
  for (let i = 0; i < 4; i++) box([.52, .53, .025], [-.81 + i * .54, 2.18, 3.31], 0x486e69);
  box([1.4, .13, .5], [0, .065, 3.45], 0xb0ab98);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .84 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
