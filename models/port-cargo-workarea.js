// 仓库货架与托盘货物. 木纤维, 包装接缝和标识自包含, 四材质静态合批.
FPS.models.portCargoWorkarea = (T, o = {}) => {
  const root = new T.Group(), parts = [[], [], [], []], pose = new T.Object3D(); let matrix = new T.Matrix4();
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), data = ctx.createImageData(256, 256); let seed = 935;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const v = 211 + Math.sin(x * .7 + Math.sin(y * .037) * 2) * 12 + (random() - .5) * 25; data.data.set([v, v - 14, v - 30, 255], (y * 256 + x) * 4);
  }
  ctx.putImageData(data, 0, 0); const wood = new T.CanvasTexture(canvas); wood.colorSpace = T.SRGBColorSpace; wood.wrapS = wood.wrapT = T.RepeatWrapping; wood.anisotropy = 8;
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = labelCanvas.height = 512; const lc = labelCanvas.getContext('2d');
  lc.fillStyle = '#c4b38b'; lc.fillRect(0, 0, 512, 512); lc.fillStyle = '#3a514c'; lc.font = '800 58px monospace'; lc.textAlign = 'center'; lc.fillText('SHONAN', 256, 123);
  lc.font = '33px monospace'; lc.fillText('EXPORT / 024', 256, 184); lc.fillText('KEEP DRY', 256, 329);
  lc.lineWidth = 9; lc.strokeStyle = '#3a514c'; lc.strokeRect(34, 37, 444, 416);
  for (const x of [173, 337]) { lc.beginPath(); lc.moveTo(x, 281); lc.lineTo(x, 222); lc.lineTo(x - 19, 242); lc.moveTo(x, 222); lc.lineTo(x + 19, 242); lc.stroke(); }
  for (let x = 96; x < 414; x += 9) lc.fillRect(x, 376, 3 + x % 5, 31);
  const label = new T.CanvasTexture(labelCanvas); label.colorSpace = T.SRGBColorSpace; label.anisotropy = 8;
  function add(source, color, batch = 0, p = [0, 0, 0], r = [0, 0, 0]) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    if (batch === 0) { const uv = g.attributes.uv, n = g.attributes.normal, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > .5 ? p.getZ(i) * 1.6 : p.getX(i) * 1.6, p.getY(i) * .4 + p.getZ(i) * .3); }
    g.applyMatrix4(matrix); const c = new T.Color(color), rgb = [];
    for (let i = 0; i < g.attributes.position.count; i++) rgb.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (s, p, c = 0xb2a27e, batch = 0, r) => add(new T.BoxGeometry(...s), c, batch, p, r);
  const cyl = (radius, length, p, c, batch = 1, r = [0, 0, 0], n = 16) => add(new T.CylinderGeometry(radius, radius, length, n), c, batch, p, r);
  function setPose(p, yaw = 0) { pose.position.set(...p); pose.rotation.set(0, yaw, 0); pose.updateMatrix(); matrix = pose.matrix.clone(); }
  function pallet(w, d) {
    for (const x of [-w * .36, 0, w * .36]) for (const z of [-d * .35, 0, d * .35]) box([w * .15, .105, d * .16], [x, .0875, z], 0x97805a);
    for (let i = 0; i < 5; i++) box([w / 5 - .023, .045, d], [-w / 2 + (i + .5) * w / 5, .1625, 0]);
    for (const x of [-w * .36, 0, w * .36]) box([w * .15, .035, d], [x, .0175, 0], 0x8e7e60);
  }
  function load(item) {
    const [w, h, d] = item.size ?? [1.2, 1.25, 1], base = .185, c = item.color ?? 0xbfc1a5;
    setPose(item.position ?? [0, 0, 0], item.yaw ?? 0); pallet(w, d);
    if (item.kind === 'reel') {
      const radius = Math.min(w / 2, (h - base) / 2), center = [0, base + radius, 0];
      cyl(radius * .57, d * .8, center, 0x3b4e48, 2, [Math.PI / 2, 0, 0], 24);
      for (const z of [-d * .43, d * .43]) {
        cyl(radius, d * .08, [0, center[1], z], 0x9e885c, 0, [Math.PI / 2, 0, 0], 24);
        cyl(radius * .2, d * .09, [0, center[1], z], 0x6d735a, 1, [Math.PI / 2, 0, 0]);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cyl(.032, .028, [radius * .67 * Math.cos(a), center[1] + radius * .67 * Math.sin(a), z + Math.sign(z) * d * .052], 0x586c5c, 1, [Math.PI / 2, 0, 0], 6); }
      }
      for (let z = -d * .35; z < d * .35; z += .09) add(new T.TorusGeometry(radius * .58, .028, 5, 24), 0x5d6655, 2, [0, center[1], z]);
    } else if (item.kind === 'drums') {
      for (const x of [-w * .24, w * .24]) for (const z of [-d * .24, d * .24]) {
        const r = Math.min(w, d) * .215, dh = h - base;
        cyl(r, dh, [x, base + dh / 2, z], c, 1, [0, 0, 0], 20);
        for (const y of [base + .09, base + dh * .33, base + dh * .68, h - .06]) cyl(r + .012, .035, [x, y, z], 0x788779, 1);
        cyl(.035, .024, [x + r * .5, h + .008, z], 0x374c44, 1);
      }
    } else if (item.kind === 'crate') {
      box([w - .03, h - base, d - .03], [0, (h + base) / 2, 0], 0xc1b28a);
      for (const side of [-1, 1]) {
        for (const x of [-w * .36, w * .36]) box([.09, h - base, .055], [x, (h + base) / 2, side * (d / 2 + .012)], 0x8c7b5b);
        for (const y of [base + .05, h - .05]) box([w, .09, .055], [0, y, side * (d / 2 + .012)], 0x8c7b5b);
        // 包装印字直接位于实体薄板上, 四面仍有木纹/加强条.
        box([Math.min(.52, w * .43), Math.min(.45, (h - base) * .48), .035], [0, (h + base) / 2, side * (d / 2 + .043)], 0xffffff, 3);
        for (const z of [-d * .36, d * .36]) box([.055, h - base, .09], [side * (w / 2 + .012), (h + base) / 2, z], 0x8c7b5b);
      }
    } else {
      box([w - .04, h - base, d - .04], [0, (h + base) / 2, 0], c, 2);
      // 缠膜横向接缝与两道捆扎带, 用克制的色差表现薄膜, 无透明排序.
      for (let y = base + .15; y < h - .07; y += .14) {
        for (const side of [-1, 1]) { box([w - .035, .014, .009], [0, y, side * (d / 2 - .011)], 0xaab7a5, 2); box([.009, .014, d - .035], [side * (w / 2 - .011), y, 0], 0xaab7a5, 2); }
      }
      for (const x of [-w * .28, w * .28]) {
        box([.045, .018, d], [x, h + .006, 0], 0x536b62, 1);
        for (const side of [-1, 1]) box([.045, h - base, .018], [x, (h + base) / 2, side * d / 2], 0x536b62, 1);
      }
      box([Math.min(.48, w * .5), .32, .035], [0, base + .38, d / 2 + .019], 0xffffff, 3);
    }
  }
  for (const rack of o.racks ?? [{ position: [0, 0, 0], width: 3, depth: 1.2, height: 3.8, levels: [.24, 1.7, 3.1] }]) {
    const { position, width: w, depth: d, height: h, levels } = rack; setPose(position, rack.yaw ?? 0);
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) {
      box([.09, h, .09], [x, h / 2, z], 0x537982, 1); box([.21, .045, .2], [x, .0225, z], 0x6a7d75, 1);
      for (let y = .3; y < h; y += .22) box([.031, .034, .008], [x, y, z + Math.sign(z) * .048], 0x273e42, 1);
    }
    for (const y of levels) {
      box([w, .07, d], [0, y - .035, 0], 0x8e9783, 1);
      for (const z of [-d / 2, d / 2]) box([w + .06, .16, .065], [0, y - .08, z], 0xba8d4d, 1);
    }
    for (const x of [-w / 2, w / 2]) for (const y of levels.slice(0, -1)) {
      const a = new T.Vector3(x, y, -d / 2), b = new T.Vector3(x, Math.min(h, y + 1.3), d / 2), delta = b.clone().sub(a);
      add(new T.BoxGeometry(.035, delta.length(), .035).applyQuaternion(pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize())).translate(...a.add(b).multiplyScalar(.5).toArray()), 0x637e7c, 1);
    }
    // 两个货位共用场景规格, 每层高度下留可见间隙.
    for (const [i, y] of levels.entries()) for (const side of [-1, 1]) {
      const gap = (levels[i + 1] ?? h) - y, local = [side * w * .24, y, 0], yaw = rack.yaw ?? 0;
      load({ position: [position[0] + local[0] * Math.cos(yaw), position[1] + y, position[2] - local[0] * Math.sin(yaw)], yaw, size: [w * .43, Math.min(.99, gap - .15), d * .87], kind: i % 2 ? 'crate' : 'wrapped', color: i % 2 ? 0xb9b394 : 0xaebcac });
    }
  }
  for (const item of o.loads ?? []) load(item);
  for (const bench of o.benches ?? []) {
    setPose(bench.position, bench.yaw ?? 0);
    box([2.1, .12, .8], [0, .93, 0], 0xa48d64);
    for (const x of [-.85, .85]) for (const z of [-.28, .28]) box([.065, .87, .065], [x, .435, z], 0x516c65, 1);
    box([1.8, .06, .65], [0, .2, 0], 0x687a6c, 1);
    box([.67, .37, .31], [-.51, 1.175, 0], 0x9d6450, 1); box([.56, .035, .28], [-.51, 1.3775, 0], 0x765346, 1);
    box([.29, .13, .22], [.68, 1.055, .1], 0x576d64, 1); cyl(.045, .32, [.75, 1.12, .1], 0xa7b29b, 1, [0, 0, Math.PI / 2]);
    for (const x of [-.72, -.3]) box([.055, .065, .045], [x, 1.17, .18], 0xa8b29b, 1);
    box([.5, .025, .35], [.14, 1.003, -.13], 0xd4d1b3, 2);
  }
  const materials = [new T.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: .002, vertexColors: true, roughness: .88 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .66, metalness: .42 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .54, metalness: .05 }), new T.MeshStandardMaterial({ map: label, vertexColors: true, roughness: .86 })];
  parts.forEach((p, i) => { if (!p.length) return; const mesh = new T.Mesh(T.mergeGeometries(p), materials[i]); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); p.forEach(g => g.dispose()); });
  return { root, dispose() { wood.dispose(); label.dispose(); } };
};
