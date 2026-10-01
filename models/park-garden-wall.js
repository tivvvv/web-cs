// 公园内侧园墙: 分缝石基, 灰泥木框与瓦帽; 外围挡墙继续负责边界, 静态构件按材质合批.
FPS.models.parkGardenWall = (T, o = {}) => {
  const root = new T.Group(), parts = [[], [], [], []], pose = new T.Object3D();
  function box(size, position, color, batch, tilt = 0) {
    const source = new T.BoxGeometry(...size), g = source.toNonIndexed(); source.dispose();
    g.rotateX(tilt).translate(...position);
    const p = g.attributes.position, n = g.attributes.normal, c = new T.Color(color), rgb = [], uv = [];
    for (let i = 0; i < p.count; i++) {
      rgb.push(c.r, c.g, c.b);
      if (batch === 2) uv.push((size[1] > size[0] ? p.getX(i) : p.getY(i)) * 4, (size[1] > size[0] ? p.getY(i) : p.getX(i)) * .4);
      else uv.push(p.getX(i) * (batch === 3 ? 2 : 1), (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) * 2);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    parts[batch].push(g.applyMatrix4(pose.matrix));
  }
  for (const { length, height: h, position, yaw } of o.runs) {
    pose.position.set(...position); pose.rotation.set(0, yaw, 0); pose.updateMatrix();
    const panels = Math.ceil(length / 6.2), span = length / panels;
    box([length, h - .6, .57], [0, (h + .6) / 2, 0], 0xbcb6a0, 1);
    for (let row = 0; row < 2; row++) {
      const count = Math.ceil(length / .95), step = length / count;
      for (let i = 0; i < count; i++) box([step - .012, .285, .582], [-length / 2 + (i + .5) * step, .15 + row * .295, 0], [0x868a7d, 0x939487, 0x7b8278][(i + row) % 3], 0);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i <= panels; i++) box([.105, h - .6, .04], [-length / 2 + i * span, (h + .6) / 2, side * .296], 0x69614e, 2);
      for (const y of [.63, h - .09]) box([length, .065, .04], [0, y, side * .296], 0x69614e, 2);
      box([length, .065, .42], [0, h + .025, side * .18], 0x566059, 3, side * .19);
    }
    box([length, .055, .12], [0, h + .07, 0], 0x687069, 3);
  }
  for (const [kind, batch] of parts.entries()) if (batch.length) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 883 + kind;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      let v = 239 + (seed / 4294967296 - .5) * (kind === 1 ? 8 : 24);
      if (kind === 2) v += 12 * Math.sin(x * .34 + Math.sin(y * .037)) * Math.sin(x * .1);
      if (kind === 3 && x % 48 < 2) v -= 42;
      pixels.data.set([v, v, v, 255], (y * 256 + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ vertexColors: true, map, bumpMap: map, bumpScale: kind === 0 ? .006 : .003, roughness: .94 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  }
  return { root };
};
