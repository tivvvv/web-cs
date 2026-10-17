// 全地图局部质量回归. 实际模型和射线在 Node 中执行, 不启动页面或 GPU.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {ShaderLib} from 'three';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const document={createElement(){const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(p){this.pixels=p.data;},measureText:s=>({width:s.length*16})};
 for(const n of ['fillRect','strokeRect','fillText','beginPath','moveTo','lineTo','stroke','fill','arc','save','restore','translate','scale','setTransform'])ctx[n]=()=>{};
 return {width:1,height:1,getContext:()=>ctx,ctx};}};
const c=vm.createContext({FPS:{models:{}},document,AbortController,console});vm.runInContext(read('vendor/three.min.js'),c);const T=c.THREE;
const selected=new Set(process.argv.slice(2)),run=(name,check)=>{if(!selected.size||selected.has(name)){check();console.log('PASS '+name);}};
function freeze(o){if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}
function create(name,file,o={}){vm.runInContext(read('models/'+file+'.js'),c);const options=freeze(o),before=JSON.stringify(options),m=c.FPS.models[name](T,options);assert.equal(JSON.stringify(options),before);return m;}
function meshes(m){const a=[];m.root.traverse(n=>{if(n.isMesh)a.push(n);});return a;}
function bounds(m){m.root.updateMatrixWorld(true);return new T.Box3().setFromObject(m.root);}
function release(m){m.dispose?.();const gs=new Set(),ms=new Set();for(const n of meshes(m)){gs.add(n.geometry);[n.material].flat().forEach(a=>ms.add(a));}gs.forEach(g=>g.dispose());ms.forEach(a=>a.dispose());}
function hits(m,a,b){m.root.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(...a),new T.Vector3(...b).normalize()).intersectObject(m.root,true);}
function triangles(m){return meshes(m).reduce((n,x)=>n+(x.geometry.index?.count??x.geometry.attributes.position.count)/3*(x.isInstancedMesh?x.count:1),0);}
run('crate',()=>{const m=create('crate','crate');assert.equal(meshes(m).length,2);assert.equal(triangles(m),516);const b=bounds(m);assert(b.min.distanceTo(new T.Vector3(-.8,0,-.8))<1e-6&&b.max.distanceTo(new T.Vector3(.8,1.6,.8))<1e-6);
 for(const [p,d]of [[[0,.8,3],[0,0,-1]],[[3,.8,0],[-1,0,0]],[[0,3,0],[0,-1,0]]])assert(hits(m,p,d).length>0);release(m);});
run('barrier',()=>{const m=create('barrier','barrier');assert.equal(meshes(m).length,3);assert.equal(triangles(m),204);const b=bounds(m);assert(b.min.distanceTo(new T.Vector3(-1.8,0,-.55))<1e-6&&b.max.distanceTo(new T.Vector3(1.8,1.4,.55))<1e-6);
 for(const z of [-1,1]){const h=hits(m,[0,.92,z*2],[0,0,-z]);assert(h.length&&Math.abs(h[0].point.z)<.4&&Math.abs(h[0].point.z)>.36);}release(m);});
run('container',()=>{const m=create('container','container');assert.equal(meshes(m).length,3);const b=bounds(m);assert(Math.abs(b.min.x+1.57)<1e-6&&Math.abs(b.max.y-3)<1e-6);
 for(const [p,d]of [[[4,1.5,0],[-1,0,0]],[[0,1.5,5],[0,0,-1]],[[0,5,0],[0,-1,0]]])assert(hits(m,p,d).length);release(m);});
run('container-label',()=>{const m=create('container','container',{label:'A LONG CONTAINER NAME'}),print=meshes(m).find(n=>n.material.map);assert(print&&!print.material.transparent&&print.material.depthWrite&&print.material.map.generateMipmaps);assert(bounds(m).max.z<=3.06251);
 for(const side of [-1,1])assert(hits(m,[.8,1.7,side*6],[0,0,-side])[0].object===print,'印字缺少真实实体表面');let count=0;print.material.map.addEventListener('dispose',()=>count++);m.dispose();m.dispose();assert.equal(count,1);release(m);});
