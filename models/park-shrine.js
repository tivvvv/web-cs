// 小型木构神社, 正面 -Z; 台基, 木廊, 曲面瓦檐, 格门与拜殿细节静态合批.
FPS.models.parkShrine = T => {
  const root = new T.Group(), parts = [[], [], [], [], []];
  function add(g, color) {
    const batch = [0x96998c, 0xb1b4a6, 0x85887d].includes(color) ? 1 : [0x485854, 0x64716b, 0x59665d].includes(color) ? 2 : color === 0xcec5a8 ? 3 : color === 0xeee8d6 ? 4 : 0;
    if (g.index) { const flat = g.toNonIndexed(); g.dispose(); g = flat; }
    const p = g.attributes.position, n = g.attributes.normal, uv = [];
    g.computeBoundingBox(); const span = g.boundingBox.getSize(new T.Vector3());
    const axis = span.y > span.x && span.y > span.z ? 'y' : span.z > span.x ? 'z' : 'x';
    for (let i = 0; i < p.count; i++) {
      if (batch === 0) uv.push(axis === 'y' ? (Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) * 3 : axis === 'z' ? p.getX(i) * 3 : (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) * 3, p['get' + axis.toUpperCase()](i) * .3);
      else uv.push((Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) * (batch === 2 ? .7 : 1.5), (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) * (batch === 2 ? .7 : 1.5));
    }
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts[batch].push(g);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s).translate(...p), c), wood = 0x64503b, dark = 0x40392e;
  box([10.8, .48, 9], [0, .24, -.6], 0x96998c);
  for (let i = 0; i < 4; i++) box([3.4, .15 * (i + 1), .45], [0, .075 * (i + 1), -6.675 + i * .45], 0xb1b4a6);
  for (let i = 0; i < 27; i++) box([.388, .12, 8.9], [-5.2 + i * .4, .54, -.6], i % 3 ? 0x887256 : 0x7b654e);
  // 门洞挖空, 不在格门后叠一整面实墙; 远处的门面不再与墙面争抢深度.
  for (const side of [-1, 1]) box([.18, 3.3, 5.82], [side * 4.31, 2.25, .19], 0xcec5a8);
  box([8.44, 3.3, .18], [0, 2.25, 3.01], 0xcec5a8);
  box([8.8, .155, .18], [0, .6775, -2.81], 0xcec5a8);
  box([8.8, .495, .18], [0, 3.6525, -2.81], 0xcec5a8);
  for (const [left, right] of [[-4.4, -4.21], [-2.29, -2.06], [-.14, .14], [2.06, 2.29], [4.21, 4.4]])
    box([right - left, 2.65, .18], [(left + right) / 2, 2.08, -2.81], 0xcec5a8);
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
    // 横档压在竖条前面, 交叉处正面留 3.35 厘米间距, 不保留共面木纹.
    for (const y of [.78, 1.2, 2.05, 3.39]) box([1.95, .065, .05], [x, y, -3.016], wood);
  }
  box([9.6, .28, .27], [0, 4.82, -4.75], wood);
  box([.16, 1.85, .17], [0, 5.1, -4.75], wood);
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
  // 注连绳与折纸垂饰明确神社入口, 檐下与侧墙增加木构层次.
  const rope = x => 4.12 - .27 * (1 - (x / 3.9) ** 2), up = new T.Vector3(0, 1, 0), pose = new T.Object3D();
  for (let i = 0; i < 26; i++) {
    const x0 = -3.9 + i * .3, x1 = x0 + .3, a = new T.Vector3(x0, rope(x0), -4.85), delta = new T.Vector3(x1, rope(x1), -4.85).sub(a);
    pose.position.copy(a).addScaledVector(delta, .5); pose.quaternion.setFromUnitVectors(up, delta.clone().normalize()); pose.updateMatrix();
    add(new T.CylinderGeometry(.033, .036, delta.length() + .014, 8).applyMatrix4(pose.matrix), 0xc4b181);
  }
  for (const x of [-2.7, -.9, .9, 2.7]) for (let i = 0; i < 4; i++)
    box([.13, .13, .016], [x + (i % 2 ? .075 : 0), rope(x) - .1 - i * .11, -4.9], 0xeee8d6);
  for (const side of [-1, 1]) {
    for (const z of [-2.7, -1.2, .3, 1.8, 3]) box([.09, 3.25, .095], [side * 4.45, 2.26, z], wood);
    for (const y of [.79, 3.72]) box([.1, .11, 6], [side * 4.45, y, .1], dark);
  }
  function surfaceMap(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 881;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = (seed / 4294967296 - .5) * (kind === 0 ? 7 : 17);
      let v = 243 + noise;
      if (kind === 0) v += 9 * Math.sin(x * .33 + Math.sin(y * .025) * 1.4) * Math.sin(x * .073 + Math.sin(y * .04));
      if (kind === 2) { v -= 13 + 6 * Math.sin(x * Math.PI / 32); if (y % 64 < 3 || x % 64 < 2) v -= 35; }
      if (kind === 3) v = 250 + noise * .2;
      pixels.data.set([v, v, v - (kind === 0 ? 4 : 0), 255], (y * 256 + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4; return map;
  }
  for (const [i, batch] of parts.entries()) if (batch.length) {
    const map = i < 4 ? surfaceMap(i) : undefined;
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: i === 2 ? .026 : .012, vertexColors: true, roughness: i === 2 ? .8 : .94 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  }
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#494031'; ctx.fillRect(0, 0, 256, 128); ctx.strokeStyle = '#b4a06f'; ctx.lineWidth = 5; ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = '#e0d2a6'; ctx.font = '42px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('潮風神社', 128, 66);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  // 文字是实体牌匾的前表面, 不是叠在另一块完整正面上的贴片; 五个侧/背面合为一组.
  const board = new T.BoxGeometry(1.34, .74, .1); board.clearGroups(); board.addGroup(0, 30, 0); board.addGroup(30, 6, 1);
  const plaque = new T.Mesh(board, [new T.MeshStandardMaterial({ color: wood, roughness: .94 }), new T.MeshStandardMaterial({ map, roughness: .9 })]);
  plaque.name = 'shrine-plaque'; plaque.position.set(0, 4.3, -4.83); plaque.castShadow = plaque.receiveShadow = true;
  root.add(plaque); return { root };
};
