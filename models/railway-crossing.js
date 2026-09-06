// 黑黄道口警示柱, 灯罩, 闪灯和栏杆. 栏杆固定, 与布局中的静态碰撞一致.
FPS.models.railwayCrossing = (T, options = {}) => {
  const root = new T.Group(), parts = new Map();
  const yellow = new T.MeshStandardMaterial({ color: 0xe5bd56, roughness: .61, metalness: .3 });
  const black = new T.MeshStandardMaterial({ color: 0x253235, roughness: .67, metalness: .4 });
  const iron = new T.MeshStandardMaterial({ color: 0x6b7979, roughness: .54, metalness: .68 });
  const concrete = new T.MeshStandardMaterial({ color: 0xaba99a, roughness: .98 });
  const red = [0, 1].map(() => new T.MeshStandardMaterial({ color: 0xb62522, emissive: 0xed291f, emissiveIntensity: 1, roughness: .22 }));
  function add(g, m, p, r = [0, 0, 0]) {
    const mesh = new T.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...r); mesh.updateMatrix();
    if (!parts.has(m)) parts.set(m, []); parts.get(m).push(g.applyMatrix4(mesh.matrix));
  }
  const box = (s, p, m, r) => add(new T.BoxGeometry(...s), m, p, r);
  box([.5, .45, .52], [0, .225, 0], concrete);
  for (let j = 0; j < 19; j++) add(new T.CylinderGeometry(.095, .095, .35, 16), j % 2 ? black : yellow, [0, .52 + j * .35, 0]);
  for (const angle of [-Math.PI / 4, Math.PI / 4]) {
    for (let j = -2; j <= 2; j++) {
      box([.3, .38, .08], [Math.sin(-angle) * j * .38, 4.65 + Math.cos(angle) * j * .38, .09], j % 2 ? black : yellow, [0, 0, angle]);
    }
  }
  add(new T.CylinderGeometry(.18, .18, .13, 16), black, [0, 4.65, .17], [Math.PI / 2, 0, 0]);
  box([1.04, .085, .085], [.45, 3.54, 0], black);
  for (let i = 0; i < 2; i++) {
    const x = i ? .89 : .3, y = i ? 2.74 : 3.38;
    add(new T.CylinderGeometry(.27, .27, .13, 28), black, [x, y, .12], [Math.PI / 2, 0, 0]);
    add(new T.CylinderGeometry(.165, .165, .02, 28), red[i], [x, y, .205], [Math.PI / 2, 0, 0]);
    add(new T.CylinderGeometry(.22, .25, .27, 24, 1, true, 0, Math.PI), black, [x, y + .05, .26], [Math.PI / 2, 0, 0]);
    box([.08, .8, .08], [x, y + .18, -.06], black);
  }
  box([.56, 1.1, .46], [.12, .69, .38], yellow);
  for (let j = 0; j < 3; j++) box([.57, .14, .017], [.12, .4 + j * .31, .621], black, [0, 0, -.48]);
  add(new T.CylinderGeometry(.19, .19, .6, 16), iron, [.18, 1.2, .38], [Math.PI / 2, 0, 0]);
  const angle = options.armAngle ?? 0, length = 3.55;
  for (let j = 0; j < 12; j++) {
    const x = .2 + (j + .5) * length / 12;
    box([length / 12, .10, .085], [.18 + Math.cos(angle) * x, 1.2 + Math.sin(angle) * x, .73], j % 2 ? black : yellow, [0, 0, angle]);
  }
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 384;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e8e1bf'; ctx.fillRect(0, 0, 320, 384);
  ctx.strokeStyle = '#947654'; ctx.lineWidth = 12; ctx.strokeRect(7, 7, 306, 370);
  ctx.textAlign = 'center'; ctx.fillStyle = '#514731'; ctx.font = 'bold 51px sans-serif';
  ctx.fillText('とまれ', 160, 105); ctx.fillText('踏切注意', 160, 200); ctx.font = '30px sans-serif'; ctx.fillText('CAUTION', 160, 298);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  const sign = new T.Mesh(new T.PlaneGeometry(.55, .66), new T.MeshStandardMaterial({ map, roughness: .9 }));
  sign.position.set(0, 2.05, .14); root.add(sign);
  for (const [m, geometries] of parts) {
    const mesh = new T.Mesh(T.mergeGeometries(geometries.map(g => g.index ? g.toNonIndexed() : g)), m);
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); geometries.forEach(g => g.dispose());
  }
  let time = options.phase ?? 0;
  return { root, update(dt) {
    time += dt;
    for (let i = 0; i < 2; i++) red[i].emissiveIntensity = (Math.floor(time * 1.8) + i) % 2 ? .08 : 2.4;
  } };
};
