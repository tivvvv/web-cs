// 低石花坛, 土面低于分块石沿; 花木由场景单独摆放, 无跨模型调用.
FPS.models.stoneFlowerbed = (() => {
  let surfaceMap;
  return (T, o = {}) => {
    const w = o.width ?? 6, d = o.depth ?? 1.3, h = o.height ?? .24, root = new T.Group(), parts = [];
    if (!surfaceMap) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 256;
      const ctx = c.getContext('2d'), pixels = ctx.createImageData(512, 256); let seed = 619;
      const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
        const v = 224 + (random() - .5) * 42 + Math.sin(x * Math.PI / 128) * Math.cos(y * Math.PI / 64) * 8;
        pixels.data.set([v, v, v, 255], (y * 512 + x) * 4);
      }
      ctx.putImageData(pixels, 0, 0);
      for (let i = 0; i < 180; i++) {
        ctx.fillStyle = i % 3 ? '#a8a8a8' : '#d7d7d7'; ctx.beginPath(); ctx.ellipse(260 + random() * 248, random() * 256, 1 + random() * 3, .8 + random() * 1.6, random() * Math.PI, 0, Math.PI * 2); ctx.fill();
      }
      surfaceMap = new T.CanvasTexture(c); surfaceMap.colorSpace = T.SRGBColorSpace; surfaceMap.anisotropy = 8; surfaceMap.wrapS = surfaceMap.wrapT = T.RepeatWrapping;
    }
    function add(source, p, color) {
      const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); g.translate(...p);
      const c = new T.Color(color), colors = [];
      const vertices = g.attributes.position, uv = g.attributes.uv, normals = g.attributes.normal, soil = color === 0x75664e;
      for (let i = 0; i < vertices.count; i++) {
        const y = vertices.getY(i), fade = soil ? .96 : .83 + .17 * Math.min(1, y / h);
        colors.push(c.r * fade, c.g * fade, c.b * fade);
        const side = Math.abs(normals.getX(i)) > .6, u = side ? vertices.getZ(i) : vertices.getX(i), v = Math.abs(normals.getY(i)) > .6 ? vertices.getZ(i) : y;
        uv.setXY(i, u * 1.2, v * 1.2);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
    }
    const box = (s, p, color) => add(new T.BoxGeometry(...s), p, color);
    box([w - .22, h - .08, d - .22], [0, (h - .08) / 2, 0], 0x75664e);
    const soilFaces = parts[0].attributes.position.count / 3;
    const nx = Math.ceil(w / .65), nz = Math.ceil((d - .28) / .65);
    for (const side of [-1, 1]) {
      for (let i = 0; i < nx; i++) box([w / nx - .012, h, .14], [(i + .5) * w / nx - w / 2, h / 2, side * (d / 2 - .07)], i % 2 ? 0x999e91 : 0xa6a899);
      for (let i = 0; i < nz; i++) box([.14, h, (d - .28) / nz - .012], [side * (w / 2 - .07), h / 2, (i + .5) * (d - .28) / nz - (d - .28) / 2], 0x999e91);
    }
    for (const [x, z, r] of o.rocks ?? []) add(new T.IcosahedronGeometry(1, 1).scale(r, r * .65, r * .8), [x, h - .08, z], 0x858d81);
    const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map: surfaceMap, bumpMap: surfaceMap, bumpScale: .004, vertexColors: true, roughness: .96 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
    return { root, onHit(hit) {
      if (hit.object === mesh && hit.faceIndex < soilFaces) return { bulletmark: false, surface: 'soil' };
    } };
  };
})();
