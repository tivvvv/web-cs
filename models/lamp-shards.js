// 一次性灯罩碎片, 8 片三角形合批; 复用普通闪光的材质类型, 避免首爆编译实例化着色器.
FPS.models.lampShards = (T, o) => {
  const root = new T.Group(), pose = new T.Object3D(), point = new T.Vector3(), duration = .8;
  root.position.copy(o.position);
  const geometry = new T.BufferGeometry();
  const vertices = new T.Float32BufferAttribute(new Float32Array(8 * 9), 3), triangle = [[-.5, 0, 0], [.5, 0, 0], [-.15, .8, 0]];
  geometry.setAttribute('position', vertices);
  const material = new T.MeshBasicMaterial({ color: 0xbfc9bd, side: T.DoubleSide, transparent: true, depthWrite: false, toneMapped: false, forceSinglePass: true });
  const mesh = new T.Mesh(geometry, material), shards = [];
  mesh.frustumCulled = false; mesh.raycast = () => {}; root.add(mesh);
  for (let i = 0; i < 8; i++) shards.push({
    velocity: new T.Vector3((Math.random() - .5) * 1.4, -.3 - Math.random() * .6, (Math.random() - .5) * 1.4).addScaledVector(o.direction, .3),
    size: .04 + Math.random() * .04, spin: (Math.random() - .5) * 12, phase: Math.random() * Math.PI * 2
  });
  return { root, duration, update(dt, progress) {
    const t = progress * duration;
    shards.forEach((s, i) => {
      pose.position.copy(s.velocity).multiplyScalar(t); pose.position.y -= 3 * t * t;
      pose.rotation.set(s.phase + s.spin * t, s.phase - s.spin * t, s.phase); pose.scale.setScalar(s.size); pose.updateMatrix();
      for (let j = 0; j < 3; j++) { point.fromArray(triangle[j]).applyMatrix4(pose.matrix); vertices.setXYZ(i * 3 + j, point.x, point.y, point.z); }
    });
    vertices.needsUpdate = true; material.opacity = Math.min(1, (1 - progress) * 4);
  } };
};
