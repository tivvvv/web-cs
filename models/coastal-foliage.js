// 绣球花和海岸绿植. 叶脉贴图, 弯曲叶片与四瓣小花均由代码生成并实例化.
FPS.models.coastalFoliage = (T, options = {}) => {
  const root = new T.Group(); let seed = options.seed ?? 507;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const tree = options.kind === 'tree', shrub = options.kind === 'shrub';
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, '#435e2b'); gradient.addColorStop(.47, '#81934b'); gradient.addColorStop(.51, '#b1ad67'); gradient.addColorStop(1, '#536f34');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256); ctx.lineWidth = 1.1; ctx.strokeStyle = '#afae6d99';
  for (let y = 25; y < 248; y += 25) for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(128, y); ctx.quadraticCurveTo(128 + side * 47, y + 12, 128 + side * 120, y + 47); ctx.stroke();
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  const leafMaterial = new T.MeshStandardMaterial({ map, color: 0xb6ca8c, roughness: .71, side: T.DoubleSide });
  const leaf = new T.PlaneGeometry(1, 1, 4, 10), positions = leaf.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i) + .5;
    positions.setXYZ(i, x * Math.pow(Math.sin(Math.PI * y), .72) * .62, y, .12 * Math.sin(y * Math.PI) - Math.abs(x) * .17);
  }
  leaf.computeVertexNormals();
  const count = tree ? 1350 : shrub ? 350 : 195;
  const leaves = new T.InstancedMesh(leaf, leafMaterial, count), dummy = new T.Object3D();
  const spread = tree ? 2.7 : shrub ? 1.1 : .83, base = tree ? 3.8 : .5;
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2, radius = Math.sqrt(random()) * spread, size = tree ? .32 + random() * .29 : .19 + random() * .17;
    dummy.position.set(Math.cos(a) * radius, base + random() * (tree ? 2.6 : .8) - radius * (tree ? .18 : .28), Math.sin(a) * radius);
    dummy.rotation.set(-.65 + random() * 1.5, a + random(), (random() - .5) * 2.7);
    dummy.scale.set(size * 1.45, size, size); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(i, new T.Color().setHSL(.20 + random() * .1, .26 + random() * .14, .45 + random() * .24));
  }
  leaves.castShadow = leaves.receiveShadow = true; root.add(leaves);
  const bark = new T.MeshStandardMaterial({ color: tree ? 0x6c6651 : 0x667344, roughness: .98 }), stems = [];
  function stem(a, b, radius) {
    const start = new T.Vector3(...a), d = new T.Vector3(...b).sub(start);
    const mesh = new T.Mesh(new T.CylinderGeometry(radius * .45, radius, d.length(), 7), bark);
    mesh.position.copy(start.addScaledVector(d, .5)); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); mesh.updateMatrix(); stems.push(mesh.geometry.applyMatrix4(mesh.matrix));
  }
  if (tree) {
    stem([0, 0, 0], [.1, 4.8, .1], .19);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4; stem([.04, 2.5 + i * .2, 0], [Math.cos(a) * 1.9, 4 + random() * 1.7, Math.sin(a) * 1.9], .062);
    }
  } else {
    for (let i = 0; i < 13; i++) {
      const a = i * 2.4; stem([0, .05, 0], [Math.cos(a) * .55, .6 + random() * .5, Math.sin(a) * .55], .015);
    }
  }
  if (!tree && !shrub) {
    const petals = [];
    for (let i = 0; i < 4; i++) {
      const g = new T.SphereGeometry(1, 8, 5), p = new T.Mesh(g);
      const a = i * Math.PI / 2; p.scale.set(.032, .014, .046); p.rotation.y = a;
      p.position.set(Math.sin(a) * .032, 0, Math.cos(a) * .032); p.updateMatrix(); petals.push(g.applyMatrix4(p.matrix));
    }
    const floret = T.mergeGeometries(petals); petals.forEach(g => g.dispose());
    const heads = options.blooms ?? 13, perHead = 48;
    const flowers = new T.InstancedMesh(floret, new T.MeshStandardMaterial({ color: 0xffffff, roughness: .74, side: T.DoubleSide }), heads * perHead);
    const center = new T.Vector3(), normal = new T.Vector3();
    for (let h = 0; h < heads; h++) {
      const a = h * 2.4, r = .2 + random() * .61;
      center.set(Math.cos(a) * r, .82 + random() * .46, Math.sin(a) * r);
      const size = .16 + random() * .075;
      for (let j = 0; j < perHead; j++) {
        const y = 1 - 1.65 * j / (perHead - 1), radial = Math.sqrt(1 - y * y), phi = j * 2.399963;
        normal.set(Math.cos(phi) * radial, y, Math.sin(phi) * radial);
        dummy.position.copy(center).addScaledVector(normal, size);
        dummy.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), normal);
        dummy.scale.setScalar(.72 + random() * .26); dummy.updateMatrix(); flowers.setMatrixAt(h * perHead + j, dummy.matrix);
        const hue = options.color === 'blue' ? .61 + random() * .05 : .88 + random() * .065;
        flowers.setColorAt(h * perHead + j, new T.Color().setHSL(hue, .36 + random() * .17, .61 + random() * .17));
      }
    }
    flowers.receiveShadow = true; root.add(flowers);
  }
  const branches = new T.Mesh(T.mergeGeometries(stems), bark); branches.castShadow = branches.receiveShadow = true; root.add(branches);
  stems.forEach(g => g.dispose());
  return { root };
};
