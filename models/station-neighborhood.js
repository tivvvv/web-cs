// 车站区域内的住宅台地与步行楼梯, 尺寸由场景统一传入, 不生成外围地形.
FPS.models.stationNeighborhood = (T, o = {}) => {
  const { height = 2.4, start = 20, depth = 38, width = 100, steps = 12, tread = .45, stairWidth = 7.6 } = o;
  const root = new T.Group(), parts = [[], [], []], pose = new T.Object3D();
  // 路面沿真实道路烘焙轮迹/路肩, 石面按米重复, 两种尺度不再共享纯色材质.
  function texture(kind) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = kind ? 512 : 1024;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(canvas.width, canvas.height); let seed = 921 + kind;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width, v = y / canvas.height;
      const macro = Math.sin(u * Math.PI * 6 + Math.sin(v * Math.PI * 4)) * Math.cos(v * Math.PI * 8);
      const shoulder = Math.pow(Math.abs(u - .5) * 2, 10);
      const wheels = Math.exp(-((Math.abs(u - .5) - .16) ** 2) / .002);
      const n = (random() - .5) * (kind ? 18 : 14), value = (kind ? 238 : 232) + macro * (kind ? 5 : 7) + n + (kind ? 0 : shoulder * 17 - wheels * 12);
      pixels.data.set([value, value, value - (kind ? 5 : shoulder * 8), 255], (y * canvas.width + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0);
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
    if (kind) map.wrapS = map.wrapT = T.RepeatWrapping;
    return map;
  }
  const stoneMap = texture(1), roadMap = texture(0);
  function add(source, p, color) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    pose.position.set(...p); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const kind = color === 0x62686a ? 1 : color === 0x4e655d || color === 0xe5dfc9 || color === 0x54704c || color === 0x687d51 ? 2 : 0;
    const c = new T.Color(color), colors = [], vertices = g.attributes.position, normals = g.attributes.normal, uv = [];
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i), top = Math.abs(normals.getY(i)) > .5;
      const weather = top || kind ? 1 : .8 + .2 * Math.min(1, Math.max(0, y / .6));
      colors.push(c.r * weather, c.g * weather, c.b * weather);
      uv.push(kind === 1 ? x / stairWidth + .5 : (Math.abs(normals.getX(i)) > .5 ? z : x) / 2, kind === 1 ? (z - start) / depth : (top ? z : y) / 2);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); parts[kind].push(g);
  }
  function box(s, p, color) {
    let g;
    if (color === 0xbdb9a6) {
      const b = .012, shape = new T.Shape();
      shape.moveTo(-s[0] / 2 + b, -s[1] / 2 + b); shape.lineTo(s[0] / 2 - b, -s[1] / 2 + b);
      shape.lineTo(s[0] / 2 - b, s[1] / 2 - b); shape.lineTo(-s[0] / 2 + b, s[1] / 2 - b); shape.closePath();
      g = new T.ExtrudeGeometry(shape, { depth: s[2] - b * 2, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1 }).translate(0, 0, -s[2] / 2 + b);
    } else g = new T.BoxGeometry(...s);
    add(g, p, color);
  }
  box([width, height - .04, depth], [0, (height - .04) / 2, start + depth / 2], 0x929788);
  box([width, .04, depth], [0, height - .02, start + depth / 2], 0xb6b39f);
  box([stairWidth, .035, depth], [0, height + .0175, start + depth / 2], 0x62686a);
  for (let i = 0; i < steps; i++) {
    const h = height * (i + 1) / steps, z = start - (steps - i - .5) * tread;
    box([stairWidth, h, tread], [0, h / 2, z], 0xbdb9a6);
    box([stairWidth - .08, .035, .014], [0, h - .035, z - tread / 2 - .008], 0xe0dac6);
    for (const side of [-1, 1]) box([.18, h + .22, tread], [side * (stairWidth / 2 + .09), (h + .22) / 2, z], 0x969c8b);
  }
  // 台地临空面护栏在楼梯入口处断开, 保留完整通行宽度.
  const span = (width - stairWidth) / 2;
  for (const side of [-1, 1]) {
    for (const y of [.45, .9]) box([span, .055, .065], [side * (stairWidth / 2 + span / 2), height + y, start + .1], 0x4e655d);
    for (let x = stairWidth / 2; x <= width / 2; x += 2.5) box([.065, .95, .065], [side * x, height + .475, start + .1], 0x4e655d);
    box([.11, .012, depth - 1], [side * 3.45, height + .047, start + depth / 2], 0xe5dfc9);
    box([.3, .085, depth], [side * (stairWidth / 2 + .15), height + .0425, start + depth / 2], 0xa8ad9d);
    // 分缝与排水口只做浅表细节, 脱离墙面 4 毫米以上, 不改通行碰撞.
    box([span, .08, .1], [side * (stairWidth / 2 + span / 2), height - .12, start - .035], 0xb1b3a3);
    for (let x = stairWidth / 2 + 2; x < width / 2; x += 3.8) {
      box([.018, height - .22, .008], [side * x, (height - .22) / 2, start - .008], 0x747e73);
      box([.18, .15, .018], [side * (x - 1.3), .43, start - .013], 0xb1b3a3);
      box([.1, .075, .012], [side * (x - 1.3), .43, start - .029], 0x404d49);
    }
    // 少量下垂常春藤并入墙体网格, 不创建额外花叶实例或动画.
    for (const x of [12, 28, 41]) for (let strand = 0; strand < 3; strand++) for (let i = 0; i < 6 - strand; i++) {
      add(new T.IcosahedronGeometry(1, 0).scale(.13, .11, .045), [side * x + strand * .17 + Math.sin(i * 2.4) * .09, height - .08 - i * .12, start - .11 - strand * .018], i % 2 ? 0x54704c : 0x687d51);
    }
  }
  const roadMaterial = new T.MeshStandardMaterial({ vertexColors: true, map: roadMap, bumpMap: stoneMap, bumpScale: .003, roughness: .96 });
  const materials = [new T.MeshStandardMaterial({ vertexColors: true, map: stoneMap, bumpMap: stoneMap, bumpScale: .004, roughness: .93 }), roadMaterial,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: .72 })];
  // 同一道路保留世界大色差, 近景颗粒通过同一材质取样, 不增加贴片或单独的细节绘制.
  roadMaterial.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>\n vBumpMapUv=uv*vec2(${stairWidth / 1.3},${depth / 1.3});`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb*=.78+.28*texture2D(bumpMap,vBumpMapUv).r;');
  };
  roadMaterial.customProgramCacheKey = () => 'terrace-road-v1/' + stairWidth + '/' + depth;
  parts.forEach((batch, i) => {
    const mesh = new T.Mesh(T.mergeGeometries(batch), materials[i]);
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  });
  return { root };
};
