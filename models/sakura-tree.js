// 横展樱花树, 弯曲主干, 扇形枝冠, 细密五瓣花与枝间透光; 不生成飘落粒子.
FPS.models.sakuraTree = (T, o = {}) => {
  const root = new T.Group(), parts = [], pose = new T.Object3D(); let seed = o.seed ?? 39;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function add(g, color) {
    const flat = g.index ? g.toNonIndexed() : g; if (flat !== g) g.dispose(); pose.updateMatrix(); flat.applyMatrix4(pose.matrix);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < flat.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    flat.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(flat);
  }
  function branch(a, b, radius) {
    const start = new T.Vector3(...a), d = new T.Vector3(...b).sub(start);
    pose.position.copy(start.addScaledVector(d, .5)); pose.scale.set(1, 1, 1);
    pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
    add(new T.CylinderGeometry(radius * .55, radius, d.length(), 7), 0x69554d);
  }
  branch([0, -.08, 0], [.22, 1.55, .1], .21); branch([.22, 1.55, .1], [-.15, 2.8, 0], .14);
  const centers = [];
  for (let i = 0; i < 20; i++) {
    const a = i * 2.4, r = .65 + (i % 5) * .36;
    const center = [Math.cos(a) * r, 3.5 + random() * .7 - r * .1, Math.sin(a) * r]; centers.push(center);
    branch([.1, 1.9 + (i % 3) * .2, 0], [center[0] * .65, 3.1, center[2] * .65], .057);
    branch([center[0] * .65, 3.1, center[2] * .65], center, .029);
    pose.position.set(...center); pose.rotation.set(random(), a, 0); pose.scale.set(.82, .56, .82);

  }
  const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .91 }));
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  // 一张透明花簇贴图画出圆润五瓣和细蕊, 避免远近都呈五角纸片.
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=256; const ctx=canvas.getContext('2d');
  for(const [x,y,r] of [[62,55,28],[134,45,25],[200,79,30],[91,130,34],[161,148,27],[48,205,26],[191,216,31]]) {
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*.4;
      ctx.save();ctx.translate(x,y);ctx.rotate(a);
      const gradient=ctx.createRadialGradient(0,0,0,0,-r*.7,r);
      gradient.addColorStop(0,'#d394a5');gradient.addColorStop(.55,'#f1d7e0');gradient.addColorStop(1,'#fff3f1');
      ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(0,0);
      ctx.bezierCurveTo(-r*.56,-r*.3,-r*.53,-r*1.13,0,-r*.9);
      ctx.bezierCurveTo(r*.53,-r*1.13,r*.56,-r*.3,0,0);ctx.fill();ctx.restore();
    }
    ctx.fillStyle='#d7af6c';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#c79f85';ctx.lineWidth=.65;
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r*.34,y+Math.sin(a)*r*.34);ctx.stroke();}
  }
  const map=leafTexture(canvas);
  const flower=new T.PlaneGeometry(.32,.32,2,2), fp=flower.attributes.position;
  for(let i=0;i<fp.count;i++) fp.setZ(i,.012*(1.-Math.abs(fp.getX(i))/.16)); flower.computeVertexNormals();
  const foliageMaterial = new T.MeshStandardMaterial({ map, alphaTest: .42, alphaToCoverage: true, side: T.DoubleSide, roughness: .92 });
  const wind = { value: 0 }, coverage = { value: 1 };
  foliageMaterial.customProgramCacheKey = () => 'sakura-petals-v3';
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
    // 近景保持花瓣曲面, 花簇小于数像素时平滑光照, 避免细小正反面不断跳亮.
    shader.fragmentShader = 'uniform float leafCoverage; varying vec3 canopyNormal;\n'+shader.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      float leafFootprint=max(length(dFdx(vMapUv)),length(dFdy(vMapUv)));
      normal=normalize(mix(normal,normalize(canopyNormal),.95*smoothstep(.1,.4,leafFootprint)));`).replace('#include <lights_fragment_begin>', `
      #include <lights_fragment_begin>
      #if NUM_DIR_LIGHTS > 0
        float transmission=pow(max(dot(geometryViewDir,-directionalLights[0].direction),0.),3.);
        reflectedLight.directDiffuse+=diffuseColor.rgb*directLight.color*(.055+.30*transmission);
      #endif
    `);
  };
  foliageMaterial.userData.wind = wind; foliageMaterial.userData.coverage = coverage;

  function leafTexture(canvas) {
    // 给透明区填邻近花瓣的 RGB, alpha 与花簇空隙不变; 远处滤波不再产生黑色花边.
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

  const count = 7400, blooms = new T.InstancedMesh(flower, foliageMaterial, count), color = new T.Color();
  for (let i = 0; i < count; i++) {
    const center = centers[i % centers.length], a = random() * Math.PI * 2, y = random() * 2 - 1, r = Math.sqrt(1 - y * y) * Math.cbrt(random());
    pose.position.set(center[0] + Math.cos(a) * r * .88, center[1] + y * .64, center[2] + Math.sin(a) * r * .88);
    pose.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    pose.scale.setScalar(.62 + random() * .5); pose.updateMatrix(); blooms.setMatrixAt(i, pose.matrix);
    color.set([0xf8e2e8,0xffeeed,0xebcedb,0xf4dce6][i%4]); blooms.setColorAt(i, color);
  }
  // 线性 MSAA 世界缓冲使用覆盖率; 原生画布与单采样倒影保留硬裁切, 避免编码后混合造成额外跳色.
  blooms.onBeforeRender = renderer => { foliageMaterial.userData.coverage.value = renderer.getRenderTarget()?.samples > 1 ? 1 : 0; };
  blooms.castShadow = blooms.receiveShadow = true; blooms.raycast = () => {}; root.add(blooms); return { root, update(dt) { wind.value += dt; } };
};
