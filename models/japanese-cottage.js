// 平层瓦顶民居, 四面灰泥/木腰墙, 格窗与排水; 正面 +Z, 单网格.
FPS.models.japaneseCottage = (() => {
  let surfaceMap, finishMap;
  return (T, o = {}) => {
    const root = new T.Group(), parts = [], pose = new T.Object3D();
    // 色图与材质图同坐标: 灰泥/木材/窗内/石面/金属/瓦面/纸窗/百叶.
    // 材质图 R 为凹凸, G 为粗糙度, B 为金属度; 模型内部缓存, 无跨模型引用.
    if (!surfaceMap) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024;
      const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 1024), finishCanvas = canvas.cloneNode();
      const finishCtx = finishCanvas.getContext('2d'), finishes = finishCtx.createImageData(512, 1024); let seed = 319;
      const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (let y = 0; y < 1024; y++) for (let x = 0; x < 512; x++) {
        const slot = Math.floor(x / 256) + Math.floor(y / 256) * 2, u = x % 256, v = y % 256, noise = rand() - .5;
        const fiber = Math.sin(u * .9 + Math.sin(v * .03) * 2) * 8 + Math.sin(u * .13 + Math.sin(v * .018)) * 7;
        let value = 242 + noise * 14, rgb, height = 128 + noise * 18, rough = .91, metal = 0;
        if (slot === 1) { value = 229 + fiber + noise * 10; height += fiber * 1.8; rough = .79; }
        if (slot === 2) {
          const curtain = u < 58 || u > 206, fold = Math.cos(u * .27) * 17;
          rgb = curtain ? [158 + fold, 153 + fold, 133 + fold] : [34 + v * .1, 41 + v * .1, 39 + v * .08];
          height = 128; rough = curtain ? .38 : .16;
        }
        if (slot === 3) { value = 230 + Math.sin(u * .035) * Math.sin(v * .047) * 9 + noise * 30; height += noise * 30; }
        if (slot === 4) { value = 246 + noise * 8; height = 128 + noise * 2; rough = .36; metal = .62; }
        if (slot === 5) {
          const seam = v % 52 < 3, curve = Math.cos(u / 256 * Math.PI * 12) * 10;
          value = (seam ? 175 : 234 + curve) + noise * 11; height = seam ? 85 : 138 + curve * 1.8; rough = .76;
        }
        if (slot === 6) { const rib = u % 63 < 3 || v % 85 < 3; rgb = rib ? [94, 88, 75] : [222 + noise * 8, 217 + noise * 8, 199 + noise * 8]; height = 128; rough = .88; }
        if (slot === 7) { const blind = v % 21 < 3; rgb = blind ? [86, 89, 78] : [151 + noise * 6, 151 + noise * 6, 132 + noise * 6]; height = 128; rough = .25; }
        pixels.data.set([...(rgb || [value, value, value]), 255], (y * 512 + x) * 4);
        finishes.data.set([height, rough * 255, metal * 255, 255], (y * 512 + x) * 4);
      }
      ctx.putImageData(pixels, 0, 0); finishCtx.putImageData(finishes, 0, 0);
      surfaceMap = new T.CanvasTexture(canvas); surfaceMap.colorSpace = T.SRGBColorSpace; surfaceMap.anisotropy = 8;
      finishMap = new T.CanvasTexture(finishCanvas); finishMap.anisotropy = 8;
    }

    function add(g, color, p, r = [0, 0, 0]) {
      const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose();
      pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
      const c = new T.Color(color), colors = [];
      const finish = color === wall ? 0 : color === wood ? 1 : color === 0x657c7b ? 2 : color === 0xc5cec0 ? 6 : [tile, 0x77807e].includes(color) ? 5 : color === 0xc6cabf ? 4 : 3, uv = flat.attributes.uv, vertices = flat.attributes.position, n = flat.attributes.normal;
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (let i = 0; i < vertices.count; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
      for (let i = 0; i < vertices.count; i++) {
        const shade = finish === 0 ? .97 - Math.max(0, Math.min(1, (.75 - vertices.getY(i)) / .75)) * .12 : n.getY(i) < -.5 ? .78 : 1;
        if (finish === 2 || finish === 6) c.set(0xffffff);
        colors.push(c.r * shade, c.g * shade, c.b * shade);
        const u = (uv.getX(i) - u0) / (u1 - u0 || 1), v = (uv.getY(i) - v0) / (v1 - v0 || 1);
        const slot = finish === 2 && Math.sin(p[0] * 7 + p[1] * 5 + (o.seed ?? 0)) > .25 ? 7 : finish;
        uv.setXY(i, slot % 2 * .5 + .008 + .484 * u, 1 - Math.floor(slot / 2) * .25 - .004 - .242 * (1 - v));
      }
      flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
    }
    const box = (s, p, c, r) => add(new T.BoxGeometry(...s), c, p, r);
    const wall = o.color ?? 0xd0c6ac, wood = 0x645449, tile = 0x566266;
    box([6.2, .3, 6.2], [0, .15, 0], 0x98998b); box([6, 2.75, 6], [0, 1.675, 0], wall);
    const gable = new T.Shape(); gable.moveTo(-3, 0); gable.lineTo(3, 0); gable.lineTo(0, 1.35); gable.closePath();
    add(new T.ExtrudeGeometry(gable, { depth: 6, bevelEnabled: false }), wall, [0, 3.05, -3]);
    for (const side of [-1, 1]) {
      box([3.73, .17, 6.9], [side * 1.65, 3.66, 0], tile, [0, 0, -side * .424]);
      for (let i = 0; i < 18; i++) add(new T.CylinderGeometry(.034, .034, 3.73, 6, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), 0x77807e, [side * 1.65, 3.738, -3.3 + i * .39], [0, 0, -side * .424]);
      box([.12, 2.8, .13], [side * 2.87, 1.7, 3.06], wood);
      box([.06, .5, 5.85], [side * 3.025, .7, 0], wood);
      window([side * 3, 1.8, -.4], side * Math.PI / 2, 1.7, 1.1);
      // 檐沟与后角落水管留在原房屋碰撞包围内, 支架连接墙面而非悬空.
      box([.13, .09, 6.75], [side * 3.32, 2.81, 0], tile);
      box([.42, .06, .07], [side * 3.13, 2.81, -3.17], tile);
      add(new T.CylinderGeometry(.028, .028, 2.5, 8), tile, [side * 2.94, 1.56, -3.17]);
      for (const y of [.62, 2.34]) box([.09, .045, .24], [side * 2.94, y, -3.08], tile);
    }
    add(new T.CylinderGeometry(.105, .105, 7, 10).rotateX(Math.PI / 2), tile, [0, 4.445, 0]);
    box([5.5, .23, .85], [0, .415, 3.28], wood);
    for (const x of [-1.55, 0, 1.55]) {
      box([1.35, 1.95, .065], [x, 1.61, 3.045], 0xc5cec0);
      for (let i = 0; i < 5; i++) box([.036, 1.98, .045], [x - .62 + i * .31, 1.61, 3.095], wood);
      for (const y of [.82, 1.6, 2.38]) box([1.38, .038, .045], [x, y, 3.095], wood);
    }
    box([1.4, .16, .38], [0, .08, 3.88], 0xa5a392);
    // 后墙为生活空间的小窗, 木腰墙和阁楼通气口, 与正面拉门的用途/比例区分.
    box([5.85, .5, .06], [0, .7, -3.025], wood);
    for (const x of [-1.42, 1.42]) window([x, 1.85, -3], Math.PI, 1.15, 1.08);
    box([.62, .27, .04], [0, 3.53, -3.045], 0x354541);
    for (let i = 0; i < 4; i++) box([.65, .028, .045], [0, 3.425 + i * .07, -3.075], wood);
    box([5.85, .1, .08], [0, 3.05, -3.035], wood);
    function window(p, yaw, width, height) {
      const facing = (s, offset, color) => {
        const [x, y, z] = offset, c = Math.cos(yaw), n = Math.sin(yaw);
        box(s, [p[0] + x * c + z * n, p[1] + y, p[2] - x * n + z * c], color, [0, yaw, 0]);
      };
      for (const side of [-1, 1]) facing([.075, height + .12, .075], [side * (width + .045) / 2, 0, .035], wood);
      for (const side of [-1, 1]) facing([width - .03, .075, .075], [0, side * (height + .045) / 2, .035], wood);
      facing([width - .06, height - .06, .025], [0, 0, .03], 0x657c7b);
      for (const x of [-width / 2, 0, width / 2]) facing([.045, height + .1, .04], [x, 0, .117], wood);
      for (const y of [-height / 2, height / 2]) facing([width + .15, .055, .045], [0, y, .117], wood);
      facing([width + .23, .055, .23], [0, -height / 2 - .065, .08], 0x95998b);
    }
    const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map: surfaceMap, bumpMap: finishMap, bumpScale: .002, roughnessMap: finishMap, metalnessMap: finishMap, vertexColors: true, roughness: 1, metalness: 1 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
  };
})();
