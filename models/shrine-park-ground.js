// 公园铺地按矩形分区切成不重叠的平面, 三种程序纹理与石收边静态合批.
FPS.models.shrineParkGround = (T, o = {}) => {
  const root = new T.Group(), rects = o.surfaces, [x0, z0, x1, z1] = o.bounds, parts = [[], [], []], edges = [];
  const xs = [...new Set([x0, x1, ...rects.flatMap(r => [r[0], r[2]])])].sort((a, b) => a - b);
  const zs = [...new Set([z0, z1, ...rects.flatMap(r => [r[1], r[3]])])].sort((a, b) => a - b);
  const kind = (x, z) => { let k = 0; for (const r of rects) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) k = r[4]; return k; };
  const hardEdge = (x, z) => { const k = kind(x, z); return k >= 0 && k !== 2; };
  const inside = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
  let seed = 872;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function texture(k) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const n = (random() - .5) * (k === 0 ? 45 : 23), v = 180 + n + 7 * Math.sin(x * Math.PI / 32) * Math.sin(y * Math.PI / 64), i = (y * 256 + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v; pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    if (k === 1) {
      ctx.fillStyle = '#686c65'; ctx.fillRect(0, 0, 256, 2); ctx.fillRect(0, 128, 256, 2); ctx.fillRect(0, 0, 2, 128); ctx.fillRect(128, 128, 2, 128);
      ctx.fillStyle = '#c9cbc2'; ctx.fillRect(2, 3, 254, 1); ctx.fillRect(130, 131, 126, 1);
    } else for (let i = 0; i < 2300; i++) {
      const x = random() * 256, y = random() * 256, shade = 105 + random() * 110;
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`; ctx.lineWidth = k === 2 ? .65 : 1.3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - .5) * 3, y + (k === 2 ? 4 : 1)); ctx.stroke();
    }
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4; return map;
  }
  function curb(ax, az, bx, bz) {
    const length = Math.hypot(bx - ax, bz - az), count = Math.ceil(length / .8);
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, g = new T.BoxGeometry(ax === bx ? .12 : length / count - .008, .04, az === bz ? .12 : length / count - .008);
      g.translate(ax + (bx - ax) * t, .019, az + (bz - az) * t); edges.push(g);
    }
  }
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const a = xs[i], b = xs[i + 1], c = zs[j], d = zs[j + 1], x = (a + b) / 2, z = (c + d) / 2;
    if (!inside(x, z)) continue;
    const k = kind(x, z); if (k < 0) continue; // 负值分区留给下凹池塘, 不再覆盖地面.
    const g = new T.PlaneGeometry(b - a, d - c).rotateX(-Math.PI / 2).translate(x, .024, z), p = g.attributes.position;
    const uv = g.attributes.uv, repeat = k === 1 ? 1 / 1.6 : k === 2 ? 1 / 2 : 2;
    for (let n = 0; n < p.count; n++) uv.setXY(n, p.getX(n) * repeat, p.getZ(n) * repeat);
    parts[k].push(g);
    if (k === 2) {
      if (hardEdge(a - .001, z) || a === x0) curb(a, c, a, d);
      if (hardEdge(b + .001, z) || b === x1) curb(b, c, b, d);
      if (hardEdge(x, c - .001) || c === z0) curb(a, c, b, c);
      if (hardEdge(x, d + .001) || d === z1) curb(a, d, b, d);
    }
  }
  for (let k = 0; k < 3; k++) if (parts[k].length) {
    const mesh = new T.Mesh(T.mergeGeometries(parts[k]), new T.MeshStandardMaterial({ map: texture(k), color: [0xc2b69c, 0xbac0b7, 0x71884b][k], roughness: 1 }));
    mesh.receiveShadow = true; root.add(mesh); parts[k].forEach(g => g.dispose());
  }
  if (edges.length) { const mesh = new T.Mesh(T.mergeGeometries(edges), new T.MeshStandardMaterial({ color: 0xa7ada0, roughness: .94 })); mesh.receiveShadow = true; root.add(mesh); edges.forEach(g => g.dispose()); }
  return { root };
};
