// 林下草丛与少量落叶实例化, 自动避让园路/铺装/湖区; 缓丘采样共用地形格.
FPS.models.parkGroundcover = (T, o = {}) => {
  const root = new T.Group(), vertices = [], leafVertices = [], pose = new T.Object3D(), tint = new T.Color();
  let seed = 1883; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const kind = (x, z) => {
    let k = 0; for (const r of o.surfaces) if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) k = r[4];
    if (o.water) {
      let inside = false;
      for (let i = 0, j = o.water.length - 1; i < o.water.length; j = i++) {
        const [ax, az] = o.water[i], [bx, bz] = o.water[j];
        if ((az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az)) inside = !inside;
      }
      if (inside) return -1;
    }
    return k;
  };
  const nearTrail = (x, z) => o.trails.some(({ points, width }) => points.some(p => Math.hypot(x - p[0], z - p[1]) < width / 2 + .32));
  const excluded = (x, z) => (o.exclusions ?? []).some(([a, b, c, d]) => x > a && x < c && z > b && z < d);
  const level = (x, z) => {
    const c = o.cells.find(({ size: s, offset: p }) => Math.abs(x - p[0]) <= s[0] / 2 && Math.abs(z - p[2]) <= s[2] / 2);
    if (!c) return .024;
    const u = (x - c.offset[0]) / c.size[0] + .5, v = (z - c.offset[2]) / c.size[2] + .5, [a, b, d, e] = c.surface;
    return u + v <= 1 ? a + (b - a) * u + (d - a) * v : e + (d - e) * (1 - u) + (b - e) * (1 - v);
  };
  // 五片弯叶共用一个草丛几何, 每株只变化尺度和色调.
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4, h = .7 + i % 3 * .16;
    const at = (t, side) => {
      const r = .34 * t * t, w = .034 * Math.sin(t * Math.PI);
      return [Math.sin(a) * r + Math.cos(a) * w * side, h * t, Math.cos(a) * r - Math.sin(a) * w * side];
    };
    for (let j = 0; j < 3; j++) {
      const t = j / 3, u = (j + 1) / 3;
      if (j) vertices.push(...at(t, -1), ...at(t, 1), ...at(u, 1));
      if (j < 2) vertices.push(...at(t, -1), ...at(u, 1), ...at(u, -1));
    }
  }
  const grassGeometry = new T.BufferGeometry(); grassGeometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); grassGeometry.computeVertexNormals();
  const density = o.lush ? 8 : 22, total = o.patches.reduce((n, p) => n + p[4] * density, 0);
  const grassMaterial = new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 1 });
  const wind = { value: 0 };
  grassMaterial.customProgramCacheKey = () => 'grass-wind-transmission-v1';
  grassMaterial.onBeforeCompile = shader => {
    shader.uniforms.grassTime = wind;
    shader.vertexShader = 'uniform float grassTime; varying float grassHeight;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      grassHeight=clamp(position.y,0.,1.);
      #ifdef USE_INSTANCING
        float phase=dot(instanceMatrix[3].xyz,vec3(.45,0.,.61));
        transformed.x+=sin(grassTime*1.4+phase)*.10*grassHeight*grassHeight;
        transformed.z+=cos(grassTime*.9+phase)*.06*grassHeight*grassHeight;
      #endif
    `);
    shader.fragmentShader = 'varying float grassHeight;\n'+shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      diffuseColor.rgb*=mix(.55,1.1,smoothstep(0.,.8,grassHeight));
    `).replace('#include <lights_fragment_begin>', `
      #include <lights_fragment_begin>
      #if NUM_DIR_LIGHTS > 0
        float transmission=pow(max(dot(geometryViewDir,-directionalLights[0].direction),0.),3.);
        reflectedLight.directDiffuse+=diffuseColor.rgb*directLight.color*(.04+.24*transmission)*grassHeight;
      #endif
    `);
  };

  const grass = new T.InstancedMesh(grassGeometry, grassMaterial, total); let index = 0;
  for (const [x, z, w, d, count] of o.patches) for (let i = 0; i < count * density; i++) {
    const a = random() * Math.PI * 2, r = Math.sqrt(random()), px = x + Math.cos(a) * w * .5 * r, pz = z + Math.sin(a) * d * .5 * r;
    if (kind(px, pz) !== 2 || nearTrail(px, pz) || excluded(px, pz) || o.trees.some(p => Math.hypot(px - p[0], pz - p[1]) < .6)) continue;
    const clustering = .5 + .5 * Math.sin(px * 1.8 + Math.sin(pz * .8) * 2);
    if (random() > .45 + clustering * .45) continue;
    pose.position.set(px, level(px, pz) + .002, pz); pose.rotation.set(0, a, 0);
    pose.scale.set(.38 + random() * .35, (o.lush ? .16 : .09) + random() * .13 + clustering * .06, .38 + random() * .35); pose.updateMatrix(); grass.setMatrixAt(index, pose.matrix);
    tint.set([0x5b733e, 0x718248, 0x667b42, 0x526b39][i % 4]); grass.setColorAt(index++, tint);
  }
  grass.count = index; grass.receiveShadow = true; grass.raycast = () => {}; root.add(grass);
  const outline = [[0, .008, -.09], [.045, .003, -.02], [.032, .008, .05], [0, .016, .12], [-.038, .006, .04], [-.04, .002, -.025]];
  for (let i = 0; i < 6; i++) leafVertices.push(0, .018, 0, ...outline[i], ...outline[(i + 1) % 6]);
  const leaf = new T.BufferGeometry(); leaf.setAttribute('position', new T.Float32BufferAttribute(leafVertices, 3)); leaf.computeVertexNormals();
  const litter = new T.InstancedMesh(leaf, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 1 }), o.trees.length * 15); index = 0;
  for (const [x, z] of o.trees) for (let i = 0; i < 15; i++) {
    const a = random() * Math.PI * 2, r = .5 + random() * 1.8, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (kind(px, pz) < 0 || nearTrail(px, pz) || excluded(px, pz)) continue;
    pose.position.set(px, level(px, pz) + .006, pz); pose.rotation.set(0, a, 0); pose.scale.setScalar(.55 + random() * .6); pose.updateMatrix(); litter.setMatrixAt(index, pose.matrix);
    tint.set([0x89744e, 0x9d8a5d, 0x6f754a, 0xa1936a][i % 4]); litter.setColorAt(index++, tint);
  }
  litter.count = index; litter.receiveShadow = true; litter.raycast = () => {}; root.add(litter);
  return { root, update(dt) { wind.value += dt; } };
};
