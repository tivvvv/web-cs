// 低矮花境: 椭圆土床与收边, 草叶/花朵实例化; 不用透明贴图, 不摆动, 不生成独立花瓣物体.
FPS.models.parkFlowerbed = (T, o = {}) => {
  const root = new T.Group(), w = o.width ?? 4, d = o.depth ?? 2, h = o.height ?? .5, count = o.count ?? 48, grass = o.kind === 'grass';
  let seed = o.seed ?? 115; const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const soil = new T.CylinderGeometry(1, 1, .1, 32).scale(w / 2, 1, d / 2).translate(0, .015, 0);
  const rim = new T.TorusGeometry(1, .016, 5, 48).rotateX(Math.PI / 2).scale(w / 2, 1, d / 2).translate(0, .071, 0);
  const parts = [soil, rim];
  for (const [i, g] of parts.entries()) {
    const c = new T.Color(i ? 0x8b9582 : 0x706044), colors = [];
    for (let j = 0; j < g.attributes.position.count; j++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  }
  const bed = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  bed.receiveShadow = true; root.add(bed); parts.forEach(g => g.dispose());
  const points = [];
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4, length = .6 + i % 3 * .15, spread = grass ? .3 : .44;
    const at = (t, side) => {
      const r = spread * t * t, breadth = (grass ? .025 : .075) * Math.sin(t * Math.PI);
      return [Math.cos(angle) * r - Math.sin(angle) * breadth * side, length * t * (1 - .25 * t), Math.sin(angle) * r + Math.cos(angle) * breadth * side];
    };
    for (let j = 0; j < 3; j++) {
      const a = at(j / 3, -1), b = at(j / 3, 1), c = at((j + 1) / 3, -1), e = at((j + 1) / 3, 1);
      if (j > 0) points.push(...a, ...c, ...b);
      if (j < 2) points.push(...b, ...c, ...e);
    }
  }
  if (!grass) for (let j = 0; j < 3; j++) {
    const a = j * Math.PI * 2 / 3, tip = [Math.cos(a) * .12, .48 + j * .07, Math.sin(a) * .12];
    for (const axis of [0, 2]) {
      const p = [0, 0, 0], q = [0, 0, 0], r = tip.slice(), s = tip.slice(); p[axis] -= .004; q[axis] += .004; r[axis] -= .004; s[axis] += .004;
      points.push(...p, ...r, ...q, ...q, ...r, ...s);
    }
  }
  const leaves = new T.BufferGeometry(); leaves.setAttribute('position', new T.Float32BufferAttribute(points, 3)); leaves.computeVertexNormals();
  const foliage = new T.InstancedMesh(leaves, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: .95 }), count);
  const petals = [], colors = [], white = new T.Color(0xfff9ed), yellow = new T.Color(0xc4a54f);
  function triangle(a, b, c, color) { petals.push(...a, ...b, ...c); for (let j = 0; j < 3; j++) colors.push(color.r, color.g, color.b); }
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, center = [0, .006, 0], tip = [Math.cos(a) * .09, .012, Math.sin(a) * .09];
    const left = [Math.cos(a - .3) * .055, 0, Math.sin(a - .3) * .055], right = [Math.cos(a + .3) * .055, 0, Math.sin(a + .3) * .055];
    triangle(center, tip, left, white); triangle(center, right, tip, white);
    triangle(center, [Math.cos(a + Math.PI / 3) * .022, .012, Math.sin(a + Math.PI / 3) * .022], [Math.cos(a) * .022, .012, Math.sin(a) * .022], yellow);
  }
  const flower = new T.BufferGeometry();
  flower.setAttribute('position', new T.Float32BufferAttribute(petals, 3));
  flower.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); flower.computeVertexNormals();
  const blooms = grass ? null : new T.InstancedMesh(flower, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .87 }), count * 3);
  const pose = new T.Object3D(), color = new T.Color();
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2, radius = Math.sqrt((i + .5) / count) * .86,
      x = Math.cos(angle) * radius * (w / 2 - .25), z = Math.sin(angle) * radius * (d / 2 - .2), height = h * (.8 + random() * .35);
    pose.position.set(x, .065, z); pose.rotation.set(0, angle, 0); pose.scale.set(.85, height, .85);
    pose.updateMatrix(); foliage.setMatrixAt(i, pose.matrix);
    color.setHSL(grass ? .2 : .26, .25 + random() * .15, .27 + random() * .09); foliage.setColorAt(i, color);
    if (blooms) for (let j = 0; j < 3; j++) {
      const a = j * Math.PI * 2 / 3 - angle;
      pose.position.set(x + Math.cos(a) * .102, .065 + height * (.48 + j * .07), z + Math.sin(a) * .102);
      pose.rotation.set(.18 * Math.sin(a), a, .18 * Math.cos(a)); pose.scale.setScalar(.85 + random() * .35);
      pose.updateMatrix(); blooms.setMatrixAt(i * 3 + j, pose.matrix);
      color.set(o.kind === 'blue' ? [0x8c8dcc, 0xa0a0d7, 0x797ec0][i % 3] : 0xfff8e6); blooms.setColorAt(i * 3 + j, color);
    }
  }
  foliage.castShadow = foliage.receiveShadow = true; foliage.raycast = () => {}; root.add(foliage);
  if (blooms) { blooms.receiveShadow = true; blooms.raycast = () => {}; root.add(blooms); } else flower.dispose();
  return { root };
};
