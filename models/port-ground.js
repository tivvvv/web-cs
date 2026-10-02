// 货运码头分层地基与护岸, 实体尺寸由场景提供; 标线/磨损/潮湿区域烘焙, 无叠面贴片.
FPS.models.portGround = (T, o = {}) => {
  const root = new T.Group(), parts = [], w = o.width ?? 100, d = o.depth ?? 76;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2048;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(2048, 2048); let seed = 632;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  // 低分辨率静态粗糙度蒙版同时驱动底色, 只在排水沟与落水管附近表现湿润.
  const roughCanvas = document.createElement('canvas'); roughCanvas.width = roughCanvas.height = 512;
  const rc = roughCanvas.getContext('2d'), mask = rc.createImageData(512, 512), damp = new Float32Array(512 * 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const wx = ((x + .5) / 512 - .5) * w, wz = ((y + .5) / 512 - .5) * d; let wet = 0;
    for (const { position: [px, pz], size: [pw, pd], strength = .7 } of o.dampPatches ?? []) {
      const distance = ((wx - px) / (pw / 2)) ** 2 + ((wz - pz) / (pd / 2)) ** 2;
      wet = Math.max(wet, Math.exp(-2.1 * distance) * strength);
    }
    damp[y * 512 + x] = Math.max(0, Math.min(1, wet));
    const v = 245 - damp[y * 512 + x] * 110; mask.data.set([v, v, v, 255], (y * 512 + x) * 4);
  }
  rc.putImageData(mask, 0, 0); const roughness = new T.CanvasTexture(roughCanvas); roughness.anisotropy = 8;
  for (let y = 0; y < 2048; y++) for (let x = 0; x < 2048; x++) {
    const wx = (x / 2048 - .5) * w, wz = (y / 2048 - .5) * d, quay = wz < (o.quayBoundary ?? -16.6);
    const base = quay ? [163, 172, 167] : [106, 116, 116], cloud = Math.sin(wx * .36 + Math.cos(wz * .2)) * Math.sin(wz * .43) * 5;
    const tracks = Math.exp(-(((Math.abs(wx + 39) - 1.3) / .4) ** 2)) * 8, grain = (random() - .5) * 16;
    const wet = damp[(y >> 2) * 512 + (x >> 2)];
    pixels.data.set([...base.map((v, i) => v + cloud + grain - tracks - wet * (i === 0 ? 19 : 15)), 255], (y * 2048 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); ctx.setTransform(2048 / w, 0, 0, 2048 / d, 1024, 1024);
  ctx.strokeStyle = '#3c515544'; ctx.lineWidth = .025;
  for (let x = -w / 2; x < w / 2; x += 5) { ctx.beginPath(); ctx.moveTo(x, -d / 2); ctx.lineTo(x, d / 2); ctx.stroke(); }
  for (let z = -d / 2; z < d / 2; z += 5) { ctx.beginPath(); ctx.moveTo(-w / 2, z); ctx.lineTo(w / 2, z); ctx.stroke(); }
  // 补丁和轮迹来自作业位置, 烘焙在同一地面, 不用悬浮贴片.
  for (const { position: [x, z], size: [pw, pd] } of o.patches ?? []) {
    ctx.fillStyle = '#3e515340'; ctx.beginPath();
    [[-.5, -.45], [.35, -.5], [.5, -.27], [.47, .39], [.13, .5], [-.5, .33]].forEach(([a, b], i) => i ? ctx.lineTo(x + a * pw, z + b * pd) : ctx.moveTo(x + a * pw, z + b * pd)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#bcc0a71f'; ctx.lineWidth = .045; ctx.stroke();
  }
  for (const { points, width = .22, gauge = 1.6 } of o.tracks ?? []) for (const side of [-1, 1]) {
    ctx.strokeStyle = '#293b3a38'; ctx.lineWidth = width; ctx.beginPath();
    points.forEach(([x, z], i) => {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const p = [x - (b[1] - a[1]) / length * gauge / 2 * side, z + (b[0] - a[0]) / length * gauge / 2 * side]; i ? ctx.lineTo(...p) : ctx.moveTo(...p);
    }); ctx.stroke();
  }
  for (const { points, width = .15, color = '#dbc775', closed = false } of o.markings ?? []) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); points.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)); if (closed) ctx.closePath(); ctx.stroke();
  }
  ctx.fillStyle = '#dad3a6'; ctx.font = 'bold 2px sans-serif'; ctx.textAlign = 'center';
  for (const { position: [x, z], label } of o.labels ?? []) ctx.fillText(label, x, z);
  // 漆线边缘的小片磨损与地面同深度, 远处不会产生重叠面闪烁.
  ctx.fillStyle = '#77817b33';
  for (const { points } of o.markings ?? []) for (const [x, z] of points) for (let i = 0; i < 8; i++) ctx.fillRect(x + (random() - .5) * .2, z + (random() - .5) * .3, .018 + random() * .04, .025 + random() * .07);
  ctx.strokeStyle = '#3c464766'; ctx.lineWidth = .02;
  for (let i = 0; i < 42; i++) {
    const x = (random() - .5) * w, z = (random() - .5) * d;
    ctx.beginPath(); ctx.moveTo(x, z); ctx.lineTo(x + .22, z + .28); ctx.lineTo(x + .12, z + .62); ctx.lineTo(x + .43, z + .9); ctx.stroke();
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const detailCanvas = document.createElement('canvas'); detailCanvas.width = detailCanvas.height = 256;
  const dc = detailCanvas.getContext('2d'), grain = dc.createImageData(256, 256);
  for (let i = 0; i < grain.data.length; i += 4) { const v = 196 + random() * 59; grain.data.set([v, v, v, 255], i); }
  dc.putImageData(grain, 0, 0); const detail = new T.CanvasTexture(detailCanvas); detail.wrapS = detail.wrapT = T.RepeatWrapping; detail.anisotropy = 8;
  function finish(g, kind, fixed) {
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, rgb = [];
    for (let i = 0; i < p.count; i++) {
      uv.setXY(i, p.getX(i) / w + .5, .5 - p.getZ(i) / d);
      const up = Math.abs(n.getY(i)) > .5, y = p.getY(i), damp = !up ? .13 * Math.exp(-(((y + 1.65) / .7) ** 2)) : 0;
      const shade = fixed ?? (up ? 1 : (kind === 'wall' ? .94 : .88) - damp);
      rgb.push(shade, shade * (damp ? 1.035 : 1), shade * (damp ? .98 : 1));
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts.push(g);
  }
  for (const { size, offset, kind } of [...(o.slabs ?? [{ size: [w, .6, d], offset: [0, -.3, 0] }]), ...(o.walls ?? [])]) {
    const top = offset[1] + size[1] / 2, insets = (o.insets ?? []).filter(i => Math.abs(i.position[1] - top) < .001 && Math.abs(i.position[0] - offset[0]) + i.size[0] / 2 < size[0] / 2 && Math.abs(i.position[2] - offset[2]) + i.size[1] / 2 < size[2] / 2);
    const source = new T.BoxGeometry(...size, 1, Math.ceil(size[1] / .3), 1), full = source.toNonIndexed(); source.dispose(); full.translate(...offset);
    if (!insets.length) { finish(full, kind); continue; }
    // 从地面顶面挖出排水沟/检修口, 金属格栅嵌入孔内, 不与混凝土共面.
    const side = new T.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const a = full.attributes[name], values = []; for (let i = 0; i < a.count; i++) if (full.attributes.normal.getY(i) < .5) for (let j = 0; j < a.itemSize; j++) values.push(a.array[i * a.itemSize + j]);
      side.setAttribute(name, new T.Float32BufferAttribute(values, a.itemSize));
    }
    finish(side, kind); full.dispose();
    const shape = new T.Shape(), x0 = offset[0] - size[0] / 2, x1 = offset[0] + size[0] / 2, z0 = offset[2] - size[2] / 2, z1 = offset[2] + size[2] / 2;
    shape.moveTo(x0, -z0); shape.lineTo(x1, -z0); shape.lineTo(x1, -z1); shape.lineTo(x0, -z1); shape.closePath();
    for (const { position: [x, , z], size: [iw, id] } of insets) {
      const hole = new T.Path(); hole.moveTo(x - iw / 2, -z + id / 2); hole.lineTo(x - iw / 2, -z - id / 2); hole.lineTo(x + iw / 2, -z - id / 2); hole.lineTo(x + iw / 2, -z + id / 2); hole.closePath(); shape.holes.push(hole);
      finish(new T.BoxGeometry(iw, .04, id).toNonIndexed().translate(x, top - .07, z), kind, .25);
      for (const sign of [-1, 1]) {
        finish(new T.BoxGeometry(.022, .018, id).toNonIndexed().translate(x + sign * (iw / 2 - .011), top - .009, z), kind, .71);
        finish(new T.BoxGeometry(iw - .044, .018, .022).toNonIndexed().translate(x, top - .009, z + sign * (id / 2 - .011)), kind, .71);
      }
      const alongZ = id > iw, length = alongZ ? id : iw, count = Math.ceil(length / .14);
      for (let i = 0; i < count; i++) finish(new T.BoxGeometry(alongZ ? iw - .044 : .035, .018, alongZ ? .035 : id - .044).toNonIndexed().translate(x + (alongZ ? 0 : -iw / 2 + (i + .5) * iw / count), top - .009, z + (alongZ ? -id / 2 + (i + .5) * id / count : 0)), kind, .63);
    }
    const indexed = new T.ShapeGeometry(shape), face = indexed.toNonIndexed(); indexed.dispose(); finish(face.rotateX(-Math.PI / 2).translate(0, top, 0), kind);
  }
  // 岸吊轨道位于低岸平台, 真实窄钢条和固定压板保持低于自动登阶高度.
  for (const { a, b } of o.craneRails ?? []) {
    const length = b[0] - a[0]; finish(new T.BoxGeometry(length, .055, .11).toNonIndexed().translate((a[0] + b[0]) / 2, a[1] + .0275, a[2]), 'wall', .61);
    for (let x = a[0] + .3; x < b[0]; x += .65) finish(new T.BoxGeometry(.1, .015, .25).toNonIndexed().translate(x, a[1] + .0075, a[2]), 'wall', .53);
  }
  const material = new T.MeshStandardMaterial({ map, roughnessMap: roughness, bumpMap: detail, bumpScale: .0035, vertexColors: true, roughness: .95 });
  material.customProgramCacheKey = () => 'port-ground-grain-v3';
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying float vPortGroundUp;\n' + shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vPortGroundUp=max(0.,normal.y); vBumpMapUv=mix(vec2(position.x+position.z,position.y),position.xz,abs(normal.y))/ .85;');
    shader.fragmentShader = 'varying float vPortGroundUp;\n' + shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor=mix(.94,roughnessFactor,vPortGroundUp);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb*=.83+.2*texture2D(bumpMap,vBumpMapUv).r;');
  };
  const mesh = new T.Mesh(T.mergeGeometries(parts), material); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  return { root, dispose() { map.dispose(); detail.dispose(); roughness.dispose(); } };
};
