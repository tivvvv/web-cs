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

加载链: 场景配置 → `catalog` 加载普通脚本 → `instances` 调用工厂 → `frame` 调用模型回调. 改造型只改模型, 改摆放只改场景, 只有通用能力缺失才改 HTML. `load()` 为所有脚本附加版本戳, 避免 file:// 缓存旧代码.

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
- 入场前会异步编译全部材质, 在 32² 离屏缓冲上传所有可见模型资源并等待 GPU 完成. 可返回 `prepare(renderer, scene, camera)` 提前初始化模型私有缓冲/后处理着色器; 进入按钮在准备完成后启用, 准备异常仍隔离单模块.
- 辅助渲染可返回 `beforeRender(renderer, scene, camera)`, 在世界渲染前调用; 必须恢复渲染状态, 用 `dispose()` 释放自有资源. `character-shadows.js` 独立更新角色深度图, 玩家简化身体仅参与投影.
- 场景至多一个模块可返回 `render(renderer, scene, camera)` 接管世界渲染, 可附 `dispose()` 释放自有缓冲; 异常时禁用并恢复普通渲染. 参考 `sun-rays.js`: 全视角半分辨率接触遮蔽与深度感知合成, 法线差分避开深度断层, 固定采样方向并按像素世界尺寸过滤远处细构件的阴影; 迎光时低分辨率计算光束, 武器/HUD 始终在后续通用流程中绘制; 缺少浮点缓冲支持时恢复普通渲染.
- `attach: 'camera'` 挂载第一人称武器, 接收 `{ time, walk, recoil, reload }`, 可返回 `muzzle`. 参考 `rifle.js`; 保留两场景的主人物, 调试飞行时暂时隐藏武器.
- 敌人返回 `alive`, `damage(amount, api)`, `update`; `damage` 会使实例计入敌方目标. API 有 `player`, `eye()`, `move(root, dx, dz, radius, height)`, `visible(from, to)`, `shoot(from, direction, team, damage)`, `effect(name, options)`, `killed(actor)`. 方向需归一化, `team` 为 `player` 或 `enemy`, 死亡只调用一次 `killed`.
- 可破坏物返回 `onHit(hit, api)`, 不使用敌人的 `damage`; `hit` 含射线命中信息及 `direction/normal/damage/team`, 返回 `{ bulletmark: false, impact: false }` 可分别取消默认弹痕和火花, 水面通过 `onHit` 触发独立 `water-splash.js`. 物体需配置碰撞以进入射击目标, 参考 `street-lamp.js`; 碎片通过独立临时特效生成.
- 临时特效只登记 `catalog`, 通过 `api.effect` 创建; 返回 `duration` 与可选 `update(dt, progress)`, `progress` 为 0–1. 到期由主程序释放, 不与常驻模型共享会被释放的资源. 参考 `tracer.js` / `bulletmark.js`.
- 坐标单位米, Y 向上, 旋转为 XYZ 弧度. `rotation` 默认全零, `scale` 默认全一. 碰撞尺寸用局部坐标, 复杂模型用 `collision.boxes: [{ size, offset }]`; 静态盒仅创建时转换为世界 AABB, 不跟随动画, 斜放会扩大范围.
- 动态身体使用 `collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 }`, 原点在脚底, 需要角色伤害接口. 主程序负责移动/重力/身体阻挡; 射击只认网格三角面, 弹痕用实际命中点与世界法线 (包含实例变换), 装饰线不参与命中或遮挡. 装饰实例不自动成为射击目标. 通用行走支持最高 `STEP_HEIGHT = .28` 米的台阶上下, 仅落地且抬升空间足够时自动登阶; 跳跃和高处跌落仍受重力控制.
- 花叶与 `low-hedge.js` 灌木冠层不设碰撞; 花坛, 景石, 树干和围栏保持实体碰撞, 外围墙负责地图边界.
- 避免可见表面共面, 否则移动时闪烁. 大量重复构件用 `InstancedMesh`, 静态构件按材质合并; 不用逐帧补丁掩盖建模问题.

## 当前场景与排查

