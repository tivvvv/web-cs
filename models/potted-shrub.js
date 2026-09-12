// 门前盆栽, 开口陶盆与土面分离, 叶片静态合批; 不使用透明贴图或动画.
FPS.models.pottedShrub = (T, o = {}) => {
  const root = new T.Group(), parts = [];
  function add(source, position, color) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); g.translate(...position);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const pot = o.color ?? 0x98715a;
  add(new T.CylinderGeometry(.18, .13, .28, 10, 1, true), [0, .14, 0], pot);
  add(new T.TorusGeometry(.177, .018, 6, 12).rotateX(Math.PI / 2), [0, .28, 0], pot);
  add(new T.CylinderGeometry(.168, .168, .012, 10), [0, .274, 0], 0x655947);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, end = new T.Vector3(Math.sin(a) * .13, .52 + i * .035, Math.cos(a) * .13);
    const start = new T.Vector3(0, .25, 0), delta = end.clone().sub(start), length = delta.length();
    const stem = new T.CylinderGeometry(.004, .009, length, 5), pose = new T.Object3D();
    pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); pose.updateMatrix(); stem.applyMatrix4(pose.matrix);
    add(stem, start.addScaledVector(delta, length / 2).toArray(), 0x637247);
    for (const side of [-1, 1]) {
      const leaf = new T.SphereGeometry(1, 6, 4).scale(.14, .025, .06).rotateZ(side * .4).rotateY(a);
      add(leaf, [end.x + Math.cos(a) * side * .09, end.y, end.z - Math.sin(a) * side * .09], i % 2 ? 0x637e4d : 0x78925c);
    }
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .94 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
