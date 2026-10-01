// 两层海边住宅, 四面开窗/灰泥, 金属阳台与排水; 正面 +Z, 单网格.
FPS.models.japaneseResidence = (() => {
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

    function add(source, color, p, r = [0, 0, 0]) {
      const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
      pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
      const c = new T.Color(color), colors = [];
      const finish = color === wall ? 0 : color === 0x705e4d ? 1 : color === glass ? 2 : [trim, 0xc7c9ba, 0xc6cabf, 0xbfc6bb].includes(color) ? 4 : 3, uv = g.attributes.uv, vertices = g.attributes.position, n = g.attributes.normal;
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
      g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
    }
    const box = (s, p, c, r) => add(new T.BoxGeometry(...s), c, p, r);
    const wall = o.color ?? 0xdbd7c6, trim = 0x617577, glass = 0x8ca6a2;
    box([6.6, .3, 6.2], [0, .15, 0], 0x9e9d90);
    box([6.4, .35, 6], [0, .475, 0], 0xa8aaa0);
    box([6.4, 2.65, 6], [0, 1.975, 0], wall); box([5.8, 2.75, 5.8], [-.3, 4.675, -.1], wall);
    for (const y of [3.34, 6.12]) box([6.7, .18, 6.35], [0, y, 0], 0x6b7777);
    box([6.6, .13, 6.28], [0, 6.275, 0], 0xb5b7a8);
    // 同一开窗布局供场景生成浅框/雨檐碰撞, 侧窗依上下层退台分别贴墙.
    const windows = o.windows ?? [
      ...[1.85, 4.68].flatMap(y => [-1.85, .85].map(x => ({ position: [x, y, y < 3 ? 3 : 2.8], yaw: 0, width: 1.75, height: 1.5, hoodDepth: .35 }))),
      ...[1.85, 4.68].flatMap(y => [-1, 1].map(side => ({ position: [side < 0 ? -3.2 : y < 3 ? 3.2 : 2.6, y, .65], yaw: side * Math.PI / 2, width: 1.35, height: 1.25, hoodDepth: .22 }))),
      ...[1.85, 4.68].flatMap(y => [-1.8, .85].map(x => ({ position: [x, y, -3], yaw: Math.PI, width: 1.45, height: 1.3, hoodDepth: .22 })))
    ];
    for (const { position: p, yaw, width: w, height: h, hoodDepth } of windows) {
      const facing = (s, offset, color) => {
        const [x, y, z] = offset, c = Math.cos(yaw), n = Math.sin(yaw);
        box(s, [p[0] + x * c + z * n, p[1] + y, p[2] - x * n + z * c], color, [0, yaw, 0]);
      };
      for (const x of [-1, 1]) facing([.07, h, .07], [x * (w - .07) / 2, 0, .05], trim);
      for (const y of [-1, 1]) facing([w - .14, .07, .07], [0, y * (h - .07) / 2, .05], trim);
      facing([w - .14, h - .14, .04], [0, 0, .035], glass);
      facing([.04, h - .08, .04], [0, 0, .14], 0xcad0c3);
      facing([w + .15, .07, hoodDepth], [0, h / 2 + .08, .16], trim);
    }
    const pipes = o.pipes ?? [-2.75, 2.35].map(x => ({ position: [x, 3.2, -3.065], height: 5.8 }));
    for (const { position: [x, y, z], height: h } of pipes) {
      add(new T.CylinderGeometry(.028, .028, h, 8), trim, [x, y, z]);
      for (const lift of [-h * .4, 0, h * .4]) box([.1, .04, .12], [x, y + lift, z], trim);
      box([.1, .09, .16], [x, y + h / 2 - .045, z - .01], trim);
    }
    box([4.9, .16, 1.06], [-.55, 3.48, 3.28], 0xb9b9aa);
    for (const y of [3.68, 4.45]) box([4.9, .055, .055], [-.55, y, 3.79], trim);
    for (let i = 0; i < 15; i++) box([.035, .8, .04], [-2.94 + i * .34, 4.06, 3.79], trim);
    for (const side of [-1, 1]) box([.055, .82, .96], [-.55 + side * 2.42, 4.06, 3.29], trim);
    box([.82, 2.1, .08], [2.48, 1.35, 3.05], 0x705e4d);
    box([.045, .24, .05], [2.19, 1.34, 3.12], 0xc6cabf);
    box([1.15, .13, .85], [2.45, .065, 3.38], 0xb6b4a1);
    // 壁挂信箱正面朝 +X, 薄箱体贴侧墙; 门缝和标识错开表面, 避免闪烁.
    box([.15, .38, .36], [3.27, 1.2, 2.65], 0x516964);
    box([.18, .025, .39], [3.285, 1.398, 2.65], 0x445b52);
    box([.006, .02, .264], [3.35, 1.333, 2.65], 0x303e38);
    box([.03, .016, .288], [3.36, 1.351, 2.65], 0x789083);
    box([.006, .23, .3], [3.35, 1.145, 2.65], 0x303e38);
    box([.006, .208, .276], [3.356, 1.145, 2.65], 0x698173);
    for (const y of [1.195, 1.17]) box([.006, .009, .09], [3.364, y, 2.65], 0xe5dfc9);
    box([.006, .031, .01], [3.364, 1.155, 2.65], 0xe5dfc9);
    box([.018, .039, .01], [3.37, 1.075, 2.74], 0xbfc6bb);
    for (const y of [.75, 3.95]) {
      box([.42, .61, .93], [-3.36, y, -.8], 0xc7c9ba);
      for (let i = 0; i < 6; i++) box([.03, .034, .77], [-3.59, y - .22 + i * .088, -.8], 0x7a8985);
      box([.055, 1.9, .055], [-3.25, y + .7, -.25], 0xd4d3c1);
    }
    const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map: surfaceMap, bumpMap: finishMap, bumpScale: .002, roughnessMap: finishMap, metalnessMap: finishMap, vertexColors: true, roughness: 1, metalness: 1 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
  };
})();
