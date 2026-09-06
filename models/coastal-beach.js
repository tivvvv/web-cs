// 仅保留本站区前方的缓降沙滩, 两端沉入海面, 不向预留区域生成山体或林带.
FPS.models.coastalBeach = (T, o = {}) => {
  const { sandLevel = -1.05, sandStart = -18, slope = .04, halfWidth = 80, edgeSlope = .045 } = o;
  const root = new T.Group(), g = new T.PlaneGeometry(300, 60, 60, 16).rotateX(-Math.PI / 2);
  const p = g.attributes.position, colors = [], color = new T.Color(), dry = new T.Color(0xd7c39b), wet = new T.Color(0xa99a78);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i) + sandStart - 30;
    const y = sandLevel + (z - sandStart) * slope - Math.max(0, Math.abs(x) - halfWidth) * edgeSlope;
    p.setXYZ(i, x, y, z); g.attributes.uv.setXY(i, x * .4, z * .4);
    // 高潮线以内保留湿沙, 向干沙渐变, 避免水退后出现突兀色带.
    color.copy(wet).lerp(dry, Math.max(0, Math.min(1, (y + 1.82) / .32))); colors.push(color.r, color.g, color.b);
  }
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.computeVertexNormals();
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(128, 128);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const n = 220 + (Math.sin(i * 1.37) * 43758.5453 % 1) * 25;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = n; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping;
  const mesh = new T.Mesh(g, new T.MeshStandardMaterial({ map, vertexColors: true, roughness: 1 }));
  mesh.receiveShadow = true; root.add(mesh); return { root };
};
