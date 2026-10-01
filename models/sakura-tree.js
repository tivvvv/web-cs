// 横展樱花树, 弯曲主干, 扇形枝冠, 细密五瓣花与枝间透光; 不生成飘落粒子.
FPS.models.sakuraTree = (() => {
  let barkMaterial;
  return (T, o = {}) => {
    const root = new T.Group(), parts = [], pose = new T.Object3D(); let seed = o.seed ?? 39;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    // 沿二次曲线生成连续渐细木枝, 分枝根部与主干相交.
    function branch(a, b, radius, tipRadius = radius * .28, bend = .06) {
      const start = new T.Vector3(...a), end = new T.Vector3(...b), mid = start.clone().lerp(end, .5);
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
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); parts.push(g);
    }
    if (!barkMaterial) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 512;
      const ctx = c.getContext('2d'), pixels = ctx.createImageData(256, 512); let grainSeed = 103;
      const noise = () => ((grainSeed = (Math.imul(grainSeed, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 256; x++) {
        const fiber = Math.sin(x * .19 + Math.sin(y * .014) * 1.7) * Math.sin(x * .045 + Math.sin(y * .02));
        const v = 173 + fiber * 23 + (noise() - .5) * 16; pixels.data.set([v, v - 10, v - 15, 255], (y * 256 + x) * 4);
      }
      ctx.putImageData(pixels, 0, 0);
      for (let i = 0; i < 200; i++) { ctx.fillStyle = 'rgba(57,43,36,.22)'; ctx.fillRect(noise() * 256, noise() * 512, 2 + noise() * 13, .7 + noise()); }
      const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
      barkMaterial = new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .008, roughness: .94, color: 0xa29487 });
    }
    const foot = [0, -.08, 0], stem = [-.08, 3.3, .05];
    branch(foot, stem, .22, .045, .09);
    const centers = [];
    for (let i = 0; i < 12; i++) {
      const a = i * 2.399 + random() * .45, r = 1.05 + random() * 1.35;
      const start = [.06 - .14 * (i % 4) / 4, 2.15 + (i % 4) * .24, .04];
      const joint = [Math.cos(a) * r * .61, 3.12 + random() * .72, Math.sin(a) * r * .61];
      const center = [Math.cos(a + .13) * r, 3.6 + random() * 1.05 - r * .08, Math.sin(a + .13) * r];
      branch(start, joint, .072 + random() * .015, .034, Math.cos(a) * .14);
      branch(joint, center, .037, .012, Math.sin(a) * .1); centers.push(center);
      for (const side of [-1, 1]) { const tip = [center[0] + Math.cos(a + side * .9) * .43, center[1] + .12, center[2] + Math.sin(a + side * .9) * .43]; branch(center, tip, .015, .004, .025); }
    }
    const mesh = new T.Mesh(T.mergeGeometries(parts), barkMaterial);
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

    const count = 6000, blooms = new T.InstancedMesh(flower, foliageMaterial, count), color = new T.Color();
    for (let i = 0; i < count; i++) {
      const center = centers[i % centers.length], a = random() * Math.PI * 2, y = random() * 2 - 1, r = Math.sqrt(1 - y * y) * Math.cbrt(random());
      pose.position.set(center[0] + Math.cos(a) * r * .88, center[1] + y * (.42 + i % 3 * .1), center[2] + Math.sin(a) * r * .88);
      pose.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      pose.scale.setScalar(.62 + random() * .5); pose.updateMatrix(); blooms.setMatrixAt(i, pose.matrix);
      color.set([0xf9ecec,0xfff3ee,0xe9ced7,0xf2dfe6][i%4]); color.multiplyScalar(.84 + .16 * Math.min(1, (pose.position.y - 3) / 1.8)); blooms.setColorAt(i, color);
    }
    // 线性 MSAA 世界缓冲使用覆盖率; 原生画布与单采样倒影保留硬裁切, 避免编码后混合造成额外跳色.
    blooms.onBeforeRender = renderer => { foliageMaterial.userData.coverage.value = renderer.getRenderTarget()?.samples > 1 ? 1 : 0; };
    blooms.castShadow = blooms.receiveShadow = true; blooms.raycast = () => {}; root.add(blooms); return { root, update(dt) { wind.value += dt; } };
  };
})();
