// 公园入口木牌, 程序画布文字与静态框架, 正面 -Z.
FPS.models.parkSign = T => {
  const root = new T.Group(), parts = [];
  for (const x of [-.72, .72]) parts.push(new T.BoxGeometry(.12, 1.85, .12).translate(x, .925, 0));
  parts.push(new T.BoxGeometry(1.8, 1.04, .16).translate(0, 1.28, 0), new T.BoxGeometry(1.94, .09, .32).translate(0, 1.845, 0));
  const frame = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ color: 0x675640, roughness: .9 })); frame.castShadow = frame.receiveShadow = true; root.add(frame); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 288; const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e4dfc9'; ctx.fillRect(0, 0, 512, 288); ctx.fillStyle = '#38594c'; ctx.fillRect(15, 15, 482, 76);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f3efdb'; ctx.font = '38px serif'; ctx.fillText('潮風の杜', 256, 56);
  ctx.fillStyle = '#40594d'; ctx.font = '21px sans-serif'; ctx.fillText('SHIOKAZE SHRINE PARK', 256, 120);
  ctx.font = '25px serif'; ctx.fillText('参道・神社・休憩所', 256, 179); ctx.font = '18px sans-serif'; ctx.fillText('木陰と海風を楽しむ小さな公園', 256, 242);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  const panel = new T.Mesh(new T.PlaneGeometry(1.65, .93), new T.MeshStandardMaterial({ map, roughness: .95 })); panel.rotation.y = Math.PI; panel.position.set(0, 1.28, -.086); root.add(panel); return { root };
};
