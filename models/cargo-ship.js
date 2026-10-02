// 靠泊货轮, 原点为水线中心, 船艏朝 +X; 船壳/甲板/货柜/驾驶楼自包含并静态合批.
FPS.models.cargoShip = (T, o = {}) => {
  const root = new T.Group(), parts = [[], [], []], l = o.length ?? 78, w = o.width ?? 16;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 512); let seed = 374;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 234 + (seed / 4294967296 - .5) * 17 + Math.sin(x * .026) * Math.sin(y * .041) * 8;
    pixels.data.set([v, v, v - 3, 255], (y * 512 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
  function add(source, color, batch = 0) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    const c = new T.Color(color), rgb = [], p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const shade = .86 + .14 * Math.min(1, Math.max(0, p.getY(i) / 4)); rgb.push(c.r * shade, c.g * shade, c.b * shade);
      uv.setXY(i, (Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) / 3, (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) / 3);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (s, p, c, batch = 0) => add(new T.BoxGeometry(...s).translate(...p), c, batch);
  function hull(height, y, color, scale = 1) {
    const shape = new T.Shape(); shape.moveTo(l / 2, 0); shape.quadraticCurveTo(l / 2 - 3, w * .35, l / 2 - 10, w / 2);
    shape.lineTo(-l / 2 + 4, w / 2); shape.quadraticCurveTo(-l / 2, w / 2, -l / 2, w * .3);
    shape.lineTo(-l / 2, -w * .3); shape.quadraticCurveTo(-l / 2, -w / 2, -l / 2 + 4, -w / 2);
    shape.lineTo(l / 2 - 10, -w / 2); shape.quadraticCurveTo(l / 2 - 3, -w * .35, l / 2, 0); shape.closePath();
    add(new T.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2).scale(scale, 1, scale).translate(0, y, 0), color);
  }
  hull(3.25, -1.8, 0x80584c, .96); hull(3.45, 1.45, 0x31585f); hull(.15, 4.9, 0x929a83, .97);
  for (const side of [-1, 1]) {
    box([l - 15, .23, .2], [-2, 4.98, side * (w / 2 - .18)], 0xe0dfc5, 1);
    box([l - 16, .08, .08], [-2, 6.08, side * (w / 2 - .25)], 0xd3d6c2, 1);
    for (let x = -l / 2 + 5; x < l / 2 - 11; x += 2.2) box([.045, 1.12, .045], [x, 5.56, side * (w / 2 - .25)], 0xbfcabe, 1);
  }
  const colors = [0x3e7a80, 0xa95e4b, 0x859a78, 0xbbab68, 0x49626e];
  for (let bay = 0; bay < 4; bay++) for (let row = 0; row < 4; row++) for (let layer = 0; layer < (bay === 3 ? 1 : 2); layer++) {
    const x = -12 + bay * 12.3, z = (row - 1.5) * 2.65, y = 5.08 + layer * 2.85;
    box([11.9, 2.8, 2.55], [x, y + 1.4, z], colors[(bay + row * 2 + layer) % colors.length]);
    for (const side of [-1, 1]) {
      for (const lift of [.06, 2.74]) box([11.92, .09, .09], [x, y + lift, z + side * 1.24], 0x8c9c8e, 1);
      for (let u = -5.6; u < 5.8; u += .42) box([.04, 2.6, .03], [x + u, y + 1.4, z + side * 1.285], colors[(bay + row * 2 + layer) % colors.length]);
    }
  }
  const stern = -l / 2 + 10;
  box([12, 3.8, 11.8], [stern, 6.95, 0], 0xcbd2be); box([10.8, 3.2, 10.8], [stern - .4, 10.45, 0], 0xdadac5);
  box([13, 2.15, 12.5], [stern + .4, 13.08, 0], 0xe0dfc8); box([13.8, .24, 13.2], [stern + .4, 14.28, 0], 0x657f7d, 1);
  for (const side of [-1, 1]) {
    box([12.1, 1.02, .035], [stern + .4, 13.2, side * 6.27], 0x345d6b, 2);
    box([.035, 1.02, 11.8], [stern + .4 + side * 6.52, 13.2, 0], 0x345d6b, 2);
    for (let x = -5.4; x < 6; x += 1.35) box([.065, 1.12, .07], [stern + .4 + x, 13.2, side * 6.3], 0xadbeb3, 1);
    for (let x = -3; x < 4; x += 2) box([.85, .85, .06], [stern + x, 9.7, side * 5.42], 0x3c626c, 2);
    add(new T.SphereGeometry(1, 12, 6).scale(2.5, .6, .65).translate(stern + 1, 9.04, side * 6.3), 0xc97742, 1);
  }
  box([2.4, 4.3, 2.1], [stern - 3.1, 15.15, 0], 0x6d7c74); box([2.6, .5, 2.3], [stern - 3.1, 17.55, 0], 0x304b4d, 1);
  add(new T.CylinderGeometry(.08, .11, 5, 8).translate(stern + 3.6, 16.1, 0), 0xacbcb1, 1);
  box([5, .06, .06], [stern + 3.6, 17.85, 0], 0xd4d7c4, 1);
  for (const z of [-3.8, 3.8]) box([1.8, .65, 1.1], [l / 2 - 8.8, 5.32, z], 0x5f7774, 1);
  const mats = [new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .002, vertexColors: true, roughness: .76, metalness: .15 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .63, metalness: .35 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .17, metalness: .48 })];
  parts.forEach((batch, i) => { const mesh = new T.Mesh(T.mergeGeometries(batch), mats[i]); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose()); });
  return { root, dispose() { map.dispose(); } };
};
