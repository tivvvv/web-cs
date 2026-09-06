// 榉树式分叉树冠, 实体枝干与内层叶团合批, 外层小叶实例化. 原点接土面.
FPS.models.zelkovaTree = (T, o = {}) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D(); let seed = o.seed ?? 71;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function add(g, color) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose();
    pose.updateMatrix(); flat.applyMatrix4(pose.matrix); const colors = [], c = new T.Color(color);
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  function branch(a, b, radius) {
    const start = new T.Vector3(...a), d = new T.Vector3(...b).sub(start);
    pose.position.copy(start.addScaledVector(d, .5)); pose.scale.set(1, 1, 1);
    pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
    add(new T.CylinderGeometry(radius * .38, radius, d.length(), 7), 0x736451);
  }
  branch([0, -.08, 0], [.13, 3.3, 0], .2);
  const centers = [];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = .7 + (i % 4) * .4, center = [Math.cos(a) * r, 3.6 + random() * 1.5, Math.sin(a) * r]; centers.push(center);
    branch([.06, 1.6 + i * .075, 0], center, .075);
    pose.position.set(...center); pose.rotation.set(0, a, .25); pose.scale.set(.85, .7, .9);
    add(new T.IcosahedronGeometry(1, 1), i % 2 ? 0x4d6e3b : 0x587b42);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .96 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  const leaf = new T.PlaneGeometry(1, 1, 2, 4), p = leaf.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x * Math.cos(y * Math.PI) * .7, y, .12 * Math.cos(y * Math.PI) - Math.abs(x) * .2); }
  leaf.computeVertexNormals();
  const leaves = new T.InstancedMesh(leaf, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: .86 }), 420), color = new T.Color();
  for (let i = 0; i < 420; i++) {
    const center = centers[i % centers.length], a = random() * Math.PI * 2, y = random() * 2 - 1, r = Math.sqrt(1 - y * y);
    pose.position.set(center[0] + Math.cos(a) * r, center[1] + y * .84, center[2] + Math.sin(a) * r);
    pose.rotation.set(random() * 3, a, random() * 3); pose.scale.setScalar(.26 + random() * .18); pose.updateMatrix(); leaves.setMatrixAt(i, pose.matrix);
    color.setHSL(.22 + random() * .07, .3, .27 + random() * .18); leaves.setColorAt(i, color);
  }
  leaves.castShadow = leaves.receiveShadow = true; root.add(leaves); return { root };
};
