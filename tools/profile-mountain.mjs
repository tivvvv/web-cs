// 山区玩家移动的本机 CPU 基准. 原高度场/碰撞/相机代码, 不包含浏览器/模型更新/GPU.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import vm from 'node:vm';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'),html=read('index.html');
const document={body:{dataset:{}}},c=vm.createContext({window:{},FPS:{models:{}},document,console,AbortController});
vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
vm.runInContext(`
 const T=THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(72,1.6,.05,400),solid=[],actors=[],entries=[],ladders=[],keys=new Set(),hints={};
 const player={position:new T.Vector3(),debug:false};player.body={root:player,radius:.32,height:1.75,vy:0,grounded:false};
 let yaw=0,pitch=0,walk=0,weapon,renderEffect;const api={spawn:new T.Vector3()},$=id=>hints[id]??={};
 ${html.slice(html.indexOf('const STEP_HEIGHT'),html.indexOf('function separateBodies()'))}
 ${html.slice(html.indexOf('function createInstance('),html.indexOf('function toggleEnemies()'))}
 ${html.slice(html.indexOf('function updatePlayer(dt)'),html.indexOf('function showMenu('))}
 FPS.models.collisionOnly=()=>({root:new T.Group()});
 globalThis.test={solid,player,keys,createInstance,fall,updatePlayer,stepView,aim:(x,z)=>yaw=Math.atan2(-x,-z)};
`,c);
const t=c.test,layout=c.window.FPS_LAYOUT;
for(const d of layout.instances.filter(i=>i.collision.enabled&&!i.collision.dynamic&&!i.attach))t.createInstance({...d,model:'collisionOnly',traversal:undefined});
const all=[...t.solid],mountain=all.filter(s=>s.id.startsWith('mountain-'));
const routes=[...layout.regionPlan.corners[2].routes.paths,...layout.regionPlan.corners[2].routes.links];
const plans=routes.map(route=>({id:route.id,points:route.points.filter((_,i)=>i%Math.max(1,Math.floor(route.points.length/48))===0)}));
function setup(p,next) {
 t.player.position.set(p[0],p[1]+.15,p[2]);Object.assign(t.player.body,{vy:0,grounded:false,ladder:null,nearLadder:null});t.stepView.offset=0;t.keys.clear();
 for(let i=0;i<30;i++)t.fall(t.player.body,1/60);
 t.aim(next[0]-p[0],next[2]-p[2]);t.keys.add('KeyW');
}
function run(parts,timed=false) {
 t.solid.splice(0,t.solid.length,...parts);const results=[];
 for(const route of plans) {
  const samples=[],positions=[];
  for(let repeat=0;repeat<(timed?5:2);repeat++) for(let i=0;i<route.points.length-1;i++) {
   setup(route.points[i],route.points[i+1]);
   for(let step=0;step<8;step++) {
    const begin=performance.now();t.updatePlayer(1/60);const ms=performance.now()-begin;if(timed)samples.push(ms);
   }
   if(!repeat)positions.push(t.player.position.toArray());
  }
  samples.sort((a,b)=>a-b);results.push({route:route.id,samples:samples.length,meanMs:samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:null,p95Ms:samples[Math.ceil(samples.length*.95)-1]??null,maxMs:samples.at(-1)??null,positions});
 }
 return results;
}
run(all);run(mountain);
const full=run(all,true),isolated=run(mountain,true);
for(let i=0;i<full.length;i++)for(let j=0;j<full[i].positions.length;j++) {
 const a=full[i].positions[j],b=isolated[i].positions[j];if(Math.hypot(...a.map((n,k)=>n-b[k]))>.00001)throw Error('仅山区对照更改了移动结果: '+full[i].route);
}
const report={kind:'Node CPU 玩家移动基准, 非浏览器 FPS/GPU 实测',node:process.version,cpu:cpus()[0]?.model,arch:process.arch,dt:1/60,
 collisionParts:{fullMap:all.length,mountainOnly:mountain.length},routes:full.map((r,i)=>({route:r.route,samples:r.samples,fullMap:{meanMs:r.meanMs,p95Ms:r.p95Ms,maxMs:r.maxMs},mountainOnly:{meanMs:isolated[i].meanMs,p95Ms:isolated[i].p95Ms,maxMs:isolated[i].maxMs}}))};
const output=new URL('../artifacts/mountain-performance/',import.meta.url);mkdirSync(output,{recursive:true});writeFileSync(new URL('cpu.json',output),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
