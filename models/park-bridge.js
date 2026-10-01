// 三孔石拱桥: 实心拱腹, 拱券与石栏杆; 两种材质静态合批, 不增加帧更新.
FPS.models.parkBridge = (T, o = {}) => {
  const root = new T.Group(), parts = [[], []];
  // 桥石保持中性暖灰, 块间差异/渗水痕按实体尺寸绘制, 避免整座桥抢过神社的明度.
  function stoneTexture(joints) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 512);
    let seed = 713; const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const row = Math.floor(y / 128), col = Math.floor((x + (row % 2) * 128) / 256);
      const block = joints ? Math.sin(col * 13 + row * 19) * 6 : 0;
      const patch = Math.sin(x * Math.PI / 64 + Math.sin(y * Math.PI / 128)) * Math.sin(y * Math.PI / 128) * 5;
      const v = 236 + block + patch + (rand() - .5) * 18; pixels.data.set([v, v, v - 3, 255], (y * 512 + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0);
    if (joints) {
      ctx.strokeStyle = '#9b9f93'; ctx.lineWidth = 3; ctx.beginPath();
      for (let y = 0; y <= 512; y += 128) { ctx.moveTo(0, y); ctx.lineTo(512, y); }
      for (let row = 0; row < 4; row++) for (let x = (row % 2) * 128; x <= 512; x += 256) { ctx.moveTo(x, row * 128); ctx.lineTo(x, row * 128 + 128); }
      ctx.stroke();
      for (let i = 0; i < 30; i++) {
        const x = rand() * 512, y = rand() * 512, h = 14 + rand() * 55, gradient = ctx.createLinearGradient(0, y, 0, y + h);
        gradient.addColorStop(0, '#656f5d20'); gradient.addColorStop(1, '#656f5d00'); ctx.fillStyle = gradient; ctx.fillRect(x, y, 4 + rand() * 7, h);
      }
    }
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8; return map;
  }
  function add(g, color, batch = 0) {
    if (g.index) { const source = g; g = source.toNonIndexed(); source.dispose(); }
    const c = new T.Color(color), colors = [], uv = [], p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const damp = Math.max(0, Math.min(1, (.48 - p.getY(i)) / .8)), shade = .67 - damp * .12;
      colors.push(c.r * shade * (1 - damp * .06), c.g * shade, c.b * shade * (1 - damp * .09));
      uv.push((Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) / 2, (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) / 2);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); parts[batch].push(g);
  }
  function block(s) {
    const b = Math.min(.012, ...s.map(v => v / 12)), shape = new T.Shape();
    shape.moveTo(-s[0] / 2 + b, -s[1] / 2 + b); shape.lineTo(s[0] / 2 - b, -s[1] / 2 + b);
    shape.lineTo(s[0] / 2 - b, s[1] / 2 - b); shape.lineTo(-s[0] / 2 + b, s[1] / 2 - b); shape.closePath();
    return new T.ExtrudeGeometry(shape, { depth: s[2] - b * 2, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1 }).translate(0, 0, -s[2] / 2 + b);
  }
  const box = (s, p, c, bevel = true) => add((bevel ? block(s) : new T.BoxGeometry(...s)).translate(...p), c);
  function section(points, depth, z, color, batch = 0) {
    const shape = new T.Shape(points.map(p => new T.Vector2(...p)));
    add(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 }).translate(0, 0, z), color, batch);
  }
  function beam(a, b, height, depth) {
    const start = new T.Vector3(...a), delta = new T.Vector3(...b).sub(start), pose = new T.Object3D();
    pose.position.copy(start.addScaledVector(delta, .5)); pose.rotation.z = Math.atan2(delta.y, delta.x); pose.updateMatrix();
    add(block([delta.length(), height, depth]).applyMatrix4(pose.matrix), 0xeeede6);
  }
  // 三孔之间的实体同时形成桥墩与两端桥台, 拱下保持真实开口.
  const outline = [[-o.length / 2, o.bottom]];
  for (const a of o.arches) for (let i = 24; i >= 0; i--) {
    const t = i * Math.PI / 24;
    outline.push([(a.left + a.right) / 2 + (a.right - a.left) / 2 * Math.cos(t), o.bottom + (a.crown - o.bottom) * Math.sin(t)]);
  }
  outline.push([o.length / 2, o.bottom]);
  for (const s of [...o.body].reverse()) outline.push([s.x1, s.top], [s.x0, s.top]);
  section(outline, o.width, -o.width / 2, 0xd8d6ce, 1);
  for (const a of o.arches) for (const side of [-1, 1]) {
    const cx = (a.left + a.right) / 2, rx = (a.right - a.left) / 2, ry = a.crown - o.bottom;
    const point = (t, inset) => [cx + (rx + inset) * Math.cos(t), o.bottom + (ry + inset) * Math.sin(t)];
    for (let i = 0; i < 24; i++) {
      const t0 = i * Math.PI / 24 + .0015, t1 = (i + 1) * Math.PI / 24 - .0015;
      section([point(t0, 0), point(t1, 0), point(t1, .26), point(t0, .26)], .09, side > 0 ? o.width / 2 : -o.width / 2 - .09, [0xefede5, 0xe8e7df, 0xf2f0e8][i % 3]);
    }
  }
  // 每级一整块宽踏石, 保留接缝与边缘倒角, 不再横向拆成三块重复侧面.
  for (const [i, { size, offset }] of o.deck.entries())
    box([size[0] - .008, size[1], size[2]], offset, [0xd7d8d2, 0xd1d3cc, 0xddddd6][i % 3]);
  for (const side of [-1, 1]) {
    const z = side * (o.width / 2 - .14);
    for (let i = 0; i < o.profile.length; i++) {
      const [x, y] = o.profile[i];
      box([.3, .16, .32], [x, y + .08, z], 0xd8d8d0);
      box([.24, o.railHeight - .28, .26], [x, y + .16 + (o.railHeight - .28) / 2, z], 0xecebe4);
      box([.36, .12, .36], [x, y + o.railHeight - .06, z], 0xf2f0e9);
      if (!i) continue;
      const [px, py] = o.profile[i - 1];
      for (const [lift, h, d] of [[.2, .16, .2], [o.railHeight - .16, .18, .3]]) beam([px, py + lift, z], [x, y + lift, z], h, d);
      // 细栏芯的倒角远处不足一像素, 使用低面数实体; 宽石板, 栏柱和扶手保留倒角.
      for (let j = 1; j <= 3; j++) { const t = j / 4, by = py + (y - py) * t; box([.11, o.railHeight - .52, .13], [px + (x - px) * t, by + .275 + (o.railHeight - .52) / 2, z], 0xe5e6de, false); }
    }
  }
  parts.forEach((batch, i) => {
    const map = stoneTexture(i === 1);
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: i ? .004 : .002, vertexColors: true, roughness: .94 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  });
  return { root };
};
