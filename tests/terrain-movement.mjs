// 纯 Node 坡面移动回归. 调用原身体移动, 验证斜向横坡/陡坡退回与山区非主路.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'),html=read('index.html');
const c=vm.createContext({window:{},FPS:{models:{}},console,AbortController});
vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const T=c.THREE,layout=c.window.FPS_LAYOUT;
vm.runInContext(`
 const T=THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(),solid=[],actors=[],entries=[],ladders=[];
 const player={position:new T.Vector3(),debug:false};player.body={root:player,radius:.32,height:1.75,vy:0,grounded:false};
 const api={spawn:new T.Vector3()},hints={},$=id=>hints[id]??={};let yaw=0,pitch=0,weapon,renderEffect;
 ${html.slice(html.indexOf('const STEP_HEIGHT'),html.indexOf('function separateBodies()'))}
 ${html.slice(html.indexOf('function createInstance('),html.indexOf('function toggleEnemies()'))}
 FPS.models.collisionOnly=()=>({root:new T.Group()});
 globalThis.t={solid,actors,player,move,fall,blockedAt,bodiesOverlap,terrainSurface,createInstance};
`,c);
const t=c.t;let fixtureId=0;
function plane(gx,gz,maxSlope=1,rotation=0,scale=[1,1,1]) {
 t.solid.length=t.actors.length=0;
 const heights=[[-6,-6],[6,-6],[-6,6],[6,6]].map(([x,z])=>14+gx*x+gz*z);
 const model=t.createInstance({id:'slope-fixture-'+fixtureId++,model:'collisionOnly',position:[300,0,300],rotation:[0,rotation,0],scale,
  collision:{enabled:true,boxes:[{size:[12,30,12],offset:[0,15,0],heightfield:{columns:2,rows:2,heights,maxSlope}}]}});
 return {model,box:t.solid[0].box};
}
function reset(p,box){t.player.position.copy(p);t.player.position.y=t.terrainSurface(p,.32,box).top;Object.assign(t.player.body,{vy:0,grounded:true,ladder:null});}
function travel(vector,fps,seconds=.3,speed=4.7) {
 const frames=Math.round(fps*seconds),dt=seconds/frames,direction=vector.clone().normalize();
 for(let i=0;i<frames;i++){t.move(t.player,direction.x*speed*dt,direction.z*speed*dt);t.fall(t.player.body,dt);}
 return direction.multiplyScalar(speed*seconds);
}
for(const gx of [-1,1])for(const gz of [-1,1])for(const [rotation,scale]of [[0,[1,1,1]],[.63,[1.1,.95,.9]]])for(const fps of [20,60,144]) {
 const {model,box}=plane(gx,gz,1,rotation,scale),origin=new T.Vector3(300,0,300);
 for(const sign of [-1,1]){reset(origin,box);const start=t.player.position.clone(),local=new T.Vector3(gz*sign,0,-gx*sign),world=local.applyMatrix4(model.root.matrixWorld).sub(origin),delta=travel(world,fps);
  const expected=start.clone().add(delta);assert(t.player.position.distanceTo(expected)<1e-5,'沿陡坡等高线横走被坐标轴上坡分量误拦 '+JSON.stringify({gx,gz,fps,rotation,actual:t.player.position.toArray(),expected:expected.toArray()}));}
 reset(origin,box);const start=t.player.position.clone(),up=new T.Vector3(gx,0,gz).applyMatrix4(model.root.matrixWorld).sub(origin);travel(up,fps);
 assert(Math.hypot(t.player.position.x-start.x,t.player.position.z-start.z)<.035,'陡坡限制被绕过');
 reset(origin,box);const down=travel(up.clone().negate(),fps);assert(Math.hypot(t.player.position.x-origin.x-down.x,t.player.position.z-origin.z-down.z)<1e-5,'陡坡无法退回下坡');
}
console.log('PASS 旋转/缩放陡坡等高线双向横走, 20~144 FPS, 禁止登陡壁且可退回');
for(const fps of [20,60,144])for(const sign of [-1,1]) {
 const {box}=plane(.65,.55),origin=new T.Vector3(300,0,300);reset(origin,box);const expected=origin.clone().add(travel(new T.Vector3(sign,0,sign),fps));
 assert(Math.hypot(t.player.position.x-expected.x,t.player.position.z-expected.z)<1e-5&&t.player.body.grounded,'自然缓坡通行失败');
 assert(!t.blockedAt(t.player.position,.32,1.75,[]));
}
console.log('PASS 较陡草坡斜向上下/步行落脚');
const {box:flat}=plane(0,0);reset(new T.Vector3(300,14,300),flat);
t.createInstance({id:'wall-fixture',model:'collisionOnly',position:[301,16,300],collision:{enabled:true,size:[.2,4,12]}});
travel(new T.Vector3(1,0,1),60,.6);assert(t.player.position.x<=300.581&&t.player.position.z>301,'墙边贴边/实体阻挡失效');assert(!t.blockedAt(t.player.position,.32,1.75,[]));
t.solid.splice(1);reset(new T.Vector3(300,14,300),flat);
const actor={alive:true,root:new T.Group()};actor.root.position.set(300.8,14,300);actor.body={root:actor.root,radius:.4,height:1.8};t.actors.push(actor);
travel(new T.Vector3(1,0,.12),60,.2);assert(!t.bodiesOverlap(t.player.position,.32,1.75,actor.body),'斜向移动穿过动态身体');
console.log('PASS 斜向实体墙贴边/动态身体阻挡');
t.solid.length=t.actors.length=0;
for(const data of layout.instances.filter(i=>i.collision.enabled&&!i.collision.dynamic&&!i.attach))t.createInstance({...data,model:'collisionOnly',traversal:undefined});
const all=[...t.solid],terrain=all.find(s=>s.id==='mountain-terrain'&&s.box.heightfield),paths=[...layout.regionPlan.corners[2].routes.paths,...layout.regionPlan.corners[2].routes.links];
const pathDistance=(p,path)=>Math.min(...path.points.slice(1).map((b,i)=>{const a=path.points[i],dx=b[0]-a[0],dz=b[2]-a[2],u=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[2])*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a[0]-dx*u,p.z-a[2]-dz*u);}));
let samples=0,walks=0,escapes=0;
for(let z=80.37;z<152;z+=3)for(let x=72.29;x<168;x+=3) {
 const origin=new T.Vector3(x,40,z),surface=t.terrainSurface(origin,.32,terrain.box);origin.y=surface.top;
 if(paths.some(path=>pathDistance(origin,path)<path.width/2+.7))continue;
 t.solid.splice(0,t.solid.length,...all.filter(s=>s.box.min.x<x+1&&s.box.max.x>x-1&&s.box.min.z<z+1&&s.box.max.z>z-1));
 if(t.blockedAt(origin,.32,1.75,[]))continue;samples++;let farthest=0;
 for(let direction=0;direction<8;direction++) {
  const vector=new T.Vector3(Math.cos(direction*Math.PI/4),0,Math.sin(direction*Math.PI/4)),target=origin.clone().addScaledVector(vector,.24);
  const open=surface.slope<=.98&&[1,2,3,4].every(k=>{const p=origin.clone().lerp(target,k/4),next=t.terrainSurface(p,.32,terrain.box);p.y=next.top;return next.slope<=.98&&!t.blockedAt(p,.32,1.75,[]);});
  reset(origin,terrain.box);travel(vector,60,.05,4.8);const moved=Math.hypot(t.player.position.x-origin.x,t.player.position.z-origin.z);farthest=Math.max(farthest,moved);
  if(open){assert(Math.hypot(t.player.position.x-target.x,t.player.position.z-target.z)<.003,'非主路可走草坡被误拦 '+JSON.stringify({origin:origin.toArray(),target:target.toArray(),actual:t.player.position.toArray()}));walks++;}
 }
 assert(farthest>.07,'非主路地形陷阱, 八方向均无法退出 '+JSON.stringify(origin.toArray()));escapes++;
}
assert(samples>500&&walks>1800);console.log('PASS 非主路八方向草坡/林间/岩边通行和退回 '+JSON.stringify({samples,walks,escapes}));
