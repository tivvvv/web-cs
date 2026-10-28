// 场景通行图/巡逻出生点/六部竖梯的实际物理回归, 无浏览器或 GPU.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),html=read('index.html'),c=vm.createContext({window:{},FPS:{models:{}},console,AbortController});vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const T=c.THREE,layout=c.window.FPS_LAYOUT,nav=layout.instances.find(i=>i.options?.navigation).options.navigation;
vm.runInContext(`const T=THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(),solid=[],entries=[],actors=[],ladders=[],keys=new Set(),player={position:new T.Vector3(500,0,500),debug:true,body:{height:1.75,radius:.32}},api={spawn:new T.Vector3()};let weapon,renderEffect,yaw=0,pitch=0;${html.slice(html.indexOf('const STEP_HEIGHT'),html.indexOf('function separateBodies()'))}${html.slice(html.indexOf('function createInstance('),html.indexOf('function toggleEnemies()'))}FPS.models.empty=()=>({root:new T.Group()});FPS.models.body=()=>({root:new T.Group(),alive:true,damage(){}});globalThis.t={solid,actors,ladders,scene,player,createInstance,blockedAt,terrainSurface,footprint,bodiesOverlap,move,fall,climbBody,physicalBodies};`,c);
const t=c.t;for(const d of layout.instances.filter(i=>i.collision.enabled&&!i.collision.dynamic&&!i.attach))t.createInstance({...d,model:'empty'});
const adjacency=nav.nodes.map(()=>[]);for(const e of nav.edges){assert(e.a!==e.b);adjacency[e.a].push(e.b);adjacency[e.b].push(e.a);}
const reached=new Set([0]),queue=[0];for(let i=0;i<queue.length;i++)for(const n of adjacency[queue[i]])if(!reached.has(n)){reached.add(n);queue.push(n);}assert.equal(reached.size,nav.nodes.length,'存在孤立导航分量');
for(const d of layout.instances.filter(i=>i.model==='enemy'))assert(!t.blockedAt(new T.Vector3(...d.position).add(new T.Vector3(0,.04,0)),d.collision.radius,1.9,[]),'巡逻出生点在实体内 '+d.id);
let samples=0;for(const edge of nav.edges){if(edge.ladder)continue;const a=new T.Vector3(...nav.nodes[edge.a]),b=new T.Vector3(...nav.nodes[edge.b]),count=Math.max(1,Math.ceil(a.distanceTo(b)/.5));
 for(let i=0;i<=count;i++){const p=a.clone().lerp(b,i/count);let support=-Infinity;for(const {box}of t.solid)if(t.footprint(p,.32,box)){const top=box.heightfield?t.terrainSurface(p,.32,box)?.top:box.max.y;if(top<=p.y+.4)support=Math.max(support,top);}assert(Number.isFinite(support),'导航悬空 '+JSON.stringify(p.toArray()));p.y=Math.max(p.y,support)+.026;assert(!t.blockedAt(p,.32,1.9,[]),'路线穿越实体 '+JSON.stringify(p.toArray()));samples++;}}
