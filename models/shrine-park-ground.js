// 公园地面纹理在启动时可并行烘焙, 网格/材质留在主线程; 无预生成数据时仍可独立装配.
FPS.models.shrineParkGround = (() => {
  function buildTextures(o) {
    function makeCanvas(size) {
      // 仅有构造器不代表支持离屏 2D, 主线程还可以回退普通画布.
      if (typeof OffscreenCanvas === 'function') {
        try { const c = new OffscreenCanvas(size, size); if (c.getContext('2d')) return c; }
        catch { /* 构造器或 2D 能力受限时继续检测普通画布. */ }
      }
      if (typeof document === 'undefined') throw Error('生成线程不支持离屏画布');
      const c = document.createElement('canvas'); c.width = c.height = size; return c;
    }
    const rects = o.surfaces, [x0, z0, x1, z1] = o.bounds;
    const xs = [...new Set([x0, x1, ...rects.flatMap(r => [r[0], r[2]])])].sort((a, b) => a - b);
    const zs = [...new Set([z0, z1, ...rects.flatMap(r => [r[1], r[3]])])].sort((a, b) => a - b);
    const kind = (x, z) => { let k = 0; for (const r of rects) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) k = r[4]; return k; };
    let seed = 872;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const resolution = 2048, canvas = makeCanvas(resolution);
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
    // 世界纹理负责大色块, 第二张小纹理补近景细粒, 避免走近后草地/砂路糊成平面.
    const grainPixels = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const v = 128 + (random() - .5) * 84 + 15 * Math.sin(x * .63 + y * .1) * Math.sin(y * .49);
      const i = (y * 256 + x) * 4;
      grainPixels.data[i] = grainPixels.data[i + 1] = grainPixels.data[i + 2] = v; grainPixels.data[i + 3] = 255;
    }
    // 参道独立使用米制石板纹理, 接缝/磨边写入高度图; 世界底图继续负责草地与曲线园路.
    const stonePixels = ctx.createImageData(1024, 1024), heightPixels = ctx.createImageData(1024, 1024);
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
      const wx = x / 1024 * 3, wz = y / 1024 * 3.2, row = Math.floor(wz / .8), col = Math.floor(wx + (row % 2) * .5);
      const u = (wx + (row % 2) * .5) % 1, v = wz % .8, edge = Math.min(u, 1 - u, v, .8 - v);
      const piece = Math.sin(col * 13.1 + row * 47.7), grain = (random() - .5) * 21;
      const patch = Math.sin(wx * 6 + Math.sin(wz * 9)) * Math.sin(wz * 5 - wx * 3) * 6;
      const joint = edge < .012, worn = Math.max(0, 1 - edge / .035);
      const value = (joint ? 93 : 168 + piece * 9 + patch - worn * 7) + grain;
      const i = (y * 1024 + x) * 4;
      stonePixels.data[i] = value - 3; stonePixels.data[i + 1] = value + 1; stonePixels.data[i + 2] = value - 8; stonePixels.data[i + 3] = 255;
      const h = joint ? 25 : 188 - worn * 60 + grain * .5;
      heightPixels.data[i] = heightPixels.data[i + 1] = heightPixels.data[i + 2] = h; heightPixels.data[i + 3] = 255;
    }
    return { world: ctx.getImageData(0, 0, resolution, resolution).data, grain: grainPixels.data, stone: stonePixels.data, height: heightPixels.data };
  }
  const factory = (T, o = {}, assets) => {
    const root = new T.Group(), rects = o.surfaces, [x0, z0, x1, z1] = o.bounds, parts = [[], [], []], edges = [];
    const xs = [...new Set([x0, x1, ...rects.flatMap(r => [r[0], r[2]])])].sort((a, b) => a - b);
    const zs = [...new Set([z0, z1, ...rects.flatMap(r => [r[1], r[3]])])].sort((a, b) => a - b);
    const kind = (x, z) => { let k = 0; for (const r of rects) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) k = r[4]; return k; };
    const hardEdge = (x, z) => { const k = kind(x, z); return k >= 0 && k !== 2; };
    const inside = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
    const data = assets ?? buildTextures(o);
    function texture(pixels, size, color = false, repeat = false) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d'), image = ctx.createImageData(size, size); image.data.set(pixels); ctx.putImageData(image, 0, 0);
      const map = new T.CanvasTexture(canvas); if (color) map.colorSpace = T.SRGBColorSpace;
      if (repeat) map.wrapS = map.wrapT = T.RepeatWrapping;
      map.anisotropy = 8; return map;
    }
    const map = texture(data.world, 2048, true), grain = texture(data.grain, 256, false, true);
    const stoneMap = texture(data.stone, 1024, true, true), stoneHeight = texture(data.height, 1024, false, true);
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
      for (let n = 0; n < p.count; n++) uv.setXY(n, k === 1 ? p.getX(n) / 3 : (p.getX(n) - x0) / (x1 - x0), k === 1 ? -p.getZ(n) / 3.2 : 1 - (p.getZ(n) - z0) / (z1 - z0));
      parts[k].push(g);
      if (k === 2) {
        if (hardEdge(a - .001, z) || a === x0) curb(a, c, a, d);
        if (hardEdge(b + .001, z) || b === x1) curb(b, c, b, d);
        if (hardEdge(x, c - .001) || c === z0) curb(a, c, b, c);
        if (hardEdge(x, d + .001) || d === z1) curb(a, d, b, d);
      }
    }
    for (let k = 0; k < 3; k++) if (parts[k].length) {
      const material = new T.MeshStandardMaterial({ map: k === 1 ? stoneMap : map, bumpMap: k === 1 ? stoneHeight : map, bumpScale: k === 1 ? .005 : .012, roughness: k === 1 ? .92 : 1 });
      material.customProgramCacheKey = () => 'park-ground-grain-v2/' + k + '/' + (x1 - x0) + '/' + (z1 - z0);
      if (k !== 1) material.onBeforeCompile = shader => {
        shader.uniforms.parkGrain = { value: grain };
        shader.fragmentShader = 'uniform sampler2D parkGrain;\n' + shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>\n diffuseColor.rgb *= .88 + .24 * texture2D(parkGrain, vMapUv * vec2(${(x1 - x0) / 1.6}, ${(z1 - z0) / 1.6})).r;`);
      };
      const mesh = new T.Mesh(T.mergeGeometries(parts[k]), material);
      mesh.userData.softGround = k !== 1;
      mesh.receiveShadow = true; root.add(mesh); parts[k].forEach(g => g.dispose());
    }
    if (edges.length) { const mesh = new T.Mesh(T.mergeGeometries(edges), new T.MeshStandardMaterial({ color: 0xa7ada0, roughness: .94 })); mesh.receiveShadow = true; root.add(mesh); edges.forEach(g => g.dispose()); }
    return { root, onHit(hit) {
      if (hit.object.userData.softGround) return { bulletmark: false, surface: 'soil' };
    }, dispose() { for (const texture of [map, grain, stoneMap, stoneHeight]) texture.dispose(); } };
  };
  factory.preload = (options, { compute }) => compute(buildTextures, options);
  return factory;
})();
