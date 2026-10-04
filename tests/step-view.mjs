// 纯 Node 楼梯视角回归: 原物理/相机/射击/帧循环, 不启动浏览器或 GPU.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'),html=read('index.html');
const document={body:{dataset:{}}},c=vm.createContext({window:{},FPS:{models:{}},document,console,AbortController,performance});
vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const T=c.THREE,layout=c.window.FPS_LAYOUT;
vm.runInContext(`
 const T=THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(72,1.6,.05,400),solid=[],actors=[],entries=[],ladders=[],keys=new Set(),hints={},effects=[];
 const player={position:new T.Vector3(),debug:false};player.body={root:player,radius:.32,height:1.75,vy:0,grounded:false};
 const api={spawn:new T.Vector3(),flash:{position:new T.Vector3(),intensity:0}},events=[],draws=[],failures=[];
 let yaw=0,pitch=0,walk=0,weapon,renderEffect,mode='playing',ready=true,last=0,time=0,hudElapsed=0,enemiesEnabled=true;
 let ammo=30,cooldown=0,reloadLeft=0,recoil=0,recoilSpeed=0,firing=false,dragging=false,hurt=0,hit=0,toastLeft=0,hurtSource,kills=0,total=0;
 let audio={resume:()=>Promise.resolve()},soundOutput={},muted=false;
 const layout={mode:'combat'},$=id=>hints[id]??={style:{},classList:{toggle(){}},requestPointerLock:async()=>{}};
 const renderer={info:{render:{calls:0,triangles:0},reset(){}},shadowMap:{},clearDepth(){},render(){}};
 function report(scope,e){failures.push(String(e));} function updateHUD(){} function updateBodyWireframes(){} function syncCollisionWireframes(){}
 function gunSound(){} function tone(){} function damagePlayer(){} function reload(){}
 function effect(name,options){events.push({name,options});} function reloadSound(){} function finish(){}
 function renderWorld(){draws.push(camera.position.clone());}
 ${html.slice(html.indexOf('const frameStats ='),html.indexOf('const STEP_HEIGHT'))}
 ${html.slice(html.indexOf('const STEP_HEIGHT'),html.indexOf('function separateBodies()'))}
 ${html.slice(html.indexOf('function separateBodies()'),html.indexOf('function updateBodyWireframes()'))}
 ${html.slice(html.indexOf('function shoot('),html.indexOf('function reload()'))}
 ${html.slice(html.indexOf('function createInstance('),html.indexOf('function toggleEnemies()'))}
 ${html.slice(html.indexOf('function toggleDebug()'),html.indexOf('function syncCollisionWireframes()'))}
 ${html.slice(html.indexOf('function updatePlayer(dt)'),html.indexOf("$('start').onclick"))}
 ${html.slice(html.indexOf('function frame(stamp)'),html.indexOf('async function prepareScene()'))}
 FPS.models.collisionOnly=()=>({root:new T.Group()});
 globalThis.t={scene,camera,solid,actors,entries,keys,player,api,stepView,events,draws,failures,createInstance,move,fall,updatePlayer,advanceStepView,syncPlayerCamera,eye,playerFire,frame,pause,start,toggleDebug,
  aim:(y,p=0)=>{yaw=y;pitch=p;},fireReady:()=>{cooldown=reloadLeft=0;ammo=30;firing=false;},
  setMode:v=>{mode=v;},resetTime:()=>{last=time=hudElapsed=0;},get mode(){return mode;},get ammo(){return ammo;},
  setWeapon:v=>{weapon=v;}};
`,c);
const t=c.t;
for(const data of layout.instances.filter(i=>i.collision.enabled&&!i.collision.dynamic&&!i.attach))t.createInstance({...data,model:'collisionOnly',traversal:undefined});
const allSolids=[...t.solid];
function reset(p){t.player.position.set(...p);t.player.debug=false;Object.assign(t.player.body,{vy:0,grounded:false,ladder:null,nearLadder:null});t.stepView.offset=0;t.keys.clear();t.actors.length=0;t.setMode('playing');t.aim(0);t.syncPlayerCamera();}
function select(points){const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]),range=new T.Box3(new T.Vector3(Math.min(...xs)-.8,-2,Math.min(...zs)-.8),new T.Vector3(Math.max(...xs)+.8,45,Math.max(...zs)+.8));
 t.solid.splice(0,t.solid.length,...allSolids.filter(s=>s.box.intersectsBox(range)));}
