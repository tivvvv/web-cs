// 所有初始场景实例均在此声明. 距离单位为米, Y 轴向上, 旋转单位为弧度.
// 几何体与碰撞尺寸均使用局部坐标, 统一应用实例根节点的变换.
// 掩体碰撞按底座, 墙身和顶盖分层, 集装箱碰撞包含结构边框.
window.FPS_LAYOUT = {
  name: '零界 · 工业训练场',
  catalog: {
    floor: 'models/floor.js', building: 'models/building.js',
    container: 'models/container.js', barrier: 'models/barrier.js',
    rifle: 'models/rifle.js', enemy: 'models/enemy.js', crate: 'models/crate.js',
    tracer: 'models/tracer.js', flash: 'models/flash.js', impact: 'models/impact.js', bulletmark: 'models/bulletmark.js'
  },
  player: { position: [0, 0, 22], yaw: 0, pitch: -.025 },
  atmosphere: { sky: 0xc3cdc1, fogNear: 28, fogFar: 95, exposure: 1.12 },
  lights: [
    { type: 'hemisphere', sky: 0xe0ebdb, ground: 0x616955, intensity: 2.2, position: [0, 20, 0] },
    { type: 'sun', color: 0xffe2af, intensity: 3.2, position: [-18, 28, 14], target: [0, 0, -5], shadow: true }
  ],
  instances: [
    { id: 'crate-left', model: 'crate', position: [-4, 0, 17], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, size: [1.6, 1.6, 1.6], offset: [0, .8, 0] } },
    { id: 'crate-top', model: 'crate', position: [-4, 1.6, 17], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], collision: { enabled: true, size: [1.6, 1.6, 1.6], offset: [0, .8, 0] } },
    { id: 'crate-middle', model: 'crate', position: [-2.2, 0, 17], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, size: [1.6, 1.6, 1.6], offset: [0, .8, 0] } },
    { id: 'crate-right', model: 'crate', position: [3, 0, 19], rotation: [0, Math.PI / 2, 0], scale: [.75, 1, .75], collision: { enabled: true, size: [1.6, 1.6, 1.6], offset: [0, .8, 0] } },
    { id: 'yard', model: 'floor', position: [0, -.25, 0], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, size: [52, .5, 60] } },
    { id: 'north', model: 'building', position: [0, 0, -31.5], rotation: [0, 0, 0], scale: [54, 8, 3], options: { label: '04 / ZERO LINE' }, collision: { enabled: true, size: [1, 1, 1], offset: [0, .5, 0] } },
    { id: 'west', model: 'building', position: [-27.5, 0, 0], rotation: [0, Math.PI / 2, 0], scale: [60, 5, 3], collision: { enabled: true, size: [1, 1, 1], offset: [0, .5, 0] } },
    { id: 'east', model: 'building', position: [27.5, 0, 0], rotation: [0, -Math.PI / 2, 0], scale: [60, 6.5, 3], collision: { enabled: true, size: [1, 1, 1], offset: [0, .5, 0] } },
    { id: 'south', model: 'building', position: [0, 0, 31.5], rotation: [0, Math.PI, 0], scale: [54, 4, 3], options: { label: 'ENTRY / 01' }, collision: { enabled: true, size: [1, 1, 1], offset: [0, .5, 0] } },
    { id: 'tower-left', model: 'building', position: [-22, 0, -26], rotation: [0, 0, 0], scale: [6, 13, 7], options: { label: 'A' }, collision: { enabled: true, size: [1, 1, 1], offset: [0, .5, 0] } },
    { id: 'tower-right', model: 'building', position: [21, 0, -27], rotation: [0, 0, 0], scale: [7, 10, 5], options: { label: 'B' }, collision: { enabled: true, size: [1, 1, 1], offset: [0, .5, 0] } },
    { id: 'cargo-left', model: 'container', position: [-9, 0, 1], rotation: [0, 0, 0], scale: [1.4, 1.1, 1.6], options: { label: 'A-01' }, collision: { enabled: true, size: [3.14, 3, 6.125], offset: [0, 1.5, 0] } },
    { id: 'cargo-right', model: 'container', position: [10, 0, -10], rotation: [0, Math.PI / 2, 0], scale: [1.3, 1.1, 1.3], options: { color: 0xa16047, label: 'B-02' }, collision: { enabled: true, size: [3.14, 3, 6.125], offset: [0, 1.5, 0] } },
    { id: 'cargo-back', model: 'container', position: [-9, 0, -20], rotation: [0, Math.PI / 2, 0], scale: [1.2, 1, 1.3], options: { label: 'C-03' }, collision: { enabled: true, size: [3.14, 3, 6.125], offset: [0, 1.5, 0] } },
    { id: 'cover-front', model: 'barrier', position: [5, 0, 11], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, boxes: [{ size: [3.6, .35, 1.1], offset: [0, .175, 0] }, { size: [3.5, .9, .72], offset: [0, .8, 0] }, { size: [3.6, .15, .82], offset: [0, 1.325, 0] }] } },
    { id: 'cover-left', model: 'barrier', position: [-3, 0, -7], rotation: [0, 0, 0], scale: [1.2, 1, 1], collision: { enabled: true, boxes: [{ size: [3.6, .35, 1.1], offset: [0, .175, 0] }, { size: [3.5, .9, .72], offset: [0, .8, 0] }, { size: [3.6, .15, .82], offset: [0, 1.325, 0] }] } },
    { id: 'cover-right', model: 'barrier', position: [17, 0, 6], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1], collision: { enabled: true, boxes: [{ size: [3.6, .35, 1.1], offset: [0, .175, 0] }, { size: [3.5, .9, .72], offset: [0, .8, 0] }, { size: [3.6, .15, .82], offset: [0, 1.325, 0] }] } },
    { id: 'cover-back', model: 'barrier', position: [4, 0, -23], rotation: [0, 0, 0], scale: [1.5, 1, 1], collision: { enabled: true, boxes: [{ size: [3.6, .35, 1.1], offset: [0, .175, 0] }, { size: [3.5, .9, .72], offset: [0, .8, 0] }, { size: [3.6, .15, .82], offset: [0, 1.325, 0] }] } },
    { id: 'e1', model: 'enemy', position: [-3, 0, -2], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 }, options: { speed: 1.8, fireInterval: 1.2 } },
    { id: 'e2', model: 'enemy', position: [8, 0, -1], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 } },
    { id: 'e3', model: 'enemy', position: [-15, 0, -10], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 } },
    { id: 'e4', model: 'enemy', position: [3, 0, -17], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 } },
    { id: 'e5', model: 'enemy', position: [17, 0, -18], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 } },
    { id: 'e6', model: 'enemy', position: [-17, 0, 4], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 }, options: { fireInterval: 1.4 } },
    { id: 'view-rifle', model: 'rifle', attach: 'camera', position: [.3, -.3, -.65], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: false } }
  ]
};
