// 江之岛远景: 不规则海蚀岸线, 分层植被, 山顶展望灯塔, 海岸建筑与帆船.
FPS.models.enoshimaIsland = T => {
  const root = new T.Group(); let seed = 819;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const height = (r, angle) => Math.max(0, 41 * Math.pow(Math.max(0, 1 - r * r), 1.35) * (.86 + .14 * Math.sin(angle * 3 + r * 11)));
  const radius = angle => 1 + .065 * Math.sin(angle * 5) + .045 * Math.sin(angle * 9 + 2);
  const positions = [0, height(0, 0), 0], colors = [.18, .3, .22], indices = [];
  const segments = 112, rings = 30;
  for (let ring = 1; ring <= rings; ring++) for (let j = 0; j < segments; j++) {
    const a = j / segments * Math.PI * 2, r = ring / rings, edge = radius(a);
    const h = height(r, a), n = random() * .05;
    positions.push(Math.cos(a) * 122 * r * edge, h, Math.sin(a) * 68 * r * edge);
    const color = new T.Color(r > .88 ? 0x8a8e83 : 0x354e38);
    color.offsetHSL((random() - .5) * .03, 0, n); colors.push(color.r, color.g, color.b);
  }
  for (let j = 0; j < segments; j++) indices.push(0, 1 + (j + 1) % segments, 1 + j);
  for (let ring = 1; ring < rings; ring++) for (let j = 0; j < segments; j++) {
    const a = 1 + (ring - 1) * segments + j, b = 1 + (ring - 1) * segments + (j + 1) % segments;
    const c = a + segments, d = b + segments; indices.push(a, b, c, b, d, c);
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  root.add(new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: .96 })));
  const trees = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshStandardMaterial({ color: 0x607755, roughness: 1 }), 680);
  const dummy = new T.Object3D();
  for (let i = 0; i < 680; i++) {
    const r = Math.sqrt(random()) * .87, a = random() * Math.PI * 2, size = 1.8 + random() * 2.5;
    dummy.position.set(Math.cos(a) * 122 * r * radius(a), height(r, a) + size * .3, Math.sin(a) * 68 * r * radius(a));
    dummy.scale.set(size * 1.3, size * .9, size); dummy.rotation.set(random(), random() * 6, random()); dummy.updateMatrix(); trees.setMatrixAt(i, dummy.matrix);
    trees.setColorAt(i, new T.Color().setHSL(.24 + random() * .08, .19 + random() * .16, .32 + random() * .13));
  }
  root.add(trees);
  const pale = new T.MeshStandardMaterial({ color: 0xc5c8b9, roughness: .65, metalness: .15 });
  const glazing = new T.MeshStandardMaterial({ color: 0x5e8792, roughness: .35, metalness: .35 });
  function cylinder(rt, rb, h, p, m) {
    const mesh = new T.Mesh(new T.CylinderGeometry(rt, rb, h, 20), m); mesh.position.set(...p); root.add(mesh);
  }
  const top = height(.12, Math.PI);
  cylinder(.75, 1.25, 16, [-14.6, top + 8, 0], pale);
  cylinder(2.7, 2.2, 2.3, [-14.6, top + 16.2, 0], glazing);
  cylinder(2.9, 2.9, .45, [-14.6, top + 17.55, 0], pale);
  cylinder(.15, .3, 5.2, [-14.6, top + 20.3, 0], pale);
  for (let j = 0; j < 24; j++) {
    const a = .17 + j / 24 * 2.8, r = .9, x = Math.cos(a) * 122 * r * radius(a), z = Math.sin(a) * 68 * r * radius(a);
    const h = 1.4 + random() * 2.4;
    const house = new T.Mesh(new T.BoxGeometry(2 + random() * 3, h, 2.5), pale);
    house.position.set(x, height(r, a) + h / 2, z); house.rotation.y = -a; root.add(house);
  }
  // 远岸轮廓位于岛屿之后, 不把江之岛画成孤立的几何土堆.
  const ridge = [], ridgeIndices = [];
  for (let j = 0; j < 101; j++) {
    const x = -1450 + j * 29, h = 12 + 19 * Math.sin(j * .23) ** 2 + 11 * Math.sin(j * .73) ** 2;
    ridge.push(x, -2, -650, x, h, -650);
    if (j) { const n = j * 2; ridgeIndices.push(n - 2, n, n - 1, n - 1, n, n + 1); }
  }
  const ridgeGeo = new T.BufferGeometry(); ridgeGeo.setAttribute('position', new T.Float32BufferAttribute(ridge, 3)); ridgeGeo.setIndex(ridgeIndices); ridgeGeo.computeVertexNormals();
  root.add(new T.Mesh(ridgeGeo, new T.MeshBasicMaterial({ color: 0x8aaeb8, side: T.DoubleSide })));
  for (const [x, z, scale] of [[-74, 410, 1], [39, 230, .7], [-260, 60, .8]]) {
    const boat = new T.Group(); boat.position.set(x, .1, z); boat.scale.setScalar(scale); root.add(boat);
    const hull = new T.Mesh(new T.SphereGeometry(1, 16, 8), pale); hull.scale.set(2, .35, .56); boat.add(hull);
    const mast = new T.Mesh(new T.CylinderGeometry(.024, .024, 5.2, 8), pale); mast.position.y = 2.6; boat.add(mast);
    const sailGeo = new T.BufferGeometry(); sailGeo.setAttribute('position', new T.Float32BufferAttribute([0, 5, 0, 0, .65, 0, 2, .65, .15], 3)); sailGeo.computeVertexNormals();
    boat.add(new T.Mesh(sailGeo, new T.MeshStandardMaterial({ color: 0xf3eedc, roughness: .9, side: T.DoubleSide })));
  }
  return { root };
};
