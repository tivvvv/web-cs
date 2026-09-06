// 静态售货机, 原点在底面中心, 正面朝 +Z. 彩色几何合批, 标识共用一张透明裁切纹理.
FPS.models.vendingMachine = T => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function add(geometry, color, position, rotation = [0, 0, 0]) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    pose.position.set(...position); pose.rotation.set(...rotation); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const box = (size, position, color) => add(new T.BoxGeometry(...size), color, position);
  const cylinder = (rt, rb, h, position, color) => add(new T.CylinderGeometry(rt, rb, h, 8), color, position);
  const paint = 0xe4e5db, trim = 0xa6b5b1, dark = 0x243637, silver = 0xc5ceca, teal = 0x397d72;
  // 深色展示舱嵌在机壳内, 瓶罐有真实厚度, 前方只保留边框与货架.
  box([1.04, 1.76, .58], [0, .97, -.085], paint);
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

  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 1408;
  const ctx = canvas.getContext('2d'), sx = canvas.width / 1.04, sy = canvas.height / 1.85;
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

  const shell = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .58, metalness: .18 }));
  shell.castShadow = shell.receiveShadow = true; root.add(shell); parts.forEach(g => g.dispose());
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const labels = new T.Mesh(new T.PlaneGeometry(1.04, 1.85), new T.MeshStandardMaterial({ map, alphaTest: .5, roughness: .65, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .12 }));
  // 标签空白处是透明的, 不作为命中表面, 避免在展示舱前留下悬空弹痕.
  labels.position.set(0, .925, .39); labels.receiveShadow = true; labels.raycast = () => {}; root.add(labels);
  return { root };
};
