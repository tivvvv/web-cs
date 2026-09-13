// 公园湖水, 岸线由场景共享给挖地与碰撞; 单次绘制水面, 复用太阳阴影, 无反射相机或屏幕采样.
FPS.models.parkPond = (T, o = {}) => {
  const root = new T.Group(), { width: w, depth: d, shore, bottom: floor, waterLevel: waterY, rim: bankY } = o;
  const bank = new T.Shape(); bank.moveTo(-w / 2, -d / 2); bank.lineTo(w / 2, -d / 2); bank.lineTo(w / 2, d / 2); bank.lineTo(-w / 2, d / 2); bank.closePath();
  const hole = new T.Shape(); shore.forEach(([x, z], i) => i ? hole.lineTo(x, -z) : hole.moveTo(x, -z)); hole.closePath(); bank.holes.push(hole);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(128, 128); let seed = 741;
  for (let i = 0; i < 128 * 128; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; const v = 180 + (seed / 4294967296 - .5) * 23; pixels.data.set([v, v, v, 255], i * 4); }
  ctx.putImageData(pixels, 0, 0);
  for (let i = 0; i < 580; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed % 128, y = seed >>> 16 & 127;
    ctx.strokeStyle = i % 2 ? '#989898' : '#c3c3c3'; ctx.lineWidth = .4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(i) * .7, y + 2); ctx.stroke();
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
  const bankGeometry = new T.ExtrudeGeometry(bank, { depth: bankY - floor, bevelEnabled: false, steps: 1 }).rotateX(-Math.PI / 2).translate(0, floor, 0);
  const uv = bankGeometry.attributes.uv, p = bankGeometry.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2, p.getZ(i) / 2);
  const rim = new T.Mesh(bankGeometry, [new T.MeshStandardMaterial({ color: 0x71884b, map, roughness: 1 }), new T.MeshStandardMaterial({ color: 0x666f59, roughness: 1 })]); rim.castShadow = rim.receiveShadow = true; root.add(rim);
  // 256² 数据纹理只在创建时计算; R 为离岸距离, G/B 为细颗粒与缓慢色差, 不作为颜色贴图解码.
  const shoreCanvas = document.createElement('canvas'); shoreCanvas.width = shoreCanvas.height = 256;
  const shoreCtx = shoreCanvas.getContext('2d'), shorePixels = shoreCtx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const px = ((x + .5) / 256 - .5) * w, pz = (.5 - (y + .5) / 256) * d; let nearest = Infinity;
    for (let j = 0; j < shore.length; j++) {
      const [ax, az] = shore[j], [bx, bz] = shore[(j + 1) % shore.length], dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
      nearest = Math.min(nearest, (px - ax - t * dx) ** 2 + (pz - az - t * dz) ** 2);
    }
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    shorePixels.data.set([Math.min(1, Math.sqrt(nearest) / 3) * 255, 170 + (seed >>> 24) / 3, 128 + 55 * Math.sin(px * .55) * Math.cos(pz * .43), 255], (y * 256 + x) * 4);
  }
  shoreCtx.putImageData(shorePixels, 0, 0); const shoreMap = new T.CanvasTexture(shoreCanvas);
  // 水面仍为 40 个三角形, 不移动顶点; 近处风纹改变法线, 远处按像素覆盖范围淡出.
  const vertices = [0, waterY, 0], indices = [];
  for (const [x, z] of shore) vertices.push(x, waterY, z);
  for (let i = 0; i < shore.length; i++) indices.push(0, (i + 1) % shore.length + 1, i + 1);
  const waterGeometry = new T.BufferGeometry(); waterGeometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); waterGeometry.setIndex(indices); waterGeometry.computeVertexNormals();
  const impacts = new Float32Array(6 * 4); for (let i = 0; i < 6; i++) impacts[i * 4 + 2] = -100;
  let impactSlot = 0; const hitLocal = new T.Vector3();
  const waterUniforms = { lakeHits: { value: impacts }, lakeTime: { value: 0 }, lakeShore: { value: shoreMap }, lakeSize: { value: new T.Vector2(w, d) } };
  // 复用标准材质的灯光/阴影绑定和顶点阶段, 片元只算湖水, 不执行额外 PBR 光照或反射相机.
  const material = new T.MeshStandardMaterial({ roughness: .3 });
  material.customProgramCacheKey = () => 'park-lake-water-v2';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, waterUniforms);
    shader.vertexShader = 'varying vec3 lakeWorld; varying vec2 lakeLocal;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>', '#include <worldpos_vertex>\n lakeWorld=(modelMatrix*vec4(transformed,1.)).xyz; lakeLocal=transformed.xz;'
    );
    shader.fragmentShader = `
      uniform float lakeTime; uniform vec4 lakeHits[6]; uniform sampler2D lakeShore; uniform vec2 lakeSize;
      varying vec3 lakeWorld; varying vec2 lakeLocal;
      #include <common>
      #include <packing>
      #include <lights_pars_begin>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
      #include <fog_pars_fragment>
      void main(){
        vec2 p=lakeLocal; vec3 view=normalize(cameraPosition-lakeWorld);
        vec3 bed=texture2D(lakeShore,p/lakeSize+.5).rgb;
        float bankDistance=bed.r*3., shallows=smoothstep(.15,2.3,bankDistance);
        float footprint=max(length(dFdx(p)),length(dFdy(p)));
        float detail=(1.-smoothstep(18.,70.,distance(cameraPosition,lakeWorld)))*(1.-smoothstep(.05,.22,footprint));
        vec2 slope=.027*cos(dot(p,vec2(.65,.38))+lakeTime*.28)*vec2(1.,.58)
          +.018*cos(dot(p,vec2(.4,-.83))-lakeTime*.22)*vec2(.48,-1.);
        slope+=detail*(.012*cos(dot(p,vec2(7.1,3.7))+lakeTime*.85)*vec2(1.,.52)
          +.009*cos(dot(p,vec2(3.3,-8.2))-lakeTime*.65)*vec2(.4,-1.));
        float wind=.8+.2*sin(dot(p,vec2(.19,.31))-lakeTime*.12);
        slope*=wind*mix(.35,1.,smoothstep(.05,1.1,bankDistance));
        float foam=0.;
        for(int i=0;i<6;i++) {
          float age=lakeTime-lakeHits[i].z;
          if(age>=0. && age<.85) {
            vec2 delta=p-lakeHits[i].xy;
            if(dot(delta,delta)<1.21) {
              float r=length(delta), radius=.08+age*1.1, band=max(.065,footprint);
              float ring=(1.-smoothstep(.014,band,abs(r-radius)))*pow(1.-age/.85,2.)*lakeHits[i].w*.065/band;
              slope+=delta/max(r,.03)*ring*.065; foam+=ring;
            }
          }
        }
        vec3 n=normalize(vec3(-slope.x,1.,-slope.y));
        float fresnel=.025+.9*pow(1.-max(dot(n,view),0.),5.);
        vec3 water=mix(vec3(.19,.245,.17),vec3(.028,.155,.145),shallows);
        water+=(bed.g-.8)*.045*(1.-shallows)+(bed.b-.5)*.014;
        // 温和的近岸透光纹理, 随风缓移, 不生成海浪白边或第二层透明水面.
        float caustic=pow(.5+.5*sin(dot(p,vec2(2.3,1.6))+lakeTime*.38)*sin(dot(p,vec2(-1.7,2.1))-lakeTime*.29),5.);
        water+=vec3(.032,.038,.022)*caustic*(1.-shallows)*detail;
        water*=mix(.78,1.,smoothstep(.015,.24,bankDistance));
        vec3 reflected=reflect(-view,n);
        vec3 sky=mix(vec3(.46,.63,.69),vec3(.13,.34,.51),smoothstep(0.,.9,reflected.y));
        float shadow=getShadowMask();
        vec3 color=mix(water*(.56+.44*shadow),sky*(.78+.22*shadow),fresnel);
        #if NUM_DIR_LIGHTS > 0
          vec3 sun=inverseTransformDirection(directionalLights[0].direction,viewMatrix);
          float glint=pow(max(dot(n,normalize(sun+view)),0.),mix(55.,130.,detail));
          color+=vec3(.88,.79,.60)*glint*(.55+.35*detail)*shadow;
        #endif
        color=mix(color,vec3(.56,.73,.73),min(.38,foam*.3)*(.7+.3*shadow));
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`;
  };
  const water = new T.Mesh(waterGeometry, material); water.receiveShadow = true; root.add(water);
  return {
    root,
    onHit(hit, api) {
      if (hit.object !== water) return;
      root.worldToLocal(hitLocal.copy(hit.point));
      impacts.set([hitLocal.x, hitLocal.z, waterUniforms.lakeTime.value, .65 + .35 * Math.abs(hit.direction.y)], impactSlot * 4);
      impactSlot = (impactSlot + 1) % 6;
      api.effect('waterSplash', { position: hit.point, direction: hit.direction, limit: 6 });
      return { bulletmark: false, impact: false };
    },
    update(dt) { waterUniforms.lakeTime.value += dt; },
    dispose() { shoreMap.dispose(); map.dispose(); }
  };
};
