// 湖岸景观低栏: 浅色石柱与两道细木横栏, 不用密集竖杆遮湖; 防越界碰撞由场景单独配置.
FPS.models.lakeFence = (T, o) => {
  const root = new T.Group(), parts = [[], []], pose = new T.Object3D(), posts = new Set();
  const { railDepth, postWidths } = o;
  function box(size, position, color, yaw = 0, batch = 0) {
    pose.position.set(...position); pose.rotation.set(0, yaw, 0); pose.updateMatrix();
    const source = new T.BoxGeometry(...size), g = source.toNonIndexed(); source.dispose();
    const p = g.attributes.position, n = g.attributes.normal, c = new T.Color(color), rgb = [], uv = [];
    for (let i = 0; i < p.count; i++) {
      const shade = batch ? 1 : .87 + .13 * Math.min(1, position[1] + p.getY(i));
      rgb.push(c.r * shade, c.g * shade, c.b * shade);
      uv.push((batch ? Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i) : p.getX(i)) * (batch ? 6 : 3), (batch ? p.getX(i) * .35 : p.getY(i) * 3));
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); parts[batch].push(g.applyMatrix4(pose.matrix));
  }
  for (const [a, b] of o.segments) {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz), yaw = -Math.atan2(dz, dx);
    const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
    for (const y of [.48, o.height - .11]) box([length + .06, .075, railDepth], [x, y, z], 0x756650, yaw, 1);
    for (const [px, pz] of [a, b]) {
      const key = px.toFixed(4) + ',' + pz.toFixed(4);
      if (posts.has(key)) continue;
      posts.add(key);
      box([postWidths.base, .12, postWidths.base], [px, .06, pz], 0x999e8e);
      box([postWidths.shaft, o.height - .19, postWidths.shaft], [px, .12 + (o.height - .19) / 2, pz], 0xb9bbae);
      box([postWidths.cap, .07, postWidths.cap], [px, o.height - .035, pz], 0xc9cabe);
      for (const side of [-1, 1]) for (const y of [.48, o.height - .11])
        box([.045, .035, .005], [px, y, pz + side * (postWidths.shaft / 2 + .003)], 0x555d52, 0, 1);
    }
  }
  for (const [kind, batch] of parts.entries()) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 757;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const v = 237 + (seed / 4294967296 - .5) * (kind ? 8 : 30) + (kind ? 14 * Math.sin(x * .37 + Math.sin(y * .02) * 1.5) * Math.sin(x * .08) : 0);
      pixels.data.set([v, v, v, 255], (y * 256 + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ vertexColors: true, map, bumpMap: map, bumpScale: .004, roughness: .94 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  }
  return { root };
};
