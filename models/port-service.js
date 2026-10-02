// 港区值班亭, 高杆灯与岸边安全设施. 无实时灯光/循环, 六材质合批.
FPS.models.portService = (T, o = {}) => {
  const root = new T.Group(), parts = Array.from({ length: 6 }, () => []), pose = new T.Object3D(); let matrix = new T.Matrix4();
  function add(source, color, batch = 0, p = [0, 0, 0], r = [0, 0, 0]) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); g.applyMatrix4(pose.matrix).applyMatrix4(matrix);
    const c = new T.Color(color), rgb = []; for (let i = 0; i < g.attributes.position.count; i++) rgb.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (s, p, c = 0x7b9087, batch = 0, r) => add(new T.BoxGeometry(...s), c, batch, p, r);
  const cyl = (radius, length, p, c = 0x819487, batch = 1, r = [0, 0, 0], n = 12) => add(new T.CylinderGeometry(radius, radius, length, n), c, batch, p, r);
  function setPose(p, yaw = 0) { pose.position.set(...p); pose.rotation.set(0, yaw, 0); pose.updateMatrix(); matrix = pose.matrix.clone(); }
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512; const ctx = canvas.getContext('2d');
  const words = [['港湾管理', 'TERMINAL CONTROL'], ['消防設備', 'FIRE HOSE'], ['救命浮環', 'LIFE RING'], ['高電圧', 'ELECTRICAL']];
  for (let i = 0; i < words.length; i++) {
    const x = i % 2 * 512, y = Math.floor(i / 2) * 256; ctx.fillStyle = i === 1 ? '#915746' : '#3f666b'; ctx.fillRect(x, y, 512, 256);
    ctx.fillStyle = '#e4dec0'; ctx.textAlign = 'center'; ctx.font = '600 61px sans-serif'; ctx.fillText(words[i][0], x + 256, y + 111); ctx.font = '24px monospace'; ctx.fillText(words[i][1], x + 256, y + 173);
  }
  const labels = new T.CanvasTexture(canvas); labels.colorSpace = T.SRGBColorSpace; labels.anisotropy = 8;
  function sign(s, p, slot) {
    // 印字直接映射到厚盒的正面, 其他面采样图集内同色空白, 无叠片.
    const g = new T.BoxGeometry(...s), uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const front = n.getZ(i) > .5; uv.setXY(i, (slot % 2 + (front ? .02 + uv.getX(i) * .96 : .02)) / 2, 1 - (Math.floor(slot / 2) + (front ? .02 + (1 - uv.getY(i)) * .96 : .02)) / 2);
    }
    add(g, 0xffffff, 5, p);
  }
  for (const light of o.lights ?? [{ position: [0, 0, 0], height: 12 }]) {
    const h = light.height ?? 12; setPose(light.position);
    box([.8, .18, .8], [0, .09, 0], 0xa6aea0, 2);
    add(new T.CylinderGeometry(.075, .16, h, 12), 0x81958e, 1, [0, h / 2 + .18, 0]);
    for (const x of [-.27, .27]) for (const z of [-.27, .27]) cyl(.035, .08, [x, .21, z], 0x596e62, 1, [0, 0, 0], 6);
    box([.17, .25, .06], [0, 1.22, .165], 0x455f5d, 1);
    box([3.1, .15, .17], [0, h + .22, 0], 0x617972, 1);
    for (const x of [-1.23, -.42, .42, 1.23]) {
      box([.52, .26, .4], [x, h + .08, -.06], 0x3f5958, 1, [.3, 0, 0]);
      box([.44, .045, .34], [x, h - .064, -.04], 0xd1d1b4, 4, [.3, 0, 0]);
      box([.07, .31, .09], [x, h + .21, 0], 0x7e9184, 1);
    }
    cyl(.047, .51, [0, h + .49, 0], 0xc7b37c, 1);
  }
  for (const booth of o.booths ?? []) {
    setPose(booth.position, booth.yaw ?? 0);
    box([3.04, .12, 2.64], [0, .06, 0], 0xaab0a0, 2);
    box([2.8, 2.65, 2.4], [0, 1.445, 0], 0xb1b8a5);
    box([2.9, .54, 2.5], [0, .39, 0], 0x506e70);
    box([3.22, .15, 2.96], [0, 2.89, 0], 0x607b79, 1);
    // 窗台, 滴水帽与窗框在四面均完整; 入口方向的门也有把手和铰链.
    for (const side of [-1, 1]) {
      box([1.86, 1.02, .04], [0, 1.82, side * 1.224], 0x36555e, 3);
      for (const x of [-.96, .96]) box([.065, 1.16, .09], [x, 1.82, side * 1.24], 0x859e95, 1);
      for (const y of [1.27, 2.37]) box([2.03, .06, .1], [0, y, side * 1.24], 0x96a89b, 1);
      box([.06, 1.05, .09], [0, 1.82, side * 1.24], 0x879e93, 1);
      box([2.14, .065, .2], [0, 1.23, side * 1.25], 0x8c9e8e, 1);
      box([2.12, .065, .24], [0, 2.45, side * 1.29], 0x607c73, 1);
      box([.045, 1.1, .05], [side * 1.39, .8, -side * 1.23], 0x506c67, 1);
    }
    box([.045, 1.03, 1.5], [-1.425, 1.83, 0], 0x34535d, 3);
    for (const z of [-.79, .79]) box([.1, 1.13, .065], [-1.44, 1.83, z], 0x849f95, 1);
    for (const y of [1.29, 2.38]) box([.1, .055, 1.63], [-1.44, y, 0], 0x849f95, 1);
    box([.055, 2.18, .9], [1.428, 1.23, .35], 0x617c76, 1);
    box([.075, .83, .72], [1.471, 1.71, .35], 0x345762, 3);
    for (const z of [-.12, .82]) box([.09, 2.28, .055], [1.45, 1.23, z], 0x94a796, 1);
    box([.14, .13, .035], [1.5, 1.11, .65], 0xc1c6ae, 1);
    for (const y of [.58, 1.85]) box([.09, .11, .045], [1.481, y, -.1], 0x637d70, 1);
    sign([1.8, .38, .08], [0, 2.67, 1.26], 0);
    box([.64, .54, .28], [.96, .99, -1.33], 0x748b7c, 1);
    for (let y = .79; y < 1.23; y += .085) box([.48, .018, .035], [.96, y, -1.491], 0x395753, 1);
    for (const x of [-1.17, 1.17]) box([.075, 2.71, .075], [x, 1.5, -1.3], 0x758e7e, 1);
  }
  for (const p of o.barriers ?? []) {
    setPose(p);
    box([.5, .95, .5], [0, .475, 0], 0xb49a5c); box([.58, .06, .57], [0, .98, 0], 0x5d7970, 1);
    // 道闸保持竖起, 横向入口实空.
    box([.14, 3.85, .14], [0, 2.91, .12], 0xd7d5b6);
    for (let y = 1.14; y < 4.8; y += .57) box([.146, .23, .147], [0, y, .12], 0xa66651);
    cyl(.12, .22, [0, .985, .12], 0x4d685e, 1, [Math.PI / 2, 0, 0]);
  }
  for (const cabinet of o.cabinets ?? []) {
    setPose(cabinet.position, cabinet.yaw ?? 0);
    const fire = cabinet.kind === 'fire', c = fire ? 0x9c6652 : 0x79917f;
    box([.9, .12, .7], [0, .06, 0], 0x949f8c, 2); box([.78, 1.28, .5], [0, .76, 0], c);
    box([.7, 1.13, .045], [0, .75, .28], fire ? 0x92503e : 0x627b68, 1);
    box([.045, .21, .045], [.25, .79, .328], 0xc1c4a9, 1);
    for (const y of [.38, 1.09]) box([.085, .065, .06], [-.31, y, .303], 0x50655a, 1);
    sign([.62, .32, .035], [0, 1.13, .32], fire ? 1 : 3);
    for (let x = -.24; x < .29; x += .09) box([.035, .13, .027], [x, .37, .314], 0x354e45, 1);
    box([.89, .045, .62], [0, 1.435, 0], 0x657c69, 1);
    if (fire) { cyl(.1, .58, [.62, .41, 0], 0xa96449, 0); cyl(.023, .11, [.62, .76, 0], 0x546e62, 1); box([.16, .045, .06], [.62, .85, 0], 0x546e62, 1); }
  }
  for (const ring of o.rings ?? []) {
    setPose(ring.position, ring.yaw ?? 0);
    box([.12, 2.05, .12], [0, 1.025, 0], 0x718d83, 1); box([.3, .08, .3], [0, .04, 0], 0x899e8b, 1);
    const ringSource = new T.TorusGeometry(.33, .085, 10, 32), ringGeometry = ringSource.toNonIndexed(), colors = []; ringSource.dispose();
    const orange = new T.Color(0xc27b4f), white = new T.Color(0xd4d1ae), vertices = ringGeometry.attributes.position;
    // 白色反光带属于同一曲面, 避免在圆环上叠近平面导致走近闪烁.
    for (let i = 0; i < vertices.count; i++) { const a = Math.atan2(vertices.getY(i), vertices.getX(i)), c = Math.abs(Math.sin(a * 2)) < .39 ? white : orange; colors.push(c.r, c.g, c.b); }
    ringGeometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    pose.position.set(0, 1.27, .15); pose.rotation.set(0, 0, 0); pose.updateMatrix(); ringGeometry.applyMatrix4(pose.matrix).applyMatrix4(matrix); parts[0].push(ringGeometry);
    sign([.62, .28, .065], [0, 1.88, .04], 2);
    add(new T.TorusGeometry(.2, .025, 6, 24), 0x9b9372, 2, [0, .68, .17]);
  }
  for (const ladder of o.ladders ?? []) {
    setPose(ladder.position, ladder.yaw ?? 0);
    for (const x of [-.28, .28]) { cyl(.035, 3.7, [x, -.94, -.1], 0x7e9384, 1); cyl(.038, .66, [x, .69, .03], 0x849b8b, 1); }
    for (let y = -2.66; y <= .62; y += .3) cyl(.027, .56, [0, y, -.1], 0x8c9d87, 1, [0, 0, Math.PI / 2]);
    for (const y of [-1.7, .35]) for (const x of [-.28, .28]) box([.085, .07, .28], [x, y, .025], 0x647f70, 1);
  }
  // 远岸独立泊位与两部简化岸吊形成港区纵深, 无碰撞或新增绘制批次.
  if (o.backgroundDock) {
    const { position, width: w, depth: d } = o.backgroundDock; setPose(position);
    box([w, .9, d], [0, -.45, 0], 0x7f9187, 2);
    for (let x = -w / 2 + 2; x < w / 2; x += 6) for (const z of [-d / 2 + 1, d / 2 - 1]) box([.75, 4.5, .75], [x, -3.15, z], 0x5b7771, 2);
    function beam(a, b, radius) {
      const delta = new T.Vector3(...b).sub(new T.Vector3(...a)), g = new T.CylinderGeometry(radius, radius, delta.length(), 5);
      g.applyQuaternion(pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize())).translate(...new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray()); add(g, 0x617f82, 1);
    }
    for (const x of [-w * .23, w * .23]) {
      for (const sx of [-5.2, 5.2]) for (const z of [-3, 3]) { box([.55, 15, .55], [x + sx, 7.5, z], 0x9b956b, 1); beam([x + sx, 1, z], [x + sx * .3, 16, z], .14); }
      box([12, .65, 7], [x, 15.5, 0], 0x6f9091, 1); box([2.2, 2, 2.3], [x - 4, 16.6, 1], 0x90a89e);
      for (const sx of [-2.1, 2.1]) {
        box([.24, .25, 26], [x + sx, 19.1, 8], 0x65858b, 1); box([.23, .23, 26], [x + sx, 21, 8], 0x80978e, 1);
        for (let z = -5; z < 21; z += 3.25) beam([x + sx, 19.1, z], [x + sx, 21, z + 3.25], .075);
        beam([x + sx, 15.5, -3], [x + sx, 19.1, -4.5], .2);
      }
      box([4.7, .24, .6], [x, 18.7, 17], 0x9b956b, 1);
      for (const sx of [-1.8, 1.8]) cyl(.018, 9, [x + sx, 14.1, 17], 0x4b6767, 1);
      box([4.7, .23, 2.3], [x, 9.6, 17], 0x8d8b66, 1);
    }
  }
  const materials = [new T.MeshStandardMaterial({ vertexColors: true, roughness: .73, metalness: .22 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .54, metalness: .58 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .91 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .21, metalness: .42 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .45, emissive: 0xb9ba98, emissiveIntensity: .12 }), new T.MeshStandardMaterial({ map: labels, vertexColors: true, roughness: .8 })];
  parts.forEach((p, i) => { if (!p.length) return; const mesh = new T.Mesh(T.mergeGeometries(p), materials[i]); mesh.castShadow = i !== 4; mesh.receiveShadow = true; root.add(mesh); p.forEach(g => g.dispose()); });
  return { root, dispose() { labels.dispose(); } };
};
