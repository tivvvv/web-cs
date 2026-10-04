// 人物阴影的纯 Node 几何/时间回归. 捕获真实实例矩阵与阴影相机, 不创建浏览器或 GPU.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ShaderLib } from 'three';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'),c=vm.createContext({FPS:{models:{}},AbortController});
vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('models/character-shadows.js'),c);
const T=c.THREE,factory=c.FPS.models.characterShadows;
function fixture() {
 const model=factory(T,{sun:[-36,29,-28]}),scene=new T.Scene(),view=new T.PerspectiveCamera(),material=new T.MeshStandardMaterial();
 const receiver=new T.Mesh(new T.PlaneGeometry(8,8),material);receiver.receiveShadow=true;scene.add(receiver);
 const player={position:new T.Vector3(101,5,102),debug:false,health:100},outside=new T.WebGLRenderTarget(8,8),calls=[];
 let target=outside;
 const renderer={shadowMap:{autoUpdate:true},autoClear:false,getRenderTarget:()=>target,setRenderTarget:value=>{target=value;},
  render(scene,camera){scene.updateMatrixWorld(true);calls.push({scene,camera,target});}};
 function draw(dt=1/60,update=true) {
  if(update)model.update(dt,{player});model.beforeRender(renderer,scene,view);
  return calls.at(-1);
 }
 function uniforms() {const s={vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader,uniforms:{}};material.onBeforeCompile(s);return s.uniforms;}
 function dispose(){model.dispose();outside.dispose();receiver.geometry.dispose();material.dispose();}
 return {model,scene,view,material,player,renderer,calls,draw,uniforms,dispose};
}
for(const options of [{resolution:0},{resolution:3.5},{extent:0},{extent:Infinity},{bias:-.1}])assert.throws(()=>factory(T,options),/无效/);
const f=fixture(),first=f.draw(0),mesh=first.scene.children[0],m=new T.Matrix4(),g=mesh.geometry.attributes.position;
const initialTarget=first.target,initialBuffer=mesh.instanceMatrix,uniforms=f.uniforms(),shadowMatrix=uniforms.characterMatrix.value;
const released={target:0,geometry:0,material:0};initialTarget.addEventListener('dispose',()=>released.target++);
mesh.geometry.addEventListener('dispose',()=>released.geometry++);mesh.material.addEventListener('dispose',()=>released.material++);
assert.equal(initialTarget.width,1024);assert.equal(initialTarget.textures.length,1);assert.equal(mesh.count,8);
assert(Math.abs(uniforms.characterBias.value*139-.006)<1e-12);
const snapshot=()=>{
 const points=[];
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);for(let j=0;j<g.count;j++)points.push(new T.Vector3().fromBufferAttribute(g,j).applyMatrix4(m).applyMatrix4(shadowMatrix));}
 return points;
};
let previous=snapshot(),maxJump=0;
for(let i=0;i<240;i++) {
 f.player.position.add(new T.Vector3(.001,.0015,-.0007));f.draw(0);
 const current=snapshot();current.forEach((p,j)=>{maxJump=Math.max(maxJump,p.distanceTo(previous[j])*1024);});previous=current;
 assert.equal(f.calls.at(-1).target,initialTarget);assert.equal(mesh.instanceMatrix,initialBuffer);
}
assert(maxJump<.001,'自身投影因阴影相机对齐再次跨像素跳变 '+maxJump);
assert.equal(f.renderer.getRenderTarget().width,8);assert(f.renderer.shadowMap.autoUpdate&&!f.renderer.autoClear);
console.log('PASS 连续水平/竖向位移, 八个身体部件逐顶点像素相位稳定 '+JSON.stringify({maxJump}));

