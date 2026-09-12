// 修剪草坪: 共用一张程序纹理, 所有地块静态合批, 不生成草叶网格或动画.
FPS.models.lawn = (T, o = {}) => {
  const root = new T.Group(), parts = [], canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256);
  let seed = 819;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const shade = 175 + (random() - .5) * 28 + 9 * Math.sin(x * Math.PI / 128) * Math.cos(y * Math.PI / 64), i = (y * 256 + x) * 4;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0); ctx.lineWidth = .8;
  for (let i = 0; i < 4200; i++) {
    const x = random() * 256, y = random() * 256, dx = (random() - .5) * 5, dy = 2 + random() * 4, shade = 115 + random() * 110;
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    // 边缘草纹回绕, 缩小时使用 mipmap, 避免远处产生颗粒闪烁.
    for (const ox of [0, x < 5 ? 256 : -256]) for (const oy of [0, -256]) {
      ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + dx, y + oy + dy); ctx.stroke();
    }
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
  function add(g, outer, inner = outer, repeat = 1 / 1.2) {
    const p = g.attributes.position, colors = [], uv = [], palette = [new T.Color(outer), new T.Color(inner)];
    for (let i = 0; i < p.count; i++) {
      uv.push(p.getX(i) * repeat, p.getZ(i) * repeat);
      const c = palette[i < 4 ? 0 : 1], shade = 1 + .035 * Math.sin(p.getX(i) * .47 + p.getZ(i) * .31);
      colors.push(c.r * shade, c.g * shade, c.b * shade);
    }
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  for (const [x, y, z, w, d] of o.patches ?? []) {
    // 收边和草根均向原地块内收, 石条底部埋入地面, 不占用通道.
    function ring(inset, band, edgeY, outer, inner = outer, repeat = 1 / 1.2) {
      const positions = [], indices = [];
      for (const [offset, lift] of [[inset, edgeY], [inset + band, .006]]) {
        for (const [sx, sz] of [[-1, -1], [-1, 1], [1, 1], [1, -1]]) positions.push(x + sx * (w / 2 - offset), y + lift, z + sz * (d / 2 - offset));
      }
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; indices.push(i, j, i + 4, j, j + 4, i + 4); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      g.setIndex(indices); g.computeVertexNormals(); add(g, outer, inner, repeat);
    }
    ring(0, .1, .003, 0x929184, 0x929184, 6); // 低于石面的接缝底色, 避免缝隙露出亮色铺地.
    // 约 60 厘米一块, 接缝 6 毫米; 顶面高 18 毫米, 上沿做 4 毫米倒角.
    for (const [axis, span, cross] of [[0, w, d], [1, d - .2, w]]) for (const side of [-1, 1]) {
      const count = Math.ceil(span / .6), length = span / count;
      for (let i = 0; i < count; i++) {
        const along = (i + .5) * length - span / 2, across = side * (cross / 2 - .05);
        const g = new T.BoxGeometry(axis ? .1 : length - .006, 1, axis ? length - .006 : .1, 1, 2, 1), p = g.attributes.position;
        for (let j = 0; j < p.count; j++) {
          const top = p.getY(j) > 0, bevel = top ? .004 : 0;
          p.setXYZ(j, p.getX(j) - Math.sign(p.getX(j)) * bevel, top ? .018 : p.getY(j) < 0 ? -.008 : .014, p.getZ(j) - Math.sign(p.getZ(j)) * bevel);
        }
        g.computeVertexNormals(); g.translate(x + (axis ? across : along), y, z + (axis ? along : across));
        const color = [0xc1c3b6, 0xb7bcad, 0xbcc0b2][(i + axis + (side > 0 ? 1 : 0)) % 3];
        add(g, color, color, 6);
      }
    }
    ring(.1, .05, .006, 0x948366, 0x879860); // 5 厘米土色逐渐融入短草.
    add(new T.PlaneGeometry(w - .3, d - .3).rotateX(-Math.PI / 2).translate(x, y + .006, z), 0x879860);
  }
  if (parts.length) {
    const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map, vertexColors: true, roughness: 1 }));
    mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  }
  return { root };
};
