// 石灯笼, 柱身与四面开口灯室为实体结构; 不使用实时灯光.
FPS.models.stoneLantern = T => {
  const root = new T.Group(), parts = [];
  function add(g, c) {
    const color = new T.Color(c), a = [];
    for (let i = 0; i < g.attributes.position.count; i++) a.push(color.r, color.g, color.b);
    g.setAttribute('color', new T.Float32BufferAttribute(a, 3)); parts.push(g);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s).translate(...p), c);
  box([.95, .14, .95], [0, .07, 0], 0x939b8a);
  add(new T.CylinderGeometry(.22, .33, .32, 8).translate(0, .3, 0), 0xa3aa98);
  add(new T.CylinderGeometry(.18, .24, .88, 8).translate(0, .9, 0), 0x8e9a87);
  box([.66, .12, .66], [0, 1.4, 0], 0xb1b7a6);
  for (const x of [-.25, .25]) for (const z of [-.25, .25]) box([.12, .45, .12], [x, 1.685, z], 0xadb5a2);
  box([.43, .06, .43], [0, 1.49, 0], 0x4a5648);
  add(new T.CylinderGeometry(.15, .72, .32, 4).rotateY(Math.PI / 4).translate(0, 2.01, 0), 0x919e8e);
  add(new T.SphereGeometry(.12, 8, 6).scale(1, 1.4, 1).translate(0, 2.25, 0), 0xb0b7a3);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
