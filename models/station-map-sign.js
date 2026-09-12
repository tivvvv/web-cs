// 落地导览牌, 正面 +Z. 静态框架合批, 地图由画布生成, 无玻璃或实时灯光.
FPS.models.stationMapSign = (T, o = {}) => {
  const root = new T.Group(), parts = [];
  function box(size, position, color) {
    const g = new T.BoxGeometry(...size).translate(...position), c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  for (const x of [-.89, .89]) {
    box([.1, 2.3, .1], [x, 1.15, 0], 0x405b51);
    box([.28, .08, .32], [x, .04, 0], 0xa4a89c);
  }
  box([2.2, 1.42, .12], [0, 1.58, 0], 0x405b51);
  box([2.3, .06, .24], [0, 2.32, .015], 0x405b51);
  const frame = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .82 }));
  frame.castShadow = frame.receiveShadow = true; root.add(frame); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 640;
  const ctx = canvas.getContext('2d');
  const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const label = (s, x, y, size = 22, color = '#344d43') => { ctx.fillStyle = color; ctx.font = `${size}px sans-serif`; ctx.fillText(s, x, y); };
  // 面向牌子时住宅在前, 海岸在后, 左右与现场一致; 只画已建成的海滨站区.
  const project = (x, z) => [360 - x * 6, 456 - z * 6];
  function parcel(x, z, w, d, color) { const [px, py] = project(x, z); rect(px - w * 3, py - d * 3, w * 6, d * 6, color); }
  rect(0, 0, 1024, 640, '#eee9d8'); rect(0, 0, 1024, 82, '#36564b');
  label('鎌倉高校前  周辺案内', 30, 54, 35, '#faf7e9'); label('KAMAKURA COAST', 736, 51, 21, '#faf7e9');
  rect(28, 100, 688, 492, '#ddd9c6'); rect(28, 564, 688, 28, '#7aa8b4');
  parcel(0, 39, 7.6, 38, '#a3a8a0'); parcel(0, 7, 7.6, 14, '#c0bdaf');
  parcel(0, -11, 100, 8, '#adb3ad');
  for (const z of [-.6, .6]) parcel(0, z, 100, .25, '#596962');
  parcel(-24.9, 3.9, 34, 3.5, '#779386');
  for (const x of [-35, -18, 18, 35]) for (const z of [26, 40, 52]) parcel(x, z, 7, 8, '#b6a58c');
  for (let i = 0; i < 12; i++) parcel(0, 14.6 + (i + .5) * .45, 7.6, .12, '#697b70');
  parcel(25, 15.5, 32, 8, '#b3c19b'); parcel(-35, 17, 7, 3.5, '#a99275'); parcel(-43, 17, 4, 3.5, '#a99275');
  label('住宅街', 321, 137, 24); label('休憩広場', 148, 363, 22); label('商店', 576, 388, 22);
  label('鎌倉高校前駅', 447, 420, 24); label('踏切', 337, 486, 20); label('相模湾 / 海岸', 283, 585, 22);
  const [px, py] = project(...(o.location ?? [6.65, 18.5]));
  ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fillStyle = '#b9563f'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff8e8'; ctx.stroke();
  rect(740, 100, 256, 492, '#f7f3e7'); label('現在地 / YOU ARE HERE', 755, 142, 18, '#ad503d');
  for (const [i, text] of ['↑  階段・住宅街', '←  休憩広場', '→  駅・商店', '↓  踏切・海岸'].entries()) label(text, 766, 209 + i * 66, 24);
  label('海滨车站区域示意图', 766, 531, 19); label('SCHEMATIC MAP', 766, 560, 17);
  label('歩行者優先  /  踏切では左右を確認', 30, 623, 20);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const panel = new T.Mesh(new T.PlaneGeometry(2.048, 1.28), new T.MeshStandardMaterial({ map, roughness: .95 }));
  panel.position.set(0, 1.58, .066); panel.receiveShadow = true; root.add(panel); return { root };
};
