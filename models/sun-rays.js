// 轻量接触遮蔽与迎光光束. 单颜色缓冲, 半分辨率 AO, 无附近环境重投影或世界材质补丁.
FPS.models.sunRays = (T, o = {}) => {
  const root = new T.Group(), sun = new T.Vector3(...(o.sun ?? [-32, 48, -21])).normalize();
  const point = new T.Vector3(), facing = new T.Vector3(), size = new T.Vector2();
  const world = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, depthTexture: new T.DepthTexture(1, 1, T.UnsignedIntType) });
  const shafts = new T.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const occlusion = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, depthBuffer: false, minFilter: T.NearestFilter, magFilter: T.NearestFilter });
  const post = new T.Scene(), camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const vertexShader = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const samples = Math.max(16, Math.min(48, Math.round(o.samples ?? 32)));
  const radius = Math.max(.1, Math.min(1.2, o.aoRadius ?? .85)), distance = Math.max(5, Math.min(80, o.aoDistance ?? 40));
  const strength = Math.max(0, Math.min(.6, o.aoStrength ?? .42));
  let initialized = false, disposed = false;
  function supported(renderer) { return !disposed && root.visible && renderer.extensions.has('EXT_color_buffer_float'); }
  function initialize(renderer) {
    if (initialized) return;
    // 只查询一次 HDR/深度共同支持的采样数; 低能力设备仍能使用普通深度纹理.
    const gl = renderer.getContext();
    const counts = [gl.RGBA16F, gl.DEPTH_COMPONENT24].map(format => Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, format, gl.SAMPLES) ?? []));
    world.samples = [4, 2].find(n => n <= renderer.capabilities.maxSamples && counts.every(c => c.includes(n))) ?? 0;
    initialized = true;
  }
  const rays = new T.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false, vertexShader,
    uniforms: { uDepth: { value: world.depthTexture }, uSun: { value: new T.Vector2() }, uScale: { value: new T.Vector2() } },
    fragmentShader: `
      uniform sampler2D uDepth;
      uniform vec2 uSun,uScale;
      varying vec2 vUv;
      void main(){
        // 按相机视角限定散射范围, 避免向太阳累加时产生贯穿宽屏的长尾.
        float radius=length((vUv-uSun)*uScale);
        float envelope=1.-smoothstep(.12,.65,radius);
        if(envelope<=0.){gl_FragColor=vec4(0.,0.,0.,1.);return;}
        float light=0.;
        for(int i=0;i<${samples};i++){
          float t=(float(i)+.5)/float(${samples});
          vec2 p=mix(vUv,uSun,t*.97);
          if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,vec2(1.)))) continue;
          vec2 delta=(p-uSun)*uScale;
          light+=step(1.,texture2D(uDepth,p).r)*exp(-dot(delta,delta)*45.)*(1.-t*.4);
        }
        gl_FragColor=vec4(vec3(light*envelope/float(${samples})),1.);
      }
    `
  });
  const ao = new T.ShaderMaterial({
    depthTest: false, depthWrite: false, toneMapped: false, vertexShader,
    uniforms: { uDepth: { value: world.depthTexture }, uInverse: { value: new T.Matrix4() }, uProjection: { value: new T.Matrix4() }, uDepthSize: { value: new T.Vector2(1, 1) }, uRadius: { value: radius }, uDistance: { value: distance }, uStrength: { value: strength } },
    fragmentShader: `
      uniform sampler2D uDepth;
      uniform mat4 uInverse,uProjection;
      uniform vec2 uDepthSize;
      uniform float uRadius,uDistance,uStrength;
      varying vec2 vUv;
      vec3 positionAt(vec2 uv){
        vec4 p=uInverse*vec4(uv*2.-1.,texture2D(uDepth,uv).r*2.-1.,1.);
        return p.xyz/p.w;
      }
      vec3 surfaceNormal(vec3 p){
        // 每轴取深度更接近中心的一侧, 不让细格栅与背板跨边界的差分扭曲法线.
        vec2 texel=2./uDepthSize;
        vec3 left=p-positionAt(vUv-vec2(texel.x,0.)), right=positionAt(vUv+vec2(texel.x,0.))-p;
        vec3 down=p-positionAt(vUv-vec2(0.,texel.y)), up=positionAt(vUv+vec2(0.,texel.y))-p;
        vec3 normal=cross(abs(left.z)<abs(right.z)?left:right,abs(down.z)<abs(up.z)?down:up);
        float squared=dot(normal,normal);
        return squared>1.e-12?normal*inversesqrt(squared):vec3(0.,0.,1.);
      }
      void main(){
        float depth=texture2D(uDepth,vUv).r;
        if(depth>=.999999){gl_FragColor=vec4(1.,1.,1.,10000.);return;}
        vec3 p=positionAt(vUv);
        // 远处小于像素的接触细节不参与 AO, 避免深度量化形成条带并减少无效采样.
        if(-p.z>=uDistance){gl_FragColor=vec4(1.,1.,1.,-p.z);return;}
        vec3 normal=surfaceNormal(p);
        if(dot(normal,-p)<0.) normal=-normal;
        vec3 tangent=normalize(cross(normal,abs(normal.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.)));
        vec3 bitangent=cross(normal,tangent);
        // 固定采样方向; 偏移随像素的世界尺寸增长, 远处亚像素凸起不生成跳动的暗斑.
        float angle=.37, pixel=-p.z*2./(uProjection[1][1]*uDepthSize.y), bias=max(.025,pixel*1.5);
        float blocked=0.;
        for(int i=0;i<12;i++){
          float fi=float(i), a=angle+fi*2.399963;
          float h=.18+.7*fract(fi*.37), r=sqrt(1.-h*h);
          vec3 direction=tangent*cos(a)*r+bitangent*sin(a)*r+normal*h;
          float reach=uRadius*(.15+.85*(fi+1.)/12.);
          vec3 samplePosition=p+direction*reach;
          if(samplePosition.z>=-.05) continue;
          vec4 projected=uProjection*vec4(samplePosition,1.);
          vec2 uv=projected.xy/projected.w*.5+.5;
          if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))) continue;
          vec3 hit=positionAt(uv);
          float range=1.-smoothstep(uRadius*.6,uRadius*1.6,length(hit-p));
          float coverage=smoothstep(pixel*1.5,pixel*4.,reach);
          blocked+=smoothstep(bias,bias*2.,hit.z-samplePosition.z)*range*coverage;
        }
        float fade=1.-smoothstep(uDistance*.7,uDistance,-p.z);
        float value=1.-blocked/12.*uStrength*fade;
        gl_FragColor=vec4(vec3(value),-p.z);
      }
    `
  });
  const composite = new T.ShaderMaterial({
    depthTest: false, depthWrite: false, vertexShader,
    uniforms: { uAO: { value: occlusion.texture }, uAOSize: { value: new T.Vector2(1, 1) }, uNearFar: { value: new T.Vector2() }, uScene: { value: world.texture }, uDepth: { value: world.depthTexture }, uRays: { value: shafts.texture }, uTexel: { value: new T.Vector2(1, 1) }, uStrength: { value: 0 } },
    fragmentShader: `
      uniform sampler2D uScene,uDepth,uRays,uAO;
      uniform vec2 uAOSize,uNearFar;
      float linearDepth(float z){return uNearFar.x*uNearFar.y/(uNearFar.y-z*(uNearFar.y-uNearFar.x));}
      uniform vec2 uTexel;
      uniform float uStrength;
      varying vec2 vUv;
      void main(){
        vec3 color=texture2D(uScene,vUv).rgb;
        float depth=texture2D(uDepth,vUv).r, z=linearDepth(depth), aoValue=0., weights=0.;
        vec2 pixel=vUv/uAOSize-.5, base=floor(pixel), f=fract(pixel);
        // 容差包含同一斜面相邻像素的深度变化, 防止严格拒绝形成半分辨率横纹.
        float tolerance=max(.05,z*.002+min(fwidth(z)*2.,.5));
        for(int i=0;i<4;i++){
          vec2 offset=vec2(float(i-2*(i/2)),float(i/2));
          vec4 sampleAO=texture2D(uAO,(base+offset+.5)*uAOSize);
          vec2 w=mix(1.-f,f,offset);
          float weight=w.x*w.y*exp(-abs(sampleAO.a-z)/tolerance);
          aoValue+=sampleAO.r*weight; weights+=weight;
        }
        float visibility=depth<.999999&&weights>.0001?aoValue/weights:1.;
        // 单缓冲下采用保守的亮度权重, 高亮区域少压暗; 不声称分离直射与间接光.
        float brightness=dot(color,vec3(.2126,.7152,.0722));
        color*=1.-(1.-visibility)*mix(.8,.25,smoothstep(.4,1.6,brightness));
        // 高光保留暖日照, 暗部略带天空蓝; 小幅压暗画面边缘.
        float luminance=dot(color,vec3(.2126,.7152,.0722));
        color*=mix(vec3(.96,.985,1.025),vec3(1.025,1.,.965),smoothstep(.18,1.3,luminance));
        vec2 edge=vUv*(1.-vUv);
        color*=.94+.06*pow(clamp(edge.x*edge.y*16.,0.,1.),.3);
        // 全分辨率遮挡保留枝叶和屋檐轮廓, 不把前景及瞄准目标涂白.
        float light=0.;
        if(uStrength>0. && depth>=.999999){
          light=texture2D(uRays,vUv).r*.4;
          light+=(texture2D(uRays,vUv+vec2(uTexel.x,0.)).r+texture2D(uRays,vUv-vec2(uTexel.x,0.)).r
            +texture2D(uRays,vUv+vec2(0.,uTexel.y)).r+texture2D(uRays,vUv-vec2(0.,uTexel.y)).r)*.15;
        }
        light*=uStrength;
        gl_FragColor=vec4(color+vec3(1.,.86,.65)*light,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), rays); quad.frustumCulled = false; post.add(quad);
  return {
    root,
    async prepare(renderer) {
      if (!supported(renderer)) return;
      initialize(renderer);
      const target = renderer.getRenderTarget();
      try {
        for (const [material, destination] of [[ao, occlusion], [rays, shafts], [composite, target]]) {
          quad.material = material; renderer.setRenderTarget(destination);
          await renderer.compileAsync(post, camera); renderer.render(post, camera);
        }
      } finally { renderer.setRenderTarget(target); }
    },
    render(renderer, scene, view) {
      view.getWorldDirection(facing);
      if (!supported(renderer)) return renderer.render(scene, view);
      initialize(renderer);
      point.copy(view.position).addScaledVector(sun, 1000).project(view);
      const edge = Math.max(Math.abs(point.x), Math.abs(point.y)), fade = sun.dot(facing) > 0 ? Math.max(0, Math.min(1, (1.2 - edge) / .45)) : 0;
      renderer.getDrawingBufferSize(size);
      if (world.width !== size.x || world.height !== size.y) {
        world.setSize(size.x, size.y);
        const scale = Math.min(.25, 512 / size.x);
        shafts.setSize(Math.max(1, Math.round(size.x * scale)), Math.max(1, Math.round(size.y * scale)));
        occlusion.setSize(Math.max(1, Math.round(size.x / 2)), Math.max(1, Math.round(size.y / 2)));
        ao.uniforms.uDepthSize.value.copy(size);
        composite.uniforms.uAOSize.value.set(1 / occlusion.width, 1 / occlusion.height);
        composite.uniforms.uTexel.value.set(1 / shafts.width, 1 / shafts.height);
      }
      ao.uniforms.uInverse.value.copy(view.projectionMatrixInverse);
      ao.uniforms.uProjection.value.copy(view.projectionMatrix);
      composite.uniforms.uNearFar.value.set(view.near, view.far);
      rays.uniforms.uSun.value.set(point.x * .5 + .5, point.y * .5 + .5);
      rays.uniforms.uScale.value.set(2 / view.projectionMatrix.elements[0], 2 / view.projectionMatrix.elements[5]);
      composite.uniforms.uStrength.value = (o.strength ?? .65) * fade * fade * (3 - 2 * fade);
      const target = renderer.getRenderTarget();
      try {
        renderer.setRenderTarget(world); renderer.render(scene, view);
        quad.material = ao; renderer.setRenderTarget(occlusion); renderer.render(post, camera);
        if (fade) { quad.material = rays; renderer.setRenderTarget(shafts); renderer.render(post, camera); }
        quad.material = composite; renderer.setRenderTarget(target); renderer.render(post, camera);
      } finally { renderer.setRenderTarget(target); }
    },
    dispose() {
      if (disposed) return;
      disposed = true; world.dispose(); shafts.dispose(); occlusion.dispose(); ao.dispose(); rays.dispose(); composite.dispose(); quad.geometry.dispose();
    }
  };
};
