FPS.models.container = (T, o = {}) => {
  const root = new T.Group();
  const steel = new T.MeshStandardMaterial({ color: o.color || 0x426961, roughness: .72, metalness: .25 });
  const edge = new T.MeshStandardMaterial({ color: 0x293c37, roughness: .7, metalness: .45 });
  const box = (s, p, mat = steel) => {
    const m = new T.Mesh(new T.BoxGeometry(...s), mat);
    m.position.set(...p); m.castShadow = m.receiveShadow = true; root.add(m);
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
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#dae2cb'; ctx.font = 'bold 90px sans-serif';
  ctx.fillText(o.label || 'ZONE 04', 24, 112); ctx.font = '24px monospace'; ctx.fillText('FIELD SYSTEMS / 2086', 27, 174);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const sign = new T.Mesh(new T.PlaneGeometry(2.5, 1.25), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  sign.position.set(0, 1.7, 3.075); root.add(sign);
  return { root };
};
