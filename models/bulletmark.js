// 两层扁圆片组成弹孔和焦痕, 挂到命中网格后随目标移动, 不参与射线命中.
FPS.models.bulletmark = (T, o) => {
  const root = new T.Group();
  root.position.copy(o.position).addScaledVector(o.normal, .003);
  root.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), o.normal);
  const materials = [];
  for (const [radius, color, depth] of [[.065, 0x514638, 0], [.034, 0x11110f, .001]]) {
    const material = new T.MeshBasicMaterial({ color, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, .001, 12), material);
    mesh.rotation.x = Math.PI / 2; mesh.position.z = depth; mesh.raycast = () => {};
    root.add(mesh); materials.push(material);
  }
  return { root, duration: 90, update(dt, progress) {
    for (const material of materials) material.opacity = Math.min(1, (1 - progress) * 18);
  } };
};
