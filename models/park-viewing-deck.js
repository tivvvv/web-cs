// 湖东木观景台, 西侧景观栏与短侧栏, 东侧和园路方向保持开放; 尺寸共用场景参数.
FPS.models.parkViewingDeck = (T, o = {}) => {
  const root = new T.Group(), parts = [], { width: w, depth: d, height: h, railHeight: rail } = o;
  function box(size, p, hex) {
    const source = new T.BoxGeometry(...size), g = source.toNonIndexed(); source.dispose(); g.translate(...p);
    const c = new T.Color(hex), colors = [], uv = [], vertices = g.attributes.position, axis = size[1] > size[0] && size[1] > size[2] ? 1 : size[2] > size[0] ? 2 : 0;
    for (let i = 0; i < vertices.count; i++) {
      colors.push(c.r, c.g, c.b);
      const p = [vertices.getX(i), vertices.getY(i), vertices.getZ(i)];
      uv.push((axis === 0 ? p[2] : p[0]) * 5, p[axis] * .25);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); parts.push(g);
  }
  box([w, h - .035, d], [0, (h - .035) / 2, 0], 0x655742);
  const count = Math.ceil(d / .19);
  for (let i = 0; i < count; i++) box([w, .035, d / count - .006], [0, h - .0175, -d / 2 + (i + .5) * d / count], [0x9c8764, 0x927d5d, 0xa18d6a][i % 3]);
  const x = -w / 2 + .07;
  for (const z of [-d / 2 + .08, 0, d / 2 - .08]) box([.12, rail, .12], [x, h + rail / 2, z], 0x68583e);
  for (const y of [.4, rail - .06]) {
    box([.08, .09, d], [x, h + y, 0], 0x847353);
    for (const side of [-1, 1]) box([1.6, .09, .08], [x + .8, h + y, side * (d / 2 - .08)], 0x847353);
  }
  for (const side of [-1, 1]) box([.12, rail, .12], [x + 1.6, h + rail / 2, side * (d / 2 - .08)], 0x68583e);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 883;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = Math.sin(x * .31 + Math.sin(y * .037) * 1.6) * Math.sin(x * .083 + Math.sin(y * .024));
    const v = 236 + grain * 15 + (seed / 4294967296 - .5) * 9;
    pixels.data.set([v, v, v - 5, 255], (y * 256 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, map, bumpMap: map, bumpScale: .008, roughness: .92 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