console.log('PASS '+nav.nodes.length+' 节点全部连通, '+samples+' 处路线支撑/净空, 全部敌人出生点');
const actor=t.createInstance({id:'ladder-test-body',model:'body',position:[0,0,0],collision:{enabled:true,dynamic:true,radius:.32,height:1.9}}),p=actor.root.position;
for(const r of t.ladders){
 const spec={bottom:r.bottom.toArray()},body=actor.body;p.copy(r.line);p.y=r.bottom.y;Object.assign(body,{vy:0,grounded:true,traversing:null});let result;
 for(let i=0;i<900&&result!=='done';i++){result=t.climbBody(actor.root,spec,1,1/60);t.fall(body,1/60);assert(!t.blockedAt(p,.32,1.9,[]),'爬梯穿过实体');}
 assert.equal(result,'done','未到达梯顶 '+r.bottom.toArray());assert(p.distanceTo(r.exit)<.08,'未进入真实梯顶落脚点');
 result=undefined;for(let i=0;i<900&&result!=='done';i++){result=t.climbBody(actor.root,spec,-1,1/60);t.fall(body,1/60);assert(!t.blockedAt(p,.32,1.9,[]));}
 assert.equal(result,'done','未返回梯脚 '+r.bottom.toArray());assert(Math.abs(p.y-r.bottom.y)<.08);
}
assert.equal(t.ladders.length,6);console.log('PASS 六部竖梯的动态身体上下/真实出口/重力挂起/逐步实体阻挡');
const r=t.ladders[0],blocker=t.createInstance({id:'exit-blocker',model:'body',position:r.exit.toArray(),collision:{enabled:true,dynamic:true,radius:.4,height:1.9}});p.copy(r.line);p.y=r.bottom.y;actor.body.traversing=null;let done=false;
for(let i=0;i<400;i++){const result=t.climbBody(actor.root,{bottom:r.bottom.toArray()},1,1/60);t.fall(actor.body,1/60);done||=result==='done';assert(!t.bodiesOverlap(p,.32,1.9,blocker.body),'爬梯穿过出口身体');}assert(!done,'出口被占用仍完成登梯');blocker.alive=false;
p.copy(r.line);p.y=r.bottom.y;actor.body.traversing=null;t.climbBody(actor.root,{bottom:r.bottom.toArray()},1,1/60);r.owner.disabled=true;t.fall(actor.body,1/60);assert.equal(actor.body.traversing,null,'失效竖梯仍冻结重力');r.owner.disabled=false;
console.log('PASS 梯顶动态阻挡/竖梯失效释放');

// 使用实际敌人模型和全图碰撞走巡逻路线. 可见性在此仅用实体盒, 不模拟 GPU 或植被.
vm.runInContext(read('models/enemy.js'),c);const viewRay=new T.Raycaster(),point=new T.Vector3();
for(const d of layout.instances.filter(i=>i.options?.patrol)){
 t.actors.forEach(a=>a.alive=false);const npc=t.createInstance(d),marks=new Set([0]);let traveled=0,maxStuck=0,peak;const before=npc.root.position.clone();
 const api={player:{position:new T.Vector3(500,0,500),health:100,debug:true},eye:()=>new T.Vector3(500,1.65,500),effect(){},shoot(){throw Error('调试观察者不应触发开火');},killed(){},climb:t.climbBody,move:t.move,
  visible(a,b){const length=a.distanceTo(b);viewRay.set(a,b.clone().sub(a).normalize());for(const {box}of t.solid)if(!box.heightfield){const hit=viewRay.ray.intersectBox(box,point);if(hit&&hit.distanceTo(a)<length-.03)return false;}return true;}};
 for(let i=0;i<1800;i++){t.fall(npc.body,1/30);npc.update(1/30,api);traveled+=before.distanceTo(npc.root.position);before.copy(npc.root.position);for(let j=0;j<d.options.patrol.length;j++)if(npc.root.position.distanceTo(new T.Vector3(...d.options.patrol[j]))<.65)marks.add(j);if(npc.navigationState().stuck>maxStuck){maxStuck=npc.navigationState().stuck;peak={position:npc.root.position.toArray(),state:npc.navigationState()};}}
 assert(marks.size>=2&&traveled>8,'巡逻没有抵达第二个节点 '+d.id+' '+JSON.stringify({position:npc.root.position.toArray(),marks:[...marks],traveled,state:npc.navigationState()}));
 if(maxStuck>.7)console.log('巡逻受阻详情 '+JSON.stringify(peak));
 assert(maxStuck<1,'静态路线持续受阻 '+d.id);
 console.log('PASS 实际巡逻 '+d.id+' '+marks.size+'/'+d.options.patrol.length+' 点 / '+traveled.toFixed(1)+'m / 最大受阻 '+maxStuck.toFixed(2)+'s');
}
