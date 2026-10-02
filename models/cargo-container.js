// 货运集装箱组, 三网格合批; 六面实体波纹/框架/门锁与箱顶支撑共用场景尺寸.
FPS.models.cargoContainer = (T, o = {}) => {
  const root = new T.Group(), parts = [[], [], []], ranges = [[], []], cursors = [0, 0], rayGeometries = [], pose = new T.Object3D();
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 512); let seed = 817;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const grime = Math.exp(-(511 - y) / 44) * 26, patch = Math.sin(x * .035 + Math.sin(y * .021)) * Math.sin(y * .018) * 9;
    const v = 238 + (random() - .5) * 22 + patch - grime; pixels.data.set([v, v, v, 255], (y * 512 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 1024; labelCanvas.height = 512;
  const lc = labelCanvas.getContext('2d');
  for (let i = 0; i < 4; i++) {
    const x = i % 2 * 512, y = Math.floor(i / 2) * 256;
    lc.fillStyle = ['#e6e3cb', '#d6e8e3', '#ead7b9', '#d9dce2'][i];
    lc.font = 'italic 800 69px sans-serif'; lc.fillText(['SHONAN', 'KAIYO', 'NORTHLINE', 'PACIFIC'][i], x + 24, y + 94);
    lc.fillRect(x + 26, y + 112, 427, 4); lc.font = '600 22px monospace'; lc.fillText('CONTAINER TRANSPORT', x + 29, y + 150);
    lc.font = '22px monospace'; lc.fillText('SNKU  482 ' + (117 + i) + '  /  45G1', x + 29, y + 198);
    lc.font = '18px monospace'; lc.fillText('MAX GROSS  /  CHECK SEAL', x + 29, y + 229);
  }
  const labels = new T.CanvasTexture(labelCanvas); labels.colorSpace = T.SRGBColorSpace; labels.anisotropy = 8;
  function add(source, color, batch = 0, position = [0, 0, 0], rotation = [0, 0, 0]) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...position); pose.rotation.set(...rotation); pose.updateMatrix(); g.applyMatrix4(pose.matrix).applyMatrix4(componentMatrix).applyMatrix4(unitMatrix);
    if (batch !== 2) {
      const c = new T.Color(color), p = g.attributes.position, rgb = [];
      for (let i = 0; i < p.count; i++) { const shade = .91 + .06 * Math.sin(p.getX(i) * .37 + p.getZ(i) * .41); rgb.push(c.r * shade, c.g * shade, c.b * shade); }
      g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3));
    }
    parts[batch].push(g);
  }
  let unitMatrix = new T.Matrix4(), componentMatrix = new T.Matrix4();
  for (const [id, unit] of (o.units ?? [{ position: [0, 0, 0], length: 12, color: 0x326971 }]).entries()) {
    const first = parts.map(batch => batch.length);
    const w = unit.width ?? 2.6, h = unit.height ?? 3, l = unit.length ?? 12;
    const color = new T.Color(unit.color ?? 0x326971).lerp(new T.Color(0xa1a397), (unit.weather ?? (id % 4) * .22) * .21);
    const openEnds = unit.openEnds ?? [], skin = unit.skin ?? { wall: .125, floor: .16, roof: .22, end: .14, door: .075 };
    pose.position.set(...(unit.position ?? [0, 0, 0])); pose.rotation.set(0, unit.yaw ?? 0, 0); pose.updateMatrix(); unitMatrix = pose.matrix.clone();
    const box = (s, p, c = color, batch = 0) => add(new T.BoxGeometry(...s), c, batch, p);
    if (!openEnds.length) box([w - .09, h - .16, l - .09], [0, h / 2, 0]);
    else {
      // 开门箱为实空壳体, 内壁/地板/顶棚与场景支撑面一致, 入口没有隐藏整箱实体.
      for (const side of [-1, 1]) box([skin.wall - .045, h - .16, l - .09], [side * (w / 2 - skin.wall / 2 - .0225), h / 2, 0], 0x88958c);
      box([w - .09, skin.floor, l], [0, skin.floor / 2, 0], 0x82715b);
      box([w - .09, skin.roof - .084, l - .09], [0, h - (skin.roof + .084) / 2, 0], 0x849087);
      for (const sign of [-1, 1]) if (!openEnds.includes(sign))
        box([w - .09, h - .16, skin.end - .045], [0, h / 2, sign * (l / 2 - skin.end / 2 - .0225)], 0x829187);
      for (let z = -l / 2 + 1; z < l / 2; z += 1.8) box([w - skin.wall * 2, .035, .07], [0, h - skin.roof - .0175, z], 0x566962, 1);
    }
    // 波纹向实体内部凹进, 外框与顶面均落在同一碰撞轮廓内.
    function corrugated(axis, sign) {
      const span = axis === 'side' ? l - .22 : w - .22, count = Math.ceil(span / .14), positions = [], uv = [], index = [];
      for (let j = 0; j <= count; j++) {
        const u = -span / 2 + span * j / count, wave = .018 + .022 * (.5 + .5 * Math.cos(j * Math.PI));
        for (const v of [.12, h - .12]) {
          positions.push(...(axis === 'side' ? [sign * (w / 2 - wave), v, u] : [u, v, sign * (l / 2 - wave)])); uv.push((u + span / 2) / 2, v / h);
        }
      }
      for (let j = 0; j < count; j++) { const a = j * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      if ((axis === 'side' && sign < 0) || (axis === 'end' && sign > 0)) for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(index); g.computeVertexNormals(); add(g, color);
    }
    for (const sign of [-1, 1]) { corrugated('side', sign); if (!openEnds.includes(sign)) corrugated('end', sign); }
    box([w, .07, l], [0, h - .049, 0]);
    for (let z = -l / 2 + .27; z < l / 2 - .15; z += .27) box([w - .25, .014, .055], [0, h - .007, z]);
    for (const x of [-w / 2 + .08, w / 2 - .08]) for (const z of [-l / 2 + .08, l / 2 - .08]) {
      box([.13, h, .13], [x, h / 2, z], 0x697571, 1);
      for (const y of [.07, h - .07]) box([.16, .14, .16], [x, y, z], 0x707b75, 1);
    }
    for (const y of [.07, h - .07]) {
      for (const x of [-w / 2 + .05, w / 2 - .05]) box([.1, .14, l - .16], [x, y, 0]);
      for (const z of [-l / 2 + .05, l / 2 - .05]) box([w - .16, .14, .1], [0, y, z]);
    }
    // 双门锁杆, 合页与底部锈蚀, 两端均有完整外观.
    for (const sign of [-1, 1]) {
      if (openEnds.includes(sign)) {
        const leaf = (w - .28) / 2, angle = unit.doorAngle ?? Math.PI * .8;
        for (const side of [-1, 1]) {
          pose.position.set(side * (w / 2 - .14), 0, sign * (l / 2 - .055)); pose.rotation.set(0, sign * side * angle, 0); pose.updateMatrix(); componentMatrix = pose.matrix.clone();
          const center = -side * leaf / 2;
          box([leaf, h - .28, skin.door], [center, h / 2, 0]);
          for (const x of [center - leaf / 2 + .03, center + leaf / 2 - .03]) box([.06, h - .28, skin.door + .018], [x, h / 2, 0], 0x60736b, 1);
          for (const y of [.17, h - .17]) box([leaf, .06, skin.door + .018], [center, y, 0], 0x738177, 1);
          for (let x = center - leaf / 2 + .12; x < center + leaf / 2 - .08; x += .14)
            box([.055, h - .4, .018], [x, h / 2, sign * (skin.door / 2 + .012)]);
          for (const x of [center - leaf * .23, center + leaf * .23]) {
            add(new T.CylinderGeometry(.017, .017, h - .4, 6), 0xaab5ae, 1, [x, h / 2, sign * (skin.door / 2 + .041)]);
            for (const y of [.45, 1.02, h - .4]) box([.12, .055, .038], [x, y, sign * (skin.door / 2 + .034)], 0x75817a, 1);
          }
          for (const y of [.51, h - .52]) add(new T.CylinderGeometry(.052, .052, .15, 8), 0x6d7e72, 1, [0, y, 0]);
        }
        componentMatrix.identity(); continue;
      }
      box([.035, h - .27, .016], [0, h / 2, sign * (l / 2 - .006)], 0x263c3d, 1);
      for (const x of [-w * .32, -w * .12, w * .12, w * .32]) {
        add(new T.CylinderGeometry(.017, .017, h - .4, 6), 0xaab5ae, 1, [x, h / 2, sign * (l / 2 - .021)]);
        for (const y of [.45, 1.02, h - .4]) box([.12, .055, .038], [x, y, sign * (l / 2 - .019)], 0x75817a, 1);
      }
      for (const x of [-w * .39, w * .39]) for (const y of [.51, h - .52]) box([.25, .07, .033], [x, y, sign * (l / 2 - .021)], 0x566961, 1);
    }
    for (let i = 0; i < 7; i++) {
      const z = (random() - .5) * (l - .5), height = .08 + random() * .2;
      for (const sign of [-1, 1]) box([.009, height, .045 + random() * .09], [sign * (w / 2 - .014), .14 + height / 2, z], 0x71513a, 1);
    }
    const slot = id % 4;
    for (const sign of [-1, 1]) {
      const g = new T.PlaneGeometry(Math.min(4.1, l - .7), 1.35), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (slot % 2 + .015 + uv.getX(i) * .97) / 2, 1 - (Math.floor(slot / 2) + .015 + (1 - uv.getY(i)) * .97) / 2);
      add(g, 0xffffff, 2, [sign * (w / 2 + .006), 1.75, -.2], [0, sign * Math.PI / 2, 0]);
    }
    for (const batch of [0, 1]) {
      const count = parts[batch].slice(first[batch]).reduce((sum, g) => sum + g.attributes.position.count, 0);
      ranges[batch].push([cursors[batch], cursors[batch] + count]); cursors[batch] += count;
    }
  }
  const materials = [new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .0018, vertexColors: true, roughness: .7, metalness: .27 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .68, metalness: .48 }), new T.MeshStandardMaterial({ map: labels, alphaTest: .45, roughness: .81 })];
  parts.forEach((batch, i) => {
    if (!batch.length) return;
    const mesh = new T.Mesh(T.mergeGeometries(batch), materials[i]); mesh.name = ['cargo-shells', 'cargo-fittings', 'cargo-print'][i];
    mesh.castShadow = i !== 2; mesh.receiveShadow = true;
    if (i === 2) mesh.raycast = () => {};
    else {
      mesh.geometry.computeBoundingBox();
      const inverse = new T.Matrix4(), localRay = new T.Raycaster().ray;
      // 绘制仍为整组合批, 射线先逐箱剔除, 仅检测候选箱的原始三角面; 不简化弹痕表面.
      const proxies = ranges[i].map(([from, to]) => {
        const g = new T.BufferGeometry(), bounds = new T.Box3(), point = new T.Vector3();
        for (const name of ['position', 'normal', 'uv']) g.setAttribute(name, mesh.geometry.attributes[name]);
        g.setIndex(Array.from({ length: to - from }, (_, j) => from + j));
        for (let j = from; j < to; j++) bounds.expandByPoint(point.fromBufferAttribute(g.attributes.position, j));
        g.boundingBox = bounds; g.boundingSphere = { center: bounds.getCenter(new T.Vector3()), radius: bounds.getSize(new T.Vector3()).length() / 2 };
        const proxy = new T.Mesh(g, mesh.material); proxy.matrixWorld = mesh.matrixWorld; rayGeometries.push(g); return { proxy, from };
      });
      mesh.raycast = (ray, hits) => {
        localRay.copy(ray.ray).applyMatrix4(inverse.copy(mesh.matrixWorld).invert());
        if (!localRay.intersectsBox(mesh.geometry.boundingBox)) return;
        for (const { proxy, from } of proxies) {
          const first = hits.length; proxy.raycast(ray, hits);
          for (let j = first; j < hits.length; j++) { hits[j].object = mesh; hits[j].faceIndex += from / 3; }
        }
      };
    }
    root.add(mesh); batch.forEach(g => g.dispose());
  });
  return { root, dispose() { rayGeometries.forEach(g => g.dispose()); map.dispose(); labels.dispose(); } };
};
