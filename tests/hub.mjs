// 纯 Node 中央枢纽回归. 执行原物理和真实三角面, 画布为桩, 不启动浏览器/GPU.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {ShaderLib} from 'three';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),html=read('index.html');
const document={createElement(name){assert.equal(name,'canvas');const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})};
  for(const method of ['putImageData','setTransform','fillRect','strokeRect','beginPath','moveTo','lineTo','stroke','fillText','bezierCurveTo','clip','rect','arc','closePath','fill','save','restore','quadraticCurveTo'])ctx[method]=()=>{};
  ctx.strokes=[];ctx.texts=[];ctx.beginPath=function(){this.path=[];};ctx.moveTo=function(...p){this.path.push(p);};ctx.lineTo=function(...p){this.path.push(p);};
  const saved=[];ctx.save=function(){saved.push(this.clipped);};ctx.clip=function(){this.clipped=true;};ctx.restore=function(){this.clipped=saved.pop();};
  ctx.stroke=function(){this.strokes.push({width:this.lineWidth,alpha:this.globalAlpha??1,color:this.strokeStyle,points:this.path,clipped:!!this.clipped,cap:this.lineCap});};ctx.fillText=function(text,x,y){this.texts.push({text,x,y,font:this.font});};
  return {width:1,height:1,getContext:()=>ctx};}};
const c=vm.createContext({window:{},FPS:{models:{}},document,console,AbortController});
vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const T=c.THREE,layout=c.window.FPS_LAYOUT,hub=layout.instances.filter(i=>i.id.startsWith('central-'));
const before=vm.createContext({window:{}});vm.runInContext(execFileSync('git',['show','HEAD:scene-kamakura.js'],{encoding:'utf8'}),before);
for(const old of before.window.FPS_LAYOUT.instances)if(!old.id.startsWith('central-')&&old.id!=='reserved-district-ground')assert.equal(JSON.stringify(layout.instances.find(i=>i.id===old.id)),JSON.stringify(old),'原区域变动 '+old.id);
function firstParkTree(config){
 const isolated=vm.createContext({FPS:{models:{}},document});vm.runInContext(read('models/park-tree.js'),isolated);
 const data=config.instances.find(i=>i.model==='parkTree'),model=isolated.FPS.models.parkTree(T,data.options);
 const result={position:Array.from(model.root.children[0].geometry.attributes.position.array),leaves:Array.from(model.root.children[1].instanceMatrix.array)};
 model.dispose();model.root.traverse(n=>{if(n.isMesh)n.geometry.dispose();});return {id:data.id,result};
}
const oldFirst=firstParkTree(before.window.FPS_LAYOUT),newFirst=firstParkTree(layout);assert.equal(newFirst.id,oldFirst.id,'复用改变原公园首棵树装配次序');assert.deepEqual(newFirst.result,oldFirst.result,'复用改变原公园树冠随机序列');
const parkBase=layout.instances.find(i=>i.id==='reserved-district-ground'),oldBase=before.window.FPS_LAYOUT.instances.find(i=>i.id===parkBase.id);
for(const item of [...parkBase.options.slabs,...parkBase.options.edges])assert(oldBase.collision.boxes.some(b=>JSON.stringify(b)===JSON.stringify(item)),'原公园/外围地基尺寸变动');
assert.equal(parkBase.options.slabs.length,5);assert.equal(new Set(layout.instances.map(i=>i.id)).size,layout.instances.length);
vm.runInContext(`const T=THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(),solid=[],actors=[],entries=[],ladders=[];
 const player={position:new T.Vector3(),debug:false};player.body={root:player,radius:.32,height:1.75,vy:0,grounded:false};
 let weapon,renderEffect;const api={spawn:new T.Vector3(60,2.4,68)};
 ${html.slice(html.indexOf('const STEP_HEIGHT'),html.indexOf('function separateBodies()'))}
 ${html.slice(html.indexOf('function createInstance('),html.indexOf('function toggleEnemies()'))}
 FPS.models.collisionOnly=()=>({root:new T.Group()});
 globalThis.t={solid,player,move,fall,blockedAt,terrainSurface,createInstance,footprint};`,c);
const t=c.t;
for(const entry of layout.instances.filter(i=>i.collision.enabled&&!i.collision.dynamic&&!i.attach))t.createInstance({...entry,model:'collisionOnly',traversal:undefined});
const allSolids=[...t.solid],hubSolids=allSolids.filter(s=>s.id.startsWith('central-'));
assert(hubSolids.length<=230,'中央碰撞预算');
function select(points){const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]),range=new T.Box3(new T.Vector3(Math.min(...xs)-.8,-2,Math.min(...zs)-.8),new T.Vector3(Math.max(...xs)+.8,10,Math.max(...zs)+.8));t.solid.splice(0,t.solid.length,...allSolids.filter(s=>s.box.intersectsBox(range)));}
function support(p){return Math.max(-Infinity,...t.solid.filter(({box})=>t.footprint(new T.Vector3(...p),.32,box)).map(({box})=>box.heightfield?t.terrainSurface(new T.Vector3(...p),.32,box)?.top:box.max.y).filter(y=>Number.isFinite(y)&&y<=p[1]+.28));}
function spawn(p){t.player.position.set(...p);Object.assign(t.player.body,{vy:0,grounded:false,ladder:null});for(let i=0;i<30;i++)t.fall(t.player.body,1/60);assert(!t.blockedAt(t.player.position,.32,1.75,[]),'出生点受阻 '+JSON.stringify(p));}
function walk(target,dt,speed){const distance=Math.hypot(target[0]-t.player.position.x,target[2]-t.player.position.z);
 for(let i=0;i<Math.ceil((distance/speed+.35)/dt);i++){const dx=target[0]-t.player.position.x,dz=target[2]-t.player.position.z,d=Math.hypot(dx,dz),step=Math.min(d,speed*dt);if(d>.001)t.move(t.player,dx/d*step,dz/d*step);t.fall(t.player.body,dt);assert(!t.blockedAt(t.player.position,.32,1.75,[]),'行走进入实体');}
 const expected=support(target);assert(Math.hypot(target[0]-t.player.position.x,target[2]-t.player.position.z)<.05&&Math.abs(expected-t.player.position.y)<.05,'路线受阻/脚底不符 '+JSON.stringify({target,expected,actual:t.player.position.toArray()}));}
