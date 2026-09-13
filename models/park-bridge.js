// 三孔石拱桥: 实心拱腹, 拱券与石栏杆; 两种材质静态合批, 不增加帧更新.
FPS.models.parkBridge = (T, o = {}) => {
  const root = new T.Group(), parts = [[], []];
  // 暖灰白石材靠构件色差区分层次, 纹理保持浅色细颗粒, 避免重复乘色压暗桥身.
  function stoneTexture(joints) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256);
    let seed = 713; const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const v = 242 + Math.floor(rand() * 10); pixels.data.set([v, v, v - 2, 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
    if (joints) {
      ctx.strokeStyle = '#b8b7af'; ctx.lineWidth = 2; ctx.beginPath();
      for (let y = 0; y <= 256; y += 64) { ctx.moveTo(0, y); ctx.lineTo(256, y); }
      for (let row = 0; row < 4; row++) for (let x = (row % 2) * 64; x <= 256; x += 128) { ctx.moveTo(x, row * 64); ctx.lineTo(x, row * 64 + 64); }
      ctx.stroke();
    }
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping; return map;
  }
  function add(g, color, batch = 0) {
    if (g.index) { const source = g; g = source.toNonIndexed(); source.dispose(); }
    const c = new T.Color(color), colors = [], uv = [], p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      colors.push(c.r, c.g, c.b);
      uv.push((Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) / 2, (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) / 2);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); parts[batch].push(g);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s).translate(...p), c);
  function section(points, depth, z, color, batch = 0) {
    const shape = new T.Shape(points.map(p => new T.Vector2(...p)));
    add(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 }).translate(0, 0, z), color, batch);
  }
  function beam(a, b, height, depth) {
    const start = new T.Vector3(...a), delta = new T.Vector3(...b).sub(start), pose = new T.Object3D();
    pose.position.copy(start.addScaledVector(delta, .5)); pose.rotation.z = Math.atan2(delta.y, delta.x); pose.updateMatrix();
    add(new T.BoxGeometry(delta.length(), height, depth).applyMatrix4(pose.matrix), 0xeeede6);
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
  // 宽石板浅接缝, 下方连续桥身托住踏面; 桥头踏步和碰撞使用相同高度.
  for (const [i, { size, offset }] of o.deck.entries()) for (let j = 0; j < 3; j++)
    box([size[0] - .008, size[1], size[2] / 3 - .008], [offset[0], offset[1], (j - 1) * size[2] / 3], [0xd7d8d2, 0xd1d3cc, 0xddddd6][(i + j) % 3]);
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
      for (let j = 1; j <= 3; j++) { const t = j / 4, by = py + (y - py) * t; box([.11, o.railHeight - .52, .13], [px + (x - px) * t, by + .275 + (o.railHeight - .52) / 2, z], 0xe5e6de); }
    }
  }
  parts.forEach((batch, i) => {
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ map: stoneTexture(i === 1), vertexColors: true, roughness: .94 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  });
  return { root };
};
