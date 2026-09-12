// 入射方向决定弹痕长轴, 两层不规则薄片合批; 挂到命中网格, 不参与射线命中.
FPS.models.bulletmark = (T, o) => {
  const root = new T.Group(), normal = o.normal.clone().normalize();
  root.position.copy(o.position).addScaledVector(normal, .003);
  root.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
  const incoming = (o.direction ?? normal).clone().normalize().applyQuaternion(root.quaternion.clone().invert());
  root.rotateZ(incoming.x * incoming.x + incoming.y * incoming.y > .0001 ? Math.atan2(incoming.y, incoming.x) : Math.random() * Math.PI * 2);
  const size = .9 + Math.random() * .2, stretch = Math.min(2.2, 1 / Math.max(.001, Math.abs(incoming.z)));
  root.scale.set(size * stretch, size, 1);
  const positions = [], colors = [], indices = [], tint = .92 + Math.random() * .16, phase = Math.random() * Math.PI * 2;
  for (const [radius, color, depth] of [[.065, 0x514638, 0], [.034, 0x11110f, .001]]) {
    const base = positions.length / 3, shade = new T.Color(color).multiplyScalar(tint);
    positions.push(0, 0, depth); colors.push(shade.r, shade.g, shade.b);
    for (let i = 0; i < 12; i++) {
      const angle = phase + i * Math.PI / 6, r = radius * (.88 + Math.random() * .24);
      positions.push(Math.cos(angle) * r, Math.sin(angle) * r, depth); colors.push(shade.r, shade.g, shade.b);
      indices.push(base, base + 1 + i, base + 1 + (i + 1) % 12);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices);
  const material = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new T.Mesh(geometry, material); mesh.raycast = () => {}; root.add(mesh);
  return { root, duration: 90, update(dt, progress) {
    material.opacity = Math.min(1, (1 - progress) * 18);
  } };
};
