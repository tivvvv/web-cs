// 原启动准备流程的协议回归. 无浏览器/GPU, 不把桩计数当作实际帧数或加载耗时.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('async function prepareScene()'),html.indexOf('async function boot()'));
async function fixture({float=true,post=true,failCompile=false,failDraw=false,failGPU=false,failModule=false,hasWeapon=true}={}) {
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(),root=new T.Group(),material=new T.MeshStandardMaterial();
  const mesh=new T.Mesh(new T.BoxGeometry(),material);root.add(mesh);scene.add(root,camera);
  const viewRoot=new T.Group();viewRoot.visible=false;viewRoot.add(new T.Mesh(new T.BoxGeometry(),material));camera.add(viewRoot);
  viewRoot.traverse(n=>n.layers.set(1));camera.layers.set(0);
  const weapon=hasWeapon?{root:viewRoot}:undefined,background=new T.Color(0x123456);scene.background=background;
  let target=null,prepared=false,shadowReady=false,compiled=false,weaponCompiled=false,deleted=0,draws=0;
  const calls=[],faults=[],gl={SYNC_GPU_COMMANDS_COMPLETE:1,TIMEOUT_EXPIRED:2,WAIT_FAILED:3,
    fenceSync:()=>({}),flush(){},clientWaitSync:()=>failGPU?3:4,deleteSync(){deleted++;}};
  const renderer={extensions:{has:()=>float},shadowMap:{autoUpdate:true},getRenderTarget:()=>target,setRenderTarget:value=>target=value,
    async compileAsync(object,view,lights) {
      calls.push({object,view,lights,target});assert(prepared,'编译发生在材质补丁接入之前');
      if(failCompile)throw Error('编译失败');
      if(object===scene)compiled=true;else {assert.equal(object,viewRoot);assert.equal(lights,scene);weaponCompiled=true;}
    },
    render(world,view) {
      draws++;assert(compiled,'世界在异步编译前同步渲染');assert.equal(world,scene);
      if(failDraw)throw Error('绘制失败');
      if(view.layers.mask===2){assert(weaponCompiled);assert(viewRoot.visible,'武器只编译未上传');assert.equal(scene.background,null);assert.equal(this.shadowMap.autoUpdate,false);}
      else shadowReady=true;
    },getContext:()=>gl};
  let disposed=0;
  const entries=[{id:'material-setup',prepare(){prepared=true;if(failModule)throw Error('模块失败');},dispose(){disposed++;}}];
  const c=vm.createContext({T,renderer,scene,camera,weapon,entries,renderEffect:post?{disabled:false}:undefined,performance,setTimeout,
    report:(id,e)=>faults.push(id+': '+e.message),guarded:(id,fn)=>fn(),
    renderWorld(){assert(prepared&&compiled&&shadowReady,'地表缓存应在静态太阳图生成后准备');assert(mesh.frustumCulled,'实际画面绘制未恢复视锥剔除');renderer.render(scene,camera);}});
  vm.runInContext(source+'globalThis.prepare=prepareScene;',c);
  try {
    if(failCompile||failDraw||failGPU)await assert.rejects(c.prepare(),/失败|GPU/);
    else await c.prepare();
    assert.equal(target,null);assert.equal(camera.layers.mask,1);assert.equal(scene.background,background);
    assert.equal(viewRoot.visible,false);assert.equal(mesh.frustumCulled,true);assert.equal(renderer.shadowMap.autoUpdate,true);
    if(failModule){assert.equal(entries[0].disabled,true);assert.equal(disposed,1);assert.equal(faults.length,1);}
    if(!failCompile&&!failDraw){assert.equal(deleted,1);assert.equal(calls.filter(c=>c.object===scene).length,float&&post?1:2);assert.equal(calls.filter(c=>c.object===viewRoot).length,hasWeapon?1:0);}
    return {draws,compiles:calls.length};
  } finally {mesh.geometry.dispose();viewRoot.children[0].geometry.dispose();material.dispose();}
}
await fixture();await fixture({float:false});await fixture({post:false});await fixture({hasWeapon:false});
for(const key of ['failCompile','failDraw','failGPU','failModule'])await fixture({[key]:true});
console.log('PASS 编译前材质接入/太阳图与缓存顺序/武器单独编译和上传/HDR 降级, 异常恢复目标/图层/可见性/背景/阴影与 GPU 栅栏释放');

