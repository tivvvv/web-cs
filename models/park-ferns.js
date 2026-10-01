// 林下蕨类: 弧形羽状复叶, 一株共用几何, 全园实例化; 根部采样地形, 自动避让园路.
FPS.models.parkFerns = (T, o = {}) => {
  const root = new T.Group(), vertices = [], colors = [], pose = new T.Object3D(), tint = new T.Color();
  let seed = 1731; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function triangle(a, b, c, shade) {
    vertices.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) colors.push(shade, shade, shade * .92);
  }
  for (let f = 0; f < 9; f++) {
    const angle = f * 2.4, length = .62 + f % 3 * .13;
    const at = (t, lateral = 0) => {
      const radius = length * t, y = .07 + length * (.95 * Math.sin(t * Math.PI * .7) - .16 * t);
      return [Math.cos(angle) * radius - Math.sin(angle) * lateral, y, Math.sin(angle) * radius + Math.cos(angle) * lateral];
    };
    for (let k = 0; k < 12; k++) {
      const t = .08 + k * .071, spread = length * .29 * Math.sin(t * Math.PI) * (1 - .35 * t);
      triangle(at(t, -.004), at(t, .004), at(t + .078), .7);
      for (const side of [-1, 1]) {
        const base = at(t), tip = at(t + .1, spread * side), back = at(t + .028, spread * side * .56), forward = at(t + .115, spread * side * .51);
        tip[1] += .026; back[1] -= .016;
        triangle(base, back, tip, .8 + t * .18); triangle(base, tip, forward, .93 + t * .07);
      }
    }
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  const count = o.patches.reduce((sum, p) => sum + p[4], 0);
  const plants = new T.InstancedMesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .95 }), count);
  const kind = (x, z) => { let k = 0; for (const r of o.surfaces) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) k = r[4]; return k; };
  const blocked = (x, z) => kind(x, z) !== 2 || o.trails.some(t => t.points.some(p => Math.hypot(x - p[0], z - p[1]) < t.width / 2 + .65)) || o.exclusions.some(r => x > r[0] && z > r[1] && x < r[2] && z < r[3]);
  function level(x, z) {
    const c = o.cells.find(({ size: s, offset: p }) => Math.abs(x - p[0]) <= s[0] / 2 && Math.abs(z - p[2]) <= s[2] / 2);
    if (!c) return .024;
    const u = (x - c.offset[0]) / c.size[0] + .5, v = (z - c.offset[2]) / c.size[2] + .5, [a, b, d, e] = c.surface;
    return u + v <= 1 ? a + (b - a) * u + (d - a) * v : e + (d - e) * (1 - u) + (b - e) * (1 - v);
  }
  let index = 0;
  for (const [x, z, w, d, n] of o.patches) for (let i = 0; i < n; i++) {
    const a = random() * Math.PI * 2, r = Math.sqrt(random()), px = x + Math.cos(a) * r * w / 2, pz = z + Math.sin(a) * r * d / 2;
    if (blocked(px, pz)) continue;
    const size = .62 + random() * .48;
    pose.position.set(px, level(px, pz), pz); pose.rotation.set(0, a, 0); pose.scale.set(size, size * (.7 + random() * .4), size); pose.updateMatrix(); plants.setMatrixAt(index, pose.matrix);
    tint.set([0x4b6b35, 0x657c42, 0x58763d, 0x7b8c4d][i % 4]); plants.setColorAt(index++, tint);
  }
  plants.count = index; plants.castShadow = plants.receiveShadow = true; plants.raycast = () => {}; root.add(plants); return { root };
};
