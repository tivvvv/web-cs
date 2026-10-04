// 纯 Node 小山回归: 原装配/物理, 高度场与真实网格, 登顶路线和梯口; 不启动浏览器.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8'),html=read('index.html');
const document={createElement(){const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(p){this.pixels=p;},strokes:[],current:[],beginPath(){this.current=[];},moveTo(x,y){this.current.push([x,y]);},lineTo(x,y){this.current.push([x,y]);},stroke(){this.strokes.push({color:this.strokeStyle,points:this.current});}};
 for(const method of ['setTransform','fillRect','fillText'])ctx[method]=()=>{};
 return {width:1,height:1,getContext:()=>ctx,ctx};}};
const c=vm.createContext({window:{},FPS:{models:{}},document,console,AbortController});
vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const T=c.THREE,layout=c.window.FPS_LAYOUT,district=layout.instances.filter(i=>i.id.startsWith('mountain-'));
const before=vm.createContext({window:{}});vm.runInContext(execFileSync('git',['show','HEAD:scene-kamakura.js'],{encoding:'utf8'}),before);
for(const old of before.window.FPS_LAYOUT.instances)if(old.id!=='reserved-district-ground'&&!old.id.startsWith('mountain-')&&!old.id.startsWith('central-'))assert.equal(JSON.stringify(layout.instances.find(i=>i.id===old.id)),JSON.stringify(old),'旧区域被修改: '+old.id);
assert.equal(new Set(layout.instances.map(i=>i.id)).size,layout.instances.length);assert(!layout.instances.some(i=>i.id.startsWith('hillside-')));
assert(!Object.keys(layout.catalog).some(k=>k.startsWith('hillside')));
const routes=layout.regionPlan.corners[2].routes,walkingPaths=[...routes.paths,...routes.links];assert.equal(routes.links.length,2);assert.equal(routes.approaches.length,3);assert.equal(routes.summitY,26.4);assert(routes.peakY>29);assert.equal(routes.paths.length,3);assert.equal(routes.stairs.length,2);
const heightData=district.find(i=>i.model==='coastalMountain').options.heights;
assert(Math.max(...heightData)>32&&Math.max(...heightData)<35.4,'自然主峰必须高于观景设施且位于高度场范围内');
vm.runInContext(`const T=THREE, scene=new T.Scene(), camera=new T.PerspectiveCamera(), solid=[], actors=[], entries=[], ladders=[],keys=new Set(),hints={};
 const player={position:new T.Vector3(),debug:false};player.body={root:player,radius:.32,height:1.75,vy:0,grounded:false};
 let yaw=0,pitch=0,walk=0,weapon,renderEffect;const api={spawn:new T.Vector3(115,2.4,78)},$=id=>hints[id]??={};
 ${html.slice(html.indexOf('const STEP_HEIGHT'),html.indexOf('function separateBodies()'))}
 ${html.slice(html.indexOf('function createInstance(data)'),html.indexOf('function toggleEnemies()'))}
 ${html.slice(html.indexOf('function updatePlayer(dt)'),html.indexOf('function showMenu('))}
 FPS.models.collisionOnly=()=>({root:new T.Group()});
 globalThis.t={solid,entries,ladders,keys,player,move,fall,blockedAt,terrainSurface,createInstance,updatePlayer,face:n=>{yaw=Math.atan2(n.x,n.z);}};`,c);
const t=c.t;
for(const entry of layout.instances.filter(i=>i.collision.enabled&&!i.collision.dynamic&&!i.attach))t.createInstance({...entry,model:'collisionOnly',traversal:undefined});
const allSolids=[...t.solid],terrain=allSolids.find(s=>s.id==='mountain-terrain'&&s.box.heightfield);
assert(terrain);assert.equal(allSolids.filter(s=>s.box.heightfield).length,1);
assert(allSolids.filter(s=>s.id.startsWith('mountain-')).length<200,'山体实体过量');
function select(points){const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]);const range=new T.Box3(new T.Vector3(Math.min(...xs)-.7,-2,Math.min(...zs)-.7),new T.Vector3(Math.max(...xs)+.7,45,Math.max(...zs)+.7));
 t.solid.splice(0,t.solid.length,...allSolids.filter(s=>s.box.intersectsBox(range)));}
function spawn(p){t.player.position.set(...p);Object.assign(t.player.body,{vy:0,grounded:false,ladder:null});for(let i=0;i<30;i++)t.fall(t.player.body,1/60);assert(!t.blockedAt(t.player.position,.32,1.75,[]),'入口嵌入实体 '+JSON.stringify(p));}
function walk(target,dt=1/60,speed=4.7){const length=Math.hypot(target[0]-t.player.position.x,target[2]-t.player.position.z);
 for(let i=0;i<Math.ceil((length/speed+.35)/dt);i++){const dx=target[0]-t.player.position.x,dz=target[2]-t.player.position.z,d=Math.hypot(dx,dz),step=Math.min(d,speed*dt);if(d>.001)t.move(t.player,dx/d*step,dz/d*step);t.fall(t.player.body,dt);assert(!t.blockedAt(t.player.position,.32,1.75,[]),'行走嵌入实体');}
 assert(Math.hypot(target[0]-t.player.position.x,target[2]-t.player.position.z)<.05&&Math.abs(target[1]-t.player.position.y)<.05,'路线受阻/高度不符 '+JSON.stringify({target,actual:t.player.position.toArray()}));}
