// 石灯笼, 柱身与四面开口灯室为实体结构; 暖色灯泡可打碎, 不使用实时灯光.
FPS.models.stoneLantern = T => {
  const root = new T.Group(), parts = [];
  function add(g, c) {
    const color = new T.Color(c), a = [];
    for (let i = 0; i < g.attributes.position.count; i++) a.push(color.r, color.g, color.b);
    g.setAttribute('color', new T.Float32BufferAttribute(a, 3)); parts.push(g);
  }
  const box = (s, p, c) => add(new T.BoxGeometry(...s).translate(...p), c);
  box([.95, .14, .95], [0, .07, 0], 0x939b8a);
  add(new T.CylinderGeometry(.22, .33, .32, 8).translate(0, .3, 0), 0xa3aa98);
  add(new T.CylinderGeometry(.18, .24, .88, 8).translate(0, .9, 0), 0x8e9a87);
  box([.66, .12, .66], [0, 1.4, 0], 0xb1b7a6);
  for (const x of [-.25, .25]) for (const z of [-.25, .25]) box([.12, .45, .12], [x, 1.685, z], 0xadb5a2);
  box([.43, .06, .43], [0, 1.49, 0], 0x4a5648);
  add(new T.CylinderGeometry(.15, .72, .32, 4).rotateY(Math.PI / 4).translate(0, 2.01, 0), 0x919e8e);
  add(new T.SphereGeometry(.12, 8, 6).scale(1, 1.4, 1).translate(0, 2.25, 0), 0xb0b7a3);
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  mesh.name = 'stone-lantern-body';
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  // 灯泡用径向渐变贴图的无光照材质, 四面开口均可命中实际球面.
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
  const g2 = glowCanvas.getContext('2d'), grad = g2.createRadialGradient(32, 34, 3, 32, 32, 45);
  grad.addColorStop(0, '#ffe8b8'); grad.addColorStop(.55, '#f2a94e'); grad.addColorStop(1, '#b85c22');
  g2.fillStyle = grad; g2.fillRect(0, 0, 64, 64);
  const glowMap = new T.CanvasTexture(glowCanvas); glowMap.colorSpace = T.SRGBColorSpace;
  const glow = new T.Mesh(new T.SphereGeometry(.2, 12, 8).scale(1, .85, 1), new T.MeshBasicMaterial({ map: glowMap }));
  glow.name = 'stone-lantern-bulb'; glow.position.y = 1.69; root.add(glow);
  let broken = false;
  return { root, onHit(hit, api) {
    if (hit.object !== glow) return;
    if (!broken) {
      broken = true;
      // 保留底部破口玻璃, 中央灯室真正镂空; 复用原材质, 不影响静态石壳阴影.
      const glass = glow.geometry, remains = glass.clone(), positions = glass.attributes.position, faces = glass.index, indices = [];
      for (let i = 0; i < faces.count; i += 3) {
        const a = faces.getX(i), b = faces.getX(i + 1), c = faces.getX(i + 2);
        if ((positions.getY(a) + positions.getY(b) + positions.getY(c)) / 3 < -.1 && (i / 3) % 5 !== 0) indices.push(a, b, c);
      }
      remains.setIndex(indices); glass.dispose(); glow.geometry = remains;
      glow.material.color.setHex(0x202820);
      api.effect('lampShards', { position: glow.getWorldPosition(new T.Vector3()), direction: hit.direction, limit: 4 });
    }
    return { bulletmark: false };
  }, dispose() { glowMap.dispose(); } };
};
