// 两群海鸥沿闭合航线滑翔/振翅, 身体和翅膀各一个实例网格, 动画复用 update.
FPS.models.seagullFlock = T => {
  const root = new T.Group(), parts = [], pose = new T.Object3D(), count = 18;
  function bodyPart(g, p, scale, color) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose();
    pose.position.set(...p); pose.scale.set(...scale); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  bodyPart(new T.SphereGeometry(1, 8, 5), [0, 0, 0], [.105, .10, .27], 0xe9ece4);
  bodyPart(new T.SphereGeometry(1, 8, 4), [0, .07, .24], [.073, .08, .092], 0xf7f4e7);
  bodyPart(new T.BoxGeometry(1, 1, 1), [0, .055, .35], [.036, .034, .13], 0xd1a84b);
  bodyPart(new T.BoxGeometry(1, 1, 1), [0, -.005, -.3], [.16, .026, .17], 0xd5dedc);
  const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: .83, side: T.DoubleSide });
  const bodies = new T.InstancedMesh(T.mergeGeometries(parts), material, count); parts.forEach(g => g.dispose());
  const wing = new T.BufferGeometry(), points = [0, 0, .09, .38, .015, .10, .4, 0, -.12,
    0, 0, .09, .4, 0, -.12, .04, 0, -.15, .38, .015, .10, .72, -.02, -.19, .4, 0, -.12];
  wing.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  const colors = [];
  for (let i = 0; i < points.length; i += 3) { const c = new T.Color(points[i] > .6 ? 0x354144 : 0xdce4e2); colors.push(c.r, c.g, c.b); }
  wing.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); wing.computeVertexNormals();
  const wings = new T.InstancedMesh(wing, material, count * 2);
  // 包围体随航线变化, 两个小批次关闭裁剪, 避免旧包围体使飞鸟突然消失.
  bodies.frustumCulled = wings.frustumCulled = false; root.add(bodies, wings);
  const bird = new T.Object3D(), joint = new T.Object3D(); bird.add(joint); let time = 0;
  function update(dt) {
    time += dt;
    for (let i = 0; i < count; i++) {
      const group = Math.floor(i / 9), rank = i % 9, a = time * (.055 + group * .012) + group * 2.6 - rank * .025;
      const spread = Math.ceil(rank / 2) * (rank % 2 ? 1 : -1), radius = 34 + spread * 1.05;
      bird.position.set(Math.sin(a) * radius - group * 18, 17 + group * 8 + Math.sin(a * 2 + rank) * .65, -22 - group * 22 + Math.cos(a) * (15 + spread * .5));
      bird.rotation.set(0, Math.atan2(Math.cos(a) * radius, -Math.sin(a) * (15 + spread * .5)), Math.sin(a) * .08);
      bird.updateMatrixWorld(true); bodies.setMatrixAt(i, bird.matrix);
      const flap = Math.sin(time * 5.8 + rank * .7) * (Math.sin(time * .7 + rank) > .3 ? .42 : .05) + .08;
      for (let side = 0; side < 2; side++) {
        joint.rotation.z = side ? Math.PI + flap : -flap; joint.updateMatrixWorld(true); wings.setMatrixAt(i * 2 + side, joint.matrixWorld);
      }
    }
    bodies.instanceMatrix.needsUpdate = wings.instanceMatrix.needsUpdate = true;
  }
  update(0); return { root, update };
};