for(const route of routes.stairs){const delta=new T.Vector3(...route.b).sub(new T.Vector3(...route.a));delta.y=0;delta.normalize();
 const a=route.a.map((v,i)=>v-delta.getComponent(i)*.45),b=route.b.map((v,i)=>v+delta.getComponent(i)*.4);select([a,b]);spawn([a[0],a[1]+.1,a[2]]);walk(b);spawn([b[0],b[1]+.1,b[2]]);walk(a);console.log('PASS 台阶往返 '+route.id);}
// 三条自然土径执行真实身体移动, 终点高度按脚底范围的真实支撑校验.
const support=p=>t.terrainSurface(new T.Vector3(...p),.32,terrain.box).top;
const walkSupport=p=>Math.max(support(p),...allSolids.filter(s=>!s.box.heightfield&&s.box.max.y<=p[1]+.28&&
 Math.hypot(p[0]-Math.max(s.box.min.x,Math.min(s.box.max.x,p[0])),p[2]-Math.max(s.box.min.z,Math.min(s.box.max.z,p[2])))<.32).map(s=>s.box.max.y));
for(const path of walkingPaths) {
 const points=path.points.map(p=>[p[0],walkSupport(p),p[2]]),stair=routes.stairs.find(s=>s.id===(path.id==='south-trail'?'south-summit':path.id==='forest-trail'?'west-summit':''));
 if(stair){const direction=new T.Vector3(...stair.b).sub(new T.Vector3(...stair.a));direction.y=0;direction.normalize();points.push(stair.b.map((v,i)=>v+direction.getComponent(i)*.4));}
 select(points);spawn([points[0][0],points[0][1]+.1,points[0][2]]);
 for(const p of points.slice(1))walk(p);for(const p of points.slice(0,-1).reverse())walk(p);
 console.log('PASS 自然土径'+(stair?'/短阶连续登顶':'')+'往返 '+path.id);
}
// 身体覆盖与弯道内侧都要通行, 不能只验证一条中心线; 入口处回到真实梯口/落脚区.
function offsetPath(path,fraction) {
 const distances=[0];for(let i=1;i<path.points.length;i++)distances.push(distances.at(-1)+Math.hypot(path.points[i][0]-path.points[i-1][0],path.points[i][2]-path.points[i-1][2]));
 const total=distances.at(-1);
 return path.points.map((p,i)=>{
  const a=path.points[Math.max(0,i-1)],b=path.points[Math.min(path.points.length-1,i+1)],length=Math.hypot(b[0]-a[0],b[2]-a[2]);
  const across=fraction*(path.width/2-.4)*Math.min(1,distances[i]/2,(total-distances[i])/4);
  const q=[p[0]-(b[2]-a[2])/length*across,p[1],p[2]+(b[0]-a[0])/length*across];q[1]=walkSupport(q);return q;
 });
}
for(const path of walkingPaths){let samples=0,peakSlope=0;
 for(let j=1;j<path.points.length;j++){
  const a=path.points[j-1],b=path.points[j],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),count=Math.ceil(length/.25);
  for(let i=0;i<=count;i++)for(const side of [-1,-.5,0,.5,1]){
   const across=side*(path.width/2-.4),p=new T.Vector3(a[0]+dx*i/count-dz/length*across,40,a[2]+dz*i/count+dx/length*across),surface=t.terrainSurface(p,.32,terrain.box);
   if(!surface)continue;peakSlope=Math.max(peakSlope,surface.slope);samples++;
   assert(surface.slope<=terrain.box.heightfield.maxSlope,'道路可走宽度内有陡坎 '+JSON.stringify({path:path.id,point:p.toArray(),slope:surface.slope}));
  }
 }
 console.log('PASS 道路全宽/脚底覆盖坡度 '+path.id+' '+JSON.stringify({samples,peakSlope}));
 const lanes=[-1,-.5,0,.5,1].map(side=>offsetPath(path,side));
 for(const [dt,speed]of [[1/20,7.4],[1/60,4.7],[1/144,7.4]])for(const points of lanes){
  select(points);spawn([points[0][0],points[0][1]+.1,points[0][2]]);
  for(const p of points.slice(1))walk(p,dt,speed);for(const p of points.slice(0,-1).reverse())walk(p,dt,speed);
 }
 console.log('PASS 五条横向走线/20~144 FPS/步行奔跑往返 '+path.id);
}
for(const path of [
 [[140,26.4,136.4],[140,26.4,137],[133,26.4,137],[128.5,26.4,136]],
 [[144.8,19.8,119],[144.8,19.8,121],[145,19.8,136],[144,19.8,138.2],[143.6,19.8,138.2]],
 [[50,2.4,68],[50,2.4,66],[60,2.4,66],[60,2.4,68],[64,2.4,70],[64,2.4,78]]
]){select(path);spawn([path[0][0],path[0][1]+.1,path[0][2]]);for(const p of path.slice(1))walk(p);for(const p of path.slice(0,-1).reverse())walk(p);}
console.log('PASS 三条自然上山线, 山顶连接/崖边栈道与中央广场绕行');
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const models=[];
for(const data of layout.instances.filter(i=>['coastalMountain','mountainRocks','mountainTrails','trailFacilities','terraceGround','mountainGroundcover','coastalRidges','mountainWoodland','mountainGrass','mountainLitter'].includes(i.model))){const source=read(layout.catalog[data.model]),isolated=vm.createContext({FPS:{models:{}},document,console});
 assert(!/\b(?:import|fetch|requestAnimationFrame|setInterval|setTimeout)\s*\(/.test(source));vm.runInContext(source,isolated);assert.equal(Object.keys(isolated.FPS.models).length,1);
 const options=freeze(structuredClone(data.options)),snapshot=JSON.stringify(options),model=isolated.FPS.models[data.model](T,options);assert.equal(JSON.stringify(options),snapshot);assert(model.root.isObject3D&&(['mountainWoodland','mountainGrass'].includes(data.model)||!model.update));
 model.root.position.set(...data.position);model.root.updateWorldMatrix(true,true);const meshes=[];model.root.traverse(n=>{if(!n.isMesh)return;meshes.push(n);for(const a of Object.values(n.geometry.attributes)){assert(a.array.every(Number.isFinite),data.id+' 顶点无效');assert.equal(a.count,n.geometry.attributes.position.count,data.id+' 顶点属性数量不匹配');}if(n.isInstancedMesh)assert(n.instanceMatrix.array.every(Number.isFinite));n.geometry.computeBoundingSphere();assert(Number.isFinite(n.geometry.boundingSphere.radius));});
 assert(meshes.length<=(data.model==='mountainWoodland'?17:data.model==='trailFacilities'?6:data.model==='mountainRocks'?1:['coastalMountain','mountainGrass'].includes(data.model)?2:3),data.id+' 合批超量');models.push({data,model,meshes});console.log('PASS 独立模型 '+data.id+' / '+meshes.length+' meshes');}
const facilities=models.find(m=>m.data.id==='mountain-rest-facilities'),signMap=facilities.meshes.find(m=>m.material.map?.image.width===1024).material.map.image.ctx;
const mapRoutes=facilities.data.options.trailMap;
assert.equal(mapRoutes.length,walkingPaths.length);assert(new Set(mapRoutes.slice(0,3).map(r=>r.color)).size===3);
for(const route of mapRoutes){const stroke=signMap.strokes.find(s=>s.color===route.color&&s.points.length===route.points.length&&
 Math.abs(s.points[0][0]-(512+24+(route.points[0][0]+50)*208/100))<.0001);
 assert(stroke,'导览图遗漏路线/没有按整条路线分色');
 route.points.forEach(([px,,pz],i)=>assert(Math.abs(stroke.points[i][0]-(512+24+(px+50)*208/100))<.0001&&Math.abs(stroke.points[i][1]-(256+22+(pz+38)*72/76))<.0001,'导览图采样与实际路线偏离'));}
console.log('PASS 导览图与实际五条路线逐点一致, 主路分别着色/联络路统一标识');
const ray=new T.Raycaster(),mountain=models.find(m=>m.data.model==='coastalMountain'),access=models.find(m=>m.data.model==='mountainTrails');
for(let x=76.3;x<168;x+=7.3)for(let z=81.2;z<152;z+=6.1){const p=new T.Vector3(x,40,z),top=t.terrainSurface(p,0,terrain.box).top;ray.set(p,new T.Vector3(0,-1,0));ray.far=42;const hit=ray.intersectObject(mountain.model.root,true)[0];assert(hit&&Math.abs(hit.point.y-top)<.00001,'高度场与可见三角面不一致');}
console.log('PASS 山体高度场与实际网格插值/对角线一致');
const backdrop=models.find(m=>m.data.model==='coastalRidges');assert(!backdrop.data.collision.enabled&&backdrop.meshes.length===1);
const bg=backdrop.meshes[0].geometry.attributes.position,bgNormals=backdrop.meshes[0].geometry.attributes.normal,bgVertices=new Set(),edgeNormals=new Map();
for(const mesh of mountain.meshes){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);if(x!==50&&z!==38)continue;const surface=t.terrainSurface(new T.Vector3(x+120,40,z+116),0,terrain.box);
  if(surface&&Math.abs(p.getY(i)-surface.top)<.00001&&!edgeNormals.has(x+'/'+z))edgeNormals.set(x+'/'+z,new T.Vector3().fromBufferAttribute(n,i));}}

