// 纯 Node 接收面过滤回归. 软件投影核对真实平面/实体, 不启动浏览器或 GPU.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {ShaderLib,Matrix3} from 'three';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const c=vm.createContext({FPS:{models:{}},window:{},AbortController});
vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const T=c.THREE,layout=c.window.FPS_LAYOUT;
vm.runInContext(read('models/surface-shadows.js'),c);
const factory=c.FPS.models.surfaceShadows,scene=new T.Scene(),renderer={render(){throw Error('过滤不应增加渲染');}};
const config=layout.instances.find(i=>i.model==='surfaceShadows').options;
const options=Object.freeze({excludeMeshes:Object.freeze([...config.excludeMeshes]),receivers:Object.freeze([...config.receivers])}),model=factory(T,options);
assert.equal(JSON.stringify(options),JSON.stringify(config));assert.equal(model.root.children.length,0);
const originalMaterial=new T.MeshStandardMaterial(),other=new T.MeshStandardMaterial(),shared=new T.MeshStandardMaterial();
originalMaterial.onBeforeCompile=s=>{s.uniforms.preserved={value:7};};
const original=originalMaterial.onBeforeCompile,key=originalMaterial.customProgramCacheKey.call(originalMaterial);
const selected=new T.Group(),unselected=new T.Group();selected.name=options.receivers[0];unselected.name='shrine-park-ground';
const mesh=new T.Mesh(new T.PlaneGeometry(),originalMaterial);mesh.receiveShadow=true;selected.add(mesh);
const invisible=new T.Mesh(new T.PlaneGeometry(),other);selected.add(invisible);
const cachedGround=new T.Mesh(new T.PlaneGeometry(),other);cachedGround.name='hub-ground-surface';cachedGround.receiveShadow=true;selected.add(cachedGround);
const multiple=new T.Mesh(new T.PlaneGeometry(),[shared,new T.MeshBasicMaterial()]);multiple.receiveShadow=true;selected.add(multiple);
const protectedMesh=new T.Mesh(new T.PlaneGeometry(),other);protectedMesh.receiveShadow=true;unselected.add(protectedMesh);
scene.add(selected,unselected);let scans=0;const traverse=selected.traverse;
selected.traverse=function(fn){scans++;traverse.call(this,fn);};
model.beforeRender(renderer,scene);assert.equal(scans,1);assert.equal(other.version,0,'改动未选中/不接收的材质');
assert.equal(originalMaterial.customProgramCacheKey(),key+'/surface-shadow-plane-v2');
const shader=()=>{const s={vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader,uniforms:{}};originalMaterial.onBeforeCompile(s,renderer);return s;};
const compiled=shader();assert.equal(compiled.uniforms.preserved.value,7);
assert.equal(compiled.uniforms.surfaceShadowReady.value,0,'无太阳时未回退');
const mockSun=new T.DirectionalLight();mockSun.castShadow=true;scene.add(mockSun);model.beforeRender(renderer,scene);
assert.equal(compiled.uniforms.surfaceShadowMatrix.value,mockSun.shadow.matrix);assert.equal(compiled.uniforms.surfaceShadowReady.value,1);
assert.equal((compiled.fragmentShader.match(/float getShadow\(/g)??[]).length,1);
assert(compiled.fragmentShader.includes('float unfilteredSurfaceShadow('));
assert(compiled.fragmentShader.includes('dot(gradient,uv-p.xy)'));
assert(compiled.fragmentShader.includes('return unfilteredSurfaceShadow('),'非 PCF Soft 配置没有回退');
const version=originalMaterial.version;
for(let i=0;i<2000;i++)model.beforeRender(renderer,scene);
assert.equal(scans,1,'稳定帧遍历静态几何');assert.equal(originalMaterial.version,version,'稳定帧重编译材质');
const added=new T.Group();added.name=options.receivers[1];const addedMesh=new T.Mesh(new T.PlaneGeometry(),shared);addedMesh.receiveShadow=true;added.add(addedMesh);scene.add(added);
model.beforeRender(renderer,scene);assert.equal(shared.version,1,'共享材质重复补丁');
originalMaterial.dispose();assert.equal(originalMaterial.onBeforeCompile,original);
model.beforeRender(renderer,scene);assert.equal(originalMaterial.version,version+1,'材质释放后复用没有重新接入');
model.dispose();model.dispose();assert.equal(originalMaterial.onBeforeCompile,original);assert.equal(originalMaterial.customProgramCacheKey(),key);
assert(!shader().fragmentShader.includes('unfilteredSurfaceShadow'));model.beforeRender(renderer,scene);assert.equal(originalMaterial.onBeforeCompile,original);
console.log('PASS 选定接收根/材质数组/回调保留/共享/释放复用/卸载, 2000 稳定帧零网格遍历和绘制');

// 阴影纹素位置由原场景灯光和真实射线决定, 接收深度期望值独立于过滤公式.
const html=read('index.html'),begin=html.indexOf('  const lights = Array.isArray(layout.lights)'),end=html.indexOf('  if (!lights.length)',begin);
const tuple=html.slice(html.indexOf('const tuple ='),html.indexOf('\n',html.indexOf('const tuple =')));
const lightContext=vm.createContext({T,layout,scene:new T.Scene(),renderer:{capabilities:{maxTextureSize:4096}}});
vm.runInContext(tuple+'\nconst guarded=(scope,fn)=>fn();\n'+html.slice(begin,end),lightContext);
lightContext.scene.updateMatrixWorld(true);const sun=lightContext.scene.children.find(n=>n.isDirectionalLight);sun.shadow.camera.updateProjectionMatrix();sun.shadow.updateMatrices(sun);
const projection=sun.shadow.matrix.clone(),inverse=projection.clone().invert(),size=sun.shadow.mapSize.x;
const towardSun=sun.position.clone().sub(sun.target.position).normalize(),ray=new T.Raycaster();
assert.equal(sun.shadow.bias,-.000015);assert.equal(sun.shadow.normalBias,.008);
function kernel(p) {
  const f=[p.x,p.y].map(v=>(v*size+.5)%1),base=[p.x,p.y].map(v=>(Math.floor(v*size+.5)-.5)/size);
  const weights=[[1-f[0],1,1,f[0]],[1-f[1],1,1,f[1]]],taps=[];
  for(let y=0;y<4;y++)for(let x=0;x<4;x++)taps.push({uv:new T.Vector2(base[0]+(x-1)/size,base[1]+(y-1)/size),weight:weights[0][x]*weights[1][y]/9});
  assert(Math.abs(taps.reduce((s,t)=>s+t.weight,0)-1)<1e-12);return taps;
}
function storedDepth(uv,casters) {
  const a=new T.Vector3(uv.x,uv.y,0).applyMatrix4(inverse),b=new T.Vector3(uv.x,uv.y,1).applyMatrix4(inverse);
  ray.set(a,b.sub(a).normalize());ray.far=400;
  const hit=ray.intersectObjects(casters,false)[0];return hit?hit.point.clone().applyMatrix4(projection).z:1;
}
function mean(values){return values.reduce((a,b)=>a+b,0)/values.length;}
for(const [name,normal]of [['horizontal',new T.Vector3(0,1,0)],['wall-x',new T.Vector3(-1,0,0)],['wall-z',new T.Vector3(0,0,-1)],['roof',new T.Vector3(0,1,-.035).normalize()]]) {
  const surface=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshBasicMaterial({side:T.DoubleSide}));
  surface.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);surface.position.set(60,3.8,68);surface.updateMatrixWorld(true);
  const across=new T.Vector3(1,0,0).applyQuaternion(surface.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(surface.quaternion);
  const p=surface.position.clone().applyMatrix4(projection),a=surface.position.clone().add(across).applyMatrix4(projection).sub(p),b=surface.position.clone().add(up).applyMatrix4(projection).sub(p);
  const determinant=a.x*b.y-a.y*b.x,g=new T.Vector2((b.y*a.z-a.y*b.z)/determinant,(a.x*b.z-b.x*a.z)/determinant);
  const camera=new T.PerspectiveCamera(65,16/9,.08,500),observed=[],corrected=[];let smallDerivatives=0;
  for(let frame=0;frame<80;frame++) {
    const distance=50*Math.pow(.004,frame/79);
    camera.position.copy(surface.position).addScaledVector(normal,distance).addScaledVector(across,Math.sin(frame*.37)*distance*.05);camera.up.copy(up);camera.lookAt(surface.position);camera.updateMatrixWorld(true);
    for(const x of [-2,0,2])for(const y of [-1,1]) {
      ray.setFromCamera(new T.Vector2((x+.27)/128,(y+.13)/72),camera);ray.far=100;
      const point=ray.intersectObject(surface)[0]?.point;assert(point,'相机采样没击中接收面');
      const receiver=point.clone().addScaledVector(normal,sun.shadow.normalBias).applyMatrix4(projection),taps=kernel(receiver);
      // 1080p 邻像素投影先量化 float32, 检查近墙小导数也能稳定校准.
      const projected=([ox,oy])=>{ray.setFromCamera(new T.Vector2((x+.27)/128+ox*2/1920,(y+.13)/72+oy*2/1080),camera);const hit=ray.intersectObject(surface)[0];return hit.point.clone().applyMatrix4(camera.matrixWorldInverse).negate().toArray().map(Math.fround);};
      const origin=projected([0,0]),dx=projected([1,0]).map((v,k)=>Math.fround(v-origin[k])),dy=projected([0,1]).map((v,k)=>Math.fround(v-origin[k]));
      const transform=new Matrix3().setFromMatrix4(projection).multiply(new Matrix3().setFromMatrix4(camera.matrixWorld));transform.elements=transform.elements.map(Math.fround);
      const multiply=v=>{const e=transform.elements;return [0,1,2].map(k=>Math.fround(Math.fround(Math.fround(e[k]*v[0])+Math.fround(e[k+3]*v[1]))+Math.fround(e[k+6]*v[2])));};
      const a=multiply(dx),b=multiply(dy),det=a[0]*b[1]-a[1]*b[0],quantGradient=new T.Vector2((b[1]*a[2]-a[1]*b[2])/det,(a[0]*b[2]-b[0]*a[2])/det);
      assert(Math.abs(det)>1e-20);if(Math.abs(det)<1e-12)smallDerivatives++;
      let before=0,after=0;
      for(const {uv,weight}of taps) {
        const depth=storedDepth(uv,[surface]),compare=receiver.z+sun.shadow.bias;
        before+=weight*(compare<=depth?1:0);after+=weight*(compare+quantGradient.dot(uv.clone().sub(new T.Vector2(receiver.x,receiver.y)))<=depth?1:0);
      }
      observed.push(before);corrected.push(after);
    }
  }
  const acne=1-mean(observed),range=Math.max(...observed)-Math.min(...observed);
  assert(acne>.1&&range>.03,'未复现原接收面条纹 '+JSON.stringify({name,acne,range,min:Math.min(...observed),max:Math.max(...observed),g:g.toArray()}));assert(corrected.every(v=>v>1-1e-12),'接收面仍误遮挡 '+name);
  assert(smallDerivatives>0&&compiled.fragmentShader.includes('>1e-20'),'近墙导数退回了误遮挡比较');
  // 真正挡光的盒体仍投下完整阴影, 不能用增大 bias 或让所有样本变亮消除条纹.
  const box=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshBasicMaterial());box.position.copy(surface.position).addScaledVector(towardSun,2);box.updateMatrixWorld(true);
  const receiver=surface.position.clone().addScaledVector(normal,sun.shadow.normalBias).applyMatrix4(projection);
  const shadow=kernel(receiver).reduce((sum,{uv,weight})=>sum+weight*(receiver.z+sun.shadow.bias+g.dot(uv.clone().sub(new T.Vector2(receiver.x,receiver.y)))<=storedDepth(uv,[surface,box])?1:0),0);
  assert.equal(shadow,0,'真实遮挡投影丢失 '+name);
  console.log('PASS 软件投影 '+JSON.stringify({surface:name,samples:observed.length,selfOcclusion:acne.toFixed(3),oldRange:range.toFixed(3),newRange:Math.max(...corrected)-Math.min(...corrected),occluderVisibility:shadow}));
  surface.geometry.dispose();surface.material.dispose();box.geometry.dispose();box.material.dispose();
}
for(const root of [selected,unselected,added])root.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const material of Array.isArray(n.material)?n.material:[n.material])material.dispose();}});
