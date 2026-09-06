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

- 常驻动画可返回 `update(dt, api)`, 仅在游戏进行时更新, `dt` 单位秒; 不创建计时器或额外动画循环. 静态模型不必提供回调.
- `attach: 'camera'` 挂载第一人称武器, 接收 `{ time, walk, recoil, reload }`, 可返回 `muzzle`. 参考 `rifle.js`; 保留两场景的主人物, 调试飞行时暂时隐藏武器.
- 敌人返回 `alive`, `damage(amount, api)`, `update`; `damage` 会使实例计入敌方目标. API 有 `player`, `eye()`, `move(root, dx, dz, radius, height)`, `visible(from, to)`, `shoot(from, direction, team, damage)`, `effect(name, options)`, `killed(actor)`. 方向需归一化, `team` 为 `player` 或 `enemy`, 死亡只调用一次 `killed`.
- 临时特效只登记 `catalog`, 通过 `api.effect` 创建; 返回 `duration` 与可选 `update(dt, progress)`, `progress` 为 0–1. 到期由主程序释放, 不与常驻模型共享会被释放的资源. 参考 `tracer.js` / `bulletmark.js`.
- 坐标单位米, Y 向上, 旋转为 XYZ 弧度. `rotation` 默认全零, `scale` 默认全一. 碰撞尺寸用局部坐标, 复杂模型用 `collision.boxes: [{ size, offset }]`; 静态盒仅创建时转换为世界 AABB, 不跟随动画, 斜放会扩大范围.
- 动态身体使用 `collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 }`, 原点在脚底, 需要角色伤害接口. 主程序负责移动/重力/身体阻挡; 射击只认网格三角面, 弹痕用实际命中点与世界法线 (包含实例变换), 装饰线不参与命中或遮挡. 装饰实例不自动成为射击目标. 通用行走支持最高 `STEP_HEIGHT = .28` 米的台阶上下, 仅落地且抬升空间足够时自动登阶; 跳跃和高处跌落仍受重力控制.
- 避免可见表面共面, 否则移动时闪烁. 大量重复构件用 `InstancedMesh`, 静态构件按材质合并; 不用逐帧补丁掩盖建模问题.

## 当前场景与排查

- 镰仓: `mode: 'combat'`, 4 名敌人, 复用 `enemy.js`; 电车停靠, 凸面镜为示意倒影. `kamakura-ground.js` 管轨道; 海面, 云, 岛屿, 花叶各有独立文件. 电线/裂纹合批, 天空后绘制以利用深度遮挡. `staticShadow` 缓存静态阴影, 敌人通过 `options.castShadow: false` 避免留下固定投影; 启用动态投影或移动光源时须关闭缓存. 性能参数为云 `steps` 和 `atmosphere.pixelRatio`.
- 工业: `?scene=industrial`, 6 名敌人及出生点 4 个木箱. `mode: 'explore'` 会禁用射击并隐藏战斗 HUD, 不要误用于当前两场景.
- B 开启免伤穿墙飞行与碰撞线框, Space/Ctrl 升降; 退出时检查支撑, 必要时回出生点. `FPS.inspect()` 查看实例/碰撞/错误. 单模块失败由页面错误面板报告并隔离, 不在 HTML 补兜底模型.
- 默认只做语法/静态检查和 Git 差异检查. 实际运行由用户验证; 获得明确授权后才运行浏览器或 `npm test` (仅工业场景), 产物放已忽略的 `artifacts/`. 未运行必须如实说明.
