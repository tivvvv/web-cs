# 零界 / ZERO LINE

离线 Three.js 第一人称游戏. 保留整个目录, 双击 `index.html`; 无需安装或联网. 默认镰仓高校前, 菜单可切换工业训练场. WASD 移动, 鼠标观察/左键射击, R 换弹, Space 跳跃, Shift 奔跑, Esc 暂停. 鼠标锁定失败时按住右键观察.

## 从哪里继续开发

先读 [agent.md](agent.md), 然后只读本页与本次修改涉及的源码. 文档只保留接口和约束, 不记录逐次开发历史或复述实现细节.

| 文件 | 职责 / 修改入口 |
| --- | --- |
| `index.html` | `boot` 加载, `createInstance` 装配, `frame` 唯一主循环; 通用玩家控制, 物理, 射击, 音效, HUD, 调试和容错 |
| `scene-kamakura.js` / `scene-layout.js` | 镰仓 / 工业场景; `catalog`, `instances`, 玩家出生点, 光照, 环境和介绍 |
| `models/` | 程序模型及其材质/纹理/动画; `rifle.js` 是主人物手臂与武器, `enemy.js` 是敌人行为 |
| `tools/build-vendor.mjs` → `vendor/` | Three.js 精简导出与离线产物; 缺少 API 时补导出并执行 `npm run build:vendor`, 不手改产物 |

加载链: 场景配置 → `catalog` 加载普通脚本 → `instances` 调用工厂 → `frame` 调用模型回调. 改造型只改模型, 改摆放只改场景, 只有通用能力缺失才改 HTML.

## 新增单文件 / 文件夹模块

1. 简单模块用 `models/beacon.js`; 需要独立目录时用 `models/beacon/index.js`. 文件夹只是组织方式, 入口仍自包含, 不自动扫描目录. 禁用运行时 import/export, fetch 和跨模型依赖, 保证 `file://` 可用.
2. 入口注册工厂, 返回 `root`; 几何体和材质全部留在该文件:

```js
FPS.models.beacon = (T, options) => {
  const root = new T.Group();
  const mesh = new T.Mesh(new T.BoxGeometry(1, 1, 1),
    new T.MeshStandardMaterial({ color: options.color ?? 0x668877 }));
  mesh.position.y = .5;
  root.add(mesh);
  return { root };
};
```

3. 在目标场景的 `catalog` 增加 `beacon: 'models/beacon/index.js'`, 在 `instances` 增加:

```js
{ id: 'beacon-1', model: 'beacon', position: [0, 0, 10],
  options: { color: 0x668877 },
  collision: { enabled: true, size: [1, 1, 1], offset: [0, .5, 0] } }
```

这样无需修改主循环. 注册名与 `model` 对应, 实例 `id` 唯一; 同模型可重复实例化. 修改后刷新页面.

## 必要接口与边界

- 清空敌人后结算胜利. 游玩中按 U 移除所有敌人 (不触发胜利), 再按 U 按初始配置满血刷新并重置击杀数; 不重置玩家状态.
- 常驻动画可返回 `update(dt, api)`, 仅在游戏进行时更新, `dt` 单位秒; 不创建计时器或额外动画循环. 静态模型不必提供回调.
- 辅助渲染可返回 `beforeRender(renderer, scene, camera)`, 在世界渲染前调用; 必须恢复渲染状态, 用 `dispose()` 释放自有资源. `character-shadows.js` 独立更新角色深度图, 玩家简化身体仅参与投影.
- 场景至多一个模块可返回 `render(renderer, scene, camera)` 接管世界渲染, 可附 `dispose()` 释放自有缓冲; 异常时禁用并恢复普通渲染. 参考 `sun-rays.js`: 迎光时低分辨率计算光束, 背光直接绘制, 武器/HUD 始终在后续通用流程中绘制.
- `attach: 'camera'` 挂载第一人称武器, 接收 `{ time, walk, recoil, reload }`, 可返回 `muzzle`. 参考 `rifle.js`; 保留两场景的主人物, 调试飞行时暂时隐藏武器.
- 敌人返回 `alive`, `damage(amount, api)`, `update`; `damage` 会使实例计入敌方目标. API 有 `player`, `eye()`, `move(root, dx, dz, radius, height)`, `visible(from, to)`, `shoot(from, direction, team, damage)`, `effect(name, options)`, `killed(actor)`. 方向需归一化, `team` 为 `player` 或 `enemy`, 死亡只调用一次 `killed`.
- 可破坏物返回 `onHit(hit, api)`, 不使用敌人的 `damage`; `hit` 含射线命中信息及 `direction/normal/damage/team`, 返回 `{ bulletmark: false, impact: false }` 可分别取消默认弹痕和火花, 水面通过 `onHit` 触发独立 `water-splash.js`. 物体需配置碰撞以进入射击目标, 参考 `street-lamp.js`; 碎片通过独立临时特效生成.
- 临时特效只登记 `catalog`, 通过 `api.effect` 创建; 返回 `duration` 与可选 `update(dt, progress)`, `progress` 为 0–1. 到期由主程序释放, 不与常驻模型共享会被释放的资源. 参考 `tracer.js` / `bulletmark.js`.
- 坐标单位米, Y 向上, 旋转为 XYZ 弧度. `rotation` 默认全零, `scale` 默认全一. 碰撞尺寸用局部坐标, 复杂模型用 `collision.boxes: [{ size, offset }]`; 静态盒仅创建时转换为世界 AABB, 不跟随动画, 斜放会扩大范围.
- 动态身体使用 `collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 }`, 原点在脚底, 需要角色伤害接口. 主程序负责移动/重力/身体阻挡; 射击只认网格三角面, 弹痕用实际命中点与世界法线 (包含实例变换), 装饰线不参与命中或遮挡. 装饰实例不自动成为射击目标. 通用行走支持最高 `STEP_HEIGHT = .28` 米的台阶上下, 仅落地且抬升空间足够时自动登阶; 跳跃和高处跌落仍受重力控制.
- 花叶与 `low-hedge.js` 灌木冠层不设碰撞; 花坛, 景石, 树干和围栏保持实体碰撞, 外围墙负责地图边界.
- 避免可见表面共面, 否则移动时闪烁. 大量重复构件用 `InstancedMesh`, 静态构件按材质合并; 不用逐帧补丁掩盖建模问题.

