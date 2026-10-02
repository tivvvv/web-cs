// 码头护栏, 系船柱, 橡胶护舷与入口导向, 重复细构件静态合批; 标牌使用实体印字面.
FPS.models.portFixtures = (T, o = {}) => {
  const root = new T.Group(), parts = [[], []], prints = [], pose = new T.Object3D(), up = new T.Vector3(0, 1, 0);
  function add(source, color, batch = 0) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); g.deleteAttribute('uv');
    const c = new T.Color(color), rgb = [];
    for (let i = 0; i < g.attributes.position.count; i++) rgb.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (s, p, c = 0x536d6d, batch = 0) => add(new T.BoxGeometry(...s).translate(...p), c, batch);
  function rod(a, b, r = .03, c = 0x879c91, batch = 0) {
    const start = new T.Vector3(...a), delta = new T.Vector3(...b).sub(start); pose.position.copy(start).addScaledVector(delta, .5); pose.quaternion.setFromUnitVectors(up, delta.clone().normalize()); pose.updateMatrix();
    add(new T.CylinderGeometry(r, r, delta.length(), 7).applyMatrix4(pose.matrix), c, batch);
  }
  const railPosts = new Map();
  for (const { a, b } of o.rails ?? []) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), delta = end.clone().sub(start), n = Math.ceil(delta.length() / 2.5);
    if (!n) continue;
    for (let i = 0; i <= n; i++) {
      const p = start.clone().addScaledVector(delta, i / n), key = [p.x, p.z].map(v => v.toFixed(4)).join(','), old = railPosts.get(key);
      // 共用转角柱; 台地高低交界取连续整柱, 不在两段栏杆之间留下断口.
      railPosts.set(key, { x: p.x, z: p.z, foot: Math.min(old?.foot ?? p.y, p.y), top: Math.max(old?.top ?? p.y + 1.2, p.y + 1.2) });
    }
    for (const lift of [.58, 1.2]) rod([start.x, start.y + lift, start.z], [end.x, end.y + lift, end.z], .03);
  }
  for (const { x, z, foot, top } of railPosts.values()) {
    box([.16, .12, .16], [x, foot + .06, z]); rod([x, foot + .08, z], [x, top, z], .034);
  }
  for (const [x, y, z] of o.bollards ?? [[0, 0, 0]]) {
    box([.72, .12, .65], [x, y + .06, z], 0x697c76);
    add(new T.CylinderGeometry(.19, .23, .55, 10).translate(x, y + .35, z), 0x526967);
    add(new T.CylinderGeometry(.3, .25, .16, 10).translate(x, y + .69, z), 0x8a9582);
    rod([x - .38, y + .49, z], [x + .38, y + .49, z], .09, 0x647973);
    for (const sx of [-.26, .26]) for (const sz of [-.22, .22]) add(new T.CylinderGeometry(.026, .026, .025, 6).translate(x + sx, y + .136, z + sz), 0x9ba68e);
  }
  for (const [x, y, z] of o.fenders ?? []) {
    box([.95, 2.2, .11], [x, y, z + .14], 0x4a6465);
    add(new T.CylinderGeometry(.35, .35, 1.8, 12).translate(x, y, z - .1), 0x283c3b, 1);
    for (const lift of [-.75, .75]) rod([x - .36, y + lift, z + .2], [x + .36, y + lift, z + .2], .06, 0x596d63);
    for (const sx of [-.32, .32]) {
      rod([x + sx, y + 1.08, z + .1], [x + sx, y + 1.08, z - .34], .034, 0x77847a);
      for (let i = 0; i < 6; i++) add(new T.TorusGeometry(.047, .012, 5, 10).rotateY(i % 2 * Math.PI / 2).translate(x + sx, y + 1.02 - i * .068, z - .34), 0x77847a);
      rod([x + sx, y + .68, z - .34], [x + sx, y + .68, z - .1], .028, 0x77847a);
    }
  }
  for (const { a, b, sag = .35 } of o.ropes ?? []) {
    // 软缆连续下垂曲面, 接头没有逐段圆柱的断口和端盖.
    const positions = [], colors = [], index = [], n = 24, sides = 8, radius = .045;
    const axis = new T.Vector3(...b).sub(new T.Vector3(...a)); if (axis.lengthSq() < 1e-8) continue;
    const cross = new T.Vector3(-axis.z, 0, axis.x); cross.lengthSq() < 1e-8 ? cross.set(1, 0, 0) : cross.normalize();
    for (let i = 0; i <= n; i++) {
      const t = i / n, center = new T.Vector3(...a).addScaledVector(axis, t); center.y -= sag * 4 * t * (1 - t);
      const tangent = axis.clone(); tangent.y -= sag * 4 * (1 - 2 * t); tangent.normalize(); const other = new T.Vector3().crossVectors(tangent, cross).normalize();
      for (let j = 0; j < sides; j++) {
        const angle = j * Math.PI * 2 / sides, p = center.clone().addScaledVector(cross, Math.cos(angle) * radius).addScaledVector(other, Math.sin(angle) * radius), c = new T.Color(j % 2 ? 0x888068 : 0x716c54);
        positions.push(...p.toArray()); colors.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < sides; j++) { const a = i * sides + j, b = i * sides + (j + 1) % sides, c = a + sides, d = b + sides; index.push(a, b, c, b, d, c); }
    const source = new T.BufferGeometry(); source.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); source.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); source.setIndex(index); source.computeVertexNormals();
    const g = source.toNonIndexed(); source.dispose(); parts[1].push(g);
  }
  for (const { position: [x, y, z], radius = .48 } of o.coils ?? []) {
    const count = Math.max(1, Math.min(5, Math.floor((radius - .12) / .074) + 1));
    for (let i = 0; i < count; i++) add(new T.TorusGeometry(radius - i * .074, .031, 7, 32).rotateX(Math.PI / 2).translate(x, y + .034 + i * .008, z), i % 2 ? 0x8e8366 : 0x776e55, 1);
    rod([x + radius - .1, y + .06, z], [x + radius + .32, y + .037, z + .3], .031, 0x85775a, 1);
  }
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 1024; labelCanvas.height = 512;
  const ctx = labelCanvas.getContext('2d');
  for (const [i, [title, subtitle]] of [['湘南コンテナ埠頭', 'SHONAN CONTAINER TERMINAL'], ['岸壁 01 / QUAY 01', 'CARGO YARD  →'], ['物流庫 02', 'WAREHOUSE / LOADING BAY']].entries()) {
    const y = i * 160; ctx.fillStyle = '#294c53'; ctx.fillRect(0, y, 1024, 160); ctx.fillStyle = '#dfd7af'; ctx.fillRect(12, y + 12, 1000, 4); ctx.textAlign = 'center'; ctx.font = '600 57px sans-serif'; ctx.fillText(title, 512, y + 79); ctx.font = '600 27px monospace'; ctx.fillText(subtitle, 512, y + 127);
  }
  for (const { position: [x, y, z], width = 6, yaw = 0, slot = 0, gate = false } of o.signs ?? []) {
    const cos = Math.cos(yaw), sin = Math.sin(yaw), h = width * .156;
    pose.position.set(x, y, z); pose.rotation.set(0, yaw, 0); pose.scale.set(1, 1, 1); pose.updateMatrix();
    add(new T.BoxGeometry(width + .12, h + .12, .12).applyMatrix4(pose.matrix), 0x6e8179);
    if (gate) {
      for (const side of [-1, 1]) box([.18, 4.6, .18], [x + side * (width / 2 + .22) * cos, y - 1.7, z - side * (width / 2 + .22) * sin], 0x49676d);
    } else box([.1, 2.2, .1], [x, y - 1.2, z], 0x637e77);
    const source = new T.BoxGeometry(width, h, .08), g = source.toNonIndexed(); source.dispose(); const uv = g.attributes.uv, normals = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      if (normals.getZ(i) > .5) uv.setXY(i, .008 + uv.getX(i) * .984, 1 - (slot * 160 + 5 + (1 - uv.getY(i)) * 150) / 512);
      else uv.setXY(i, .003, .997);
    }
    g.translate(0, 0, .07).applyMatrix4(pose.matrix); prints.push(g);
  }
  parts.forEach((batch, i) => {
    if (!batch.length) return;
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ vertexColors: true, roughness: i ? .94 : .61, metalness: i ? .03 : .44 })); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  });
  const map = new T.CanvasTexture(labelCanvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  if (prints.length) {
    const mesh = new T.Mesh(T.mergeGeometries(prints), new T.MeshStandardMaterial({ map, roughness: .83 })); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); prints.forEach(g => g.dispose());
  }
  return { root, dispose() { map.dispose(); } };
};
