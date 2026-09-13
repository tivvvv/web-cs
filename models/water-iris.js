// 水生鸢尾扎根湖底, 剑形叶片与少量蓝紫花形成近岸层次; 静态合批, 无透明贴片.
FPS.models.waterIris = (T, o = {}) => {
  const root = new T.Group(), parts = []; let seed = o.seed ?? 91;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function add(source, color) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    g.deleteAttribute('uv'); const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, r = Math.sqrt(i) * .22, x = Math.sin(a) * r, z = Math.cos(a) * r * .7;
    for (let j = 0; j < 7; j++) {
      const yaw = a + j * 2.4, h = .65 + rand() * .55, bend = .16 + rand() * .2, vertices = [];
      const point = (t, side) => {
        const width = Math.sin(Math.PI * t) * .045, reach = bend * t * t;
        return [x + Math.sin(yaw) * reach + Math.cos(yaw) * width * side, h * t, z + Math.cos(yaw) * reach - Math.sin(yaw) * width * side];
      };
      for (let k = 0; k < 5; k++) {
        const t = k / 5, u = (k + 1) / 5;
        vertices.push(...point(t, -1), ...point(t, 1), ...point(u, 1), ...point(t, -1), ...point(u, 1), ...point(u, -1));
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      g.computeVertexNormals(); add(g, [0x4e7050, 0x67824f, 0x799053][j % 3]);
    }
    if (i % 2) continue;
    const y = 1.02 + rand() * .22;
    add(new T.CylinderGeometry(.009, .014, y, 5).translate(x, y / 2, z), 0x688153);
    for (let j = 0; j < 3; j++) {
      const yaw = a + j * Math.PI * 2 / 3;
      add(new T.SphereGeometry(1, 8, 6).scale(.058, .018, .125).rotateX(.45).translate(0, -.025, .09).rotateY(yaw).translate(x, y, z), 0x7770a6);
      add(new T.SphereGeometry(1, 6, 4).scale(.038, .092, .022).rotateX(-.3).translate(0, .06, .026).rotateY(yaw).translate(x, y, z), 0x9990bd);
      add(new T.SphereGeometry(1, 6, 4).scale(.013, .008, .055).rotateX(.45).translate(0, -.006, .06).rotateY(yaw).translate(x, y, z), 0xdcc779);
    }
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: T.DoubleSide }));
  mesh.receiveShadow = mesh.castShadow = true; mesh.raycast = () => {}; root.add(mesh);
  parts.forEach(g => g.dispose()); return { root };
};
