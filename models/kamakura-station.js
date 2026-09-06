// 单侧站台, 雨棚, 日文站牌和候车设施. 原点位于站台底面中心.
FPS.models.kamakuraStation = (T, options = {}) => {
  const root = new T.Group(), batches = new Map();
  const lift = options.canopyLift ?? 0;
  const mat = (color, roughness = .8, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
  const concrete = mat(0xa6a59a), fascia = mat(0xd5d2bf), iron = mat(0x53675d, .48, .55);
  const roof = mat(0x596a64, .65, .4), yellow = mat(0xdbb74b);
  const wood = mat(0x9d7550), white = mat(0xeee9db);
  function box(s, p, m, r = [0, 0, 0]) {
    const g = new T.BoxGeometry(...s), mesh = new T.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...r); mesh.updateMatrix();
    if (!batches.has(m)) batches.set(m, []); batches.get(m).push(g.applyMatrix4(mesh.matrix));
  }
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
  box([34, .68, 3.5], [0, .34, 0], concrete);
  box([34, .08, .28], [0, .72, -1.58], fascia);
  box([33.6, .035, .38], [0, .743, -1.2], yellow);
  box([34, .03, .09], [0, .725, -1.42], white);
  // 盲道凸点采用实例绘制, 保留近距离可见的起伏与阴影.
  const studs = new T.InstancedMesh(new T.CylinderGeometry(.015, .019, .009, 6), yellow, 1120);
  const matrix = new T.Matrix4(); let index = 0;
  for (let x = -16.7; x < 16.8; x += .12) for (let j = 0; j < 4; j++) {
    matrix.makeTranslation(x, .765, -1.34 + j * .085); studs.setMatrixAt(index++, matrix);
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
  // 站台东端用台阶连接道路, 不增加单独的行走更新代码.
  for (let i = 0; i < 4; i++) box([.48, .17 * (4 - i), 2.65], [17.23 + i * .48, .085 * (4 - i), .22], concrete);
  for (const [m, geometries] of batches) {
    const mesh = new T.Mesh(T.mergeGeometries(geometries), m); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  return { root };
};
