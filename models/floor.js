// 模型工厂约定: (THREE, options) => { root }. 几何体构造仅保留在本文件.
FPS.models.floor = (T) => {
  const root = new T.Group();
  const concrete = new T.MeshStandardMaterial({ color: 0x878b80, roughness: 1 });
  const paint = new T.MeshStandardMaterial({ color: 0xdfb34f, roughness: .9 });
  const seam = new T.MeshStandardMaterial({ color: 0x727a72, roughness: 1 });
  const box = (size, pos, mat) => {
    const m = new T.Mesh(new T.BoxGeometry(...size), mat);
    m.position.set(...pos); m.receiveShadow = true; root.add(m); return m;
  };
  box([52, .5, 60], [0, 0, 0], concrete);
  for (let z = -28; z <= 28; z += 4) {
    box([52, .006, .025], [0, .254, z], seam);
    box([.12, .009, 2], [-3.3, .26, z], paint);
    box([.12, .009, 2], [3.3, .26, z], paint);
  }
  for (let x = -24; x <= 24; x += 4) box([.025, .006, 60], [x, .254, 0], seam);
  for (let x = -2.8; x < 3; x += .7) box([.35, .009, 2.8], [x, .26, 26], paint);
  return { root };
};
