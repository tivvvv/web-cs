// 命中位置的闪光和飞散火花, 由主程序提供世界坐标和表面法线.
FPS.models.impact = (T, o) => {
  const root = new T.Group(), normal = o.normal.clone().normalize();
  root.position.copy(o.position).addScaledVector(normal, .015);
  root.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
  const color = o.character ? 0x8fe9ff : 0xffc76b;
  const flashMaterial = new T.MeshBasicMaterial({ color: 0xfff2d1, transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide });
  const sparkMaterial = new T.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false });
  const plane = new T.PlaneGeometry(.09, .09), sparkGeometry = new T.BoxGeometry(.022, .022, .09);
  const flash = new T.Mesh(plane, flashMaterial);
  flash.position.z = .004; root.add(flash);
  const sparks = [];
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2 + Math.random() * .4;
    const velocity = new T.Vector3(Math.cos(angle), Math.sin(angle), .5 + Math.random()).multiplyScalar(.8 + Math.random() * 1.7);
    const mesh = new T.Mesh(sparkGeometry, sparkMaterial);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), velocity.clone().normalize()); root.add(mesh);
    sparks.push({ mesh, velocity });
  }
  // 将世界重力转换到表面局部坐标, 墙面与地面上的火花都向下回落.
  const gravity = new T.Vector3(0, -5, 0).applyQuaternion(root.quaternion.clone().invert());
  const duration = .45;
  return { root, duration, update(dt, progress) {
    const t = progress * duration;
    for (const { mesh, velocity } of sparks) mesh.position.copy(velocity).multiplyScalar(t).addScaledVector(gravity, .5 * t * t);
    flash.scale.setScalar(1 + t * 12); flashMaterial.opacity = Math.exp(-t * 45);
    sparkMaterial.opacity = (1 - progress) ** 2;
  } };
};
