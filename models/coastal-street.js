// 海边街道设施. 同文件提供路栏, 站外导向牌和石墙变体.
FPS.models.coastalStreet = (() => {
  let masonryMap, masonryHeight;
  return (T, options = {}) => {
    const root = new T.Group(), parts = new Map();
    const mat = (color, roughness = .8, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
    const iron = mat(0xa4b1ae, .4, .65), green = mat(0x397266, .6, .3), stone = mat(0x727d75);
    const cream = mat(0xd7cdb2);
    function add(g, m, p, r = [0, 0, 0]) {
      const mesh = new T.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...r); mesh.updateMatrix();
      g.applyMatrix4(mesh.matrix);
      if (m === stone && options.kind === 'wall') {
        const v = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, colors = [];
        for (let i = 0; i < v.count; i++) {
          const y = v.getY(i), fade = 1 - .19 * Math.exp(-y * 5);
          uv.setXY(i, (Math.abs(n.getZ(i)) > .5 ? v.getX(i) : v.getZ(i)) / 2.82, y / 1.84);
          colors.push(fade, fade * .99, fade * .95);
        }
        g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      }
      if (!parts.has(m)) parts.set(m, []); parts.get(m).push(g);
    }
    const box = (s, p, m, r) => add(new T.BoxGeometry(...s), m, p, r);
    function cylinder(radius, height, p, m, r) { add(new T.CylinderGeometry(radius, radius, height, 12), m, p, r); }
    if (options.kind === 'railing') {
      const length = options.length ?? 30;
      for (let x = -length / 2; x <= length / 2; x += 2) {
        cylinder(.055, 1.14, [x, .57, 0], iron); box([.19, .16, .19], [x, .08, 0], cream);
        add(new T.SphereGeometry(.063, 8, 6), iron, [x, 1.15, 0]);
      }
      for (const y of [.42, .78, 1.1]) cylinder(.027, length, [0, y, 0], iron, [0, 0, Math.PI / 2]);
    } else if (options.kind === 'sign') {
      for (const x of [-.83, .83]) cylinder(.047, 2.72, [x, 1.36, 0], iron);
      box([1.85, 1.31, .09], [0, 1.98, 0], green);
      const c = document.createElement('canvas'); c.width = 1024; c.height = 768; const ctx = c.getContext('2d');
      ctx.fillStyle = '#ebe8d8'; ctx.fillRect(0, 0, 1024, 768); ctx.fillStyle = '#31594f'; ctx.textAlign = 'center';
      ctx.font = '40px sans-serif'; ctx.fillText('江ノ島電鉄     EN08', 512, 100);
      ctx.font = '600 115px sans-serif'; ctx.fillText('鎌倉高校前', 512, 272);
      ctx.font = '37px sans-serif'; ctx.fillText('KAMAKURAKŌKŌMAE', 512, 357);
      ctx.fillStyle = '#276959'; ctx.fillRect(0, 430, 1024, 238); ctx.fillStyle = '#f0efdf';
      ctx.font = '59px sans-serif'; ctx.fillText('駅入口   ←', 512, 574); ctx.font = '28px sans-serif'; ctx.fillStyle = '#54665a'; ctx.fillText('海と暮らす街   /   KAMAKURA', 512, 733);
      const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace;
      add(new T.PlaneGeometry(1.72, 1.22), new T.MeshStandardMaterial({ map, roughness: .7 }), [0, 1.98, .052]);
    } else if (options.kind === 'wall') {
      const length = options.length ?? 20, height = options.height ?? 1.4;
      if (!masonryMap) {
        const c = document.createElement('canvas'); c.width = c.height = 512;
        const ctx = c.getContext('2d'), color = ctx.createImageData(512, 512), relief = ctx.createImageData(512, 512); let seed = 61;
        for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          const row = Math.floor(y / 64), u = (x + (row % 2) * 512 / 12) % (512 / 6), v = y % 64;
          const edge = Math.min(u, 512 / 6 - u, v, 64 - v), joint = edge < 1.5, grain = (seed / 4294967296 - .5) * 19;
          const piece = Math.sin(Math.floor((x + (row % 2) * 512 / 12) / (512 / 6)) * 1.0472 + row * Math.PI / 4) * 10;
          const value = (joint ? 157 : 228 + piece) + grain, h = joint ? 67 : 186 - Math.max(0, 3 - edge) * 12 + grain * .3;
          color.data.set([value, value, value, 255], (y * 512 + x) * 4); relief.data.set([h, h, h, 255], (y * 512 + x) * 4);
        }
        ctx.putImageData(color, 0, 0); masonryMap = new T.CanvasTexture(c); masonryMap.colorSpace = T.SRGBColorSpace;
        const b = c.cloneNode(); b.getContext('2d').putImageData(relief, 0, 0); masonryHeight = new T.CanvasTexture(b);
        for (const map of [masonryMap, masonryHeight]) { map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8; }
      }
      stone.map = masonryMap; stone.bumpMap = masonryHeight; stone.bumpScale = .004; stone.vertexColors = true; stone.roughness = .96; stone.color.set(0x8d9388);
      // 砖缝烘焙在米制贴图中, 整段墙保留实体厚度, 无数百个独立砖盒.
      box([.47, height, length], [0, height / 2, 0], stone);
      box([.54, .10, length + .1], [0, height, 0], cream);
    }
    for (const [m, geometries] of parts) {
      const flat = geometries.map(g => { if (!g.index) return g; const f = g.toNonIndexed(); g.dispose(); return f; });
      const mesh = new T.Mesh(T.mergeGeometries(flat), m);
      mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); flat.forEach(g => g.dispose());
    }
    return { root };
  };
})();
