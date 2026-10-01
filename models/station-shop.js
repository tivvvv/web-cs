// 站前商亭, 正面 +Z; 茶铺/杂货亭有侧窗, 后勤门和排水, 静态合批.
FPS.models.stationShop = (() => {
  let surfaceMap, finishMap;
  return (T, o = {}) => {
    const tea = o.kind !== 'kiosk', w = o.width ?? 7, h = tea ? 3.5 : 3;
    const root = new T.Group(), parts = [], pose = new T.Object3D(), wood = tea ? 0x665344 : 0x67776b;
    const wall = tea ? 0xc6bba0 : 0xb3bbaa;
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

    function add(source, p, color, rotation = [0, 0, 0]) {
      const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
      pose.position.set(...p); pose.rotation.set(...rotation); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
      const c = new T.Color(color), colors = [];
      const finish = color === wall ? 0 : color === wood ? 1 : [0x60796f, 0x344b48, 0x344844].includes(color) ? 2 : [0x677873, 0xbac2b2, 0xa49b78].includes(color) ? 4 : [0x515e5e, 0x74807b, 0x506963].includes(color) ? 5 : 3, uv = g.attributes.uv, vertices = g.attributes.position, n = g.attributes.normal;
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
    const box = (s, p, c, r) => add(new T.BoxGeometry(...s), p, c, r);
    box([w - .6, .16, 3.2], [0, .08, -.15], 0x979a8b);
    box([w - .6, h - .86, 3.2], [0, (h - .86) / 2 + .16, -.15], wall);
    for (const side of [-1, 1]) {
      box([.12, h - .7, .12], [side * (w / 2 - .36), (h - .7) / 2, 1.48], wood);
      for (let i = 0; i < 5; i++) box([.035, .12, 3.14], [side * (w / 2 - .29), .3 + i * .16, -.15], wood);
    }
    if (tea) {
      const gable = new T.Shape(); gable.moveTo(-1.6, 0); gable.lineTo(1.6, 0); gable.lineTo(0, .6); gable.closePath();
      add(new T.ExtrudeGeometry(gable, { depth: w - .6, bevelEnabled: false }), [-(w - .6) / 2, h - .7, 0], 0xb5ad95, [0, Math.PI / 2, 0]);
      for (const side of [-1, 1]) {
        box([w, .12, 2.12], [0, h - .43, side * .93], 0x515e5e, [side * .35, 0, 0]);
        for (let x = -w / 2 + .15; x + .0225 <= w / 2; x += .38) box([.045, .025, 2.12], [x, h - .355, side * .93], 0x74807b, [side * .35, 0, 0]);
      }
      box([w, .13, .17], [0, h - .065, 0], 0x515e5e);
      box([1, 2.1, .04], [-w * .32, 1.13, 1.477], 0x344844);
      for (let i = 0; i < 5; i++) box([.045, 2.1, .045], [-w * .32 - .47 + i * .235, 1.13, 1.514], wood);
      box([.04, .24, .065], [-w * .32 + .32, 1.04, 1.55], 0xa49b78);
    } else {
      // 单坡棚顶下的侧/背墙沿屋面收口, 填上原先檐下悬空的缝隙.
      const top = z => h - .22 - .075 / Math.cos(.07) - z * Math.tan(.07), infill = new T.Shape();
      infill.moveTo(-1.45, h - .7); infill.lineTo(1.75, h - .7); infill.lineTo(1.75, top(-1.75)); infill.lineTo(-1.45, top(1.45)); infill.closePath();
      add(new T.ExtrudeGeometry(infill, { depth: w - .6, bevelEnabled: false }), [-(w - .6) / 2, 0, 0], wall, [0, Math.PI / 2, 0]);
      box([w, .15, 4], [0, h - .22, 0], 0x506963, [.07, 0, 0]);
    }
    const wx = tea ? .75 : 0, ww = tea ? w * .5 : w - .9;
    box([ww, 1.27, .04], [wx, 1.47, 1.477], 0x344b48);
    for (const y of [.82, 1.48, 2.12]) box([ww + .12, .065, .07], [wx, y, 1.52], wood);
    for (let i = 0; i <= 6; i++) box([.045, 1.35, .07], [wx - ww / 2 + i * ww / 6, 1.47, 1.52], wood);
    box([ww + .2, .09, .3], [wx, .8, 1.6], wood);
    if (!tea) for (let i = 0; i < 7; i++) box([.17, .26 + i % 2 * .09, .12], [-1.12 + i * .37, 1.02, 1.53], [0xad9c6a, 0x859578, 0xb48965][i % 3]);
    box([w - .35, .07, .55], [0, 2.3, 1.7], tea ? 0x637765 : 0xb6b39a, [-.12, 0, 0]);
    if (tea) for (let i = 0; i < 5; i++) box([.43, .32, .018], [-.92 + i * .46, 2.105, 1.95], 0x6d806c);
    // 杂货亭檐口较低, 字牌置于屋檐与窗口雨棚之间, 避免上半部穿入斜屋顶.
    const signY = tea ? 2.6 : 2.465, signHeight = tea ? .3 : .2;
    box([w - .65, tea ? .39 : .24, .07], [0, signY, 1.51], wood);
    const windows = o.windows ?? [
      ...[-1, 1].map(side => ({ position: [side * (w / 2 - .3), 1.55, -.3], yaw: side * Math.PI / 2, width: 1.1, height: .95 })),
      ...(tea ? [-1.5, .15] : [-.65]).map(u => ({ position: [u, 1.64, -1.75], yaw: Math.PI, width: tea ? 1.25 : 1, height: .84 }))
    ];
    const facing = (face, size, offset, color) => {
      const [x, y, z] = offset, c = Math.cos(face.yaw), n = Math.sin(face.yaw), p = face.position;
      box(size, [p[0] + x * c + z * n, p[1] + y, p[2] - x * n + z * c], color, [0, face.yaw, 0]);
    };
    for (const f of windows) {
      for (const side of [-1, 1]) facing(f, [.075, f.height + .12, .075], [side * (f.width + .045) / 2, 0, .035], wood);
      for (const side of [-1, 1]) facing(f, [f.width - .03, .075, .075], [0, side * (f.height + .045) / 2, .035], wood);
      facing(f, [f.width - .06, f.height - .06, .025], [0, 0, .03], 0x60796f);
      for (const x of [-f.width / 2, 0, f.width / 2]) facing(f, [.045, f.height + .1, .04], [x, 0, .117], wood);
      for (const y of [-f.height / 2, f.height / 2]) facing(f, [f.width + .15, .055, .045], [0, y, .117], wood);
      facing(f, [f.width + .23, .055, .23], [0, -f.height / 2 - .065, .08], 0x95998b);
    }
    const door = o.door ?? { position: [tea ? w / 2 - 1.3 : .8, 1.16, -1.75], yaw: Math.PI, width: .84, height: 1.95 };
    facing(door, [door.width + .1, door.height + .08, .065], [0, 0, .03], wood);
    facing(door, [door.width - .06, door.height - .08, .025], [0, 0, .08], tea ? 0x887962 : 0x637669);
    for (let i = 0; i < 4; i++) facing(door, [door.width - .15, .012, .012], [0, -.55 + i * .37, .10], wood);
    facing(door, [.035, .16, .035], [door.width * .31, 0, .125], 0xbac2b2);
    const pipeHeight = tea ? h - .96 : h - .34;
    const pipes = o.pipes ?? [-1, 1].map(side => ({ position: [side * (w / 2 - .46), .16 + pipeHeight / 2, -1.815], height: pipeHeight }));
    const gutter = o.gutter ?? { size: [w, .1, .14], position: [0, .16 + pipeHeight, -1.95] };
    box(gutter.size, gutter.position, 0x677873);
    for (const { position: [x, y, z], height: ph } of pipes) {
      add(new T.CylinderGeometry(.0275, .0275, ph, 8), [x, y, z], 0x677873);
      for (const lift of [-ph * .35, ph * .35]) box([.1, .04, .14], [x, y + lift, z], 0x677873);
      box([.08, .06, .23], [x, y + ph / 2 - .03, z - .05], 0x677873);
    }
    const backSkirt = o.backSkirt ?? { size: [w - .72, .62, .055], position: [0, .57, -1.7775] };
    box(backSkirt.size, backSkirt.position, wood);
    const body = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map: surfaceMap, bumpMap: finishMap, bumpScale: .002, roughnessMap: finishMap, metalnessMap: finishMap, vertexColors: true, roughness: 1, metalness: 1 }));
    body.castShadow = body.receiveShadow = true; root.add(body); parts.forEach(g => g.dispose());
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = tea ? '#ddd1ad' : '#ced4bd'; ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = '#354d42'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
    const label = tea ? '海辺茶屋  ·  お茶と甘味' : '駅前商店  ·  飲料 / 雑貨', bounds = ctx.measureText(label);
    ctx.fillText(label, 256, 32 + (bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2);
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
    const sign = new T.Mesh(new T.PlaneGeometry(Math.min(w - .8, 3.8), signHeight), new T.MeshStandardMaterial({ map, roughness: .9 }));
    sign.position.set(0, signY, 1.553); sign.receiveShadow = true; root.add(sign); return { root };
  };
})();
