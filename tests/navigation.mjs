// 纯 Node 雷达回归. 执行实际 HUD 代码, 不创建浏览器/GPU.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),source=html.slice(html.indexOf('function drawMap()'),html.indexOf('function updateHUD()'));
for(const position of [[-20,0,10],[60,2.4,68],[140,20,120],[110,2.4,15]]){
 const [x,y,z]=position,calls={arcs:[],rects:[],translations:[],clears:0},c={clearRect(){calls.clears++;},fillRect(...r){calls.rects.push(r);},arc(...p){calls.arcs.push(p);},translate(...p){calls.translations.push(p);}};
 for(const method of ['beginPath','moveTo','lineTo','stroke','fill','save','restore','rotate','closePath'])c[method]=()=>{};
 const box=(a,b)=>({box:{min:{x:a[0],y:a[1],z:a[2]},max:{x:b[0],y:b[1],z:b[2]}}}),solid=[box([x+3,y,z+2],[x+4,y+2,z+3]),box([x+100,y,z],[x+102,y+3,z+2]),box([x-200,-10,z-200],[x+200,y,z+200]),box([x,y+3,z],[x+2,y+4,z+2])];
 const actors=[{alive:true,root:{position:{x:x+10,y:y+3,z:z+8}}},{alive:true,root:{position:{x:x+300,y,z}}}],context=vm.createContext({layout:{mode:'combat'},player:{position:{x,y,z}},solid,actors,yaw:0,$:()=>({getContext:()=>c})});
 vm.runInContext(source,context);context.drawMap();assert.equal(calls.rects.length,1,'地面/远处/头顶碰撞污染雷达或漏绘近景');assert.equal(calls.arcs.length,1,'四区近处目标丢失或画入远目标');assert.deepEqual(calls.translations[0],[166,166],'玩家没有保持居中');assert(Math.abs(calls.arcs[0][0]-212.5)<1e-8&&Math.abs(calls.arcs[0][1]-203.2)<1e-8);
 context.layout.mode='explore';context.drawMap();assert.equal(calls.clears,1,'隐藏雷达仍在绘制');
}
console.log('PASS 四区雷达坐标/玩家居中/近处目标/高差标记/远物与地面剔除/隐藏零绘制');
