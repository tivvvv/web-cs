// 可穿行物流仓库, 门洞/夹层出口由场景分段壳体留空; 四面板墙, 屋架与坡屋顶静态合批.
FPS.models.portWarehouse = (T, o = {}) => {
  const root = new T.Group(), w = o.width ?? 24, d = o.depth ?? 18, h = o.height ?? 8, parts = [[], [], [], []];
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 512); let seed = 910;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const seam = x % 64 < 3, grain = (seed / 4294967296 - .5) * 16, value = 236 + grain - (seam ? 33 : 0) + Math.cos(x * Math.PI / 32) * 9;
    pixels.data.set([value, value, value - 3, 255], (y * 512 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
  function add(source, color, batch = 0) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, c = new T.Color(color), rgb = [];
    for (let i = 0; i < p.count; i++) {
      const shade = n.getY(i) < -.5 ? .74 : .88 + .12 * Math.min(1, Math.max(0, p.getY(i) / 1.1));
      rgb.push(c.r * shade, c.g * shade, c.b * shade);
      if (batch === 3) uv.setXY(i, n.getY(i) > .5 ? p.getX(i) / w + .5 : .005, n.getY(i) > .5 ? .5 - p.getZ(i) / d : .005);
      else uv.setXY(i, (Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i)) / 2, (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) / 2);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const box = (s, p, color = 0x99a89c, batch = 0) => add(new T.BoxGeometry(...s).translate(...p), color, batch);
  const shell = o.shell ?? [
    { size: [w, .08, d], offset: [0, 0, 0], kind: 'floor' },
    ...[-1, 1].map(s => ({ size: [.22, h, d], offset: [s * (w / 2 - .11), h / 2, 0], kind: 'wall' })),
    { size: [w, h, .22], offset: [0, h / 2, d / 2 - .11], kind: 'wall' }
  ];
  for (const { size, offset, kind } of shell) {
    box(size, offset, kind === 'floor' ? 0xffffff : kind === 'column' ? 0x4a6567 : 0x9aa89a, kind === 'floor' ? 3 : 0);
    if (kind === 'wall') {
      const front = size[2] < .4, span = front ? size[0] : size[2], sign = Math.sign(front ? offset[2] : offset[0]);
      for (let u = -span / 2 + .25; u < span / 2; u += .42) {
        const p = [...offset]; p[front ? 0 : 2] += u; p[front ? 2 : 0] += sign * (size[front ? 2 : 0] / 2 + .01);
        box([.025, size[1] - .02, .025], p, 0x879c91);
      }
    }
  }
  const { rise = 1.35, overhang = .4, thickness = .12 } = o.roof ?? {};
  const angle = Math.atan2(rise, w / 2), span = w / 2 + overhang, roofLength = span / Math.cos(angle), roofY = h + rise - span * Math.tan(angle) / 2;
  for (const side of [-1, 1]) {
    add(new T.BoxGeometry(roofLength, thickness, d + overhang * 2).rotateZ(-side * angle).translate(side * span / 2, roofY, 0), 0x506a6e, 1);
    for (let z = -d / 2 + .25; z <= d / 2; z += .55)
      add(new T.BoxGeometry(roofLength, .025, .035).rotateZ(-side * angle).translate(side * (span / 2 + Math.sin(angle) * (thickness / 2 + .016)), roofY + Math.cos(angle) * (thickness / 2 + .016), z), 0x728885, 1);
  }
  box([.23, .16, d + .86], [0, h + rise + .07, 0], 0x637d7b, 1);
  for (const side of [-1, 1]) {
    const gable = new T.Shape(); gable.moveTo(-w / 2, h); gable.lineTo(0, h + rise); gable.lineTo(w / 2, h); gable.closePath();
    add(new T.ExtrudeGeometry(gable, { depth: .16, bevelEnabled: false }).translate(0, 0, side * (d / 2 - .08)), 0x899f95);
    box([w + .28, .12, .18], [0, h - .06, side * (d / 2 + .08)], 0x526b6b, 1);
    for (const x of [-w / 2 + .14, w / 2 - .14]) box([.13, h, .13], [x, h / 2, side * (d / 2 + .02)], 0x50666a, 1);
  }
  // 屋架保持真实结构轮廓, 玩家在仓内可看到梁柱, 无额外动态光源.
  for (const z of [-d / 2 + .4, 0, d / 2 - .4]) {
    box([w - .4, .18, .18], [0, h - .22, z], 0x4d686a, 1);
    for (const side of [-1, 1]) add(new T.BoxGeometry(w / 2, .12, .12).rotateZ(-side * angle).translate(side * w / 4, h + rise / 2 - .18, z), 0x536f70, 1);
  }
  for (const side of [-1, 1]) for (const x of [-w * .29, w * .29]) {
    box([3, 1.15, .055], [x, 6.45, side * (d / 2 + .025)], 0x365e68, 2);
    for (const sx of [-1, 1]) box([.065, 1.27, .08], [x + sx * 1.52, 6.45, side * (d / 2 + .06)], 0xc7c7ab, 1);
    for (const y of [5.84, 7.06]) box([3.12, .065, .08], [x, y, side * (d / 2 + .06)], 0xc7c7ab, 1);
    box([.045, 1.15, .08], [x, 6.45, side * (d / 2 + .06)], 0x8faaa4, 1);
  }
  for (const side of [-1, 1]) {
    // 打开的卷帘收在门楣处, 通道中没有透明或隐藏门面.
    add(new T.CylinderGeometry(.16, .16, 7.2, 12).rotateZ(Math.PI / 2).translate(0, 4.4, side * (d / 2 + .09)), 0xaab3a7, 1);
    for (const x of [-3.61, 3.61]) box([.12, 4.2, .18], [x, 2.1, side * (d / 2 + .05)], 0xd9bf74, 1);
    // 门洞外的橡胶防撞垫, 低处收口和檐沟, 四面都有维护构造.
    for (const x of [-3.8, 3.8]) box([.28, .46, .22], [x, .23, side * (d / 2 + .1)], 0x354d45, 1);
    box([w - .15, .09, .18], [0, h - .08, side * (d / 2 + .22)], 0x5c7773, 1);
    for (const x of [-w / 2 + .35, w / 2 - .35]) {
      box([.07, h - .14, .075], [x, (h - .14) / 2, side * (d / 2 + .25)], 0x718880, 1);
      for (const y of [.8, 3.3, 6.3]) box([.15, .06, .11], [x, y, side * (d / 2 + .22)], 0x627b70, 1);
    }
  }
  if (o.canopy) {
    const c = o.canopy, z = -d / 2 - c.depth / 2;
    box([c.width, .14, c.depth + .2], [0, c.height + .05, z], 0x6c8582, 1);
    for (const side of [-1, 1]) {
      const x = side * (c.width / 2 - .18), front = -d / 2 - c.depth + .12;
      box([.13, c.height, .13], [x, c.height / 2, front], 0x536e6b, 1);
      box([.32, .14, .32], [x, .07, front], 0x8e9b89, 1);
      box([.095, .18, c.depth], [x, c.height - .11, z], 0x4c6965, 1);
    }
    for (let x = -c.width / 2 + .2; x < c.width / 2; x += .65) box([.06, .025, c.depth], [x, c.height + .132, z], 0x8b9d8e, 1);
    box([c.width + .08, .16, .1], [0, c.height - .02, -d / 2 - c.depth - .02], 0x546f68, 1);
  }
  box([7.56, 1.02, .14], [0, 5.46, -d / 2 - .1], 0x49636a, 1);
  // 仓内地面独立使用混凝土纹理和作业标线, 不再沿用板墙的竖向波纹.
  const floorCanvas = document.createElement('canvas'); floorCanvas.width = floorCanvas.height = 1024;
  const fc = floorCanvas.getContext('2d'), floorPixels = fc.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const wx = (x / 1024 - .5) * w, z = (y / 1024 - .5) * d;
    const oil = 13 * Math.exp(-((wx - 4) ** 2 / 1.6 + (z + 3.6) ** 2 / 3)), v = 138 + Math.sin(wx * 1.7) * Math.cos(z * .7) * 3 + (seed / 4294967296 - .5) * 17 - oil;
    floorPixels.data.set([v, v + 7, v + 2, 255], (y * 1024 + x) * 4);
  }
  fc.putImageData(floorPixels, 0, 0); fc.setTransform(1024 / w, 0, 0, 1024 / d, 512, 512);
  fc.strokeStyle = '#405b5655'; fc.lineWidth = .018;
  for (let x = -w / 2 + 3; x < w / 2; x += 3) { fc.beginPath(); fc.moveTo(x, -d / 2); fc.lineTo(x, d / 2); fc.stroke(); }
  for (let z = -d / 2 + 3; z < d / 2; z += 3) { fc.beginPath(); fc.moveTo(-w / 2, z); fc.lineTo(w / 2, z); fc.stroke(); }
  fc.strokeStyle = '#c6b570'; fc.lineWidth = .085;
  for (const x of [-1.5, 1.5]) { fc.beginPath(); fc.moveTo(x, -d / 2); fc.lineTo(x, d / 2); fc.stroke(); }
  fc.textAlign = 'center'; fc.font = 'bold .31px monospace'; fc.fillStyle = '#d0cba6'; fc.fillText('KEEP AISLE CLEAR', 0, -6.4);
  for (const { bounds: [x0, z0, x1, z1], label } of o.floorZones ?? []) {
    fc.strokeRect(x0, z0, x1 - x0, z1 - z0); fc.font = 'bold .36px monospace'; fc.fillText(label, (x0 + x1) / 2, z1 + .36);
  }
  const floorMap = new T.CanvasTexture(floorCanvas); floorMap.colorSpace = T.SRGBColorSpace; floorMap.anisotropy = 8;
  const materials = [new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .003, vertexColors: true, roughness: .83, metalness: .12 }),
    new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .002, vertexColors: true, roughness: .65, metalness: .35 }),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .2, metalness: .4 }), new T.MeshStandardMaterial({ map: floorMap, bumpMap: floorMap, bumpScale: .0008, vertexColors: true, roughness: .92 })];
  materials[0].customProgramCacheKey = () => 'port-warehouse-weather-v1';
  materials[0].onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n varying vec3 vWarehousePoint;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vWarehousePoint=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n varying vec3 vWarehousePoint;').replace('#include <map_fragment>', `#include <map_fragment>
      float seam=max(pow(.5+.5*sin(vWarehousePoint.x*15.),18.),pow(.5+.5*sin(vWarehousePoint.z*15.),18.));
      float dirt=exp(-max(0.,vWarehousePoint.y)/.24)*(.08+.13*seam);
      diffuseColor.rgb*=vec3(1.-dirt*.75,1.-dirt,1.-dirt*1.2);`);
  };
  parts.forEach((batch, i) => {
    const mesh = new T.Mesh(T.mergeGeometries(batch), materials[i]); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  });
  const signCanvas = document.createElement('canvas'); signCanvas.width = 1024; signCanvas.height = 128;
  const sc = signCanvas.getContext('2d'); sc.fillStyle = '#294a50'; sc.fillRect(0, 0, 1024, 128); sc.fillStyle = '#e1dbc0'; sc.font = '600 49px sans-serif'; sc.textAlign = 'center'; sc.fillText('湘南物流  /  WAREHOUSE 02', 512, 61); sc.font = '21px monospace'; sc.fillText('CARGO HANDLING  •  KEEP AISLE CLEAR', 512, 104);
  const signMap = new T.CanvasTexture(signCanvas); signMap.colorSpace = T.SRGBColorSpace; signMap.anisotropy = 8;
  const signGeometry = new T.BoxGeometry(7.4, .9, .16), uv = signGeometry.attributes.uv, normals = signGeometry.attributes.normal;
  for (let i = 0; i < uv.count; i++) if (normals.getZ(i) > -.5) uv.setXY(i, .003, .997);
  const sign = new T.Mesh(signGeometry, new T.MeshStandardMaterial({ map: signMap, roughness: .86 }));
  sign.position.set(0, 5.46, -d / 2 - .12); sign.castShadow = sign.receiveShadow = true; root.add(sign);
  return { root, dispose() { map.dispose(); signMap.dispose(); floorMap.dispose(); } };
};
