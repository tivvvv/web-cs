FPS.models.container = (T, o = {}) => {
  const root = new T.Group(), parts = new Map();
  const steel = new T.MeshStandardMaterial({ color: o.color || 0x426961, roughness: .72, metalness: .25 });
  const edge = new T.MeshStandardMaterial({ color: 0x293c37, roughness: .7, metalness: .45 });
  const box = (s, p, mat = steel) => {
    const m = new T.Mesh(new T.BoxGeometry(...s), mat);
    m.position.set(...p); m.updateMatrix(); m.geometry.applyMatrix4(m.matrix);
    if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(m.geometry);
  };
  box([3, 3, 6], [0, 1.5, 0]);
  for (const x of [-1.52, 1.52]) {
    for (let z = -2.8; z < 3; z += .34) box([.055, 2.65, .08], [x, 1.5, z]);
    for (const y of [.12, 2.88]) box([.1, .15, 6.08], [x, y, 0], edge);
  }
  for (const z of [-3.025, 3.025]) {
    box([.06, 2.8, .07], [0, 1.5, z], edge);
    for (const x of [-1.35, -.32, .32, 1.35]) box([.065, 2.7, .075], [x, 1.5, z], edge);
  }
  for (const [material, list] of parts) {
    const mesh = new T.Mesh(T.mergeGeometries(list), material); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
    list.forEach(g => g.dispose());
  }
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#' + steel.color.getHexString(); ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#dae2cb'; ctx.font = 'bold 90px sans-serif';
  ctx.fillText(o.label || 'ZONE 04', 24, 112, 464); ctx.font = '24px monospace'; ctx.fillText('FIELD SYSTEMS / 2086', 27, 174, 458);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  // 门牌在锁杆后方留足深度, 两端共用实体印字面, 不使用透明叠片.
  const faces = [];
  for (const side of [-1, 1]) {
    const g = new T.BoxGeometry(2.5, 1.25, .008), uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) if (n.getZ(i) < .5) uv.setXY(i, .01, .99);
    g.rotateY(side < 0 ? Math.PI : 0).translate(0, 1.7, side * 3.032); faces.push(g);
  }
  const sign = new T.Mesh(T.mergeGeometries(faces), new T.MeshStandardMaterial({ map: tex, roughness: .86 }));
  sign.receiveShadow = true; root.add(sign); faces.forEach(g => g.dispose());
  let disposed = false; return { root, dispose() { if (disposed) return; disposed = true; tex.dispose(); } };
};
