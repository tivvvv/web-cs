// 站前商亭, 正面 +Z; 茶铺与杂货亭共用参数化外壳, 门面与招牌在本文件生成.
FPS.models.stationShop = (T, o = {}) => {
  const tea = o.kind !== 'kiosk', w = o.width ?? 7, h = tea ? 3.5 : 3;
  const root = new T.Group(), parts = [], pose = new T.Object3D(), wood = tea ? 0x665344 : 0x67776b;
  function add(source, p, color, rotation = [0, 0, 0]) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...p); pose.rotation.set(...rotation); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (s, p, c, r) => add(new T.BoxGeometry(...s), p, c, r);
  box([w - .6, .16, 3.2], [0, .08, -.15], 0x979a8b);
  box([w - .6, h - .86, 3.2], [0, (h - .86) / 2 + .16, -.15], tea ? 0xc6bba0 : 0xb3bbaa);
  for (const side of [-1, 1]) {
    box([.12, h - .7, .12], [side * (w / 2 - .36), (h - .7) / 2, 1.48], wood);
    for (let i = 0; i < 5; i++) box([.035, .12, 3.14], [side * (w / 2 - .29), .3 + i * .16, -.15], wood);
  }
  if (tea) {
    const gable = new T.Shape(); gable.moveTo(-1.6, 0); gable.lineTo(1.6, 0); gable.lineTo(0, .6); gable.closePath();
    add(new T.ExtrudeGeometry(gable, { depth: w - .6, bevelEnabled: false }), [-(w - .6) / 2, h - .7, 0], 0xb5ad95, [0, Math.PI / 2, 0]);
    for (const side of [-1, 1]) {
      box([w, .12, 2.12], [0, h - .43, side * .93], 0x515e5e, [side * .35, 0, 0]);
      for (let x = -w / 2 + .15; x < w / 2; x += .38) box([.045, .025, 2.12], [x, h - .355, side * .93], 0x74807b, [side * .35, 0, 0]);
    }
    box([w, .13, .17], [0, h - .065, 0], 0x515e5e);
    box([1, 2.1, .04], [-w * .32, 1.13, 1.477], 0x344844);
    for (let i = 0; i < 5; i++) box([.045, 2.1, .045], [-w * .32 - .47 + i * .235, 1.13, 1.514], wood);
    box([.04, .24, .065], [-w * .32 + .32, 1.04, 1.55], 0xa49b78);
  } else box([w, .15, 4], [0, h - .22, 0], 0x506963, [.07, 0, 0]);
  const wx = tea ? .75 : 0, ww = tea ? w * .5 : w - .9;
  box([ww, 1.27, .04], [wx, 1.47, 1.477], 0x344b48);
  for (const y of [.82, 1.48, 2.12]) box([ww + .12, .065, .07], [wx, y, 1.52], wood);
  for (let i = 0; i <= 6; i++) box([.045, 1.35, .07], [wx - ww / 2 + i * ww / 6, 1.47, 1.52], wood);
  box([ww + .2, .09, .3], [wx, .8, 1.6], wood);
  if (!tea) for (let i = 0; i < 7; i++) box([.17, .26 + i % 2 * .09, .12], [-1.12 + i * .37, 1.02, 1.53], [0xad9c6a, 0x859578, 0xb48965][i % 3]);
  box([w - .35, .07, .55], [0, 2.3, 1.7], tea ? 0x637765 : 0xb6b39a, [-.12, 0, 0]);
  if (tea) for (let i = 0; i < 5; i++) box([.43, .32, .018], [-.92 + i * .46, 2.105, 1.95], 0x6d806c);
  // 杂货亭檐口较低, 字牌置于屋檐与窗口雨棚之间, 避免上半部穿入斜屋顶.
  const signY = tea ? 2.6 : 2.465, signHeight = tea ? .3 : .2;
  box([w - .65, tea ? .39 : .24, .07], [0, signY, 1.51], wood);
  const body = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .86 }));
  body.castShadow = body.receiveShadow = true; root.add(body); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = tea ? '#ddd1ad' : '#ced4bd'; ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#354d42'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
  const label = tea ? '海辺茶屋  ·  お茶と甘味' : '駅前商店  ·  飲料 / 雑貨', bounds = ctx.measureText(label);
  ctx.fillText(label, 256, 32 + (bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const sign = new T.Mesh(new T.PlaneGeometry(Math.min(w - .8, 3.8), signHeight), new T.MeshStandardMaterial({ map, roughness: .9 }));
  sign.position.set(0, signY, 1.553); sign.receiveShadow = true; root.add(sign); return { root };
};
