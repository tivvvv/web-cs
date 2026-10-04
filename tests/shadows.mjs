// 阴影几何/参数的纯 Node 回归. 不创建浏览器或 GPU, 不替代移动时的画面验收.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { WebGLIndexedBufferRenderer } from '../node_modules/three/src/renderers/webgl/WebGLIndexedBufferRenderer.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
function canvas() {
  const ctx={pixels:null,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    putImageData(image){this.pixels=image.data;},getImageData(x,y,w,h){return {data:this.pixels??new Uint8ClampedArray(w*h*4)};},
    createLinearGradient:()=>({addColorStop(){}})};
  for(const name of ['save','restore','beginPath','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','clip','fillRect','stroke'])ctx[name]=()=>{};
  return {width:1,height:1,getContext:()=>ctx};
}
const document={createElement:canvas},c=vm.createContext({window:{},document,AbortController});
vm.runInContext(read('vendor/three.min.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const T=c.THREE,layout=c.window.FPS_LAYOUT;
function factory(file,name) {
  const isolated=vm.createContext({FPS:{models:{}},document});vm.runInContext(read('models/'+file+'.js'),isolated);
  assert.deepEqual(Object.keys(isolated.FPS.models),[name]);return isolated.FPS.models[name];
}
// 执行原灯光装配, 既验证场景可配置小偏移, 也保护未配置场景的兼容默认值.
const html=read('index.html'),begin=html.indexOf('  const lights = Array.isArray(layout.lights)'),end=html.indexOf('  if (!lights.length)',begin);
assert(begin>=0&&end>begin);
const tuple=html.slice(html.indexOf('const tuple ='),html.indexOf('\n',html.indexOf('const tuple =')));
function lights(config,maxTextureSize=4096) {
  const ctx=vm.createContext({T,layout:{lights:config},scene:new T.Scene(),renderer:{capabilities:{maxTextureSize}}});
  vm.runInContext(`${tuple}\nconst guarded=(scope,fn)=>fn();\n${html.slice(begin,end)}`,ctx);ctx.scene.updateMatrixWorld(true);
  return ctx.scene.children.filter(light=>light.isDirectionalLight);
}
const sun=lights(layout.lights)[0];sun.shadow.updateMatrices(sun);
assert.equal(sun.shadow.normalBias,.008);assert.equal(sun.shadow.bias,-.000015);assert.equal(sun.shadow.autoUpdate,false);
assert.equal(sun.shadow.mapSize.x,4096);assert.equal(lights(layout.lights,2048)[0].shadow.mapSize.x,2048);
const fallback=lights([{type:'sun',position:[0,10,0]}])[0];assert.equal(fallback.shadow.normalBias,.035);assert.equal(fallback.shadow.bias,-.0004);
const zero=lights([{type:'sun',position:[0,10,0],shadowNormalBias:0,shadowBias:0}])[0];assert.equal(zero.shadow.normalBias,0);assert.equal(zero.shadow.bias,0);
const ray=new T.Raycaster(),direction=sun.position.clone().sub(sun.target.position).normalize();
const depthOffset=Math.abs(sun.shadow.bias)*(sun.shadow.camera.far-sun.shadow.camera.near);
assert(depthOffset<.006&&sun.shadow.normalBias+depthOffset<.015,'世界尺度阴影偏移仍会留下明显接触缝');
console.log('PASS 原灯光装配/小偏移/零值/默认兼容/硬件阴影尺寸降级');

const park=factory('park-tree','parkTree'),tree=park(T,Object.freeze({seed:511,spread:1.12}));
const leaves=tree.root.children.find(mesh=>mesh.isInstancedMesh),shadow=tree.root.children.find(mesh=>mesh.name==='park-canopy-shadow');
assert.equal(tree.root.children.length,3);assert(!leaves.castShadow&&!leaves.receiveShadow&&leaves.count>8000,'可见细叶被删减/仍产生细碎自阴影');
assert(shadow.castShadow&&!shadow.receiveShadow&&!shadow.material.colorWrite&&!shadow.material.depthWrite&&!shadow.material.transparent);
const geometry=shadow.geometry,positions=geometry.attributes.position,matrices=leaves.instanceMatrix;
assert(positions.array.every(Number.isFinite));assert.equal(geometry.index.count/3,168,'冠簇投影增加几何预算');
const image=shadow.material.map.image,alphas=image.data.filter((v,i)=>i%4===3);
assert(alphas.some(v=>v===0)&&alphas.some(v=>v===255)&&alphas.some(v=>v>0&&v<255),'冠簇轮廓没有留透光孔隙/过滤边缘');
assert(shadow.material.map.generateMipmaps);assert.equal(shadow.material.map.minFilter,T.LinearMipmapLinearFilter);
assert.equal(geometry.drawRange.count,0,'阴影代理不应绘制到世界/倒影');
assert.equal(shadow.count,0);assert(shadow.boundingSphere.radius>0,'零实例之前没有保存有效阴影包围体');
const sphere=shadow.boundingSphere.clone(),draws=[];
const buffer=new WebGLIndexedBufferRenderer({drawElementsInstanced:(mode,count,type,start,instances)=>draws.push({count,instances})},{},{update(){}});
buffer.setIndex({type:1,bytesPerElement:2});
const submit=()=>buffer.renderInstances(0,geometry.drawRange.count,shadow.count);
submit();assert.equal(draws.length,0,'零三角面仍提交了空 GL 绘制');
shadow.onBeforeShadow();assert.equal(geometry.drawRange.count,geometry.index.count);submit();assert.equal(draws.length,1);assert.equal(draws[0].count,504);
shadow.onAfterShadow();assert.equal(geometry.drawRange.count,0);submit();assert.equal(draws.length,1);
shadow.onBeforeShadow();shadow.onBeforeRender();submit();assert.equal(draws.length,1,'失败回退到世界绘制时未关闭代理');
assert.equal(shadow.count,0);assert(shadow.boundingSphere.equals(sphere),'阶段切换改变了阴影剔除包围体');
const snapshot=positions.array.slice();for(let i=0;i<120;i++)tree.update(1/60);
assert(positions.array.every((v,i)=>v===snapshot[i])&&leaves.instanceMatrix===matrices,'风动修改了静态阴影/重建实例缓冲');
tree.root.updateMatrixWorld(true);ray.set(new T.Vector3(0,10,0),new T.Vector3(0,-1,0));assert.equal(ray.intersectObject(shadow).length,0,'阴影代理参与了射击');
// 核对当前 Three.js 阴影回调的顺序, 保证零绘制代理仍会在深度阶段打开.
const engine=read('node_modules/three/src/renderers/webgl/WebGLShadowMap.js');
assert(engine.indexOf('object.onBeforeShadow')<engine.indexOf('renderer.renderBufferDirect( shadowCamera'));
assert(engine.indexOf('object.onAfterShadow')>engine.indexOf('renderer.renderBufferDirect( shadowCamera'));
console.log('PASS 公园细叶保留/无自阴影, 168 面静态冠簇投影/世界零绘制/回退/风动/射击隔离');

const woodland=factory('mountain-woodland','mountainWoodland')(T,{trees:[{position:[0,0,0],kind:'pine',seed:73}]}),trunk=woodland.root.children.find(mesh=>mesh.name==='mountain-tree-trunks');
const rock=factory('mountain-rocks','mountainRocks')(T,{stones:[{position:[0,-.6,0],size:[2,2,2]}]}).root.children[0];
for(const caster of [tree.root.children[0],trunk,rock])assert.equal(caster.material.shadowSide,T.FrontSide,'闭合实体仍用远离光源的背面深度投影');
// 对真实树干/岩石网格作阴影深度比较, 检查坡脚接触; 不模拟 PCF/GPU 或宣称像素验收.
function occluded(mesh,p,normal,bias,normalBias,side) {
  const point=p.clone().addScaledVector(normal,normalBias),origin=point.addScaledVector(direction,100),original=mesh.material.side;
  mesh.material.side=side;ray.set(origin,direction.clone().negate());ray.far=101;
  try {return ray.intersectObject(mesh).some(hit=>hit.distance<100+bias*(sun.shadow.camera.far-sun.shadow.camera.near));}
  finally {mesh.material.side=original;}
}
let checked=0,restored=0;
for(const mesh of [trunk,rock]) {
  mesh.updateMatrixWorld(true);
  for(const [sx,sz]of [[0,0],[.3,-.2],[-.3,.2]]) {
    const normal=new T.Vector3(-sx,1,-sz).normalize(),across=new T.Vector3(-direction.z,0,direction.x).normalize();
    const step=mesh===rock?.04:.008;
    for(let a=-36;a<=36;a++)for(let b=-36;b<=36;b++) {
      const p=across.clone().multiplyScalar(a*step).addScaledVector(new T.Vector3(direction.x,0,direction.z).normalize(),b*step);p.y=p.x*sx+p.z*sz;
      // 排除被树干/岩石本体盖住的地面, 接触修复必须发生在玩家能看到的坡脚.
      ray.set(p.clone().add(new T.Vector3(0,50,0)),new T.Vector3(0,-1,0));ray.far=50;
      if(ray.intersectObject(mesh).some(hit=>hit.distance<49.999))continue;
      if(!occluded(mesh,p,normal,0,0,T.FrontSide))continue;
      const small=occluded(mesh,p,normal,sun.shadow.bias,sun.shadow.normalBias,mesh.material.shadowSide);
      const old=occluded(mesh,p,normal,-.0002,.035,T.BackSide);
      checked++;if(small&&!old)restored++;
    }
  }
}
assert(checked>200&&restored>30,'实际可见坡脚接触采样没有改善 '+JSON.stringify({checked,restored}));
console.log('PASS 真实树干/岩石网格与三种坡面接触深度比较 '+JSON.stringify({checked,restored}));
let released=0;for(const mesh of [leaves,shadow])mesh.addEventListener('dispose',()=>released++);tree.dispose();assert.equal(released,2,'树冠/阴影实例缓冲没有释放');