for(let i=0;i<bg.count;i++){const x=bg.getX(i),z=bg.getZ(i);assert(x>=50||z>=38,'背景侵入可玩区域');
 const key=x+'/'+z;assert(!bgVertices.has(key),'远景两翼没有共享接边顶点');bgVertices.add(key);
 if((Math.abs(z-38)<.001&&x<=50)||(Math.abs(x-50)<.001&&z<=38)){
  const top=t.terrainSurface(new T.Vector3(x+120,40,z+116),0,terrain.box).top;assert(Math.abs(bg.getY(i)-top)<.00001,'远景山脊边界裂缝');
  assert(edgeNormals.get(key)?.distanceTo(new T.Vector3().fromBufferAttribute(bgNormals,i))<.00001,'远景接边法线与可玩山体不一致');
 }}
assert(!backdrop.meshes[0].castShadow&&!backdrop.meshes[0].receiveShadow,'远景不参与可玩区阴影更新');
console.log('PASS 远景共享边界剖面/不侵入可玩区/无额外碰撞或阴影');
const soil=mountain.meshes.find(m=>m.name==='mountain-soil-face').material,macro=soil.map.image,rough=soil.roughnessMap.image;
assert.equal(macro.width,1024);assert(soil.bumpMap!==soil.map&&soil.bumpMap.repeat.x>30&&soil.bumpMap.repeat.y>30);
assert(soil.map.generateMipmaps&&soil.bumpMap.generateMipmaps&&soil.map.anisotropy>=8);
assert(soil.map.wrapS!==T.RepeatWrapping&&soil.roughnessMap.wrapT!==T.RepeatWrapping&&soil.bumpMap.wrapS===T.RepeatWrapping,'全山大图跨边缘重复/细节图没有重复');
const colors=new Set();for(let i=0;i<macro.ctx.pixels.data.length;i+=4096)colors.add(Array.from(macro.ctx.pixels.data.slice(i,i+3)).join('/'));
assert(colors.size>100,'山体缺少宏观草土/裸岩色块');assert(Math.max(...rough.ctx.pixels.data.filter((_,i)=>i%4===0))-Math.min(...rough.ctx.pixels.data.filter((_,i)=>i%4===0))>15,'干湿粗糙度没有变化');
const cliff=mountain.meshes.find(m=>m.name==='mountain-rock-face');
assert(cliff.material.map===soil.map&&cliff.material.roughnessMap===soil.roughnessMap,'草土与岩面宏观色块接缝');
assert(cliff.material.bumpMap.channel===1&&cliff.geometry.attributes.uv1,'岩面独立 UV 未接入');
const backgroundColors=backdrop.meshes[0].geometry.attributes.color;
for(let i=0;i<bg.count;i++)if((bg.getX(i)===50&&bg.getZ(i)<=38)||(bg.getZ(i)===38&&bg.getX(i)<=50)) {
 const x=Math.round((bg.getX(i)+50)/100*1023),y=Math.round((38-bg.getZ(i))/76*1023),offset=(y*1024+x)*4,c=new T.Color().setRGB(backgroundColors.getX(i),backgroundColors.getY(i),backgroundColors.getZ(i)).convertLinearToSRGB();
 [c.r,c.g,c.b].forEach((v,j)=>assert(Math.abs(v*255-macro.ctx.pixels.data[offset+j])<18,'背景接边宏观色与山体不一致'));}
