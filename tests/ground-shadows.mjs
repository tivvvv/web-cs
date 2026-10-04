// 纯 Node: 缓存生命周期/补丁兼容及真实树冠投影的远近采样误差, 不替代 GPU 画面验收.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ShaderLib } from 'three';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const document={createElement(){const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},createLinearGradient:()=>({addColorStop(){}})};
  for(const n of ['save','restore','beginPath','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','clip','fillRect','stroke'])ctx[n]=()=>{};
  return {width:1,height:1,getContext:()=>ctx};}};
const c=vm.createContext({FPS:{models:{}},window:{},document,AbortController});vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const T=c.THREE,layout=c.window.FPS_LAYOUT;
for(const file of ['ground-shadow-cache','character-shadows','park-tree'])vm.runInContext(read('models/'+file+'.js'),c);
const factory=c.FPS.models.groundShadowCache;
const isolated=vm.createContext({FPS:{models:{}}});vm.runInContext(read('models/ground-shadow-cache.js'),isolated);
assert.deepEqual(Object.keys(isolated.FPS.models),['groundShadowCache']);
function fixture(maxTextureSize=4096) {
  const scene=new T.Scene(),root=new T.Group();root.name='ground';
  const material=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.PlaneGeometry(12,8).rotateX(-Math.PI/2),material);mesh.receiveShadow=true;
  root.position.set(2,2.424,5);root.add(mesh);scene.add(root);scene.updateMatrixWorld(true);
  const sunConfig=layout.lights.find(l=>l.type==='sun'),sun=new T.DirectionalLight();sun.castShadow=true;sun.shadow.autoUpdate=false;
  sun.position.set(...sunConfig.position);sun.target.position.set(...sunConfig.target);
  Object.assign(sun.shadow.camera,{left:-140,right:140,top:140,bottom:-140,near:1,far:320});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=sunConfig.shadowBias;sun.shadow.normalBias=sunConfig.shadowNormalBias;sun.shadow.mapSize.set(4096,4096);
  scene.add(sun,sun.target);scene.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);
  let target=null,clear=new T.Color(0x123456),alpha=.3;
  const calls=[],renderer={calls,autoClear:false,shadowMap:{type:T.PCFSoftShadowMap,autoUpdate:true},capabilities:{maxTextureSize,getMaxAnisotropy:()=>16},
    getRenderTarget:()=>target,setRenderTarget:t=>target=t,getClearColor:out=>out.copy(clear),getClearAlpha:()=>alpha,
    setClearColor:(value,a)=>{clear.set(value);alpha=a;},render(s,camera){s.updateMatrixWorld(true);calls.push({scene:s,camera,target,material:s.children[0].material});}};
  return {scene,root,mesh,material,sun,renderer,view:new T.PerspectiveCamera(64,1.6,.05,8000)};
}
function compile(material) {const shader={vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader,uniforms:{}};material.onBeforeCompile(shader,{});return shader;}
const options=Object.freeze({bounds:Object.freeze([-4,1,8,9]),receivers:Object.freeze(['ground']),followers:Object.freeze(['grass']),resolution:256});
assert.throws(()=>factory(T,{bounds:[0,0,0,1]}),/范围无效/);assert.throws(()=>factory(T,{resolution:0}),/尺寸无效/);
const f=fixture(),e=factory(T,options),original=f.material.onBeforeCompile,key=f.material.customProgramCacheKey,previous=new T.WebGLRenderTarget(4,4);
f.renderer.setRenderTarget(previous);e.beforeRender(f.renderer,f.scene);assert.equal(f.renderer.calls.length,0,'深度图生成前不可烘焙');
assert.equal(compile(f.material).uniforms.groundShadowEnabled.value,0);
f.sun.shadow.map=new T.WebGLRenderTarget(1,1);e.prepare(f.renderer,f.scene);
const call=f.renderer.calls[0],cache=call.target;assert.equal(cache.width,256);assert.equal(cache.height,171);
assert.equal(cache.texture.format,T.RedFormat);assert.equal(cache.texture.minFilter,T.LinearMipmapLinearFilter);assert(cache.texture.generateMipmaps);assert.equal(cache.texture.anisotropy,8);
assert.equal(call.material.uniforms.shadowDepth.value,f.sun.shadow.map.texture);assert(call.scene.children[0].geometry===f.mesh.geometry);
assert(call.scene.children[0].matrixWorld.equals(f.mesh.matrixWorld));assert.equal(f.renderer.getRenderTarget(),previous);
assert.equal(f.renderer.getClearAlpha(),.3);assert.equal(f.renderer.getClearColor(new T.Color()).getHex(),0x123456);assert(!f.renderer.autoClear&&f.renderer.shadowMap.autoUpdate);
assert.equal(compile(f.material).uniforms.groundShadowEnabled.value,1);
// 世界原点/纹理朝向与顶视相机投影一致, 保留实际缓丘几何, 不压成平面.
for(const p of [[-4,2.424,1],[8,2.424,9],[2,2.424,5]]) {
  const projected=new T.Vector3(...p).project(call.camera),uv=compile(f.material).uniforms;
  assert(Math.abs((projected.x+1)/2-(p[0]-uv.groundShadowOrigin.value.x)*uv.groundShadowScale.value.x)<1e-8);
  assert(Math.abs((projected.y+1)/2-(p[2]-uv.groundShadowOrigin.value.y)*uv.groundShadowScale.value.y)<1e-8);
}
const traverse=f.root.traverse;f.root.traverse=()=>{throw Error('稳定帧重复扫描');};
for(let i=0;i<120;i++)e.beforeRender(f.renderer,f.scene);assert.equal(f.renderer.calls.length,1,'移动/稳定帧增加了缓存绘制');f.root.traverse=traverse;
f.renderer.shadowMap.type=-1;e.beforeRender(f.renderer,f.scene);assert.equal(compile(f.material).uniforms.groundShadowEnabled.value,0);
f.renderer.shadowMap.type=T.PCFSoftShadowMap;e.beforeRender(f.renderer,f.scene);assert.equal(compile(f.material).uniforms.groundShadowEnabled.value,1);assert.equal(f.renderer.calls.length,1);
const extra=new T.Group();extra.name='ground';const raised=new T.Mesh(new T.PlaneGeometry(2,2).rotateX(-Math.PI/2),new T.MeshStandardMaterial());raised.position.y=3;raised.receiveShadow=true;extra.add(raised);f.scene.add(extra);
e.beforeRender(f.renderer,f.scene);assert.equal(f.renderer.calls.length,2);assert.equal(f.renderer.calls[1].target,cache);assert(compile(raised.material).uniforms.groundShadowEnabled);
const caster=f.renderer.calls[1].scene.children.find(n=>n.geometry===raised.geometry);assert(caster.matrixWorld.equals(raised.matrixWorld),'新接收面的抬升/变换未保留');
const grassRoot=new T.Group();grassRoot.name='grass';const grass=new T.InstancedMesh(new T.PlaneGeometry(.2,.2),new T.MeshStandardMaterial(),1);grass.receiveShadow=true;grassRoot.add(grass);f.scene.add(grassRoot);
e.beforeRender(f.renderer,f.scene);assert(compile(grass.material).uniforms.groundShadowEnabled);assert.equal(f.renderer.calls.length,2,'地被错误写入缓存, 导致风动变成静态自阴影');
assert(!f.renderer.calls[1].scene.children.some(n=>n.geometry===grass.geometry));
let released=0,geometryReleased=0;cache.addEventListener('dispose',()=>released++);f.mesh.geometry.addEventListener('dispose',()=>geometryReleased++);
e.dispose();e.dispose();assert.equal(released,1);assert.equal(geometryReleased,0);assert.equal(f.material.onBeforeCompile,original);assert.equal(f.material.customProgramCacheKey,key);
assert.equal(compile(f.material).uniforms.groundShadowEnabled,undefined);
// 角色投影以两种顺序包覆, 共享材质释放后重用, 都必须保留两种影子.
for(const reverse of [false,true]) {
  const f=fixture(),e=factory(T,options),actors=c.FPS.models.characterShadows(T),base=f.material.onBeforeCompile;
  const addGround=()=>e.beforeRender(f.renderer,f.scene),addActors=()=>actors.beforeRender(f.renderer,f.scene,f.view);
  if(reverse){addGround();addActors();}else{addActors();addGround();}
  let shader=compile(f.material);assert(shader.fragmentShader.includes('directLight.color *= characterShadow()'));assert(shader.fragmentShader.includes('float uncachedGroundShadow('));
  f.material.dispose();addGround();addActors();shader=compile(f.material);assert(shader.fragmentShader.includes('directLight.color *= characterShadow()')&&shader.uniforms.groundShadowEnabled);
  if(reverse){e.dispose();actors.dispose();}else{actors.dispose();e.dispose();}
  shader=compile(f.material);assert(!shader.fragmentShader.includes('groundShadowMap')&&!shader.fragmentShader.includes('characterDepth'));
  assert.equal(f.material.customProgramCacheKey(),base.toString());
}
for(const fail of [false,true]) {
  const f=fixture(128),e=factory(T,{...options,bounds:[-4,1,8,25]});f.sun.shadow.map=new T.WebGLRenderTarget(1,1);
  const render=f.renderer.render;if(fail)f.renderer.render=()=>{throw Error('模拟缓存失败');};
  if(fail)assert.throws(()=>e.prepare(f.renderer,f.scene),/模拟缓存失败/);else {e.prepare(f.renderer,f.scene);assert.equal(f.renderer.calls[0].target.height,128);}
  assert.equal(f.renderer.getRenderTarget(),null);assert(!f.renderer.autoClear&&f.renderer.shadowMap.autoUpdate);assert.equal(f.renderer.getClearAlpha(),.3);
  f.renderer.render=render;e.dispose();assert(!compile(f.material).fragmentShader.includes('groundShadowMap'));
}
console.log('PASS 独立接入/地形与顶视 UV/单通道 mipmap/稳定帧零绘制零遍历/补丁顺序/复用/释放/失败回退/硬件降级');

