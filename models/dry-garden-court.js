// 枯山水的低瓦墙, 短竹垣和观景石铺地; 北墙留手水舍入口, 静态构件按材质合批.
FPS.models.dryGardenCourt = (T, o = {}) => {
  const root = new T.Group(), { width: w, depth: d, wallHeight: h, apronDepth: apron, gateway: [gateX, gateWidth] } = o;
  const half = w / 2 + .25, wallZ = d / 2 + o.wallOffset, parts = [[], [], [], []];
  let seed = 1209;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function add(g, hex, kind) {
    if (g.index) { const source = g; g = source.toNonIndexed(); source.dispose(); }
    const p = g.attributes.position, n = g.attributes.normal, c = new T.Color(hex), rgb = [], uv = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const age = kind === 0 ? .91 + .09 * Math.min(1, Math.max(0, (y - .2) / .75)) : .98 + .02 * Math.sin(x * 8 + z * 3);
      rgb.push(c.r * age, c.g * age, c.b * age);
      uv.push((Math.abs(n.getX(i)) > .6 ? z : x) * (kind === 3 ? 8 : 2), (Math.abs(n.getY(i)) > .6 ? z : y) * (kind === 3 ? .5 : 2));
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); parts[kind].push(g);
  }
  function box(size, position, hex, kind, tilt = 0) { add(new T.BoxGeometry(...size).rotateX(tilt).translate(...position), hex, kind); }
  // 石基与灰泥分层, 瓦帽为真实薄体; 不叠加墙面贴片.
  for (const [a, b] of [[-half, gateX - gateWidth / 2], [gateX + gateWidth / 2, half]]) {
    const length = b - a, center = (a + b) / 2;
    box([length, .225, .29], [center, .1125, wallZ], 0x65685e, 1);
    const count = Math.ceil(length / .76), step = length / count;
    for (let i = 0; i < count; i++) box([step - .012, .213, .34], [a + (i + .5) * step, .113, wallZ], [0x8b8b7e, 0x979486, 0x82867b][i % 3], 1);
    box([length, h - .235, .32], [center, (h + .235) / 2, wallZ], 0xd2c7ac, 0);
    const tiles = Math.ceil(length / .25), tile = length / tiles;
    for (let i = 0; i < tiles; i++) {
      const x = a + (i + .5) * tile;
      for (const side of [-1, 1]) box([tile - .006, .058, .34], [x, h + .034, wallZ + side * .151], [0x545a54, 0x60635a, 0x575d56][i % 3], 2, side * .18);
      box([tile - .006, .065, .105], [x, h + .109, wallZ], 0x676b60, 2);
    }
  }
  // 后角短袖垣围合石庭, 前方及东西观景通道保持开放.
  for (const side of [-1, 1]) {
    const x = side * half, z = d / 2 - 1.1, length = 2.4, count = Math.ceil(length / .056);
    for (let i = 0; i < count; i++) {
      const height = .99 + random() * .035, pz = z - length / 2 + (i + .5) * length / count;
      add(new T.CylinderGeometry(.017, .022, height, 6).translate(x, height / 2, pz), [0x9c9268, 0xada176, 0x8e8860][i % 3], 3);
      for (let j = 0; j < 3; j++) add(new T.CylinderGeometry(.024, .024, .021, 6).translate(x, .19 + j * .31 + (i % 4) * .012, pz), 0x827c51, 3);
    }
    for (const y of [.25, .81]) add(new T.CylinderGeometry(.028, .028, length, 8).rotateX(Math.PI / 2).translate(x - side * .039, y, z), 0x77714d, 3);
    for (const end of [-1, 1]) box([.09, 1.05, .09], [x, .525, z + end * (length / 2 - .045)], 0x5e5e42, 3);
    for (let i = 0; i < 5; i++) for (const y of [.25, .81]) add(new T.TorusGeometry(.035, .007, 4, 8).rotateY(Math.PI / 2).translate(x - side * .021, y, z - 1 + i * .5), 0x42483a, 3);
  }
  const floorZ = -d / 2 - .38 - apron / 2, floorW = w + .5;
  box([floorW, .066, apron], [0, .033, floorZ], 0x62685f, 1);
  const nx = Math.ceil(floorW / .86), nz = Math.ceil(apron / .6);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const sx = floorW / nx - .022, sz = apron / nz - .018, shape = new T.Shape();
    shape.moveTo(-sx / 2 + .007, -sz / 2 + .007); shape.lineTo(sx / 2 - .007, -sz / 2 + .007);
    shape.lineTo(sx / 2 - .007, sz / 2 - .007); shape.lineTo(-sx / 2 + .007, sz / 2 - .007); shape.closePath();
    const g = new T.ExtrudeGeometry(shape, { depth: .033, bevelEnabled: true, bevelSize: .007, bevelThickness: .007, bevelSegments: 1 });
    g.rotateX(-Math.PI / 2).translate(-floorW / 2 + (i + .5) * floorW / nx, .078, floorZ - apron / 2 + (j + .5) * apron / nz);
    add(g, [0x8c9085, 0x989a8e, 0x7c857c, 0xa2a296][(i * 7 + j * 3) % 4], 1);
  }
  // 砂庭与观景铺地间为低碎石沟, 只绘制露出的区域.
  box([w, .046, .3], [0, .023, -d / 2 - .19], 0x74776b, 1);
  for (const [kind, batch] of parts.entries()) if (batch.length) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const broad = Math.sin(x * Math.PI / 64) * Math.sin(y * Math.PI / 128);
      let v = 235 + (random() - .5) * (kind === 0 ? 11 : 30) + broad * (kind === 0 ? 4 : 9);
      if (kind === 3) v += 10 * Math.sin(x * Math.PI / 8 + .3 * Math.sin(y * Math.PI / 64));
      pixels.data.set([v, v, v, 255], (y * 256 + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: kind === 1 ? .006 : .002, vertexColors: true, roughness: .96 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  }
  return { root };
};
