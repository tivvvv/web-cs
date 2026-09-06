// 横展樱花树, 弯曲主干, 扇形枝冠, 实体花团与五瓣花实例; 不生成飘落粒子.
FPS.models.sakuraTree = (T, o = {}) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D(); let seed = o.seed ?? 39;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function add(g, color) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose(); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  function branch(a, b, radius) {
    const start = new T.Vector3(...a), d = new T.Vector3(...b).sub(start);
    pose.position.copy(start.addScaledVector(d, .5)); pose.scale.set(1, 1, 1);
    pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
    add(new T.CylinderGeometry(radius * .55, radius, d.length(), 7), 0x69554d);
  }
  branch([0, -.08, 0], [.22, 1.55, .1], .21); branch([.22, 1.55, .1], [-.15, 2.8, 0], .14);
  const centers = [];
  for (let i = 0; i < 20; i++) {
    const a = i * 2.4, r = .65 + (i % 5) * .36;
    const center = [Math.cos(a) * r, 3.5 + random() * .7 - r * .1, Math.sin(a) * r]; centers.push(center);
    branch([.1, 1.9 + (i % 3) * .2, 0], [center[0] * .65, 3.1, center[2] * .65], .057);
    branch([center[0] * .65, 3.1, center[2] * .65], center, .029);
    pose.position.set(...center); pose.rotation.set(random(), a, 0); pose.scale.set(.82, .56, .82);
    add(new T.IcosahedronGeometry(1, 1), i % 3 ? 0xe7bac4 : 0xf2d6d3);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .91 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  const points = [];
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * .4, x = Math.cos(a), y = Math.sin(a), px = -y * .042, py = x * .042;
    points.push(0, 0, .012, x * .065 + px, y * .065 + py, 0, x * .14, y * .14, .025,
      0, 0, .012, x * .14, y * .14, .025, x * .065 - px, y * .065 - py, 0);
  }
  const flower = new T.BufferGeometry(); flower.setAttribute('position', new T.Float32BufferAttribute(points, 3)); flower.computeVertexNormals();
  const blooms = new T.InstancedMesh(flower, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: .86 }), 360), color = new T.Color();
  for (let i = 0; i < 360; i++) {
    const center = centers[i % centers.length], a = random() * Math.PI * 2, y = random() * 2 - 1, r = Math.sqrt(1 - y * y);
    pose.position.set(center[0] + Math.cos(a) * r * .88, center[1] + y * .64, center[2] + Math.sin(a) * r * .88);
    pose.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    pose.scale.setScalar(.85 + random() * .65); pose.updateMatrix(); blooms.setMatrixAt(i, pose.matrix);
    color.setHSL(.94 + random() * .04, .25 + random() * .12, .78 + random() * .13); blooms.setColorAt(i, color);
  }
  blooms.receiveShadow = true; root.add(blooms); return { root };
};
