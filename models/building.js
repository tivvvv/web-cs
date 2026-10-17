FPS.models.building = (T, o = {}) => {
  const root = new T.Group(), parts = new Map(); let tex;
  const plaster = new T.MeshStandardMaterial({ color: o.color || 0xc5c4ad, roughness: 1 });
  const trim = new T.MeshStandardMaterial({ color: 0x374c46, roughness: .72 });
  const glass = new T.MeshStandardMaterial({ color: 0x344d4a, metalness: .5, roughness: .3 });
  const box = (s, p, mat) => {
    const m = new T.Mesh(new T.BoxGeometry(...s), mat); m.position.set(...p);
    m.updateMatrix(); m.geometry.applyMatrix4(m.matrix);
    if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(m.geometry);
  };
  box([1, 1, 1], [0, .5, 0], plaster);
  box([1.04, .035, 1.04], [0, 1, 0], trim);
  box([1.005, .08, 1.005], [0, .08, 0], trim);
  // 四个立面均有深窗套; 侧背面不再只剩白色墙体, 重复细节仍按材质合批.
  for (let side = 0; side < 4; side++) for (const x of [-.3, 0, .3]) {
    const yaw = side * Math.PI / 2, pose = new T.Object3D(); pose.rotation.y = yaw; pose.updateMatrix();
    for (const [s, z, mat] of [[[.2, .18, .018], .51, trim], [[.16, .14, .02], .522, glass]]) {
      const g = new T.BoxGeometry(...s).translate(x, .72, z).applyMatrix4(pose.matrix);
      if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g);
    }
  }
  for (const [material, list] of parts) {
    const mesh = new T.Mesh(T.mergeGeometries(list), material); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
    list.forEach(g => g.dispose());
  }
  if (o.label) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#314940'; ctx.font = 'bold 150px sans-serif'; ctx.fillText(o.label, 30, 175);
    tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const sign = new T.Mesh(new T.PlaneGeometry(.85, .21), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    sign.position.set(0, .4, .512); root.add(sign);
  }
  let disposed = false; return { root, dispose() { if (disposed) return; disposed = true; tex?.dispose(); } };
};
