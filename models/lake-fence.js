// 湖岸景观低栏: 浅色石柱与两道细木横栏, 不用密集竖杆遮湖; 防越界碰撞由场景单独配置.
FPS.models.lakeFence = (T, o) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D(), posts = new Set();
  const { railDepth, postWidths } = o;
  function box(size, position, color, yaw = 0) {
    pose.position.set(...position); pose.rotation.set(0, yaw, 0); pose.updateMatrix();
    const g = new T.BoxGeometry(...size).applyMatrix4(pose.matrix), c = new T.Color(color), rgb = [];
    for (let i = 0; i < g.attributes.position.count; i++) rgb.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts.push(g);
  }
  for (const [a, b] of o.segments) {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz), yaw = -Math.atan2(dz, dx);
    const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
    for (const y of [.48, o.height - .11]) box([length + .06, .075, railDepth], [x, y, z], 0x756650, yaw);
    for (const [px, pz] of [a, b]) {
      const key = px.toFixed(4) + ',' + pz.toFixed(4);
      if (posts.has(key)) continue;
      posts.add(key);
      box([postWidths.base, .12, postWidths.base], [px, .06, pz], 0xb8bab0);
      box([postWidths.shaft, o.height - .19, postWidths.shaft], [px, .12 + (o.height - .19) / 2, pz], 0xd9d8ce);
      box([postWidths.cap, .07, postWidths.cap], [px, o.height - .035, pz], 0xe6e3d8);
    }
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .9 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
