// 林地缓丘使用共用四角高度生成连续曲面, 静态合批; 细支撑格由场景配置.
FPS.models.parkTerrain = (T, o = {}) => {
  const root = new T.Group(), vertices = [], colors = [];
  for (const { size: s, offset: p, surface: h } of o.cells ?? []) {
    const points = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => [p[0] + a * s[0] / 2, h[i], p[2] + b * s[2] / 2]);
    for (const indices of [[0, 2, 1], [1, 2, 3]]) {
      if (indices.some(i => h[i] > .0241)) for (const i of indices) {
        const [x, y, z] = points[i];
        vertices.push(x, y, z);
        colors.push(1, 1, 1);
      }
      // 朝下的封底藏在原地面内, 不产生可见拼缝或格子侧壁.
      for (const i of [...indices].reverse()) {
        vertices.push(points[i][0], 0, points[i][2]); const c = new T.Color(0x665c43); colors.push(c.r, c.g, c.b);
      }
    }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.computeVertexNormals();
  // 共顶点法线平均后保持缓丘连续, 草面色差和树下裸土使用世界坐标, 消除纯色格块.
  const p = g.attributes.position, normal = g.attributes.normal, sums = new Map(), key = i => [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(5)).join(',');
  for (let i = 0; i < p.count; i++) { const k = key(i), n = sums.get(k) ?? new T.Vector3(); n.add(new T.Vector3().fromBufferAttribute(normal, i)); sums.set(k, n); }
  for (let i = 0; i < p.count; i++) { const n = sums.get(key(i)).clone().normalize(); normal.setXYZ(i, n.x, n.y, n.z); }
  g.computeBoundingBox(); const { min, max } = g.boundingBox, w = max.x - min.x, d = max.z - min.z, uv = [];
  for (let i = 0; i < p.count; i++) uv.push((p.getX(i) - min.x) / w, 1 - (p.getZ(i) - min.z) / d);
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(1024, 1024); let seed = 872;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    const wx = min.x + (x + .5) / 1024 * w, wz = min.z + (y + .5) / 1024 * d;
    const shade = Math.sin(wx * .21 + Math.sin(wz * .16) * 1.5) * Math.cos(wz * .23 - wx * .08) * 12 + (random() - .5) * 15;
    pixels.data.set([99 + shade, 119 + shade, 74 + shade, 255], (y * 1024 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); ctx.setTransform(1024 / w, 0, 0, 1024 / d, -min.x * 1024 / w, -min.z * 1024 / d);
  for (const [x, z] of o.trees ?? []) {
    const gradient = ctx.createRadialGradient(x, z, .1, x, z, 1.65);
    gradient.addColorStop(0, '#655943'); gradient.addColorStop(.45, '#6e694cd9'); gradient.addColorStop(1, '#6e694c00');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, z, 1.65, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 18000; i++) {
    const x = min.x + random() * w, z = min.z + random() * d;
    ctx.strokeStyle = i % 3 ? '#85945555' : '#485b3955'; ctx.lineWidth = .012;
    ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(x + (random() - .5) * .06, z + .08 + random() * .07); ctx.stroke();
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const mesh = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, map, bumpMap: map, bumpScale: .004, roughness: 1 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
  return { root, onHit() { return { bulletmark: false, surface: 'soil' }; } };
};
