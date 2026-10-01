// 紧凑宅院: 砂砾踏石, 土边与细叶灌木. 正面 +Z, 外尺寸 8 x 8.6 米.
FPS.models.japaneseYard = (() => {
  const groundMaps = new Map(); let leafGeometry, leafMaterial;
  return (T, o = {}) => {
    const root = new T.Group(), parts = [], pose = new T.Object3D(); let seed = o.seed ?? 73;
    const softFaces = []; let faceCount = 0;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const foundation = o.foundation ?? [6.2, 6.2], key = foundation.join(',');
    if (!groundMaps.has(key)) {
      const c = document.createElement('canvas'); c.width = c.height = 1024;
      const ctx = c.getContext('2d'), pixels = ctx.createImageData(1024, 1024); let noiseSeed = 37;
      const noise = () => ((noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
        const wx = x / 1024 * 8 - 4, wz = y / 1008 * 8.6 - 4.3;
        const distance = Math.max(Math.abs(wx) - foundation[0] / 2, Math.abs(wz) - foundation[1] / 2, 0);
        const rim = Math.min(4 - Math.abs(wx), 4.3 - Math.abs(wz)), worn = Math.exp(-distance * 7) * .1;
        const value = y >= 1008 ? 255 : 234 - worn * 255 - Math.exp(-Math.max(0, rim) * 13) * 15 + (noise() - .5) * 28;
        pixels.data.set([value, value, value, 255], (y * 1024 + x) * 4);
      }
      ctx.putImageData(pixels, 0, 0);
      // 砂粒与墙脚排水痕迹烘焙在原地面, 不叠加近平面贴片.
      for (let i = 0; i < 16000; i++) {
        const x = noise() * 1024, y = noise() * 1008, r = .5 + noise() * 1.3, shade = 190 + noise() * 61;
        ctx.fillStyle = 'rgb(' + shade + ',' + shade + ',' + shade + ')'; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, noise() * Math.PI, 0, Math.PI * 2); ctx.fill();
      }
      for (const side of [-1, 1]) {
        const x = (side * 2.94 / 8 + .5) * 1024, y = (-3.17 / 8.6 + .5) * 1008;
        const drip = ctx.createRadialGradient(x, y, 0, x, y, 52); drip.addColorStop(0, 'rgba(75,71,56,.18)'); drip.addColorStop(1, 'rgba(75,71,56,0)'); ctx.fillStyle = drip; ctx.fillRect(x - 52, y - 52, 104, 104);
      }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 1008, 1024, 16);
      const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8; groundMaps.set(key, map);
    }
    const groundMap = groundMaps.get(key);
    if (!leafGeometry) {
      // 实体曲叶无透明叠层, 800 片按实例化绘制, 全部院落共用几何/材质.
      leafGeometry = new T.PlaneGeometry(.14, .23, 1, 4); const p = leafGeometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setXYZ(i, p.getX(i) * Math.cos(y / .23 * Math.PI), y, .02 * Math.cos(y / .23 * Math.PI)); }
      leafGeometry.computeVertexNormals();
      const c = document.createElement('canvas'); c.width = 64; c.height = 128;
      const ctx = c.getContext('2d'), gradient = ctx.createLinearGradient(0, 0, 64, 0);
      gradient.addColorStop(0, '#d1d1d1'); gradient.addColorStop(.48, '#fafafa'); gradient.addColorStop(1, '#dedede'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 128);
      ctx.strokeStyle = '#bcbcbc'; ctx.lineWidth = .65; ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(32, 128); ctx.stroke();
      for (let y = 22; y < 120; y += 18) for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(32 + side * 26, y - 15); ctx.stroke(); }
      const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
      leafMaterial = new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .00015, roughness: .86, side: T.DoubleSide });
    }
    function add(source, position, color, soft = false) {
      const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
      const faces = g.attributes.position.count / 3;
      if (soft) softFaces.push([faceCount, faceCount + faces]); faceCount += faces;
      pose.position.set(...position); pose.rotation.set(0, 0, 0); pose.scale.set(1, 1, 1); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
      const c = new T.Color(color), colors = [], p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), edge = Math.min(4 - Math.abs(x), 4.3 - Math.abs(z));
        const shade = .93 + .045 * Math.sin(x * 1.7 + z * 2.1) - .1 * Math.exp(-Math.max(0, edge) * 8);
        colors.push(c.r * shade, c.g * shade, c.b * shade); const ground = color === 0xb9b29d;
        uv.setXY(i, ground ? x / 8 + .5 : .5, ground ? .015625 + .984375 * (.5 - z / 8.6) : .0078125);
      }
      g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
    }
    const box = (s, p, c, soft = false) => add(new T.BoxGeometry(...s), p, c, soft);
    box([8, .06, 8.6], [0, .03, 0], 0xb9b29d, true);
    for (const side of [-1, 1]) {
      box([.16, .035, 8.6], [side * 3.92, .078, 0], 0x8d9283);
      box([.52, .03, 5.9], [side * 3.55, .08, -.65], 0x665a43, true);
      box([3.25, .035, .16], [side * 2.3, .078, 4.22], 0x8d9283);
    }
    for (let i = 0; i < 3; i++) box([1.2, .035, .19], [0, .078, 3.66 + i * .25], 0x989c8d);
    const leaves = new T.InstancedMesh(leafGeometry, leafMaterial, 800), tint = new T.Color(); let index = 0;
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
      const cx = side * (1.5 + i * .5), cz = -3.8 + (random() - .5) * .14, height = .43 + random() * .18;
      for (let shoot = 0; shoot < 5; shoot++) {
        const a = random() * Math.PI * 2, reach = .14 + random() * .2, sx = cx + Math.cos(a) * reach, sz = cz + Math.sin(a) * reach;
        add(new T.CylinderGeometry(.004, .011, height, 5).rotateZ(Math.cos(a) * .18), [sx, .085 + height / 2, sz], 0x6d654b);
        for (let node = 0; node < 8; node++) for (const sign of [-1, 1]) {
          const angle = a + node * 2.4 + sign * .65, rise = node / 7;
          pose.position.set(sx + Math.cos(angle) * .11, .15 + rise * height, sz + Math.sin(angle) * .11);
          pose.rotation.set(-.5 + random() * .5, angle, sign * (.6 + random() * .5)); pose.scale.setScalar(.65 + random() * .55); pose.updateMatrix(); leaves.setMatrixAt(index, pose.matrix);
          tint.set([0x536743, 0x617746, 0x728257, 0x4c623e][(i + node + shoot) % 4]).multiplyScalar(.8 + rise * .2); leaves.setColorAt(index++, tint);
        }
      }
    }
    const ground = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map: groundMap, bumpMap: groundMap, bumpScale: .003, vertexColors: true, roughness: .96 }));
    ground.castShadow = ground.receiveShadow = true; root.add(ground); parts.forEach(g => g.dispose());
    leaves.castShadow = leaves.receiveShadow = true; leaves.raycast = () => {}; root.add(leaves);
    return { root, onHit(hit) {
      if (hit.object === ground && softFaces.some(([a, b]) => hit.faceIndex >= a && hit.faceIndex < b)) return { bulletmark: false, surface: 'soil' };
    } };
  };
})();