console.log('PASS 草土/岩面/远景色图接边与共享法线, 土径磨损颗粒/干湿粗糙度与独立岩纹 UV');
let hidden=0,exposed=0,peek=false;const naturalRoots=[mountain.model.root,models.find(m=>m.data.model==='mountainRocks').model.root],target=new T.Vector3(133,28.05,137);
for(const path of walkingPaths){let previous;
 for(const p of path.points){const from=new T.Vector3(p[0],walkSupport(p)+1.65,p[2]),direction=target.clone().sub(from);ray.far=direction.length()-.03;ray.set(from,direction.normalize());const blocked=ray.intersectObjects(naturalRoots,true).length>0;
  blocked?hidden++:exposed++;if(previous&&previous.blocked!==blocked&&previous.from.distanceTo(from)<5)peek=true;previous={blocked,from};
 }}
assert(hidden>15&&exposed>15&&peek,'自然坡肩没有形成遮挡/探头节奏 '+JSON.stringify({hidden,exposed,peek}));
console.log('PASS 自然坡肩/岩脊遮挡, 小范围移动改变山顶射线暴露 '+JSON.stringify({hidden,exposed}));
assert([125,132,138].some(z=>t.terrainSurface(new T.Vector3(146.1,40,z),0,terrain.box).top<18.5),'崖边栈道下方被地形填成台地');
console.log('PASS 悬挑栈道保留真实下方坡面');
const plants=models.find(m=>m.data.model==='mountainGroundcover'),pose=new T.Matrix4(),point=new T.Vector3();
const pathDistance=(point,path)=>Math.min(...path.points.slice(1).map((b,i)=>{const a=path.points[i],dx=b[0]-a[0],dz=b[2]-a[2],u=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.z-a[2])*dz)/(dx*dx+dz*dz)));return Math.hypot(point.x-a[0]-dx*u,point.z-a[2]-dz*u);}));
assert(!plants.data.collision.enabled&&plants.meshes.length===3,'地被应保持三个装饰实例批次');
for(const mesh of plants.meshes) {
 const normal=mesh.geometry.attributes.normal;for(let i=0;i<normal.count;i++)assert(new T.Vector3().fromBufferAttribute(normal,i).lengthSq()>.9,'地被包含零面积三角面/无效法线');
}
for(const mesh of plants.meshes)for(let i=0;i<mesh.count;i++) {
 mesh.getMatrixAt(i,pose);point.setFromMatrixPosition(pose);assert(!plants.data.options.exclusions.some(([a,b,c,d])=>point.x>a-.65&&point.x<c+.65&&point.z>b-.65&&point.z<d+.65),'地被侵入步道/岩石');
 const y=point.y;point.add(new T.Vector3(...plants.data.position));assert(Math.abs(t.terrainSurface(point,0,terrain.box).top-y-.035)<.00001,'地被悬空/埋入坡面');
 assert(walkingPaths.every(path=>pathDistance(point,path)>=path.width/2+.69),'地被侵入自然土径');
 assert(!mesh.material.transparent&&!mesh.castShadow,'林下细叶不新增透明排序或细碎实时阴影');
}
console.log('PASS 林下地被锚定坡面/通道避让/实例化预算');
const litter=models.find(m=>m.data.model==='mountainLitter');assert(litter.meshes.length===1&&!litter.data.collision.enabled&&!litter.model.update);
const debris=litter.meshes[0],debrisVertices=debris.geometry.attributes.position;
assert(!debris.castShadow&&!debris.material.transparent);const debrisHits=[];debris.raycast(ray,debrisHits);assert.equal(debrisHits.length,0);
for(let i=0;i<debrisVertices.count;i++){const p=new T.Vector3().fromBufferAttribute(debrisVertices,i).add(new T.Vector3(...litter.data.position)),surface=t.terrainSurface(p,0,terrain.box),gap=p.y-surface.top;
 assert(gap>.01&&gap<.032,'林下碎屑贴地间隙异常');assert(walkingPaths.every(path=>pathDistance(p,path)>=path.width/2+.4),'林下碎屑侵入土径');}
