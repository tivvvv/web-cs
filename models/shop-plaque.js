// 正面 +Z 的小门牌, 厚边框与单张低分辨率程序字牌; 不使用透明材质.
FPS.models.shopPlaque = (T, o = {}) => {
  const w = o.width ?? .52, h = w / 2, root = new T.Group();
  const frame = new T.Mesh(new T.BoxGeometry(w, h, .024), new T.MeshStandardMaterial({ color: 0x52675b, roughness: .86 }));
  frame.receiveShadow = true; root.add(frame);
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e2d7b9'; ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#a16b4d'; ctx.fillRect(20, 16, 216, 4);
  ctx.fillStyle = '#304a40'; ctx.textAlign = 'center'; ctx.font = 'bold 34px sans-serif';
  ctx.fillText(o.title ?? '営業中', 128, 65, 224);
  ctx.font = '20px sans-serif'; ctx.fillText(o.subtitle ?? '10:00 - 18:00', 128, 101, 224);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const face = new T.Mesh(new T.PlaneGeometry(w - .035, h - .035), new T.MeshStandardMaterial({ map, roughness: .9 }));
  face.position.z = .014; face.receiveShadow = true; root.add(face); return { root };
};
