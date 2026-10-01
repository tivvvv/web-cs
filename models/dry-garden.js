// 白砂留白, 石组回纹与起伏苔岸; 砂面在苔岛处挖空, 静态纹理和几何只在初始化生成.
FPS.models.dryGarden = (T, o = {}) => {
  const root = new T.Group(), w = o.width ?? 12, d = o.depth ?? 8, parts = [], mossParts = [];
  const gravelFaces = []; let faceCount = 0;
  const islands = o.islands ?? (o.stones ?? []).map(([x, z, sw, , sd]) => [x, z, sw * .67, sd * .65, 0]);
  const resolution = Math.max(w, d) > 16 ? 2048 : 1024, sw = w - .52, sd = d - .52, sandY = o.sandHeight ?? .09, edgeY = o.edgeHeight ?? .14;
  function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
  const base = canvas(resolution), color = canvas(resolution), relief = canvas(resolution);
  const baseCtx = base.getContext('2d'), ctx = color.getContext('2d'), heightCtx = relief.getContext('2d'), pixels = baseCtx.createImageData(resolution, resolution);
  let seed = 918;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grain = (random() - .5) * 23; pixels.data.set([232 + grain, 229 + grain, 219 + grain, 255], i);
  }
  baseCtx.putImageData(pixels, 0, 0); ctx.drawImage(base, 0, 0); heightCtx.fillStyle = '#b8b8b8'; heightCtx.fillRect(0, 0, resolution, resolution);
  // 同一软边轮廓用于苔岛几何和砂纹, 圆弧不是每块石头的独立靶心.
  function contour(island, angle, offset = 0, index = 0) {
    const [x, z, rx, rz, yaw = 0] = island, r = 1 + .075 * Math.sin(angle * 3 + index) + .04 * Math.sin(angle * 5 - index);
    const a = Math.cos(angle) * (rx * r + offset), b = Math.sin(angle) * (rz * r + offset);
    return [x + a * Math.cos(yaw) - b * Math.sin(yaw), z + a * Math.sin(yaw) + b * Math.cos(yaw)];
  }
  function path(c, points, closed = false) {
    c.beginPath(); points.forEach(([x, z], i) => { const px = (x / sw + .5) * resolution, pz = (z / sd + .5) * resolution; if (i) c.lineTo(px, pz); else c.moveTo(px, pz); });
    if (closed) c.closePath();
  }
  function rake(points, closed = false) {
    path(ctx, points, closed); ctx.strokeStyle = 'rgba(114,111,101,.19)'; ctx.lineWidth = .032 * resolution / sd; ctx.stroke();
    path(ctx, points.map(([x, z]) => [x, z - .018]), closed); ctx.strokeStyle = 'rgba(255,254,247,.34)'; ctx.lineWidth = .018 * resolution / sd; ctx.stroke();
    path(heightCtx, points, closed); heightCtx.strokeStyle = '#888888'; heightCtx.lineWidth = .03 * resolution / sd; heightCtx.stroke();
  }
  for (let z = -sd / 2; z <= sd / 2; z += .14) rake([[-sw / 2, z], [sw / 2, z]]);
  islands.forEach((island, index) => {
    const outline = offset => Array.from({ length: 128 }, (_, i) => contour(island, i * Math.PI / 64, offset, index));
    // 只在石组周围保留六道回纹, 外侧直接衔接平行耙纹; 大片中央砂面保持平静.
    for (const c of [ctx, heightCtx]) {
      c.save(); path(c, outline(.86), true); c.clip();
      if (c === ctx) c.drawImage(base, 0, 0); else { c.fillStyle = '#b8b8b8'; c.fillRect(0, 0, resolution, resolution); }
      c.restore();
    }
    for (let i = 0; i < 6; i++) rake(outline(.12 + i * .14), true);
  });
  function texture(c, repeat = false) {
    const map = new T.CanvasTexture(c); map.anisotropy = 4;
    if (repeat) map.wrapS = map.wrapT = T.RepeatWrapping;
    return map;
  }
  const map = texture(color); map.colorSpace = T.SRGBColorSpace;
  // 苔岸和白砂只共享边线, 不在苔面下隐藏一张近平面.
  const shape = new T.Shape(); shape.moveTo(-sw / 2, -sd / 2); shape.lineTo(sw / 2, -sd / 2); shape.lineTo(sw / 2, sd / 2); shape.lineTo(-sw / 2, sd / 2); shape.closePath();
  islands.forEach((island, index) => {
    const hole = new T.Path();
    for (let i = 0; i < 96; i++) { const [x, z] = contour(island, i * Math.PI / 48, 0, index); if (i) hole.lineTo(x, -z); else hole.moveTo(x, -z); }
    hole.closePath(); shape.holes.push(hole);
  });
  const sandGeometry = new T.ShapeGeometry(shape).rotateX(-Math.PI / 2), sandP = sandGeometry.attributes.position, sandUV = sandGeometry.attributes.uv;
  for (let i = 0; i < sandP.count; i++) sandUV.setXY(i, sandP.getX(i) / sw + .5, .5 - sandP.getZ(i) / sd);
  const sand = new T.Mesh(sandGeometry, new T.MeshStandardMaterial({ map, bumpMap: texture(relief), bumpScale: .012, roughness: 1 }));
  const microCanvas = canvas(256), microCtx = microCanvas.getContext('2d'), microPixels = microCtx.createImageData(256, 256);
  for (let i = 0; i < microPixels.data.length; i += 4) { const v = 225 + random() * 30; microPixels.data.set([v, v, v, 255], i); }
  microCtx.putImageData(microPixels, 0, 0);
  for (let i = 0; i < 3400; i++) {
    const x = random() * 256, y = random() * 256, r = .8 + random() * 1.2;
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
      microCtx.fillStyle = i % 3 ? '#e9e7df' : '#d5d3c9'; microCtx.beginPath(); microCtx.ellipse(x + dx, y + dy, r, r * .64, i, 0, Math.PI * 2); microCtx.fill();
    }
  }
  const sandGrain = texture(microCanvas, true); sandGrain.colorSpace = T.SRGBColorSpace;
  sand.material.customProgramCacheKey = () => 'dry-garden-sand-grain-v1';
  sand.material.onBeforeCompile = shader => {
    shader.uniforms.sandGrain = { value: sandGrain };
    shader.vertexShader = 'varying vec2 sandXZ;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nsandXZ=position.xz/ .64;');
    shader.fragmentShader = 'uniform sampler2D sandGrain; varying vec2 sandXZ;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\nvec3 gravelGrain=texture2D(sandGrain,sandXZ).rgb; diffuseColor.rgb*=mix(vec3(1.),gravelGrain,.22);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nfloat microHeight=gravelGrain.g*.001; normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(microHeight),dFdy(microHeight)),faceDirection);');
  };
  sand.name = 'dry-garden-sand'; sand.position.y = sandY; sand.receiveShadow = true; root.add(sand);
  function add(g, color, target = parts, loose = false) {
    if (g.index) { const source = g; g = source.toNonIndexed(); source.dispose(); }
    if (target === parts) {
      const faces = g.attributes.position.count / 3;
      if (loose) gravelFaces.push([faceCount, faceCount + faces]); faceCount += faces;
    }
    const c = new T.Color(color), colors = [], uv = [], p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const shade = target === mossParts ? .87 + .1 * Math.sin(x * 4 + z * 3) + .045 * Math.sin(x * 13 + z * 9) : .98 + .02 * Math.sin(x * 9 + z * 6);
      if (target === mossParts) {
        c.set(color);
        const radius = Math.min(...islands.map(([cx, cz, rx, rz, yaw = 0]) => {
          const dx = x - cx, dz = z - cz;
          return Math.hypot((dx * Math.cos(yaw) + dz * Math.sin(yaw)) / rx, (-dx * Math.sin(yaw) + dz * Math.cos(yaw)) / rz);
        }));
        c.lerp(new T.Color(0x747652), Math.max(0, Math.min(.32, (radius - .88) * 2)));
      }
      colors.push(c.r * shade, c.g * shade, c.b * shade);
      uv.push((Math.abs(n.getX(i)) > .6 ? z : x) * 3, (Math.abs(n.getY(i)) > .6 ? z : p.getY(i)) * 3);
    }
    if (target !== mossParts) g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); target.push(g);
  }
  // 窄碎石排水带衬托低石沿, 避免整块白砂像放在绿色托盘上.
  const gravelCanvas = canvas(128), gravelCtx = gravelCanvas.getContext('2d'); gravelCtx.fillStyle = '#797b75'; gravelCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1900; i++) {
    const v = 100 + random() * 61; gravelCtx.fillStyle = 'rgb(' + v + ',' + (v + 1) + ',' + (v - 3) + ')';
    gravelCtx.beginPath(); gravelCtx.ellipse(random() * 128, random() * 128, 1.5 + random() * 2, 1 + random(), random() * Math.PI, 0, Math.PI * 2); gravelCtx.fill();
  }
  const gravelMap = texture(gravelCanvas, true); gravelMap.colorSpace = T.SRGBColorSpace;
  const drainage = [];
  for (const side of [-1, 1]) drainage.push(new T.PlaneGeometry(w - .32, .1).rotateX(-Math.PI / 2).translate(0, .065, side * (sd / 2 + .05)), new T.PlaneGeometry(.1, sd).rotateX(-Math.PI / 2).translate(side * (sw / 2 + .05), .065, 0));
  const gravelGeometry = T.mergeGeometries(drainage), gp = gravelGeometry.attributes.position, guv = gravelGeometry.attributes.uv;
  for (let i = 0; i < gp.count; i++) guv.setXY(i, gp.getX(i) * 3, gp.getZ(i) * 3);
  const gravel = new T.Mesh(gravelGeometry, new T.MeshStandardMaterial({ map: gravelMap, bumpMap: gravelMap, bumpScale: .008, roughness: 1 }));
  gravel.name = 'dry-garden-drainage'; gravel.receiveShadow = true; root.add(gravel); drainage.forEach(g => g.dispose());
  add(new T.BoxGeometry(w, .055, d).translate(0, .0275, 0), 0x74766f);
  for (const [axis, length, cross] of [[0, w, d], [1, d - .32, w]]) for (const side of [-1, 1]) {
    const n = Math.ceil(length / .92);
    for (let i = 0; i < n; i++) {
      const along = -length / 2 + (i + .5) * length / n, across = side * (cross / 2 - .08);
      add(new T.BoxGeometry(axis ? .16 : length / n - .012, edgeY, axis ? length / n - .012 : .16).translate(axis ? across : along, edgeY / 2, axis ? along : across), i % 3 ? 0x93958c : 0xa5a69b);
    }
  }
  islands.forEach((island, index) => {
    const vertices = [], uv = [], segments = 96;
    function vertex(angle, radius) {
      const [x, z] = contour(island, angle, 0, index), px = island[0] + (x - island[0]) * radius, pz = island[1] + (z - island[1]) * radius;
      const rise = (.13 + index % 2 * .025) * Math.pow(1 - radius * radius, 1.6) * (1 + .14 * radius * Math.sin(angle * 3 + index));
      vertices.push(px, sandY + rise, pz); uv.push(px * 3, pz * 3);
    }
    for (let ring = 0; ring < 10; ring++) for (let i = 0; i < segments; i++) {
      const a = i * Math.PI * 2 / segments, b = (i + 1) * Math.PI * 2 / segments, inner = ring / 10, outer = (ring + 1) / 10;
      vertex(a, inner); vertex(b, outer); vertex(a, outer); vertex(a, inner); vertex(b, inner); vertex(b, outer);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    add(g, index % 2 ? 0x5a6840 : 0x616d45, mossParts);
    // 少量半埋碎石散落在苔岸边缘, 大片砂面仍然留白.
    for (let i = 0; i < 8; i++) {
      const a = index * 1.7 + (i < 4 ? .45 : 3.6) + random() * .4, [x, z] = contour(island, a, .045 + random() * .08, index), size = .045 + random() * .035;
      add(new T.IcosahedronGeometry(1, 0).scale(size, size * .38, size * (.65 + random() * .35)).rotateY(a).translate(x, sandY + size * .12, z), [0x8c8b7b, 0xa9a595, 0x747970][i % 3], parts, true);
    }
  });
  const stoneCanvas = canvas(128), stoneCtx = stoneCanvas.getContext('2d'), stonePixels = stoneCtx.createImageData(128, 128);
  for (let i = 0; i < stonePixels.data.length; i += 4) { const v = 226 + random() * 29; stonePixels.data.set([v, v, v, 255], i); }
  stoneCtx.putImageData(stonePixels, 0, 0); const stoneMap = texture(stoneCanvas, true); stoneMap.colorSpace = T.SRGBColorSpace;
  const edging = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneMap, bumpScale: .004, vertexColors: true, roughness: 1 }));
  edging.name = 'dry-garden-edging'; edging.castShadow = edging.receiveShadow = true; root.add(edging); parts.forEach(g => g.dispose());
  if (mossParts.length) {
    const mossCanvas = canvas(256), mossCtx = mossCanvas.getContext('2d'), pixels = mossCtx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const v = 219 + (random() - .5) * 33; pixels.data.set([v, v, v, 255], (y * 256 + x) * 4);
    }
    mossCtx.putImageData(pixels, 0, 0);
    for (let i = 0; i < 500; i++) {
      const x = random() * 256, y = random() * 256, r = 2 + random() * 8, dark = i % 3 === 0;
      for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
        const gradient = mossCtx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        gradient.addColorStop(0, dark ? 'rgba(95,95,95,.22)' : 'rgba(255,255,255,.28)'); gradient.addColorStop(1, 'rgba(219,219,219,0)');
        mossCtx.fillStyle = gradient; mossCtx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
    const mossMap = texture(mossCanvas, true); mossMap.colorSpace = T.SRGBColorSpace;
    const moss = new T.Mesh(T.mergeGeometries(mossParts), new T.MeshStandardMaterial({ vertexColors: true, map: mossMap, bumpMap: mossMap, bumpScale: .012, roughness: 1 }));
    moss.name = 'dry-garden-moss'; moss.castShadow = moss.receiveShadow = true; root.add(moss); mossParts.forEach(g => g.dispose());
  }
  return { root, onHit(hit) {
    if (hit.object === sand || hit.object === gravel || hit.object.name === 'dry-garden-moss' || (hit.object === edging && gravelFaces.some(([a, b]) => hit.faceIndex >= a && hit.faceIndex < b))) return { bulletmark: false, surface: 'soil' };
  }, dispose() { sandGrain.dispose(); } };
};
