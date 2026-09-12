// 阳台晾衣架, 两件毛巾和一件衬衣, 全部静态合并, 不引入布料模拟.
FPS.models.balconyLaundry = T => {
  const root = new T.Group(), parts = [];
  function add(source, position, color) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); g.translate(...position);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (size, position, color) => add(new T.BoxGeometry(...size), position, color);
  for (const x of [-.85, .85]) {
    box([.045, 1.29, .045], [x, .645, 0], 0x89968e);
    box([.24, .035, .26], [x, .0175, 0], 0x89968e);
  }
  box([1.85, .045, .045], [0, 1.25, 0], 0xa7b1a7);
  for (const [x, h, color] of [[-.56, .65, 0xc0c9ba], [.56, .52, 0x809aa0]]) {
    box([.34, h, .018], [x, 1.22 - h / 2, .035], color);
    box([.34, .035, .005], [x, 1.25 - h, .047], 0xd8d8c6);
    for (const side of [-1, 1]) box([.022, .055, .035], [x + side * .12, 1.225, .033], 0x8b7659);
  }
  // 衬衣用完整轮廓薄挤出, 避免袖子和衣身叠面闪烁.
  box([.035, .15, .03], [0, 1.15, .025], 0x8b7659);
  const shirt = new T.Shape(); shirt.moveTo(-.16, -.24);
  for (const [x, y] of [[.16, -.24], [.16, .07], [.27, .02], [.34, .17], [.17, .25], [-.17, .25], [-.34, .17], [-.27, .02], [-.16, .07]]) shirt.lineTo(x, y);
  shirt.closePath(); add(new T.ExtrudeGeometry(shirt, { depth: .024, bevelEnabled: false }), [0, .86, .023], 0xe0dbca);
  box([.08, .04, .006], [0, 1.087, .05], 0x89968e);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .97 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
