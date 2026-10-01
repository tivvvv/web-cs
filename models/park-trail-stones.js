// 林间踏石为独立实体, 浅高差可直接登阶; 石面边缘稍不规则, 共用世界铺设坐标.
FPS.models.parkTrailStones = (T, o = {}) => {
  const root = new T.Group(), parts = [];
  for (const [i, [x, z, w, d, yaw]] of (o.stones ?? []).entries()) {
    const shape = new T.Shape();
    for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4, r = .91 + .06 * Math.sin(j * 3 + i);
      const px = Math.cos(a) * w * .5 * r, pz = Math.sin(a) * d * .5 * r;
      if (j) shape.lineTo(px, pz); else shape.moveTo(px, pz);
    }
    shape.closePath();
    const g = new T.ExtrudeGeometry(shape, { depth: .079, bevelEnabled: true, bevelSize: .009, bevelThickness: .008, bevelSegments: 1 }).rotateX(-Math.PI / 2).rotateY(yaw).translate(x, .008, z);
    const p = g.attributes.position, colors = [], uv = [];
    for (let j = 0; j < p.count; j++) {
      const c = new T.Color(p.getY(j) < .045 ? 0x79866b : i % 2 ? 0x92988a : 0xa3a898); c.multiplyScalar(.96 + .04 * Math.sin(p.getX(j) * 7 + p.getZ(j) * 9));
      colors.push(c.r, c.g, c.b);
      uv.push(p.getX(j) * 2, p.getZ(j) * 2);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); parts.push(g);
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 591;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const v = 225 + (seed / 4294967296 - .5) * 35;
    pixels.data.set([v, v, v, 255], i);
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, map, bumpMap: map, bumpScale: .003, roughness: .96 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