## 当前场景与排查

- 镰仓: `mode: 'combat'`, 4 名敌人, 复用 `enemy.js`; 电车停靠, 道口注意牌使用程序图案. `kamakura-ground.js` 管轨道; 海面, 云, 岛屿, 花叶各有独立文件. 电线/裂纹合批, 天空后绘制以利用深度遮挡. `staticShadow` 缓存环境阴影, `characterShadows` 用独立 1024² 深度图更新玩家附近的角色投影; 敌人 `castShadow: false` 避免被写入环境缓存. 移动光源时须关闭静态缓存. 性能参数为云 `steps` 和 `atmosphere.pixelRatio`.
- 工业: `?scene=industrial`, 6 名敌人及出生点 4 个木箱. `mode: 'explore'` 会禁用射击并隐藏战斗 HUD, 不要误用于当前两场景.
- 总图四角各 100×76 米, 中间留 20 米十字连接带与中心广场; 西南为现有海滨车站, 西北为神社公园, 东北商店街, 东南渔港. `scene-kamakura.js` 的 `regionPlan` 记录分区; `district-ground.js` 生成扩展三区和连接带的基础平地及外围挡墙, 顶面 Y=2.4, 通过站区北/东侧开口相连. 原站区坐标不变, 12 级楼梯连接低处车站与住宅台地; `neighborhood` 配置尺寸/碰撞, `station-neighborhood.js` 管台地, `coastal-beach.js` 管沙滩. 不生成外围山坡和隧道.
- 西北公园位于 X=-49.3~49.3, Z=78~153.4, 从住宅北口沿参道进入; `scene-kamakura.js` 的 `parkSurfaces` 管草地/石板/砂砾分区. 新增模型为 `shrine-park-ground`, `shrine-torii`, `park-shrine`, `temizuya`, `park-pavilion`, `stone-lantern`, `park-sign`, 均为独立静态文件; 树池/乔木/长椅复用现有模型. 西侧枯山水 (`dry-garden` / `landscape-rocks`), 东侧花境 (`park-flowerbed`) 和绘马架 (`ema-rack`) 同样独立; 景石位置由 `gardenStones` 共用给砂纹与碰撞. 东侧湖面约 36×40 米, 用 `park-pond.js`; 横向步道由独立 `park-bridge.js` 的 40 米湖心三孔石拱桥连接 (拱高 2.4 米), 配置 `pondCut/shore` 共用挖地与碰撞, `parkSurfaces` 的 -1 表示留空; 岸线纹理初始化生成, 湖水细波纹与天空反光只更新模型时间参数, 复用太阳阴影且不增加反射渲染. `lake-fence.js` 用石柱木横栏衔接桥栏, 低栏外观与较高的防越界碰撞分开配置, 不开放下水; `pond-lotus.js` 管近岸荷叶/荷花, `water-iris.js` 管水生鸢尾; 中弹水花与水面涟漪各限 6 组. 东口接预留商街, 其余两区仍留白.
- B 开启免伤穿墙飞行与碰撞线框, Space/Ctrl 升降; 退出时检查支撑, 必要时回出生点. `FPS.inspect()` 查看实例/碰撞/错误. 单模块失败由页面错误面板报告并隔离, 不在 HTML 补兜底模型.
- 默认只做语法/静态检查和 Git 差异检查. 实际运行由用户验证; 获得明确授权后才运行浏览器或 `npm test` (仅工业场景), 产物放已忽略的 `artifacts/`. 未运行必须如实说明.