console.log('PASS 林下落叶/松针实际坡面间隙/全路避让/单批次无命中');
const grass=models.find(m=>m.data.model==='mountainGrass');
assert(!grass.data.collision.enabled&&grass.meshes.length===2,'草甸只能使用两批装饰实例');
let grassCount=0,grassTriangles=0;
for(const mesh of grass.meshes) {
 const tall=mesh.name==='mountain-tall-grass',g=mesh.geometry,p=g.attributes.position,a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3();
 assert(mesh.isInstancedMesh&&!mesh.castShadow&&mesh.receiveShadow&&!mesh.material.transparent&&mesh.material.side===T.DoubleSide,'草甸新增透明排序/细叶投影');
 assert(mesh.count<=(tall?400:8500));grassCount+=mesh.count;grassTriangles+=p.count/3*mesh.count;
 for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1).sub(a);d.fromBufferAttribute(p,i+2).sub(a);assert(b.cross(d).lengthSq()>1e-10,'草叶退化三角面');}
 const hits=[];mesh.raycast(ray,hits);assert.equal(hits.length,0,'草叶遮挡射击');
 for(let i=0;i<mesh.count;i++) {
  mesh.getMatrixAt(i,pose);point.setFromMatrixPosition(pose);const local=point.clone(),world=point.clone().add(new T.Vector3(...grass.data.position)),surface=t.terrainSurface(world,0,terrain.box);
  assert(surface.top-local.y>=.03499&&surface.top-local.y<.12,'草丛根部悬空/埋深异常');
  const up=new T.Vector3(0,1,0).transformDirection(pose);assert(Math.abs(up.y-1/Math.sqrt(1+surface.slope**2))<.00001,'草丛没有贴合坡面');
  assert(!grass.data.options.exclusions.some(([a,b,c,d])=>local.x>a-.77&&local.x<c+.77&&local.z>b-.77&&local.z<d+.77),'草甸侵入岩石/短阶/木台');
  let reach=0;
  for(let j=0;j<p.count;j++) {
   point.fromBufferAttribute(p,j).applyMatrix4(pose);assert(mesh.boundingBox.containsPoint(point),'草丛包围体没有覆盖弯叶');
   if(p.getY(j)===0){const top=t.terrainSurface(point.clone().add(new T.Vector3(...grass.data.position)),0,terrain.box).top;assert(point.y<=top+.00001,'草叶基部跨网格折线后悬空');}
   assert(point.x>=-50&&point.x<=50&&point.z>=-38&&point.z<=38,'草叶越过分区边界');
   reach=Math.max(reach,Math.hypot(point.x-local.x,point.z-local.z));
  }
  assert(walkingPaths.every(path=>pathDistance(world,path)>=path.width/2+reach+.035),'弯叶/风动侵入土径');
 }
}
assert(grassCount>4000&&grassTriangles<=112000,'草甸密度/几何预算异常');
const grassResources=grass.meshes.map(m=>[m.geometry,m.material,m.instanceMatrix,m.instanceMatrix.version,m.boundingSphere.radius]);
const grassShader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <normal_fragment_begin>'};grass.meshes[0].material.onBeforeCompile(grassShader);
assert(grassShader.vertexShader.includes('smoothstep(28.,82.,range)')&&grassShader.fragmentShader.includes('normalize(grassUp)'),'草甸缺少远景过滤/稳定受光');
const grassTime=grassShader.uniforms.grassTime.value;for(let i=0;i<120;i++)grass.model.update(1/60);
assert(Math.abs(grassShader.uniforms.grassTime.value-grassTime-2)<.00001,'风动时间没有推进');
for(let i=0;i<grass.meshes.length;i++){const m=grass.meshes[i],r=grassResources[i];assert(m.geometry===r[0]&&m.material===r[1]&&m.instanceMatrix===r[2]&&m.instanceMatrix.version===r[3]&&m.boundingSphere.radius===r[4],'草甸逐帧重建资源/更新实例缓冲');}
console.log('PASS 短草/长草坡面锚定与避让, 不透明曲叶/风动/远景过滤和预算');
const woodland=models.find(m=>m.data.model==='mountainWoodland'),trees=woodland.data.options.trees;
assert(trees.length>=20&&trees.length<=28,'林群预算异常');assert(new Set(trees.map(t=>t.kind)).size===2,'林群缺少高松/阔叶变化');
for(const tree of trees){const [x,y,z]=tree.position.map((v,i)=>v+woodland.data.position[i]),s=tree.scale;
 const low=Math.min(...[-.22,0,.22].flatMap(a=>[-.22,0,.22].map(b=>t.terrainSurface(new T.Vector3(x+a*s,40,z+b*s),0,terrain.box).top)));
 assert(y<=low+.001&&low-y<.4,'树干根部悬空/深埋');assert(walkingPaths.every(path=>pathDistance(new T.Vector3(x,y,z),path)>=path.width/2+1.24),'树干侵入自然土径');
 ray.set(new T.Vector3(x+1,y+s,z),new T.Vector3(-1,0,0));ray.far=1.2;assert(ray.intersectObject(woodland.model.root,true)[0],'树干缺少真实射击表面');
}
const leafMeshes=woodland.meshes.filter(m=>m.isInstancedMesh),baseLeaves=leafMeshes.filter(m=>m.name==='mountain-canopy'),detailLeaves=leafMeshes.filter(m=>m.name==='mountain-canopy-detail');
const fullLeaves=leafMeshes.reduce((sum,m)=>sum+m.count,0),baseCount=baseLeaves.reduce((sum,m)=>sum+m.count,0);
assert(fullLeaves*2<55000&&baseCount>10000,'新林群叶片预算或轮廓保留量不符');
const resources=detailLeaves.map(m=>[m.instanceMatrix,m.geometry,m.material,m.boundingSphere.radius]);
for(let i=0;i<180;i++)woodland.model.update(1/60,{player:{position:new T.Vector3(800,30,800)}});
assert(detailLeaves.reduce((n,m)=>n+m.count,0)<5,'远处细叶未减量');assert.equal(baseLeaves.reduce((n,m)=>n+m.count,0),baseCount,'远处树冠主体消失');
// 返回近处也只增加同一缓冲的实例数量, 不能把树冠恢复过程留在零叶片状态.
const firstDetail=detailLeaves[0],nearPoint=firstDetail.boundingSphere.center.clone().add(new T.Vector3(...woodland.data.position));
for(let i=0;i<180;i++)woodland.model.update(1/60,{player:{position:nearPoint}});
assert(firstDetail.count>firstDetail.instanceMatrix.count*.99,'近处细叶未恢复');
for(let i=0;i<detailLeaves.length;i++){const m=detailLeaves[i],r=resources[i];assert(m.instanceMatrix===r[0]&&m.geometry===r[1]&&m.material===r[2]&&m.boundingSphere.radius===r[3],'距离切换重建资源/改变包围体');}
for(const m of leafMeshes){assert(!m.material.transparent&&m.material.alphaToCoverage&&m.material.map.generateMipmaps);const pixels=m.material.map.image.data;
 for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]===0)assert(pixels[i]>0&&pixels[i+1]>0,'透明叶边为黑色');
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <normal_fragment_begin>\n#include <alphatest_fragment>'};m.material.onBeforeCompile(shader);
 assert(shader.uniforms.leafCoverage&&shader.fragmentShader.includes('fwidth')&&shader.fragmentShader.includes('discard')&&shader.vertexShader.includes('normalMatrix')&&shader.fragmentShader.includes('normalize(canopyUp)'),'覆盖率/硬裁切回退缺失');
}
const trunk=woodland.meshes.find(m=>m.name==='mountain-tree-trunks');
for(const transformed of [false,true]) {
 if(transformed){woodland.model.root.rotation.y=.37;woodland.model.root.scale.set(1.1,.93,1.2);woodland.model.root.updateWorldMatrix(true,true);}
 for(const tree of trees){const target=new T.Vector3(tree.position[0],tree.position[1]+tree.scale,tree.position[2]).applyMatrix4(woodland.model.root.matrixWorld);
  for(const axis of [new T.Vector3(1,0,0),new T.Vector3(0,0,1)]){
   ray.set(target.clone().addScaledVector(axis,4),axis.clone().negate());ray.far=8;
   const actual=ray.intersectObject(trunk),reference=[];T.Mesh.prototype.raycast.call(trunk,ray,reference);reference.sort((a,b)=>a.distance-b.distance);
   assert.equal(actual.length,reference.length,'树干分范围检测遗漏/重复命中');
   actual.forEach((hit,i)=>{assert(hit.object===trunk&&hit.faceIndex===reference[i].faceIndex&&hit.point.distanceTo(reference[i].point)<1e-7,'树干实际命中点/面编号偏离');assert(hit.face.normal.distanceTo(reference[i].face.normal)<1e-7);});
  }
 }
}
woodland.model.root.rotation.y=0;woodland.model.root.scale.set(1,1,1);woodland.model.root.updateWorldMatrix(true,true);
console.log('PASS 树干分树剔除与原始射线命中/法线/面编号一致, 含旋转缩放');
console.log('PASS 混合林树根/树干命中/稳定树冠, 距离减叶不重建缓冲 '+JSON.stringify({trees:trees.length,nearLeafTriangles:fullLeaves*2,farLeafTriangles:baseCount*2,meshes:woodland.meshes.length}));
for(const rail of routes.rails){const a=new T.Vector3(...rail.a),delta=new T.Vector3(...rail.b).sub(a),normal=new T.Vector3(-delta.z,0,delta.x).normalize();ray.far=.25;
 for(const q of [0,.25,.5,.75,1])for(const lift of [.55,1.04]){const p=a.clone().addScaledVector(delta,q);p.y+=lift;ray.set(p.addScaledVector(normal,.12),normal.clone().negate());assert(ray.intersectObject(access.model.root,true)[0],'栏杆断开 '+JSON.stringify(rail));}}
