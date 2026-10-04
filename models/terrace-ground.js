// 铺地台地与街面. 顶面道路烘焙到世界纹理, 侧面石砌独立取样, 无共面路面贴片.
FPS.models.terraceGround = (T, o = {}) => {
  const root = new T.Group(), parts = [[], []], bounds = o.bounds ?? [-50, -38, 50, 38];
  const [x0, z0, x1, z1] = bounds, w = x1 - x0, d = z1 - z0;
  function surfaceAt(x, z) {
    for (let i = (o.surfaces?.length ?? 0) - 1; i >= 0; i--) { const s = o.surfaces[i], [sx, sz, sw, sd] = s.rect; if (x >= sx && x <= sx + sw && z >= sz && z <= sz + sd) return s.kind; }
  }
  let seed = 7231;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2048;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(2048, 2048);
  for (let y = 0; y < 2048; y++) for (let x = 0; x < 2048; x++) {
    const v = 158 + (rand() - .5) * 17 + Math.sin(x * .012) * Math.cos(y * .017) * 3;
    pixels.data.set([v + 7, v + 5, v - 5, 255], (y * 2048 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); ctx.setTransform(2048 / w, 0, 0, 2048 / d, -x0 * 2048 / w, -z0 * 2048 / d);
  for (const { rect: [x, z, width, depth], kind = 'stone' } of o.surfaces ?? []) {
    ctx.fillStyle = kind === 'asphalt' ? '#626c69' : kind === 'soil' ? '#768363' : '#aba89a'; ctx.fillRect(x, z, width, depth);
    if (kind === 'soil') {
      for (let i = 0; i < width * depth * 9; i++) {
        ctx.fillStyle = rand() > .5 ? '#5a6e4b44' : '#afa18044'; ctx.fillRect(x + rand() * width, z + rand() * depth, .13, .08);
      }
    } else if (kind === 'stone') {
      for (let row = 0; row < depth / .72; row++) for (let col = 0; col < width / 1.08 + 1; col++) {
        const bx = x + col * 1.08 - (row % 2) * .54, bz = z + row * .72, left = Math.max(x, bx), right = Math.min(x + width, bx + 1.08);
        if (right <= left) continue;
        const v = 159 + rand() * 24; ctx.fillStyle = `rgb(${v + 7},${v + 5},${v - 5})`; ctx.fillRect(left + .018, bz + .018, Math.max(.001, right - left - .036), Math.min(.684, z + depth - bz - .018));
      }
    } else {
      ctx.strokeStyle = '#d0c8a0'; ctx.lineWidth = .09;
      for (const sx of [x + .35, x + width - .35]) { ctx.beginPath(); ctx.moveTo(sx, z); ctx.lineTo(sx, z + depth); ctx.stroke(); }
      ctx.strokeStyle = '#444f4955'; ctx.lineWidth = .035;
      for (let i = 0; i < depth / 5; i++) {
        const bz = z + rand() * depth; ctx.beginPath(); ctx.moveTo(x + .5, bz); ctx.lineTo(x + width * .4, bz + .12); ctx.lineTo(x + width * .7, bz - .2); ctx.stroke();
      }
    }
  }
  for (const mark of o.markings ?? []) {
    ctx.strokeStyle = mark.color ?? '#d6cfb4'; ctx.lineWidth = mark.width ?? .14; ctx.beginPath();
    mark.points.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)); ctx.stroke();
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
  const stoneCanvas = document.createElement('canvas'); stoneCanvas.width = stoneCanvas.height = 256;
  const sc = stoneCanvas.getContext('2d'), stonePixels = sc.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const row = Math.floor(y / 64), seam = y % 64 < 3 || (x + row % 2 * 64) % 128 < 3;
    const v = (seam ? 145 : 224 + Math.sin(x * .073) * Math.sin(y * .057) * 9) + (rand() - .5) * 23;
    stonePixels.data.set([v, v, v - 4, 255], (y * 256 + x) * 4);
  }
  sc.putImageData(stonePixels, 0, 0);
  const stone = new T.CanvasTexture(stoneCanvas); stone.colorSpace = T.SRGBColorSpace; stone.wrapS = stone.wrapT = T.RepeatWrapping; stone.anisotropy = 8;
  const gritCanvas = document.createElement('canvas'); gritCanvas.width = gritCanvas.height = 256;
  const gritContext = gritCanvas.getContext('2d'), gritPixels = gritContext.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) { const value = 128 + (rand() - .5) * 74; gritPixels.data.set([value, value, value, 255], i * 4); }
  gritContext.putImageData(gritPixels, 0, 0); const grit = new T.CanvasTexture(gritCanvas); grit.wrapS = grit.wrapT = T.RepeatWrapping; grit.repeat.set(w / 2, d / 2); grit.anisotropy = 8;
  function add(spec) {
    const source = new T.BoxGeometry(...spec.size), geometry = source.toNonIndexed(); source.dispose(); geometry.translate(...spec.offset);
    const attributes = [[], []], pos = geometry.attributes.position, normals = geometry.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const top = normals.getY(i) > .5, point = [pos.getX(i), pos.getY(i), pos.getZ(i)], n = [normals.getX(i), normals.getY(i), normals.getZ(i)];
      const color = new T.Color(top ? 0xffffff : spec.color ?? 0x979d89), uv = top ? [(point[0] - x0) / w, 1 - (point[2] - z0) / d] : [Math.abs(n[0]) > .5 ? point[2] / 2 : point[0] / 2, point[1] / 2];
      attributes[top ? 0 : 1].push(...point, ...n, ...uv, color.r, color.g, color.b);
    }
    attributes.forEach((values, batch) => {
      const p = [], n = [], uv = [], c = [];
      for (let i = 0; i < values.length; i += 11) { p.push(...values.slice(i, i + 3)); n.push(...values.slice(i + 3, i + 6)); uv.push(...values.slice(i + 6, i + 8)); c.push(...values.slice(i + 8, i + 11)); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(n, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); parts[batch].push(g);
    }); geometry.dispose();
  }
  (o.slabs ?? [{ size: [100, 3, 76], offset: [0, .9, 0] }]).forEach(add);
  (o.walls ?? []).forEach(add);
  const materials = [new T.MeshStandardMaterial({ map, bumpMap: grit, bumpScale: .0014, vertexColors: true, roughness: .94 }),
    new T.MeshStandardMaterial({ map: stone, bumpMap: stone, bumpScale: .012, vertexColors: true, roughness: .93 })];
  parts.forEach((batch, i) => { if (!batch.length) return; const mesh = new T.Mesh(T.mergeGeometries(batch), materials[i]); mesh.name = i ? 'mountain-retaining-stone' : 'mountain-street-surface'; mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose()); });
  // 土带只增加一个短草实例批次, 避让后绘制的铺地; 不增加身体碰撞或逐帧更新.
  const points = [];
  for (const s of o.surfaces ?? []) {
    if (s.kind !== 'soil') continue; const [x, z, width, depth] = s.rect;
    for (let i = 0; i < width * depth * 10; i++) {
      const px = x + rand() * width, pz = z + rand() * depth;
      if (surfaceAt(px, pz) !== 'soil') continue;
      let y = -Infinity;
      for (const b of o.slabs ?? []) if (Math.abs(px - b.offset[0]) < b.size[0] / 2 && Math.abs(pz - b.offset[2]) < b.size[2] / 2) y = Math.max(y, b.offset[1] + b.size[1] / 2);
      if (Number.isFinite(y)) points.push([px, y, pz]);
    }
  }
  if (points.length) {
    const values = [];
    for (let i = 0; i < 3; i++) {
      const angle = i * 2.4, at = (t, side) => [Math.sin(angle) * .2 * t * t + Math.cos(angle) * .03 * (1 - t) * side, t, Math.cos(angle) * .2 * t * t - Math.sin(angle) * .03 * (1 - t) * side];
      for (let j = 0; j < 2; j++) { const a = j / 2, b = (j + 1) / 2; values.push(...at(a, -1), ...at(a, 1), ...at(b, 1), ...at(a, -1), ...at(b, 1), ...at(b, -1)); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(values, 3)); g.computeVertexNormals();
    const grass = new T.InstancedMesh(g, new T.MeshStandardMaterial({ roughness: 1, side: T.DoubleSide }), points.length), pose = new T.Object3D(), tint = new T.Color();
    points.forEach((p, i) => { pose.position.set(...p); pose.rotation.set(0, rand() * Math.PI * 2, 0); pose.scale.setScalar(.07 + rand() * .1); pose.updateMatrix(); grass.setMatrixAt(i, pose.matrix); tint.setHSL(.24 + rand() * .04, .22 + rand() * .12, .2 + rand() * .06); grass.setColorAt(i, tint); });
    grass.name = 'mountain-short-grass'; grass.receiveShadow = true; grass.raycast = () => {}; root.add(grass);
  }
  return { root, onHit(hit) {
    if (hit.object.name !== 'mountain-street-surface' || hit.face.normal.y < .5) return;
    const p = root.worldToLocal(hit.point.clone());
    if (surfaceAt(p.x, p.z) === 'soil') return { bulletmark: false, surface: 'soil' };
  }, dispose() { map.dispose(); stone.dispose(); grit.dispose(); } };
};
