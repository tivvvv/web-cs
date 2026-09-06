// 近海帆船, 正面 +Z, 吃水线为原点; 船壳/船舱/双帆合成一个网格.
FPS.models.coastalSailboat = (T, o = {}) => {
  const root = new T.Group(), boat = new T.Group(), parts = [], pose = new T.Object3D(); root.add(boat);
  function add(g, color, p = [0, 0, 0], r = [0, 0, 0]) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose(); flat.deleteAttribute('uv');
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s), c, p);
  const outline = new T.Shape(); outline.moveTo(0, -3.2); outline.quadraticCurveTo(1.2, -1.7, 1, 1.7);
  outline.lineTo(.65, 2.6); outline.lineTo(-.65, 2.6); outline.quadraticCurveTo(-1.3, -.6, 0, -3.2);
  add(new T.ExtrudeGeometry(outline, { depth: .5, bevelEnabled: false, curveSegments: 10 }), o.color ?? 0x557e85, [0, -.3, 0], [-Math.PI / 2, 0, 0]);
  add(new T.ExtrudeGeometry(outline, { depth: .035, bevelEnabled: false, curveSegments: 10 }).scale(.95, .95, 1), 0xe4dfcc, [0, .205, 0], [-Math.PI / 2, 0, 0]);
  box([1.12, .53, 1.6], [0, .5, -.65], 0xe4e7db); box([1.2, .075, 1.7], [0, .81, -.65], 0xc8d4cd);
  for (const side of [-1, 1]) box([.026, .22, .95], [side * .575, .58, -.6], 0x4e6d76);
  add(new T.CylinderGeometry(.034, .045, 6.4, 8), 0xa8b5ae, [0, 3.43, .25]);
  box([.05, .06, 2.55], [0, 1.05, -1.05], 0x83948c);
  function sail(a, b, c, color) {
    const center = [.23, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3], points = [...a, ...b, ...center, ...b, ...c, ...center, ...c, ...a, ...center];
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(points, 3)); g.computeVertexNormals(); add(g, color);
  }
  sail([0, 6.5, .2], [0, 1.16, .2], [0, 1.16, -2.28], 0xf5f0dc);
  sail([0, 5.7, .36], [0, .8, 2.8], [0, 1.16, .43], 0xdde8e4);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .7, side: T.DoubleSide }));
  boat.add(mesh); parts.forEach(g => g.dispose()); let time = 0;
  const phase = o.phase ?? 0, radius = o.radius ?? 18, speed = o.speed ?? .7;
  boat.rotation.y = Math.atan2(Math.cos(phase), -.45 * Math.sin(phase));
  // 在出生点附近连续转弯航行, 朝向与航线切线一致, 不瞬移回起点.
  return { root, update(dt) {
    time += dt; const a = phase + time * speed / radius, bob = time + phase;
    boat.position.set(radius * (Math.sin(a) - Math.sin(phase)), Math.sin(bob * .8) * .08, radius * .45 * (Math.cos(a) - Math.cos(phase)));
    boat.rotation.set(Math.sin(bob * .63) * .018, Math.atan2(Math.cos(a), -.45 * Math.sin(a)), Math.sin(bob * .91) * .025);
  } };
};