// 使用原装配函数检验实际 InstancedMesh. 进入视野时不再触发成批的包围球扫描.
const context=vm.createContext({T,FPS:{models:{}},entries:[],actors:[],solid:[],ladders:[],scene:new T.Scene(),camera:new T.PerspectiveCamera(),
  tuple:(a,b)=>a??b,weapon:undefined,renderEffect:undefined});
vm.runInContext(html.slice(html.indexOf('function createInstance('),html.indexOf('function toggleEnemies()')),context);
const geometry=new T.BoxGeometry(),batch=new T.InstancedMesh(geometry,new T.MeshStandardMaterial(),3),pose=new T.Matrix4();
for(let i=0;i<3;i++){pose.makeTranslation(i*7,0,0);batch.setMatrixAt(i,pose);}
context.FPS.models.batch=()=>({root:new T.Group().add(batch)});
context.createInstance({id:'bounds',model:'batch',position:[0,0,0]});
assert(geometry.boundingBox&&geometry.boundingSphere&&batch.boundingSphere);
let rescans=0;batch.computeBoundingSphere=()=>{rescans++;};
const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4());
frustum.intersectsObject(batch);frustum.intersectsObject(batch);assert.equal(rescans,0);
const preserved=batch.boundingSphere;context.createInstance({id:'preserved',model:'batch'});assert.equal(batch.boundingSphere,preserved,'覆盖了模型自有风动/动画范围');
geometry.dispose();batch.material.dispose();batch.dispose();
console.log('PASS 原实例装配预计算包围体, 首次视锥查询无实例扫描, 保留模型自有保守包围范围');

// 分桶优化对照独立的全路段扫描, 包含负坐标/跨桶/零长路段和不同宽度.
const grass=readFileSync(new URL('../models/mountain-grass.js',import.meta.url),'utf8');
const start=grass.indexOf('  const routeCells='),end=grass.indexOf('  // 插值和对角线',start);
assert(start>=0&&end>start);
const brute=`
  function shoulder(x,z) {
    let gap=Infinity;
    for(const path of o.paths??[])for(let i=1;i<path.points.length;i++) {
      const a=path.points[i-1],b=path.points[i],dx=b[0]-a[0],dz=b[2]-a[2],length=dx*dx+dz*dz;
      const t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/length)):0;
      gap=Math.min(gap,Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t)-path.width/2);
    }
    return gap;
  }
`;
function generate(source,options) {
  const c=vm.createContext({FPS:{models:{}}});vm.runInContext(source,c);
  const model=c.FPS.models.mountainGrass(T,options);
  try {return model.root.children.map(n=>({count:n.count,matrices:[...n.instanceMatrix.array],colors:[...n.instanceColor.array]}));}
  finally {model.dispose?.();model.root.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});}
}
const bruteSource=grass.slice(0,start)+brute+grass.slice(end);
for(const paths of [[],[{width:2.2,points:[[-12,3,-10],[12,3,10]]}],
  [{width:4.6,points:[[-8,3,-12],[-8,3,12],[8,3,12]]},{width:.4,points:[[0,3,0],[0,3,0],[8,3,0]]}]]) {
  const options={bounds:[-16,-16,16,16],heights:[3,3,3,3],paths,woodland:[[6,6,4]],spacing:.7};
  assert.deepEqual(generate(grass,options),generate(bruteSource,options),'道路索引改变了草丛数量/根部朝向/随机颜色');
}
console.log('PASS 道路空间索引与独立全路段扫描的实际草丛矩阵/数量/色彩完全一致');
