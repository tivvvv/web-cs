// 日式通勤自行车, X 为车长, 带辐条, 前篮, 后架和脚撑; 静态单网格.
FPS.models.cityBicycle = (T, o = {}) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function add(g, color, p = [0, 0, 0]) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose();
    pose.position.set(...p); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  const frame = o.color ?? 0x4d7775, metal = 0xabb7b1, dark = 0x293634;
  const box = (s, p, c) => add(new T.BoxGeometry(...s), c, p);
  function rod(a, b, radius, color) {
    const start = new T.Vector3(...a), d = new T.Vector3(...b).sub(start), m = new T.Object3D();
    m.position.copy(start.addScaledVector(d, .5)); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); m.updateMatrix();
    add(new T.CylinderGeometry(radius, radius, d.length(), 6).applyMatrix4(m.matrix), color);
  }
  for (const x of [-.66, .66]) {
    add(new T.TorusGeometry(.33, .035, 6, 24), dark, [x, .365, 0]);
    add(new T.TorusGeometry(.293, .012, 5, 24), metal, [x, .365, 0]);
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; rod([x, .365, 0], [x + Math.cos(a) * .29, .365 + Math.sin(a) * .29, 0], .004, metal); }
    rod([x, .365, -.085], [x, .365, .085], .027, metal);
  }
  const rear = [-.66, .365, 0], crank = [-.08, .39, 0], seat = [-.28, .89, 0], head = [.45, .92, 0];
  for (const [a, b] of [[rear, crank], [rear, seat], [crank, seat], [seat, head], [head, crank], [head, [.66, .365, 0]]]) rod(a, b, .024, frame);
  rod(seat, [-.28, .97, 0], .02, metal); box([.29, .065, .22], [-.31, .99, 0], dark);
  rod(head, [.4, 1.15, 0], .019, metal); rod([.4, 1.15, -.28], [.4, 1.15, .28], .021, metal);
  for (const side of [-1, 1]) {
    rod([.4, 1.15, side * .2], [.4, 1.15, side * .31], .029, dark);
    box([.15, .045, .10], [-.08 + side * .13, .39, side * .14], dark);
    rod([-.08, .39, 0], [-.08 + side * .13, .39, side * .14], .014, metal);
    rod([-.9, .77, side * .12], [-.42, .77, side * .12], .012, metal);
    rod([-.66, .365, side * .07], [-.8, .77, side * .12], .011, metal);
    for (let i = 0; i < 4; i++) rod([.57 + i * .1, .94, side * .21], [.57 + i * .1, 1.2, side * .21], .007, metal);
    rod([.55, 1.2, side * .21], [.89, 1.2, side * .21], .012, metal);
  }
  box([.36, .018, .43], [.72, .935, 0], metal);
  for (const x of [.55, .89]) rod([x, 1.2, -.21], [x, 1.2, .21], .012, metal);
  rod([-.1, .36, 0], [-.3, .025, .22], .013, dark);
  add(new T.TorusGeometry(.095, .012, 5, 16), metal, [-.08, .39, .05]);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .57, metalness: .25 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
