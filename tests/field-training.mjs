// 武器/姿态/声音与敌人行为的离线回归, 不运行浏览器或 GPU.
import assert from 'node:assert/strict';
import {Ray} from 'three';
import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),c=vm.createContext({FPS:{models:{}},console,AbortController});vm.runInContext(read('vendor/three.min.js'),c);
for(const name of ['rifle','enemy','coastal-soundscape'])vm.runInContext(read('models/'+name+'.js'),c);
const T=c.THREE;
const rifle=c.FPS.models.rifle(T),mag=rifle.root.getObjectByName('rifle-magazine-2').parent,transforms=[];let meshes=0,triangles=0;
rifle.root.traverse(n=>{if(!n.isMesh)return;meshes++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;for(const a of Object.values(n.geometry.attributes))assert(a.array.every(Number.isFinite));});assert(meshes<=16&&triangles<7500,'武器合批/几何预算');
for(let i=0;i<=200;i++){rifle.update(1/120,{time:i/120,walk:.7,recoil:.2,reloadProgress:i/200});rifle.root.updateMatrixWorld(true);assert(rifle.muzzle.getWorldPosition(new T.Vector3()).toArray().every(Number.isFinite));transforms.push(mag.position.clone());}
assert(Math.min(...transforms.map(p=>p.y))<-.46,'没有抽出弹匣');for(let i=1;i<transforms.length;i++)assert(transforms[i].distanceTo(transforms[i-1])<.025,'换弹发生位置跳变');
rifle.update(0,{time:0,walk:0,recoil:0,reloadProgress:.45});assert(!mag.visible);rifle.update(0,{time:0,walk:0,recoil:0,reloadProgress:0});assert(mag.visible);let released=0;const map=rifle.root.getObjectByName('rifle-body-0').material.roughnessMap;map.addEventListener('dispose',()=>released++);rifle.dispose();rifle.dispose();assert.equal(released,1);
console.log('PASS 步枪 '+meshes+' 批/'+triangles+' 面, 201 段换弹/枪口/有限变换, 私有纹理幂等释放');

// U 形墙的路线必须绕行; 不能只向玩家坐标直冲或穿墙.
const nav={nodes:[[0,0,0],[0,0,4],[4,0,4],[4,0,0]],edges:[{a:0,b:1},{a:1,b:2},{a:2,b:3}]},patrol=[[4,0,0],[0,0,0]],actor=c.FPS.models.enemy(T,{navigation:nav,patrol,speed:2});
let actorMeshes=0;actor.root.traverse(n=>{if(n.isMesh&&!n.material.wireframe)actorMeshes++;});assert(actorMeshes<=17,'角色静态构件未合批');console.log('PASS 敌人关节/命中区保留, '+actorMeshes+' 个可见批次');
actor.root.userData.actor=actor;actor.body={root:actor.root,radius:.32,height:1.9,grounded:true};
const wall=new T.Box3(new T.Vector3(1,-1,-2),new T.Vector3(3,3,3)),ray=new Ray();let shots=0,traveled=0;
const player={position:new T.Vector3(100,0,100),health:100,debug:true},api={player,eye:()=>player.position.clone().add(new T.Vector3(0,1.65,0)),effect(){},shoot(){shots++;},killed(){},visible(a,b){ray.set(a,b.clone().sub(a).normalize());const p=ray.intersectBox(wall,new T.Vector3());return !p||p.distanceTo(a)>a.distanceTo(b);},move(root,dx,dz){const p=root.position.clone().add(new T.Vector3(dx,0,dz));assert(!wall.containsPoint(p),'敌人穿过墙体');const d=Math.hypot(dx,dz);root.position.copy(p);traveled+=d;return d;}};
let reached=false;for(let i=0;i<800;i++){actor.update(1/60,api);if(actor.root.position.distanceTo(new T.Vector3(4,0,0))<.4)reached=true;}assert(reached&&traveled>9,'A* 未使用绕行节点');assert.equal(shots,0);
// 观察后失去视线, 搜索位置应保持最后观察点, 不随墙后玩家更新.
const guard=c.FPS.models.enemy(T);guard.root.position.set(20,0,0);player.position.set(20,0,10);player.debug=false;let sight=true;const requests=[];
const observing={...api,visible:()=>sight,move(root,dx,dz){root.position.x+=dx;root.position.z+=dz;return Math.hypot(dx,dz);},shoot(from,direction){assert(Math.abs(direction.length()-1)<1.e-8);requests.push(from.clone());}};
for(let i=0;i<100;i++)guard.update(1/60,observing);assert(requests.length>0);sight=false;player.position.set(-100,0,-100);for(let i=0;i<60;i++)guard.update(1/60,observing);assert.equal(guard.state,'search');assert(guard.root.position.z>0&&guard.root.position.x>15,'失去视线后仍追踪隐藏玩家位置');
for(let i=0;i<480;i++)guard.update(1/60,observing);assert.equal(guard.state,'guard');guard.damage(1000,{killed(){}});const dead=guard.health;guard.damage(1000,{killed(){throw Error('重复死亡');}});assert.equal(guard.health,dead);
console.log('PASS 巡逻/A* 绕墙/发现与开火/最后位置搜索/记忆超时/死亡保护');

