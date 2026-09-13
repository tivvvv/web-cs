// 近岸荷叶与少量荷花, 带叶缺口/叶脉和双层花瓣; 全部静态合为一个网格.
FPS.models.pondLotus = (T, o = {}) => {
  const root = new T.Group(), parts = []; let seed = o.seed || 81;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function add(g, hex) {
    if (g.index) { const source = g; g = source.toNonIndexed(); source.dispose(); }
    g.deleteAttribute('uv'); const c = new T.Color(hex), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  for (let i = 0; i < 12; i++) {
    const angle = i * 2.4, distance = .45 * Math.sqrt(i), x = Math.cos(angle) * distance, z = Math.sin(angle) * distance * .7;
    const radius = .24 + rand() * .13, yaw = rand() * Math.PI * 2, vertices = [];
    for (let j = 0; j < 24; j++) {
      const a = .17 + j * (Math.PI * 2 - .34) / 24, b = .17 + (j + 1) * (Math.PI * 2 - .34) / 24;
      vertices.push(0, .035, 0, Math.sin(a) * radius, .016, Math.cos(a) * radius, Math.sin(b) * radius, .016, Math.cos(b) * radius);
    }
    const leaf = new T.BufferGeometry(); leaf.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    leaf.computeVertexNormals(); add(leaf.rotateY(yaw).translate(x, 0, z), [0x668b4e, 0x759850, 0x527d49][i % 3]);
    for (let j = 0; j < 6; j++) {
      const a = yaw + .5 + j, r = radius * .8;
      const vein = new T.BufferGeometry(); vein.setAttribute('position', new T.Float32BufferAttribute([x - .004, .039, z, x + Math.sin(a) * r, .024, z + Math.cos(a) * r, x + .004, .039, z], 3));
      vein.computeVertexNormals(); add(vein, 0x93a762);
    }
    if (i !== 2 && i !== 9) continue;
    add(new T.CylinderGeometry(.015, .019, .14, 6).translate(x, .07, z), 0x758958);
    for (let layer = 0; layer < 2; layer++) for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4 + layer * .3, reach = layer ? .042 : .075;
      add(new T.SphereGeometry(1, 6, 4).scale(.043, .032, layer ? .08 : .12).rotateX(layer ? -.65 : -.2).rotateY(a).translate(x + Math.sin(a) * reach, .16 + layer * .045, z + Math.cos(a) * reach), layer ? 0xf2e5de : 0xe7bdc8);
    }
    add(new T.SphereGeometry(.035, 8, 4).scale(1, .5, 1).translate(x, .225, z), 0xd9bc6e);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .78, side: T.DoubleSide }));
  mesh.receiveShadow = true; mesh.raycast = () => {}; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
