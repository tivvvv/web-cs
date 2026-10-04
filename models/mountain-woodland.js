// 山地混合林. 树干合批, 树冠按空间分组, 细叶连续缩小而非逐帧增减实例.
FPS.models.mountainWoodland = (T, o = {}) => {
  const root = new T.Group();
  if (!o.trees?.length) return { root };
  const trunks = [], ranges = [], rayGeometries = [], patches = new Map(), details = [];
  let trunkIndices = 0;
  const pose = new T.Object3D(), axis = new T.Vector3(0, 1, 0);
  const world = new T.Vector3(), viewer = new T.Vector3();
  // 根系直接采样山体的三角高度场, 缺少地形规格时保留独立树模型的原造型.
  function surface(x,z) {
    const [x0,z0,x1,z1]=o.bounds,cols=o.columns,rows=o.rows,h=o.heights;
    const u=Math.max(0,Math.min(cols-1,(x-x0)/(x1-x0)*(cols-1))),v=Math.max(0,Math.min(rows-1,(z-z0)/(z1-z0)*(rows-1)));
    const i=Math.min(cols-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),a=u-i,b=v-j,k=j*cols+i;
    return a+b<=1?h[k]+a*(h[k+1]-h[k])+b*(h[k+cols]-h[k]):h[k+cols+1]+(a-1)*(h[k+cols+1]-h[k+cols])+(b-1)*(h[k+cols+1]-h[k+1]);
  }
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
    material.customProgramCacheKey = () => 'mountain-foliage-coverage-v2';
    material.onBeforeCompile = shader => {
      shader.uniforms.leafCoverage = coverage;
      // 平均朝向不随叶片正反面翻转; 细叶在各自世界位置连续淡出, 主体冠层保持原尺寸.
      shader.vertexShader = 'attribute float canopyDetail; varying vec3 canopyUp;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        canopyUp = normalize(normalMatrix * vec3(0., 1., 0.));
        #ifdef USE_INSTANCING
          if(canopyDetail>.5) {
            float distanceToLeaf=length((modelViewMatrix*vec4(instanceMatrix[3].xyz,1.)).xyz);
            transformed*=1.-smoothstep(40.,95.,distanceToLeaf);
          }
        #endif`);
      shader.fragmentShader = 'uniform float leafCoverage; varying vec3 canopyUp;\n' + shader.fragmentShader.replace('#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\nnormal = normalize(canopyUp);')
        .replace('#include <alphatest_fragment>', `
        #ifdef USE_ALPHATEST
          #ifdef ALPHA_TO_COVERAGE
            if (leafCoverage > .5) {
              float width = max(fwidth(diffuseColor.a), .001);
              float covered = smoothstep(alphaTest - .5 * width, alphaTest + .5 * width, diffuseColor.a);
              // 未解析的针叶保留 mipmap 的平均覆盖率, 不在裁切阈值附近成片跳动.
              vec2 footprint=vec2(textureSize(map,0));
              float pixels=max(length(dFdx(vMapUv)*footprint),length(dFdy(vMapUv)*footprint));
              diffuseColor.a=mix(covered,diffuseColor.a,smoothstep(1.,3.,pixels));
              if (diffuseColor.a <= .001) discard;
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
  const cards = [0,1].map(layer=>{
    const geometry=new T.PlaneGeometry(1,1);
    geometry.setAttribute('canopyDetail',new T.Float32BufferAttribute(Array(geometry.attributes.position.count).fill(layer),1));
    return geometry;
  }), tint = new T.Color();
  for (const [index, tree] of (o.trees ?? []).entries()) {
    const [tx, ty, tz] = tree.position, s = tree.scale ?? 1, yaw = tree.yaw ?? 0;
    const pine = tree.kind === 'pine', kind = pine ? 1 : 0, centers = [];
    const from = trunkIndices, bounds = new T.Box3();
    let seed = tree.seed ?? index + 830;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const transform = v => new T.Vector3(...v).multiplyScalar(s).applyAxisAngle(axis, yaw).add(new T.Vector3(tx, ty, tz));
    function append(g) {
      g.computeBoundingBox(); bounds.union(g.boundingBox); trunkIndices += g.index.count; trunks.push(g);
    }
    function branch(a, b, radius, endRadius) {
      const start = transform(a), end = transform(b), delta = end.clone().sub(start);
      // 直枝不需要纵向中间环; 冠内细枝用六边截面, 根干保留七边截面.
      const g = new T.CylinderGeometry(endRadius * s, radius * s, delta.length(), radius<=.035?6:7, 1);
      pose.position.copy(start).add(end).multiplyScalar(.5);
      pose.quaternion.setFromUnitVectors(axis, delta.normalize()); pose.scale.setScalar(1); pose.updateMatrix();
      g.applyMatrix4(pose.matrix); append(g);
    }
    const height = pine ? 7.4 : 5.9, wind=[(random()-.25)*.15,(random()-.5)*.12];
    const age=random(),treeTint=new T.Color(pine?0x596e49:0x6f834b).lerp(new T.Color(pine?0x7a8155:0x8a8c5b),age*.22);
    branch([0, -.09, 0], [.1, height, -.07], .21, .022);
    if(o.heights&&o.bounds&&o.columns>=2&&o.rows>=2) {
      const p=[],uv=[],indices=[],sides=8,angle=k=>k*Math.PI*2/sides+yaw;
      let top=ty+.72*s;
      for(let k=0;k<sides;k++)top=Math.max(top,surface(tx+Math.cos(angle(k))*.4*s,tz+Math.sin(angle(k))*.4*s)+.16*s);
      for(let ring=0;ring<4;ring++)for(let k=0;k<=sides;k++) {
        const a=angle(k),r=[.36,.4,.28,.18][ring]*s*(1+.065*Math.sin(a*3+index)),x=tx+Math.cos(a)*r,z=tz+Math.sin(a)*r;
        const ground=surface(x,z),t=[0,0,.56,1][ring],y=ring===0?ground-.055*s:(ground+.065*s)*(1-t)+top*t;
        p.push(x,y,z);uv.push(k/sides*.8,(y-ty)*.72);
        if(ring<3&&k<sides){const n=ring*(sides+1)+k;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
      }
      const cap=p.length/3;p.push(tx,top,tz);uv.push(.4,(top-ty)*.72);
      for(let k=0;k<sides;k++)indices.push(cap,3*(sides+1)+k+1,3*(sides+1)+k);
      // 下缘和支根底部逐点埋入坡面, 外露部分从根颈渐细到地表, 不形成悬空圆环.
      for(let rootIndex=0;rootIndex<5;rootIndex++) {
        const a=yaw+rootIndex*2.399+Math.sin(index*1.7+rootIndex)*.22,length=(.75+.22*Math.sin(index+rootIndex)**2)*s;
        const from=p.length/3;
        for(let j=0;j<4;j++)for(let k=0;k<5;k++) {
          const t=j/3,bend=Math.sin(t*Math.PI)*.09*s,cross=k*Math.PI/4,w=(.12*(1-t)**1.3+.014)*s;
          const r=.13*s+length*t,side=Math.cos(cross)*w+bend,x=tx+Math.cos(a)*r-Math.sin(a)*side,z=tz+Math.sin(a)*r+Math.cos(a)*side;
          const lift=Math.sin(cross)*w*.9-.024*s;
          p.push(x,surface(x,z)+lift,z);uv.push(k/4*.32,(r/s)*.72);
          if(j<3&&k<4){const n=from+j*5+k;indices.push(n,n+5,n+1,n+1,n+5,n+6);}
        }
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();append(g);
    }
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
      const light = (.78 + .17 * Math.min(1, (c.point[1] - 2.5) / (height - 2.5)) + random() * .15)*(.86+.14*Math.abs(v));
      tint.copy(treeTint).multiplyScalar(light);
      layers[layer].push({ matrix: pose.matrix.clone(), color: tint.clone() });
    }
    patches.get(key).trees.push(layers);
    ranges.push({ from, count: trunkIndices - from, bounds });
  }
  if (trunks.length) {
    const mesh = new T.Mesh(T.mergeGeometries(trunks), new T.MeshStandardMaterial({ map: bark,
      bumpMap: bark, bumpScale: .009, color: 0x9b9180, roughness: 1, shadowSide: T.FrontSide }));
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
    // 按树交错装配叶簇, 同组共享几何和材质.
    const items = [], lists = patch.trees.map(tree => tree[layer]);
    for (let i = 0; i < Math.max(...lists.map(list => list.length)); i++) for (const list of lists) if (list[i]) items.push(list[i]);
    const mesh = new T.InstancedMesh(cards[layer], materials[patch.kind], items.length);
    items.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.color); });
    mesh.name = layer ? 'mountain-canopy-detail' : 'mountain-canopy';
    // 主冠层仍向地面投影; 叶面用静态冠层明暗, 避免小叶相互接收粗影图产生碎闪.
    mesh.receiveShadow = false; mesh.castShadow = !layer; mesh.raycast = () => {};
    mesh.onBeforeRender = renderer => { mesh.material.userData.coverage.value = renderer.getRenderTarget()?.samples > 1 ? 1 : 0; };
    // 包围体按完整几何计算; 只有整批都超过淡出距离才停绘, 不裁去仍可见的细叶.
    mesh.computeBoundingBox(); mesh.computeBoundingSphere(); root.add(mesh);
    if (layer) details.push({ mesh, center: mesh.boundingSphere.center.clone(), radius: mesh.boundingSphere.radius, full: items.length });
  }
  return { root, update(dt, api) {
    if (!api?.player?.position) return;
    viewer.copy(api.player.position); root.updateWorldMatrix(true, false);
    const scale=root.matrixWorld.getMaxScaleOnAxis();
    for (const detail of details) {
      world.copy(detail.center).applyMatrix4(root.matrixWorld);
      // 额外余量覆盖脚底/眼睛高度差和台阶视角偏移; 停绘时叶片已经完全收为零面积.
      detail.mesh.count = viewer.distanceTo(world)>98+detail.radius*scale?0:detail.full;
    }
  }, dispose() { rayGeometries.forEach(g => g.dispose()); bark.dispose(); foliageMaps.forEach(map => map.dispose()); } };
};
