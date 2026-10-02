// 码头金属楼梯, 箱顶连接桥与踏箱; 可见踏面直接使用场景的支撑盒, 静态合批.
FPS.models.portAccess = (T, o = {}) => {
  const root = new T.Group(), parts = [[], []];
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 174;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const diamond = Math.abs((x + y) % 32 - 16) < 1.4 || Math.abs((x - y + 256) % 32 - 16) < 1.4;
    const v = 218 + (seed / 4294967296 - .5) * 19 + (diamond ? 22 : 0); pixels.data.set([v, v, v, 255], (y * 256 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
  function add(source, kind) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    const c = new T.Color(kind === 'rail' ? 0xdbc36c : kind === 'crate' ? 0x92795a : kind === 'leg' ? 0x516165 : 0x798c8c), rgb = [];
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const shade = n.getY(i) < -.5 ? .7 : .96; rgb.push(c.r * shade, c.g * shade, c.b * shade);
      uv.setXY(i, (Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) * 2, (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) * 2);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[kind === 'crate' ? 1 : 0].push(g);
  }
  for (const { size, offset, kind = 'deck' } of o.boxes ?? [{ size: [3, .12, 3], offset: [0, .06, 0] }]) {
    const bodySize = kind === 'crate' ? [size[0] - .018, size[1], size[2] - .018] : size;
    add(new T.BoxGeometry(...bodySize).translate(...offset), kind);
    if (kind === 'crate') {
      // 箱角与板缝均内收, 踏面最高点不改变跳跃高度.
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const p = [offset[0] + x * (size[0] / 2 - .0275), offset[1], offset[2] + z * (size[2] / 2 - .0275)];
        add(new T.BoxGeometry(.055, size[1] - .02, .055).translate(...p), 'rail');
      }
    }
  }
  for (const { a, b, width = .09, kind = 'rail' } of o.beams ?? []) {
    const from = new T.Vector3(...a), delta = new T.Vector3(...b).sub(from), g = new T.BoxGeometry(width, delta.length(), width);
    const pose = new T.Object3D(); pose.position.copy(from).addScaledVector(delta, .5); pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.clone().normalize()); pose.updateMatrix(); add(g.applyMatrix4(pose.matrix), kind);
  }
  parts.forEach((batch, i) => {
    if (!batch.length) return;
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: i ? .001 : .0018, vertexColors: true, roughness: i ? .92 : .65, metalness: i ? .05 : .45 }));
    mesh.name = i ? 'port-step-crates' : 'port-stairs-and-walkways'; mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  });
  return { root, dispose() { map.dispose(); } };
};