run('building',()=>{const m=create('building','building',{label:'A'});assert.equal(meshes(m).length,4);
 for(const [p,d]of [[[0,.72,2],[0,0,-1]],[[0,.72,-2],[0,0,1]],[[2,.72,0],[-1,0,0]],[[-2,.72,0],[1,0,0]]]){const h=hits(m,p,d);assert(h.length&&h[0].object.material.metalness===.5,'立面缺少窗面');}const b=bounds(m);assert(b.min.y>=-1e-6&&b.max.y<=1.018);release(m);});
const impactOptions={position:new T.Vector3(0,2,0),normal:new T.Vector3(0,1,0),direction:new T.Vector3(0,-1,0)};
run('soil',()=>{const m=create('impact','impact',{...impactOptions,surface:'soil'});assert.equal(meshes(m).length,1);assert.equal(triangles(m),160);const mesh=meshes(m)[0],start=mesh.geometry.attributes.position.array.slice();
 m.update(.3,.5);assert(mesh.geometry.attributes.position.array.some((v,i)=>v!==start[i]));assert(mesh.geometry.attributes.position.array.every(Number.isFinite));assert.equal(hits(m,[0,10,0],[0,-1,0]).length,0);m.update(.6,1);assert.equal(mesh.material.opacity,0);release(m);});
run('sparks',()=>{const m=create('impact','impact',impactOptions);assert.equal(meshes(m).length,2);assert.equal(triangles(m),98);const spark=meshes(m).find(n=>n.frustumCulled===false),start=spark.geometry.attributes.position.array.slice();
 m.update(.225,.5);assert(spark.geometry.attributes.position.array.some((v,i)=>v!==start[i]));assert(spark.geometry.attributes.position.array.every(Number.isFinite));assert.equal(hits(m,[0,10,0],[0,-1,0]).length,0);m.update(.45,1);assert.equal(spark.material.opacity,0);release(m);});
run('effects',()=>{const html=read('index.html'),effects=[],faults=[];let released=0;
 const f=vm.createContext({T,FPS:{models:{}},effects,scene:new T.Scene(),report:(...a)=>faults.push(a),guarded:(name,fn)=>{try{fn();}catch(e){faults.push([name,e]);}}});
 vm.runInContext(html.slice(html.indexOf('function dispose(root)'),html.indexOf('let soundOutput')),f);
 f.FPS.models.test=()=>({root:new T.Group(),dispose(){released++;}});for(let i=0;i<3;i++)f.effect('test',{limit:2});assert.equal(released,1);assert.equal(effects.length,2);
 for(const e of effects){f.releaseEffect(e);f.releaseEffect(e);assert(!e.root.parent);}assert.equal(released,3);
 f.FPS.models.invalid=()=>({root:new T.Group(),duration:-1,dispose(){released++;}});f.effect('invalid',{});assert.equal(released,4);assert.equal(effects.length,2);assert.equal(faults.length,1);
 f.FPS.models.broken=()=>({root:new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()),dispose(){throw Error('cleanup');}});f.effect('broken',{});const broken=effects.at(-1);let geometries=0;broken.root.geometry.addEventListener('dispose',()=>geometries++);f.releaseEffect(broken);assert.equal(geometries,1);assert(!broken.root.parent);});
run('train',()=>{const m=create('enodenTrain','enoden-train',{cars:1}),maps=new Set();for(const mesh of meshes(m))for(const mat of [mesh.material].flat())for(const value of Object.values(mat))if(value?.isTexture)maps.add(value);
 assert.equal(maps.size,3);let count=0;for(const map of maps){assert(map.generateMipmaps&&map.anisotropy===8);map.addEventListener('dispose',()=>count++);}m.dispose();m.dispose();assert.equal(count,maps.size);release(m);});
run('gulls',()=>{const m=create('seagullFlock','seagull-flock'),matrix=new T.Matrix4(),v=new T.Vector3();
 for(let frame=0;frame<180;frame++){m.update(13);for(const mesh of meshes(m)){assert(mesh.frustumCulled);const p=mesh.geometry.attributes.position;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(matrix);assert(mesh.boundingBox.containsPoint(v));assert(v.distanceTo(mesh.boundingSphere.center)<=mesh.boundingSphere.radius);}}}}
 assert.equal(hits(m,[0,100,0],[0,-1,0]).length,0);let count=0;meshes(m).forEach(mesh=>mesh.addEventListener('dispose',()=>count++));m.dispose();m.dispose();assert.equal(count,2);release(m);});
