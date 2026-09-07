// 三种铺地共用低分辨率程序纹理, 按材质静态合批; 不增加动画或细分网格.
(() => {
const materials = new Map();
function material(T, kind) {
  if (materials.has(kind)) return materials.get(kind);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(128, 128);
  let seed = { concrete: 71, stone: 193, gravel: 509 }[kind];
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const wave = Math.sin(x * Math.PI / 32) * Math.cos(y * Math.PI / 64);
    const value = (kind === 'gravel' ? 152 : 230) + (random() - .5) * 24 + wave * (kind === 'stone' ? 16 : 5), i = (y * 128 + x) * 4;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  // 越界的石粒在另一侧重复绘制, 保持循环贴图无硬接缝.
  if (kind === 'gravel') for (let i = 0; i < 420; i++) {
    const x = random() * 128, y = random() * 128, r = 1.4 + random() * 2.6, ry = r * (.55 + random() * .35), a = random() * Math.PI, shade = 185 + random() * 60;
    for (const dx of [-128, 0, 128]) for (const dy of [-128, 0, 128]) for (const edge of [true, false]) {
      ctx.fillStyle = `rgb(${edge ? shade - 50 : shade},${edge ? shade - 50 : shade},${edge ? shade - 50 : shade})`;
      ctx.beginPath(); ctx.ellipse(x + dx + (edge ? .7 : 0), y + dy + (edge ? .7 : 0), r, ry, a, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (kind === 'stone') for (let i = 0; i < 16; i++) {
    const x = random() * 128, y = random() * 128, length = 9 + random() * 25;
    ctx.strokeStyle = 'rgba(85,95,100,.14)'; ctx.lineWidth = .6;
    for (const dx of [-128, 0, 128]) for (const dy of [-128, 0, 128]) {
      ctx.beginPath(); ctx.moveTo(x + dx, y + dy); ctx.lineTo(x + dx + length * .5, y + dy + 2); ctx.lineTo(x + dx + length, y + dy - 1); ctx.stroke();
    }
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
  const mat = new T.MeshStandardMaterial({ map, vertexColors: true, roughness: kind === 'stone' ? .83 : .97,
    ...(kind === 'concrete' ? {} : { bumpMap: map, bumpScale: kind === 'gravel' ? .018 : .004 }) });
  materials.set(kind, mat); return mat;
}
FPS.models.pocketPaving = (T, o = {}) => {
  const w = o.width ?? 15, d = o.depth ?? 8, root = new T.Group(), groups = new Map();
  const surface = o.garden ? 'gravel' : o.stone ? 'stone' : 'concrete';
  function box(s, p, color, kind = surface) {
    const source = new T.BoxGeometry(...s), g = source.toNonIndexed(); source.dispose(); g.translate(...p);
    const positions = g.attributes.position, normals = g.attributes.normal, uv = g.attributes.uv, repeat = kind === 'gravel' ? 1.25 : kind === 'concrete' ? 4 : 1;
    for (let i = 0; i < positions.count; i++) {
      const up = Math.abs(normals.getY(i)) > .5, side = Math.abs(normals.getX(i)) > .5;
      uv.setXY(i, (side ? positions.getZ(i) : positions.getX(i)) * repeat, (up ? positions.getZ(i) : positions.getY(i)) * repeat);
    }
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    if (!groups.has(kind)) groups.set(kind, []); groups.get(kind).push(g);
  }
  // 底座和铺砖止于两侧收边内缘, 避免外侧共面闪烁及铺砖穿过收边.
  const innerDepth = d - .22;
  box([w, .06, innerDepth], [0, .03, 0], o.garden ? 0xc5b593 : 0x727b79);
  if (!o.garden) {
    const nx = Math.ceil(w / (o.stone ? .9 : 1.5)), nz = Math.ceil(innerDepth / (o.stone ? .6 : 1.5));
    const palette = o.stone ? [0xa9b3b0, 0x959f9e, 0xb8bdb4, 0x9ba8a6] : [0xb8bdb9, 0xb3b9b5, 0xbcc0ba];
    for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
      box([w / nx - .015, .018, innerDepth / nz - .015], [(x + .5) * w / nx - w / 2, .069, (z + .5) * innerDepth / nz - innerDepth / 2], palette[(x * 7 + z * 5) % palette.length]);
    }
    if (o.parking) for (const x of o.parkingRows ?? [-3.3]) {
      for (let i = 0; i < 4; i++) box([2.7, .008, .045], [x, .084, -2.25 + i * 1.5], 0xe4dec4);
      box([.045, .008, 4.5], [x - 1.35, .084, 0], 0xe4dec4);
    }
  } else {
    for (let i = 0; i < 8; i++) box([1.18, .018, 1.75], [-w / 2 + .65 + i * 1.22, .069, -.5 + Math.sin(i * .65) * .65], i % 2 ? 0xa9b3b0 : 0xb8bdb4, 'stone');
    for (let i = 0; i < 4; i++) box([1.15, .018, 1.75], [4.2 + i * 1.22, .069, -2.25], 0xa9b3b0, 'stone');
  }
  for (const side of [-1, 1]) box([w, .075, .11], [0, .0375, side * (d / 2 - .055)], 0x9ba39c, o.garden ? 'stone' : surface);
  for (const [kind, parts] of groups) {
    const mesh = new T.Mesh(T.mergeGeometries(parts), material(T, kind));
    mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  }
  return { root };
};
})();
