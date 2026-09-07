// 单侧站台, 雨棚, 日文站牌和候车设施. 原点位于站台底面中心.
FPS.models.kamakuraStation = (T, options = {}) => {
  const root = new T.Group(), batches = new Map();
  const lift = options.canopyLift ?? 0;
  const mat = (color, roughness = .8, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
  const concrete = mat(0xb8baaf, .94), asphalt = mat(0x60696b, .98), fascia = mat(0xd5d2bf), iron = mat(0x53675d, .48, .55);
  const roof = mat(0x596a64, .65, .4), yellow = mat(0xdbb74b);
  const wood = mat(0x9d7550), white = mat(0xeee9db);
  // 一张小纹理共用于沥青与混凝土, 靠底色和颗粒尺度区分, 不增加凹凸采样.
  const grain = document.createElement('canvas'); grain.width = grain.height = 128;
  const ctx = grain.getContext('2d'), pixels = ctx.createImageData(128, 128); let seed = 308;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = seed % 47 === 0 ? 175 : 207 + (seed >>> 24) % 33;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const aggregate = new T.CanvasTexture(grain); aggregate.colorSpace = T.SRGBColorSpace;
  aggregate.wrapS = aggregate.wrapT = T.RepeatWrapping; aggregate.anisotropy = 4;
  asphalt.map = concrete.map = aggregate;
  function add(source, p, m, r = [0, 0, 0]) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    const mesh = new T.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...r); mesh.updateMatrix();
    g.applyMatrix4(mesh.matrix);
    if (m.map) {
      const a = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, repeat = m === asphalt ? 3 : 5;
      for (let i = 0; i < a.count; i++) uv.setXY(i, (Math.abs(n.getX(i)) > .5 ? a.getZ(i) : a.getX(i)) * repeat, (Math.abs(n.getY(i)) > .5 ? a.getZ(i) : a.getY(i)) * repeat);
    }
    if (!batches.has(m)) batches.set(m, []); batches.get(m).push(g);
  }
  const box = (s, p, m, r) => add(new T.BoxGeometry(...s), p, m, r);
  function sign(lines, w, h, position, background = '#f1eddc') {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = '#186751'; ctx.fillRect(0, 340, 1024, 92); ctx.fillStyle = '#203e36'; ctx.textAlign = 'center';
    ctx.font = '500 42px sans-serif'; ctx.fillText(lines[0], 512, 85);
    ctx.font = '600 106px sans-serif'; ctx.fillText(lines[1], 512, 220);
    ctx.font = '32px sans-serif'; ctx.fillText(lines[2], 512, 292);
    ctx.fillStyle = '#fff8e6'; ctx.font = '32px sans-serif'; ctx.fillText(lines[3], 512, 399);
    ctx.fillStyle = '#5d665b'; ctx.font = '28px sans-serif'; ctx.fillText('江ノ島電鉄  /  ENOSHIMA ELECTRIC RAILWAY', 512, 478);
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map, roughness: .7 }));
    mesh.position.set(...position); root.add(mesh);
    box([w + .08, h + .08, .085], [position[0], position[1], position[2] - .05], iron);
  }
  // 表层与收边各占独立范围, 顶面仍为 .68, 保持售货机落地和原有通行高度.
  box([34, .655, 3.5], [0, .3275, 0], concrete);
  // 黄色砖嵌入表层, 与沥青同高; 分割底面避免共面贴片闪烁.
  const floorY = .68, relief = .005, warningZ = -.76, guideZ = -.27;
  const tactile = [[-16.8, 16.8, -.95, -.57], [14.2, 16.2, -.42, -.12], [13.6, 14.2, -.57, .03], [16.2, 16.8, -.57, .03]];
  const xs = [...new Set([-16.82, 16.82, ...tactile.flatMap(r => r.slice(0, 2))])].sort((a, b) => a - b);
  const zs = [...new Set([-1, 1.57, ...tactile.flatMap(r => r.slice(2))])].sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) for (let j = 1; j < zs.length; j++) {
    const x = (xs[i - 1] + xs[i]) / 2, z = (zs[j - 1] + zs[j]) / 2;
    if (!tactile.some(([a, b, c, d]) => x > a && x < b && z > c && z < d)) box([xs[i] - xs[i - 1], .025, zs[j] - zs[j - 1]], [x, floorY - .0125, z], asphalt);
  }
  for (const [a, b, c, d] of tactile) box([b - a, .025, d - c], [(a + b) / 2, floorY - .0125, (c + d) / 2], yellow);
  box([34, .025, .75], [0, .6675, -1.375], concrete);
  box([34, .025, .18], [0, .6675, 1.66], concrete);
  for (const x of [-16.91, 16.91]) box([.18, .025, 2.57], [x, .6675, .285], concrete);
  box([34, .08, .28], [0, .72, -1.58], fascia);
  // 警示带外缘距临轨边 .8 米, 点纹与内方线统一仅凸起 5 毫米.
  box([33.4, relief, .025], [0, floorY + relief / 2, warningZ + .145], yellow);
  box([34, .006, .07], [0, .763, -1.58], white);
  // 仅在东侧入口保留 2 米引导段, 两端为同尺寸提示砖, 不再贯穿月台.
  for (const dz of [-.085, 0, .085]) box([2, relief, .022], [15.2, floorY + relief / 2, guideZ + dz], yellow);
  // 警示带三排凸点和入口提示共用原有实例批次, 不增加绘制调用.
  const studs = new T.InstancedMesh(new T.CylinderGeometry(.012, .018, relief, 8), yellow, 1120);
  const matrix = new T.Matrix4(); let index = 0;
  for (let x = -16.7; x < 16.8; x += .12) for (let j = 0; j < 3; j++) {
    matrix.makeTranslation(x, floorY + relief / 2, warningZ - .13 + j * .085); studs.setMatrixAt(index++, matrix);
  }
  for (const x of [13.9, 16.5]) {
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      matrix.makeTranslation(x - .2 + i * .1, floorY + relief / 2, guideZ - .2 + j * .1); studs.setMatrixAt(index++, matrix);
    }
  }
  studs.count = index; studs.receiveShadow = true; root.add(studs);
  for (const x of [-13, -7, -1, 5, 11]) {
    box([.13, 2.65 + lift, .14], [x, 2.06 + lift / 2, .65], iron);
    box([.3, .18, .3], [x, .81, .65], concrete);
    box([.095, .09, 3.2], [x, 3.24 + lift, 0], iron);
    box([.075, .07, 1.2], [x, 2.96 + lift, .18], iron, [0.48, 0, 0]);
  }
  box([29.5, .105, 3.45], [-1, 3.43 + lift, 0], roof, [.06, 0, 0]);
  for (let x = -15.7; x < 14; x += .36) box([.025, .04, 3.46], [x, 3.50 + lift, 0], iron, [.06, 0, 0]);
  for (const z of [-1.75, 1.75]) box([29.7, .24, .065], [-1, 3.39 + lift, z], fascia);
  for (const x of [-13, -4, 5]) {
    box([1.55, .045, .16], [x, 3.28 + lift, 0], white);
    box([1.68, .07, .22], [x, 3.32 + lift, 0], iron);
  }
  for (const x of [-10, 0, 9]) {
    for (const dx of [-.95, .95]) {
      box([.08, .45, .58], [x + dx, .94, .56], iron);
      box([.075, .87, .075], [x + dx, 1.18, .84], iron);
    }
    for (let j = 0; j < 4; j++) box([2.3, .055, .1], [x, 1.19, .32 + j * .13], wood);
    for (let j = 0; j < 3; j++) box([2.3, .115, .05], [x, 1.4 + j * .14, .87], wood);
  }
  for (let x = -16; x <= 16; x += 2) {
    box([.055, 1.02, .055], [x, 1.22, 1.65], iron);
    for (const y of [1, 1.67]) box([2, .04, .035], [x, y, 1.65], iron);
    for (let j = 0; j < 8; j++) box([.017, .64, .017], [x - .875 + j * .25, 1.33, 1.65], iron);
  }
  sign(['EN08    かまくらこうこうまえ', '鎌倉高校前', 'KAMAKURAKŌKŌMAE', '← 腰越  KOSHIGOE                 七里ヶ浜  SHICHIRIGAHAMA →'], 2.55, 1.28, [-5, 2.42, .94]);
  // 站牌保留阅读高度, 吊杆连接抬高后的棚顶.
  for (const x of [-5.9, -4.1]) box([.025, .26 + lift, .025], [x, 3.21 + lift / 2, .89], iron);
  // 踏面分为三块浅色面板, 前缘倒角 12 毫米; 高度和占地沿用原台阶.
  const rail = options.stairRail ?? [[16.8, 1.63, -1.02], [17.23, 1.63, -1.02], [18.67, 1.12, -1.02], [19.08, 1.12, -1.02]];
  for (let i = 0; i < 4; i++) {
    const x = 17.23 + i * .48, h = .17 * (4 - i), span = 2.65 / 3, back = i === 0 ? -.23 : -.24;
    const tread = new T.Shape(); tread.moveTo(back, 0); tread.lineTo(.24, 0); tread.lineTo(.24, .008); tread.lineTo(.228, .02); tread.lineTo(back, .02); tread.closePath();
    // 顶级从月台边 X=17 开始, 去掉原来同高面的 1 厘米重叠.
    box([.24 - back, h - .02, 2.65], [x + (.24 + back) / 2, (h - .02) / 2, .22], concrete);
    for (let j = 0; j < 3; j++) {
      const z = -1.105 + j * span;
      add(new T.ExtrudeGeometry(tread, { depth: span - .006, bevelEnabled: false }), [x, h - .02, z + .003], fascia);
      box([.055, .003, span - .02], [x + .15, h + .0015, z + span / 2], asphalt);
    }
    box([.14, .035, .14], [x, h + .0175, rail[0][2]], iron);
    add(new T.CylinderGeometry(.027, .027, .915, 8), [x, h + .4925, rail[0][2]], iron);
  }
  // 单侧圆管扶手随台阶下降, 两端短延伸保持入口开放, 并入原有金属批次.
  for (let i = 1; i < rail.length; i++) {
    const a = new T.Vector3(...rail[i - 1]), d = new T.Vector3(...rail[i]).sub(a), pose = new T.Object3D();
    pose.position.copy(a.addScaledVector(d, .5)); pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); pose.updateMatrix();
    add(new T.CylinderGeometry(.032, .032, d.length(), 8).applyMatrix4(pose.matrix), [0, 0, 0], iron);
  }
  for (const p of rail) add(new T.SphereGeometry(.032, 8, 4), p, iron);
  for (const [m, geometries] of batches) {
    const mesh = new T.Mesh(T.mergeGeometries(geometries), m); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  return { root };
};
