// 榉树分枝与疏密细叶, 透光叶片随风轻动; 原点接土面.
FPS.models.zelkovaTree = (T, o = {}) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D(); let seed = o.seed ?? 71;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function add(g, color) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose();
    pose.updateMatrix(); flat.applyMatrix4(pose.matrix); const colors = [], c = new T.Color(color);
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  function branch(a, b, radius) {
    const start = new T.Vector3(...a), d = new T.Vector3(...b).sub(start);
    pose.position.copy(start.addScaledVector(d, .5)); pose.scale.set(1, 1, 1);
    pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
    add(new T.CylinderGeometry(radius * .38, radius, d.length(), 7), 0x736451);
  }
  branch([0, -.08, 0], [.13, 3.3, 0], .2);
  const centers = [];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = .7 + (i % 4) * .4, center = [Math.cos(a) * r, 3.6 + random() * 1.5, Math.sin(a) * r]; centers.push(center);
    branch([.06, 1.6 + i * .075, 0], center, .075);
    pose.position.set(...center); pose.rotation.set(0, a, .25); pose.scale.set(.85, .7, .9);

  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .96 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  const leaf = new T.PlaneGeometry(1, 1, 1, 2), p = leaf.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x * Math.cos(y * Math.PI) * .7, y, .12 * Math.cos(y * Math.PI) - Math.abs(x) * .2); }
  leaf.computeVertexNormals();
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;const ctx=canvas.getContext('2d');
  ctx.beginPath();ctx.moveTo(32,0);ctx.bezierCurveTo(63,30,62,87,32,128);ctx.bezierCurveTo(2,87,1,30,32,0);ctx.clip();
  const gradient=ctx.createLinearGradient(0,0,64,0);gradient.addColorStop(0,'#bccb9c');gradient.addColorStop(.5,'#f0edd4');gradient.addColorStop(1,'#bccb9c');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,128);ctx.strokeStyle='#a3b381';ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(32,0);ctx.lineTo(32,128);ctx.stroke();
  for(let y=20;y<118;y+=16)for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(32,y);ctx.lineTo(32+side*28,y-15);ctx.stroke();}
  const map=leafTexture(canvas);
  const foliageMaterial = new T.MeshStandardMaterial({ map, alphaTest: .42, alphaToCoverage: true, side: T.DoubleSide, roughness: .9 });
  const wind = { value: 0 }, coverage = { value: 1 };
  foliageMaterial.customProgramCacheKey = () => 'zelkova-foliage-v3';
  foliageMaterial.onBeforeCompile = shader => {
    shader.uniforms.leafTime = wind; shader.uniforms.leafCoverage = coverage;
    shader.vertexShader = 'uniform float leafTime; varying vec3 canopyNormal;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        canopyNormal=normalize(normalMatrix*(instanceMatrix[3].xyz-vec3(0.,3.25,0.)));
        float phase=dot(instanceMatrix[3].xyz,vec3(.73,.19,.51));
        transformed.z+=sin(leafTime*1.7+phase)*.055*length(position.xz);
        transformed.x+=sin(leafTime*.8+phase*1.3)*.018;
      #endif
    `);
    // 中心对称的覆盖率过渡保留叶片面积, 避免 MSAA 的默认单侧过渡使树冠变稀.
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `#ifdef USE_ALPHATEST
      #ifdef ALPHA_TO_COVERAGE
        if(leafCoverage>.5) {
          float width=max(fwidth(diffuseColor.a),.001);
          diffuseColor.a=smoothstep(alphaTest-.5*width,alphaTest+.5*width,diffuseColor.a);
          if(diffuseColor.a==0.) discard;
        } else {
          if(diffuseColor.a<alphaTest) discard;
          diffuseColor.a=1.;
        }
      #else
        if(diffuseColor.a<alphaTest) discard;
      #endif
    #endif`);
    shader.fragmentShader = 'uniform float leafCoverage; varying vec3 canopyNormal;\n'+shader.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      float leafFootprint=max(length(dFdx(vMapUv)),length(dFdy(vMapUv)));
      normal=normalize(mix(normal,normalize(canopyNormal),mix(.65,.95,smoothstep(.1,.4,leafFootprint))));`).replace('#include <lights_fragment_begin>', `
      #include <lights_fragment_begin>
      #if NUM_DIR_LIGHTS > 0
        float transmission=pow(max(dot(geometryViewDir,-directionalLights[0].direction),0.),3.);
        reflectedLight.directDiffuse+=diffuseColor.rgb*directLight.color*(.055+.30*transmission);
      #endif
    `);
  };
  foliageMaterial.userData.wind = wind; foliageMaterial.userData.coverage = coverage;

  function leafTexture(canvas) {
    // RGB 扩边不改 alpha, 避免 mipmap 和斜向采样把透明黑底混进叶缘.
    const w=canvas.width, h=canvas.height, data=canvas.getContext('2d').getImageData(0,0,w,h).data;
    const queue=new Int32Array(w*h), visited=new Uint8Array(w*h); let head=0, tail=0;
    for(let i=0;i<w*h;i++) if(data[i*4+3]>240) { visited[i]=1; queue[tail++]=i; }
    while(head<tail) {
      const i=queue[head++], x=i%w, y=Math.floor(i/w);
      for(const j of [x?i-1:-1,x+1<w?i+1:-1,y?i-w:-1,y+1<h?i+w:-1]) {
        if(j<0||visited[j]) continue; visited[j]=1; queue[tail++]=j;
        for(let c=0;c<3;c++) data[j*4+c]=data[i*4+c];
      }
    }
    const pixels=new Uint8Array(data.length);
    for(let y=0;y<h;y++) pixels.set(data.subarray(y*w*4,(y+1)*w*4),(h-1-y)*w*4);
    const map=new T.DataTexture(pixels,w,h); map.colorSpace=T.SRGBColorSpace; map.anisotropy=4;
    map.generateMipmaps=true; map.minFilter=T.LinearMipmapLinearFilter; map.magFilter=T.LinearFilter; map.needsUpdate=true; return map;
  }

  const count = 7800, leaves = new T.InstancedMesh(leaf, foliageMaterial, count), color = new T.Color();
  for (let i = 0; i < count; i++) {
    const center = centers[i % centers.length], a = random() * Math.PI * 2, y = random() * 2 - 1, r = Math.sqrt(1 - y * y) * Math.cbrt(random());
    pose.position.set(center[0] + Math.cos(a) * r, center[1] + y * .84, center[2] + Math.sin(a) * r);
    pose.rotation.set(random() * 3, a, random() * 3); pose.scale.setScalar(.16 + random() * .12); pose.updateMatrix(); leaves.setMatrixAt(i, pose.matrix);
    color.set([0x698445, 0x83934f, 0x567442, 0x8b9957][i % 4]); leaves.setColorAt(i, color);
  }
  // 线性 MSAA 世界缓冲使用覆盖率; 原生画布与单采样倒影保留硬裁切, 避免编码后混合造成额外跳色.
  leaves.onBeforeRender = renderer => { foliageMaterial.userData.coverage.value = renderer.getRenderTarget()?.samples > 1 ? 1 : 0; };
  leaves.castShadow = leaves.receiveShadow = true; leaves.raycast = () => {}; root.add(leaves); return { root, update(dt) { wind.value += dt; } };
};
