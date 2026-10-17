// 公园视角回归: 叶面法线与云体保守裁剪. 纯 CPU 数值检查, 不启动浏览器或推算 GPU 帧率.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as Three from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const T={...Three,mergeGeometries};
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const document={createElement(){const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(target,key)=>target[key]??(()=>{})});return {width:1,height:1,getContext:()=>ctx};}};
const c=vm.createContext({FPS:{models:{}},document});
for(const name of ['park-tree','coastal-sky','hub-grass','mountain-grass'])vm.runInContext(read('models/'+name+'.js'),c);
const tree=c.FPS.models.parkTree(T),leaves=tree.root.children.find(n=>n.material?.alphaToCoverage),material=leaves.material;
const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};material.onBeforeCompile(shader);
assert(shader.fragmentShader.includes('normal*faceDirection')&&shader.fragmentShader.includes('dot(leafNormal,canopyDirection)'));
assert(!material.transparent&&material.depthWrite&&material.alphaToCoverage&&material.map.generateMipmaps);
assert(leaves.count===8400&&!leaves.castShadow&&!leaves.receiveShadow,'树叶减量或重新引入细碎自阴影');
// 在不同观察基中模拟 Three.js 双面翻转, 再转换回同一世界空间比较两面的照明法线.
const camera=new T.PerspectiveCamera(),sun=new T.Vector3(-.7,.6,-.3).normalize();let maxOldJump=0,maxNewJump=0;
for(const local of [[.6,-.8,.05],[-.4,.5,.8],[.2,.96,-.1]])for(const blend of [0,.65,.8,.88,.95])for(let pitch=-80;pitch<=80;pitch+=10){
  camera.rotation.set(pitch*Math.PI/180,.47,0);camera.updateMatrixWorld(true);
  const geometric=new T.Vector3(...local).normalize().transformDirection(camera.matrixWorldInverse),canopy=new T.Vector3(.18,.95,-.25).normalize().transformDirection(camera.matrixWorldInverse),old=[],fixed=[];
  for(const face of [-1,1]){
    const raw=geometric.clone().multiplyScalar(face);old.push(raw.clone().lerp(canopy,blend).normalize().transformDirection(camera.matrixWorld).dot(sun));
    const stable=raw.multiplyScalar(face);if(stable.dot(canopy)<-.0001)stable.negate();fixed.push(stable.lerp(canopy,blend).normalize().transformDirection(camera.matrixWorld).dot(sun));
  }
  maxOldJump=Math.max(maxOldJump,Math.abs(old[0]-old[1]));maxNewJump=Math.max(maxNewJump,Math.abs(fixed[0]-fixed[1]));
}
assert(maxOldJump>.3&&maxNewJump<1e-12);
console.log('PASS 叶面正反侧/俯仰 -80~80 度的世界光照法线连续 '+JSON.stringify({maxOldJump,maxNewJump}));
tree.dispose();tree.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});

for(const name of ['hubGrass','mountainGrass']){
  const model=c.FPS.models[name](T,{bounds:[-3,-3,3,3],heights:[3,3,3,3],maxShort:60,maxTall:10});assert(model.root.children.length);
  for(const mesh of model.root.children){const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};mesh.material.onBeforeCompile(shader);
    assert(shader.fragmentShader.includes('normal*faceDirection')&&shader.fragmentShader.includes('<-.0001'),name+' 仍混入观察方向翻转的法线');assert(mesh.material.side===T.DoubleSide&&!mesh.material.transparent);}
  model.dispose();model.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
}
// 垂直叶面与地表法线点积接近零, Float32 舍入不能使混合方向随俯仰变号.
const round=Math.fround,oldSigns=new Set(),newSigns=new Set();let maxPerpendicularError=0;
for(let i=0;i<3600;i++){
  camera.rotation.set(Math.sin(i*.007)*1.4,i*.013,0);camera.updateMatrixWorld(true);const e=camera.matrixWorldInverse.elements;
  const n=[e[0],e[1],e[2]].map(round),up=[e[4],e[5],e[6]].map(round),dot=round(n.reduce((s,v,j)=>round(s+round(v*up[j])),0));
  maxPerpendicularError=Math.max(maxPerpendicularError,Math.abs(dot));oldSigns.add(dot<0);newSigns.add(dot<-.0001);
}
assert.equal(oldSigns.size,2);assert.equal(newSigns.size,1);assert(maxPerpendicularError<.0001);
console.log('PASS 两区草丛双面法线, 3600 组 Float32 俯仰/转向的垂直容差 '+JSON.stringify({maxPerpendicularError}));

