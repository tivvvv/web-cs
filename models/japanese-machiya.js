// 两层町屋, 四面木构/灰泥, 店檐与后勤开窗. 正面 +Z, 单网格.
FPS.models.japaneseMachiya = (() => {
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
      const finish = color === wall ? 0 : color === wood ? 1 : [0x708681, 0x72857d].includes(color) ? 2 : color === 0xb7b9a1 ? 6 : [tile, 0x6e7774].includes(color) ? 5 : color === 0xa6afa1 ? 4 : 3, uv = flat.attributes.uv, vertices = flat.attributes.position, n = flat.attributes.normal;
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
    const wall = o.color ?? 0xc9c5ac, wood = 0x4e453b, tile = 0x4a5559;
    box([5.9, .26, 6.5], [0, .13, 0], 0x95978c); box([5.7, 5.55, 6.2], [0, 3.035, 0], wall);
    const gable = new T.Shape(); gable.moveTo(-2.85, 0); gable.lineTo(2.85, 0); gable.lineTo(0, 1.18); gable.closePath();
    add(new T.ExtrudeGeometry(gable, { depth: 6.2, bevelEnabled: false }), wall, [0, 5.81, -3.1]);
    for (const side of [-1, 1]) {
      box([3.53, .18, 7], [side * 1.56, 6.365, 0], tile, [0, 0, -side * .393]);
      for (let i = 0; i < 17; i++) add(new T.CylinderGeometry(.031, .031, 3.53, 6, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), 0x6e7774, [side * 1.56, 6.449, -3.35 + i * .42], [0, 0, -side * .393]);
      window([side * 2.85, 4.45, -.5], side * Math.PI / 2, 1.5, 1.3);
      window([side * 2.85, 1.75, -.5], side * Math.PI / 2, 1.05, .92);
      box([.08, .09, 6.8], [side * 3.13, 5.74, 0], tile);
      box([.31, .06, .07], [side * 3.025, 5.74, -3.2], tile);
      add(new T.CylinderGeometry(.03, .03, 5.4, 8), tile, [side * 2.9, 3.01, -3.2]);
      for (const y of [.66, 3.12, 5.38]) box([.1, .045, .25], [side * 2.9, y, -3.1], tile);
    }
    add(new T.CylinderGeometry(.095, .095, 7.1, 10).rotateX(Math.PI / 2), tile, [0, 7.045, 0]);
    for (const y of [.42, 3.05, 5.72]) box([5.77, .16, 6.26], [0, y, 0], wood);
    for (const x of [-2.78, 0, 2.78]) box([.13, 5.5, .16], [x, 3.05, 3.16], wood);
    for (const x of [-1.4, 1.4]) {
      box([2.35, 1.52, .06], [x, 4.5, 3.15], 0x72857d);
      for (let i = 0; i < 8; i++) box([.055, 1.59, .065], [x - 1.12 + i * .32, 4.5, 3.21], wood);
      for (const y of [3.72, 4.52, 5.28]) box([2.4, .05, .07], [x, y, 3.21], wood);
      box([2.35, 2.05, .07], [x, 1.43, 3.15], 0xb7b9a1);
      for (let i = 0; i < 8; i++) box([.043, 2.08, .05], [x - 1.12 + i * .32, 1.43, 3.22], wood);
    }
    box([6.1, .14, 1.1], [0, 2.94, 3.48], tile, [.18, 0, 0]);
    for (let i = 0; i < 4; i++) box([.52, .53, .025], [-.81 + i * .54, 2.18, 3.31], 0x486e69);
    box([1.4, .13, .5], [0, .065, 3.45], 0xb0ab98);
    for (const x of [-2.78, 0, 2.78]) box([.13, 5.5, .1], [x, 3.05, -3.14], wood);
    box([5.6, .66, .055], [0, .75, -3.12], wood);
    for (const x of [-1.36, 1.36]) window([x, 4.48, -3.1], Math.PI, 1.55, 1.28);
    window([-1.3, 1.86, -3.1], Math.PI, 1.3, .93);
    box([.86, 1.91, .07], [1.32, 1.235, -3.14], wood);
    for (let i = 0; i < 5; i++) box([.016, 1.8, .015], [.99 + i * .165, 1.24, -3.183], 0x726354);
    box([.045, .14, .035], [.99, 1.24, -3.198], 0xa6afa1);
    box([.58, .22, .04], [0, 6.24, -3.145], 0x344540);
    for (let i = 0; i < 3; i++) box([.62, .025, .045], [0, 6.165 + i * .075, -3.178], wood);
    function window(p, yaw, width, height) {
      const facing = (s, offset, color) => {
        const [x, y, z] = offset, c = Math.cos(yaw), n = Math.sin(yaw);
        box(s, [p[0] + x * c + z * n, p[1] + y, p[2] - x * n + z * c], color, [0, yaw, 0]);
      };
      for (const side of [-1, 1]) facing([.075, height + .12, .075], [side * (width + .045) / 2, 0, .035], wood);
      for (const side of [-1, 1]) facing([width - .03, .075, .075], [0, side * (height + .045) / 2, .035], wood);
      facing([width - .06, height - .06, .025], [0, 0, .03], 0x708681);
      for (let i = 0; i <= 4; i++) facing([.043, height + .08, .04], [-width / 2 + i * width / 4, 0, .117], wood);
      for (const y of [-height / 2, height / 2]) facing([width + .15, .055, .045], [0, y, .117], wood);
      facing([width + .23, .055, .23], [0, -height / 2 - .065, .08], 0x95998b);
    }
    const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map: surfaceMap, bumpMap: finishMap, bumpScale: .002, roughnessMap: finishMap, metalnessMap: finishMap, vertexColors: true, roughness: 1, metalness: 1 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
  };
})();
