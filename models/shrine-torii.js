// 朱色明神鸟居, 双层微翘横梁, 金属根套和石础; 全部实体合为一个网格.
FPS.models.shrineTorii = T => {
  const root = new T.Group(), parts = [];
  function add(g, color) {
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  for (const side of [-1, 1]) {
    add(new T.CylinderGeometry(.25, .32, 4.5, 12).rotateZ(side * .028).translate(side * 2.65, 2.35, 0), 0xa3452d);
    add(new T.CylinderGeometry(.34, .37, .48, 12).translate(side * 2.71, .32, 0), 0x343b36);
    add(new T.BoxGeometry(.92, .16, .88).translate(side * 2.71, .08, 0), 0x98998d);
    add(new T.BoxGeometry(.6, .14, .45).translate(side * 2.58, 3.78, 0), 0x943b29);
  }
  for (const [w, h, y, d, color, curve] of [[7.6, .24, 4.73, .65, 0x333d38, .24], [7.2, .28, 4.46, .5, 0xad4c31, .24], [6.7, .22, 3.72, .34, 0xa3452d, 0]]) {
    const g = new T.BoxGeometry(w, h, d, 16, 1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + curve * Math.pow(Math.abs(p.getX(i)) / (w / 2), 3));
    g.computeVertexNormals(); add(g.translate(0, y, 0), color);
  }
  add(new T.BoxGeometry(.28, .65, .29).translate(0, 4.08, 0), 0xa3452d);
  add(new T.BoxGeometry(.57, .78, .12).translate(0, 4.11, -.29), 0x65543d);
  add(new T.BoxGeometry(.43, .62, .018).translate(0, 4.11, -.36), 0xc7ba89);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .78 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
