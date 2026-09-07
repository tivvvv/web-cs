// 六米宽开放木棚, 梁下净高 2.8 米, 稀疏格栅提供静态树荫般的投影.
FPS.models.gardenPergola = T => {
  const root = new T.Group(), parts = [];
  function box(s, p, angle = 0) { parts.push(new T.BoxGeometry(...s).rotateZ(angle).translate(...p)); }
  for (const x of [-2.7, 2.7]) for (const z of [-1.7, 1.7]) {
    box([.17, 2.9, .17], [x, 1.45, z]);
    box([.26, .09, .26], [x, .045, z]);
    box([.85, .1, .1], [x - Math.sign(x) * .28, 2.6, z], -Math.sign(x) * Math.PI / 4);
  }
  for (const z of [-1.7, 1.7]) box([6, .2, .16], [0, 2.9, z]);
  for (let i = 0; i < 12; i++) box([.085, .13, 4], [-2.8 + i * 5.6 / 11, 3.065, 0]);
  for (let i = 0; i < 10; i++) box([6, .06, .055], [0, 3.16, -1.8 + i * .4]);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ color: 0x8b795d, roughness: .9 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
