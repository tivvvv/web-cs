// 手水舍: 四柱木棚, 空心石钵, 静态水面与竹勺; 不增加水体渲染或动画.
FPS.models.temizuya = T => {
  const root = new T.Group(), parts = [];
  function add(g, c) {
    const color = new T.Color(c), a = [];
    for (let i = 0; i < g.attributes.position.count; i++) a.push(color.r, color.g, color.b);
    g.setAttribute('color', new T.Float32BufferAttribute(a, 3)); parts.push(g);
  }
  const box = (s, p, c, angle = 0) => add(new T.BoxGeometry(...s).rotateZ(angle).translate(...p), c);
  box([4.2, .1, 3.5], [0, .05, 0], 0x9b9e8f);
  for (const x of [-1.65, 1.65]) for (const z of [-1.3, 1.3]) {
    box([.42, .23, .42], [x, .215, z], 0x838a7e); box([.2, 2.8, .2], [x, 1.63, z], 0x7e6b4d);
    box([.7, .12, .16], [x - Math.sign(x) * .21, 2.67, z], 0x7e6b4d, -Math.sign(x) * .72);
  }
  for (const z of [-1.3, 1.3]) box([3.7, .2, .23], [0, 2.99, z], 0x65553f);
  for (const s of [-1, 1]) {
    box([2.35, .13, 3.8], [s * 1.02, 3.42, 0], 0x53615a, -s * .38);
    for (let i = 0; i < 12; i++) box([2.36, .035, .038], [s * 1.02, 3.51, -1.82 + i * .33], 0x788077, -s * .38);
  }
  box([.18, .16, 3.85], [0, 3.93, 0], 0x58645d);
  box([2.1, .36, 1.13], [0, .38, 0], 0x737e74);
  for (const s of [-1, 1]) {
    box([2.1, .44, .15], [0, .78, s * .49], 0xa1a899); box([.16, .44, .83], [s * .97, .78, 0], 0x9ba291);
  }
  box([1.77, .025, .8], [0, .78, 0], 0x547b74);
  for (const z of [-.19, .19]) add(new T.CylinderGeometry(.035, .035, 2.28, 8).rotateZ(Math.PI / 2).translate(0, 1.045, z), 0xa19c63);
  for (const x of [-.5, .1, .65]) {
    add(new T.CylinderGeometry(.017, .017, .65, 6).rotateX(Math.PI / 2).translate(x, 1.085, -.06), 0xb5ab70);
    add(new T.CylinderGeometry(.105, .095, .11, 10).translate(x, 1.12, .31), 0xc4b884);
    add(new T.CylinderGeometry(.083, .083, .006, 10).translate(x, 1.179, .31), 0x736c46);
  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .83 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose()); return { root };
};
