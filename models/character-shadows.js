// 角色专用动态深度图, 保留环境阴影缓存; 按几何体实例化, 玩家身体只参与投影.
FPS.models.characterShadows = (T, o = {}) => {
  const root = new T.Group(), casters = new T.Scene(), size = o.resolution ?? 1024, extent = o.extent ?? 32, bias = o.bias ?? .006;
  if (!Number.isInteger(size) || size < 1 || !Number.isFinite(extent) || extent <= 0 || !Number.isFinite(bias) || bias < 0) throw Error('角色阴影尺寸/范围/偏移无效');
  const sun = new T.Vector3(...(o.sun ?? [-32, 48, -21])).normalize(), projected = new T.Vector3(), projection = new T.Matrix4();
  const camera = new T.OrthographicCamera(-extent, extent, extent, -extent, 1, 140);
  camera.position.copy(sun).multiplyScalar(70); camera.lookAt(0, 0, 0);
  const target = new T.WebGLRenderTarget(size, size, { depthTexture: new T.DepthTexture(size, size, T.UnsignedIntType) });
  const depthMaterial = new T.MeshBasicMaterial({ colorWrite: false });
  const bounds = new Float32Array(4);
  const uniforms = { characterDepth: { value: target.depthTexture }, characterMatrix: { value: new T.Matrix4() }, characterTexel: { value: 1 / size }, characterEnabled: { value: 0 }, characterBias: { value: bias / (camera.far - camera.near) }, characterBounds: { value: bounds } };
  const patched = new Map(), originalShadows = new Map(), groups = [], receiverRoots = new WeakSet();
  const playerBody = new T.Group(), bodyGeometry = new T.BoxGeometry(1, 1, 1), legs = [];
  function part(size, position) {
    const mesh = new T.Mesh(bodyGeometry, depthMaterial); mesh.scale.set(...size); mesh.position.set(...position); playerBody.add(mesh); return mesh;
  }
  part([.3, .32, .3], [0, 1.58, 0]); part([.46, .57, .27], [0, 1.12, 0]); part([.36, .19, .25], [0, .79, 0]);
  for (const side of [-1, 1]) {
    legs.push(part([.16, .72, .2], [side * .13, .36, 0]));
    part([.15, .44, .2], [side * .3, 1.16, -.12]);
  }
  part([.11, .12, .58], [.24, 1.18, -.38]);
  let player, signature, phase = 0, previous, elapsed = 0, disposed = false, receiversDirty = false;
  const fragment = `
    uniform sampler2D characterDepth;
    uniform float characterTexel, characterEnabled, characterBias;
    uniform vec4 characterBounds;
    varying vec4 vCharacterShadow;
    float characterShadow(){
      if(characterEnabled<.5) return 1.;
      vec3 p=vCharacterShadow.xyz/vCharacterShadow.w;
      // 导数在逐像素早退前求值, 接收坡面逐样本校准深度, 不靠扩大偏移掩盖锯齿.
      vec3 dx=dFdx(p), dy=dFdy(p);
      if(any(lessThan(p,vec3(0.)))||any(greaterThan(p,vec3(1.)))) return 1.;
      if(any(lessThan(p.xy,characterBounds.xy))||any(greaterThan(p.xy,characterBounds.zw))) return 1.;
      float determinant=dx.x*dy.y-dx.y*dy.x;
      vec2 gradient=vec2(0.);
      if(abs(determinant)>1e-12) gradient=vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/determinant;
      vec2 pixel=p.xy/characterTexel, f=fract(pixel), base=(floor(pixel)-.5)*characterTexel;
      // 三点二次权重连续跨像素, 只在角色投影包围范围内执行九次比较.
      vec3 wx=vec3(.5*(1.-f.x)*(1.-f.x),.5+f.x-f.x*f.x,.5*f.x*f.x);
      vec3 wy=vec3(.5*(1.-f.y)*(1.-f.y),.5+f.y-f.y*f.y,.5*f.y*f.y);
      float visibility=0.;
      for(int y=0;y<3;y++) for(int x=0;x<3;x++){
        vec2 uv=base+vec2(float(x),float(y))*characterTexel;
        float z=p.z-characterBias+dot(gradient,uv-p.xy);
        visibility+=wx[x]*wy[y]*step(z,texture2D(characterDepth,uv).r);
      }
      float edge=min(min(p.x,1.-p.x),min(p.y,1.-p.y));
      return mix(1.,visibility,smoothstep(0.,.04,edge));
    }
  `;
  function patch(material) {
    if (!material.isMeshStandardMaterial || patched.has(material)) return;
    const original = { compile: material.onBeforeCompile, key: material.customProgramCacheKey, active: true };
    original.keyContext = Object.create(material); original.keyContext.onBeforeCompile = original.compile;
    patched.set(material, original);
    original.wrapper = function(shader, renderer) {
      original.compile.call(this, shader, renderer); if (disposed || !original.active) return;
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'uniform mat4 characterMatrix; varying vec4 vCharacterShadow;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 characterWorld=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          characterWorld=instanceMatrix*characterWorld;
        #endif
        vCharacterShadow=characterMatrix*modelMatrix*characterWorld;`);
      shader.fragmentShader = fragment + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', T.ShaderChunk.lights_fragment_begin.replace(
        'getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= characterShadow();'));
    };
    original.cache = function() { return original.key.call(original.keyContext) + (!disposed && original.active ? '/character-shadow-v2' : ''); };
    material.onBeforeCompile = original.wrapper; material.customProgramCacheKey = original.cache;
    original.remove = () => {
      original.active = false;
      if (material.onBeforeCompile === original.wrapper) material.onBeforeCompile = original.compile;
      if (material.customProgramCacheKey === original.cache) material.customProgramCacheKey = original.key;
      patched.delete(material); material.removeEventListener('dispose', original.remove);
      receiversDirty = true;
    };
    material.addEventListener('dispose', original.remove);
    material.needsUpdate = true;
  }
  function clearCasters() {
    for (const { mesh } of groups) { casters.remove(mesh); mesh.dispose(); } groups.length = 0;
    for (const [mesh, value] of originalShadows) mesh.castShadow = value; originalShadows.clear();
  }
  return {
    root,
    update(dt, api) { player = api.player; elapsed = dt; },
    beforeRender(renderer, scene, view) {
      if (disposed) return;
      const actors = scene.children.filter(n => n.visible && n.userData.actor), key = actors.map(n => n.uuid).join(',');
      if (key !== signature) {
        clearCasters(); signature = key; const geometryGroups = new Map();
        for (const parent of [...actors, playerBody]) parent.traverse(n => {
          if (!n.isMesh || n.material.wireframe) return;
          if (parent !== playerBody) { originalShadows.set(n, n.castShadow); n.castShadow = false; }
          if (!geometryGroups.has(n.geometry)) geometryGroups.set(n.geometry, []);
          geometryGroups.get(n.geometry).push({ source: n, player: parent === playerBody });
        });
        for (const [geometry, sources] of geometryGroups) {
          if (!geometry.boundingSphere) geometry.computeBoundingSphere();
          const mesh = new T.InstancedMesh(geometry, depthMaterial, sources.length); mesh.frustumCulled = false;
          casters.add(mesh); groups.push({ mesh, sources });
        }
      }
      // 静态模型只登记一次; 新接入的 root 或共享材质释放后才重新扫描接收面.
      for (const child of scene.children) if (receiversDirty || !receiverRoots.has(child)) {
        child.traverse(n => { if (n.isMesh && n.receiveShadow && (n.layers.mask & 1)) for (const m of Array.isArray(n.material) ? n.material : [n.material]) patch(m); });
        receiverRoots.add(child);
      }
      receiversDirty = false;
      const position = player?.position ?? view.position;
      const moved = previous ? Math.hypot(position.x - previous.x, position.z - previous.z) : 0, dt = elapsed; elapsed = 0;
      previous ??= new T.Vector3(); previous.copy(position);
      playerBody.position.copy(position); playerBody.rotation.y = view.rotation.y;
      if (dt > 0) {
        const distance = Math.min(moved, dt * 9), swing = Math.min(1, distance / dt / 2), blend = 1 - Math.exp(-dt * 14);
        phase = (phase + distance * 2.5) % (Math.PI * 2);
        for (let i = 0; i < legs.length; i++) legs[i].rotation.x += (Math.sin(phase + i * Math.PI) * .3 * swing - legs[i].rotation.x) * blend;
      }
      playerBody.updateMatrixWorld(true); for (const actor of actors) actor.updateWorldMatrix(true, true);
      // 动态图连续跟随玩家, 自身投影保持固定像素相位; 静态世界阴影另有独立缓存.
      camera.position.copy(position).addScaledVector(sun, 70); camera.updateMatrixWorld(true);
      uniforms.characterMatrix.value.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
      bounds[0] = bounds[1] = 1; bounds[2] = bounds[3] = 0;
      for (const { mesh, sources } of groups) {
        let count = 0;
        for (const { source, player: own } of sources) if (!own || (player && !player.debug && player.health > 0)) {
          mesh.setMatrixAt(count++, source.matrixWorld);
          const sphere = source.geometry.boundingSphere, e = projection.multiplyMatrices(uniforms.characterMatrix.value, source.matrixWorld).elements;
          const rx = sphere.radius * Math.hypot(e[0], e[4], e[8]) + 2 / size, ry = sphere.radius * Math.hypot(e[1], e[5], e[9]) + 2 / size;
          projected.copy(sphere.center).applyMatrix4(projection);
          if (projected.x + rx >= 0 && projected.x - rx <= 1 && projected.y + ry >= 0 && projected.y - ry <= 1) {
            bounds[0] = Math.min(bounds[0], projected.x - rx); bounds[1] = Math.min(bounds[1], projected.y - ry);
            bounds[2] = Math.max(bounds[2], projected.x + rx); bounds[3] = Math.max(bounds[3], projected.y + ry);
          }
        }
        mesh.count = count; mesh.visible = count > 0; mesh.instanceMatrix.needsUpdate = true;
      }
      const oldTarget = renderer.getRenderTarget(), autoUpdate = renderer.shadowMap.autoUpdate, autoClear = renderer.autoClear;
      try {
        renderer.shadowMap.autoUpdate = false; renderer.autoClear = true; renderer.setRenderTarget(target); renderer.render(casters, camera);
        uniforms.characterEnabled.value = groups.some(g => g.mesh.count) ? 1 : 0;
      } finally { renderer.setRenderTarget(oldTarget); renderer.shadowMap.autoUpdate = autoUpdate; renderer.autoClear = autoClear; }
    },
    dispose() {
      if (disposed) return;
      disposed = true; uniforms.characterEnabled.value = 0; clearCasters(); target.dispose(); bodyGeometry.dispose(); depthMaterial.dispose();
      for (const [m, original] of patched) {
        original.active = false;
        if (m.onBeforeCompile === original.wrapper) m.onBeforeCompile = original.compile;
        if (m.customProgramCacheKey === original.cache) m.customProgramCacheKey = original.key;
        m.removeEventListener('dispose', original.remove); m.needsUpdate = true;
      }
      patched.clear();
    }
  };
};
