// 硬面闪光/火花与松软地面碎屑, 由主程序提供位置, 法线与表面类型.
FPS.models.impact = (T, o) => {
  const root = new T.Group(), normal = o.normal.clone().normalize();
  root.position.copy(o.position).addScaledVector(normal, .015);
  root.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
  if (o.surface === 'soil' && !o.character) {
    const material = new T.MeshBasicMaterial({ color: 0xa38a62, transparent: true, depthWrite: false });
    const template = new T.IcosahedronGeometry(.035, 0), base = template.attributes.position.array.slice(), debris = [], duration = .6;
    template.dispose();
    const geometry = new T.BufferGeometry(), positions = new T.Float32BufferAttribute(new Float32Array(base.length * 8), 3).setUsage(T.DynamicDrawUsage);
    geometry.setAttribute('position', positions);
    const mesh = new T.Mesh(geometry, material); mesh.frustumCulled = false; mesh.raycast = () => {}; root.add(mesh);
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2 + Math.random() * .4, speed = .6 + Math.random() * .3;
      const velocity = new T.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 1.5 + Math.random() * .6);
      debris.push({ velocity, size: .8 + Math.random() * .6 });
    }
    const gravity = new T.Vector3(0, -5, 0).applyQuaternion(root.quaternion.clone().invert());
    function update(dt, progress) {
      const t = progress * duration;
      for (let i = 0; i < debris.length; i++) {
        const { velocity, size } = debris[i], offset = i * base.length, g = .5 * t * t;
        for (let j = 0; j < base.length; j += 3) {
          positions.array[offset + j] = base[j] * size + velocity.x * t + gravity.x * g;
          positions.array[offset + j + 1] = base[j + 1] * size + velocity.y * t + gravity.y * g;
          positions.array[offset + j + 2] = base[j + 2] * size + velocity.z * t + gravity.z * g;
        }
      }
      positions.needsUpdate = true;
      // 初段保持清楚的击中反馈, 随后平滑淡出, 不在地面留下残片.
      const fade = Math.max(0, Math.min(1, (progress - .2) / .8));
      material.opacity = 1 - fade * fade * (3 - 2 * fade);
    }
    update(0, 0); return { root, duration, update };
  }
  const color = o.character ? 0x8fe9ff : 0xffc76b;
  const flashMaterial = new T.MeshBasicMaterial({ color: 0xfff2d1, transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide, forceSinglePass: true });
  const sparkMaterial = new T.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false });
  const plane = new T.PlaneGeometry(.09, .09), template = new T.BoxGeometry(.022, .022, .09), flat = template.toNonIndexed();
  const base = flat.attributes.position.array.slice(); template.dispose(); flat.dispose();
  const sparkGeometry = new T.BufferGeometry(), positions = new T.Float32BufferAttribute(new Float32Array(base.length * 8), 3).setUsage(T.DynamicDrawUsage);
  sparkGeometry.setAttribute('position', positions);
  const flash = new T.Mesh(plane, flashMaterial);
  flash.position.z = .004; flash.raycast = () => {}; root.add(flash);
  const mesh = new T.Mesh(sparkGeometry, sparkMaterial), pose = new T.Object3D(), point = new T.Vector3();
  mesh.frustumCulled = false; mesh.raycast = () => {}; root.add(mesh);
  const sparks = [];
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2 + Math.random() * .4;
    const velocity = new T.Vector3(Math.cos(angle), Math.sin(angle), .5 + Math.random()).multiplyScalar(.8 + Math.random() * 1.7);
    const rotation = new T.Object3D().quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), velocity.clone().normalize());
    sparks.push({ rotation, velocity });
  }
  // 将世界重力转换到表面局部坐标, 墙面与地面上的火花都向下回落.
  const gravity = new T.Vector3(0, -5, 0).applyQuaternion(root.quaternion.clone().invert());
  const duration = .45;
  function update(dt, progress) {
    const t = progress * duration;
    for (let i = 0; i < sparks.length; i++) {
      const { rotation, velocity } = sparks[i];
      pose.position.copy(velocity).multiplyScalar(t).addScaledVector(gravity, .5 * t * t); pose.quaternion.copy(rotation); pose.updateMatrix();
      for (let j = 0; j < base.length; j += 3) {
        point.fromArray(base, j).applyMatrix4(pose.matrix); positions.setXYZ(i * base.length / 3 + j / 3, point.x, point.y, point.z);
      }
    }
    positions.needsUpdate = true;
    flash.scale.setScalar(1 + t * 12); flashMaterial.opacity = Math.exp(-t * 45);
    sparkMaterial.opacity = (1 - progress) ** 2;
  }
  update(0, 0); return { root, duration, update };
};
