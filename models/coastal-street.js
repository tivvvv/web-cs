// 海边街道设施. 同文件提供路栏, 站外导向牌和石墙变体.
FPS.models.coastalStreet = (T, options = {}) => {
  const root = new T.Group(), parts = new Map();
  const mat = (color, roughness = .8, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
  const iron = mat(0xa4b1ae, .4, .65), green = mat(0x397266, .6, .3), stone = mat(0x727d75);
  const cream = mat(0xd7cdb2), dark = mat(0x3c4a49);
  function add(g, m, p, r = [0, 0, 0]) {
    const mesh = new T.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...r); mesh.updateMatrix();
    if (!parts.has(m)) parts.set(m, []); parts.get(m).push(g.applyMatrix4(mesh.matrix));
  }
  const box = (s, p, m, r) => add(new T.BoxGeometry(...s), m, p, r);
  function cylinder(radius, height, p, m, r) { add(new T.CylinderGeometry(radius, radius, height, 12), m, p, r); }
  if (options.kind === 'railing') {
    const length = options.length ?? 30;
    for (let x = -length / 2; x <= length / 2; x += 2) {
      cylinder(.055, 1.14, [x, .57, 0], iron); box([.19, .16, .19], [x, .08, 0], cream);
      add(new T.SphereGeometry(.063, 8, 6), iron, [x, 1.15, 0]);
    }
    for (const y of [.42, .78, 1.1]) cylinder(.027, length, [0, y, 0], iron, [0, 0, Math.PI / 2]);
  } else if (options.kind === 'sign') {
    for (const x of [-.83, .83]) cylinder(.047, 2.72, [x, 1.36, 0], iron);
    box([1.85, 1.31, .09], [0, 1.98, 0], green);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 768; const ctx = c.getContext('2d');
    ctx.fillStyle = '#ebe8d8'; ctx.fillRect(0, 0, 1024, 768); ctx.fillStyle = '#31594f'; ctx.textAlign = 'center';
    ctx.font = '40px sans-serif'; ctx.fillText('江ノ島電鉄     EN08', 512, 100);
    ctx.font = '600 115px sans-serif'; ctx.fillText('鎌倉高校前', 512, 272);
    ctx.font = '37px sans-serif'; ctx.fillText('KAMAKURAKŌKŌMAE', 512, 357);
    ctx.fillStyle = '#276959'; ctx.fillRect(0, 430, 1024, 238); ctx.fillStyle = '#f0efdf';
    ctx.font = '59px sans-serif'; ctx.fillText('駅入口   ←', 512, 574); ctx.font = '28px sans-serif'; ctx.fillStyle = '#54665a'; ctx.fillText('海と暮らす街   /   KAMAKURA', 512, 733);
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace;
    add(new T.PlaneGeometry(1.72, 1.22), new T.MeshStandardMaterial({ map, roughness: .7 }), [0, 1.98, .052]);
  } else if (options.kind === 'wall') {
    const length = options.length ?? 20, height = options.height ?? 1.4;
    box([.42, height, length], [0, height / 2, 0], dark);
    for (let row = 0; row < Math.floor(height / .23); row++) for (let j = 0; j < Math.floor(length / .47); j++) {
      box([.47, .213, .445], [0, .12 + row * .23, -length / 2 + .24 + j * .47 + (row % 2) * .08], stone);
    }
    box([.54, .10, length + .1], [0, height, 0], cream);
  }
  for (const [m, geometries] of parts) {
    const mesh = new T.Mesh(T.mergeGeometries(geometries.map(g => g.index ? g.toNonIndexed() : g)), m);
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); geometries.forEach(g => g.dispose());
  }
  return { root };
};
