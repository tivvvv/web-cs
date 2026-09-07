// 社区公告栏, 正面 +Z; 一张程序画布承载文字与示意图, 不使用玻璃反射.
FPS.models.communityBoard = T => {
  const root = new T.Group(), parts = [];
  const box = (s, p) => parts.push(new T.BoxGeometry(...s).translate(...p));
  for (const x of [-.85, .85]) {
    box([.09, 2.28, .09], [x, 1.14, 0]);
    box([.23, .08, .28], [x, .04, 0]);
  }
  box([1.9, 1.27, .12], [0, 1.55, 0]);
  box([2.06, .07, .36], [0, 2.22, .035]);
  const frame = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ color: 0x455f57, roughness: .76 }));
  frame.castShadow = frame.receiveShadow = true; root.add(frame); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e2dcc7'; ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = '#304f46'; ctx.fillRect(0, 0, 512, 62);
  ctx.fillStyle = '#faf5df'; ctx.font = 'bold 27px sans-serif'; ctx.fillText('鎌倉高校前  /  ご案内', 20, 41);
  ctx.fillStyle = '#fffdf0'; ctx.fillRect(18, 80, 267, 217); ctx.fillRect(303, 80, 190, 217);
  ctx.fillStyle = '#719694'; ctx.fillRect(33, 235, 237, 46);
  ctx.fillStyle = '#b9c4a2'; ctx.fillRect(33, 124, 237, 53);
  ctx.fillStyle = '#b8ae91'; ctx.fillRect(138, 124, 31, 111);
  ctx.strokeStyle = '#566863'; ctx.lineWidth = 4;
  for (const y of [208, 218]) { ctx.beginPath(); ctx.moveTo(33, y); ctx.lineTo(270, y); ctx.stroke(); }
  ctx.fillStyle = '#344e44'; ctx.font = '18px sans-serif';
  ctx.fillText('周辺案内', 43, 106); ctx.fillText('住宅街', 42, 150); ctx.fillText('階段', 182, 179);
  ctx.fillText('駅', 66, 197); ctx.fillText('海岸', 43, 266);
  ctx.fillStyle = '#b56145'; ctx.beginPath(); ctx.arc(153, 191, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#344e44'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('まちの掲示板', 319, 108);
  ctx.font = '17px sans-serif';
  ['海岸清掃', '日曜日  9:00', '駐輪は指定場所へ', '住宅街は静かに'].forEach((s, i) => ctx.fillText(s, 319, 148 + i * 38));
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const panel = new T.Mesh(new T.PlaneGeometry(1.76, 1.1), new T.MeshStandardMaterial({ map, roughness: .94 }));
  panel.position.set(0, 1.55, .066); panel.receiveShadow = true; root.add(panel); return { root };
};
