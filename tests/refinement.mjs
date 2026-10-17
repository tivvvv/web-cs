// 纯 Node 精细化回归. 检查实际叶面拓扑/结构净空/资源与合批, 不启动浏览器或 GPU.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const document={createElement(){const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})};for(const n of ['save','restore','putImageData','setTransform','beginPath','moveTo','lineTo','arc','fill','stroke','fillRect','strokeRect','rect','clip','closePath','bezierCurveTo','quadraticCurveTo','fillText'])ctx[n]=()=>{};return {width:1,height:1,getContext:()=>ctx};}};
const c=vm.createContext({FPS:{models:{}},window:{},document,AbortController});vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const T=c.THREE,layout=c.window.FPS_LAYOUT,loaded=new Set();
for(const data of layout.instances)for(const b of data.collision.boxes??[])assert(b.size.every(n=>Number.isFinite(n)&&n>0)&&b.offset.every(Number.isFinite),'碰撞规格无效 '+data.id);
function model(name,options){if(!loaded.has(name)){vm.runInContext(read(layout.catalog[name]),c);loaded.add(name);}return c.FPS.models[name](T,options);}
function release(m){m.dispose?.();m.dispose?.();const geometries=new Set(),materials=new Set();m.root.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);for(const material of [n.material].flat())materials.add(material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
function valid(m){let triangles=0;const a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3();m.root.traverse(n=>{if(!n.isMesh)return;const g=n.geometry,p=g.attributes.position,index=g.index;for(const attribute of Object.values(g.attributes))assert(attribute.array.every(Number.isFinite));for(let i=0;i<(index?.count??p.count);i+=3){a.fromBufferAttribute(p,index?index.getX(i):i);b.fromBufferAttribute(p,index?index.getX(i+1):i+1).sub(a);d.fromBufferAttribute(p,index?index.getX(i+2):i+2).sub(a);assert(b.cross(d).lengthSq()>1e-20,'退化三角面');}triangles+=(index?.count??p.count)/3*(n.count??1);});return triangles;}
for(const kind of ['hubGrass','mountainGrass']){
 const m=model(kind,{soil:[[-5,-5,5,5]],maxShort:100,maxTall:20,tallDensity:1});valid(m);assert(m.root.children.length);
 for(const mesh of m.root.children){const g=mesh.geometry;assert(g.index,'曲叶未共享顶点');assert(g.attributes.position.count/g.index.count<=.56,'曲叶顶点复用不足');if(kind==='hubGrass')assert.equal(new Set(Array.from(g.attributes.hubBlade.array)).size,mesh.name.includes('tall')?7:5);}
 release(m);
}
console.log('PASS 曲叶共享节点/原叶数与真实非退化曲面/顶点与实例缓冲');

const bike=model('hubFixtures',{benches:[],bikeRacks:[{position:[0,0,0],bike:true}]}),rubber=bike.root.children.find(n=>n.name==='hub-rubber-insets').geometry.attributes.position;
valid(bike);const wheel=Array.from({length:720},(_,i)=>new T.Vector3().fromBufferAttribute(rubber,i));
assert(new Set(wheel.map(p=>Math.round(Math.atan2(p.y-.365,p.z-.55)*1e4))).size>=24,'车轮圆周细分不足');
assert(Math.abs(Math.min(...wheel.map(p=>p.y)))<1e-5,'细分后轮胎没有接地');release(bike);
console.log('PASS 自行车轮胎圆周与接地/完整把手和制动手柄');

const ray=new T.Raycaster();
for(const yaw of [0,Math.PI/2,-Math.PI/2]){
 const position=[3,2.4,-2],size=[.48,.96,.42],m=model('hubFixtures',{benches:[],services:[{kind:'bin',position,size,yaw}]}),up=new T.Vector3(0,1,0);
 valid(m);m.root.updateMatrixWorld(true);const origin=new T.Vector3(0,size[1]*.8,-size[2]/2-.1).applyAxisAngle(up,yaw).add(new T.Vector3(...position)),direction=new T.Vector3(0,0,1).applyAxisAngle(up,yaw);
 ray.set(origin,direction);ray.far=.6;assert(ray.intersectObject(m.root,true)[0]?.distance>.48,'投口随朝向封闭/位置变换错误');release(m);
}
console.log('PASS 设施三种朝向/真实投口空隙与平移');

const maintenanceOptions=layout.instances.find(i=>i.model==='hubMaintenance').options,maintenance=model('hubMaintenance',maintenanceOptions);valid(maintenance);assert.equal(maintenance.root.children.length,3);release(maintenance);console.log('PASS 维护台工具箱完整薄体与三批合并');

const visitorOptions=layout.instances.find(i=>i.model==='visitorCenter').options,visitor=model('visitorCenter',visitorOptions);valid(visitor);visitor.root.updateMatrixWorld(true);const shelf=visitorOptions.interior.find(i=>i.size[1]>1.3),[sx,sy,sz]=shelf.offset;ray.set(new T.Vector3(sx,sy+.37,sz-shelf.size[2]/2-.2),new T.Vector3(0,0,1));ray.far=.3;assert.equal(ray.intersectObject(visitor.root,true).length,0,'资料架层间仍是实心封板');const plaster=visitor.root.children.find(n=>n.name==='visitor-plaster').material;assert(plaster.roughnessMap===plaster.bumpMap);assert(plaster.roughnessMap.image.data.some((v,i,a)=>i%4===1&&v!==a[i-1]));release(visitor);console.log('PASS 游客室真实开放资料架/独立灰泥粗糙度通道与原六批合并');

const workshop=model('hubActivity',{sites:[{kind:'workshop',position:[0,0,0]}]});valid(workshop);assert.equal(workshop.root.children.length,4);release(workshop);console.log('PASS 工坊连续绕线/封闭端面与四批合并');

const stacker=model('portReachstacker'),steelMesh=stacker.root.children[2],sp=steelMesh.geometry.attributes.position;valid(stacker);let pivot=0;
for(let i=0;i<sp.count;i+=3)if([0,1,2].every(j=>Math.abs(sp.getX(i+j))<=.75001&&sp.getY(i+j)>=1.90999&&sp.getY(i+j)<=2.33001&&sp.getZ(i+j)>=.83999&&sp.getZ(i+j)<=1.26001))pivot++;
assert.equal(pivot,64,'正面吊铰轴存在重复几何');assert.equal(stacker.root.children.length,5);release(stacker);console.log('PASS 正面吊重复铰轴消除/完整雨刷与镜片/五批合并');

for(const trailer of [false,true]){const tractor=model('portTerminalTractor',{trailer});valid(tractor);assert.equal(tractor.root.children.length,5);release(tractor);}console.log('PASS 牵引车雨刷/镜杆镜片/尾灯及有无挂车装配');

const forklift=model('portForklift');assert(valid(forklift)<6000);assert.equal(forklift.root.children.length,4);release(forklift);console.log('PASS 叉车镜片/液压握柄/座椅约束带及6000面预算');

const cargo=model('cargoContainer',{units:[{position:[0,0,0],length:6}]});valid(cargo);const codes=cargo.root.children.find(n=>n.name==='cargo-print').geometry.attributes.cargoPrint;assert(codes.array.some((v,i)=>i%3===2&&v>=4),'箱门编号没有集成到真实波纹面');assert.equal(cargo.root.children.length,3);release(cargo);console.log('PASS 集装箱端门编号/侧面品牌共享图集与三网格合批');

const ship=model('cargoShip');assert(valid(ship)<18000,'货轮货柜波纹预算过高');assert.equal(ship.root.children.length,3);release(ship);console.log('PASS 货轮连续闭合波纹/非退化盖口/三批合并与18000面预算');

const workarea=model('portCargoWorkarea',{racks:[],loads:[{position:[0,0,0],kind:'wrapped',size:[1.2,1.4,1]}]});assert(valid(workarea)<500,'缠膜仍堆叠重复薄条');assert(workarea.root.children.some(m=>m.geometry.attributes.wrapFilm?.array.some(v=>v===1)));release(workarea);console.log('PASS 包装缠膜标记/实体包络与低几何预算');

const scope=model('trailFacilities',{weathered:true,scopes:[{position:[0,0,0]}]});valid(scope);scope.root.updateMatrixWorld(true);ray.set(new T.Vector3(.4,1.15,-.04),new T.Vector3(-1,0,0));ray.far=.3;const slot=ray.intersectObject(scope.root,true)[0];assert(slot&&Math.abs(slot.point.x-.283)<1e-5,'投币口仍被前盖封闭');release(scope);console.log('PASS 望远镜真实投币凹槽/连接座/焦距旋钮与镜筒');

const trail=model('mountainTrails',{boxes:[{kind:'wood',size:[3,.2,2],offset:[0,.1,0]},{kind:'stone',size:[2,.2,.4],offset:[0,.1,3]}]});valid(trail);assert(trail.root.children.length<=3);release(trail);console.log('PASS 栈道齐平紧固件纹理/石阶色差与原网格预算');

for(const name of ['portForklift','portReachstacker','portTerminalTractor','portCargoWorkarea','cargoShip','mountainTrails','trailFacilities']){
 const options=name==='mountainTrails'?{boxes:[{kind:'wood',size:[3,.2,2],offset:[0,.1,0]},{kind:'stone',size:[2,.2,.4],offset:[0,.1,3]}]}:layout.instances.find(i=>i.model===name)?.options,m=model(name,options),textures=new Set(),counts=new Map();
 m.root.traverse(n=>{if(n.isMesh)for(const material of [n.material].flat())for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
 for(const texture of textures){counts.set(texture,0);texture.addEventListener('dispose',()=>counts.set(texture,counts.get(texture)+1));}
 m.dispose();m.dispose();assert(textures.size>0);for(const count of counts.values())assert.equal(count,1,name+' 私有纹理重复或遗漏释放');release(m);
}
console.log('PASS 七类码头/山区模型共享贴图引用仅释放一次');