const routes=[layout.regionPlan.corners[2].routes.stairs[0],layout.regionPlan.corners[2].routes.stairs.find(r=>r.id==='west-summit'),layout.regionPlan.corners[3].routes.stairs[0]];
const metrics=[];
for(const route of routes)for(const speed of [4.7,8])for(const fps of [20,30,60,120,240])for(const reverse of [false,true]) {
 const direction=new T.Vector3(...route.b).sub(new T.Vector3(...route.a));direction.y=0;direction.normalize();
 const lower=new T.Vector3(...route.a).addScaledVector(direction,-.45),upper=new T.Vector3(...route.b).addScaledVector(direction,.45);
 const from=reverse?upper:lower,to=reverse?lower:upper,forward=direction.clone().multiplyScalar(reverse?-1:1);
 select([from.toArray(),to.toArray()]);reset([from.x,from.y+.1,from.z]);for(let i=0;i<30;i++)t.fall(t.player.body,1/60);t.stepView.offset=0;t.syncPlayerCamera();
 t.aim(Math.atan2(-forward.x,-forward.z));t.keys.add('KeyW');if(speed===8)t.keys.add('ShiftLeft');
 let previousBody=t.player.position.y,previousView=t.camera.position.y,bodyPeak=0,viewPeak=0,bodyJolt=0,viewJolt=0,bodyDelta=0,viewDelta=0,frames=0;
 while(to.clone().sub(t.player.position).dot(forward)>.01&&++frames<5000) {
  t.updatePlayer(1/fps);const dy=t.player.position.y-previousBody,vy=t.camera.position.y-previousView;
  bodyPeak=Math.max(bodyPeak,Math.abs(dy));viewPeak=Math.max(viewPeak,Math.abs(vy));
  bodyJolt=Math.max(bodyJolt,Math.abs(dy-bodyDelta));viewJolt=Math.max(viewJolt,Math.abs(vy-viewDelta));bodyDelta=dy;viewDelta=vy;
  assert(t.player.body.grounded,'连续楼梯意外进入自由落体 '+JSON.stringify({route:route.id,speed,fps,reverse,frames}));
  assert.equal(t.camera.position.x,t.player.position.x);assert.equal(t.camera.position.z,t.player.position.z);
  assert(Math.abs(t.camera.position.y-t.eye().y)<.421,'视角偏移积累失控');previousBody=t.player.position.y;previousView=t.camera.position.y;
 }
 assert(frames<5000&&Math.abs(t.player.position.y-to.y)<.04,'平滑改变了楼梯通行/落脚');
 // 奔跑上陡阶的平均升高不能消失; 颠簸用相邻帧垂直位移的突变衡量, 而非把爬升速度当作抖动.
 assert(viewPeak<bodyPeak&&viewJolt<bodyJolt*.6,'楼梯颠簸未明显降低 '+JSON.stringify({route:route.id,speed,fps,reverse,bodyPeak,viewPeak,bodyJolt,viewJolt}));
 t.keys.clear();for(let i=0;i<Math.ceil(.7*fps);i++)t.updatePlayer(1/fps);assert(Math.abs(t.camera.position.y-t.eye().y)<.0001,'停步后高度残留/漂移');
 metrics.push({fps,speed,reverse,ratio:viewPeak/bodyPeak,joltRatio:viewJolt/bodyJolt});
}
console.log('PASS 三种现场楼梯上下/步行奔跑/20~240 FPS, '+metrics.length+' 组路径, 最大垂直位移突变比例 '+Math.max(...metrics.map(m=>m.joltRatio)).toFixed(3));
// 相同持续时间的消退不随帧率变化, 重复同步不推进缓冲或迟滞转向.
const tails=[];t.solid.length=0;reset([0,0,0]);
for(const fps of [30,60,120,240]){t.stepView.offset=-.21;for(let i=0;i<fps/10;i++)t.advanceStepView(1/fps);tails.push(t.stepView.offset);}
assert(Math.max(...tails)-Math.min(...tails)<1e-12);
t.stepView.offset=-.12;t.aim(.73,-.26);t.syncPlayerCamera();const pose=t.camera.position.clone(),q=t.camera.quaternion.clone();
for(let i=0;i<10;i++)t.syncPlayerCamera();assert(t.camera.position.equals(pose));assert(t.camera.quaternion.equals(q));
const expected=new T.PerspectiveCamera();expected.rotation.set(-.26,.73,0,'YXZ');assert(t.camera.quaternion.angleTo(expected.quaternion)<1e-7);
console.log('PASS 按时间消退/即时转向/重复同步不重复平滑');
const floor={root:new T.Group(),box:new T.Box3(new T.Vector3(-20,-.5,-20),new T.Vector3(20,0,20))};
t.solid.splice(0,t.solid.length,floor);reset([0,0,0]);t.player.body.grounded=true;
const smallStep={root:new T.Group(),box:new T.Box3(new T.Vector3(-2,0,-2),new T.Vector3(2,.02,2))};t.solid.push(smallStep);
const beforeSnap=t.camera.position.y;t.updatePlayer(1/60);assert.equal(t.player.position.y,.02);assert(t.camera.position.y-beforeSnap<.01,'落地容差中的微抬升跳过了平滑');
console.log('PASS 支撑面容差内的小高差连续过渡');
t.solid.splice(0,t.solid.length,floor);reset([0,0,0]);t.player.body.grounded=true;t.stepView.offset=-.18;t.syncPlayerCamera();
const oldView=t.camera.position.y;t.keys.add('Space');t.updatePlayer(1/60);assert(t.player.position.y>.09&&t.camera.position.y-oldView>.09,'跳跃被视角低通延迟');
t.keys.clear();for(let i=0;i<120;i++)t.updatePlayer(1/60);assert.equal(t.player.position.y,0);assert.equal(t.stepView.offset,0);
reset([0,3,0]);for(let i=0;i<90;i++){t.updatePlayer(1/60);assert.equal(t.stepView.offset,0);assert.equal(t.camera.position.y,t.eye().y);}
reset([0,0,0]);t.stepView.offset=-.15;t.player.body.ladder={};t.advanceStepView(1/60);assert.equal(t.stepView.offset,0);t.player.body.ladder=null;
t.stepView.offset=.17;t.toggleDebug();assert(t.player.debug&&t.stepView.offset===0&&t.camera.position.y===t.eye().y);t.stepView.offset=-.13;t.toggleDebug();assert(!t.player.debug&&t.stepView.offset===0);
reset([0,-20,0]);t.stepView.offset=-.2;t.fall(t.player.body,1/60);assert(t.player.position.equals(t.api.spawn)&&t.stepView.offset===0);
console.log('PASS 跳跃/自由落体/攀爬/调试/重生的直接响应');
// 下阶视点不能穿过低顶棚或上方动态身体, 离开后也不能恢复过大的旧偏移.
reset([0,0,0]);const roof={root:new T.Group(),box:new T.Box3(new T.Vector3(-2,1.82,-2),new T.Vector3(2,2.2,2))};t.solid.push(roof);t.stepView.offset=.21;t.syncPlayerCamera();
assert(t.camera.position.y<=1.78+1e-10);const clipped=t.stepView.offset;t.solid.pop();t.syncPlayerCamera();assert.equal(t.stepView.offset,clipped);
const actor={alive:true,root:new T.Group(),body:{radius:.42,height:1.75}};actor.root.position.set(0,1.8,0);t.actors.push(actor);t.stepView.offset=.21;t.syncPlayerCamera();assert(t.camera.position.y<=1.76+1e-10);
t.actors.length=0;console.log('PASS 下阶视点的顶棚/动态身体安全净距');
// 执行真实单击/连射入口和射击函数, 小靶置于相机中心射线, 物理眼高将会错过它.
for(const offset of [-.19,.16]) {
 t.solid.splice(0,t.solid.length,floor);reset([0,0,0]);t.stepView.offset=offset;t.aim(.31,-.12);t.syncPlayerCamera();
 const direction=t.camera.getWorldDirection(new T.Vector3()),target=new T.Mesh(new T.BoxGeometry(.06,.06,.06),new T.MeshBasicMaterial());
 target.position.copy(t.camera.position).addScaledVector(direction,7);t.scene.add(target);target.updateMatrixWorld(true);t.solid.push({root:target,box:new T.Box3().setFromObject(target)});
 const root=new T.Group(),muzzle=new T.Object3D();muzzle.position.set(.2,-.15,-.8);root.add(muzzle);t.camera.add(root);t.setWeapon({root,muzzle});
 t.events.length=0;t.fireReady();const before=t.stepView.offset;t.playerFire();assert.equal(t.ammo,29);assert.equal(t.stepView.offset,before,'单击消退了缓冲');
 const impact=t.events.find(e=>e.name==='bulletmark');assert(impact&&impact.options.parent===target,'平滑后的准星没有命中小靶');
 const screen=impact.options.position.clone().project(t.camera);assert(Math.hypot(screen.x,screen.y)<.006,'命中点偏离准星');
 const flash=t.events.find(e=>e.name==='flash');assert(flash.options.position.distanceTo(muzzle.getWorldPosition(new T.Vector3()))<1e-10,'枪口没有跟随当前相机');
 root.removeFromParent();t.setWeapon(undefined);target.removeFromParent();target.geometry.dispose();target.material.dispose();
}
console.log('PASS 上下阶视点的真实射线/准星/即时单击/枪口一致');
// 原帧循环不得二次消退或把相机恢复为物理眼高, 暂停和继续保留同一视点.
t.solid.splice(0,t.solid.length,floor);reset([0,0,0]);t.player.body.grounded=true;t.stepView.offset=-.21;t.resetTime();t.frame(1000);const first=t.stepView.offset;
t.frame(1000+1000/60);assert(Math.abs(t.stepView.offset-first*Math.exp(-1/60/.07))<1e-12);assert(t.draws.at(-1).equals(t.camera.position));assert(t.camera.position.y<t.eye().y-.1);
const paused=t.camera.position.clone(),offset=t.stepView.offset;t.pause();t.frame(1300);assert(t.camera.position.equals(paused)&&t.stepView.offset===offset);
await t.start();assert.equal(t.mode,'playing');assert(t.camera.position.equals(paused)&&t.stepView.offset===offset);assert.deepEqual(Array.from(t.failures),[]);
console.log('PASS 原帧循环仅一次消退, 暂停/继续保持视点, 无浏览器/GPU 运行');
