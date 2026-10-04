// 静态地表把深度比较转成带 mipmap 的遮蔽图; 远景过滤可见性, 不过滤打包深度.
FPS.models.groundShadowCache = (T, o = {}) => {
  const root = new T.Group(), surfaces = new T.Scene(), camera = new T.OrthographicCamera();
  const bounds = o.bounds ?? [-1, -1, 1, 1], [x0, z0, x1, z1] = bounds, width = x1 - x0, depth = z1 - z0;
  if (!bounds.every(Number.isFinite) || width <= 0 || depth <= 0) throw Error('地表阴影缓存范围无效');
  if (!Number.isInteger(o.resolution ?? 2048) || (o.resolution ?? 2048) < 1) throw Error('地表阴影缓存尺寸无效');
  const names = new Set(o.receivers ?? []), followers = new Set(o.followers ?? []), roots = new WeakSet(), patched = new Map();
  const origin = new T.Vector2(x0, z1), scale = new T.Vector2(1 / width, -1 / depth);
  const uniforms = { groundShadowMap: { value: null }, groundShadowOrigin: { value: origin }, groundShadowScale: { value: scale }, groundShadowEnabled: { value: 0 } };
  const bakeUniforms = { shadowDepth: { value: null }, shadowMatrix: { value: new T.Matrix4() }, shadowSize: { value: new T.Vector2() }, shadowBias: { value: 0 }, shadowNormalBias: { value: 0 }, shadowIntensity: { value: 1 } };
  const material = new T.ShaderMaterial({ uniforms: bakeUniforms, toneMapped: false,
    vertexShader: `
      #include <common>
      uniform mat4 shadowMatrix;
      uniform float shadowNormalBias;
      varying vec3 shadowPosition;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.);
        vec3 worldNormal=inverseTransformDirection(normalize(normalMatrix*normal),viewMatrix);
        shadowPosition=(shadowMatrix*(world+vec4(worldNormal*shadowNormalBias,0.))).xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader: `
      #include <packing>
      uniform sampler2D shadowDepth;
      uniform vec2 shadowSize;
      uniform float shadowBias, shadowIntensity;
      varying vec3 shadowPosition;
      void main(){
        vec3 p=shadowPosition, dx=dFdx(p), dy=dFdy(p);
        float determinant=dx.x*dy.y-dx.y*dy.x;
        vec2 gradient=vec2(0.);
        if(abs(determinant)>1e-12) gradient=vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/determinant;
        vec2 f=fract(p.xy*shadowSize+.5), base=(floor(p.xy*shadowSize+.5)-.5)/shadowSize;
        vec4 wx=vec4(1.-f.x,1.,1.,f.x), wy=vec4(1.-f.y,1.,1.,f.y);
        float visibility=0.;
        for(int y=0;y<4;y++) for(int x=0;x<4;x++){
          vec2 uv=base+vec2(float(x-1),float(y-1))/shadowSize;
          // 每个样本使用同一接收面的深度, 避免斜面上扩大偏移留下接触缝.
          float compare=p.z+shadowBias+dot(gradient,uv-p.xy);
          visibility+=wx[x]*wy[y]*step(compare,unpackRGBAToDepth(texture2D(shadowDepth,uv)));
        }
        bool inside=all(greaterThanEqual(p,vec3(0.)))&&all(lessThanEqual(p,vec3(1.)));
        float value=inside?mix(1.,visibility/9.,shadowIntensity):1.;
        gl_FragColor=vec4(vec3(value),1.);
      }`
  });
  const fragment = `
    #ifdef USE_SHADOWMAP
      uniform sampler2D groundShadowMap;
      uniform float groundShadowEnabled;
      varying vec2 vGroundShadowUv;
      float getShadow(sampler2D depths,vec2 size,float intensity,float bias,float radius,vec4 coord){
        #if defined(SHADOWMAP_TYPE_PCF_SOFT) && NUM_DIR_LIGHT_SHADOWS == 1 && NUM_SPOT_LIGHT_SHADOWS == 0
          if(groundShadowEnabled>.5&&all(greaterThanEqual(vGroundShadowUv,vec2(0.)))&&all(lessThanEqual(vGroundShadowUv,vec2(1.))))
            return texture2D(groundShadowMap,vGroundShadowUv).r;
        #endif
        return uncachedGroundShadow(depths,size,intensity,bias,radius,coord);
      }
    #endif
  `;
  let target, light, dirty = true, receiversDirty = false, disposed = false;
  const box = new T.Box3(), clearColor = new T.Color();
  function patch(m) {
    if (!m.isMeshStandardMaterial || patched.has(m)) return;
    const original = { compile: m.onBeforeCompile, key: m.customProgramCacheKey, active: true };
    original.context = Object.create(m); original.context.onBeforeCompile = original.compile;
    original.wrapper = function(shader, renderer) {
      original.compile.call(this, shader, renderer); if (disposed || !original.active) return;
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'uniform vec2 groundShadowOrigin, groundShadowScale; varying vec2 vGroundShadowUv;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 groundWorld=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          groundWorld=instanceMatrix*groundWorld;
        #endif
        vGroundShadowUv=((modelMatrix*groundWorld).xz-groundShadowOrigin)*groundShadowScale;`);
      // 只包覆阴影采样函数, 不展开照明段; 角色补丁以任意顺序接入均可保留.
      shader.fragmentShader = shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',
        T.ShaderChunk.shadowmap_pars_fragment.replace('float getShadow(', 'float uncachedGroundShadow(') + fragment);
    };
    original.cache = function() { return original.key.call(original.context) + (!disposed && original.active ? '/ground-shadow-cache-v1' : ''); };
    original.remove = () => {
      original.active = false;
      if (m.onBeforeCompile === original.wrapper) m.onBeforeCompile = original.compile;
      if (m.customProgramCacheKey === original.cache) m.customProgramCacheKey = original.key;
      patched.delete(m); m.removeEventListener('dispose', original.remove); receiversDirty = true;
    };
    m.onBeforeCompile = original.wrapper; m.customProgramCacheKey = original.cache;
    m.addEventListener('dispose', original.remove); patched.set(m, original); m.needsUpdate = true;
  }
  function prepare(renderer, scene) {
    if (disposed) return;
    light ??= scene.children.find(n => n.isDirectionalLight && n.castShadow && !n.shadow.autoUpdate);
    if (!light || light.shadow.autoUpdate || renderer.shadowMap.type !== T.PCFSoftShadowMap || scene.children.filter(n => n.isDirectionalLight && n.castShadow).length !== 1) {
      uniforms.groundShadowEnabled.value = 0; return;
    }
    for (const child of scene.children) if ((names.has(child.name) || followers.has(child.name)) && (!roots.has(child) || receiversDirty)) {
      const fresh = !roots.has(child); child.updateWorldMatrix(true, true);
      child.traverse(n => {
        if (!n.isMesh || !n.receiveShadow) return;
        for (const m of Array.isArray(n.material) ? n.material : [n.material]) patch(m);
        if (fresh && names.has(child.name) && !n.isInstancedMesh) {
          const copy = new T.Mesh(n.geometry, material); copy.matrixAutoUpdate = false; copy.matrix.copy(n.matrixWorld); surfaces.add(copy);
          box.union(new T.Box3().setFromObject(n)); dirty = true;
        }
      }); roots.add(child);
    }
    receiversDirty = false;
    if (!dirty && target) { uniforms.groundShadowEnabled.value = 1; return; }
    if (!surfaces.children.length || !light.shadow.map) return;
    const size = Math.min(o.resolution ?? 2048, Math.floor(renderer.capabilities.maxTextureSize / Math.max(1, depth / width)));
    target ??= new T.WebGLRenderTarget(size, Math.max(1, Math.round(size * depth / width)), {
      format: T.RedFormat, minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter, generateMipmaps: true,
      anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()), stencilBuffer: false
    });
    Object.assign(camera, { left: -width / 2, right: width / 2, top: depth / 2, bottom: -depth / 2, near: .1, far: box.max.y - box.min.y + 2 });
    camera.position.set((x0+x1)/2, box.max.y+1, (z0+z1)/2); camera.up.set(0,0,-1);
    camera.lookAt((x0+x1)/2, box.min.y, (z0+z1)/2); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    bakeUniforms.shadowDepth.value = light.shadow.map.texture; bakeUniforms.shadowMatrix.value.copy(light.shadow.matrix);
    bakeUniforms.shadowSize.value.copy(light.shadow.mapSize); bakeUniforms.shadowBias.value = light.shadow.bias;
    bakeUniforms.shadowNormalBias.value = light.shadow.normalBias; bakeUniforms.shadowIntensity.value = light.shadow.intensity;
    const previous = renderer.getRenderTarget(), autoClear = renderer.autoClear, autoUpdate = renderer.shadowMap.autoUpdate;
    renderer.getClearColor(clearColor); const alpha = renderer.getClearAlpha();
    try {
      renderer.autoClear = true; renderer.shadowMap.autoUpdate = false; renderer.setClearColor(0xffffff,1);
      renderer.setRenderTarget(target); renderer.render(surfaces,camera);
      uniforms.groundShadowMap.value = target.texture; uniforms.groundShadowEnabled.value = 1; dirty = false;
    } finally {
      renderer.setRenderTarget(previous); renderer.setClearColor(clearColor,alpha); renderer.autoClear = autoClear; renderer.shadowMap.autoUpdate = autoUpdate;
    }
  }
  return { root, prepare, beforeRender: prepare, dispose() {
    if (disposed) return; disposed = true; uniforms.groundShadowEnabled.value = 0;
    for (const [m, original] of patched) {
      original.remove(); m.needsUpdate = true;
    }
    patched.clear(); surfaces.clear(); target?.dispose(); material.dispose();
  } };
};
