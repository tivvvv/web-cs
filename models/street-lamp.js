// 紧凑街灯, 灯臂朝 +Z. 灯罩自发光但不创建 PointLight, 保留静态阴影缓存.
FPS.models.streetLamp = T => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function add(g, p, r = [0, 0, 0]) {
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); parts.push(g.applyMatrix4(pose.matrix));
  }
  add(new T.CylinderGeometry(.15, .2, .2, 10), [0, .1, 0]);
  add(new T.CylinderGeometry(.045, .067, 4.3, 10), [0, 2.35, 0]);
  const a = new T.Vector3(0, 4.45, 0), d = new T.Vector3(0, .25, .62), arm = new T.Object3D();
  arm.position.copy(a.addScaledVector(d, .5)); arm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); arm.updateMatrix();
  parts.push(new T.CylinderGeometry(.037, .037, d.length(), 8).applyMatrix4(arm.matrix));
  add(new T.BoxGeometry(.28, .12, .7), [0, 4.69, .75]);
  add(new T.BoxGeometry(.13, .38, .025), [0, 1.25, .07]);
  const body = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ color: 0x64746a, roughness: .55, metalness: .4 }));
  body.castShadow = body.receiveShadow = true; root.add(body); parts.forEach(g => g.dispose());
  const lens = new T.Mesh(new T.BoxGeometry(.2, .035, .55), new T.MeshBasicMaterial({ color: 0xffedbf, toneMapped: false }));
  lens.position.set(0, 4.6125, .78); root.add(lens); return { root };
};
