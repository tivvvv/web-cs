// 迎光视角的屏幕空间太阳光束. 深度遮挡只计算建筑/树木, 不把云当成实体遮挡.
FPS.models.sunRays = (T, o = {}) => {
  const root = new T.Group(), sun = new T.Vector3(...(o.sun ?? [-32, 48, -21])).normalize();
  const point = new T.Vector3(), facing = new T.Vector3(), size = new T.Vector2();
  const world = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: 4, depthTexture: new T.DepthTexture(1, 1, T.UnsignedIntType) });
  const shafts = new T.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const post = new T.Scene(), camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const vertexShader = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const samples = Math.max(16, Math.min(48, Math.round(o.samples ?? 32)));
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
  const composite = new T.ShaderMaterial({
    depthTest: false, depthWrite: false, vertexShader,
    uniforms: { uScene: { value: world.texture }, uDepth: { value: world.depthTexture }, uRays: { value: shafts.texture }, uTexel: { value: new T.Vector2() }, uStrength: { value: 0 } },
    fragmentShader: `
      uniform sampler2D uScene,uDepth,uRays;
      uniform vec2 uTexel;
      uniform float uStrength;
      varying vec2 vUv;
      void main(){
        vec3 color=texture2D(uScene,vUv).rgb;
        // 全分辨率遮挡保留枝叶和屋檐轮廓, 不把前景及瞄准目标涂白.
        float light=0.;
        if(texture2D(uDepth,vUv).r>=1.){
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
    render(renderer, scene, view) {
      view.getWorldDirection(facing);
      if (!root.visible || sun.dot(facing) <= 0 || !renderer.extensions.has('EXT_color_buffer_float')) return renderer.render(scene, view);
      point.copy(view.position).addScaledVector(sun, 1000).project(view);
      const edge = Math.max(Math.abs(point.x), Math.abs(point.y)), fade = Math.max(0, Math.min(1, (1.2 - edge) / .45));
      if (!fade) return renderer.render(scene, view);
      renderer.getDrawingBufferSize(size);
      if (world.width !== size.x || world.height !== size.y) {
        world.samples = Math.min(4, renderer.capabilities.maxSamples); world.setSize(size.x, size.y);
        const scale = Math.min(.25, 512 / size.x);
        shafts.setSize(Math.max(1, Math.round(size.x * scale)), Math.max(1, Math.round(size.y * scale)));
        composite.uniforms.uTexel.value.set(1 / shafts.width, 1 / shafts.height);
      }
      rays.uniforms.uSun.value.set(point.x * .5 + .5, point.y * .5 + .5);
      rays.uniforms.uScale.value.set(2 / view.projectionMatrix.elements[0], 2 / view.projectionMatrix.elements[5]);
      composite.uniforms.uStrength.value = (o.strength ?? .65) * fade * fade * (3 - 2 * fade);
      const target = renderer.getRenderTarget();
      try {
        renderer.setRenderTarget(world); renderer.render(scene, view);
        quad.material = rays; renderer.setRenderTarget(shafts); renderer.render(post, camera);
        quad.material = composite; renderer.setRenderTarget(target); renderer.render(post, camera);
      } finally { renderer.setRenderTarget(target); }
    },
    dispose() { world.dispose(); shafts.dispose(); rays.dispose(); composite.dispose(); quad.geometry.dispose(); }
  };
};
