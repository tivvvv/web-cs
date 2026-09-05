// 木箱局部范围为 1.6 米立方体, 原点在底面中心, 木板和斜撑均由几何体生成.
FPS.models.crate = T => {
  const root = new T.Group(), wood = new T.MeshStandardMaterial({ color: 0x9c693b, roughness: .95 });
  const trim = new T.MeshStandardMaterial({ color: 0xc39258, roughness: .9 });
  function box(parent, size, position, material, angle = 0) {
    const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
    mesh.position.set(...position); mesh.rotation.z = angle;
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
  }
  box(root, [1.44, 1.52, 1.44], [0, .76, 0], wood);
  for (let side = 0; side < 4; side++) {
    const face = new T.Group(); face.position.y = .8; face.rotation.y = side * Math.PI / 2; root.add(face);
    // 木板, 横撑和斜撑的表面逐层错开, 避免共面闪烁, 外轮廓仍在碰撞范围内.
    for (let i = 0; i < 6; i++) box(face, [.255, 1.44, .1], [(i - 2.5) * .266, 0, .73], wood);
    for (const y of [-.69, .69]) box(face, [1.6, .16, .02], [0, y, .78], trim);
    box(face, [1.72, .13, .016], [0, 0, .792], trim, Math.PI / 4);
  }
  for (let i = 0; i < 6; i++) box(root, [.255, .08, 1.6], [(i - 2.5) * .266, 1.56, 0], trim);
  return { root };
};
