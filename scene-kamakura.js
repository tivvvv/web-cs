// 镰仓高校前海岸场景. 所有模型独立成文件, 变换, 碰撞与构图集中在此配置.
(() => {
  const instances = [];
  function place(id, model, position, options = {}, boxes = [], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    instances.push({ id, model, position, rotation, scale, options, collision: boxes.length ? { enabled: true, boxes } : { enabled: false } });
  }
  const box = (size, offset = [0, 0, 0]) => ({ size, offset });
  // 先地面, 再近景主体, 然后远景与植被. 地面上表面为 Y=0.
  place('coastal-ground', 'kamakuraGround', [0, 0, 0], {}, [box([100, .6, 76], [0, -.3, 20]), box([8.2, .17, 4.6], [0, .085, 0])]);
  place('enoden-305', 'enodenTrain', [-13.3, .16, 0], { cars: 2 }, [box([32.45, 3.35, 2.8], [-8.3, 2.05, 0]), box([.65, .24, .28], [8.15, .7, 0]), box([.65, .24, .28], [-24.75, .7, 0])]);
  const canopyLift = .65;
  const platform = [box([34, .76, 3.5], [0, .38, 0]), box([34, 1.04, .08], [0, 1.25, 1.65]), box([29.7, .35, 3.6], [-1, 3.43 + canopyLift, 0])];
  for (let i = 0; i < 4; i++) platform.push(box([.48, .17 * (4 - i), 2.65], [17.23 + i * .48, .085 * (4 - i), .22]));
  for (const x of [-13, -7, -1, 5, 11]) platform.push(box([.13, 2.65 + canopyLift, .14], [x, 2.06 + canopyLift / 2, .65]));
  for (const x of [-10, 0, 9]) platform.push(box([2.3, .92, .67], [x, 1.2, .57]));
  place('kamakura-platform', 'kamakuraStation', [-24.9, 0, 3.9], { canopyLift }, platform);
  place('station-vending-machine', 'vendingMachine', [-39.4, .68, 4.75], {}, [box([1.04, 1.85, .765], [0, .925, .0075])], [0, Math.PI, 0]);
  const crossing = [box([.7, 1.25, .85], [.12, .63, .27]), box([.24, 6.8, .24], [0, 3.4, 0]), box([3.55, .10, .085], [2.155, 1.2, .73])];
  place('crossing-near', 'railwayCrossing', [-4.65, 0, 3], { phase: 0 }, crossing);
  place('crossing-sea', 'railwayCrossing', [4.65, 0, -3], { phase: .55 }, crossing, [0, Math.PI, 0]);
  place('station-wayfinding', 'coastalStreet', [5.25, 0, 5.6], { kind: 'sign' }, [box([1.9, 2.75, .17], [0, 1.38, 0])]);
  place('convex-road-mirror', 'coastalStreet', [6.1, 0, -6.1], { kind: 'mirror' }, [box([.13, 3.8, .13], [0, 1.9, 0])], [0, -.3, 0]);
  place('seafront-railing', 'coastalStreet', [0, 0, -17.7], { kind: 'railing', length: 100 }, [box([100, 1.2, .15], [0, .6, 0])]);
  place('left-lane-wall', 'coastalStreet', [-5.9, 0, 29], { kind: 'wall', length: 44, height: 1.3 }, [box([.54, 1.4, 44], [0, .7, 0])]);
  place('right-garden-wall', 'coastalStreet', [7.4, 0, 31], { kind: 'wall', length: 40, height: .7 }, [box([.54, .8, 40], [0, .4, 0])]);
  place('west-boundary', 'coastalStreet', [-49.6, 0, 20], { kind: 'wall', length: 76, height: 1.8 }, [box([.54, 1.9, 76], [0, .95, 0])]);
  place('east-boundary', 'coastalStreet', [49.6, 0, 20], { kind: 'wall', length: 76, height: 1.8 }, [box([.54, 1.9, 76], [0, .95, 0])]);
  place('inland-boundary', 'coastalStreet', [0, 0, 57.5], { kind: 'wall', length: 100, height: 1.8 }, [box([.54, 1.9, 100], [0, .95, 0])], [0, Math.PI / 2, 0]);
  for (const [i, x, z] of [[0, -13, 14], [1, -16, 30], [2, 15, 20], [3, 17, 39], [4, -31, 23], [5, 30, 26]]) {
    place('coastal-home-' + i, 'coastalStreet', [x, 0, z], { kind: 'house' }, [box([6.3, 6.4, 7.9], [0, 3.2, 0])], [0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]);
  }
  const poles = [-47, -24, 9, 34, 49].map(x => box([.26, 8.4, .26], [x, 4.2, -2.2]));
  const utilityRows = [-15, 12, 54];
  poles.push(...[-7.1, 8].flatMap(x => utilityRows.map(z => box([.3, 10.1, .3], [x, 5.05, z]))));
  place('overhead-wires', 'coastalUtilities', [0, 0, 0], { rows: utilityRows }, poles);
  place('sagami-bay', 'kamakuraOcean', [0, 0, 0]);
  place('enoshima', 'enoshimaIsland', [132, -2, -640]);
  place('summer-clouds', 'coastalSky', [0, 0, 0], { steps: 48 });
  for (let i = 0; i < 10; i++) {
    place('hydrangea-right-' + i, 'coastalFoliage', [5.1 + Math.sin(i * 1.7) * .38, 0, 8.5 + i * 1.85], { seed: 92 + i, color: i % 4 === 0 ? 'blue' : 'pink', blooms: 11 });
  }
  for (let i = 0; i < 5; i++) place('hydrangea-left-' + i, 'coastalFoliage', [-5.1, 0, 10 + i * 4.2], { seed: 507 + i, color: 'blue', blooms: 8 }, [], [0, i, 0], [.8, .8, .8]);
  for (const [i, x, z] of [[0, -8, 9], [1, -8, 24], [2, 10, 31], [3, -21, 18], [4, 24, 14]]) {
    place('coastal-tree-' + i, 'coastalFoliage', [x, 0, z], { kind: 'tree', seed: 701 + i }, [box([.38, 3.3, .38], [0, 1.65, 0])]);
  }
  for (let i = 0; i < 7; i++) place('shore-shrub-' + i, 'coastalFoliage', [12 + i * 3.3, 0, -16.3], { kind: 'shrub', seed: 150 + i });
  // 月台出生高度取碰撞顶面; 动态敌人不投影, 保留海岸静态阴影缓存.
  for (const [i, position] of [[2.6, 0, 7], [-11, .76, 3], [11, 0, 5], [13, 0, -10]].entries()) {
    instances.push({ id: 'coastal-enemy-' + i, model: 'enemy', position,
      collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 },
      options: { speed: 1.8, fireInterval: 1.3 + i * .1, castShadow: false } });
  }
  // 主人物沿用原有第一人称手臂和武器, 挂载到相机并复用射击与动画接口.
  instances.push({ id: 'view-rifle', model: 'rifle', attach: 'camera', position: [.3, -.3, -.65], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: false } });
  window.FPS_LAYOUT = {
    name: '镰仓高校前 · 夏日海岸', mode: 'combat',
    catalog: {
      kamakuraGround: 'models/kamakura-ground.js', enodenTrain: 'models/enoden-train.js',
      kamakuraStation: 'models/kamakura-station.js', railwayCrossing: 'models/railway-crossing.js',
      vendingMachine: 'models/vending-machine.js',
      coastalStreet: 'models/coastal-street.js', coastalUtilities: 'models/coastal-utilities.js',
      kamakuraOcean: 'models/kamakura-ocean.js', enoshimaIsland: 'models/enoshima-island.js',
      coastalSky: 'models/coastal-sky.js', coastalFoliage: 'models/coastal-foliage.js',
      rifle: 'models/rifle.js', enemy: 'models/enemy.js', tracer: 'models/tracer.js', flash: 'models/flash.js',
      impact: 'models/impact.js', bulletmark: 'models/bulletmark.js'
    },
    presentation: {
      title: '镰仓高校前', subtitle: 'KAMAKURA COAST', tag: 'COASTAL COMBAT / EN08',
      description: '沿站前小路推进, 清除月台入口与海侧道路的 4 名敌人. 利用站台与街角遮挡交替移动, 留意道口两侧的火力.',
      sector: 'ENODEN / EN08', label: '镰仓高校前 / 夏日海岸',
      coordinates: 'SAGAMI BAY / KAMAKURA', briefing: [['EN08', '镰仓高校前'], ['AR-04', '制式步枪'], ['04', '清除敌方单位']]
    },
    player: { position: [.4, 0, 19], yaw: -.065, pitch: .075 },
    preview: { position: [.6, 2.6, 23], target: [-.5, 3.25, -12] },
    atmosphere: { sky: 0xa6cbdc, fogNear: 180, fogFar: 2500, exposure: .94, cameraFar: 8000, fov: 64, pixelRatio: 1.5 },
    lights: [
      { type: 'hemisphere', sky: 0xc8e5f4, ground: 0x8c8065, intensity: 1.65, position: [0, 25, 0] },
      { type: 'sun', color: 0xffedce, intensity: 3.5, position: [-32, 48, -21], target: [0, 0, 0], shadow: true, shadowExtent: 52, shadowFar: 160, staticShadow: true }
    ],
    instances
  };
})();
