// 山区近景几何检查. 小规格直接调用独立工厂, 不启动浏览器或 GPU.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const document={createElement(){const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(p){this.pixels=p;}};
  for(const name of ['setTransform','fillRect','fillText','beginPath','moveTo','lineTo','stroke'])ctx[name]=()=>{};
  return {width:1,height:1,getContext:()=>ctx,ctx};}};
const context=vm.createContext({FPS:{models:{}},document,AbortController});vm.runInContext(read('vendor/three.min.js'),context);
const T=context.THREE;
function create(name,file,options){vm.runInContext(read('models/'+file+'.js'),context);return context.FPS.models[name](T,options);}
function release(model){const geometries=new Set(),materials=new Set();model.root.traverse(m=>{if(m.isMesh){geometries.add(m.geometry);materials.add(m.material);}});model.dispose?.();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
const field={bounds:[-4,-4,4,4],columns:3,rows:3,heights:[3,3,3,3,3.6,3,3,3,3],spacing:.35,maxShort:400,maxTall:0};
function height(x,z){const u=Math.max(0,Math.min(2,(x+4)/4)),v=Math.max(0,Math.min(2,(z+4)/4)),i=Math.min(1,Math.floor(u)),j=Math.min(1,Math.floor(v)),a=u-i,b=v-j,k=j*3+i,h=field.heights;
 return a+b<=1?h[k]+a*(h[k+1]-h[k])+b*(h[k+3]-h[k]):h[k+4]+(a-1)*(h[k+4]-h[k+3])+(b-1)*(h[k+4]-h[k+1]);}
const grass=create('mountainGrass','mountain-grass',field),matrix=new T.Matrix4(),point=new T.Vector3();let roots=0;
for(const mesh of grass.root.children){const p=mesh.geometry.attributes.position;
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);for(let j=0;j<p.count;j++)if(p.getY(j)===0){point.fromBufferAttribute(p,j).applyMatrix4(matrix);assert(point.y<=height(point.x,point.z)+1e-6,'跨坡面折线的叶基悬空 '+JSON.stringify({point:point.toArray(),height:height(point.x,point.z),instance:i}));roots++;}}}
assert(roots>100);release(grass);
const clear=create('mountainGrass','mountain-grass',{...field,soilPatches:[{center:[0,0],radius:[10,10],strength:1}]}),clearCount=clear.root.children.reduce((n,m)=>n+m.count,0);
assert(clearCount<50,'裸土斑块没有减少草密度');release(clear);
console.log('PASS 草根跨坡面折线接触/裸土覆盖密度');
const litter=create('mountainLitter','mountain-litter',{...field,trees:[{position:[0,3.6,0],kind:'pine'},{position:[1,3.45,1],kind:'broadleaf'}]});
assert.equal(litter.root.children.length,1);const debris=litter.root.children[0],vertices=debris.geometry.attributes.position;
assert(!debris.castShadow&&!debris.material.transparent&&!litter.update);
for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i);assert(point.y>height(point.x,point.z)+.008,'林下碎屑与坡面重叠');}
const hits=[];debris.raycast(new T.Raycaster(),hits);assert.equal(hits.length,0);release(litter);
console.log('PASS 林下碎屑贴地/单批次/无命中或更新');
const rock=create('mountainRocks','mountain-rocks',{stones:[{position:[0,2,0],size:[7,5,4]}]}),rockMesh=rock.root.children[0],rockGeometry=rockMesh.geometry;
rockGeometry.computeBoundingBox();const extent=rockGeometry.boundingBox.getSize(new T.Vector3());assert(extent.distanceTo(new T.Vector3(7,5,4))<1e-5,'岩石风化改变碰撞规格');
const rp=rockGeometry.attributes.position,rn=rockGeometry.attributes.normal;let smooth=0,hard=0;
for(let i=0;i<rp.count;i+=3){const a=new T.Vector3().fromBufferAttribute(rp,i),b=new T.Vector3().fromBufferAttribute(rp,i+1).sub(a),c=new T.Vector3().fromBufferAttribute(rp,i+2).sub(a),face=b.cross(c).normalize();
 for(let j=i;j<i+3;j++){const normal=new T.Vector3().fromBufferAttribute(rn,j);assert(Math.abs(normal.length()-1)<1e-5);normal.dot(face)<.999?smooth++:hard++;}}