function legAngle(mesh){mesh.getMatrixAt(3,m);const p=new T.Vector3(),q=new T.Euler(),rotation=new T.Object3D();m.decompose(p,rotation.quaternion,rotation.scale);return q.setFromQuaternion(rotation.quaternion).x;}
for(let i=0;i<40;i++){f.player.position.x+=4.7/60;f.draw();}
const walking=legAngle(mesh);assert(Math.abs(walking)>.02);f.draw();const stopped=legAngle(mesh);
assert(Math.abs(stopped-walking)<Math.abs(walking)*.3,'停止移动时腿影瞬间归零');
for(let i=0;i<15;i++)f.draw(0,false);assert.equal(legAngle(mesh),stopped,'暂停/重复预渲染改变身体姿态');
for(let i=0;i<40;i++)f.draw();assert(Math.abs(legAngle(mesh))<.0001);
const slow=[];
for(const fps of [20,60,144]) {
 const x=fixture();x.draw();
 for(let i=0;i<fps;i++){x.player.position.x+=.12/fps;x.draw(1/fps);}
 slow.push(legAngle(x.calls.at(-1).scene.children[0]));x.dispose();
}
assert(slow.every(v=>v>.003)&&Math.max(...slow)-Math.min(...slow)<.0005,'慢速行走姿态依赖帧率 '+JSON.stringify(slow));
for(const fps of [20,60,144])for(const speed of [4.7,8]) {
 const x=fixture();x.draw();let last=0,crossings=0;
 for(let i=0;i<fps*2;i++){x.player.position.x+=speed/fps;x.draw(1/fps);const angle=legAngle(x.calls.at(-1).scene.children[0]);if(angle*last<0)crossings++;last=angle;}
 assert(crossings>=(speed===8?10:5)&&crossings<=(speed===8?14:9),'腿影摆动过快或依赖帧率 '+JSON.stringify({fps,speed,crossings}));x.dispose();
}
console.log('PASS 走停平滑/暂停保持, 20~144 FPS 慢速行走/步行奔跑摆动频率');

// 非均匀缩放叠加关节旋转也要被保守投影范围包含, 扩出的两像素覆盖过滤核.
const actor=new T.Group(),joint=new T.Group(),actorGeometry=new T.BoxGeometry(1,1,1),actorMesh=new T.Mesh(actorGeometry,new T.MeshStandardMaterial());
let borrowedReleased=0;actorGeometry.addEventListener('dispose',()=>borrowedReleased++);
f.draw(0);const ownBounds=f.uniforms().characterBounds.value.slice();
actor.userData.actor={};actor.position.copy(f.player.position).add(new T.Vector3(4,0,3));actor.scale.set(1.8,.7,1.2);actor.rotation.y=.9;
joint.rotation.x=.44;joint.rotation.y=.53;actorMesh.position.y=1;actorMesh.scale.set(.3,1.7,.5);actorMesh.castShadow=true;joint.add(actorMesh);actor.add(joint);f.scene.add(actor);
f.draw();const bounds=f.uniforms().characterBounds.value,point=new T.Vector3();let checked=0;
for(const batch of f.calls.at(-1).scene.children)for(let i=0;i<batch.count;i++) {
 batch.getMatrixAt(i,m);const p=batch.geometry.attributes.position;
 for(let j=0;j<p.count;j++){point.fromBufferAttribute(p,j).applyMatrix4(m).applyMatrix4(shadowMatrix);
  assert(point.x>bounds[0]+1/1024&&point.y>bounds[1]+1/1024&&point.x<bounds[2]-1/1024&&point.y<bounds[3]-1/1024,'角色过滤范围切掉了真实投影');checked++;}
}
assert.equal(checked,216);assert(!actorMesh.castShadow);actor.position.x+=1000;f.draw(0);
assert.deepEqual(f.uniforms().characterBounds.value,ownBounds,'图外角色使过滤范围膨胀到全图');
f.scene.remove(actor);f.draw();assert(actorMesh.castShadow,'移除角色未恢复原太阳投影');assert.equal(borrowedReleased,0,'借用的角色几何被阴影模块释放');
actorGeometry.dispose();actorMesh.material.dispose();
f.player.debug=true;f.draw();assert.equal(f.uniforms().characterEnabled.value,0);assert(f.calls.at(-1).scene.children.every(m=>m.count===0));
f.player.debug=false;f.player.health=0;f.draw();assert.equal(f.uniforms().characterEnabled.value,0);
console.log('PASS 投影范围覆盖真实实例/非均匀缩放/过滤边界, 调试/死亡与角色移除恢复');
f.dispose();f.model.dispose();assert.deepEqual(released,{target:1,geometry:1,material:1});
const failure=fixture();failure.renderer.render=()=>{throw Error('模拟角色投影失败');};
assert.throws(()=>failure.draw(),/投影失败/);assert.equal(failure.renderer.getRenderTarget().width,8);
assert(failure.renderer.shadowMap.autoUpdate&&!failure.renderer.autoClear);failure.dispose();
console.log('PASS 私有资源释放一次/借用几何保留/绘制失败状态恢复');