const meadowField={bounds:[-6,-6,6,6],columns:3,rows:3,heights:[3,3,3,3,3.7,3,3,3,3]};
function groundHeight(x,z){const h=meadowField.heights,u=Math.max(0,Math.min(2,(x+6)/6)),v=Math.max(0,Math.min(2,(z+6)/6)),i=Math.min(1,Math.floor(u)),j=Math.min(1,Math.floor(v)),a=u-i,b=v-j,k=j*3;return a+b<=1?h[k+i]+a*(h[k+i+1]-h[k+i])+b*(h[k+i+3]-h[k+i]):h[k+i+4]+(a-1)*(h[k+i+4]-h[k+i+3])+(b-1)*(h[k+i+4]-h[k+i+1]);}
const groundcoverOptions={...meadowField,zones:[{kind:'fern',center:[0,0],radius:4.5,count:200},{kind:'scrub',center:[0,0],radius:4.5,count:200},{kind:'flower',center:[0,0],radius:4.5,count:200}]};
run('groundcover-paths',()=>{const options={...groundcoverOptions,paths:[{width:1.2,points:[[-5,3,0],[0,3,0],[0,3,0],[5,3,0]]}]},m=create('mountainGroundcover','mountain-groundcover',options),v=new T.Vector3(),matrix=new T.Matrix4();let count=0;
 for(const mesh of meshes(m))for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);v.setFromMatrixPosition(matrix);assert(Math.abs(v.z)>=1.3);count++;}assert(count>100);release(m);
 const blocked=create('mountainGroundcover','mountain-groundcover',{...groundcoverOptions,paths:[{width:30,points:[[0,3,0],[0,3,0]]}]});assert.equal(meshes(blocked).length,0);release(blocked);});
run('groundcover-roots',()=>{const m=create('mountainGroundcover','mountain-groundcover',groundcoverOptions),matrix=new T.Matrix4(),v=new T.Vector3();let count=0;
 for(const mesh of meshes(m))for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const p=mesh.geometry.attributes.position;for(let j=0;j<p.count;j++)if(p.getY(j)<.001){v.fromBufferAttribute(p,j).applyMatrix4(matrix);assert(v.y<=groundHeight(v.x,v.z)-.0029);count++;}}
 assert(count>1000);let releases=0;meshes(m).forEach(mesh=>mesh.addEventListener('dispose',()=>releases++));m.dispose();m.dispose();assert.equal(releases,3);release(m);});
run('meadow',()=>{const m=create('mountainGrass','mountain-grass',{...meadowField,maxShort:300,maxTall:30,woodland:[[0,0,4]]}),matrix=new T.Matrix4();assert(meshes(m).length<=2&&triangles(m)<=300*12+30*25);
 for(const mesh of meshes(m)){assert(mesh.instanceColor.array.every(Number.isFinite));for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));}}
 const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};meshes(m)[0].material.onBeforeCompile(shader);
 m.update(Math.PI*200+.01);assert(Math.abs(shader.uniforms.grassTime.value-.01)<1e-9);m.update(NaN);m.update(-1);assert(Math.abs(shader.uniforms.grassTime.value-.01)<1e-9);
 let count=0;meshes(m).forEach(mesh=>mesh.addEventListener('dispose',()=>count++));m.dispose();m.dispose();assert.equal(count,meshes(m).length);release(m);});
run('litter',()=>{const options={...meadowField,trees:[{position:[0,3.7,0],litterCount:100}]},open=create('mountainLitter','mountain-litter',options);assert(triangles(open)>100);release(open);
 const clean=create('mountainLitter','mountain-litter',{...options,paths:[{width:30,points:[[0,3,0],[0,3,0]]}]});assert.equal(meshes(clean).length,0,'重复路线点周围仍堆积碎屑');release(clean);});
