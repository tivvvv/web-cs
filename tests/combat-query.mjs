// 真实三角面的射线筛选对照, 纯 Node CPU, 不代表浏览器 FPS.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),c=vm.createContext({T});
vm.runInContext(html.slice(html.indexOf('function rayContact('),html.indexOf('function visible(')),c);
const roots=[],geometry=new T.BoxGeometry(1,2,1),material=new T.MeshBasicMaterial(),scene=new T.Scene();
for(let z=0;z<18;z++)for(let x=0;x<18;x++){
 const root=new T.Group();root.position.set(x*6,0,z*6);
 for(let i=0;i<4;i++){const m=new T.Mesh(geometry,material);m.position.set(i%2*2,1,Math.floor(i/2)*2);root.add(m);}
 scene.add(root);roots.push(root);
}
scene.updateMatrixWorld(true);for(const r of roots)r.userData.rayBounds=new T.Box3().setFromObject(r).expandByScalar(.08);
// 动态对象不受静态范围限制; 装配后移动仍须命中.
roots[0].userData.actor={};roots[0].position.set(-8,0,-8);scene.updateMatrixWorld(true);
let seed=91;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const rays=Array.from({length:400},()=>new T.Raycaster(new T.Vector3(random()*120-10,random()*4,random()*120-10),new T.Vector3(random()-.5,random()*.12-.06,random()-.5).normalize(),.025,10+random()*110));
rays.push(new T.Raycaster(new T.Vector3(-8,1,-8),new T.Vector3(0,0,1),.025,.4),new T.Raycaster(new T.Vector3(-8,1,-10),new T.Vector3(0,0,1),.025,5));
let visits=0;for(const root of roots)for(const mesh of root.children){const raycast=mesh.raycast;mesh.raycast=function(...args){visits++;return raycast.apply(this,args);};}
function run(fast){visits=0;const start=performance.now(),hits=rays.map(ray=>fast?c.rayContact(ray,roots):ray.intersectObjects(roots,true).find(h=>h.object.isMesh&&h.face));return {hits,ms:performance.now()-start,visits};}
run(true);const before=run(false),after=run(true);
for(let i=0;i<rays.length;i++){
 const a=before.hits[i],b=after.hits[i];assert.equal(!!a,!!b,'漏检 '+i);
 if(a){assert.equal(a.object,b.object);assert(Math.abs(a.distance-b.distance)<1e-8);assert(a.point.distanceTo(b.point)<1e-8);}
 assert.equal(!!c.rayContact(rays[i],roots,true),!!a,'视线规则变化');
}
assert(after.visits<before.visits*.15,'未有效减少真实网格查询');
const old=roots[1].children[0].raycast,ray=new T.Raycaster(new T.Vector3(6,1,-2),new T.Vector3(0,0,1),.025,100);
roots[1].children[0].raycast=()=>{throw Error('射线失败');};assert.throws(()=>c.rayContact(ray,roots),/射线失败/);assert.equal(ray.far,100);roots[1].children[0].raycast=old;
mkdirSync('artifacts/finish-pass',{recursive:true});writeFileSync('artifacts/finish-pass/query.json',JSON.stringify({scope:'Node CPU 合成场景, 非游戏 FPS',rays:rays.length,roots:roots.length,baseline:{ms:before.ms,meshQueries:before.visits},optimized:{ms:after.ms,meshQueries:after.visits},identicalHits:true},null,2)+'\n');
// 原装配接口不能给会扩张/移动子网格的动画模块缓存初始范围.
const assembly=vm.createContext({T,FPS:{models:{}},entries:[],actors:[],solid:[],ladders:[],scene:new T.Scene(),camera:new T.PerspectiveCamera(),tuple:(a,b)=>a??b,weapon:undefined,renderEffect:undefined});
vm.runInContext(html.slice(html.indexOf('function createInstance('),html.indexOf('function toggleEnemies()')),assembly);
assembly.FPS.models.animated=()=>({root:new T.Group().add(new T.Mesh(geometry,material)),update(){}});
const animated=assembly.createInstance({id:'animated',model:'animated',collision:{enabled:true,size:[1,2,1]}});assert.equal(animated.root.userData.rayBounds,undefined);
assembly.FPS.models.static=()=>({root:new T.Group().add(new T.Mesh(geometry,material))});
assert(assembly.createInstance({id:'static',model:'static',collision:{enabled:true,size:[1,2,1]}}).root.userData.rayBounds);
assert.equal(assembly.createInstance({id:'decoration',model:'static'}).root.userData.rayBounds,undefined);
geometry.dispose();material.dispose();console.log('PASS 射线命中/视线/动态角色/内部起点/有限射程/异常恢复对照, 网格查询 '+before.visits+' -> '+after.visits);