console.log('PASS 山径/山顶/栈道双横栏连续性');
for(const cover of routes.cover) {
 const [w,h,d]=cover.size,p=new T.Vector3(...cover.position),normal=new T.Vector3(w>d?0:1,0,w>d?1:0);
 p.y+=h*.7;ray.far=1;ray.set(p.clone().addScaledVector(normal,.7),normal.clone().negate());
 assert(ray.intersectObject(access.model.root,true)[0],'掩体只有碰撞, 缺少可见实面');
 const body=new T.Vector3(...cover.position);select([body.toArray()]);assert(t.blockedAt(body,.32,1.75,[]),'掩体缺少身体阻挡');
}
console.log('PASS 山顶木屏实面/身体阻挡');
const rocks=models.find(m=>m.data.model==='mountainRocks');
const sampleGeometry=new T.IcosahedronGeometry(1,3),stoneVertices=sampleGeometry.attributes.position.count;sampleGeometry.dispose();
for(let j=0;j<rocks.data.options.stones.length;j++) {
 const p=rocks.meshes[0].geometry.attributes.position;let lowest=j*stoneVertices;
 for(let i=lowest;i<(j+1)*stoneVertices;i++)if(p.getY(i)<p.getY(lowest))lowest=i;
 const bottom=new T.Vector3().fromBufferAttribute(p,lowest).add(new T.Vector3(...rocks.data.position));
 assert(bottom.y<t.terrainSurface(bottom,0,terrain.box).top-.08,'景石底部悬空 '+j);
}
assert.equal(routes.nodes.length,2);
for(const node of routes.nodes){const path=walkingPaths.find(p=>p.id===node.path),center=new T.Vector3(...node.position);
 assert(pathDistance(center,path)<.1,'战斗节点没有接到真实路线');
 select([center.toArray()]);spawn([center.x,center.y+.3,center.z]);assert(!t.blockedAt(t.player.position,.32,1.75,[]),'节点脚下或身体卡住');
 assert(rocks.data.options.stones[node.rock],'节点缺少实体自然掩体');
}
// 站立的岔路节点不能被山顶三个常用观察点直接通视, 保留换线/重整的窗口.
for(const node of routes.nodes)for(const lookout of [[133,28.05,137],[129,28.05,135],[139,28.05,137]]) {
 const from=new T.Vector3(...node.position);from.y=walkSupport(node.position)+1.65;
 const direction=new T.Vector3(...lookout).sub(from);ray.far=direction.length()-.03;ray.set(from,direction.normalize());
 assert(ray.intersectObjects(naturalRoots,true).length>0,'岔路节点缺少对山顶的自然遮挡 '+node.id);
}
console.log('PASS 两处岔路战斗节点接入可走坡面/自然岩层掩体');
console.log('PASS '+rocks.data.options.stones.length+' 处岩脊/掩体底部嵌入实际坡面');
assert(rocks.data.options.scree.length>30,'岩层缺少碎石过渡');
const rubbleGeometry=new T.IcosahedronGeometry(1,0),rubbleVertices=rubbleGeometry.attributes.position.count;rubbleGeometry.dispose();
for(let j=0;j<rocks.data.options.scree.length;j++){const p=rocks.meshes[0].geometry.attributes.position,start=rocks.data.options.stones.length*stoneVertices+j*rubbleVertices;let clearance=Infinity;
 for(let i=start;i<start+rubbleVertices;i++){const point=new T.Vector3().fromBufferAttribute(p,i).add(new T.Vector3(...rocks.data.position));clearance=Math.min(clearance,point.y-t.terrainSurface(point,0,terrain.box).top);}
 assert(clearance<0,'坡脚碎石悬空 '+j);
}
assert(!rocks.data.options.arch,'自然山径不保留人工拱门轮廓');
vm.runInContext(read('models/vertical-ladder.js'),c);const ladderData=district.find(i=>i.model==='verticalLadder');const ladderModel=t.createInstance({...ladderData,id:'ladder-control-check'});
for(const route of t.ladders){select([route.bottom.toArray(),route.exit.toArray()]);t.solid.push(...t.solid.filter(s=>s.id==='ladder-control-check'));
 t.player.position.copy(route.line).addScaledVector(route.normal,.15);Object.assign(t.player.body,{ladder:null,nearLadder:null,climbCooldown:0,ladderTop:false,vy:0,grounded:false});t.face(route.normal);t.keys.clear();for(let i=0;i<5;i++)t.fall(t.player.body,1/60);
 for(const key of ['KeyW','KeyS']){t.keys.clear();t.keys.add(key);let frame=0;do{t.updatePlayer(1/60);assert(!t.blockedAt(t.player.position,.32,1.75,[]),'梯口阻挡');}while(t.player.body.ladder&&++frame<800);assert(frame>5&&frame<800,'梯子挂接/出口错误');t.keys.clear();for(let i=0;i<4;i++)t.updatePlayer(1/60);
 if(key==='KeyW')assert(t.player.position.distanceTo(route.exit)<.03&&t.player.body.grounded,'梯顶无支撑');else assert(Math.abs(t.player.position.y-route.bottom.y)<.03&&t.player.body.grounded,'梯底无支撑');}
 console.log('PASS 岩壁竖梯上下/出口 '+route.top.y);}
