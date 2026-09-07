// 三个倒 U 形停车架, 沿 Z 排列; 弯角用短管衔接, 不增加曲面细分.
FPS.models.bicycleRack = T => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function pipe(a, b) {
    const p = new T.Vector3(...a), d = new T.Vector3(...b).sub(p);
    const g = new T.CylinderGeometry(.025, .025, d.length(), 8);
    pose.position.copy(p.addScaledVector(d, .5)); pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    pose.updateMatrix(); parts.push(g.applyMatrix4(pose.matrix));
  }
  for (const z of [-1.5, 0, 1.5]) {
    const points = [[-.8, .035, z], [-.8, .64, z], [-.65, .79, z], [.65, .79, z], [.8, .64, z], [.8, .035, z]];
    for (let i = 1; i < points.length; i++) pipe(points[i - 1], points[i]);
    for (const x of [-.8, .8]) parts.push(new T.BoxGeometry(.16, .025, .14).translate(x, .0125, z));
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ color: 0x7d8d8a, roughness: .46, metalness: .65 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