- 镰仓: `mode: 'combat'`, 4 名敌人, 复用 `enemy.js`; 电车停靠, 道口注意牌使用程序图案. `kamakura-ground.js` 管轨道; 海面, 云, 岛屿, 花叶各有独立文件. 电线/裂纹合批, 天空后绘制以利用深度遮挡; `coastal-sky.js` 提供程序环境贴图供漆面/玻璃/金属反光. `staticShadow` 缓存环境阴影, `characterShadows` 用独立 1024² 深度图更新玩家附近的角色投影; 敌人 `castShadow: false` 避免被写入环境缓存. 移动光源时须关闭静态缓存. 性能参数为云 `steps` 和 `atmosphere.pixelRatio`.
- 工业: `?scene=industrial`, 6 名敌人及出生点 4 个木箱. `mode: 'explore'` 会禁用射击并隐藏战斗 HUD, 不要误用于当前两场景.
- 总图四角各 100×76 米, 中间留 20 米十字连接带与中心广场; 西南为现有海滨车站, 西北为神社公园, 东北商店街, 东南渔港. `scene-kamakura.js` 的 `regionPlan` 记录分区; `district-ground.js` 生成扩展三区和连接带的基础平地及外围挡墙, 顶面 Y=2.4, 通过站区北/东侧开口相连. 原站区坐标不变, 12 级楼梯连接低处车站与住宅台地; `neighborhood` 配置尺寸/碰撞, `station-neighborhood.js` 管台地, `coastal-beach.js` 管沙滩. 不生成外围山坡和隧道.
- 西北公园位于 X=-49.3~49.3, Z=78~153.4, 从住宅北口沿参道进入; `scene-kamakura.js` 的 `parkSurfaces` 管草地/石板/砂砾分区. 新增模型为 `shrine-park-ground`, `shrine-torii`, `park-shrine`, `temizuya`, `park-pavilion`, `stone-lantern`, `park-sign`, 均为独立文件; 铺装区树池和长椅复用现有模型, 公园乔木使用独立细叶模型. 西侧枯山水 (`dry-garden` / `landscape-rocks` / `dry-garden-court`), 东侧花境 (`park-flowerbed`) 和绘马架 (`ema-rack`) 同样独立; 景石尺寸/位置由 `gardenStones` 共用给模型与碰撞, 三组苔岛/砂纹共用 `gardenIslands`. 东侧湖面约 36×40 米, 用 `park-pond.js`; 横向步道由独立 `park-bridge.js` 的 40 米湖心三孔石拱桥连接 (拱高 2.4 米), 配置 `pondCut/shore` 共用挖地与碰撞, `parkSurfaces` 的 -1 表示留空; 岸线纹理初始化生成, 湖水细波纹只更新模型时间参数, 近岸且湖面包围盒与相机视锥相交时使用 768×512 平面倒影, 更新上限 30 Hz; 反射时隐藏水面并裁去水下景物, 复用静态太阳阴影, 恢复渲染目标/阴影状态. `lake-fence.js` 用石柱木横栏衔接桥栏, 低栏外观与较高的防越界碰撞分开配置, 不开放下水; `pond-lotus.js` 管近岸荷叶/荷花, `water-iris.js` 管水生鸢尾; 中弹水花与水面涟漪各限 6 组; `pond-koi.js` 管湖心锦鲤巡游与定时跃出水面 (起跳落水各触发一次 `waterSplash`), 巡游避开桥带与水中景石, 拖尾涟漪用自有对象池不占用中弹水位, 石灯笼灯室为自发光渐变芯, 仍无实时灯光. 东口接预留商街, 其余两区仍留白.
- 海滨树木与草地: 榉树采用分枝/细叶冠层, 樱花用程序生成的透明圆瓣花簇; 草坪补实例化短草. 公园乔木/榉树/樱花的透明纹理使用 RGB 扩边与 mipmap, 保留原始 alpha; 线性 MSAA 世界缓冲的覆盖率在裁切阈值两侧对称平滑, 原生画布与单采样倒影保持硬裁切, 亚像素叶片/花簇的法线逐渐平滑到树冠方向. 两区叶片/草叶通过材质的 `onBeforeCompile` 透光与风动, 仍由主循环推进; 叶片不参与射线碰撞. 车站木椅补木纤维与结疤, 月台与铺装使用微凹凸颗粒.
- 公园林地: 45 棵主树使用 `park-tree.js` 的分枝/细叶/树皮, 按入口/西侧/北侧分群; `low-hedge.js` 的 `dense/natural` 选项仅公园启用, `park-ferns.js` 的羽状蕨类与林下苔土共用 `woodlandPatches`, 避让园路和设施, 仅神社铺装区保留一处围栏树池; `parkTrails` 为 6 条采样曲线, 地面纹理与地被避让共用. `shrine-park-ground.js` 使用 2048² 世界纹理绘制草色/裸土/苔缝/园路, 叠加小纹理补近景细粒; `park-terrain.js` 的连续缓丘与细支撑格共用 `parkTerrainCells`, 曲面法线平滑, 1024² 草纹按世界坐标绘制树下裸土; `park-trail-stones.js` 管实体踏石, `park-groundcover.js` 的实例化草丛与落叶避开园路/铺装/湖区, 岸草通过 `water` 闭合多边形避水, 设施与桥口由 `exclusions` 留空. 南岸荷花湾, 北东岸 `park-reeds.js` 芦苇, 西北叠石岸, 东岸 `park-viewing-deck.js` 开放木平台; 保留闭合湖岸碰撞与桥口通行. 神社/木亭/观景台有独立木纹和石/瓦面材质, 鸟居双面竖额与神社牌匾的文字直接绘制在实体盒的 Z 面, 不叠加近平面的底板/贴片; 神社前墙按四处门洞分段, 格门横档在竖条前方分层; 湖岸景石保留折面和风化苔色; 枯山水为 20×10 米白砂庭, 七石分为左后主峰/左前小岛/右侧卧石三组, 主峰露出砂面 1.95 米; `landscape-rocks` 的 `weathered` 用不对称斜断面/空间噪声风化塑形, 折面法线按夹角平滑, `exactHeight` 校准顶面, 石块尺寸与碰撞共用. `dry-garden` 的 `islands` 共用三组起伏苔岛/回纹轮廓, 白砂按轮廓挖空, 碎石仅绘制边带, 避免近平面叠面; 2048² 砂色与独立凹凸图生成平行耙纹和六道回纹. `dry-garden-court` 生成低瓦墙/短竹垣/南侧观景石铺地, 北墙保留手水舍入口, 尺寸与碰撞共用 `dryGarden`, 植被避让覆盖庭院和观景区.
- 公园背景与手水舍: `park-bamboo.js` 按 `bambooClumps` 生成错落竹竿/节环/细叶, 静态合批与实例化; `park-garden-wall.js` 包覆西/北外围墙, 原墙负责边界, 瓦帽单独配置碰撞. `temizuya.js` 分木/石/瓦/竹材质, 竹管流水和两圈水纹只通过模型 `update` 推进, 不创建逐帧对象或额外水体渲染.
- B 开启免伤穿墙飞行与碰撞线框, Space/Ctrl 升降; 退出时检查支撑, 必要时回出生点. `FPS.inspect()` 查看实例/碰撞/错误. 单模块失败由页面错误面板报告并隔离, 不在 HTML 补兜底模型.
- 默认只做语法/静态检查和 Git 差异检查. 实际运行由用户验证; 获得明确授权后才运行浏览器或 `npm test` (工业场景) 或 `npm run test:park` (公园接入/路径/地形/湖岸/枯山水入口检查) 或 `npm run test:rendering` (转向资源预热/倒影剔除与限频/景石高度/砂面挖空回归) 或 `npm run test:surfaces` (格门共面/门洞/牌匾深度遮挡与实际阴影下门面走近/横移明暗稳定回归) 或 `npm run test:foliage` (三类树冠微转向轮廓误差/面积、透明纹理扩边与风动回归), 产物放已忽略的 `artifacts/`. 未运行必须如实说明.
