// 公园入口木牌, 字面直接使用实体木板的 -Z 面, 不叠加贴片.
FPS.models.parkSign = T => {
  const root = new T.Group(), parts = [];
  for (const x of [-.72, .72]) parts.push(new T.BoxGeometry(.12, 1.85, .12).translate(x, .925, 0));
  parts.push(new T.BoxGeometry(1.94, .09, .32).translate(0, 1.845, 0));
  const board = new T.BoxGeometry(1.8, 1.04, .16).translate(0, 1.28, 0); parts.push(board);
  // 木板放在合批末尾, 第 5 组为 -Z 正面, 其余构件只使用木材.
  const geometry = T.mergeGeometries(parts), front = board.groups[5];
  const frontStart = geometry.index.count - board.index.count + front.start;
  geometry.clearGroups(); geometry.addGroup(0, frontStart, 0); geometry.addGroup(frontStart, front.count, 1);
  parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 296; const ctx = canvas.getContext('2d');
  // 木边一起烘焙到实体正面, 保留原来 1.65 x .93 米的字面范围.
  ctx.fillStyle = '#675640'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(canvas.width * (1 - 1.65 / 1.8) / 2, canvas.height * (1 - .93 / 1.04) / 2);
  ctx.scale(canvas.width * 1.65 / (1.8 * 512), canvas.height * .93 / (1.04 * 288));
  ctx.fillStyle = '#e4dfc9'; ctx.fillRect(0, 0, 512, 288); ctx.fillStyle = '#38594c'; ctx.fillRect(15, 15, 482, 76);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f3efdb'; ctx.font = '38px serif'; ctx.fillText('潮風の杜', 256, 56);
  ctx.fillStyle = '#40594d'; ctx.font = '600 24px sans-serif'; ctx.fillText('SHIOKAZE SHRINE PARK', 256, 120);
  ctx.font = '25px serif'; ctx.fillText('参道・神社・休憩所', 256, 179); ctx.font = '18px sans-serif'; ctx.fillText('木陰と海風を楽しむ小さな公園', 256, 242);
  ctx.restore();
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const frame = new T.Mesh(geometry, [new T.MeshStandardMaterial({ color: 0x675640, roughness: .9 }), new T.MeshStandardMaterial({ map, roughness: .95 })]);
  frame.name = 'park-sign-board'; frame.castShadow = frame.receiveShadow = true; root.add(frame);
  return { root, dispose() { map.dispose(); } };
};