function roundTrip(points,width=0){if(width){const sampled=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],count=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/4);for(let j=1;j<=count;j++)sampled.push(a.map((v,k)=>v+(b[k]-v)*j/count));}points=sampled;}
 const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][2]-points[i-1][2]));
 for(const [dt,speed]of [[1/20,7.4],[1/60,4.7],[1/144,7.4]])for(const offset of width?[-(width/2-.4),0,width/2-.4]:[0]){
 const lane=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],n=Math.hypot(b[0]-a[0],b[2]-a[2]),across=offset*Math.min(1,distances[i]/2,(distances.at(-1)-distances[i])/2);return [p[0]-(b[2]-a[2])/n*across,p[1],p[2]+(b[0]-a[0])/n*across];});select(lane);spawn([lane[0][0],lane[0][1]+.12,lane[0][2]]);for(const p of lane.slice(1))walk(p,dt,speed);for(const p of lane.slice(0,-1).reverse())walk(p,dt,speed);
}}
const routes=layout.regionPlan.center.routes;
for(const path of routes.paths){roundTrip(path.points.map(([x,z])=>[x,2.4,z]),path.width);console.log('PASS 全宽三条走线/20~144 FPS 通路往返 '+path.id);}
for(const points of [
 [[52.05,2.4,61.7],[52.7,2.2,61.7],[53.1,2,61.7],[54,1.8,61.7],[56.1,1.8,61.7],[56.1,2.4,65.9],[60,2.4,66]],
 [[62.3,2.4,59.1],...Array.from({length:6},(_,i)=>[62.85+i*.3,2.6+i*.2,59.1]),[65.95,3.6,59.1],[65.95,3.6,56.5],[65.95,2.4,49.8]],
 [[55.2,2.4,70.6],[55.2,2.44,72],[55.2,2.44,76],[55.2,2.4,78.1],[54.8,2.44,80.5],[54.8,2.44,82.2]],
 [[51.2,2.4,74.6],[51.2,2.4,78.1],[60,2.4,78.1],[69,2.4,78.1],[69,2.4,68],[69,2.4,49]]
])roundTrip(points);
// 每张长椅前的横向步行带都使用真实身体扫过, 检查花池/墙/服务设施围合后的净空.
for(const bench of layout.instances.find(i=>i.model==='hubFixtures').options.benches) {
 const [x,y,z]=bench.position,yaw=bench.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),half=(bench.width??1.9)/2+.6;
 roundTrip([-half,0,half].map(offset=>[60+x-s*.75+c*offset,y,68+z-c*.75-s*offset]));
}
console.log('PASS 全部长椅前的横向通行/节点净空');
console.log('PASS 庭院两出口/台地两路/服务点穿行/外围绕行');
roundTrip([[99,2.4,61.7],[101.5,2.44,61.7],[105,2.44,61.7],[108.5,2.44,61.7],[112,2.4,61.7]],2.6);
for(const points of [
 [[-36.2,2.4,62.2],[-33,2.4,62.2],[-29.8,2.4,62.2]],
 [[13,2.4,73.6],[17,2.4,73.6],[21,2.4,73.6]],
 [[64,2.4,91.1],[60,2.4,91.1],[55,2.4,91.1],[51,2.4,91.1]],
 [[116,2.4,73.4],[120,2.4,73.4],[124,2.4,73.4]],
 [[120,2.4,73.4],[120,2.4,75.1]],
 [[66,2.4,5.2],[66,2.4,8],[66,2.4,10.8]],
 [[66,2.4,27.2],[66,2.4,30],[66,2.4,32.8]]
])roundTrip(points);
console.log('PASS 展陈/补给/候车/维修节点前沿与工作台接近路线');
for(const points of [[[51,4,106],[51,4,111]],[[51,4,128],[51,4,132]],[[51,4,141],[51,4,147]]])roundTrip(points);
console.log('PASS 三片缓丘路外侧向穿行');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const models=[];let meshCount=0,triangles=0,newTriangles=0;
for(const data of hub){const source=read(layout.catalog[data.model]),isolated=vm.createContext({FPS:{models:{}},document,console});assert(!/\b(?:import|fetch|requestAnimationFrame|setInterval|setTimeout)\s*\(/.test(source));vm.runInContext(source,isolated);assert.equal(Object.keys(isolated.FPS.models).length,1);
 const options=freeze(structuredClone(data.options)),snapshot=JSON.stringify(options),model=isolated.FPS.models[data.model](T,options);assert.equal(JSON.stringify(options),snapshot);assert(model.root.isObject3D);if(!['parkTree','hubGrass'].includes(data.model))assert(!model.update&&!model.beforeRender&&!model.render);if(data.model==='hubGrass')assert(model.update&&!model.beforeRender&&!model.render);
 model.root.position.set(...data.position);model.root.rotation.set(...data.rotation);model.root.scale.set(...data.scale);model.root.updateWorldMatrix(true,true);const meshes=[];
 model.root.traverse(n=>{if(!n.isMesh)return;meshes.push(n);meshCount++;const g=n.geometry,p=g.attributes.position;for(const a of Object.values(g.attributes)){assert(a.array.every(Number.isFinite),data.id+' 顶点无效');assert.equal(a.count,p.count);}if(n.isInstancedMesh)assert(n.instanceMatrix.array.every(Number.isFinite));const indices=g.index?.array??Array.from({length:p.count},(_,i)=>i);
  if(data.model!=='parkTree')for(let i=0;i<indices.length;i+=3){const a=new T.Vector3().fromBufferAttribute(p,indices[i]),b=new T.Vector3().fromBufferAttribute(p,indices[i+1]),c=new T.Vector3().fromBufferAttribute(p,indices[i+2]);assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-18,'退化面 '+data.id);}
  const count=indices.length/3*(n.count??1);triangles+=count;if(data.model!=='parkTree')newTriangles+=count;g.computeBoundingBox();g.computeBoundingSphere();assert(Number.isFinite(g.boundingSphere.radius));});
 assert(meshes.length<=(['hubGround','hubGrass','hubPlanting'].includes(data.model)?2:data.model==='hubGallery'?3:6),'合批预算 '+data.id);models.push({data,model,meshes,factory:isolated.FPS.models[data.model]});
 if(data.model!=='parkTree'){const fallback=isolated.FPS.models[data.model](T);assert(fallback.root.isObject3D);fallback.root.traverse(n=>{if(!n.isMesh)return;assert(n.geometry.attributes.position.array.every(Number.isFinite),'默认模型顶点无效 '+data.model);n.geometry.dispose();n.material.dispose();});fallback.dispose?.();}
}
assert(meshCount<=89&&models.flatMap(m=>m.meshes).filter(n=>!n.isInstancedMesh||n.count>0).length<=69&&newTriangles<=282000,'新增中央几何预算 '+JSON.stringify({meshCount,triangles,newTriangles}));
const ray=new T.Raycaster(),find=name=>models.find(m=>m.data.model===name),ground=find('hubGround'),fixtures=find('hubFixtures'),visitor=find('visitorCenter'),gallery=find('hubGallery'),plants=find('hubPlanting');
function hits(model,p,d,far=10){ray.set(new T.Vector3(...p),new T.Vector3(...d));ray.far=far;return ray.intersectObject(model.root,true);}
const downward=(x,z)=>hits(ground.model,[x,8,z],[0,-1,0])[0];
const activity=find('hubActivity');assert.equal(activity.meshes.length,4,'活动设施没有共享四个批次');
assert.equal(activity.data.options.sites.length,7,'四类院落与室内展陈未全部接入');
assert.equal(new Set(activity.data.options.sites.map(s=>s.kind)).size,4);
for(const site of activity.data.options.sites) {
 const yaw=site.yaw??0,origin=new T.Vector3(...site.position).add(new T.Vector3(...activity.data.position));
 const point=p=>new T.Vector3(...p).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(origin),direction=new T.Vector3(0,0,1).applyAxisAngle(new T.Vector3(0,1,0),yaw);
 for(const cabinet of site.cabinets){const [x,y,z]=cabinet.offset,hit=hits(activity.model,point([x-cabinet.size[0]/4,y,z-cabinet.size[2]/2-.3]).toArray(),direction.toArray(),.4)[0];assert(hit&&hit.distance>.15&&hit.distance<.3,'共享柜体/门板朝向不符');assert.equal(activity.model.onHit(hit),undefined,'金属柜体被判为软面');}
 if(site.kind==='waiting'){const hit=hits(activity.model,point([-.95,.3,-1]).toArray(),direction.toArray(),.8)[0];assert(hit,'行李真实几何缺失');assert.equal(JSON.stringify(activity.model.onHit(hit)),JSON.stringify({bulletmark:false,impact:false}),'软质行李产生硬面弹痕/火花');}
 if(site.kind==='exhibit'){
  const displayZ=site.displayZ??-.65,rackZ=site.rackZ??-.55;
  assert.equal(hits(activity.model,point([2.42,1.02,displayZ-.15]).toArray(),direction.toArray(),.16)[0]?.object.name,'hub-activity-matte','船帆真实薄体缺失');
  assert.equal(hits(activity.model,point([2.62,1.1,displayZ-.15]).toArray(),direction.toArray(),.16).length,0,'船帆仍是方片');
  assert.equal(hits(activity.model,point([-2.5,.85,rackZ-.3]).toArray(),direction.toArray(),.29).length,0,'资料架层间被实心方块填满');
  assert.equal(hits(activity.model,point([-2.5,.4325,rackZ-.3]).toArray(),direction.toArray(),.29)[0]?.object.name,'hub-activity-matte','资料架书册缺失');
 }
}
console.log('PASS 四类院落/室内展陈独立合批, 共享柜体与软质道具命中');
for(const [x,z,y]of [[51,60,2.4],[54,63,1.8],[65.95,59.1,3.6],[65.95,53.4,3],[56.1,63.9,2.1],[60,67,2.4],[-15,68,2.4],[100,70,2.4]])assert(Math.abs(downward(x,z).point.y-y)<1e-5,'地面与低庭院/坡道尺寸不一致');
for(const ramp of ground.data.options.ramps){const collider=hubSolids.find(s=>s.id===ground.data.id&&s.box.heightfield&&s.box.heightfield.x0===ramp.rect[0]);for(let j=1;j<8;j++)for(let i=1;i<8;i++){const x=60+ramp.rect[0]+(ramp.rect[2]-ramp.rect[0])*i/8,z=68+ramp.rect[1]+(ramp.rect[3]-ramp.rect[1])*j/8,y=t.terrainSurface(new T.Vector3(x,8,z),0,collider.box).top;assert(Math.abs(downward(x,z).point.y-y)<1e-5,'坡道网格与高度场不符');}}
for(const drain of fixtures.data.options.drains){const [x,y,z]=drain.position,w=drain.width,n=Math.ceil(w/.14),px=x-w/2+w/n;assert(hits(ground.model,[px+60,y+.15,z+68],[0,-1,0],.2).length===0,'排水沟顶面未挖空');const gap=hits(fixtures.model,[px+60,y+.15,z+68],[0,-1,0],.3)[0];assert(gap&&gap.point.y<y-.04,'格栅空隙被共面板封住');}
for(const [p,d,expected]of [[[54,2.1,63],[0,0,1],65.5],[[54,2.1,63],[0,0,-1],59.5],[[54,2.1,63],[-1,0,0],52.5]]){const hit=hits(ground.model,p,d,8)[0];assert(hit&&Math.abs((d[2]?hit.point.z:hit.point.x)-expected)<1e-5,'裁剪底裙后庭院挡土墙缺口');}
assert.equal(hits(ground.model,[65,2.41,59],[0,-1,0],.1).length,0,'平台下方隐藏顶面未裁掉');
console.log('PASS 地面挖空/格栅嵌入/坡面支撑/裁剪底裙与庭院挡土墙');
// 新布局的空间目标按真实共享配置统计, 通路与活动铺地从种植面积中扣除.
const inside=(x,z,r)=>x>=r[0]&&x<=r[2]&&z>=r[1]&&z<=r[3];
const inPath=(x,z,p)=>p.points.slice(1).some((b,i)=>{const a=p.points[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)<=p.width/2;});
let landscapeArea=0,hubArea=0;
for(let z=-85.75;z<86;z+=.5)for(let x=-109.75;x<110;x+=.5)if(ground.data.options.plots.some(p=>inside(x,z,p.rect))) {
 hubArea+=.25;if(ground.data.options.soil.some(r=>inside(x,z,r))&&!ground.data.options.pads.some(r=>inside(x,z,r))&&!ground.data.options.paths.some(p=>inPath(x,z,p)))landscapeArea+=.25;
}
assert.equal(hubArea,7440);assert(landscapeArea/hubArea>=.4&&landscapeArea/hubArea<=.5,'净绿化占比未实现');
assert.equal(gallery.data.options.runs.length,8);assert.equal(gallery.meshes.length,3,'廊架分段新增绘制');
assert.equal(gallery.data.options.runs.filter(r=>r.id.startsWith('west-shade')).length,2);assert.equal(gallery.data.options.runs.filter(r=>r.id.startsWith('south-shade')).length,2);
assert.equal(ground.data.options.landforms.length,3);
for(const land of ground.data.options.landforms) {
 const [a,b,c,d]=land.rect,collider=hubSolids.find(s=>s.id===ground.data.id&&s.box.heightfield&&Math.abs(s.box.heightfield.x0-a)<1e-8&&Math.abs(s.box.heightfield.z0-b)<1e-8);
 assert(collider,'缓丘缺少共用高度场');assert(Math.max(...land.heights)-2.4>=.3&&Math.max(...land.heights)-2.4<=.7,'缓丘起伏范围不符');
 for(let j=1;j<12;j++)for(let i=1;i<8;i++) {
  const x=a+(c-a)*i/8,z=b+(d-b)*j/12,point=new T.Vector3(x+60,8,z+68),surface=t.terrainSurface(point,0,collider.box).top;
  assert(Math.abs(downward(x+60,z+68).point.y-surface)<1e-5,'缓丘网格与身体支撑不一致');
 }
 for(let j=0;j<land.rows;j++)for(let i=0;i<land.columns;i++)if(!i||!j||i===land.columns-1||j===land.rows-1)assert.equal(land.heights[j*land.columns+i],2.4,'缓丘外沿与平地断开');
}
for(const tree of models.filter(m=>m.data.model==='parkTree')) {
 const [x,y,z]=tree.data.position;assert(Math.abs(downward(x,z).point.y-y-.035)<1e-5,'树根未贴合真实地形');
 assert(ground.data.options.soil.some(r=>inside(x-60,z-68,r))&&!ground.data.options.pads.some(r=>inside(x-60,z-68,r)),'树植于活动铺地');
}
const maintenance=find('hubMaintenance');assert.equal(maintenance.meshes.length,3);assert.equal(find('hubLandscape').meshes.length,1);
for(const side of [-1,1])assert.equal(hits(maintenance.model,[105+side*4,3.4,61.7],[-side,0,0],.8).length,0,'维护小屋门洞封闭');
for(const [x,z]of [[105.7,62],[103,64.2],[106,59.5]]) {
 const {roof}=maintenance.data.options,hit=hits(maintenance.model,[x,8,z],[0,-1,0])[0];
 assert(Math.abs(hit.point.y-(2.4+roof.top+roof.thickness/2+(z-62)*roof.slope))<1e-5,'维护屋面不符合共享规格');
}
console.log('PASS 净绿化 '+(landscapeArea/hubArea*100).toFixed(1)+'%, 八段功能廊合批, 三片缓丘/树根贴地与维护双门');

