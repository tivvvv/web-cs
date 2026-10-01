// 手水舍: 木石瓦面分材质, 空心石钵, 竹管流水与两圈循环水纹; 动画仅走模型 update.
FPS.models.temizuya = T => {
  const root = new T.Group(), parts = [[], [], [], []];
  function add(g, c) {
    const batch = [0x9b9e8f, 0x838a7e, 0x737e74, 0xa1a899, 0x9ba291].includes(c) ? 0 : [0x53615a, 0x788077, 0x58645d].includes(c) ? 2 : [0x7e6b4d, 0x65553f].includes(c) ? 1 : 3;
    const source = g; g = g.index ? g.toNonIndexed() : g; if (g !== source) source.dispose();
    const color = new T.Color(c), rgb = [], uv = [], p = g.attributes.position, n = g.attributes.normal;
    g.computeBoundingBox(); const span = g.boundingBox.getSize(new T.Vector3()), vertical = span.y > span.x && span.y > span.z;
    for (let i = 0; i < p.count; i++) {
      rgb.push(color.r, color.g, color.b);
      uv.push((vertical ? p.getX(i) : Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) * (batch === 1 ? 4 : 2), (vertical ? p.getY(i) : p.getX(i)) * (batch === 1 ? .4 : 2));
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); parts[batch].push(g);
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
  for (const z of [-.19, .19]) add(new T.CylinderGeometry(.035, .035, 2.28, 8).rotateZ(Math.PI / 2).translate(0, 1.045, z), 0xa19c63);
  for (const x of [-.5, .1, .65]) {
    add(new T.CylinderGeometry(.017, .017, .65, 6).rotateX(Math.PI / 2).translate(x, 1.085, -.06), 0xb5ab70);
    add(new T.CylinderGeometry(.105, .095, .11, 10).translate(x, 1.12, .31), 0xc4b884);
    add(new T.CylinderGeometry(.083, .083, .006, 10).translate(x, 1.179, .31), 0x736c46);
  }
  // 竹管支撑在石钵内, 出水点位于水面上方, 与舀水勺错开.
  add(new T.CylinderGeometry(.045, .053, 1.26, 12).translate(-.7, .85, -.34), 0x8b925d);
  const start = new T.Vector3(-.7, 1.48, -.34), tip = new T.Vector3(-.37, 1.4, 0), delta = tip.clone().sub(start), pose = new T.Object3D();
  pose.position.copy(start).addScaledVector(delta, .5); pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.clone().normalize()); pose.updateMatrix();
  add(new T.CylinderGeometry(.042, .045, delta.length(), 12, 1, true).applyMatrix4(pose.matrix), 0x8b925d);
  for (const [kind, batch] of parts.entries()) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 881;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      let v = 240 + (seed / 4294967296 - .5) * (kind === 0 ? 28 : 8);
      if (kind === 1 || kind === 3) v += 12 * Math.sin(x * .34 + Math.sin(y * .03)) * Math.sin(x * .081);
      if (kind === 2 && (x % 48 < 2 || y % 64 < 2)) v -= 32;
      pixels.data.set([v, v, v, 255], (y * 256 + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ vertexColors: true, map, bumpMap: map, bumpScale: .005, roughness: kind === 2 ? .85 : .94 }));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  }
  const water = new T.Mesh(new T.PlaneGeometry(1.77, .8).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x638780, roughness: .2, metalness: .16, transparent: true, opacity: .86 }));
  water.position.y = .79; water.receiveShadow = true; root.add(water);
  const stream = new T.Mesh(new T.CylinderGeometry(.011, .015, .606, 8), new T.MeshStandardMaterial({ color: 0xb8d3c9, emissive: 0x17211e, transparent: true, opacity: .62, roughness: .18, depthWrite: false }));
  stream.position.set(tip.x, 1.097, tip.z); root.add(stream);
  const ripples = [0, 1].map(() => {
    const ring = new T.Mesh(new T.RingGeometry(.055, .063, 32).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xc0d9d0, transparent: true, opacity: .2, depthWrite: false }));
    ring.position.set(tip.x, .796, tip.z); root.add(ring); return ring;
  });
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 128;
  const labelCtx = labelCanvas.getContext('2d'); labelCtx.fillStyle = '#35423c'; labelCtx.font = '600 88px serif'; labelCtx.textAlign = 'center'; labelCtx.textBaseline = 'middle'; labelCtx.fillText('手 水', 128, 66);
  const labelMap = new T.CanvasTexture(labelCanvas); labelMap.colorSpace = T.SRGBColorSpace;
  const label = new T.Mesh(new T.PlaneGeometry(.62, .26), new T.MeshStandardMaterial({ map: labelMap, transparent: true, depthWrite: false, roughness: 1 }));
  label.rotation.y = Math.PI; label.position.set(0, .78, -.57); root.add(label);
  let time = 0;
  return { root, update(dt) {
    time += dt; stream.scale.x = stream.scale.z = .9 + .1 * Math.sin(time * 12);
    ripples.forEach((ring, i) => { const phase = (time * .6 + i * .5) % 1; ring.scale.setScalar(1 + phase * 3); ring.material.opacity = (1 - phase) * .24; });
  } };
};
