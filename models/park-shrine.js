// 小型木构神社, 正面 -Z; 台基, 木廊, 曲面瓦檐, 格门与拜殿细节静态合批.
FPS.models.parkShrine = T => {
  const root = new T.Group(), parts = [];
  function add(g, color) {
    if (g.index) { const flat = g.toNonIndexed(); g.dispose(); g = flat; }
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s).translate(...p), c), wood = 0x64503b, dark = 0x40392e;
  box([10.8, .48, 9], [0, .24, -.6], 0x96998c);
  for (let i = 0; i < 4; i++) box([3.4, .15 * (i + 1), .45], [0, .075 * (i + 1), -6.675 + i * .45], 0xb1b4a6);
  for (let i = 0; i < 27; i++) box([.388, .12, 8.9], [-5.2 + i * .4, .54, -.6], i % 3 ? 0x887256 : 0x7b654e);
  box([8.8, 3.3, 6], [0, 2.25, .1], 0xcec5a8);
  for (const side of [-1, 1]) {
    for (const z of [-4.75, -2.95, .1, 3.15]) {
      box([.28, 4.4, .28], [side * 4.55, 2.8, z], wood);
      box([.44, .22, .44], [side * 4.55, .71, z], 0x85887d);
      box([.62, .15, .48], [side * 4.55, 4.81, z], wood);
    }
    box([.18, .15, 8.5], [side * 4.55, 4.94, -.7], dark);
    for (const z of [-1.7, .25, 2.2]) {
      box([.035, 1.42, 1.3], [side * 4.42, 2.25, z], 0x777967);
      for (let i = 0; i < 5; i++) box([.06, 1.5, .045], [side * 4.45, 2.25, z - .6 + i * .3], dark);
    }
    for (const y of [.82, 1.17]) box([.08, .08, 8.5], [side * 5.18, y, -.6], wood);
    for (const z of [-4.75, -2.5, 0, 2.5, 3.55]) box([.1, .65, .1], [side * 5.18, .925, z], wood);
  }
  for (const x of [-3.25, -1.1, 1.1, 3.25]) {
    box([1.92, 2.65, .04], [x, 2.08, -2.925], 0x555846);
    for (let i = 0; i < 9; i++) box([.055, 2.7, .065], [x - .9 + i * .225, 2.08, -2.975], wood);
    for (const y of [.78, 1.2, 2.05, 3.39]) box([1.95, .065, .065], [x, y, -2.975], wood);
  }
  box([9.6, .28, .27], [0, 4.82, -4.75], wood);
  box([.16, 1.85, .17], [0, 5.1, -4.75], wood);
  box([1.34, .74, .1], [0, 4.3, -4.83], wood);
  const roofY = x => 6.2 - 1.65 * Math.abs(x) / 6 + .3 * Math.pow(Math.abs(x) / 6, 6);
  function roof(depth, z, thickness, color, lift = 0) {
    const shape = new T.Shape(), samples = Array.from({ length: 25 }, (_, i) => -6 + i * .5);
    shape.moveTo(-6, roofY(-6)); for (const x of samples.slice(1)) shape.lineTo(x, roofY(x));
    for (const x of samples.slice().reverse()) shape.lineTo(x, roofY(x) - thickness); shape.closePath();
    add(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 }).translate(0, lift, z), color);
  }
  const gable = new T.Shape(); gable.moveTo(-4.4, 3.9); gable.lineTo(4.4, 3.9);
  gable.lineTo(4.4, roofY(4.4) - .22); gable.lineTo(0, 5.98); gable.lineTo(-4.4, roofY(4.4) - .22); gable.closePath();
  add(new T.ExtrudeGeometry(gable, { depth: 6, bevelEnabled: false }).translate(0, 0, -2.9), 0x8e7d60);
  for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) box([.09, roofY(x) - 4.25, .08], [x, (roofY(x) + 3.81) / 2, -2.95], dark);
  roof(10, -5.65, .2, 0x485854);
  for (let i = 0; i < 24; i++) roof(.046, -5.65 + i * 10 / 23, .025, 0x64716b, .032);
  for (const z of [-5.72, 4.32]) roof(.1, z, .27, wood, -.035);
  box([.3, .24, 10.2], [0, 6.29, -.65], 0x59665d);
  for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) box([.11, .16, 2.1], [x, 4.89, -3.8], dark);
  // 铃绳和奉纳箱靠前廊, 保留两侧绕行宽度; 不使用物理绳索或透明玻璃.
  add(new T.CylinderGeometry(.045, .045, 2.9, 9).translate(0, 3.27, -4.8), 0xcbb88d);
  add(new T.SphereGeometry(.15, 10, 6).scale(1, .85, 1).translate(0, 4.71, -4.8), 0x9d8751);
  box([1.65, .7, .72], [0, .95, -4.25], 0x766044);
  for (let i = 0; i < 12; i++) box([.07, .06, .74], [-.77 + i * .14, 1.33, -4.25], 0x392f25);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .87 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#494031'; ctx.fillRect(0, 0, 256, 128); ctx.strokeStyle = '#b4a06f'; ctx.lineWidth = 5; ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = '#e0d2a6'; ctx.font = '42px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('潮風神社', 128, 66);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  const plaque = new T.Mesh(new T.PlaneGeometry(1.2, .6), new T.MeshStandardMaterial({ map, roughness: .9 }));
  plaque.rotation.y = Math.PI; plaque.position.set(0, 4.3, -4.91); root.add(plaque); return { root };
};
