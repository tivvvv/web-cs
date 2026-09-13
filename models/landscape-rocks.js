// 景石按真实尺寸成组生成, 下部埋土; 确定性变形与岩面色差, 所有石块仅一个网格.
FPS.models.landscapeRocks = (T, o = {}) => {
  const root = new T.Group(), parts = [];
  for (const [j, [x, z, w, h, d]] of (o.stones ?? []).entries()) {
    const g = new T.IcosahedronGeometry(1, 2), p = g.attributes.position, colors = [];
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      const noise = Math.sin(px * 13 + py * 7 + pz * 19 + j * 2.7), r = .93 + noise * .065;
      p.setXYZ(i, x + px * r * w / 2, h * (.4 + py * r * .6), z + pz * r * d / 2);
      const c = new T.Color(py < -.15 && noise > -.2 ? 0x6c7752 : [0x93978c, 0x7d8980, 0x9c9c8e][j % 3]);
      c.multiplyScalar(.92 + noise * .08); colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.computeVertexNormals(); parts.push(g);
  }
  if (parts.length) {
    const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .98 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  }
  return { root };
};
