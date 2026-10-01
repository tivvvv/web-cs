// 公园地面以世界纹理绘制草色, 树下裸土, 苔缝和曲线园路; 湖区留空, 石收边静态合批.
FPS.models.shrineParkGround = (T, o = {}) => {
  const root = new T.Group(), rects = o.surfaces, [x0, z0, x1, z1] = o.bounds, parts = [[], [], []], edges = [];
  const xs = [...new Set([x0, x1, ...rects.flatMap(r => [r[0], r[2]])])].sort((a, b) => a - b);
  const zs = [...new Set([z0, z1, ...rects.flatMap(r => [r[1], r[3]])])].sort((a, b) => a - b);
  const kind = (x, z) => { let k = 0; for (const r of rects) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) k = r[4]; return k; };
  const hardEdge = (x, z) => { const k = kind(x, z); return k >= 0 && k !== 2; };
  const inside = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
  let seed = 872;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  // 一张世界坐标纹理同时绘制铺地和曲线园路, 交叉处不叠加共面网格.
  const resolution = 2048, canvas = document.createElement('canvas'); canvas.width = canvas.height = resolution;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(resolution, resolution);
  const sx = resolution / (x1 - x0), sz = resolution / (z1 - z0);
  const palettes = [[163, 155, 132], [174, 179, 165], [99, 119, 74]];
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const wx = x0 + (x + .5) / sx, wz = z0 + (y + .5) / sz, k = Math.max(0, kind(wx, wz));
    const large = Math.sin(wx * .21 + Math.sin(wz * .16) * 1.5) * Math.cos(wz * .23 - wx * .08);
    let shade = (random() - .5) * (k === 0 ? 26 : 15) + large * (k === 2 ? 12 : 4);
    if (k === 1) {
      const row = Math.floor(wz / .8), u = ((wx + (row % 2) * .8) % 1.6 + 1.6) % 1.6, v = ((wz % .8) + .8) % .8;
      shade += Math.sin(Math.floor((wx + (row % 2) * .8) / 1.6) * 17 + row * 23) * 6;
      if (u < .025 || v < .025) shade -= 34;
      if ((u < .045 || v < .045) && large > .28) shade -= 12;
    }
    const i = (y * resolution + x) * 4;
    pixels.data[i] = palettes[k][0] + shade; pixels.data[i + 1] = palettes[k][1] + shade;
    pixels.data[i + 2] = palettes[k][2] + shade; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  ctx.setTransform(sx, 0, 0, sz, -x0 * sx, -z0 * sz);
  // 林下种植与蕨类共用范围, 烘焙软边苔色和腐叶土, 不增加悬浮土床.
  ctx.save(); ctx.beginPath();
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++)
    if (kind((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2) === 2) ctx.rect(xs[i], zs[j], xs[i + 1] - xs[i], zs[j + 1] - zs[j]);
  ctx.clip();
  for (const [x, z, w, d] of o.woodland ?? []) for (let i = 0; i < 60; i++) {
    const a = random() * Math.PI * 2, r = Math.sqrt(random()), px = x + Math.cos(a) * r * w / 2, pz = z + Math.sin(a) * r * d / 2, radius = .4 + random() * .7;
    if (kind(px, pz) !== 2) continue;
    const gradient = ctx.createRadialGradient(px, pz, 0, px, pz, radius);
    gradient.addColorStop(0, i % 4 ? '#53644080' : '#635d4480'); gradient.addColorStop(1, '#53644000');
    ctx.fillStyle = gradient; ctx.fillRect(px - radius, pz - radius, radius * 2, radius * 2);
  }
  ctx.restore();
  // 草色分区之外再补细草纹, 避免整园重复同一块小贴图.
  for (let i = 0; i < 28000; i++) {
    const x = x0 + random() * (x1 - x0), z = z0 + random() * (z1 - z0);
    if (kind(x, z) !== 2) continue;
    ctx.strokeStyle = i % 3 ? '#85945555' : '#485b3955'; ctx.lineWidth = .018;
    ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(x + (random() - .5) * .06, z + .08 + random() * .07); ctx.stroke();
  }
  for (const [x, z] of o.trees ?? []) {
    if (kind(x, z) !== 2) continue;
    const gradient = ctx.createRadialGradient(x, z, .1, x, z, 1.65);
    gradient.addColorStop(0, '#655943'); gradient.addColorStop(.45, '#6e694cd9'); gradient.addColorStop(1, '#6e694c00');
    ctx.fillStyle = gradient; ctx.beginPath();
    for (let i = 0; i < 20; i++) {
      const a = i * Math.PI / 10, r = 1.65 * (.86 + .1 * Math.sin(a * 5 + x));
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (i) ctx.lineTo(px, pz); else ctx.moveTo(px, pz);
    }
    ctx.closePath(); ctx.fill();
  }
  // 曲线路只绘制在草地和砂砾上, 接口处保留中央石参道与现有铺装.
  ctx.save(); ctx.beginPath();
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const k = kind((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2);
    if (k >= 0 && k !== 1) ctx.rect(xs[i], zs[j], xs[i + 1] - xs[i], zs[j + 1] - zs[j]);
  }
  ctx.clip();
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const { points, width } of o.trails ?? []) {
    ctx.beginPath(); points.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z));
    for (const [extra, color] of [[.45, '#7b80605c'], [.2, '#8c8b6e99'], [0, '#afa58a']]) {
      ctx.lineWidth = width + extra; ctx.strokeStyle = color; ctx.stroke();
    }
  }
  const onTrail = (x, z) => (o.trails ?? []).some(({ points, width }) => points.some(p => Math.hypot(x - p[0], z - p[1]) < width / 2));
  for (let i = 0; i < 17000; i++) {
    const x = x0 + random() * (x1 - x0), z = z0 + random() * (z1 - z0);
    if (!onTrail(x, z)) continue;
    ctx.fillStyle = i % 2 ? '#d1c8ad' : '#817c64'; ctx.fillRect(x, z, .035 + random() * .025, .025);
  }
  ctx.restore();
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  // 世界纹理负责大色块, 第二张小纹理补近景细粒, 避免走近后草地/砂路糊成平面.
  const grainCanvas = document.createElement('canvas'); grainCanvas.width = grainCanvas.height = 256;
  const grainCtx = grainCanvas.getContext('2d'), grainPixels = grainCtx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const v = 128 + (random() - .5) * 84 + 15 * Math.sin(x * .63 + y * .1) * Math.sin(y * .49);
    grainPixels.data.set([v, v, v, 255], (y * 256 + x) * 4);
  }
  grainCtx.putImageData(grainPixels, 0, 0); const grain = new T.CanvasTexture(grainCanvas);
  grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.anisotropy = 8;
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
    const uv = g.attributes.uv;
    for (let n = 0; n < p.count; n++) uv.setXY(n, (p.getX(n) - x0) / (x1 - x0), 1 - (p.getZ(n) - z0) / (z1 - z0));
    parts[k].push(g);
    if (k === 2) {
      if (hardEdge(a - .001, z) || a === x0) curb(a, c, a, d);
      if (hardEdge(b + .001, z) || b === x1) curb(b, c, b, d);
      if (hardEdge(x, c - .001) || c === z0) curb(a, c, b, c);
      if (hardEdge(x, d + .001) || d === z1) curb(a, d, b, d);
    }
  }
  for (let k = 0; k < 3; k++) if (parts[k].length) {
    const material = new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .012, roughness: 1 });
    material.customProgramCacheKey = () => 'park-ground-grain-v1';
    material.onBeforeCompile = shader => {
      shader.uniforms.parkGrain = { value: grain };
      shader.fragmentShader = 'uniform sampler2D parkGrain;\n' + shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>\n diffuseColor.rgb *= .88 + .24 * texture2D(parkGrain, vMapUv * vec2(${(x1 - x0) / 1.6}, ${(z1 - z0) / 1.6})).r;`);
    };
    const mesh = new T.Mesh(T.mergeGeometries(parts[k]), material);
    mesh.receiveShadow = true; root.add(mesh); parts[k].forEach(g => g.dispose());
  }
  if (edges.length) { const mesh = new T.Mesh(T.mergeGeometries(edges), new T.MeshStandardMaterial({ color: 0xa7ada0, roughness: .94 })); mesh.receiveShadow = true; root.add(mesh); edges.forEach(g => g.dispose()); }
  return { root };
};