const sky=c.FPS.models.coastalSky(T),fragment=sky.root.children[0].material.fragmentShader;
const volumes=[...fragment.matchAll(/ellipsoidSquared\(p,vec3\(([^)]+)\),vec3\(([^)]+)\)\)/g)].map(m=>[m[1].split(',').map(Number),m[2].split(',').map(Number)]);
const clips=[...fragment.matchAll(/cloudInterval\(origin,ray\*\.0025,vec3\(([^)]+)\),vec3\(([^)]+)\),limits,span\)/g)].map(m=>[m[1].split(',').map(Number),m[2].split(',').map(Number)]);
assert.equal(volumes.length,12);assert.deepEqual(clips,volumes,'裁剪范围和实际云形没有共用体积');
assert(fragment.includes('t+=stepSize;continue;')&&fragment.includes('nearT+stepSize*.45'),'空段优化改变了云内采样相位');
assert(fragment.includes('density(p+uSun*24.)*.55+density(p+uSun*65.)*.8+density(p+uSun*135.)*1.05'),'云内光照精度被削减');
function shape(point){let before=-Infinity,squared=Infinity;for(const [center,radius]of volumes){const q=point.map((v,i)=>(v-center[i])/radius[i]),d=q.reduce((s,v)=>s+v*v,0);before=Math.max(before,1-Math.sqrt(d));squared=Math.min(squared,d);}const after=1-Math.sqrt(squared);assert(Math.abs(before-after)<1e-12);return before;}
function spanFor(origin,ray,limits,fround=false){const round=fround?Math.fround:n=>n,span=[limits[1],limits[0]];
  for(const [center,radius]of volumes){const p=origin.map((n,i)=>round(round(n-center[i])/radius[i])),d=ray.map((n,i)=>round(n*.0025/radius[i])),dot=(a,b)=>round(a.reduce((s,n,i)=>round(s+round(n*b[i])),0));
    const a=dot(d,d),b=dot(p,d),delta=round(round(b*b)-round(a*round(dot(p,p)-1.221*1.221)));if(delta<0)continue;
    const h=round(Math.sqrt(delta)),lo=round(round(-b-h)/a),hi=round(round(-b+h)/a);if(hi<limits[0]||lo>limits[1])continue;span[0]=Math.min(span[0],Math.max(lo,limits[0]));span[1]=Math.max(span[1],Math.min(hi,limits[1]));
  }return span;
}
let queries=0,kept=0,nonzeroSupport=0;
for(const camera of [[0,4,116],[25,4,123],[140,30,120],[0,-20,0],[0,960,0]])for(const time of [0,70,600,1800])for(const pitch of [1.4,1.5,2,5,15,30,45,60,80,89])for(let yaw=0;yaw<360;yaw+=15){
  const p=pitch*Math.PI/180,y=yaw*Math.PI/180,ray=[Math.cos(p)*Math.sin(y),Math.sin(p),Math.cos(p)*Math.cos(y)];if(ray[1]<=.025)continue;
  const near=Math.max(0,(118-camera[1])/ray[1]),far=Math.min(4200,(950-camera[1])/ray[1]),step=Math.max(0,far-near)/48,origin=camera.map(n=>n*.0025);origin[0]-=time*.004;
  const ranges=[spanFor(origin,ray,[near,far]),spanFor(origin,ray,[near,far],true)];let t=near+step*.45;
  for(let i=0;i<48&&t<=far;i++,t+=step){queries++;const point=origin.map((n,j)=>n+ray[j]*t*.0025),value=shape(point),inside=ranges.map(span=>t>=span[0]&&t<=span[1]);kept+=Number(inside[0]);
    if(value>=-.22){nonzeroSupport++;assert(inside.every(Boolean),'云边缘/运动/低仰角/倒影相机被错误裁剪 '+JSON.stringify({camera,time,pitch,yaw,t,value,ranges}));}
  }
}
assert(nonzeroSupport>2000&&kept<queries*.5,'云体采样未覆盖有效范围或没有跳过空段');
console.log('PASS 原 48 步云形/采样相位/三探针光照, 运动/俯仰/倒影/高空与 Float32 保守范围 '+JSON.stringify({queries,kept,nonzeroSupport,skippedFraction:1-kept/queries}));
sky.dispose();sky.root.children[0].geometry.dispose();sky.root.children[0].material.dispose();
