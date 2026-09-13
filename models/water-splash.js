// 子弹入水: 短促水冠和 12 颗回落水滴共用一个动态网格, 无贴图/灯光/粒子碰撞.
FPS.models.waterSplash = (T, o) => {
  const root = new T.Group(), duration = .85, pose = new T.Object3D(), point = new T.Vector3(), velocity = new T.Vector3();
  root.position.copy(o.position).y += .012;
  const corners = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const crownCorners = [0, 1, 3, 0, 3, 2], faces = [2, 0, 4, 2, 4, 1, 2, 1, 5, 2, 5, 0, 3, 4, 0, 3, 1, 4, 3, 5, 1, 3, 0, 5];
  const positions = new T.Float32BufferAttribute(new Float32Array((12 * 24 + 18 * 6) * 3), 3), geometry = new T.BufferGeometry();
  geometry.setAttribute('position', positions);
  const material = new T.MeshBasicMaterial({ color: 0xd3e8e9, transparent: true, opacity: .8, depthWrite: false, side: T.DoubleSide, forceSinglePass: true });
  const mesh = new T.Mesh(geometry, material); mesh.frustumCulled = false; mesh.raycast = () => {}; root.add(mesh);
  const force = .65 + .35 * Math.abs(o.direction.y), drops = Array.from({ length: 12 }, (_, i) => {
    const a = i * Math.PI / 6 + Math.random() * .25, speed = .35 + Math.random() * .8;
    return { v: new T.Vector3(Math.cos(a) * speed + o.direction.x * .5, (1.6 + Math.random() * 1.5) * force, Math.sin(a) * speed + o.direction.z * .5), size: .016 + Math.random() * .018 };
  });
  function update(dt, progress) {
    const t = duration * progress;
    drops.forEach((drop, i) => {
      pose.position.copy(drop.v).multiplyScalar(t); pose.position.y -= 4.9 * t * t;
      velocity.copy(drop.v); velocity.y -= 9.8 * t;
      pose.quaternion.setFromUnitVectors(T.Object3D.DEFAULT_UP, velocity.normalize());
      const radius = pose.position.y < -.01 ? 0 : drop.size; pose.scale.set(radius, radius * (1.5 + (1 - progress)), radius); pose.updateMatrix();
      for (let j = 0; j < faces.length; j++) { point.fromArray(corners[faces[j]]).applyMatrix4(pose.matrix); positions.setXYZ(i * 24 + j, point.x, point.y, point.z); }
    });
    const crown = Math.max(0, Math.sin(Math.PI * Math.min(1, t / .28))), radius = .055 + t * .5;
    for (let i = 0; i < 18; i++) for (let j = 0; j < 6; j++) {
      const corner = crownCorners[j], angle = (i + (corner & 1)) * Math.PI / 9, upper = corner > 1, r = radius * (upper ? 1.5 : 1) * crown;
      positions.setXYZ(12 * 24 + i * 6 + j, Math.cos(angle) * r, upper ? crown * force * (.17 + .09 * Math.sin(angle * 6) ** 2) : 0, Math.sin(angle) * r);
    }
    positions.needsUpdate = true; material.opacity = .8 * Math.min(1, (1 - progress) * 3);
  }
  update(0, 0); return { root, duration, update };
};
