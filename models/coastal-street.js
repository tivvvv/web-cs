// 海边街道设施. 同文件提供路栏, 站外导向牌, 凸面镜和石墙变体.
FPS.models.coastalStreet = (T, options = {}) => {
  const root = new T.Group(), parts = new Map();
  const mat = (color, roughness = .8, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
  const iron = mat(0xa4b1ae, .4, .65), green = mat(0x397266, .6, .3), stone = mat(0x727d75);
  const cream = mat(0xd7cdb2), dark = mat(0x3c4a49), orange = mat(0xb5623c, .48, .3);
  function add(g, m, p, r = [0, 0, 0]) {
    const mesh = new T.Mesh(g, m); mesh.position.set(...p); mesh.rotation.set(...r); mesh.updateMatrix();
    if (!parts.has(m)) parts.set(m, []); parts.get(m).push(g.applyMatrix4(mesh.matrix));
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
  } else if (options.kind === 'mirror') {
    cylinder(.047, 3.6, [0, 1.8, 0], orange);
    add(new T.CylinderGeometry(.66, .66, .08, 40), orange, [0, 3.37, 0], [Math.PI / 2, 0, 0]);
    add(new T.TorusGeometry(.638, .018, 6, 40), orange, [0, 3.37, .05]);
    // 倒影仅初始化时绘制, 外框合批; 不使用实时反射或额外场景渲染.
    const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
    const fill = (color, path) => { ctx.fillStyle = color; ctx.fill(new Path2D(path)); };
    const stroke = (color, width, path) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(new Path2D(path)); };
    const sky = ctx.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#609fbf'); sky.addColorStop(1, '#deebe7');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14; i++) {
      const x = 50 + i * 32, y = 100 + Math.sin(i * 1.7) * 26;
      const cloud = ctx.createRadialGradient(x, y, 2, x, y, 38); cloud.addColorStop(0, '#f5f8f4dd'); cloud.addColorStop(1, '#f5f8f400');
      ctx.fillStyle = cloud; ctx.fillRect(x - 38, y - 38, 76, 76);
    }
    fill('#769491', 'M0 231 Q80 182 157 223 Q230 202 280 226 Q400 174 512 218 V330 H0Z');
    fill('#b5b6a4', 'M0 244 Q256 203 512 244 V512 H0Z');
    const road = ctx.createLinearGradient(0, 225, 0, 512); road.addColorStop(0, '#8d9997'); road.addColorStop(1, '#596668');
    fill(road, 'M246 224 L275 224 Q306 335 466 512 H46 Q227 323 246 224Z');
    fill('#c7c7af', 'M0 132 L108 168 L118 304 L0 366Z');
    fill('#e2ddc7', 'M108 168 L174 191 L171 275 L118 304Z');
    stroke('#6f7b76', 10, 'M0 127 L108 160 L177 185');
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      ctx.fillStyle = '#526b70'; ctx.fillRect(15 + col * 30, 178 + row * 62 + col * 6, 18, 32);
      ctx.fillStyle = '#a8bfbc'; ctx.fillRect(18 + col * 30, 180 + row * 62 + col * 6, 3, 27);
    }
    fill('#acb3a5', 'M370 182 L443 152 L512 158 V350 L374 288Z');
    stroke('#646f69', 9, 'M365 179 L443 144 L512 151');
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#5f797a'; ctx.fillRect(383 + i * 33, 201 - i * 5, 17, 35);
      ctx.fillStyle = i % 2 ? '#648071' : '#4f6b5f';
      ctx.beginPath(); ctx.ellipse(366 + i * 43, 287 + i * 17, 34, 28, -.3, 0, Math.PI * 2); ctx.fill();
    }
    stroke('#e5e4ce', 4, 'M242 238 Q218 345 71 493 M282 238 Q319 348 441 493');
    ctx.setLineDash([18, 22]); stroke('#dedbc0', 3, 'M259 244 Q265 366 269 512'); ctx.setLineDash([]);
    stroke('#65756e', 5, 'M198 289 Q205 204 197 120 M335 280 Q325 204 332 132');
    stroke('#697c79', 1.4, 'M0 51 Q115 152 197 133 Q264 190 332 145 Q416 120 512 63');
    const edge = ctx.createRadialGradient(256, 256, 168, 256, 256, 256);
    edge.addColorStop(0, '#21393e00'); edge.addColorStop(.91, '#21393e38'); edge.addColorStop(1, '#dce9e696');
    ctx.fillStyle = edge; ctx.fillRect(0, 0, 512, 512);
    stroke('#f0f8f566', 3, 'M64 194 A205 205 0 0 1 194 58');
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace;
    const lens = new T.SphereGeometry(.62, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, .16);
    // 按镜片正面坐标投影 UV, 避免半球经纬贴图将道路卷成环形.
    const { position, uv } = lens.attributes;
    for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / 1.24 + .5, position.getY(i) / 1.24 + .5);
    add(lens, new T.MeshStandardMaterial({ map, roughness: .23, metalness: .08, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .3 }), [0, 3.37, .06]);
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
    box([.42, height, length], [0, height / 2, 0], dark);
    for (let row = 0; row < Math.floor(height / .23); row++) for (let j = 0; j < Math.floor(length / .47); j++) {
      box([.47, .213, .445], [0, .12 + row * .23, -length / 2 + .24 + j * .47 + (row % 2) * .08], stone);
    }
    box([.54, .10, length + .1], [0, height, 0], cream);
  }
  for (const [m, geometries] of parts) {
    const mesh = new T.Mesh(T.mergeGeometries(geometries.map(g => g.index ? g.toNonIndexed() : g)), m);
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); geometries.forEach(g => g.dispose());
  }
  return { root };
};