// 真实身体三角面射线生成局部深度采样; 邻域接收深度用独立的平面交点作为参照.
const contact=fixture(),draw=contact.draw(0),U=contact.uniforms(),matrix=U.characterMatrix.value,size=draw.target.width;
const direction=new T.Vector3(0,0,-1).applyQuaternion(draw.camera.quaternion),ray=new T.Raycaster(),cache=new Map(),origin=new T.Vector3();
function depthAt(x,y) {
 const key=x+'/'+y;if(cache.has(key))return cache.get(key);
 origin.set((x+.5)/size*2-1,(y+.5)/size*2-1,-1).unproject(draw.camera);ray.set(origin,direction);ray.far=139;
 const hit=ray.intersectObjects(draw.scene.children)[0],value={origin:origin.clone(),distance:hit?.distance??Infinity,depth:hit?hit.point.clone().applyMatrix4(matrix).z:1};
 cache.set(key,value);return value;
}
let samples=0,uncorrected=0,occluded=0;
for(const [sx,sz]of [[0,0],[.3,-.2],[-.3,.2]]) {
 const foot=contact.player.position,denominator=direction.y-sx*direction.x-sz*direction.z;
 const center=foot.clone().applyMatrix4(matrix),dx=foot.clone().add(new T.Vector3(1,sx,0)).applyMatrix4(matrix).sub(center),dy=foot.clone().add(new T.Vector3(0,sz,1)).applyMatrix4(matrix).sub(center);
 const determinant=dx.x*dy.y-dx.y*dy.x,gradient=[(dy.y*dx.z-dx.y*dy.z)/determinant,(dx.x*dy.z-dy.x*dx.z)/determinant];
 for(let z=-.2;z<2.7;z+=.08)for(let x=-.2;x<3;x+=.08) {
  const p=foot.clone().add(new T.Vector3(x,sx*x+sz*z,z)).applyMatrix4(matrix),px=Math.floor(p.x*size),py=Math.floor(p.y*size);
  for(let y=0;y<3;y++)for(let x=0;x<3;x++) {
   const ix=px+x-1,iy=py+y-1,value=depthAt(ix,iy),a=value.origin;
   const distance=(foot.y+sx*(a.x-foot.x)+sz*(a.z-foot.z)-a.y)/denominator;
   const expected=Number(value.distance>=distance-.006),z=p.z-U.characterBias.value+gradient[0]*((ix+.5)/size-p.x)+gradient[1]*((iy+.5)/size-p.y);
   assert.equal(Number(value.depth>=z),expected,'逐样本坡面深度与真实平面/身体交点不一致');
   uncorrected+=Number(Number(value.depth>=p.z-U.characterBias.value)!==expected);occluded+=1-expected;samples++;
  }
 }
}
assert(samples>30000&&occluded>300&&uncorrected>30,JSON.stringify({samples,occluded,uncorrected,texels:cache.size}));
contact.dispose();console.log('PASS 三种坡面/真实身体深度/逐样本接触校准 '+JSON.stringify({samples,uncorrected,occluded}));