// 模拟音频连接与控制参数, 验证暂停释放和有界节点, 不声称验证实际听感.
let nodes=[],buffers=0,sources=0;const parameter=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
function node(){const n={connections:[],gain:parameter(),frequency:parameter(),pan:parameter(),Q:parameter(),connect(other){this.connections.push(other);return other;},disconnect(){this.connections=[];},start(){sources++;},stop(t){if(!t)this.onended?.();}};nodes.push(n);return n;}
const ctx={currentTime:0,sampleRate:100,createBuffer(ch,n){buffers++;return {getChannelData:()=>new Float32Array(n)};},createBufferSource:node,createBiquadFilter:node,createGain:node,createStereoPanner:node,createOscillator:node},output=node();
let active=true;const sound={context:ctx,output,position:new T.Vector3(3,0,0),right:[1,0]},soundApi={audio:()=>active?sound:null},ambient=c.FPS.models.coastalSoundscape(T,{zones:[{kind:'trees',position:[0,0],radius:50,volume:.1},{kind:'sea',position:[10,0],radius:80,volume:.1}]});
ambient.update(.1,soundApi);const count=nodes.length;for(let i=0;i<50;i++)ambient.update(.1,soundApi);assert.equal(nodes.length,count,'稳定帧增加环境音频节点');assert.equal(sources,2);assert.equal(buffers,1);
const pans=nodes.filter(n=>n.pan.value!==0);assert(pans.length);const first=pans[0].pan.value;sound.right=[-1,0];ambient.update(.1,soundApi);assert(first*pans[0].pan.value<0,'转身后环境声方向未变化');active=false;ambient.beforeRender();assert(nodes.every(n=>n.connections.length===0));active=true;ambient.update(.1,soundApi);assert.equal(buffers,1,'恢复播放重复生成噪声');ambient.dispose();ambient.dispose();assert(nodes.every(n=>n.connections.length===0));
console.log('PASS 程序环境声有界连接/朝向/暂停/恢复复用/重复释放');

// 原姿态与物理代码: 蹲伏高度/顶棚站起保护/慢走/松键恢复.
const html=read('index.html'),physics=vm.createContext({T,console});
vm.runInContext(`const keys=new Set(),solid=[],actors=[],entries=[],ladders=[],scene=new T.Scene(),camera=new T.PerspectiveCamera(),hints={},$=id=>hints[id]??={};const player={position:new T.Vector3(),debug:false};player.body={root:player,radius:.32,height:1.75,vy:0,grounded:true};const api={spawn:new T.Vector3()};let yaw=0,pitch=0,walk=0,weapon,renderEffect;${html.slice(html.indexOf('const STEP_HEIGHT'),html.indexOf('function separateBodies()'))}${html.slice(html.indexOf('function updatePlayer(dt)'),html.indexOf('function showMenu('))}globalThis.p={player,keys,solid,updatePlayer,blockedAt};`,physics);
const p=physics.p;p.solid.push({box:new T.Box3(new T.Vector3(-10,-1,-10),new T.Vector3(10,0,10))});p.keys.add('ControlLeft');for(let i=0;i<60;i++)p.updatePlayer(1/60);assert(Math.abs(p.player.body.height-1.15)<1.e-6);p.solid.push({box:new T.Box3(new T.Vector3(-1,1.3,-1),new T.Vector3(1,2,1))});p.keys.clear();for(let i=0;i<60;i++)p.updatePlayer(1/60);assert(p.player.body.height<1.3,'低顶棚下强行站起');p.solid.pop();for(let i=0;i<60;i++)p.updatePlayer(1/60);assert(Math.abs(p.player.body.height-1.75)<1.e-6);
p.keys.add('AltLeft');p.keys.add('KeyW');const z=p.player.position.z;for(let i=0;i<30;i++)p.updatePlayer(1/60);assert(Math.abs(Math.abs(p.player.position.z-z)-1.25)<1.e-6);assert(!p.blockedAt(p.player.position,.32,p.player.body.height,[]));
console.log('PASS 原物理蹲伏/低顶棚禁止站起/恢复/慢走速度');

