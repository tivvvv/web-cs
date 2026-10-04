// 真实间隔计数与整帧统计回归. 固定时钟验证口径, 不启动浏览器或伪造 GPU 帧数.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('const frameStats ='),html.indexOf('const STEP_HEIGHT'));
const c=vm.createContext({});vm.runInContext(source+'globalThis.stats=frameStats;',c);const stats=c.stats;
const draw={calls:120,triangles:300000},near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function feed(intervals){stats.reset();stats.record(0,true,2,4,draw);for(const ms of intervals)stats.record(ms,true,2,4,draw);return stats.snapshot();}
assert.equal(stats.snapshot().fps,null,'首帧必须显示等待采样');
for(const rate of [5,10,20,30,60,120,240]) {
 const s=feed(Array(240).fill(1000/rate));near(s.fps,rate);near(s.frameMs,1000/rate);near(s.p95FrameMs,1000/rate);near(s.low1Fps,rate);
 assert(s.over50ms===(rate<20?s.samples:0));near(s.cpuLogicMs,2);near(s.cpuRenderMs,4);
}
const uneven=feed(Array.from({length:40},(_,i)=>i%2?100:10));near(uneven.fps,1000/55);near(uneven.p95FrameMs,100);near(uneven.low1Fps,10);
assert.equal(uneven.calls,120);assert.equal(uneven.triangles,300000);assert.equal(uneven.over50ms,20);
const spike=feed([...Array(100).fill(10),500]);near(spike.fps,101000/1500);near(spike.low1Fps,2000/510);assert.equal(spike.maxFrameMs,500);
assert.equal(spike.over50ms,1,'卡顿帧被物理上限裁剪');
feed(Array(1000).fill(1000/240));let s=stats.snapshot();assert(s.samples<=720&&s.windowMs<=3005,'滚动窗口没有限制内存/时长');
feed(Array(30).fill(100));for(let i=0;i<240;i++)stats.record(10,true,2,4,draw);assert.equal(stats.snapshot().maxFrameMs,100);
for(let i=0;i<61;i++)stats.record(10,true,2,4,draw);assert.equal(stats.snapshot().maxFrameMs,10,'旧卡顿没有离开三秒窗口');
stats.record(60000,false,2,4,draw);assert.equal(stats.snapshot().samples,0,'暂停帧混入统计');
stats.record(60000,true,2,4,draw);assert.equal(stats.snapshot().fps,null,'恢复首帧计算了暂停时间');
stats.record(20,true,2,4,draw);near(stats.snapshot().fps,50);
stats.record(0,true,2,4,draw);stats.record(NaN,true,2,4,draw);assert.equal(stats.snapshot().samples,1,'无效间隔计入分母');
stats.record(20,true,2,4,draw,1);assert.equal(stats.snapshot().samples,0,'自由飞行切换没有清除混合数据');
stats.record(20,true,2,4,draw,1);near(stats.snapshot().fps,50);
stats.record(20,true,2,4,draw,3);assert.equal(stats.snapshot().samples,0,'敌人状态切换没有清除混合数据');
console.log('PASS 5~240 FPS 真实间隔/加权计数, P95/1% LOW/长帧/有界窗口, 暂停与状态隔离');

// 原帧函数同时覆盖物理上限, 世界/后处理/武器累计和 CPU 阶段; 桩值不作为实测结果.
const document={hidden:false},f=vm.createContext({document});
vm.runInContext(`
 let clock=0,last=0,time=0,mode='playing',enemiesEnabled=true,hudElapsed=0;
 let cooldown=0,reloadLeft=0,recoil=0,recoilSpeed=0,firing=false,total=0,kills=0,hurt=0,hit=0,toastLeft=0,hurtSource,yaw=0;
 const effects=[],entries=[],player={debug:false},api={flash:{intensity:0}},steps=[];
 const scene={updateMatrixWorld(){},background:{}},camera={layers:{set(){}}},weapon={root:{visible:true}};
 const info={render:{calls:0,triangles:0},autoReset:true,reset(){this.render.calls=this.render.triangles=0;}};
 const renderer={info,shadowMap:{},clearDepth(){},render(){if(info.autoReset)info.reset();info.render.calls+=2;info.render.triangles+=12;clock+=1;}};
 const performance={now:()=>clock},$=()=>({style:{},classList:{toggle(){}}});
 function updatePlayer(dt){steps.push(dt);clock+=3;} function separateBodies(){} function syncPlayerCamera(){} function finish(){}
 function updateBodyWireframes(){clock+=2;} function updateHUD(){clock+=1;}
 function renderWorld(){info.render.calls+=5;info.render.triangles+=500;clock+=4;}
 ${source}
 ${html.slice(html.indexOf('function frame(stamp)'),html.indexOf('async function prepareScene()'))}
 globalThis.test={frame,steps,info,stats:frameStats,mode:v=>mode=v,debug:v=>player.debug=v};
`,f);
const t=f.test;t.frame(1000);for(let i=1;i<=20;i++)t.frame(1000+i*200);
s=t.stats.snapshot();near(s.fps,5);near(s.frameMs,200);assert.equal(s.calls,7);assert.equal(s.triangles,512);
near(s.cpuLogicMs,6);near(s.cpuRenderMs,5);assert(t.steps.slice(1).every(dt=>dt===.05),'统计校准更改了物理上限');assert.equal(t.info.autoReset,false);
t.mode('paused');t.frame(60000);assert.equal(t.stats.snapshot().samples,0);
t.mode('playing');t.frame(120000);assert.equal(t.stats.snapshot().fps,null);t.frame(120000+1000/60);near(t.stats.snapshot().fps,60);
document.hidden=true;t.frame(200000);assert.equal(t.stats.snapshot().samples,0,'后台帧没有隔离');
document.hidden=false;t.frame(200016);t.frame(200032);near(t.stats.snapshot().fps,62.5);
t.debug(true);t.frame(200048);assert.equal(t.stats.snapshot().samples,0);
console.log('PASS 原帧循环保留 50ms 物理上限, 整帧多次绘制累计, CPU 分段与暂停/后台/调试隔离');
