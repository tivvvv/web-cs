// 公园乔木: 连续分枝, 树皮纹理与细叶冠层, 不用实体球团填充树冠; 静态资源只在本模型内共享.
FPS.models.parkTree = (() => {
  let leafGeometry, barkMaterial, foliageMaterial, shadowMaterial;
  return (T, o = {}) => {
    const root = new T.Group(), branches = [], crowns = [], pose = new T.Object3D();
    let seed = o.seed ?? 71; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    if (!leafGeometry) {
      leafGeometry = new T.PlaneGeometry(.54,1,1,2).rotateX(-Math.PI/2);
      const lp=leafGeometry.attributes.position, colors=[];
      for(let i=0;i<lp.count;i++) { lp.setY(i,.035*(1.-Math.abs(lp.getZ(i))*2)); colors.push(.93,.98,.88); }
      leafGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3)); leafGeometry.computeVertexNormals();
      foliageMaterial = new T.MeshStandardMaterial({ vertexColors: true, alphaTest: .42, alphaToCoverage: true, roughness: .9, side: T.DoubleSide });
      const wind = { value: 0 }, coverage = { value: 1 };
      foliageMaterial.customProgramCacheKey = () => 'park-tree-foliage-v3';
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
        // 覆盖率在原裁切阈值两侧平滑, 不用单侧渐变缩小叶片; 普通目标保留硬裁切回退.
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

      const leafCanvas = document.createElement('canvas'); leafCanvas.width=64; leafCanvas.height=128;
      const leafCtx=leafCanvas.getContext('2d'), leafGradient=leafCtx.createLinearGradient(0,0,64,0);
      leafGradient.addColorStop(0,'#a6b89a'); leafGradient.addColorStop(.48,'#ebefdd'); leafGradient.addColorStop(1,'#bbc9a6');
      leafCtx.save();leafCtx.beginPath();leafCtx.moveTo(32,0);leafCtx.bezierCurveTo(57,28,69,78,32,128);leafCtx.bezierCurveTo(-5,78,7,28,32,0);leafCtx.clip();
      leafCtx.fillStyle=leafGradient; leafCtx.fillRect(0,0,64,128);
      leafCtx.strokeStyle='#899d77'; leafCtx.lineWidth=.8;
      leafCtx.beginPath(); leafCtx.moveTo(32,0); leafCtx.lineTo(32,128); leafCtx.stroke();
      for(let y=20;y<118;y+=14) for(const side of [-1,1]) {
        leafCtx.beginPath(); leafCtx.moveTo(32,y); leafCtx.quadraticCurveTo(32+side*13,y-5,32+side*29,y-16); leafCtx.stroke();
      }
      leafCtx.restore();
      foliageMaterial.map = leafTexture(leafCanvas);
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
      const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 512);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 256; x++) {
        const fiber = Math.sin(x * .24 + Math.sin(y * .025) * .9) * Math.sin(x * .071 + Math.sin(y * .014) * 2.4);
        const v = 154 + fiber * 27 + (random() - .5) * 15, i = (y * 256 + x) * 4;
        pixels.data.set([v, v - 8, v - 21, 255], i);
      }
      ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
      map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
      barkMaterial = new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .012, roughness: 1, color: 0xb5a593, shadowSide: T.FrontSide });
      // 阴影图每像素约 7 厘米, 用冠簇轮廓替代数千片细叶的亚像素投影; 保留较大的透光孔隙.
      const size=64, shadowPixels=new Uint8Array(size*size*4);
      for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
        const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1,a=Math.atan2(v,u);
        const edge=.86+.07*Math.sin(a*5)+.04*Math.cos(a*9),r=Math.hypot(u,v)/edge;
        let opacity=Math.max(0,Math.min(1,(1-r)*6));
        for(const [cx,cy,radius]of [[-.28,.16,.17],[.3,-.23,.16],[.05,.46,.13]])
          opacity*=Math.max(0,Math.min(1,(Math.hypot(u-cx,v-cy)/radius-1)*4));
        shadowPixels.set([255,255,255,Math.round(opacity*255)],(y*size+x)*4);
      }
      const shadowMap=new T.DataTexture(shadowPixels,size,size);shadowMap.generateMipmaps=true;
      shadowMap.minFilter=T.LinearMipmapLinearFilter;shadowMap.magFilter=T.LinearFilter;shadowMap.needsUpdate=true;
      shadowMaterial=new T.MeshBasicMaterial({map:shadowMap,alphaTest:.45,side:T.DoubleSide,colorWrite:false,depthWrite:false});
    }
    function leafTexture(canvas) {
      // 只向透明区延伸 RGB, 保留原始 alpha; 缩小采样时不会混入黑底形成跳动的暗边.
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
    // 沿二次曲线生成连续渐细木枝, 分枝根部与主干相交.
    function branch(a, b, radius, taper = .42) {
      const tipRadius = radius * taper, bend = radius > .12 ? .035 : .08;
      const start = a.clone(), end = b.clone(), mid = start.clone().lerp(end, .5);
      mid.x += bend; mid.z -= bend * .6;
      const positions = [], uv = [], indices = [], rings = radius > .12 ? 9 : 5, sides = radius > .12 ? 12 : 8;
      const axis = new T.Vector3(0, 1, 0), q = new T.Object3D(), vertex = new T.Vector3();
      for (let j = 0; j <= rings; j++) {
        const t = j / rings, point = start.clone().multiplyScalar((1 - t) ** 2).addScaledVector(mid, 2 * t * (1 - t)).addScaledVector(end, t * t);
        const tangent = mid.clone().sub(start).multiplyScalar(1 - t).addScaledVector(end.clone().sub(mid), t).normalize();
        q.quaternion.setFromUnitVectors(axis, tangent);
        for (let k = 0; k <= sides; k++) {
          const angle = k * Math.PI * 2 / sides, r = (radius * (1 - t ** 1.35) + tipRadius * t ** 1.35) * (1 + .028 * Math.sin(angle * 3 + t * 4));
          vertex.set(Math.cos(angle) * r, 0, Math.sin(angle) * r).applyQuaternion(q.quaternion).add(point);
          positions.push(vertex.x, vertex.y, vertex.z); uv.push(k / sides * r * 9, point.y * .72);
          if (j < rings && k < sides) { const n = j * (sides + 1) + k; indices.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2); }
        }
      }
      // 连接处保持开放, 地下根部与末端细枝封口; 所有木枝合批.
      for (const j of [0, rings]) { if (j ? tipRadius > radius * .4 : start.y > 0) continue; const p = j ? end : start, n = positions.length / 3; positions.push(p.x, p.y, p.z); uv.push(.5, j ? 1 : 0);
        for (let k = 0; k < sides; k++) { const v = j * (sides + 1) + k; indices.push(...(j ? [n, v + 1, v] : [n, v, v + 1])); }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); branches.push(g);
    }
    const maple = o.kind === 'maple', bend = (random() - .5) * .24, spread = o.spread ?? 1, growth = (.85 + random() * .3) * (o.growth ?? 1);
    const foot = new T.Vector3(0, -.09, 0), stem = new T.Vector3(bend - .12, 3.05 * growth, -.05);
    branch(foot, stem, .22, .25);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * .4, start = new T.Vector3(Math.sin(a) * .36, -.045, Math.cos(a) * .36);
      branch(start, new T.Vector3(bend * .1, .52, 0), .085, .4);
    }
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4 + random() * .35, reach = ((maple ? 1.8 : 1.35) + random() * 1.35) * spread;
      const junction = new T.Vector3(Math.sin(a) * reach * .58 + bend, (2.9 + random() * 1.4) * growth, Math.cos(a) * reach * .58);
      const attachY = (1.95 + i * .11) * growth, attachX = bend - .12 * (attachY / growth - 1.75) / 1.3;
      branch(new T.Vector3(attachX, attachY, .08 - .13 * (attachY / growth - 1.75) / 1.3), junction, .067 + random() * .012);
      for (let j = 0; j < 3; j++) {
        const angle = a + (j - 1) * .7, tip = new T.Vector3(Math.sin(angle) * reach, junction.y + (maple ? .15 : .35) + random() * .75, Math.cos(angle) * reach);
        branch(junction, tip, .031, .25); crowns.push({ tip, radius: (.54 + random() * .55) * Math.sqrt(spread) });
      }
    }
    crowns.push({ tip: new T.Vector3(bend, (maple ? 4.6 : 5.1) * growth, 0), radius: .95 });
    const wood = new T.Mesh(T.mergeGeometries(branches), barkMaterial); wood.castShadow = wood.receiveShadow = true; root.add(wood); branches.forEach(g => g.dispose());
    const count = Math.round((maple ? 6400 : 8400) * spread ** 1.4), leaves = new T.InstancedMesh(leafGeometry, foliageMaterial, count), tint = new T.Color();
    for (let i = 0; i < count; i++) {
      const { tip, radius } = crowns[i % crowns.length], a = random() * Math.PI * 2, y = random() * 2 - 1, r = Math.sqrt(1 - y * y) * Math.cbrt(random());
      pose.position.set(tip.x + Math.cos(a) * r * radius, tip.y + y * radius * .73, tip.z + Math.sin(a) * r * radius);
      pose.rotation.set((random() - .5) * 1.8, a, (random() - .5) * 1.4);
      const size = .17 + random() * .1; pose.scale.set(size * (maple ? 1.15 : .9), size, size); pose.updateMatrix(); leaves.setMatrixAt(i, pose.matrix);
      tint.set((maple ? [0x647541, 0x839052, 0x586a38, 0x8b9259] : [0x58713c, 0x708447, 0x4d6636, 0x869654])[i % 4]);
      tint.multiplyScalar(.8 + .2 * Math.min(1, (pose.position.y - 3) / 2.8)); leaves.setColorAt(i, tint);
    }
    // 线性 MSAA 世界缓冲使用覆盖率; 原生画布与单采样倒影保留硬裁切, 避免编码后混合造成额外跳色.
    leaves.onBeforeRender = renderer => { foliageMaterial.userData.coverage.value = renderer.getRenderTarget()?.samples > 1 ? 1 : 0; };
    // 可见细叶只使用冠层明暗, 不接收粗影图中的自阴影; 风动不改变静态树影.
    leaves.castShadow = leaves.receiveShadow = false; leaves.raycast = () => {}; root.add(leaves);
    const shadowParts=[];
    for(const [i,crown]of crowns.entries())for(let side=0;side<3;side++) {
      const g=new T.PlaneGeometry(2,2);
      if(side===1)g.rotateY(Math.PI/2);if(side===2)g.rotateX(-Math.PI/2);
      g.scale(crown.radius*.9,crown.radius*.73*.9,crown.radius*.9).rotateY(i*.67).translate(...crown.tip.toArray());shadowParts.push(g);
    }
    const shadowGeometry=T.mergeGeometries(shadowParts),shadowCount=shadowGeometry.index.count;
    shadowParts.forEach(g=>g.dispose());shadowGeometry.setDrawRange(0,0);
    const shadow=new T.InstancedMesh(shadowGeometry,shadowMaterial,1);shadow.name='park-canopy-shadow';shadow.castShadow=true;shadow.raycast=()=>{};
    shadow.computeBoundingBox();shadow.computeBoundingSphere();shadow.count=0;
    // 零实例让普通绘制在 Three.js 中跳过 GL 提交; 包围体在实例完整时固定, 不随阶段变化.
    shadow.onBeforeShadow=()=>{shadow.count=1;shadowGeometry.setDrawRange(0,shadowCount);};
    shadow.onAfterShadow=shadow.onBeforeRender=()=>{shadow.count=0;shadowGeometry.setDrawRange(0,0);};root.add(shadow);
    let time = 0; return { root, update(dt) { foliageMaterial.userData.wind.value = (time += dt); }, dispose() { leaves.dispose();shadow.dispose(); } };
  };
})();