assert(smooth>100&&hard>0,'岩石应同时保留平滑风化和断面折角');
const rc=rockGeometry.attributes.color;let lower=0,upper=0,nl=0,nu=0;for(let i=0;i<rp.count;i++){if(rp.getY(i)<3){lower+=rc.getY(i);nl++;}if(rp.getY(i)>6){upper+=rc.getY(i);nu++;}}assert(lower/nl<upper/nu,'坡脚没有形成泥土接触色');
assert(rockMesh.material.bumpScale<.03&&rockMesh.material.bumpMap.generateMipmaps);release(rock);
console.log('PASS 岩石受光平滑/断面折角/外形尺寸');
const woods=create('mountainWoodland','mountain-woodland',{trees:[{position:[-2,3,-2],kind:'pine',scale:1,seed:73},{position:[2,3,2],kind:'broadleaf',scale:1,seed:91}]}),canopies=woods.root.children.filter(m=>m.isInstancedMesh);
assert.equal(canopies.reduce((n,m)=>n+m.count,0),1550,'树冠迭代增加叶片预算');assert(canopies.every(m=>Number.isFinite(m.boundingSphere.radius)));
woods.root.updateWorldMatrix(true,true);const trunk=woods.root.children.find(m=>m.name==='mountain-tree-trunks'),ray=new T.Raycaster(new T.Vector3(-1,4,-2),new T.Vector3(-1,0,0),0,2),actual=ray.intersectObject(trunk),reference=[];
T.Mesh.prototype.raycast.call(trunk,ray,reference);assert(actual.length>0&&actual.length===reference.length,'树冠改形损坏树干射线范围');
for(let i=0;i<180;i++)woods.update(1/60,{player:{position:new T.Vector3(800,30,800)}});
assert(canopies.filter(m=>m.name==='mountain-canopy-detail').every(m=>m.count===0));release(woods);
console.log('PASS 混合林叶片预算/树干命中/远处细叶减量');
const plants=create('mountainGroundcover','mountain-groundcover',{...field,zones:['fern','scrub','flower'].map(kind=>({kind,center:[0,0],radius:2,count:10}))});
assert.equal(plants.root.children.length,3);for(const m of plants.root.children){assert(m.instanceColor&&m.instanceColor.array.every(Number.isFinite));const n=m.geometry.attributes.normal;
for(let i=0;i<n.count;i++)assert(new T.Vector3().fromBufferAttribute(n,i).lengthSq()>.99,'地被叶片退化');}
const fern=plants.root.children.find(m=>m.name==='mountain-fern').geometry.attributes.position;let outer=0,mid=0;
for(let i=0;i<fern.count;i++){const r=Math.hypot(fern.getX(i),fern.getZ(i));if(r>.43)outer=Math.max(outer,fern.getY(i));if(r>.22&&r<.38)mid=Math.max(mid,fern.getY(i));}
assert(outer<mid,'蕨叶外端没有自然下垂');release(plants);
console.log('PASS 蕨叶下垂/三类地被无退化/实例颜色');
const trail=create('mountainTrails','mountain-trails',{boxes:[{size:[3,.65,.5],offset:[0,3,0],kind:'stone'},{size:[2,.18,3],offset:[0,4,0],kind:'wood'}]});
assert.equal(trail.root.children.length,2);for(const mesh of trail.root.children){const g=mesh.geometry;g.computeBoundingBox();assert(g.attributes.position.count===132,'倒角拓扑/预算异常');const p=g.attributes.position,n=g.attributes.normal;
for(let i=0;i<p.count;i++)assert(new T.Vector3().fromBufferAttribute(n,i).lengthSq()>.99,'倒角退化');
const size=g.boundingBox.getSize(new T.Vector3()),stone=g.boundingBox.max.y<4;assert(size.distanceTo(new T.Vector3(...(stone?[3,.65,.5]:[2,.18,3])))<1e-5,'倒角改变实体外尺寸');}
release(trail);console.log('PASS 石阶/木台倒角拓扑/实面尺寸/几何预算');
const anchorTrail=create('mountainTrails','mountain-trails',{boxes:[{size:[2,.18,2],offset:[0,.91,0],kind:'wood'}],beams:[{a:[1,1.035,1],b:[1,2.07,1],radius:.04}]}),railMetal=anchorTrail.root.children.find(m=>!m.material.map);
const ap=railMetal.geometry.attributes.position;let heads=0;
for(let i=0;i<ap.count;i++)if(ap.getY(i)>1.038&&ap.getY(i)<1.05&&ap.getX(i)>.9&&ap.getZ(i)>.9){assert(ap.getX(i)<1&&ap.getZ(i)<1,'转角柱螺栓悬在平台外');heads++;}
assert(heads>20,'转角脚座缺少板内固定件');assert.equal(railMetal.geometry.attributes.position.count/3,32+12+48,'栏柱细节增加材质/几何预算');release(anchorTrail);
console.log('PASS 栈道转角脚座/螺栓实际板内固定/单金属批次');
const amenities={shelters:[{position:[0,0,0],width:4.2,depth:2.8,height:2.55,kind:'lookout',roofPitch:.24}],scopes:[{position:[5,0,0]}]},plain=create('trailFacilities','trail-facilities',amenities),detailed=create('trailFacilities','trail-facilities',{...amenities,weathered:true});
assert.equal(plain.root.children.length,4);assert.equal(detailed.root.children.length,5,'望远镜镜片应只加一个材质批次');
const glass=detailed.root.children.find(m=>m.name==='mountain-scope-glass');assert(glass&&!glass.material.transparent&&!glass.castShadow&&!glass.material.transmission,'观海镜片不增加透明排序/折射或碎片阴影');
assert(glass.material.isMeshPhysicalMaterial&&glass.material.clearcoat===1&&glass.material.roughness>=.1,'镜片使用曲面与环境反光');
// 从物镜/目镜沿各自光轴接近, 第一处命中必须是玻璃; 旧闭筒端盖会遮住目镜.
detailed.root.position.set(8,2,5);detailed.root.rotation.y=.37;detailed.root.updateWorldMatrix(true,true);
for(const yaw of [0,Math.PI/2,Math.PI]) {
 const optics=create('trailFacilities','trail-facilities',{weathered:true,scopes:[{position:[5,0,0],yaw}]});optics.root.position.copy(detailed.root.position);optics.root.rotation.copy(detailed.root.rotation);optics.root.updateWorldMatrix(true,true);
 for(const x of [-.16,.16])for(const side of [-1,1])for(const across of [0,.035]) {
  const angle=Math.PI/2-.13,axis=new T.Vector3(0,Math.cos(angle),Math.sin(angle)),scope=new T.Matrix4().makeRotationY(yaw);
  const center=new T.Vector3(x+across,1.38,-.1).applyMatrix4(scope).add(new T.Vector3(5,0,0)).applyMatrix4(optics.root.matrixWorld);
  axis.transformDirection(scope).transformDirection(optics.root.matrixWorld).multiplyScalar(side);
  const ray=new T.Raycaster(center.clone().addScaledVector(axis,.8),axis.clone().negate(),0,.8),hit=ray.intersectObject(optics.root,true)[0];
  assert(hit?.object.name==='mountain-scope-glass','转向后镜片被端盖/镜框遮挡 '+JSON.stringify({yaw,x,side,across}));
  assert(hit.distance>.51&&hit.distance<.53,'镜片没有保持镜框内的弧面与留深');
 }
 release(optics);
}
const lp=glass.geometry.attributes.position,ln=glass.geometry.attributes.normal;let curve=0;
for(let i=0;i<lp.count;i+=3){const a=new T.Vector3().fromBufferAttribute(lp,i),b=new T.Vector3().fromBufferAttribute(lp,i+1).sub(a),c=new T.Vector3().fromBufferAttribute(lp,i+2).sub(a);assert(b.cross(c).lengthSq()>1e-12,'镜片有零面积面');}
for(let i=0;i<ln.count;i++){const n=new T.Vector3().fromBufferAttribute(ln,i);assert(Math.abs(n.length()-1)<1e-5);if(Math.abs(n.x)>.02)curve++;}assert(curve>100,'镜片没有弧面法线');
const plainFaces=plain.root.children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0),detailFaces=detailed.root.children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0);
assert(detailFaces>plainFaces&&detailFaces-plainFaces<1600,'设施细节预算过高');release(plain);release(detailed);
console.log('PASS 山顶设施预算/双端弧面镜片/三种朝向实际命中/默认设施兼容');
const furniture=create('trailFacilities','trail-facilities',{weathered:true,benches:[{position:[0,0,0]}],signs:[{position:[5,0,0],width:1.6,height:2.1}]}),wood=furniture.root.children.find(m=>m.material.bumpScale===.002),metal=furniture.root.children.find(m=>!m.material.map);
furniture.root.updateWorldMatrix(true,true);const joinRay=new T.Raycaster(),mp=metal.geometry.attributes.position;
for(const x of [-2.1*.36,2.1*.36]) {
 for(const z of [-.21,.23]){joinRay.set(new T.Vector3(x,.7,z),new T.Vector3(0,-1,0));assert(joinRay.intersectObject(furniture.root,true)[0]?.object===metal,'座面螺栓没有固定在木条上');assert(joinRay.intersectObject(wood)[0]?.point.y>.49,'座面螺栓下方没有木条');}
 for(const y of [.67,.83]){joinRay.set(new T.Vector3(x,y,0),new T.Vector3(0,0,-1));const seat=joinRay.intersectObject(wood)[0];assert(seat);let bottom=0;for(let i=0;i<mp.count;i++)if(Math.abs(mp.getX(i)-x)<.03&&Math.abs(mp.getY(i)-y)<.03&&mp.getZ(i)>-.24)bottom=Math.min(bottom,mp.getZ(i));assert(bottom<seat.point.z-.002,'背板螺栓没有嵌入木条');}
}
joinRay.set(new T.Vector3(0,.7,-.21),new T.Vector3(0,-1,0));const uvA=joinRay.intersectObject(wood)[0].uv;
joinRay.set(new T.Vector3(.4,.7,-.21),new T.Vector3(0,-1,0));const uvB=joinRay.intersectObject(wood)[0].uv;
assert(Math.abs(uvA.x-uvB.x)<1e-6&&Math.abs(uvA.y-uvB.y)>.4&&uvA.x<.5,'木材纤维没有沿长边连续投影');
joinRay.set(new T.Vector3(1.3,.465,-.21),new T.Vector3(-1,0,0));assert(joinRay.intersectObject(wood)[0].uv.x>.5,'木材端面没有使用年轮区');
for(const x of [5-1.6*.36,5+1.6*.36]){let top=0;for(let i=0;i<mp.count;i++)if(Math.abs(mp.getX(i)-x)<.047&&Math.abs(mp.getZ(i))<.047)top=Math.max(top,mp.getY(i));assert(top>2.16,'路牌雨帽没有和立柱接合');}
release(furniture);
const shelter=create('trailFacilities','trail-facilities',{weathered:true,shelters:amenities.shelters}),back=shelter.root.children.find(m=>m.material.bumpScale===.002),panel=shelter.root.children.find(m=>m.material.map?.image.width===1024);shelter.root.updateWorldMatrix(true,true);
joinRay.set(new T.Vector3(1,1.96,-3),new T.Vector3(0,0,1));const panelRear=joinRay.intersectObject(panel)[0];joinRay.set(new T.Vector3(1,1.96,0),new T.Vector3(0,0,-1));const backing=joinRay.intersectObject(back)[0];
assert(panelRear&&backing&&panelRear.point.z<backing.point.z-.002,'亭内牌面悬离木背板');release(shelter);
console.log('PASS 长椅紧固件实面接合/沿材长木纹/端面年轮/路牌雨帽与亭内背板');
const ridges=create('coastalRidges','coastal-ridges',{north:Array(101).fill(5),east:Array(77).fill(5),bounds:[-50,-38,50,38],columns:101,rows:77,heights:Array(101*77).fill(5)}),bg=ridges.root.children[0],bp=bg.geometry.attributes.position,bn=bg.geometry.attributes.normal,bc=bg.geometry.attributes.color;let edges=0;
assert(!bg.castShadow&&!bg.receiveShadow&&!ridges.update);for(let i=0;i<bp.count;i++){assert(bp.getX(i)>=50||bp.getZ(i)>=38,'背景侵入可玩区');if((bp.getX(i)===50&&bp.getZ(i)<=38)||(bp.getZ(i)===38&&bp.getX(i)<=50)){assert(Math.abs(bp.getY(i)-5)<1e-6&&bn.getY(i)>.99999,'背景边缘高度/法线没有继承坡面');edges++;}}
assert(edges===177&&bc.array.every(Number.isFinite));release(ridges);
console.log('PASS 远景接边高度/共享法线/颜色/无碰撞或更新');
