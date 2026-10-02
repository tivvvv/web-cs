// 集装箱岸吊, 梁柱/桁架/缆绳静态合批; 主循环无需处理吊机, 不创建实时灯光.
FPS.models.portCrane = (T, o = {}) => {
  const root = new T.Group(), parts = [[], [], [], []], pose = new T.Object3D(), up = new T.Vector3(0, 1, 0);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 256;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 237 + (seed / 4294967296 - .5) * 16 + Math.sin(x * .041) * Math.cos(y * .028) * 8;
    pixels.data.set([v, v, v - 3, 255], (y * 256 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
  function add(source, color, batch = 0) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose(); const c = new T.Color(color), rgb = [], p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const shade = .88 + .12 * Math.min(1, p.getY(i) / 2); rgb.push(c.r * shade, c.g * shade, c.b * shade); }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[batch].push(g);
  }
  const yellow = 0xc5a85f, blue = 0x416e79, steel = 0x405659;
  const box = (s, p, c = yellow, batch = 0) => add(new T.BoxGeometry(...s).translate(...p), c, batch);
  function rod(a, b, radius, color = blue, batch = 0) {
    const start = new T.Vector3(...a), delta = new T.Vector3(...b).sub(start); pose.position.copy(start).addScaledVector(delta, .5); pose.quaternion.setFromUnitVectors(up, delta.clone().normalize()); pose.updateMatrix();
    add(new T.CylinderGeometry(radius, radius, delta.length(), 6).applyMatrix4(pose.matrix), color, batch);
  }
  for (const x of [-7, 7]) for (const z of [-4, 4]) {
    box([2.2, .5, 2.3], [x, .7, z], steel, 1); box([.72, 14, .72], [x, 7.5, z]);
    // 行走轮沿岸轨滚动, 轮轴朝 Z, 轮胎脚点对齐 .055 米轨面.
    for (const side of [-1, 1]) add(new T.CylinderGeometry(.37, .37, .22, 16).rotateX(Math.PI / 2).translate(x + side * .62, .425, z), 0x263f41, 1);
    rod([x, 1, z], [x * .55, 14.2, z], .21, yellow);
    // 基脚检修盖和紧固件, 编号牌位于内侧可见面.
    box([.58, .9, .07], [x, 1.84, z + .39], 0x728981, 1);
    for (const sx of [-.22, .22]) for (const y of [1.48, 2.2]) add(new T.CylinderGeometry(.03, .035, .032, 6).rotateX(Math.PI / 2).translate(x + sx, y, z + .442), 0xb5bda8, 1);
  }
  for (const z of [-4, 4]) { box([15.2, 1.1, .95], [0, 14.4, z]); rod([-6.9, 7, z], [6.9, 14, z], .11); rod([6.9, 7, z], [-6.9, 14, z], .11); }
  for (const x of [-7, 7]) { box([1.05, .75, 9], [x, 15.1, 0]); rod([x, 8, -4], [x, 14, 4], .12); rod([x, 8, 4], [x, 14, -4], .12); }
  for (const x of [-3.3, 3.3]) {
    box([.35, .4, 42], [x, 19.7, -9]); box([.28, .34, 42], [x, 22.6, -9], blue);
    for (let z = -30; z < 12; z += 3) {
      rod([x, 19.7, z], [x, 22.6, z + 3], .1, blue); rod([x, 22.6, z], [x, 19.7, z + 3], .1, blue);
      rod([x, 19.7, z], [x, 22.6, z], .1, yellow);
    }
    rod([x, 14.5, -4], [x, 19.7, -7], .3, yellow); rod([x, 14.5, 4], [x, 19.7, 6], .3, yellow);
  }
  for (const z of [-30, -18, -6, 6, 12]) box([6.9, .23, .22], [0, 19.7, z], blue);
  box([8, .25, 10], [0, 15.7, .5], 0x5b7880, 1); box([4.2, 2.35, 4.2], [4.2, 17.1, 3], blue);
  // 偏置设备房和驾驶舱通过托台/斜撑接回主梁, 底部不悬空.
  box([4.45, .14, 4.45], [4.2, 15.855, 3], steel, 1);
  rod([6.15, 15.785, 3], [7, 14.6, 4], .12, blue);
  box([2.3, .22, 2.75], [-5.15, 15.89, -4.35], steel, 1);
  rod([-5.9, 15.78, -4.35], [-7, 14.6, -4], .12, blue);
  rod([-4.4, 15.78, -4.35], [-5.9, 14.9, -4], .1, blue);
  box([2.1, 2.3, 2.4], [-5.15, 17.15, -4.35], 0xc4c7b0);
  box([1.91, 1.04, .025], [-5.15, 17.45, -5.565], 0x345c69, 2);
  for (const x of [-6.215, -4.085]) box([.025, 1.04, 2.1], [x, 17.45, -4.35], 0x345c69, 2);
  for (const x of [-5.99, -4.31]) box([.055, 1.08, .06], [x, 17.45, -5.6], 0xc1c4aa, 1);
  box([1.97, .075, .09], [-5.15, 16.88, -5.6], 0x79948b, 1);
  rod([-5.45, 17.02, -5.605], [-4.88, 17.7, -5.605], .014, 0x71877d, 1);
  box([.6, .24, .23], [-5.15, 18.44, -4.35], 0x819b8c, 1);
  for (let x = -5.35; x < -4.92; x += .09) box([.018, .1, .025], [x, 18.44, -4.479], 0x354f4d, 1);
  box([7.1, .55, 3.5], [0, 19.3, -20], 0x6b8587, 1);
  for (const x of [-2.2, 2.2]) for (const z of [-21.1, -18.9]) rod([x, 19, z], [x, 8.3, z], .023, 0x324849, 1);
  box([5.8, .36, 2.6], [0, 8.15, -20]); box([.75, .8, .65], [0, 7.7, -20], steel, 1);
  // 维护走台的黄栏杆和竖梯仅表现设备结构, 地面可接触支腿另由场景配置碰撞.
  for (const side of [-1, 1]) {
    for (let z = -4; z < 5.2; z += 1.5) box([.065, 1.1, .065], [side * 3.87, 16.35, z]);
    box([.065, .065, 10], [side * 3.87, 16.9, .5]);
  }
  for (const x of [6.63, 7.37]) box([.065, 14, .065], [x, 7.2, 4.4], steel, 1);
  for (let y = .4; y < 14.2; y += .32) box([.76, .045, .06], [7, y, 4.4], 0x9eafa5, 1);
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 1024; labelCanvas.height = 256;
  const lc = labelCanvas.getContext('2d'); lc.fillStyle = '#496a6d'; lc.fillRect(0, 0, 1024, 256); lc.fillStyle = '#e1dab5'; lc.textAlign = 'center'; lc.font = '800 83px sans-serif'; lc.fillText('SHONAN  /  QUAY 01', 512, 112); lc.font = '31px monospace'; lc.fillText('CRANE 03    •    SWL 45 t', 512, 190);
  const labels = new T.CanvasTexture(labelCanvas); labels.colorSpace = T.SRGBColorSpace; labels.anisotropy = 8;
  function sign(size, point, yaw = 0) {
    const g = new T.BoxGeometry(...size), uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) if (n.getZ(i) < .5) uv.setXY(i, .003, .997);
    add(g.rotateY(yaw).translate(...point), 0xffffff, 3);
  }
  sign([11.4, .72, .07], [0, 14.4, 4.495]); sign([11.4, .72, .07], [0, 14.4, -4.495], Math.PI);
  parts.forEach((batch, i) => {
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ map: i === 2 ? null : i === 3 ? labels : map, vertexColors: true, roughness: i === 2 ? .18 : .69, metalness: i === 2 ? .42 : .32 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  });
  return { root, dispose() { map.dispose(); labels.dispose(); } };
};