// 通用高度场独立检查: 旋转/缩放, 连续缓坡, 陡坡限制及错误隔离.
function field(id,heights,maxSlope=.55){return {id,model:'collisionOnly',position:[300,0,300],rotation:[0,Math.PI/2,0],scale:[2,1.5,1],collision:{enabled:true,boxes:[{size:[8,5,8],offset:[0,1.5,0],heightfield:{columns:3,rows:3,heights,maxSlope}}]}};}
const sample=t.createInstance(field('field-fixture',[0,1,2,0,1,2,0,1,2]));const f=t.solid.at(-1).box;
assert(Math.abs(t.terrainSurface(new T.Vector3(300,10,300),0,f).top-1.5)<.00001);
assert(Math.abs(t.terrainSurface(new T.Vector3(300,10,296),0,f).top-2.25)<.00001);
t.solid.splice(0,t.solid.length,{box:f,root:sample.root});spawn([300,1.7,305]);walk([300,t.terrainSurface(new T.Vector3(300,0,295),.32,f).top,295]);
const count=t.entries.length;assert.throws(()=>t.createInstance(field('field-invalid',[0,NaN,2])),/高度场/);assert.equal(t.entries.length,count);
const steep=t.createInstance(field('field-steep',[0,1,2,0,1,2,0,1,2],.1));t.solid.splice(0,t.solid.length,t.solid.at(-1));
for(const dt of [1/60,1/240]){spawn([300,1.7,305]);const start=t.player.position.z;for(let i=0;i<90;i++){t.move(t.player,0,-4.7*dt);t.fall(t.player.body,dt);}assert(start-t.player.position.z<.3,'陡坡可直接登顶');}
assert.throws(()=>t.createInstance({...field('field-tilted',[0,1,2,0,1,2,0,1,2]),rotation:[.2,0,0]}),/直立/);
const defaults=vm.createContext({FPS:{models:{}},document});vm.runInContext(read('models/coastal-mountain.js'),defaults);const defaultMountain=defaults.FPS.models.coastalMountain(T);assert(defaultMountain.root.children.some(n=>n.isMesh));defaultMountain.dispose();
select([[169,28,150],[171,28,150]]);t.player.position.set(169,28,150);t.move(t.player,2,0);assert(t.player.position.x<169.3,'从制高点可跃出地图边界');
document.body={dataset:{}};
vm.runInContext(`let ready=true,mode='playing',firing=false,helpers=[];
 function updateHUD(){} function updateBodyWireframes(){} function tell(){}
 ${html.slice(html.indexOf('function separateBodies()'),html.indexOf('function updateBodyWireframes()'))}
 ${html.slice(html.indexOf('function dispose(root)'),html.indexOf('const disabledEffects'))}
 ${html.slice(html.indexOf('function toggleDebug()'),html.indexOf('function updatePlayer(dt)'))}
 globalThis.debugControl={toggleDebug,get helpers(){return helpers;}};`,c);
