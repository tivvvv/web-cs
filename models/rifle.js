// 第一人称武器模型, 后坐力与行走摆动参数由 HTML 主循环提供.
FPS.models.rifle = (T) => {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const metal = new T.MeshStandardMaterial({ color: 0x34453d, metalness: .35, roughness: .35 });
  const grip = new T.MeshStandardMaterial({ color: 0x111e1b, roughness: .9 });
  const tan = new T.MeshStandardMaterial({ color: 0xa39369, roughness: .7, metalness: .2 });
  const glow = new T.MeshBasicMaterial({ color: 0xcaf2ac });
  function box(s, p, mat, angle = 0) {
    const m = new T.Mesh(new T.BoxGeometry(...s), mat); m.position.set(...p); m.rotation.x = angle; body.add(m); return m;
  }
  box([.14, .19, .55], [0, 0, -.18], metal);
  box([.155, .09, .31], [0, .09, -.37], tan);
  box([.11, .12, .29], [0, -.015, .2], grip);
  box([.11, .25, .12], [0, -.18, -.12], tan, -.15);
  box([.085, .2, .09], [0, -.15, .08], grip, .28);
  box([.16, .1, .38], [0, .01, -.57], grip);
  for (let z = -.42; z > -.73; z -= .05) box([.17, .014, .025], [0, .07, z], metal);
  box([.047, .045, .36], [0, .015, -.91], metal);
  box([.075, .075, .12], [0, .015, -1.065], grip);
  box([.09, .018, .17], [0, .135, -.17], metal);
  for (const x of [-.046, .046]) box([.014, .09, .045], [x, .18, -.17], tan);
  box([.1, .013, .045], [0, .224, -.17], tan);
  box([.012, .025, .015], [0, .155, -.63], glow);
  box([.018, .05, .14], [.079, .018, -.18], tan);
  // 手套和前臂属于第一人称武器模型, 与玩家移动控制解耦.
  box([.115, .13, .2], [.015, -.17, .085], grip, .2);
  box([.1, .12, .3], [-.07, -.1, -.48], tan, -.18);
  const muzzle = new T.Object3D(); muzzle.position.set(0, .015, -1.14); body.add(muzzle);
  return { root, muzzle, update(dt, s) {
    body.position.set(Math.sin(s.time * 9) * s.walk * .008, Math.abs(Math.cos(s.time * 9)) * s.walk * .012 - s.reload * .25, s.recoil * .07);
    body.rotation.set(s.recoil * .06 - s.reload * .65, 0, s.reload * -.35);
  } };
};
