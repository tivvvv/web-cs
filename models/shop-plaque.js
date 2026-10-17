// 正面 +Z 的小门牌, 厚边框与单张低分辨率程序字牌; 不使用透明材质.
FPS.models.shopPlaque = (T, o = {}) => {
  const w = o.width ?? .52, h = w / 2, root = new T.Group();
  const parts = [new T.BoxGeometry(w, h, .008).translate(0, 0, -.008)];
  for (const side of [-1, 1]) {
    parts.push(new T.BoxGeometry(.0175, h, .024).translate(side * (w / 2 - .00875), 0, 0));
    parts.push(new T.BoxGeometry(w - .035, .0175, .024).translate(0, side * (h / 2 - .00875), 0));
  }
  const frame = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ color: 0x52675b, roughness: .86 })); parts.forEach(g => g.dispose());
  frame.receiveShadow = true; root.add(frame);
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e2d7b9'; ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#a16b4d'; ctx.fillRect(20, 16, 216, 4);
  ctx.fillStyle = '#304a40'; ctx.textAlign = 'center'; ctx.font = 'bold 34px sans-serif';
  ctx.fillText(o.title ?? '営業中', 128, 65, 224);
  ctx.font = '20px sans-serif'; ctx.fillText(o.subtitle ?? '10:00 - 18:00', 128, 101, 224);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const geometry = new T.BoxGeometry(w - .035, h - .035, .016), uv = geometry.attributes.uv, n = geometry.attributes.normal;
  for (let i = 0; i < uv.count; i++) if (n.getZ(i) < .5) uv.setXY(i, .01, .99);
  const face = new T.Mesh(geometry, new T.MeshStandardMaterial({ map, roughness: .9 }));
  face.position.z = .004; face.receiveShadow = true; root.add(face);
  let disposed = false; return { root, dispose() { if (disposed) return; disposed = true; map.dispose(); } };
};