t.solid.splice(0,t.solid.length,terrain);t.player.position.set(126,0,130);t.player.position.y=t.terrainSurface(t.player.position,.32,terrain.box).top+.05;
const original=t.player.position.clone();t.player.debug=true;c.debugControl.toggleDebug();assert(!t.player.debug&&t.player.position.distanceTo(original)<.001,'退出调试错误地回出生点');
c.debugControl.toggleDebug();assert(c.debugControl.helpers[0].geometry.attributes.position.count>101*77,'高度场调试仍显示包围盒');
let disposed=0;c.debugControl.helpers[0].geometry.addEventListener('dispose',()=>disposed++);c.debugControl.toggleDebug();assert.equal(disposed,1);assert.equal(c.debugControl.helpers.length,0);
console.log('PASS 山坡调试退出/实际网格线框与释放');
// 真实三角面命中区分软硬表面, 装饰实例不屏蔽土面; 私有纹理随模块卸载释放.
for(const [target,p,soft] of [[mountain,[76,40,85],true],[rocks,[119,40,132],false],[access,[133,40,138],false]]) {
 ray.far=50;ray.set(new T.Vector3(...p),new T.Vector3(0,-1,0));const hit=ray.intersectObject(target.model.root,true)[0];assert(hit,'命中缺少实际表面');
 const reply=target.model.onHit?.(hit)??{};assert.equal(reply.surface==='soil',soft);assert.equal(reply.bulletmark===false,soft);
}
for(const mesh of detailLeaves)mesh.count=mesh.instanceMatrix.count;
// 复用的竖梯也属于山区, 与其他模型一起统计预算及验证卸载, 不遗漏共享模型实例.
const ladderMeshes=[];ladderModel.root.traverse(mesh=>{if(mesh.isMesh)ladderMeshes.push(mesh);});
models.push({data:ladderData,model:ladderModel,meshes:ladderMeshes});
assert.equal(models.filter(m=>m.data.id.startsWith('mountain-')).length,district.length,'山区预算遗漏了场景实例');
const totals={meshes:0,triangles:0,plants:0,collisionParts:allSolids.filter(s=>s.id.startsWith('mountain-')).length};
for(const {data,model,meshes}of models) {
 const textures=new Set(),geometries=new Set(),materials=new Set();
 for(const mesh of meshes){geometries.add(mesh.geometry);materials.add(mesh.material);for(const value of Object.values(mesh.material))if(value?.isTexture)textures.add(value);
  if(data.id.startsWith('mountain-')){totals.meshes++;totals.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);if(data.model==='mountainGroundcover')totals.plants+=mesh.count;}}
 const released=new Map();for(const resource of [...textures,...geometries,...materials]){released.set(resource,0);resource.addEventListener('dispose',()=>released.set(resource,released.get(resource)+1));}
 model.dispose?.();assert([...textures].every(tex=>released.get(tex)===1),data.id+' 私有纹理未释放/重复释放');
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());assert([...released.values()].every(n=>n===1),data.id+' 模块卸载资源释放错误');
}
assert(totals.meshes<=37&&totals.triangles<260000&&totals.plants>200,'山体静态预算/植被数量异常 '+JSON.stringify(totals));
console.log('PASS 软硬命中/模块资源释放与完整山区静态预算(含竖梯) '+JSON.stringify(totals));
console.log('PASS 高度场变换/缓坡/陡坡/错误隔离与小山回归完成');
