// 通用接收面阴影过滤. 同一平面的邻近样本分别校准深度, 保留原 PCF 软影核/接触偏移.
FPS.models.surfaceShadows = (T, o = {}) => {
  const root=new T.Group(),names=new Set(o.receivers??[]),excluded=new Set(o.excludeMeshes??[]),roots=new WeakSet(),patched=new Map();
  const uniforms={surfaceShadowMatrix:{value:new T.Matrix4()},surfaceShadowReady:{value:0}};
  let disposed=false,dirty=false;
  const fragment=`
    #ifdef USE_SHADOWMAP
      uniform mat4 surfaceShadowMatrix;
      uniform float surfaceShadowReady;
      float getShadow(sampler2D depths,vec2 size,float intensity,float bias,float radius,vec4 coord){
        #if defined(SHADOWMAP_TYPE_PCF_SOFT) && NUM_DIR_LIGHT_SHADOWS == 1 && NUM_SPOT_LIGHT_SHADOWS == 0
          if(surfaceShadowReady<.5) return unfilteredSurfaceShadow(depths,size,intensity,bias,radius,coord);
          // 先对相机附近的几何坐标求导, 避免远场阴影 UV 的平移吃掉近墙精度.
          mat3 transform=mat3(surfaceShadowMatrix)*transpose(mat3(viewMatrix));
          vec3 p=coord.xyz/coord.w,dx=transform*dFdx(vViewPosition),dy=transform*dFdy(vViewPosition);
          float determinant=dx.x*dy.y-dx.y*dy.x;
          vec2 gradient=vec2(0.);
          if(abs(determinant)>1e-20) gradient=vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/determinant;
          if(any(lessThan(p,vec3(0.)))||any(greaterThan(p,vec3(1.)))) return 1.;
          vec2 f=fract(p.xy*size+.5),base=(floor(p.xy*size+.5)-.5)/size;
          vec4 wx=vec4(1.-f.x,1.,1.,f.x),wy=vec4(1.-f.y,1.,1.,f.y);
          float visibility=0.;
          for(int y=0;y<4;y++)for(int x=0;x<4;x++){
            vec2 uv=base+vec2(float(x-1),float(y-1))/size;
            float compare=p.z+bias+dot(gradient,uv-p.xy);
            visibility+=wx[x]*wy[y]*texture2DCompare(depths,uv,compare);
          }
          return mix(1.,visibility/9.,intensity);
        #else
          return unfilteredSurfaceShadow(depths,size,intensity,bias,radius,coord);
        #endif
      }
    #endif
  `;
  function patch(material){
    if(!material.isMeshStandardMaterial||patched.has(material))return;
    const original={compile:material.onBeforeCompile,key:material.customProgramCacheKey,active:true};
    original.context=Object.create(material);original.context.onBeforeCompile=original.compile;
    original.wrapper=function(shader,renderer){
      original.compile.call(this,shader,renderer);if(disposed||!original.active)return;
      Object.assign(shader.uniforms,uniforms);
      shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',
        T.ShaderChunk.shadowmap_pars_fragment.replace('float getShadow(', 'float unfilteredSurfaceShadow(')+fragment);
    };
    original.cache=function(){return original.key.call(original.context)+(!disposed&&original.active?'/surface-shadow-plane-v2':'');};
    original.remove=()=>{
      original.active=false;
      if(material.onBeforeCompile===original.wrapper)material.onBeforeCompile=original.compile;
      if(material.customProgramCacheKey===original.cache)material.customProgramCacheKey=original.key;
      material.removeEventListener('dispose',original.remove);patched.delete(material);dirty=true;
    };
    material.onBeforeCompile=original.wrapper;material.customProgramCacheKey=original.cache;
    material.addEventListener('dispose',original.remove);patched.set(material,original);material.needsUpdate=true;
  }
  return {root,prepare(renderer,scene){this.beforeRender(renderer,scene);},beforeRender(renderer,scene){
    if(disposed)return;
    let sun;
    for(const child of scene.children){
      if(child.isDirectionalLight&&child.castShadow)sun=child;
      if(names.has(child.name)&&(dirty||!roots.has(child))){
        child.traverse(n=>{if(n.isMesh&&n.receiveShadow&&!excluded.has(n.name))for(const material of Array.isArray(n.material)?n.material:[n.material])patch(material);});roots.add(child);
      }
    }
    uniforms.surfaceShadowReady.value=Number(!!sun);if(sun)uniforms.surfaceShadowMatrix.value=sun.shadow.matrix;
    dirty=false;
  },dispose(){if(disposed)return;disposed=true;uniforms.surfaceShadowReady.value=0;for(const [material,original]of [...patched]){original.remove();material.needsUpdate=true;}}};
};
