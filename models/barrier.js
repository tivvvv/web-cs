FPS.models.barrier = (T, o = {}) => {
  const root = new T.Group();
  const concrete = new T.MeshStandardMaterial({ color: o.color || 0xb6b6a4, roughness: .95 });
  const black = new T.MeshStandardMaterial({ color: 0x263934, roughness: .8 });
  const amber = new T.MeshStandardMaterial({ color: 0xe6ab44, roughness: .7 });
  function box(s, p, mat) {
    const m = new T.Mesh(new T.BoxGeometry(...s), mat);
    m.position.set(...p); m.castShadow = m.receiveShadow = true; root.add(m);
  }
  box([3.6, .35, 1.1], [0, .175, 0], concrete);
  box([3.5, .9, .72], [0, .8, 0], concrete);
  box([3.6, .15, .82], [0, 1.325, 0], concrete);
  for (const z of [-.37, .37]) {
    box([3.4, .25, .018], [0, .92, z], black);
    for (let x = -1.5; x < 1.7; x += .55) box([.25, .25, .025], [x, .92, z], amber);
  }
  return { root };
};
