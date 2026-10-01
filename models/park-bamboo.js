// 园墙旁成片竹林: 错落竹竿, 节环与细长折叶; 竹竿/枝梢合批, 叶片实例化, 不加独立动画循环.
FPS.models.parkBamboo = (T, o = {}) => {
  const root = new T.Group(), stems = [], rings = [], sprouts = [], culmIndices = [], culmFaces = [], pose = new T.Object3D(), up = new T.Vector3(0, 1, 0), tint = new T.Color();
  let stemVertices = 0, stemIndices = 0, rayGeometry;
  let seed = 1921; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  function branch(a, b, radius, target = stems, color = 0x728550, solidCulm = false) {
    const delta = b.clone().sub(a); pose.position.copy(a).addScaledVector(delta, .5); pose.quaternion.setFromUnitVectors(up, delta.clone().normalize()); pose.scale.set(1, 1, 1); pose.updateMatrix();
    const g = new T.CylinderGeometry(radius * .72, radius, delta.length() + .005, 9, 1, true), p = g.attributes.position, c = new T.Color(color), rgb = [];
    for (let i = 0; i < p.count; i++) { const shade = .92 + .08 * Math.sin(p.getY(i) * 4); rgb.push(c.r * shade, c.g * shade, c.b * shade); }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); target.push(g.applyMatrix4(pose.matrix));
    if (target === stems) {
      if (solidCulm) {
        for (let i = 0; i < g.index.count; i++) culmIndices.push(g.index.getX(i) + stemVertices);
        for (let i = 0; i < g.index.count; i += 3) culmFaces.push((stemIndices + i) / 3);
      }
      stemVertices += p.count; stemIndices += g.index.count;
    }
  }
  const culms = o.culms ?? (o.clumps ?? [[0, 0, 1.4, 13, 6, 0]]).flatMap(([x, z, radius, count, height, ground = 0]) => Array.from({ length: count }, (_, i) => {
    const a = i * 2.4 + random() * .4, r = radius * Math.sqrt((i + .5) / count);
    return { foot: [x + Math.cos(a) * r, ground, z + Math.sin(a) * r], height: height * (.72 + random() * .28), radius: .046 + random() * .026, lean: [Math.cos(a) * .35, Math.sin(a) * .35], seed: 1921 + i * 97 };
  }));
  for (const c of culms) {
    seed = c.seed ?? 1921;
    const [dx, dz] = c.lean ?? [0, 0], a = Math.atan2(dz, dx), h = c.height, width = c.radius;
    const foot = new T.Vector3(...c.foot), top = foot.clone().add(new T.Vector3(dx, h, dz));
    const nodes = Math.ceil(h / .48), line = top.clone().sub(foot);
    branch(foot, top, width, stems, 0x728550, true);
    for (let j = 1; j < nodes; j++) {
      const at = foot.clone().addScaledVector(line, j / nodes);
      branch(at.clone().add(new T.Vector3(0, -.012, 0)), at.clone().add(new T.Vector3(0, .012, 0)), width * 1.15, rings, 0x9d9d70);
    }
    for (let j = 0; j < 5; j++) for (const side of [-1, 1]) {
      const y = .46 + j * .117, start = foot.clone().addScaledVector(line, y), angle = a + j * 2.4 + side * .8, reach = .7 + random() * .55;
      const tip = start.clone().add(new T.Vector3(Math.cos(angle) * reach, .17 + random() * .26, Math.sin(angle) * reach));
      branch(start, tip, .012, stems, 0x667947);
      for (let s = 0; s < 3; s++) {
        const origin = start.clone().lerp(tip, .45 + s * .24), yaw = angle + (s - 1) * .7;
        const end = origin.clone().add(new T.Vector3(Math.cos(yaw) * .34, .1, Math.sin(yaw) * .34));
        branch(origin, end, .006, stems, 0x667947);
        for (let k = 0; k < 9; k++) sprouts.push({ point: origin.clone().lerp(end, k / 8), angle: yaw + (k % 2 ? .7 : -.7), size: .32 + random() * .18 });
      }
    }
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const v = 235 + Math.sin(x * .46 + Math.sin(y * .034) * .4) * 12 + (random() - .5) * 6;
    pixels.data.set([v, v, v, 255], (y * 128 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
  for (const batch of [stems, rings]) if (batch.length) {
    const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ vertexColors: true, map, roughness: .8 }));
    if (batch === stems) {
      // 命中仍使用竹竿的真实三角面, 细枝只负责画面; 共享顶点, 不增加渲染网格或逐帧建模.
      rayGeometry = new T.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) rayGeometry.setAttribute(name, mesh.geometry.attributes[name]);
      rayGeometry.setIndex(culmIndices);
      const proxy = new T.Mesh(rayGeometry, mesh.material); proxy.matrixWorld = mesh.matrixWorld;
      mesh.raycast = (raycaster, hits) => {
        const first = hits.length; proxy.raycast(raycaster, hits);
        for (let i = first; i < hits.length; i++) { hits[i].object = mesh; hits[i].faceIndex = culmFaces[hits[i].faceIndex]; }
      };
    } else mesh.raycast = () => {};
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose());
  }
  const outline = [[0, .015, -.5], [-.1, 0, -.2], [-.08, 0, .18], [0, .025, .5], [.08, 0, .18], [.1, 0, -.2]], points = [], colors = [], geometry = new T.BufferGeometry();
  for (let i = 0; i < 6; i++) { points.push(0, .04, 0, ...outline[i], ...outline[(i + 1) % 6]); colors.push(.95, 1, .9, .8, .91, .74, .85, .94, .8); }
  geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3)); geometry.computeVertexNormals();
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const leaves = new T.InstancedMesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .9 }), sprouts.length);
  sprouts.forEach(({ point, angle, size }, i) => {
    pose.position.copy(point); pose.rotation.set(-.15 + random() * .65, -angle + Math.PI / 2, .2 * Math.sin(i)); pose.scale.setScalar(size); pose.updateMatrix(); leaves.setMatrixAt(i, pose.matrix);
    tint.set([0x6e854a, 0x849457, 0x596f3d, 0x99a665][i % 4]); leaves.setColorAt(i, tint);
  });
  leaves.castShadow = leaves.receiveShadow = true; leaves.raycast = () => {}; root.add(leaves);
  return { root, dispose() { rayGeometry?.dispose(); map.dispose(); } };
};
