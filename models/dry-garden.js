// 枯山水只生成砂面, 分块石沿和苔岛; 景石位置由场景共用, 砂纹烘焙到一张程序贴图.
FPS.models.dryGarden = (T, o = {}) => {
  const root = new T.Group(), w = o.width ?? 12, d = o.depth ?? 8, stones = o.stones ?? [], parts = [];
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 512); let seed = 918;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const px = (x / 511 - .5) * (w - .28), pz = (y / 511 - .5) * (d - .28);
    let near = 10, phase = pz + .08 * Math.sin(px * .75);
    for (const [sx, sz, sw, , sd] of stones) {
      const distance = Math.hypot((px - sx) / (sw * .65), (pz - sz) / (sd * .65));
      if (distance < near) { near = distance; if (distance < 1.65) phase = distance * Math.min(sw, sd) * .65; }
    }
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const groove = Math.pow(.5 + .5 * Math.cos(phase * Math.PI * 2 / .16), 5);
    const shade = 223 - groove * 25 + (seed / 4294967296 - .5) * 14, i = (y * 512 + x) * 4;
    pixels.data[i] = shade; pixels.data[i + 1] = shade - 3; pixels.data[i + 2] = shade - 12; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
  const sand = new T.Mesh(new T.PlaneGeometry(w - .28, d - .28).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .006, roughness: 1 }));
  sand.position.y = .073; sand.receiveShadow = true; root.add(sand);
  function add(g, color) {
    const c = new T.Color(color), colors = []; for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  add(new T.BoxGeometry(w, .055, d).translate(0, .0275, 0), 0x686f60);
  for (const [axis, length, cross] of [[0, w, d], [1, d - .32, w]]) for (const side of [-1, 1]) {
    const n = Math.ceil(length / .75);
    for (let i = 0; i < n; i++) {
      const along = -length / 2 + (i + .5) * length / n, across = side * (cross / 2 - .08);
      add(new T.BoxGeometry(axis ? .16 : length / n - .008, .1, axis ? length / n - .008 : .16).translate(axis ? across : along, .05, axis ? along : across), i % 3 ? 0x9ba392 : 0xabb09e);
    }
  }
  for (const [i, [x, z, sw, , sd]] of stones.entries()) {
    const g = new T.CylinderGeometry(1, 1, .016, 24).scale(sw * .67, 1, sd * .65), p = g.attributes.position;
    for (let j = 0; j < p.count; j++) { const a = Math.atan2(p.getZ(j), p.getX(j)), r = .96 + .035 * Math.sin(a * 5 + i); p.setX(j, p.getX(j) * r); p.setZ(j, p.getZ(j) * r); }
    g.computeVertexNormals(); add(g.translate(x, .082, z), i % 2 ? 0x697e49 : 0x7e8a50);
  }
  const edging = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  edging.receiveShadow = true; root.add(edging); parts.forEach(g => g.dispose()); return { root };
};
