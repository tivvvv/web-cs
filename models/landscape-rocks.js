// 景石按真实尺寸埋土, 枯山水用不对称斜断面, 岩层/风化/苔面使用顶点色与细粒贴图; 全组一个网格.
FPS.models.landscapeRocks = (T, o = {}) => {
  const root = new T.Group(), parts = [], stoneColors = o.weathered ? [0x777d78, 0x969589, 0x7f8580] : o.moss === false ? [0x92918d, 0x7d7d7b, 0x97958f] : [0x92938a, 0x7d857e, 0x979787];
  function noise(x, y, z, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), smooth = t => t * t * (3 - 2 * t), fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz);
    const hash = (a, b, c) => { let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647) ^ Math.imul(seed + 1, 1274126177); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 2147483648 - 1; };
    let value = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) value += hash(ix + a, iy + b, iz + c) * (a ? fx : 1 - fx) * (b ? fy : 1 - fy) * (c ? fz : 1 - fz);
    return value;
  }
  for (const [j, [x, z, w, h, d]] of (o.stones ?? []).entries()) {
    const g = new T.IcosahedronGeometry(1, o.weathered ? 12 : 4), p = g.attributes.position, colors = [], uv = [];
    // 天然断面由不同方向的斜面切出, 主石上窄下稳, 卧石保留长肩; 不把景石拉成圆柱.
    if (o.weathered) {
      const planes = [];
      for (let k = 0; k < 9; k++) {
        const a = k * Math.PI * 2 / 9 + j * .73 + .11 * Math.sin(k * 2.7 + j);
        planes.push([Math.cos(a), .09 + .19 * Math.sin(k * 1.9 + j * .7), Math.sin(a), .69 + .12 * Math.sin(k * 2.3 + j * 1.7)]);
      }
      planes.push([.42, 1, -.28, .67], [-.46, 1, .16, .87], [.12, 1, .65, .81], [0, -1, 0, .65]);
      for (let i = 0; i < p.count; i++) {
        const py = p.getY(i), px = p.getX(i), pz = p.getZ(i);
        let radius = Infinity;
        for (const [nx, ny, nz, distance] of planes) {
          const dot = px * nx + py * ny + pz * nz;
          if (dot > .00001) radius = Math.min(radius, distance / dot);
        }
        let sx = px * radius, sy = py * radius, sz = pz * radius;
        const weather = .055 * noise(sx * 4.3, sy * 4.3, sz * 4.3, j) + .012 * noise(sx * 13, sy * 13, sz * 13, j + 8);
        const yaw = j * .47 - .22, ca = Math.cos(yaw), sa = Math.sin(yaw);
        sx += weather * px; sy += weather * py; sz += weather * pz;
        p.setXYZ(i, sx * ca - sz * sa + sy * .14 * Math.sin(j + .7), .36 + sy * .76, sx * sa + sz * ca);
      }
      g.computeBoundingBox(); const b = g.boundingBox;
      for (let i = 0; i < p.count; i++) p.setXYZ(i,
        x + ((p.getX(i) - b.min.x) / (b.max.x - b.min.x) - .5) * w * .96,
        p.getY(i) * h / b.max.y,
        z + ((p.getZ(i) - b.min.z) / (b.max.z - b.min.z) - .5) * d * .96);
    }
    for (let i = 0; i < p.count; i++) {
      const px = o.weathered ? (p.getX(i) - x) * 2 / w : p.getX(i), py = o.weathered ? p.getY(i) / h - .4 : p.getY(i), pz = o.weathered ? (p.getZ(i) - z) * 2 / d : p.getZ(i);
      const variation = Math.sin(px * 5 + py * 3 + pz * 7 + j * 2.7), r = .9 + variation * .095;
      const y = h * (.4 + Math.min(.79, py + px * .12) * r * .6), sx = Math.max(-.84, Math.min(.9, px)) * r * w / 2, sz = pz * r * d / 2;
      if (!o.weathered) p.setXYZ(i, x + sx, y, z + sz);
      const n = new T.Vector3(px / w, py / (h * 1.2), pz / d).normalize();
      const strata = o.weathered ? Math.sin(p.getY(i) * 7 + px * 2.8 + .3 * Math.sin(pz * 6)) : Math.sin(y * 19 + sx * 1.6 + sz * .7), moss = o.moss !== false && py > .12 && Math.sin(px * 9 + pz * 5 + j) + py * 1.4 > .65;
      const c = new T.Color(moss ? [0x68754b, 0x7a8253][j % 2] : stoneColors[j % 3]);
      const mottling = o.weathered ? .12 * noise(px * 5.5, py * 5.5, pz * 5.5, j) : 0;
      c.multiplyScalar(.81 + .17 * Math.min(1, Math.max(0, py + .5)) + variation * .06 + mottling - Math.pow(Math.max(0, strata), o.weathered ? 28 : 12) * (o.weathered ? .025 : .12));
      colors.push(c.r, c.g, c.b); uv.push((Math.abs(n.x) > .65 ? p.getZ(i) : p.getX(i)) * 2, (Math.abs(n.y) > .65 ? p.getZ(i) : p.getY(i)) * 2);
    }
    // 枯山水指定露出地面的实际高度, 形变后再校准, 与碰撞顶面一致.
    if (o.exactHeight) {
      let top = 0; for (let i = 0; i < p.count; i++) top = Math.max(top, p.getY(i));
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * h / top);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    if (o.weathered) {
      const n = g.attributes.normal, tex = g.attributes.uv;
      for (let i = 0; i < p.count; i += 3) {
        const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), side = ax > ay && ax > az, top = ay >= ax && ay >= az;
        for (let k = i; k < i + 3; k++) tex.setXY(k, (side ? p.getZ(k) : p.getX(k)) * 2, (top ? p.getZ(k) : p.getY(k)) * 2);
      }
    }
    // 合并相同位置的面法线后部分平滑, 留下较大折面, 避免椭圆球的充气感.
    const normal = g.attributes.normal, sums = new Map(), key = i => [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(5)).join(',');
    for (let i = 0; i < p.count; i++) {
      const k = key(i), group = sums.get(k) ?? []; group.push(new T.Vector3().fromBufferAttribute(normal, i)); sums.set(k, group);
    }
    for (let i = 0; i < p.count; i++) {
      const face = new T.Vector3().fromBufferAttribute(normal, i), sum = new T.Vector3();
      for (const n of sums.get(key(i))) if (!o.weathered || face.dot(n) > .86) sum.add(n);
      face.lerp(sum.normalize(), o.weathered ? .9 : .82).normalize(); normal.setXYZ(i, face.x, face.y, face.z);
    }
    parts.push(g);
  }
  if (parts.length) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 311;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const v = o.weathered ? 232 + (seed / 4294967296 - .5) * 28 + 12 * noise(x * .028, y * .028, 0, 31)
        : 225 + (seed / 4294967296 - .5) * 35 + 9 * Math.sin(x * .21 + y * .17) * Math.sin(y * .41);
      pixels.data.set([v, v, v, 255], (y * 256 + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
    const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: o.weathered ? .009 : .014, vertexColors: true, roughness: .98 }));
    if (o.weathered) {
      // 三轴取样跨越石块断面, 细粒不在每个三角形的投影方向上留下接缝.
      mesh.material.customProgramCacheKey = () => 'weathered-rock-triplanar-v1';
      mesh.material.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 rockPosition,rockNormal;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nrockPosition=position;rockNormal=normal;');
        shader.fragmentShader = 'varying vec3 rockPosition,rockNormal;\n' + shader.fragmentShader
          .replace('#include <map_fragment>', `vec3 weights=pow(abs(normalize(rockNormal)),vec3(4.)); weights/=max(dot(weights,vec3(1.)),.001);
            vec3 rockGrain=texture2D(map,rockPosition.yz*2.).rgb*weights.x+texture2D(map,rockPosition.xz*2.).rgb*weights.y+texture2D(map,rockPosition.xy*2.).rgb*weights.z;
            diffuseColor.rgb*=rockGrain;`)
          .replace('#include <normal_fragment_maps>', 'float rockHeight=dot(rockGrain,vec3(.333333))*bumpScale;normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(rockHeight),dFdy(rockHeight)),faceDirection);');
      };
    }
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  }
  return { root };
};
