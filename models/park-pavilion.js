// 四角攒尖木亭, 开放出入口, 带檐口与内置长凳; 顶面和底面均有实体几何.
FPS.models.parkPavilion = T => {
  const root = new T.Group(), parts = [[], [], []];
  function add(g, c) {
    const batch = [0xa7ac9e, 0x858f80].includes(c) ? 1 : [0x4e6058, 0x6e7869].includes(c) ? 2 : 0;
    if (g.index) { const flat = g.toNonIndexed(); g.dispose(); g = flat; }
    const p = g.attributes.position, n = g.attributes.normal, uv = [];
    g.computeBoundingBox(); const span = g.boundingBox.getSize(new T.Vector3());
    const axis = span.y > span.x && span.y > span.z ? 'y' : span.z > span.x ? 'z' : 'x';
    for (let i = 0; i < p.count; i++) {
      if (batch === 0) uv.push(axis === 'y' ? (Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) * 3 : axis === 'z' ? p.getX(i) * 3 : (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) * 3, p['get' + axis.toUpperCase()](i) * .3);
      else uv.push((Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) * (batch === 2 ? .7 : 1.5), (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) * (batch === 2 ? .7 : 1.5));
    }
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));

    const color = new T.Color(c), a = [];
    for (let i = 0; i < g.attributes.position.count; i++) a.push(color.r, color.g, color.b);
    g.setAttribute('color', new T.Float32BufferAttribute(a, 3)); parts[batch].push(g);
  }
  const box = (s, p, c, angle = 0) => add(new T.BoxGeometry(...s).rotateZ(angle).translate(...p), c);
  box([6.6, .12, 5.8], [0, .06, 0], 0xa7ac9e);
  for (const x of [-2.7, 2.7]) for (const z of [-2.3, 2.3]) {
    box([.48, .17, .48], [x, .205, z], 0x858f80); box([.23, 3.05, .23], [x, 1.645, z], 0x786448);
    box([.42, .31, .42], [x, 3.31, z], 0x786448);
    box([.9, .12, .15], [x - Math.sign(x) * .3, 2.79, z], 0x786448, -Math.sign(x) * .67);
  }
  for (const s of [-1, 1]) {
    box([6.1, .22, .2], [0, 3.17, s * 2.3], 0x66543d); box([.2, .22, 5.2], [s * 2.7, 3.17, 0], 0x66543d);
    for (let i = 0; i < 4; i++) box([.12, .08, 3.4], [s * 2.42 + (i - 1.5) * .145, .58, 0], 0x98805b);
    for (const z of [-1.25, 1.25]) box([.5, .42, .12], [s * 2.42, .33, z], 0x565e48);
  }
  const profile = [[0, 4.65], [.7, 3.61], [1, 3.48]], verts = [];
  for (let side = 0; side < 4; side++) for (let ring = 0; ring < 2; ring++) {
    const points = [];
    for (const [r, y] of [profile[ring], profile[ring + 1]]) for (const i of [side, (side + 1) % 4]) {
      const [sx, sz] = [[-1, -1], [1, -1], [1, 1], [-1, 1]][i]; points.push([sx * 3.55 * r, y, sz * 3.15 * r]);
    }
    for (const [a, b, c] of [[0, 1, 2], [1, 3, 2]]) {
      if (ring === 0 && a === 0) continue;
      verts.push(...points[a], ...points[b], ...points[c]);
      verts.push(
        ...points[c].map((v, i) => i === 1 ? v - .13 : v),
        ...points[b].map((v, i) => i === 1 ? v - .13 : v),
        ...points[a].map((v, i) => i === 1 ? v - .13 : v)
      );
    }
  }
  const roof = new T.BufferGeometry(); roof.setAttribute('position', new T.Float32BufferAttribute(verts, 3)); roof.computeVertexNormals(); add(roof, 0x4e6058);
  for (const s of [-1, 1]) {
    box([7.1, .14, .12], [0, 3.41, s * 3.15], 0x6e7869); box([.12, .14, 6.3], [s * 3.55, 3.41, 0], 0x6e7869);
  }
  // 檐下短椽复用盒体, 不用细密瓦片堆叠屋面.
  for (const side of [-1, 1]) for (let i = -5; i <= 5; i++) box([.08, .1, .65], [i * .5, 3.27, side * 2.8], 0x786448);
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
    const map = surfaceMap(i);
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .018, vertexColors: true, roughness: .9 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  }
  return { root };
};
