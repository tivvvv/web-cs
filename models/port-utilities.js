// 仓库通风设备, 工业吊灯和管线. 自包含四材质合批, 无动画或实时光源.
FPS.models.portUtilities = (T, o = {}) => {
  const root = new T.Group(), parts = [[], [], [], []], pose = new T.Object3D(); let matrix = new T.Matrix4();
  function add(source, color, batch = 0, p = [0, 0, 0], r = [0, 0, 0]) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); g.applyMatrix4(pose.matrix).applyMatrix4(matrix);
    const c = new T.Color(color), rgb = [], n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) { const k = .88 + .12 * Math.max(0, n.getY(i)); rgb.push(c.r * k, c.g * k, c.b * k); }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (s, p, color = 0x789088, batch = 0, r) => add(new T.BoxGeometry(...s), color, batch, p, r);
  const cyl = (radius, height, p, color = 0x9aa99a, batch = 1, r = [0, 0, 0], segments = 16) => add(new T.CylinderGeometry(radius, radius, height, segments), color, batch, p, r);
  function setPose(p, yaw = 0) { pose.position.set(...p); pose.rotation.set(0, yaw, 0); pose.updateMatrix(); matrix = pose.matrix.clone(); }
  const fans = o.fans ?? [{ position: [0, 1.2, 0], yaw: 0 }];
  for (const fan of fans) {
    setPose(fan.position, fan.yaw ?? 0);
    box([1.3, 1.3, .4], [0, 0, 0], 0x7c9389);
    cyl(.52, .24, [0, 0, .22], 0x2c4644, 2, [Math.PI / 2, 0, 0], 24);
    // 静止叶轮在深色风道前, 格栅再向外留出深度, 各层不共面.
    const blade = new T.Shape(); blade.moveTo(.08, -.06); blade.lineTo(.28, -.11); blade.quadraticCurveTo(.48, -.09, .46, .09); blade.lineTo(.32, .14); blade.lineTo(.12, .07); blade.closePath();
    for (let i = 0; i < 5; i++) add(new T.ExtrudeGeometry(blade, { depth: .025, bevelEnabled: false, curveSegments: 5 }).rotateZ(i * Math.PI * .4 + .2), 0x99a998, 1, [0, 0, .35]);
    cyl(.105, .04, [0, 0, .385], 0x657e72, 1, [Math.PI / 2, 0, 0]);
    for (const radius of [.24, .49]) add(new T.TorusGeometry(radius, .014, 5, 32), 0x859b8e, 1, [0, 0, .412]);
    for (let x = -.4; x <= .401; x += .16) box([.018, 2 * Math.sqrt(.48 ** 2 - x ** 2), .022], [x, 0, .425], 0x90a294, 1);
    for (const x of [-.56, .56]) for (const y of [-.56, .56]) cyl(.026, .035, [x, y, .219], 0xc0c5ad, 1, [Math.PI / 2, 0, 0], 6);
    box([.43, .16, .07], [0, -.53, .242], 0x455f58, 2);
  }
  for (const vent of o.roofVents ?? [{ position: [2.1, 0, 0] }]) {
    setPose(vent.position);
    // 底裙嵌入斜屋面, 不让方形基座的一侧悬空.
    box([1.26, .35, 1.26], [0, 0, 0], 0x637f78);
    cyl(.45, .92, [0, .61, 0], 0x869d8d, 1, [0, 0, 0], 24);
    cyl(.58, .13, [0, 1.08, 0], 0x425f58, 2, [0, 0, 0], 24);
    cyl(.63, .1, [0, 1.19, 0], 0x9cab97, 1, [0, 0, 0], 24);
    add(new T.ConeGeometry(.64, .24, 24), 0x869e8b, 1, [0, 1.36, 0]);
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; box([.045, .16, .035], [.57 * Math.sin(a), 1.09, .57 * Math.cos(a)], 0x789484, 1, [0, a, 0]); }
    for (const x of [-.47, .47]) for (const z of [-.47, .47]) cyl(.026, .03, [x, .19, z], 0xb5bfa7, 1, [0, 0, 0], 6);
  }
  for (const lamp of o.lamps ?? [{ position: [0, 3.3, 0], suspension: .7 }]) {
    setPose(lamp.position, lamp.yaw ?? 0); const suspension = lamp.suspension ?? .7;
    box([1.9, .16, .28], [0, 0, 0], 0x5b7772, 1);
    box([1.7, .026, .21], [0, -.093, 0], 0xd8d5b6, 3);
    for (const x of [-.65, .65]) cyl(.018, suspension, [x, .08 + suspension / 2, 0], 0x7e9788, 1, [0, 0, 0], 8);
    for (const x of [-.88, .88]) box([.05, .16, .33], [x, 0, 0], 0x94a38e, 1);
  }
  setPose([0, 0, 0]);
  for (const pipe of o.pipes ?? []) {
    const radius = pipe.radius ?? .055;
    for (let i = 1; i < pipe.points.length; i++) {
      const a = new T.Vector3(...pipe.points[i - 1]), b = new T.Vector3(...pipe.points[i]), delta = b.clone().sub(a);
      const source = new T.CylinderGeometry(radius, radius, delta.length(), 10);
      source.applyQuaternion(pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.clone().normalize())).translate(...a.add(b).multiplyScalar(.5).toArray()); add(source, 0x859b8a, 1);
    }
    for (const p of pipe.points) add(new T.SphereGeometry(radius * 1.08, 10, 6), 0x789284, 1, p);
    for (const p of pipe.clamps ?? []) {
      box([.19, .055, .15], p, 0x5b7768, 1);
      if (pipe.mount) {
        const direction = new T.Vector3(...pipe.mount), center = new T.Vector3(...p).addScaledVector(direction, .5);
        const bracket = new T.CylinderGeometry(.025, .025, direction.length(), 8);
        bracket.applyQuaternion(pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.clone().normalize())).translate(...center.toArray()); add(bracket, 0x6d897a, 1);
      }
    }
  }
  for (const tray of o.trays ?? []) {
    const a = new T.Vector3(...tray.a), b = new T.Vector3(...tray.b), delta = b.clone().sub(a), length = delta.length(), width = tray.width ?? .34;
    setPose(a.add(b).multiplyScalar(.5).toArray(), Math.atan2(delta.x, delta.z));
    box([width, .035, length], [0, 0, 0], 0x5b7870, 1);
    for (const side of [-1, 1]) box([.025, .1, length], [side * (width / 2 - .0125), .035, 0], 0x93a695, 1);
    for (let z = -length / 2 + .18; z < length / 2; z += .38) box([width - .05, .016, .035], [0, .077, z], 0x7d9684, 1);
    for (const x of [-width * .17, width * .17]) cyl(.024, length, [x, .044, 0], 0x354d43, 2, [Math.PI / 2, 0, 0], 8);
    const suspension = tray.suspension ?? .22;
    for (const t of tray.supports ?? []) for (const x of [-width / 2 + .025, width / 2 - .025]) cyl(.014, suspension, [x, .085 + suspension / 2, (t - .5) * length], 0x7e9788, 1, [0, 0, 0], 8);
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(128, 128); let seed = 741;
  for (let i = 0; i < pixels.data.length; i += 4) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const v = 235 + (seed / 4294967296 - .5) * 19; pixels.data.set([v, v, v, 255], i); }
  ctx.putImageData(pixels, 0, 0); const grain = new T.CanvasTexture(canvas); grain.colorSpace = T.SRGBColorSpace; grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.anisotropy = 8;
  const materials = [new T.MeshStandardMaterial({ map: grain, bumpMap: grain, bumpScale: .0015, vertexColors: true, roughness: .7, metalness: .3 }),
    new T.MeshStandardMaterial({ map: grain, vertexColors: true, roughness: .5, metalness: .61 }), new T.MeshStandardMaterial({ vertexColors: true, roughness: .92 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .34, emissive: 0xc5bda1, emissiveIntensity: .13 })];
  parts.forEach((batch, i) => { if (!batch.length) return; const mesh = new T.Mesh(T.mergeGeometries(batch), materials[i]); mesh.castShadow = i !== 3; mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose()); });
  return { root, dispose() { grain.dispose(); } };
};
