// 固定式竖梯, 踏棍/握把/墙托与防滑纹静态合批. 攀爬路线由场景声明.
FPS.models.verticalLadder = (T, o = {}) => {
  const root = new T.Group(), parts = [[], []], pose = new T.Object3D(), up = new T.Vector3(0, 1, 0); let matrix = new T.Matrix4();
  function add(source, color, batch = 0) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); g.applyMatrix4(matrix);
    const c = new T.Color(color), rgb = [], p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { rgb.push(c.r, c.g, c.b); uv.setXY(i, (p.getX(i) + p.getZ(i)) * 4, p.getY(i) * 4); }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (size, p, color, batch = 0) => add(new T.BoxGeometry(...size).translate(...p), color, batch);
  function rod(a, b, radius, color, batch = 0) {
    const start = new T.Vector3(...a), delta = new T.Vector3(...b).sub(start);
    pose.position.copy(start).addScaledVector(delta, .5); pose.quaternion.setFromUnitVectors(up, delta.clone().normalize()); pose.updateMatrix();
    add(new T.CylinderGeometry(radius, radius, delta.length(), 10).applyMatrix4(pose.matrix), color, batch);
  }
  for (const ladder of o.ladders ?? [{ position: [0, 0, 0], height: 3, width: .9, yaw: 0 }]) {
    const h = ladder.height ?? 3, w = ladder.width ?? .9, topWidth = ladder.topWidth ?? w, depth = ladder.returnDepth ?? .28, mount = ladder.mountDepth ?? .13;
    pose.position.set(...(ladder.position ?? [0, 0, 0])); pose.rotation.set(0, ladder.yaw ?? 0, 0); pose.updateMatrix(); matrix = pose.matrix.clone();
    for (const side of [-1, 1]) {
      const x = side * w / 2, tx = side * topWidth / 2;
      rod([x, .07, 0], [x, h + .85, 0], .035, 0xc7ad68);
      rod([x, h + .85, 0], [tx, h + 1.1, -depth], .035, 0xc7ad68);
      box([.16, .07, .2], [x, .035, 0], 0x5a746e, 1);
      if (ladder.returnPost !== false) {
        rod([tx, h + 1.1, -depth], [tx, h + .07, -depth], .035, 0xc7ad68);
        box([.16, .07, .2], [tx, h + .035, -depth], 0x5a746e, 1);
      }
      for (let y = .5; ladder.mount !== false && y < h - .2; y += 1.35) {
        box([.065, .085, mount + .07], [x, y, -mount / 2], 0x6e8479, 1);
        box([.15, .23, .04], [x, y, -mount - .015], 0x87968a, 1);
        for (const lift of [-.075, .075]) rod([x, y + lift, -mount + .027], [x, y + lift, -mount - .012], .018, 0xc1c4a8, 1);
      }
    }
    // 每级约 .28 米; 顶端最后一棍低于落脚面, 出口中心保持畅通.
    const count = Math.ceil((h - .12) / .28);
    for (let i = 0; i < count; i++) {
      const y = .16 + (h - .24) * i / Math.max(1, count - 1);
      rod([-w / 2, y, 0], [w / 2, y, 0], .028, 0x9fae9a, 1);
    }
    box([w - .16, .13, .03], [0, .38, -.02], 0xa88446);
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(128, 128); let seed = 972;
  for (let i = 0; i < pixels.data.length; i += 4) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const v = 237 + (seed / 4294967296 - .5) * 16 - ((i / 4) % 16 < 2 ? 18 : 0); pixels.data.set([v, v, v, 255], i); }
  ctx.putImageData(pixels, 0, 0); const grain = new T.CanvasTexture(canvas); grain.colorSpace = T.SRGBColorSpace; grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.anisotropy = 8;
  parts.forEach((batch, i) => {
    if (!batch.length) return;
    const material = new T.MeshStandardMaterial({ map: grain, bumpMap: i ? grain : null, bumpScale: .001, vertexColors: true, roughness: i ? .57 : .72, metalness: i ? .55 : .25 });
    const mesh = new T.Mesh(T.mergeGeometries(batch), material); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  });
  return { root, dispose() { grain.dispose(); } };
};
