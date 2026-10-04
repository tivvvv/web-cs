// 山地混合林. 树干合批, 树冠按空间分组, 远处只减细叶且保留每棵树的主体轮廓.
FPS.models.mountainWoodland = (T, o = {}) => {
  const root = new T.Group();
  if (!o.trees?.length) return { root };
  const trunks = [], ranges = [], rayGeometries = [], patches = new Map(), details = [];
  let trunkIndices = 0;
  const pose = new T.Object3D(), axis = new T.Vector3(0, 1, 0);
  const world = new T.Vector3(), viewer = new T.Vector3();
  const makeTexture = (size, draw, repeat = false) => {
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      pixels.set(draw(x, y, size), (y * size + x) * 4);
    }
    const map = new T.DataTexture(pixels, size, size);
    map.colorSpace = T.SRGBColorSpace; map.generateMipmaps = true;
    map.minFilter = T.LinearMipmapLinearFilter; map.magFilter = T.LinearFilter;
    map.anisotropy = 8; map.needsUpdate = true;
    if (repeat) map.wrapS = map.wrapT = T.RepeatWrapping;
    return map;
  };
  const bark = makeTexture(256, (x, y) => {
    const v = 183 + Math.sin(x * .27 + Math.sin(y * .018)) * 22 + Math.sin(x * .73 + y * .007) * 9;
    return [v, v - 12, v - 24, 255];
  }, true);
  const foliageMaps = ['broadleaf', 'pine'].map(kind => makeTexture(128, (x, y, n) => {
    const u = x / n, v = y / n; let alpha = 0;
    const pine = kind === 'pine', count = pine ? 18 : 8;
    // 透明边缘仍填叶色, mipmap 缩小后不产生黑色外圈.
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1), cx = .15 + t * .7, cy = .5 + Math.sin(i * 2.4) * (pine ? .13 : .16);
      const angle = (i % 2 ? 1 : -1) * (pine ? .8 : .55), dx = u - cx, dy = v - cy;
      const a = dx * Math.cos(angle) + dy * Math.sin(angle), b = -dx * Math.sin(angle) + dy * Math.cos(angle);
      const r = (a / (pine ? .14 : .12)) ** 2 + (b / (pine ? .018 : .068)) ** 2;
      alpha = Math.max(alpha, Math.max(0, Math.min(1, (1 - r) * 7)));
    }
    const vein = Math.abs(v - .5) < .012 && u > .1 && u < .88;
    alpha = Math.max(alpha, vein ? 1 : 0);
    const shade = 230 - Math.abs(v - .5) * 50 + Math.sin(u * 43) * 7;
    return [shade - 14, shade, shade - 35, Math.round(alpha * 255)];
  }));
  const materials = foliageMaps.map(map => {
    const coverage = { value: 0 };
    const material = new T.MeshStandardMaterial({ map, alphaTest: .45, alphaToCoverage: true,
      side: T.DoubleSide, roughness: 1 });
    material.customProgramCacheKey = () => 'mountain-foliage-coverage-v1';
    material.onBeforeCompile = shader => {
      shader.uniforms.leafCoverage = coverage;
      // 细叶以树冠平均朝向受光, 减少转视角时正反面法线翻转造成的明暗跳动.
      shader.vertexShader = 'varying vec3 canopyUp;\n' + shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\ncanopyUp = normalize(normalMatrix * vec3(0., 1., 0.));');
      shader.fragmentShader = 'uniform float leafCoverage; varying vec3 canopyUp;\n' + shader.fragmentShader.replace('#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\nnormal = normalize(mix(normal, normalize(canopyUp), .78));')
        .replace('#include <alphatest_fragment>', `
        #ifdef USE_ALPHATEST
          #ifdef ALPHA_TO_COVERAGE
            if (leafCoverage > .5) {
              float width = max(fwidth(diffuseColor.a), .001);
              diffuseColor.a = smoothstep(alphaTest - .5 * width, alphaTest + .5 * width, diffuseColor.a);
              if (diffuseColor.a == 0.) discard;
            } else {
              if (diffuseColor.a < alphaTest) discard;
              diffuseColor.a = 1.;
            }
          #else
            if (diffuseColor.a < alphaTest) discard;
          #endif
        #endif
      `);
    };
    material.userData.coverage = coverage;
    return material;
  });
  const cards = new T.PlaneGeometry(1, 1), tint = new T.Color();
  for (const [index, tree] of (o.trees ?? []).entries()) {
    const [tx, ty, tz] = tree.position, s = tree.scale ?? 1, yaw = tree.yaw ?? 0;
    const pine = tree.kind === 'pine', kind = pine ? 1 : 0, centers = [];
    const from = trunkIndices, bounds = new T.Box3();
    let seed = tree.seed ?? index + 830;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const transform = v => new T.Vector3(...v).multiplyScalar(s).applyAxisAngle(axis, yaw).add(new T.Vector3(tx, ty, tz));
    function branch(a, b, radius, endRadius) {
      const start = transform(a), end = transform(b), delta = end.clone().sub(start);
      const g = new T.CylinderGeometry(endRadius * s, radius * s, delta.length(), 7, 2);
      pose.position.copy(start).add(end).multiplyScalar(.5);
      pose.quaternion.setFromUnitVectors(axis, delta.normalize()); pose.scale.setScalar(1); pose.updateMatrix();
      g.applyMatrix4(pose.matrix); g.computeBoundingBox(); bounds.union(g.boundingBox);
      trunkIndices += g.index.count; trunks.push(g);
    }
    const height = pine ? 7.4 : 5.9, wind=[(random()-.25)*.15,(random()-.5)*.12];
    const age=random(),treeTint=new T.Color(pine?0x596e49:0x6f834b).lerp(new T.Color(pine?0x7a8155:0x8a8c5b),age*.22);
    branch([0, -.09, 0], [.1, height, -.07], .21, .022);
    if (pine) {
      for (let tier = 0; tier < 5; tier++) {
        const y = 2.82 + tier * .88 + Math.sin(tier*1.9+index)*.12, radius = 1.98 - tier * .3;
        for (let j = 0; j < 5; j++) {
          const a = j * Math.PI * 2 / 5 + tier * .66 + random() * .42,reach=radius*(.78+random()*.34),droop=.15+random()*.35;
          const end = [Math.cos(a) * reach + wind[0]*y, y - droop, Math.sin(a) * reach + wind[1]*y];
          branch([.03, y, 0], end, .035, .006);
          centers.push({ point: [end[0] * .7, y-droop*.35+(random()-.5)*.23, end[2] * .7], radius: [reach * .42, .34+random()*.12, reach * .38] });
        }
      }
      centers.push({ point: [.05+wind[0]*5, 7.05, wind[1]*5], radius: [.4, .5, .4] });
    } else {
      for (let j = 0; j < 10; j++) {
        const a = j * 2.399 + random() * .25, r = 1.3 + random() * .9;
        const joint = [Math.cos(a) * r * .48, 3.6 + random() * .5, Math.sin(a) * r * .48];
        const end = [Math.cos(a) * r+wind[0]*4, 4.15 + random() * 1.5, Math.sin(a) * r+wind[1]*4];
        branch([0, 2.5 + j % 3 * .25, 0], joint, .064, .025);
        branch(joint, end, .025, .005);
        centers.push({ point: end, radius: [.86+random()*.25, .62+random()*.2, .85+random()*.28] });
      }
      centers.push({ point: [.1, 5.7, 0], radius: [1, .75, 1] });
    }
    const key = Math.floor((tx + 50) / 50) + '/' + Math.floor((tz + 38) / 50) + '/' + kind;
    if (!patches.has(key)) patches.set(key, { kind, trees: [] });
    const layers = [[], []];
    for (let layer = 0; layer < 2; layer++) for (let j = 0; j < (layer ? 250 : pine ? 600 : 450); j++) {
      const c = centers[j % centers.length], a = random() * Math.PI * 2, v = random() * 2 - 1;
      const r = Math.sqrt(1 - v * v) * Math.cbrt(random()), p = transform([
        c.point[0] + Math.cos(a) * r * c.radius[0], c.point[1] + v * c.radius[1], c.point[2] + Math.sin(a) * r * c.radius[2]]);
      pose.position.copy(p); pose.rotation.set(random() * Math.PI, a + yaw, random() * Math.PI);
      // 主体叶簇一直存在, 细叶在近处补纹理; 两层无共面重叠.
      pose.scale.set((layer ? .25 : .98) * s, (layer ? .2 : .78) * s, 1); pose.updateMatrix();
      const light = .78 + .17 * Math.min(1, (c.point[1] - 2.5) / (height - 2.5)) + random() * .15;
      tint.copy(treeTint).multiplyScalar(light);
      layers[layer].push({ matrix: pose.matrix.clone(), color: tint.clone() });
    }
    patches.get(key).trees.push(layers);
    ranges.push({ from, count: trunkIndices - from, bounds });
  }
  if (trunks.length) {
    const mesh = new T.Mesh(T.mergeGeometries(trunks), new T.MeshStandardMaterial({ map: bark,
      bumpMap: bark, bumpScale: .009, color: 0x9b9180, roughness: 1 }));
    mesh.name = 'mountain-tree-trunks'; mesh.castShadow = mesh.receiveShadow = true;
    // 保持一个绘制网格, 命中先按树的包围体剔除, 只访问该树的原始索引范围.
    const proxies = ranges.map(({ from, count, bounds }) => {
      const g = new T.BufferGeometry();
      for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) g.setAttribute(name, attribute);
      g.setIndex(mesh.geometry.index); g.setDrawRange(from, count); g.boundingBox = bounds;
      g.boundingSphere = { center: bounds.getCenter(new T.Vector3()), radius: bounds.getSize(new T.Vector3()).length() / 2 };
      const proxy = new T.Mesh(g, mesh.material); proxy.matrixWorld = mesh.matrixWorld;
      rayGeometries.push(g); return proxy;
    });
    mesh.raycast = (ray, hits) => {
      for (const proxy of proxies) {
        const first = hits.length; proxy.raycast(ray, hits);
        for (let i = first; i < hits.length; i++) hits[i].object = mesh;
      }
    };
    root.add(mesh); trunks.forEach(g => g.dispose());
  }
  for (const patch of patches.values()) for (let layer = 0; layer < 2; layer++) {
    // 轮流收集各树叶片, 距离减量不会让整个组尾部的树消失.
    const items = [], lists = patch.trees.map(tree => tree[layer]);
    for (let i = 0; i < Math.max(...lists.map(list => list.length)); i++) for (const list of lists) if (list[i]) items.push(list[i]);
    const mesh = new T.InstancedMesh(cards, materials[patch.kind], items.length);
    items.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.color); });
    mesh.name = layer ? 'mountain-canopy-detail' : 'mountain-canopy';
    mesh.receiveShadow = true; mesh.castShadow = !layer; mesh.raycast = () => {};
    mesh.onBeforeRender = renderer => { mesh.material.userData.coverage.value = renderer.getRenderTarget()?.samples > 1 ? 1 : 0; };
    // 一次生成所有缓冲和完整包围体, 后续减量只变 count, 不触发资源上传或重建.
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); root.add(mesh);
    if (layer) details.push({ mesh, center: mesh.boundingSphere.center.clone(), full: items.length, density: 1 });
  }
  return { root, update(dt, api) {
    if (!api?.player?.position) return;
    viewer.copy(api.player.position); root.updateWorldMatrix(true, false);
    const blend = 1 - Math.exp(-Math.max(0, dt) / .35);
    for (const detail of details) {
      world.copy(detail.center).applyMatrix4(root.matrixWorld);
      const target = Math.max(0, Math.min(1, (95 - viewer.distanceTo(world)) / 55));
      detail.density += (target - detail.density) * blend;
      detail.mesh.count = Math.round(detail.full * detail.density);
    }
  }, dispose() { rayGeometries.forEach(g => g.dispose()); bark.dispose(); foliageMaps.forEach(map => map.dispose()); } };
};
