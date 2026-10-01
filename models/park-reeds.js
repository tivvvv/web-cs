// 湖岸芦苇成丛生长, 剑叶与少量褐色穗头合批; 无叶片碰撞或额外动画.
FPS.models.parkReeds = (T, o = {}) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D(); let seed = o.seed ?? 531;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function add(source, color) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); g.deleteAttribute('uv');
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4, r = Math.sqrt(i / 18), x = Math.cos(a) * r * 1.5, z = Math.sin(a) * r * .72, h = 1.25 + random() * .7;
    add(new T.CylinderGeometry(.008, .015, h, 5).translate(x, h / 2, z), 0x78875b);
    for (let j = 0; j < 4; j++) {
      const yaw = a + j * 2.4, base = j * .17 + .1, length = .65 + random() * .5, vertices = [];
      const at = (t, side) => {
        const width = .045 * Math.sin(t * Math.PI), reach = .42 * t * t;
        return [x + Math.sin(yaw) * reach + Math.cos(yaw) * width * side, base + length * t, z + Math.cos(yaw) * reach - Math.sin(yaw) * width * side];
      };
      for (let k = 0; k < 4; k++) {
        const t = k / 4, u = (k + 1) / 4;
        vertices.push(...at(t, -1), ...at(t, 1), ...at(u, 1), ...at(t, -1), ...at(u, 1), ...at(u, -1));
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); g.computeVertexNormals(); add(g, [0x6f8551, 0x859660, 0x536d45][j % 3]);
    }
    if (i % 3 === 0) {
      pose.position.set(x, h - .06, z); pose.rotation.set(.12, a, .06); pose.updateMatrix();
      add(new T.CylinderGeometry(.033, .038, .24, 7).applyMatrix4(pose.matrix), 0x796344);
    }
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .95 }));
  mesh.castShadow = mesh.receiveShadow = true; mesh.raycast = () => {}; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
