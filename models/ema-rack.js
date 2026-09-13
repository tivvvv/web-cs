// 落地绘马架, 正面 -Z; 16 块五角木牌和挂绳静态合批, 图案共用一张程序图集.
FPS.models.emaRack = T => {
  const root = new T.Group(), parts = [], panels = [];
  function add(g, color) {
    if (g.index) { const flat = g.toNonIndexed(); g.dispose(); g = flat; }
    const c = new T.Color(color), colors = []; for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (size, p, color, tilt = 0) => add(new T.BoxGeometry(...size).rotateZ(tilt).translate(...p), color);
  for (const side of [-1, 1]) {
    box([.48, .14, .55], [side * 1.45, .07, 0], 0x9aa38f); box([.15, 2.35, .16], [side * 1.45, 1.315, 0], 0x766044);
    box([1.84, .1, .8], [side * .86, 2.67, 0], 0x566759, -side * .28);
  }
  box([3.2, .14, .2], [0, 2.43, 0], 0x69553d); box([.13, .12, .84], [0, 2.955, 0], 0x65705f);
  box([1.5, .25, .06], [0, 2.13, -.04], 0x69553d);
  function panel(w, h, x, y, z, u0, v0, u1, v1) {
    const g = new T.PlaneGeometry(w, h).rotateY(Math.PI).translate(x, y, z), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)); panels.push(g);
  }
  for (let row = 0; row < 2; row++) {
    const y = 1.1 + row * .55; box([2.8, .07, .1], [0, y + .25, 0], 0x69553d);
    for (let i = 0; i < 8; i++) {
      const x = (i - 3.5) * .305, shape = new T.Shape(); shape.moveTo(-.12, -.12); shape.lineTo(.12, -.12); shape.lineTo(.12, .06); shape.lineTo(0, .14); shape.lineTo(-.12, .06); shape.closePath();
      add(new T.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: false }).translate(x, y, -.0125), i % 3 ? 0xcbb181 : 0xb79c70);
      add(new T.CylinderGeometry(.005, .005, .115, 5).translate(x, y + .1975, 0), 0xbaad83);
      panel(.205, .15, x, y - .025, -.019, i % 4 / 4, .5, (i % 4 + 1) / 4, 1);
    }
  }
  panel(1.42, .21, 0, 2.13, -.076, 0, 0, 1, .5);
  const frame = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .9 })); frame.castShadow = frame.receiveShadow = true; root.add(frame); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256; const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d5bf94'; ctx.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 4; i++) {
    const x = i * 128; ctx.fillStyle = '#70533e'; ctx.font = '53px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(['願', '福', '祈', '結'][i], x + 62, 49);
    ctx.fillStyle = '#8c6147'; ctx.font = '17px serif'; ctx.fillText('潮風神社', x + 64, 101);
    ctx.strokeStyle = '#bba477'; ctx.lineWidth = 1; ctx.strokeRect(x + 5, 5, 118, 115);
  }
  ctx.fillStyle = '#584a36'; ctx.fillRect(0, 128, 512, 128); ctx.fillStyle = '#ebdfb9'; ctx.font = '54px serif'; ctx.fillText('絵 馬 掛 所', 256, 195);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const faces = new T.Mesh(T.mergeGeometries(panels), new T.MeshStandardMaterial({ map, roughness: .93 })); faces.receiveShadow = true; root.add(faces); panels.forEach(g => g.dispose()); return { root };
};
