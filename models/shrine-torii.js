// 朱色明神鸟居, 微翘横梁, 根套石础与双面竖额; 风化顶点色保留朱漆的细微差别.
FPS.models.shrineTorii = T => {
  const root = new T.Group(), parts = [];
  function add(g, color) {
    const c = new T.Color(color), colors = [];
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const shade = .96 + .035 * Math.sin(p.getY(i) * 17 + p.getX(i) * 7) * Math.sin(p.getZ(i) * 19 + p.getY(i) * 3);
      colors.push(c.r * shade, c.g * shade, c.b * shade);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  for (const side of [-1, 1]) {
    add(new T.CylinderGeometry(.25, .32, 4.5, 24).rotateZ(side * .028).translate(side * 2.65, 2.35, 0), 0xa3452d);
    add(new T.CylinderGeometry(.34, .37, .48, 24).translate(side * 2.71, .32, 0), 0x343b36);
    add(new T.BoxGeometry(.92, .16, .88).translate(side * 2.71, .08, 0), 0x98998d);
    add(new T.BoxGeometry(.6, .14, .45).translate(side * 2.58, 3.78, 0), 0x943b29);
  }
  for (const [w, h, y, d, color, curve] of [[7.6, .24, 4.73, .65, 0x333d38, .24], [7.2, .28, 4.46, .5, 0xad4c31, .24], [6.7, .22, 3.72, .34, 0xa3452d, 0]]) {
    const g = new T.BoxGeometry(w, h, d, 16, 1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + curve * Math.pow(Math.abs(p.getX(i)) / (w / 2), 3));
    g.computeVertexNormals(); add(g.translate(0, y, 0), color);
  }
  add(new T.BoxGeometry(.28, .65, .29).translate(0, 4.08, 0), 0xa3452d);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .78 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 528;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#65543d'; ctx.fillRect(0, 0, 384, 528);
  ctx.fillStyle = '#594b32'; ctx.fillRect(47, 54, 290, 420);
  ctx.strokeStyle = '#b6a477'; ctx.lineWidth = 8; ctx.strokeRect(53, 60, 278, 408);
  ctx.fillStyle = '#e8d5a0'; ctx.font = 'bold 90px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [...'潮風神社'].forEach((c, i) => ctx.fillText(c, 192, 108 + i * 103));
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const edge = new T.MeshStandardMaterial({ color: 0x65543d, roughness: .85 }), face = new T.MeshStandardMaterial({ map, roughness: .85 });
  // 字面直接使用实心竖额的 Z 面, 移除相距仅 3 毫米的底板/贴片; 两侧各自有实体厚度.
  for (const side of [-1, 1]) {
    const board = new T.BoxGeometry(.57, .78, .12); board.clearGroups(); board.addGroup(0, 24, 0); board.addGroup(24, 12, 1);
    const plaque = new T.Mesh(board, [edge, face]); plaque.name = 'torii-plaque-' + side;
    plaque.position.set(0, 4.11, side * .29); plaque.castShadow = plaque.receiveShadow = true; root.add(plaque);
  }
  return { root };
};