// 同一斜面的相邻阴影像素不能直接共用中心深度; 验证逐样本平面修正消除自遮蔽.
const matrixForPlane=fixture().sun.shadow.matrix;let acne=0;
for(const [ax,az] of [[0,0],[.3,-.2],[-.3,.2]]) {
  const center=new T.Vector3(0,2.424,90).applyMatrix4(matrixForPlane),dx=new T.Vector3(1,2.424+ax,90).applyMatrix4(matrixForPlane).sub(center),dy=new T.Vector3(0,2.424+az,91).applyMatrix4(matrixForPlane).sub(center);
  const det=dx.x*dy.y-dx.y*dy.x,gx=(dy.y*dx.z-dx.y*dy.z)/det,gy=(dx.x*dy.z-dy.x*dx.z)/det;
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++) {
    const delta=gx*x/4096+gy*y/4096,receiver=center.z-.000015,depth=center.z+delta;
    if(receiver>depth)acne++;assert(receiver+delta<=depth,'逐样本平面修正仍误判为自阴影');
    assert(receiver+delta>depth-.002,'平面修正错误抹去了高于地表的实体阴影');
  }
}
assert(acne>20);console.log('PASS 三种接收坡面逐样本深度修正, 保留实体遮挡且不增大接触偏移');

// 用真实入口树的几何/孔隙/太阳矩阵生成局部软件深度图, 比较点采样与 mipmap 重建.
const treeConfig=layout.instances.find(n=>n.id==='park-tree-23'),tree=c.FPS.models.parkTree(T,treeConfig.options);
tree.root.position.set(...treeConfig.position);tree.root.rotation.set(...treeConfig.rotation);tree.root.scale.set(...treeConfig.scale);tree.root.updateMatrixWorld(true);
const sun=fixture().sun,N=4096,matrix=sun.shadow.matrix,triangles=[];
for(const mesh of tree.root.children.filter(n=>n.castShadow)) {
  const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv,index=g.index;
  for(let i=0;i<index.count;i+=3)triangles.push({map:mesh.material.map?.isDataTexture?mesh.material.map:null,points:[0,1,2].map(j=>{
    const k=index.getX(i+j),v=new T.Vector3().fromBufferAttribute(p,k).applyMatrix4(mesh.matrixWorld).applyMatrix4(matrix);
    return {x:v.x*N,y:v.y*N,z:v.z,u:uv.getX(k),v:uv.getY(k)};
  })});
}
const points=triangles.flatMap(t=>t.points),sx=Math.floor(Math.min(...points.map(p=>p.x)))-3,sy=Math.floor(Math.min(...points.map(p=>p.y)))-3;
const sw=Math.ceil(Math.max(...points.map(p=>p.x)))-sx+4,sh=Math.ceil(Math.max(...points.map(p=>p.y)))-sy+4;
const depths=new Float32Array(sw*sh).fill(1),edge=(a,b,x,y)=>(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);
const clamp=(v,n)=>Math.max(0,Math.min(n-1,v));
function alpha(map,u,v) {const {data,width:w,height:h}=map.image,x=u*w-.5,y=v*h-.5,a=Math.floor(x),b=Math.floor(y),fx=x-a,fy=y-b;
  const pixel=(i,j)=>data[(clamp(j,h)*w+clamp(i,w))*4+3]/255;
  return (pixel(a,b)*(1-fx)+pixel(a+1,b)*fx)*(1-fy)+(pixel(a,b+1)*(1-fx)+pixel(a+1,b+1)*fx)*fy;
}
for(const {points:[a,b,d],map} of triangles) {
  const area=edge(a,b,d.x,d.y);if(Math.abs(area)<1e-9)continue;
  for(let y=Math.floor(Math.min(a.y,b.y,d.y));y<=Math.ceil(Math.max(a.y,b.y,d.y));y++)for(let x=Math.floor(Math.min(a.x,b.x,d.x));x<=Math.ceil(Math.max(a.x,b.x,d.x));x++) {
    const v=edge(a,b,x+.5,y+.5)/area,w=edge(b,d,x+.5,y+.5)/area,u=1-v-w;
    if(Math.min(u,v,w)<0||map&&alpha(map,a.u*w+b.u*u+d.u*v,a.v*w+b.v*u+d.v*v)<.45)continue;
    const i=(y-sy)*sw+x-sx;depths[i]=Math.min(depths[i],a.z*w+b.z*u+d.z*v);
  }
}
function visibility(x,z) {
  const q=new T.Vector3(x,2.424+sun.shadow.normalBias,z).applyMatrix4(matrix),px=q.x*N,py=q.y*N;
  const bx=Math.floor(px+.5)-2,by=Math.floor(py+.5)-2,fx=px+.5-Math.floor(px+.5),fy=py+.5-Math.floor(py+.5);
  const wx=[1-fx,1,1,fx],wy=[1-fy,1,1,fy];let sum=0;
  for(let j=0;j<4;j++)for(let i=0;i<4;i++) {
    const a=bx+i,b=by+j,depth=a>=sx&&a<sx+sw&&b>=sy&&b<sy+sh?depths[(b-sy)*sw+a-sx]:1;
    sum+=wx[i]*wy[j]*(q.z+sun.shadow.bias<=depth?1:0);
  }
  return sum/9;
}
const resolution=512,step=98.6/2048,wx0=-12,wz0=80,levels=[{n:resolution,data:new Float32Array(resolution*resolution)}];
for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++)levels[0].data[y*resolution+x]=visibility(wx0+(x+.5)*step,wz0+(y+.5)*step);
assert(levels[0].data.some(v=>v<.2),'入口树的实际投影未进入比较范围');
for(let n=resolution/2;n>=1;n/=2) {const old=levels.at(-1),data=new Float32Array(n*n);for(let y=0;y<n;y++)for(let x=0;x<n;x++)data[y*n+x]=[0,1].flatMap(j=>[0,1].map(i=>old.data[(y*2+j)*old.n+x*2+i])).reduce((a,b)=>a+b)/4;levels.push({n,data});}
function bilinear(level,x,z) {const {n,data}=levels[level],px=(x-wx0)/(step*2**level)-.5,py=(z-wz0)/(step*2**level)-.5,a=Math.floor(px),b=Math.floor(py),fx=px-a,fy=py-b;
  const p=(i,j)=>data[clamp(j,n)*n+clamp(i,n)];return (p(a,b)*(1-fx)+p(a+1,b)*fx)*(1-fy)+(p(a,b+1)*(1-fx)+p(a+1,b+1)*fx)*fy;
}
function mip(x,z,lod) {lod=Math.max(0,Math.min(levels.length-1,lod));const a=Math.floor(lod),f=lod-a;return bilinear(a,x,z)*(1-f)+bilinear(Math.min(a+1,levels.length-1),x,z)*f;}
let oldError=0,newError=0,samples=0;
// 1080 高画面的透视地表像素, 沿鸟居入口从 50 米走到 12 米; 每次对照 144 子样本面积均值.
for(const distance of [50,40,30,20,12])for(let z=85;z<99;z+=.37)for(let x=-8;x<2;x+=.31) {
  const forward=distance+z-92,focal=1080/(2*Math.tan(64*Math.PI/360)),dx=forward/focal,dz=forward*forward/(focal*1.7);
  const center=visibility(x,z);let average=0;
  for(let j=0;j<36;j++)for(let i=0;i<4;i++)average+=visibility(x+(i/4+.125-.5)*dx,z+(j/36+1/72-.5)*dz)/144;
  if(average>.99||average<.01)continue;
  const lod=Math.log2(Math.max(dx,dz/8)/step);let filtered=0;
  for(let j=0;j<8;j++)filtered+=mip(x,z+(j/8+1/16-.5)*dz,lod)/8;
  oldError+=Math.abs(center-average);newError+=Math.abs(filtered-average);samples++;
}
assert(samples>300);assert(newError<oldError*.55,'远近重建误差未显著下降 '+JSON.stringify({oldError,newError,samples}));
console.log('PASS 真实入口树软件投影/1080p 地表像素面积比较 '+JSON.stringify({samples,pointMeanError:oldError/samples,filteredMeanError:newError/samples,reduction:1-newError/oldError}));
tree.dispose();