// 原音频包络的瞬态上限/空间位置/结束及启动异常回收.
const audioContext={...ctx,createPanner(){const n=node();n.positionX=parameter();n.positionY=parameter();n.positionZ=parameter();return n;}},soundVM=vm.createContext({audio:audioContext,T,console});
vm.runInContext(`let muted=false;function guarded(id,fn){return fn();}${html.slice(html.indexOf('let soundOutput, shotNoise;'),html.indexOf('function defeatSound()'))}soundOutput={};globalThis.s={soundVoice,noiseBuffer,count:()=>soundVoices.size};`,soundVM);
const voiceRequests=[];for(let i=0;i<25;i++){const source=node();voiceRequests.push(source);soundVM.s.soundVoice(source,.1,.05,0,undefined,new T.Vector3(1,2,3));}assert.equal(soundVM.s.count(),24);voiceRequests.forEach(source=>source.onended?.());assert.equal(soundVM.s.count(),0);
const failed=node();failed.start=()=>{throw Error('音频启动失败');};assert.throws(()=>soundVM.s.soundVoice(failed,.1,.05),/音频启动失败/);assert.equal(soundVM.s.count(),0);assert.equal(failed.connections.length,0);assert.equal(soundVM.s.noiseBuffer(),soundVM.s.noiseBuffer());
console.log('PASS 原音频瞬态24声部上限/位置/结束/启动异常回收/噪声复用');

// 原启动筛选表达式: 所有非敌人实例保留, 无效/原型链参数不会阻止启动.
const configuration=vm.createContext({window:{}});vm.runInContext(read('scene-kamakura.js'),configuration);const layout=configuration.window.FPS_LAYOUT;
const selectionSource=html.slice(html.indexOf('  const trainingArea='),html.indexOf('  if (!Array.isArray(layout.instances))'));
for(const [query,count]of [['',10],['station',4],['park',1],['center',1],['port',2],['hill',2],['unknown',10],['__proto__',10],['toString',10]]){
 const selected=vm.createContext({layout,location:{search:'?training='+query},URLSearchParams});vm.runInContext(selectionSource+'globalThis.chosen=instances;',selected);assert.equal(selected.chosen.filter(d=>d.model==='enemy').length,count);assert.equal(selected.chosen.filter(d=>d.model!=='enemy').length,layout.instances.filter(d=>d.model!=='enemy').length);
}
const baseline=vm.createContext({window:{}});vm.runInContext(execFileSync('git',['show','HEAD:scene-kamakura.js'],{encoding:'utf8'}),baseline);for(const key of ['atmosphere','lights'])assert.equal(JSON.stringify(layout[key]),JSON.stringify(baseline.window.FPS_LAYOUT[key]),'最高画质配置发生降级');
console.log('PASS 五区/全图训练与异常参数回退, 原最高分辨率/云雾/光照/4096阴影配置保留');

// 对四处新增掩体取真实三角面射线: 能挡住高处对蹲姿的枪线, 站起可越墙观察.
c.document={createElement(){const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??(()=>{})});return {width:1,height:1,getContext:()=>ctx};}};
vm.runInContext(read('models/hub-fixtures.js'),c);const fixtures=layout.instances.find(i=>i.id==='central-fixtures'),covers=fixtures.options.blocks.filter(b=>[[111,64.7],[145,64.7],[63.4,105],[63.4,132]].some(([x,z])=>Math.abs(b.offset[0]+60-x)<.01&&Math.abs(b.offset[2]+68-z)<.01));assert.equal(covers.length,4);
const cover=c.FPS.models.hubFixtures(T,{blocks:covers,benches:[],signs:[],bikeRacks:[],drains:[],services:[]});cover.root.position.set(...fixtures.position);cover.root.updateMatrixWorld(true);
for(const block of covers){const x=block.offset[0]+60,z=block.offset[2]+68,north=block.size[0]>.6,from=north?new T.Vector3(x,28,120):new T.Vector3(120,28,z),to=north?new T.Vector3(x,3.45,z-.6):new T.Vector3(x-.6,3.45,z),ray=new T.Raycaster(from,to.clone().sub(from).normalize(),.01,from.distanceTo(to));assert(ray.intersectObject(cover.root,true).length,'蹲姿仍暴露于高位枪线');to.y=4.05;ray.set(from,to.clone().sub(from).normalize());ray.far=from.distanceTo(to);assert.equal(ray.intersectObject(cover.root,true).length,0,'站立越墙观察被阻挡');}cover.dispose();
console.log('PASS 四处真实掩体的高位枪线/蹲姿保护/站起观察, 主路宽度保持');
