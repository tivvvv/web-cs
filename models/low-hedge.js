// 修剪绿篱使用交叠低面数叶团, 不生成成千上万片叶子; 可缩成花箱灌木.
FPS.models.lowHedge = (T, o = {}) => {
  const w = o.width ?? 4, d = o.depth ?? .7, h = o.height ?? .9, root = new T.Group(), parts = [];
  const n = Math.max(2, Math.ceil(w / .4));
  for (let i = 0; i < n; i++) for (let layer = 0; layer < 2; layer++) {
    const source = new T.SphereGeometry(1, 8, 5), g = source.toNonIndexed(); source.dispose();
    g.scale(w / n * (i === 0 || i === n - 1 ? .5 : .68), h * .34, d * (.44 + layer * .06));
    g.translate(-w / 2 + (i + .5) * w / n, h * (.34 + layer * .3), Math.sin(i * 2.4) * d * .035);
    const c = new T.Color([0x516b46, 0x657b4f, 0x5a7248][(i + layer) % 3]), colors = [];
    for (let v = 0; v < g.attributes.position.count; v++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .93 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