function solidTriangles(m){const a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3();for(const mesh of meshes(m)){const g=mesh.geometry,p=g.attributes.position,index=g.index;for(let i=0;i<(index?.count??p.count);i+=3){a.fromBufferAttribute(p,index?index.getX(i):i);b.fromBufferAttribute(p,index?index.getX(i+1):i+1).sub(a);d.fromBufferAttribute(p,index?index.getX(i+2):i+2).sub(a);assert(b.cross(d).lengthSq()>1e-20,'存在退化三角面');}assert(g.attributes.normal.array.every(Number.isFinite));}}
run('reeds',()=>{const m=create('parkReeds','park-reeds');assert.equal(meshes(m).length,1);solidTriangles(m);assert.equal(triangles(m),960);assert.equal(hits(m,[0,10,0],[0,-1,0]).length,0);assert(!meshes(m)[0].material.transparent);release(m);});
run('iris',()=>{const m=create('waterIris','water-iris');assert.equal(meshes(m).length,1);solidTriangles(m);assert(triangles(m)<2600);assert.equal(hits(m,[0,10,0],[0,-1,0]).length,0);assert(!meshes(m)[0].material.transparent);release(m);});
run('signs',()=>{for(const [name,file,y,z]of [['communityBoard','community-board',1.55,.06],['shopPlaque','shop-plaque',0,.012]]){const m=create(name,file),print=meshes(m).find(n=>n.material.map);assert.equal(meshes(m).length,2);const h=hits(m,[0,y,5],[0,0,-1]);assert(h[0].object===print&&Math.abs(h[0].point.z-z)<1e-6);assert(h.filter(x=>x.object!==print).every(x=>x.point.z<0),'文本后存在贴近的抢深度整板');
 for(const side of [-1,1]){const h=hits(m,[side*4,y,0],[-side,0,0]);assert(h.length&&h[0].object!==print);}let n=0;print.material.map.addEventListener('dispose',()=>n++);m.dispose();m.dispose();assert.equal(n,1);release(m);}});
run('timber',()=>{const m=create('hubFixtures','hub-fixtures',{benches:[{position:[0,2.4,0]}]}),wood=meshes(m).find(n=>n.name==='hub-bench-timber'),g=wood.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;let ends=0,sides=0;
 for(let i=0;i<p.count;i++){if(Math.abs(n.getX(i))>.5){assert(uv.getX(i)>.5);ends++;}else{assert(uv.getX(i)<.5);sides++;}}assert(ends&&sides);
 const map=wood.material.map;assert.equal(map.image.width,256);assert.equal(map.image.height,256);const data=map.image.data;let diff=0;for(let y=0;y<256;y++)for(let x=0;x<128;x++)diff+=Math.abs(data[(y*256+x)*4]-data[(y*256+x+128)*4]);assert(diff>100000,'锯切端面仍沿用侧面纹理');assert(map===wood.material.bumpMap&&map.generateMipmaps);assert(meshes(m).length<=2);release(m);});
run('forklift',()=>{const m=create('portForklift','port-forklift');assert.equal(meshes(m).length,4);solidTriangles(m);assert(triangles(m)<6000);
 for(const side of [-1,1])for(const z of [2.58,2.591,2.7,2.839]){const h=hits(m,[side*.38,2,z],[0,-1,0])[0];assert(h);const y=z<=2.59?.33:.33-(z-2.59)*.035/.25;assert(Math.abs(h.point.y-y)<1e-5,'叉尖不连续');}
 const h=hits(m,[0,2.77,.24],[0,-1,0]);assert(h.some(x=>Math.abs(x.point.y-1.77)<.03),'方向盘没有轮毂');release(m);});
run('warehouse',()=>{const m=create('portWarehouse','port-warehouse');assert.equal(meshes(m).length,5);const wall=meshes(m)[0],p=wall.geometry.attributes.position;let front=0,back=0,min=Infinity,max=-Infinity;
 for(let i=0;i<p.count;i++)if(p.getY(i)>8.05){min=Math.min(min,p.getZ(i));max=Math.max(max,p.getZ(i));p.getZ(i)>0?back++:front++;}assert(front&&back&&Math.abs(min+max)<1e-5,'山墙两端不对齐');
 const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};wall.material.onBeforeCompile(shader);assert(shader.fragmentShader.includes('fwidth(phase)'));
 for(const z of [-1,1]){const h=hits(m,[0,8.7,z*12],[0,0,-z]);assert(h.length&&Math.abs(Math.abs(h[0].point.z)-9.08)<1e-5);}release(m);});
