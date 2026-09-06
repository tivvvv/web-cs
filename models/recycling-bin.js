// 带翻盖与后轮的街边垃圾桶, 正面 +Z; 桶身合批, 标识只生成一次小纹理.
FPS.models.recyclingBin = T => {
  const root = new T.Group(), parts = [], pose = new T.Object3D();
  function add(g, color, p, r = [0, 0, 0]) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose();
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s), c, p);
  const body = new T.BoxGeometry(.66, .86, .48), vertices = body.attributes.position;
  for (let i = 0; i < vertices.count; i++) if (vertices.getY(i) < 0) vertices.setXYZ(i, vertices.getX(i) * .78, vertices.getY(i), vertices.getZ(i) * .77);
  body.computeVertexNormals(); add(body, 0x48745b, [0, .535, 0]);
  box([.69, .035, .51], [0, .956, 0], 0x263c31);
  box([.72, .055, .55], [0, .995, 0], 0x61876a);
  box([.23, .045, .06], [0, 1.035, .21], 0x263c31);
  for (const side of [-1, 1]) {
    add(new T.CylinderGeometry(.085, .085, .065, 12), 0x27302b, [side * .28, .085, -.16], [0, 0, Math.PI / 2]);
    box([.07, .11, .07], [side * .21, .055, .14], 0x3b5544);
    box([.06, .07, .08], [side * .22, .985, -.235], 0x3b5544);
  }
  box([.48, .045, .045], [0, 1.02, -.26], 0x263c31);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .76, metalness: .15 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e8ecdd'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = ctx.strokeStyle = '#28533d';
  ctx.beginPath(); ctx.arc(43, 23, 9, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(43, 38); ctx.lineTo(43, 63); ctx.lineTo(31, 83); ctx.moveTo(43, 63); ctx.lineTo(54, 83); ctx.moveTo(43, 41); ctx.lineTo(67, 51); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(72, 59); ctx.lineTo(76, 83); ctx.lineTo(98, 83); ctx.lineTo(102, 59); ctx.stroke(); ctx.fillRect(80, 49, 6, 6);
  ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ごみ', 64, 106); ctx.font = 'bold 12px sans-serif'; ctx.fillText('LITTER', 64, 122);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  const label = new T.Mesh(new T.PlaneGeometry(.38, .38), new T.MeshStandardMaterial({ map, roughness: .85 }));
  label.position.set(0, .58, .219); label.rotation.x = Math.atan(.0552 / .86); root.add(label); return { root };
};