for(const [p,d]of [[[20,4.1,60.9],[1,0,0]],[[54,4.1,93],[0,0,1]],[[66.5,4.1,19],[0,0,1]],[[127,4.1,74.4],[1,0,0]]])assert(hits(fixtures.model,p,d,8).length,'侧院缺少实体掩体');
for(const path of routes.paths)for(let i=1;i<path.points.length;i++)assert(path.points[i][0]===path.points[i-1][0]||path.points[i][1]===path.points[i-1][1],'路线仍有斜向折线');
for(const sign of fixtures.data.options.signs){const [x,y,z]=sign.position,yaw=sign.yaw??0,front=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),p=new T.Vector3(x+60,y+(sign.mount==='wall'?sign.height*.59:sign.height-.48),z+68).addScaledVector(front,1);const hit=hits(fixtures.model,p.toArray(),front.clone().negate().toArray(),1.2)[0];assert.equal(hit?.object.name,'hub-signs','导览牌被背板遮住');}
for(const sign of fixtures.data.options.signs) {
 assert.equal(sign.mount,'wall');assert.equal(sign.routes.length,2);assert.deepEqual(Array.from(sign.routes,r=>r.direction),['left','right']);
 const isolated=fixtures.factory(T,{blocks:[],benches:[],signs:[sign],drains:[],services:[],bikeRacks:[]}),bounds=new T.Box3().setFromObject(isolated.root);
 assert(Math.abs(bounds.min.y-(sign.position[1]+sign.height*.59-sign.panelHeight/2-.07))<1e-5,'壁牌仍带落地立柱/脚座');
 const text=isolated.root.children.find(n=>n.name==='hub-signs').material.map.image.getContext('2d').texts;
 for(const route of sign.routes){assert(text.some(t=>t.text===route.title));assert(text.some(t=>t.text===route.subtitle));}
 const yaw=sign.yaw??0,front=new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),world=([x,y,z])=>new T.Vector3(x,sign.height*.59+y,z).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(new T.Vector3(...sign.position));
 // 四角用偏离三角面共边的射线检查边框完整与单层前表面.
 for(const side of [-1,1])for(const sy of [-1,1]){
  const p=world([side*(sign.width/2+.04),sy*(sign.panelHeight/2+.03),-.085]),ray=new T.Raycaster(p.clone().addScaledVector(front,.1),front.clone().negate(),0,.11);
  const hits=ray.intersectObject(isolated.root,true);assert.equal(hits.length,1,'牌框角部有叠面/缺口');
 }
 isolated.dispose();isolated.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
}
const atlas=ground.meshes.find(n=>n.name==='hub-ground-surface').material.map.image;
assert.equal(atlas.width,2048);assert.equal(atlas.height,1536);
assert(220/atlas.width<.12&&172/atlas.height<.12,'大地表图像素太粗');
const groundShader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};
ground.meshes.find(n=>n.name==='hub-ground-surface').material.onBeforeCompile(groundShader);
const pavingMap=groundShader.uniforms.hubPavingMap.value;
const strokes=pavingMap.image.getContext('2d').strokes;
assert(ground.data.options.paths.every(p=>p.kind!=='asphalt'),'中央连接路仍有深色沥青');
assert.equal(atlas.getContext('2d').strokes.length,0,'草色图仍混入铺地, 近景边界会被纹理过滤模糊');
assert(strokes.length&&strokes.every(s=>s.clipped&&s.alpha===1&&s.cap==='round'),'通路仍在铺地上描色带/未使用共同端点范围');
assert(strokes.every(s=>s.width>=2),'中央仍有细轮迹/任意装饰线');
assert(strokes.every(s=>s.color==='#aaa99e'),'铺石色图没有限定在种植床开口内');
assert.equal(ground.data.options.markings,undefined);
console.log('PASS 四块壁牌方向/真实边框, 中央统一石质铺地/无沥青色带/绿化步行开口保留');
for(const door of visitor.data.options.doors){const axis=door.axis,side=door.side,origin=door.origin??(axis==='z'?[door.center,0,side*visitor.data.options.depth/2]:[side*visitor.data.options.width/2,0,door.center]);const d=axis==='z'?[0,0,-side]:[-side,0,0],world=origin.map((v,i)=>v+visitor.data.position[i]-d[i]*.4);world[1]+=1;assert.equal(hits(visitor.model,world,d,.8).length,0,'门洞被网格封住');}
t.solid.splice(0,t.solid.length,...hubSolids.filter(s=>s.id===visitor.data.id));
for(const win of visitor.data.options.windows){
 const {axis,side}=win,origin=win.origin??(axis==='z'?[win.center,0,side*visitor.data.options.depth/2]:[side*visitor.data.options.width/2,0,win.center]),point=origin.map((v,i)=>v+visitor.data.position[i]),direction=axis==='z'?[0,0,-side]:[-side,0,0];
 point[1]+=win.bottom+win.height/2;point[axis==='z'?0:2]+=(axis==='z'?-side:side)*win.width/4;
 const outside=point.map((v,i)=>v-direction[i]*.4),hit=hits(visitor.model,outside,direction,.8)[0];
 assert.equal(hit?.object.name,'visitor-glass','窗洞玻璃/朝向缺失 '+JSON.stringify(win.origin));
 assert(t.blockedAt(new T.Vector3(point[0],point[1]-.1,point[2]),.12,.2,[]),'封闭窗墙简化后身体可穿过');
}
t.solid.splice(0,t.solid.length,...allSolids);
for(const roof of visitor.data.options.roofs){const dx=1.31,dz=.29,x=visitor.data.position[0]+roof.center[0]+dx,z=visitor.data.position[2]+roof.center[1]+dz,expected=visitor.data.position[1]+roof.top+(roof.thickness??.18)/2+(roof.pitch?(roof.width/2-Math.abs(dx))*roof.pitch:dz*roof.slope),hit=hits(visitor.model,[x,10,z],[0,-1,0])[0];assert(hit&&Math.abs(hit.point.y-expected)<1e-5,'坡屋顶与共享配置不符');}
for(const roof of visitor.data.options.roofs)for(const side of roof.pitch?[-1,1]:[1]){
 const x=visitor.data.position[0]+roof.center[0]+(roof.pitch?side*(roof.width/2+.185):1.1),
 z=visitor.data.position[2]+roof.center[1]+(roof.pitch?1.1:-roof.depth/2-.135),
 y=visitor.data.position[1]+roof.top-(roof.pitch?.1375:roof.depth/2*roof.slope+.127),hit=hits(visitor.model,[x,y+.2,z],[0,-1,0],.3)[0];
 assert(hit&&Math.abs(hit.point.y-y)<1e-5,'檐沟底板未接到低檐 '+JSON.stringify({center:roof.center,side,expected:y,actual:hit?.point.toArray()}));
}
assert.equal(hits(visitor.model,[53.9,4.1,75],[-1,0,0],2)[0]?.object.name,'visitor-signs','室内图牌朝向错误/藏进墙内');
for(const service of fixtures.data.options.services){const [x,y,z]=service.position,[w,h,d]=service.size,yaw=service.yaw??0;
 const point=p=>new T.Vector3(...p).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(new T.Vector3(x+60,y,z+68)).toArray();
 if(service.kind==='bin'){const direction=new T.Vector3(0,0,1).applyAxisAngle(new T.Vector3(0,1,0),yaw),opening=hits(fixtures.model,point([0,h*.8,-d/2-.1]),direction.toArray(),d+.15)[0];assert(opening&&opening.distance>d+.06,'垃圾桶投口被封死/未面向通路');}
 else {const basin=hits(fixtures.model,point([w*.25,h+1,0]),[0,-1,0],h+1)[0];assert(basin&&Math.abs(basin.point.y-(y+h*.68+.0175))<1e-5,'饮水台盆底未下沉');}
}
for(const rack of fixtures.data.options.bikeRacks){const isolated=fixtures.factory(T,{blocks:[],benches:[],signs:[],drains:[],services:[],bikeRacks:[rack]}),box=new T.Box3().setFromObject(isolated.root),yaw=rack.yaw??0,size=rack.size,w=Math.abs(Math.cos(yaw))*size[0]+Math.abs(Math.sin(yaw))*size[2],d=Math.abs(Math.sin(yaw))*size[0]+Math.abs(Math.cos(yaw))*size[2],[x,y,z]=rack.position;
 if(rack.bike){
  const rubber=isolated.root.children.find(n=>n.name==='hub-rubber-insets').geometry.attributes.position,
    local=i=>new T.Vector3().fromBufferAttribute(rubber,i).sub(new T.Vector3(x,y,z)).applyAxisAngle(new T.Vector3(0,1,0),-yaw),points=Array.from({length:rubber.count},(_,i)=>local(i));
  assert(Math.abs(Math.min(...points.map(p=>p.y)))<1e-5,'自行车轮胎悬离地面');
  assert(Math.min(...points.map(p=>p.x))>.04&&Math.max(...points.map(p=>p.x))<.61,'自行车穿过 U 形车架/把手净空不足');
  const wheel=points.slice(0,480);assert(Math.max(...wheel.map(p=>p.x))-Math.min(...wheel.map(p=>p.x))<.06&&Math.max(...wheel.map(p=>p.z))-Math.min(...wheel.map(p=>p.z))>.65,'车轮纵轴没有沿车架停放');
 }
 for(let i=0;i<3;i++)for(const dz of [-.45,.45]){
  const a=(i-1)*.65,px=x+a*Math.cos(yaw)+dz*Math.sin(yaw),pz=z-a*Math.sin(yaw)+dz*Math.cos(yaw);
  assert(ground.data.options.pads.some(r=>inside(px,pz,r)),'车架脚座仍种在草地中');
 }
 assert(box.min.x>=x-w/2-1e-5&&box.max.x<=x+w/2+1e-5&&box.min.z>=z-d/2-1e-5&&box.max.z<=z+d/2+1e-5&&box.min.y>=y-1e-5&&box.max.y<=y+size[1]+1e-5,'车架细节超出碰撞');isolated.dispose();isolated.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
}
for(const bench of fixtures.data.options.benches){
 const isolated=fixtures.factory(T,{blocks:[],benches:[bench],signs:[],drains:[],services:[],bikeRacks:[]}),[x,y,z]=bench.position,
  front=new T.Vector3(bench.facing[0]-x,0,bench.facing[1]-z).normalize(),side=(bench.width??1.9)*.2,back=hits(isolated,[x+front.x-front.z*side,y+.86,z+front.z+front.x*side],front.clone().negate().toArray(),2)[0];
 for(let d=.6;d<=Math.hypot(bench.facing[0]-x,bench.facing[1]-z);d+=.2){
  const px=x+front.x*d,pz=z+front.z*d;
  assert(!ground.data.options.soil.some(r=>inside(px,pz,r))||ground.data.options.pads.some(r=>inside(px,pz,r))||ground.data.options.paths.some(p=>inPath(px,pz,p)),'长椅脚垫与通路之间仍有草地隔断');
 }
 assert.equal(back?.object.name,'hub-bench-timber');assert(back.face.normal.dot(front)>.99,'椅背外观未面向通路/庭院');
 for(const along of [-.35,0,.35])for(const across of [-1,1]){
  const side=across*((bench.width??1.9)/2-.15),px=x+front.x*along-front.z*side,pz=z+front.z*along+front.x*side;
  assert(ground.data.options.pads.some(r=>inside(px,pz,r)),'长椅脚下未完整铺地');
 }
 isolated.dispose();isolated.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
}
for(const bench of fixtures.data.options.benches)for(const side of [-1,1])for(const dz of [-.19,.19]){const a=side*(bench.width??1.9)*.35,yaw=bench.yaw??0,[x,y,z]=bench.position,px=x+a*Math.cos(yaw)+dz*Math.sin(yaw)+60,pz=z-a*Math.sin(yaw)+dz*Math.cos(yaw)+68,hit=hits(fixtures.model,[px,y+.035,pz],[0,-1,0],.05)[0];assert(hit&&Math.abs(hit.point.y-y-.025)<1e-5,'长椅脚座悬空');}
console.log('PASS 实体遮挡/标牌面朝外/门洞开口/屋顶倾斜/服务开口/自行车平行车架与把手净空/全部长椅面向公共空间及硬质脚垫');
assert.equal(JSON.stringify(visitor.data.options.map.paths),JSON.stringify(ground.data.options.paths),'导览图与真实路线未共享');
for(const printMesh of [visitor.meshes.find(n=>n.name==='visitor-signs'),fixtures.meshes.find(n=>n.name==='hub-signs')]) {
const positions=printMesh.geometry.attributes.position,uvs=printMesh.geometry.attributes.uv;
for(let i=0;i<positions.count;i+=6){const min=new T.Vector3(Infinity,Infinity,Infinity),max=new T.Vector3(-Infinity,-Infinity,-Infinity),us=[],vs=[];
 for(let j=i;j<i+6;j++){const p=new T.Vector3().fromBufferAttribute(positions,j);min.min(p);max.max(p);us.push(uvs.getX(j));vs.push(uvs.getY(j));}
 const size=max.sub(min),aspect=Math.max(size.x,size.z)/size.y,imageAspect=(Math.max(...us)-Math.min(...us))*1024/((Math.max(...vs)-Math.min(...vs))*512);
 assert(Math.abs(aspect-imageAspect)<1e-4,'实体牌面拉伸文字');
}
}
const visitorWalls=[...visitor.data.options.walls,...visitor.data.options.structure];
for(let i=0;i<visitorWalls.length;i++)for(let j=i+1;j<visitorWalls.length;j++){const a=visitorWalls[i],b=visitorWalls[j],overlap=a.size.map((size,k)=>Math.min(a.offset[k]+size/2,b.offset[k]+b.size[k]/2)-Math.max(a.offset[k]-size/2,b.offset[k]-b.size[k]/2));assert(!overlap.every(v=>v>1e-6),'主墙/木隔墙/转角实体相交导致叠面');}
// 对实际合批三角面求同向共面交集, 再用射线排除地底/被遮住的内部接头.
function checkVisitorSurfaces(model,floor) {
 const faces=[];model.root.updateWorldMatrix(true,true);const outsideDistance=new T.Box3().setFromObject(model.root).getSize(new T.Vector3()).length()+1;
 model.root.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i+=3){const vertices=[0,1,2].map(k=>mesh.localToWorld(new T.Vector3().fromBufferAttribute(p,i+k))),[a,b,c]=vertices,normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),axis=[0,1,2].sort((x,y)=>Math.abs(normal.getComponent(y))-Math.abs(normal.getComponent(x)))[0],axes=[0,1,2].filter(k=>k!==axis),points=vertices.map(v=>axes.map(k=>v.getComponent(k)));
   const [u,v,w]=points;if((v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0])<0)points.reverse();faces.push({name:mesh.name,normal,axis,axes,plane:normal.dot(a),points});
  }
 });
 const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
 for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){
  const a=faces[i],b=faces[j];if(a.axis!==b.axis||a.normal.dot(b.normal)<1-1e-10||Math.abs(a.plane-b.plane)>1e-6)continue;
  let polygon=a.points;for(let k=0;k<3&&polygon.length;k++){const u=b.points[k],v=b.points[(k+1)%3],input=polygon;polygon=[];
   // Float32 相接边允许 1 微米舍入误差, 仍检查三角面内部真实重叠.
   const tolerance=1e-6*Math.hypot(v[0]-u[0],v[1]-u[1]);
   for(let l=0;l<input.length;l++){const p=input[l],q=input[(l+1)%input.length],dp=cross(u,v,p)-tolerance,dq=cross(u,v,q)-tolerance;if(dp>=0)polygon.push(p);if((dp>=0)!==(dq>=0))polygon.push(p.map((x,axis)=>x+(q[axis]-x)*dp/(dp-dq)));}
  }
  if(polygon.length<3)continue;const area=Math.abs(polygon.reduce((sum,p,k)=>{const q=polygon[(k+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;if(area<1e-7)continue;
  const center=new T.Vector3();for(let k=0;k<2;k++)center.setComponent(a.axes[k],polygon.reduce((sum,p)=>sum+p[k],0)/polygon.length);
  center.setComponent(a.axis,(a.plane-a.axes.reduce((sum,k)=>sum+a.normal.getComponent(k)*center.getComponent(k),0))/a.normal.getComponent(a.axis));if(center.y<=(typeof floor==='function'?floor(center):floor)+.01)continue;
  // 从组合模型外发射, 避免起点进入相邻闭合墙段, 把墙内榫头误判为可见面.
  const hit=hits(model,center.clone().addScaledVector(a.normal,outsideDistance).toArray(),a.normal.clone().negate().toArray(),outsideDistance+.001)[0];
  assert(!hit||Math.abs(hit.distance-outsideDistance)>1e-5,`可见共面叠面 ${a.name}/${b.name} ${JSON.stringify({center:center.toArray(),area,normal:a.normal.toArray(),a:a.points,b:b.points})}`);
 }
}
checkVisitorSurfaces(visitor.model,visitor.data.position[1]);
const defaultVisitor=visitor.factory(T);checkVisitorSurfaces(defaultVisitor,0);defaultVisitor.dispose();defaultVisitor.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
checkVisitorSurfaces(gallery.model,gallery.data.position[1]);
checkVisitorSurfaces(maintenance.model,maintenance.data.position[1]);
const fixtureFloor=p=>p.x>52.5&&p.x<57.2&&p.z>59.5&&p.z<65.5?1.8:p.x>64.4&&p.x<67.5&&p.z>56.5&&p.z<61.7?3.6:2.4;
checkVisitorSurfaces(fixtures.model,fixtureFloor);
// 单件外侧与组合装配同时检查, 避免远处的其他设施遮住有问题的接头而漏报.
for(const key of ['benches','bikeRacks','services','signs','blocks'])for(const item of fixtures.data.options[key]) {
 const isolated=fixtures.factory(T,{blocks:[],benches:[],signs:[],drains:[],services:[],bikeRacks:[],[key]:[item]});
 checkVisitorSurfaces(isolated,item.position?.[1]??1.8);
 if(key==='benches') {
  const [x,y,z]=item.position,w=item.width??1.9,yaw=item.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),supports=[];let start;
  // 从实际脚座顶面扫描支架间距, 不按生成循环反推预期构件数.
  for(let a=-w/2;a<=w/2;a+=.02) {
   const hit=hits(isolated,[x+a*c-.19*s,y+.035,z-a*s-.19*c],[0,-1,0],.05)[0];
   if(hit&&Math.abs(hit.point.y-y-.025)<1e-5){start??=a;}
   else if(start!==undefined){supports.push((start+a-.02)/2);start=undefined;}
  }
  assert(supports.length>=2&&supports[0]+w/2<.9&&w/2-supports.at(-1)<.9,'长椅边缘缺少支撑 '+JSON.stringify({w,supports}));
  assert(supports.slice(1).every((a,i)=>a-supports[i]<=1.81),'长椅支撑跨度过大');
 }
 isolated.dispose();isolated.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
}
console.log('PASS 壁牌/长椅/车架/链条/饮水台独立侧背面无可见叠面, 长椅支撑跨度');
// 活动道具合批在地面原点, 各节点按自身地板排除地下接头.
checkVisitorSurfaces(activity.model,p=>{
 const sites=activity.data.options.sites,nearest=sites.reduce((a,b)=>Math.hypot(p.x-activity.data.position[0]-a.position[0],p.z-activity.data.position[2]-a.position[2])<Math.hypot(p.x-activity.data.position[0]-b.position[0],p.z-activity.data.position[2]-b.position[2])?a:b);
 return activity.data.position[1]+nearest.position[1];
});
const defaultMaintenance=maintenance.factory(T);checkVisitorSurfaces(defaultMaintenance,0);defaultMaintenance.dispose();defaultMaintenance.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
const defaultGallery=gallery.factory(T);checkVisitorSurfaces(defaultGallery,0);defaultGallery.dispose();defaultGallery.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
const joined=new T.Group();joined.add(visitor.model.root,gallery.model.root,fixtures.model.root,activity.model.root,maintenance.model.root);checkVisitorSurfaces({root:joined},fixtureFloor);
for(const post of gallery.data.options.posts) {
 const world=post.offset.map((v,k)=>v+gallery.data.position[k]),hit=hits(gallery.model,[world[0],world[1],world[2]-.5],[0,0,1],1)[0];
 assert(hit&&Math.abs(hit.point.z-(world[2]-post.size[2]/2))<1e-5,'木廊柱网格与共享碰撞错位');
 const top=post.offset[1]+post.size[1]/2,beamBottom=gallery.data.options.roof.top-gallery.data.options.roof.thickness/2+post.offset[2]*gallery.data.options.roof.slope-.22;
 assert(Math.abs(top-beamBottom)<1e-8,'木柱没有接到承重横梁');
}
for(const run of gallery.data.options.runs) {
 const position=new T.Vector3(...run.position).add(new T.Vector3(...gallery.data.position)),axis=new T.Vector3(Math.sin(run.yaw),0,Math.cos(run.yaw));
 for(const post of run.posts) {
  const p=new T.Vector3(...post.offset).applyAxisAngle(new T.Vector3(0,1,0),run.yaw).add(position),hit=hits(gallery.model,p.clone().addScaledVector(axis,-.4).toArray(),axis.toArray(),.5)[0];
  assert(hit&&Math.abs(hit.distance-(.4-post.size[2]/2))<1e-5,'廊架柱体变换与碰撞错位 '+run.id);
 }
 const {roof}=run,local=new T.Vector3(.193,0,.11).applyAxisAngle(new T.Vector3(0,1,0),run.yaw).add(position),hit=hits(gallery.model,[local.x,8,local.z],[0,-1,0])[0];
 assert(hit&&Math.abs(hit.point.y-(position.y+roof.top+roof.thickness/2+.11*roof.slope))<1e-5,'廊架坡屋面变换错位 '+run.id);
}
for(const z of [-.65,-.4,.5,.65]) {
 const roof=gallery.data.options.roof,hit=hits(gallery.model,[gallery.data.position[0]+.42,7,gallery.data.position[2]+z],[0,-1,0])[0];
 assert(hit&&Math.abs(hit.point.y-(2.4+roof.top+roof.thickness/2+z*roof.slope))<1e-5,'木廊屋面高度不符');
}
for(const x of [53.2,54.7,56.2])assert.equal(hits(gallery.model,[x,4,68],[0,0,1],2.5).length,0,'木廊通行面被封闭');
assert.equal(routes.pockets.length,8,'连接带节点未完整分组');
assert.equal(fixtures.model.onHit({object:{name:'hub-planter-soil'}}).surface,'soil','花池土面保留硬面弹痕');
console.log('PASS 木廊独立/组合装配无可见叠面, 柱梁接头/共享屋面/通行开口');
console.log('PASS 服务房实际三角面/默认装配无可见叠面, 主墙/隔墙精确相接');
const parapets=fixtures.data.options.blocks.slice(0,6);
for(let i=0;i<parapets.length;i++)for(let j=i+1;j<parapets.length;j++) {
 const a=parapets[i],b=parapets[j],overlap=[0,2].map(k=>Math.min(a.offset[k]+a.size[k]/2,b.offset[k]+b.size[k]/2)-Math.max(a.offset[k]-a.size[k]/2,b.offset[k]-b.size[k]/2));
 assert(!overlap.every(v=>v>1e-5),'露台压顶重叠');
}
for(const [i,b]of fixtures.data.options.blocks.entries()) {
 const shape=fixtures.data.collision.boxes[i],top=b.offset[1]+b.size[1]/2+(b.kind==='planter'?.04:b.size[1]>.9?.08:0);
 assert(Math.abs(shape.offset[1]+shape.size[1]/2-top)<1e-9,'低石沿/墙帽/花池碰撞悬空');
 if(b.kind==='edging')assert.equal(shape.size[1],b.size[1],'低石沿没有共用实体高度');
}
for(const planter of fixtures.data.options.blocks.filter(b=>b.kind==='planter'))for(const sx of [-1,1])for(const sz of [-1,1]) {
 const [x,y,z]=planter.offset,[w,h,d]=planter.size,px=x+sx*(w/2-.08)+60,pz=z+sz*(d/2-.17)+68,top=y+h/2+.04;
 const caps=hits(fixtures.model,[px,top+.1,pz],[0,-1,0],.12).filter(hit=>Math.abs(hit.point.y-top)<1e-5);assert.equal(caps.length,1,'树池角部压顶叠面/缺口');
}
for(const step of ground.data.options.steps){const [x,y,z]=step.offset,[w,h]=step.size,hit=downward(x+60-w/2+.004,z+68);assert(hit&&Math.abs(hit.point.y-(y+h/2-.004))<1e-5,'台阶倒角与边界不符');}
assert(Math.max(...visitor.meshes.find(n=>n.name==='visitor-timber').geometry.attributes.uv.array)>2,'长构件纹理未使用米制尺度');
console.log('PASS 横匾/竖牌/室内地图文字比例及墙角无叠面');
const point=new T.Vector3(),matrix=new T.Matrix4(),grassModel=find('hubGrass'),grass=grassModel.meshes.find(n=>n.name==='hub-meadow-grass'),tallGrass=grassModel.meshes.find(n=>n.name==='hub-tall-grass'),distribution=Array(ground.data.options.soil.length).fill(0);
assert.equal(JSON.stringify(grassModel.data.options.turf),JSON.stringify(ground.data.options.turf),'草丛与地表生态配置未共用');
assert(!grassModel.data.collision.enabled,'草丛增加身体碰撞');
const roots=[],grassColors=new Set(),grassHeights=[[],[]],rootBase=new T.Vector3(),tip=new T.Vector3(),options=grassModel.data.options;
const grassRoads=options.paths.flatMap(p=>p.points.slice(1).map((b,i)=>{const a=p.points[i],dx=b[0]-a[0],dz=b[1]-a[1],r=p.width/2;return {a,dx,dz,r,length:dx*dx+dz*dz,bounds:[Math.min(a[0],b[0])-r,Math.min(a[1],b[1])-r,Math.max(a[0],b[0])+r,Math.max(a[1],b[1])+r]};}));
for(const [kind,mesh]of [grass,tallGrass].entries()) {
 assert(mesh&&mesh.count>0&&mesh.count<=(kind?800:12000)&&!mesh.castShadow&&mesh.receiveShadow&&mesh.material.side===T.DoubleSide&&mesh.raycast()===undefined,'草丛层次/阴影/预算');
 const vertices=mesh.geometry.attributes.position,bases=[],tips=[];
 const seenTips=new Set();for(let j=0;j<vertices.count;j++){
  if(vertices.getY(j)===0)bases.push(j);
  else {const key=vertices.getX(j)+','+vertices.getY(j)+','+vertices.getZ(j);if(!seenTips.has(key)){seenTips.add(key);tips.push(j);}}
 }
 assert.equal(new Set(mesh.geometry.attributes.hubBlade.array).size,kind?7:5,'叶片变化分组缺失');
 let tilted=0;
 for(let i=0;i<mesh.count;i++) {
  mesh.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);
  const near=(bounds,pad=1)=>point.x>bounds[0]-pad&&point.x<bounds[2]+pad&&point.z>bounds[1]-pad&&point.z<bounds[3]+pad;
  const nearRoads=grassRoads.filter(p=>near(p.bounds)),nearFixtures=options.exclusions.filter(r=>near(r)),nearTrees=options.treeBases.filter(([x,z])=>Math.hypot(point.x-x,point.z-z)<2);
  const patch=ground.data.options.soil.findIndex(([a,b,c,d])=>point.x>a&&point.x<c&&point.z>b&&point.z<d);assert(patch>=0,'草越出种植岛');if(!kind){distribution[patch]++;roots.push(point.clone());}
  const hit=downward(point.x+60,point.z+68);assert(hit&&hit.point.y-point.y>=.0299&&hit.point.y-point.y<.1,'草根未埋入真实地面');
  const up=new T.Vector3(0,1,0).transformDirection(matrix);if(up.y<.999)tilted++;
  for(const [x,z]of options.treeBases)assert(Math.hypot(point.x-x,point.z-z)>=(kind?1.1199:.8999),'草根圆形避让侵入树干');
  for(const j of bases){rootBase.fromBufferAttribute(vertices,j).applyMatrix4(matrix);const groundHit=downward(rootBase.x+60,rootBase.z+68);assert(groundHit&&groundHit.point.y-rootBase.y>=.0039&&groundHit.point.y-rootBase.y<.13,'叶基浮空/埋深错误');}
  for(const path of options.paths)for(let j=1;j<path.points.length;j++) {
   const a=path.points[j-1],b=path.points[j],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.z-a[1])*dz)/length));
   assert(Math.hypot(point.x-a[0]-dx*t,point.z-a[1]-dz*t)>=path.width/2+(kind?.6799:.4599),'草侵入道路');
  }
  let high=0;
  for(const j of tips){tip.fromBufferAttribute(vertices,j).applyMatrix4(matrix);high=Math.max(high,tip.y-point.y);
   // 包括叶片实际弯曲与风幅, 不只检查草丛中心点.
   for(const [a,b,c,d]of options.exclusions)assert(!(tip.x>a-.025&&tip.x<c+.025&&tip.z>b-.025&&tip.z<d+.025),'草叶侵入设施/铺装');
   assert(tip.x>options.soil[patch][0]+.02&&tip.x<options.soil[patch][2]-.02&&tip.z>options.soil[patch][1]+.02&&tip.z<options.soil[patch][3]-.02,'弯曲草叶越出种植岛');
   // 检查叶形变高/偏斜和最大风幅的包络, 不用静态原型代替最终可见范围.
   const height=vertices.getY(j),weight=Math.min(1,height/(kind?1.02:.45))**2;
   for(const sx of [-1,1])for(const sz of [-1,1])for(const sy of [.9,1.1]) {
    const moved=new T.Vector3(vertices.getX(j)+sx*.052*weight,height*sy,vertices.getZ(j)+sz*.046*weight).applyMatrix4(matrix);
    assert(mesh.boundingBox.containsPoint(moved),'风动/叶形变化越出包围盒');assert(moved.distanceTo(mesh.boundingSphere.center)<=mesh.boundingSphere.radius,'风动/叶形变化越出包围球');
    for(const [a,b,c,d]of nearFixtures)assert(!(moved.x>a+.0001&&moved.x<c-.0001&&moved.z>b+.0001&&moved.z<d-.0001),'风动叶片侵入设施/铺装');
    for(const [x,z]of nearTrees)assert(Math.hypot(moved.x-x,moved.z-z)>.44,'风动叶片穿入树干');
    for(const {a,dx,dz,length,r}of nearRoads){const f=Math.max(0,Math.min(1,((moved.x-a[0])*dx+(moved.z-a[1])*dz)/length));assert(Math.hypot(moved.x-a[0]-dx*f,moved.z-a[1]-dz*f)>r-.0001,'风动叶片侵入园路');}
    assert(moved.x>options.soil[patch][0]&&moved.x<options.soil[patch][2]&&moved.z>options.soil[patch][1]&&moved.z<options.soil[patch][3],'风动叶片越出草坪');
   }
  }
  grassHeights[kind].push(high);grassColors.add(Array.from(mesh.instanceColor.array.slice(i*3,i*3+3)).map(v=>v.toFixed(3)).join(','));
 }
 assert(tilted>5,'缓丘草丛未按坡面朝向');
 const matrices=mesh.instanceMatrix.array.slice(),colors=mesh.instanceColor.array.slice(),shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);
 const initial=shader.uniforms.hubGrassTime.value;for(let frame=0;frame<1000;frame++)grassModel.model.update(1/60);
 assert(Math.abs(shader.uniforms.hubGrassTime.value-initial-1000/60)<1e-8,'风动时间更新错误');assert.deepEqual(mesh.instanceMatrix.array,matrices,'风动逐帧重写实例矩阵');assert.deepEqual(mesh.instanceColor.array,colors,'风动逐帧重写草色');
 assert(shader.vertexShader.includes('hubGrassTip*hubGrassTip')&&shader.vertexShader.includes('hubGrassFadeOffset')&&shader.vertexShader.includes('hubGrassLean')&&shader.fragmentShader.includes('hubGrassTransmission'),'风动/错开渐隐/叶形/逆光缺失');
}
assert.equal(grass.count,12000,'短草未覆盖完整预算');assert.equal(tallGrass.count,800,'林缘长草未覆盖完整预算');assert(grassColors.size>250,'草色没有受生态斑块影响');
assert(Math.min(...grassHeights[0])<.20&&Math.max(...grassHeights[0])>.28&&Math.min(...grassHeights[1])>.3&&Math.max(...grassHeights[1])>.58,'短草/长草高度缺少层次');
// 每条连接臂均含不同疏密小块, 不再仅有稀疏的等距草星.
for(const rect of options.soil.slice(0,4)) {
 const long=rect[2]-rect[0]>rect[3]-rect[1]?0:2,start=rect[long===0?0:1],end=rect[long===0?2:3],counts=Array(8).fill(0);
 for(const p of roots)if(p.x>rect[0]&&p.x<rect[2]&&p.z>rect[1]&&p.z<rect[3])counts[Math.min(7,Math.floor((p.getComponent(long)-start)/(end-start)*8))]++;
 assert(counts.every(n=>n>20),'连接臂局部秃草 '+counts);assert(Math.max(...counts)>Math.min(...counts)*1.25,'草坪没有疏密斑块');
}
const grassDetail=ground.meshes.find(n=>n.name==='hub-ground-surface').material.bumpMap.image.data;
assert(new Set(Array.from(grassDetail).filter((v,i)=>i%4===3)).size>15,'草坪近景色差通道仍为空');
assert.equal(options.turf.woodland.length,20,'中央林下过渡没有覆盖全部树木');
for(let i=0;i<options.treeBases.length;i++)assert.equal(JSON.stringify(options.turf.woodland[i].center),JSON.stringify(options.treeBases[i]),'树下草土规格中心错位');
console.log('PASS 双层曲叶草坪/五岛分布/真实叶基贴坡/林下生态/圆形树根避让/风动包络/缓冲复用');
const flowers=plants.meshes.find(n=>n.name==='hub-flower');assert(flowers?.count>0&&flowers.count<=42&&!flowers.castShadow,'花丛实例或阴影预算');
for(let i=0;i<flowers.count;i++){flowers.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);assert(plants.data.options.patches.some(p=>p.kind==='flower'&&point.x>p.rect[0]&&point.x<p.rect[2]&&point.z>p.rect[1]&&point.z<p.rect[3]),'花丛越出土床');for(const path of ground.data.options.paths)for(let j=1;j<path.points.length;j++){const a=path.points[j-1],b=path.points[j],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.z-a[1])*dz)/length));assert(Math.hypot(point.x-a[0]-dx*t,point.z-a[1]-dz*t)>=path.width/2+.2199,'花丛侵入道路');}}
const shrubs=plants.meshes.find(n=>n.name==='hub-shrub');assert(shrubs.count>90&&shrubs.count<=360&&!shrubs.castShadow,'灌木实例或阴影预算');
let raisedShrubs=0,groundShrubs=0;
for(let i=0;i<shrubs.count;i++) {
 shrubs.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);
 const patch=plants.data.options.patches.find(p=>p.kind==='shrub'&&point.x>p.rect[0]&&point.x<p.rect[2]&&point.z>p.rect[1]&&point.z<p.rect[3]&&(p.raised?Math.abs(point.y-(p.y-.025))<1e-5:true));
 assert(patch,'灌木越出种植床');if(patch.raised){raisedShrubs++;continue;}groundShrubs++;assert(Math.abs(downward(point.x+60,point.z+68).point.y-point.y-.025)<1e-5,'灌木未贴合缓丘地面');
 for(const [a,b,c,d]of plants.data.options.exclusions)assert(!(point.x>a&&point.x<c&&point.z>b&&point.z<d),'地栽灌木侵入设施/树干');
 for(const path of ground.data.options.paths)for(let j=1;j<path.points.length;j++) {
  const a=path.points[j-1],b=path.points[j],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.z-a[1])*dz)/length));
  assert(Math.hypot(point.x-a[0]-dx*t,point.z-a[1]-dz*t)>=path.width/2+.8499,'地栽灌木侵入道路');
 }
}
assert(raisedShrubs>0&&groundShrubs>0,'种植层次缺失');
for(const tree of models.filter(m=>m.data.model==='parkTree')){assert(tree.meshes[1].count<=2000&&!tree.meshes[1].castShadow&&!tree.meshes[1].receiveShadow,'中央树冠细叶预算');assert.equal(tree.meshes[2].count,0,'树冠阴影代理参与世界绘制');}
assert(distribution.every(n=>n>0),'连接带地被预算分配不均');assert(grass.count<=12000&&tallGrass.count<=800);
for(const [x,z,soft]of [[-40,76.8,true],[-15,68,false],[38,76,true],[120,68,false]]){const hit=downward(x,z),response=ground.model.onHit(hit);assert.equal(response?.surface==='soil',soft,'软硬地面反馈错误');}
const localHit=downward(-40,76.8),localPoint=ground.model.root.worldToLocal(localHit.point.clone());ground.model.root.rotation.y=.4;ground.model.root.scale.set(1.2,.9,1.1);ground.model.root.updateWorldMatrix(true,true);assert.equal(ground.model.onHit({...localHit,point:ground.model.root.localToWorld(localPoint)}).surface,'soil','实例变换后的草土判定');
for(const {data,model,meshes}of models){if(data.model==='parkTree')continue;const textures=new Set();let textureDisposals=0,instanceDisposals=0;if(data.model==='hubGround')for(const uniform of Object.values(groundShader.uniforms))if(uniform.value?.isTexture)textures.add(uniform.value);for(const n of meshes){for(const value of Object.values(n.material))if(value?.isTexture)textures.add(value);if(n.isInstancedMesh)n.addEventListener('dispose',()=>instanceDisposals++);}for(const tex of textures){if(tex.isDataTexture&&tex.name!=='hub-boundary-distance')assert(tex.generateMipmaps&&tex.minFilter===T.LinearMipmapLinearFilter&&tex.magFilter===T.LinearFilter,'近景/远处材质过滤缺失 '+data.model);tex.addEventListener('dispose',()=>textureDisposals++);}model.dispose();model.dispose();assert.equal(textureDisposals,textures.size,'私有纹理泄漏/重复释放');assert.equal(instanceDisposals,meshes.filter(n=>n.isInstancedMesh).length,'实例缓冲泄漏/重复释放');}
console.log('PASS 地被均匀分配/道路避让/软硬命中/变换/重复释放');
console.log('PASS 中央预算 '+JSON.stringify({meshCount,worldMeshes:models.flatMap(m=>m.meshes).filter(n=>!n.isInstancedMesh||n.count>0).length,triangles,newTriangles,colliders:hubSolids.length,grass:grass.count,tallGrass:tallGrass.count,shrubs:shrubs.count,raisedShrubs,groundShrubs,distribution}));
