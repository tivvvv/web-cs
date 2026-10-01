// 静态售货机, 原点在底面中心, 正面朝 +Z. 侧面品牌/背面检修与机壳共用图集, 两网格.
FPS.models.vendingMachine = T => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function add(geometry, color, position, rotation = [0, 0, 0]) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    pose.position.set(...position); pose.rotation.set(...rotation); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = new Float32Array(g.attributes.position.count * 3);
    const uv = g.attributes.uv, p = g.attributes.position;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (let i = 0; i < uv.count; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
    for (let i = 0; i < p.count; i++) {
      const shade = .96 - Math.max(0, Math.min(1, (.35 - p.getY(i)) / .35)) * .09;
      colors.set([c.r * shade, c.g * shade, c.b * shade], i * 3);
      uv.setXY(i, (898 + 124 * (uv.getX(i) - u0) / (u1 - u0 || 1)) / 1024, 1 - (2 + 252 * (1 - (uv.getY(i) - v0) / (v1 - v0 || 1))) / 1408);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (size, position, color) => add(new T.BoxGeometry(...size), color, position);
  const cylinder = (rt, rb, h, position, color) => add(new T.CylinderGeometry(rt, rb, h, 8), color, position);
  const paint = 0xe4e5db, trim = 0xa6b5b1, dark = 0x243637, silver = 0xc5ceca, teal = 0x397d72;
  // 深色展示舱嵌在机壳内, 瓶罐有真实厚度, 前方只保留边框与货架.
  const shellShape = new T.Shape(), bevel = .012;
  shellShape.moveTo(-.52 + bevel, -.88 + bevel); shellShape.lineTo(.52 - bevel, -.88 + bevel);
  shellShape.lineTo(.52 - bevel, .88 - bevel); shellShape.lineTo(-.52 + bevel, .88 - bevel); shellShape.closePath();
  add(new T.ExtrudeGeometry(shellShape, { depth: .58 - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 }).translate(0, 0, -.29 + bevel), paint, [0, .97, -.085]);
  box([.73, 1.04, .016], [-.1, 1.09, .216], dark);
  box([.07, 1.71, .16], [-.485, .945, .285], paint);
  box([.23, 1.71, .16], [.405, .945, .285], paint);
  box([1.04, .23, .17], [0, 1.735, .285], paint);
  box([1.04, .13, .17], [0, .505, .285], paint);
  // 机壳从 .09 米开始, 底座内缩并支撑机壳, 避免同宽侧面重合闪烁.
  box([.96, .075, .67], [0, .0525, 0], dark);
  for (const x of [-.435, .26]) box([.016, 1.04, .025], [x, 1.09, .36], trim);
  for (const y of [.58, 1.60]) box([.71, .022, .025], [-.09, y, .36], trim);
  for (const x of [-.38, .38]) box([.12, .045, .54], [x, .0225, -.02], dark);

  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1408;
  const ctx = canvas.getContext('2d'), sx = 768 / 1.04, sy = canvas.height / 1.85;
  const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect((x + .52) * sx, (1.85 - y - h) * sy, w * sx, h * sy); };
  function text(label, x, y, size, color = '#edf1dc') {
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.font = `600 ${size * sy}px sans-serif`;
    ctx.fillText(label, (x + .52) * sx, (1.85 - y) * sy);
  }
  rect(-.48, 1.65, .96, .15, '#286b62');
  text('湘南 DRINKS', 0, 1.718, .062); text('COLD REFRESHMENTS', 0, 1.674, .023);
  const drinks = [[0x66aac2, 'WATER', 120], [0x547e48, 'TEA', 140], [0xe5a244, 'ORANGE', 150], [0x815b47, 'COFFEE', 130]];
  for (let row = 0; row < 3; row++) {
    const y = .68 + row * .30;
    box([.69, .022, .15], [-.09, y, .29], silver);
    for (let col = 0; col < 4; col++) {
      const x = -.36 + col * .17, [color, name, price] = drinks[(col + row) % 4], bottle = (col + row) % 2 === 0;
      cylinder(.032, .032, .13, [x, y + .085, .294], color);
      cylinder(.033, .033, .05, [x, y + .082, .294], paint);
      if (bottle) {
        cylinder(.014, .032, .025, [x, y + .1625, .294], color);
        cylinder(.014, .014, .025, [x, y + .1875, .294], paint);
        cylinder(.017, .017, .012, [x, y + .206, .294], teal);
      } else cylinder(.033, .033, .007, [x, y + .1535, .294], silver);
      rect(x - .068, y - .071, .136, .062, '#e5e8df');
      text(name, x, y - .028, .012, '#304449'); text('¥' + price, x, y - .053, .019, '#243b3f');
      box([.059, .018, .024], [x, y - .093, .36], teal);
    }
  }
  // 支付区和取货口用几块有厚度的边框, 微小信息留在贴图上.
  box([.17, .57, .018], [.405, 1.14, .372], dark);
  rect(.332, 1.315, .145, .072, '#183d32'); text('¥ 120', .405, 1.335, .035, '#c8e88c');
  rect(.353, 1.233, .10, .012, '#080e10'); text('COIN', .405, 1.267, .018);
  rect(.337, 1.127, .135, .055, '#487880'); text('IC', .405, 1.140, .028);
  rect(.345, 1.035, .12, .011, '#070d0e'); text('BILL', .405, 1.062, .016);
  box([.055, .025, .022], [.45, .935, .374], 0xd1a158);
  box([.13, .065, .022], [.405, .79, .37], dark);
  text('CHANGE', .405, .841, .017, '#385453');
  box([.66, .26, .012], [-.07, .287, .217], dark);
  for (const x of [-.425, .285]) box([.05, .30, .16], [x, .285, .285], paint);
  for (const y of [.145, .425]) box([.76, .035, .16], [-.07, y, .285], paint);
  box([.64, .13, .016], [-.07, .34, .274], trim);
  box([.67, .017, .14], [-.07, .185, .29], silver);
  text('PUSH / お取りください', -.07, .467, .026, '#46645b');
  for (let i = 0; i < 6; i++) box([.12, .008, .018], [.42, .20 + i * .026, .364], dark);
  // 薄侧板, 底部进风百叶和后盖都在场景配置的机壳碰撞内, 不增加独立网格.
  for (const side of [-1, 1]) {
    box([.008, 1.35, .42], [side * .52, 1.105, -.08], 0xd3d9ce);
    box([.006, .18, .28], [side * .524, .29, -.08], dark);
    for (let i = 0; i < 6; i++) box([.008, .012, .27], [side * .529, .218 + i * .029, -.08], silver);
  }
  box([.84, 1.15, .014], [0, 1.135, -.384], 0xbac4bb);
  for (const x of [-.367, .367]) for (const y of [.64, 1.63])
    add(new T.CylinderGeometry(.009, .009, .012, 6), dark, [x, y, -.394], [Math.PI / 2, 0, 0]);
  box([.3, .16, .014], [0, 1.42, -.398], silver);
  box([.68, .20, .016], [0, .32, -.387], dark);
  for (let i = 0; i < 7; i++) box([.66, .011, .02], [0, .245 + i * .025, -.396], silver);
  box([.14, .085, .02], [.32, .15, -.39], 0xa6b4aa);
  // 留出原正面 768x1408 区域, 右侧存品牌/检修标识及中性漆面颗粒.
  ctx.fillStyle = '#286b62'; ctx.fillRect(768, 0, 128, 640);
  ctx.fillStyle = '#e7dfb9'; ctx.fillRect(768, 0, 128, 9);
  ctx.textAlign = 'center'; ctx.fillStyle = '#edf1dc'; ctx.font = '600 56px sans-serif';
  ['湘', '南', '飲', '料'].forEach((s, i) => ctx.fillText(s, 832, 91 + i * 79));
  ctx.font = '600 13px sans-serif'; ctx.fillText('SHONAN', 832, 402);
  ctx.fillStyle = '#e5e9d7'; ctx.fillRect(814, 456, 36, 89); ctx.fillRect(824, 435, 16, 21); ctx.fillRect(821, 429, 22, 8);
  ctx.fillStyle = '#74a69a'; ctx.fillRect(818, 479, 28, 28);
  ctx.strokeStyle = '#b5d2ba'; ctx.lineWidth = 4; ctx.beginPath();
  for (let x = 773; x < 893; x++) { const y = 583 + Math.sin((x - 773) / 15) * 7; if (x === 773) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
  ctx.fillStyle = '#d4dacf'; ctx.fillRect(768, 704, 256, 128); ctx.fillStyle = '#354940'; ctx.font = '600 23px sans-serif';
  ctx.fillText('SHONAN / VM-04', 896, 738); ctx.font = '17px sans-serif'; ctx.fillText('100V  50/60Hz', 896, 768); ctx.fillText('点検・清掃 / SERVICE', 896, 802);
  const grain = ctx.createImageData(128, 256); let seed = 811;
  for (let i = 0; i < grain.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 247 + (seed / 4294967296 - .5) * 12; grain.data.set([v, v, v, 255], i);
  }
  ctx.putImageData(grain, 896, 0);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const shell = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .0006, vertexColors: true, roughness: .58, metalness: .18 }));
  shell.castShadow = shell.receiveShadow = true; root.add(shell); parts.forEach(g => g.dispose());
  const labelParts = [];
  function label(size, p, yaw, rect) {
    const g = new T.PlaneGeometry(...size), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (rect[0] + .5 + uv.getX(i) * (rect[2] - 1)) / canvas.width, 1 - (rect[1] + .5 + (1 - uv.getY(i)) * (rect[3] - 1)) / canvas.height);
    pose.position.set(...p); pose.rotation.set(0, yaw, 0); pose.updateMatrix(); g.applyMatrix4(pose.matrix); labelParts.push(g);
  }
  label([1.04, 1.85], [0, .925, .39], 0, [0, 0, 768, 1408]);
  for (const side of [-1, 1]) label([.32, 1.2], [side * .53, 1.15, -.08], side * Math.PI / 2, [768, 0, 128, 640]);
  label([.28, .14], [0, 1.42, -.409], Math.PI, [768, 704, 256, 128]);
  const labels = new T.Mesh(T.mergeGeometries(labelParts), new T.MeshStandardMaterial({ map, alphaTest: .5, roughness: .65, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .12 }));
  labelParts.forEach(g => g.dispose());
  // 标签空白处是透明的, 不作为命中表面, 避免在展示舱前留下悬空弹痕.
  labels.receiveShadow = true; labels.raycast = () => {}; root.add(labels);
  return { root };
};
