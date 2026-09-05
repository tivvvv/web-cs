FPS.models.building = (T, o = {}) => {
  const root = new T.Group();
  const plaster = new T.MeshStandardMaterial({ color: o.color || 0xc5c4ad, roughness: 1 });
  const trim = new T.MeshStandardMaterial({ color: 0x374c46, roughness: .72 });
  const glass = new T.MeshStandardMaterial({ color: 0x344d4a, metalness: .5, roughness: .3 });
  const box = (s, p, mat) => {
    const m = new T.Mesh(new T.BoxGeometry(...s), mat); m.position.set(...p);
    m.castShadow = m.receiveShadow = true; root.add(m);
  };
  box([1, 1, 1], [0, .5, 0], plaster);
  box([1.04, .035, 1.04], [0, 1, 0], trim);
  box([1.005, .08, 1.005], [0, .08, 0], trim);
  for (const x of [-.3, 0, .3]) {
    box([.2, .18, .018], [x, .72, .51], trim);
    box([.16, .14, .02], [x, .72, .522], glass);
  }
  if (o.label) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#314940'; ctx.font = 'bold 150px sans-serif'; ctx.fillText(o.label, 30, 175);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const sign = new T.Mesh(new T.PlaneGeometry(.85, .21), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    sign.position.set(0, .4, .512); root.add(sign);
  }
  return { root };
};
