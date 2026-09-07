// 车站区域内的住宅台地与步行楼梯, 尺寸由场景统一传入, 不生成外围地形.
FPS.models.stationNeighborhood = (T, o = {}) => {
  const { height = 2.4, start = 20, depth = 38, width = 100, steps = 12, tread = .45, stairWidth = 7.6 } = o;
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function add(source, p, color) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...p); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (s, p, color) => add(new T.BoxGeometry(...s), p, color);
  box([width, height - .04, depth], [0, (height - .04) / 2, start + depth / 2], 0x929788);
  box([width, .04, depth], [0, height - .02, start + depth / 2], 0xb6b39f);
  box([stairWidth, .035, depth], [0, height + .0175, start + depth / 2], 0x62686a);
  for (let i = 0; i < steps; i++) {
    const h = height * (i + 1) / steps, z = start - (steps - i - .5) * tread;
    box([stairWidth, h, tread], [0, h / 2, z], 0xbdb9a6);
    box([stairWidth - .08, .035, .014], [0, h - .035, z - tread / 2 - .008], 0xe0dac6);
    for (const side of [-1, 1]) box([.18, h + .22, tread], [side * (stairWidth / 2 + .09), (h + .22) / 2, z], 0x969c8b);
  }
  // 台地临空面护栏在楼梯入口处断开, 保留完整通行宽度.
  const span = (width - stairWidth) / 2;
  for (const side of [-1, 1]) {
    for (const y of [.45, .9]) box([span, .055, .065], [side * (stairWidth / 2 + span / 2), height + y, start + .1], 0x4e655d);
    for (let x = stairWidth / 2; x <= width / 2; x += 2.5) box([.065, .95, .065], [side * x, height + .475, start + .1], 0x4e655d);
    box([.11, .012, depth - 1], [side * 3.45, height + .047, start + depth / 2], 0xe5dfc9);
    box([.3, .085, depth], [side * (stairWidth / 2 + .15), height + .0425, start + depth / 2], 0xa8ad9d);
    // 分缝与排水口只做浅表细节, 脱离墙面 4 毫米以上, 不改通行碰撞.
    box([span, .08, .1], [side * (stairWidth / 2 + span / 2), height - .12, start - .035], 0xb1b3a3);
    for (let x = stairWidth / 2 + 2; x < width / 2; x += 3.8) {
      box([.018, height - .22, .008], [side * x, (height - .22) / 2, start - .008], 0x747e73);
      box([.18, .15, .018], [side * (x - 1.3), .43, start - .013], 0xb1b3a3);
      box([.1, .075, .012], [side * (x - 1.3), .43, start - .029], 0x404d49);
    }
    // 少量下垂常春藤并入墙体网格, 不创建额外花叶实例或动画.
    for (const x of [12, 28, 41]) for (let strand = 0; strand < 3; strand++) for (let i = 0; i < 6 - strand; i++) {
      add(new T.IcosahedronGeometry(1, 0).scale(.13, .11, .045), [side * x + strand * .17 + Math.sin(i * 2.4) * .09, height - .08 - i * .12, start - .11 - strand * .018], i % 2 ? 0x54704c : 0x687d51);
    }
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .91 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
