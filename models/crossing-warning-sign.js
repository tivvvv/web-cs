// 小型道口注意牌, 正面 +Z; 一张程序图集, 两个静态网格, 无反射或动画.
FPS.models.crossingWarningSign = T => {
  const root = new T.Group(), parts = [], faces = [];
  function add(source, position, color, angle = 0) {
    const g = source.toNonIndexed(); source.dispose(); g.rotateZ(angle).translate(...position);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  add(new T.CylinderGeometry(.045, .045, 2.2, 8), [0, 1.1, -.035], 0x747f7b);
  add(new T.BoxGeometry(.28, .1, .28), [0, .05, 0], 0xa4a79a);
  add(new T.BoxGeometry(.85 / Math.SQRT2, .85 / Math.SQRT2, .034), [0, 2.075, 0], 0x697570, Math.PI / 4);
  add(new T.BoxGeometry(.65, .25, .034), [0, 1.45, 0], 0x697570);
  const frame = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .8 }));
  frame.castShadow = frame.receiveShadow = true; root.add(frame); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d'), ink = '#26342e', yellow = '#e4bd4f';
  ctx.fillStyle = yellow; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = ink; ctx.lineWidth = 7; ctx.strokeRect(10, 10, 236, 236);
  // 画布 Y 向下, 顺时针旋转抵消网格的逆时针旋转, 让电车图标保持竖直.
  ctx.save(); ctx.translate(128, 128); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = ink; ctx.fillRect(-36, -43, 72, 85);
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-22, -45); ctx.lineTo(0, -62); ctx.lineTo(22, -45); ctx.moveTo(-24, -62); ctx.lineTo(24, -62); ctx.stroke();
  ctx.fillRect(-28, 42, 12, 10); ctx.fillRect(16, 42, 12, 10);
  ctx.fillStyle = yellow; ctx.fillRect(-26, -32, 22, 28); ctx.fillRect(4, -32, 22, 28);
  for (const x of [-22, 22]) { ctx.beginPath(); ctx.arc(x, 26, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore(); ctx.fillStyle = '#eeeadd'; ctx.fillRect(256, 0, 256, 256);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 44px sans-serif'; ctx.fillText('踏切注意', 384, 130);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  for (const [diamond, w, h, y] of [[true, .58, .58, 2.075], [false, .624, .234, 1.45]]) {
    const g = new T.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (diamond ? 0 : .5) + uv.getX(i) * .5, diamond ? uv.getY(i) : .3125 + uv.getY(i) * .375);
    g.rotateZ(diamond ? Math.PI / 4 : 0).translate(0, y, .021); faces.push(g);
  }
  const panel = new T.Mesh(T.mergeGeometries(faces), new T.MeshStandardMaterial({ map, roughness: .88 }));
  panel.receiveShadow = true; root.add(panel); faces.forEach(g => g.dispose()); return { root };
};
