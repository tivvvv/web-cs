// 角色专用动态深度图, 保留环境阴影缓存; 按几何体实例化, 玩家身体只参与投影.
FPS.models.characterShadows = (T, o = {}) => {
  const root = new T.Group(), casters = new T.Scene(), size = o.resolution ?? 1024, extent = o.extent ?? 32;
  const sun = new T.Vector3(...(o.sun ?? [-32, 48, -21])).normalize(), focus = new T.Vector3();
  const camera = new T.OrthographicCamera(-extent, extent, extent, -extent, 1, 140);
  camera.position.copy(sun).multiplyScalar(70); camera.lookAt(0, 0, 0);
  const inverseRotation = camera.quaternion.clone().invert();
  const target = new T.WebGLRenderTarget(size, size, { depthTexture: new T.DepthTexture(size, size, T.UnsignedIntType) });
  const depthMaterial = new T.MeshBasicMaterial({ colorWrite: false });
  const uniforms = { characterDepth: { value: target.depthTexture }, characterMatrix: { value: new T.Matrix4() }, characterTexel: { value: 1 / size }, characterEnabled: { value: 0 } };
  const patched = new Map(), originalShadows = new Map(), groups = [];
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
  let player, signature, phase = 0, previous, disposed = false;
  const fragment = `
    uniform sampler2D characterDepth;
    uniform float characterTexel, characterEnabled;
    varying vec4 vCharacterShadow;
    float characterShadow(){
      if(characterEnabled<.5) return 1.;
      vec3 p=vCharacterShadow.xyz/vCharacterShadow.w;
      if(any(lessThan(p,vec3(0.)))||any(greaterThan(p,vec3(1.)))) return 1.;
      vec2 pixel=p.xy/characterTexel-.5, f=fract(pixel), uv=(floor(pixel)+.5)*characterTexel;
      float z=p.z-.00015;
      float a=step(z,texture2D(characterDepth,uv).r), b=step(z,texture2D(characterDepth,uv+vec2(characterTexel,0.)).r);
      float c=step(z,texture2D(characterDepth,uv+vec2(0.,characterTexel)).r), d=step(z,texture2D(characterDepth,uv+vec2(characterTexel)).r);
      float edge=min(min(p.x,1.-p.x),min(p.y,1.-p.y));
      return mix(1.,mix(mix(a,b,f.x),mix(c,d,f.x),f.y),smoothstep(0.,.04,edge));
    }
  `;
  function patch(material) {
    if (!material.isMeshStandardMaterial || patched.has(material)) return;
    const original = { compile: material.onBeforeCompile, key: material.customProgramCacheKey };
    patched.set(material, original);
    material.onBeforeCompile = function(shader, renderer) {
      original.compile.call(this, shader, renderer); Object.assign(shader.uniforms, uniforms);
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
    material.customProgramCacheKey = function() { return original.key.call(this) + '/character-shadow'; };
    material.needsUpdate = true;
  }
  function clearCasters() {
    for (const { mesh } of groups) { casters.remove(mesh); mesh.dispose(); } groups.length = 0;
    for (const [mesh, value] of originalShadows) mesh.castShadow = value; originalShadows.clear();
  }
  return {
    root,
    update(dt, api) { player = api.player; },
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
          const mesh = new T.InstancedMesh(geometry, depthMaterial, sources.length); mesh.frustumCulled = false;
          casters.add(mesh); groups.push({ mesh, sources });
        }
        scene.traverse(n => { if (n.isMesh && n.receiveShadow) for (const m of [n.material].flat()) patch(m); });
      }
      const position = player?.position ?? view.position;
      const moved = previous ? Math.hypot(position.x - previous.x, position.z - previous.z) : 0;
      previous ??= new T.Vector3(); previous.copy(position); phase += moved * 8;
      playerBody.position.copy(position); playerBody.rotation.y = view.rotation.y;
      for (let i = 0; i < legs.length; i++) legs[i].rotation.x = moved > .001 ? Math.sin(phase + i * Math.PI) * .3 : 0;
      playerBody.updateMatrixWorld(true); for (const actor of actors) actor.updateWorldMatrix(true, true);
      for (const { mesh, sources } of groups) {
        let count = 0;
        for (const { source, player: own } of sources) if (!own || (player && !player.debug && player.health > 0)) mesh.setMatrixAt(count++, source.matrixWorld);
        mesh.count = count; mesh.visible = count > 0; mesh.instanceMatrix.needsUpdate = true;
      }
      // 对齐阴影像素, 避免相机缓慢移动时轮廓抖动; 深度图只绘制角色实例.
      focus.copy(position).applyQuaternion(inverseRotation);
      const step = extent * 2 / size; focus.x = Math.round(focus.x / step) * step; focus.y = Math.round(focus.y / step) * step;
      focus.applyQuaternion(camera.quaternion); camera.position.copy(focus).addScaledVector(sun, 70); camera.updateMatrixWorld(true);
      uniforms.characterMatrix.value.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
      const oldTarget = renderer.getRenderTarget(), autoUpdate = renderer.shadowMap.autoUpdate, autoClear = renderer.autoClear;
      try {
        renderer.shadowMap.autoUpdate = false; renderer.autoClear = true; renderer.setRenderTarget(target); renderer.render(casters, camera);
        uniforms.characterEnabled.value = groups.some(g => g.mesh.count) ? 1 : 0;
      } finally { renderer.setRenderTarget(oldTarget); renderer.shadowMap.autoUpdate = autoUpdate; renderer.autoClear = autoClear; }
    },
    dispose() {
      disposed = true; uniforms.characterEnabled.value = 0; clearCasters(); target.dispose(); bodyGeometry.dispose(); depthMaterial.dispose();
      for (const [m, original] of patched) { m.onBeforeCompile = original.compile; m.customProgramCacheKey = original.key; m.needsUpdate = true; } patched.clear();
    }
  };
};
