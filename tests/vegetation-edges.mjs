// 纯 Node 距离场与树叶材质回归. 不启动浏览器, 不验证 GPU 画面.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {ShaderLib} from 'three';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const document={createElement(){const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})};
  for(const method of ['putImageData','setTransform','fillRect','beginPath','moveTo','lineTo','stroke','fill','rect','clip','save','restore','arc','bezierCurveTo','quadraticCurveTo','translate','rotate'])ctx[method]=()=>{};
  return {width:1,height:1,getContext:()=>ctx};}};
const c=vm.createContext({FPS:{models:{}},window:{},document,console,AbortController});vm.runInContext(read('vendor/three.min.js'),c);const T=c.THREE;
assert(Number.isInteger(T.DynamicDrawUsage),'动态顶点缓冲缺少离线依赖导出');
vm.runInContext(read('models/hub-ground.js'),c);vm.runInContext(read('scene-kamakura.js'),c);
const shaderOf=material=>{const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);return shader;};
function sample(texture,rect,x,z) {
  const {width,height,data}=texture.image,u=(x-rect[0])/(rect[2]-rect[0])*width-.5,v=(1-(z-rect[1])/(rect[3]-rect[1]))*height-.5;
  const i=Math.floor(u),j=Math.floor(v),fx=u-i,fy=v-j;
  const at=(a,b)=>{const k=(Math.max(0,Math.min(height-1,b))*width+Math.max(0,Math.min(width-1,a)))*4;return (data[k]*256+data[k+1]-32768)/2048;};
  return (at(i,j)*(1-fx)+at(i+1,j)*fx)*(1-fy)+(at(i,j+1)*(1-fx)+at(i+1,j+1)*fx)*fy;
}
function audit(options,edges,soft,hard) {
  const before=JSON.stringify(options),model=c.FPS.models.hubGround(T,options);assert.equal(JSON.stringify(options),before);
  const surface=model.root.children.find(n=>n.name==='hub-ground-surface'),shader=shaderOf(surface.material),texture=shader.uniforms.hubBoundaryMap.value;
  assert.equal(model.root.children.length,2,'边界修复增加了地面绘制批次');
  assert.equal(texture.minFilter,T.LinearFilter);assert(!texture.generateMipmaps,'距离场仍使用会移动边界的自动 mipmap');
  for(const [x,z,axis]of edges)for(const distance of [-.1,-.01,-.002,.002,.01,.1]) {
    const value=sample(texture,options.bounds,x+(axis===0?distance:0),z+(axis===1?distance:0));
    assert(Math.abs(value-distance)<.001,'边界被宽过渡/量化移动 '+JSON.stringify({x,z,axis,distance,value}));
  }
  model.root.updateMatrixWorld(true);
  for(const p of soft){assert(sample(texture,options.bounds,...p)<0);assert.equal(model.onHit({object:surface,point:new T.Vector3(p[0],2.4,p[1])}).surface,'soil');}
  for(const p of hard){assert(sample(texture,options.bounds,...p)>0);assert.equal(model.onHit({object:surface,point:new T.Vector3(p[0],2.4,p[1])}),undefined);}
  let releases=0;for(const uniform of Object.values(shader.uniforms))if(uniform.value?.isTexture)uniform.value.addEventListener('dispose',()=>releases++);model.dispose();model.dispose();assert.equal(releases,2);
  model.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
}
const options={bounds:[-8,-8,8,8],soil:[[-4,-6,4,6]],paths:[{width:2,points:[[-4,0],[0,0],[0,0],[4,0]]}],pads:[[1,3,3,5]]};
audit(options,[[4,2,0],[0,6,1]],[[0,2],[-3,4]],[[0,0],[4.5,0],[2,4],[6,2]]);
const ground=c.window.FPS_LAYOUT.instances.find(i=>i.model==='hubGround').options;
audit(ground,[[-10.3,3,0]], [[-20,-8]], [[-30,0],[-10,-8]]);
console.log('PASS 距离场真实编码/基础层双线性边界精度/两侧软硬命中/重复点与活动铺地/资源释放');
for(const [name,file]of [['parkTree','park-tree'],['zelkovaTree','zelkova-tree'],['sakuraTree','sakura-tree']]) {
  const isolated=vm.createContext({FPS:{models:{}},document});vm.runInContext(read('models/'+file+'.js'),isolated);
  const model=isolated.FPS.models[name](T),leaves=model.root.children.find(n=>n.material?.alphaToCoverage),shader=shaderOf(leaves.material);
  assert(leaves.isInstancedMesh&&!leaves.material.transparent&&leaves.material.depthWrite);
  assert(leaves.material.map.generateMipmaps&&leaves.material.map.minFilter===T.LinearMipmapLinearFilter);
  assert(shader.fragmentShader.includes('mix(covered,diffuseColor.a,smoothstep(1.,3.,leafPixels))'),'远景叶面仍是固定阈值开关');
  assert(shader.fragmentShader.includes('normal*faceDirection')&&shader.fragmentShader.includes('<-.0001'),'双面受光仍随观察侧翻转或缺少垂直容差');
  assert(shader.fragmentShader.indexOf('float leafFootprint')<shader.fragmentShader.indexOf('discard'),'叶面导数在透明裁切之后计算');
  for(const [target,expected]of [[{samples:4},1],[{samples:1},0],[null,0]]){leaves.onBeforeRender({getRenderTarget:()=>target});assert.equal(shader.uniforms.leafCoverage.value,expected);}
  assert.equal(leaves.material.transparent,false);model.dispose?.();
  model.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
  console.log('PASS '+name+' 覆盖率补丁/多采样与单采样回退/原实例合批');
}
