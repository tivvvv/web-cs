// 平层瓦顶民居, 木廊与格子拉门; 正面 +Z, 全部构件合并为一个网格.
FPS.models.japaneseCottage = (T, o = {}) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function add(g, color, p, r = [0, 0, 0]) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  const box = (s, p, c, r) => add(new T.BoxGeometry(...s), c, p, r);
  const wall = o.color ?? 0xd0c6ac, wood = 0x645449, tile = 0x566266;
  box([6.2, .3, 6.2], [0, .15, 0], 0x98998b); box([6, 2.75, 6], [0, 1.675, 0], wall);
  const gable = new T.Shape(); gable.moveTo(-3, 0); gable.lineTo(3, 0); gable.lineTo(0, 1.35); gable.closePath();
  add(new T.ExtrudeGeometry(gable, { depth: 6, bevelEnabled: false }), wall, [0, 3.05, -3]);
  for (const side of [-1, 1]) {
    box([3.73, .17, 6.9], [side * 1.65, 3.66, 0], tile, [0, 0, -side * .424]);
    for (let i = 0; i < 18; i++) box([3.74, .035, .045], [side * 1.65, 3.757, -3.3 + i * .39], 0x77807e, [0, 0, -side * .424]);
    box([.12, 2.8, .13], [side * 2.87, 1.7, 3.06], wood);
    box([.07, 1.1, 1.7], [side * 3.04, 1.8, -.4], 0x657c7b);
    for (const z of [-1.2, -.4, .4]) box([.10, 1.15, .045], [side * 3.08, 1.8, z], wood);
  }
  box([.22, .18, 7], [0, 4.46, 0], tile);
  box([5.5, .23, .85], [0, .415, 3.28], wood);
  for (const x of [-1.55, 0, 1.55]) {
    box([1.35, 1.95, .065], [x, 1.61, 3.045], 0xc5cec0);
    for (let i = 0; i < 5; i++) box([.036, 1.98, .045], [x - .62 + i * .31, 1.61, 3.095], wood);
    for (const y of [.82, 1.6, 2.38]) box([1.38, .038, .045], [x, y, 3.095], wood);
  }
  box([1.4, .16, .38], [0, .08, 3.88], 0xa5a392);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .82 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
