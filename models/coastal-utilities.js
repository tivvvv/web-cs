// 接触网和街区电线. 线缆使用带下垂的采样曲线, 没有模型外依赖.
FPS.models.coastalUtilities = (T, options = {}) => {
  const root = new T.Group(), parts = new Map(), cablePoints = [];
  const pole = new T.MeshStandardMaterial({ color: 0x92968c, roughness: .9 });
  const steel = new T.MeshStandardMaterial({ color: 0x526363, roughness: .55, metalness: .65 });
  const ceramic = new T.MeshStandardMaterial({ color: 0xc5c6b7, roughness: .28 });
  const cable = new T.LineBasicMaterial({ color: 0x3d5158 });
  function rod(a, b, radius, mat) {
    const start = new T.Vector3(...a), delta = new T.Vector3(...b).sub(start);
    const mesh = new T.Mesh(new T.CylinderGeometry(radius * .85, radius, delta.length(), 12), mat);
    mesh.position.copy(start.addScaledVector(delta, .5)); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); mesh.updateMatrix();
    if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(mesh.geometry.applyMatrix4(mesh.matrix));
  }
  function wire(a, b, sag) {
    const points = [];
    for (let j = 0; j <= 36; j++) {
      const t = j / 36;
      points.push(new T.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4 * t * (1 - t) * sag, a[2] + (b[2] - a[2]) * t));
    }
    for (let j = 1; j < points.length; j++) cablePoints.push(points[j - 1], points[j]);
  }
  const positions = [-47, -24, 9, 34, 49];
  for (const x of positions) {
    rod([x, 0, -2.2], [x, 8.4, -2.2], .12, pole);
    rod([x, 6.6, -2.2], [x, 6.6, .65], .04, steel);
    rod([x, 7.4, -2.2], [x, 6.6, .3], .029, steel);
    rod([x, 5.53, 0], [x, 6.6, 0], .017, steel);
    for (let j = 0; j < 4; j++) rod([x, 6.29 + j * .065, .02], [x, 6.33 + j * .065, .02], .073, ceramic);
  }
  for (let i = 1; i < positions.length; i++) {
    const a = positions[i - 1], b = positions[i];
    wire([a, 6.6, 0], [b, 6.6, 0], .55);
    wire([a, 5.53, 0], [b, 5.53, 0], .025);
    for (let j = 1; j <= 5; j++) {
      const t = j / 6, x = a + (b - a) * t;
      wire([x, 6.6 - 2.2 * t * (1 - t), 0], [x, 5.53, 0], 0);
    }
  }
  // 街区线路只连接实际电杆, 沿岸终止于支架, 不再伸向海面后悬空截断.
  const rows = options.rows ?? [-15, 12, 54];
  for (const x of [-7.1, 8]) for (const [i, z] of rows.entries()) {
    rod([x, 0, z], [x, 10.1, z], .14, pole);
    rod([x - 1.05, 9.2, z], [x + 1.05, 9.2, z], .045, steel);
    for (const dx of [-.85, -.3, .3, .85]) {
      rod([x + dx, 9.2, z], [x + dx, 9.62, z], .032, steel);
      for (let j = 0; j < 4; j++) rod([x + dx, 9.35 + j * .055, z], [x + dx, 9.38 + j * .055, z], .067, ceramic);
      if (i) wire([x + dx, 9.62, rows[i - 1]], [x + dx, 9.62, z], (z - rows[i - 1]) * .025);
    }
    rod([x, 7.1, z], [x + .22, 7.1, z], .035, steel);
    if (i) wire([x + .22, 7.1, rows[i - 1]], [x + .22, 7.1, z], (z - rows[i - 1]) * .035);
    rod([x, 7.2, z], [x + 1.8, 7.5, z], .038, steel);
    rod([x + 1.8, 7.5, z], [x + 2.3, 7.48, z], .11, ceramic);
  }
  // 所有线缆共用一次绘制, 各跨之间不额外连线.
  root.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(cablePoints), cable));
  for (const [mat, geometries] of parts) {
    const mesh = new T.Mesh(T.mergeGeometries(geometries), mat); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  return { root };
};
