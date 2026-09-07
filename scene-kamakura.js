// 镰仓高校前海岸场景. 所有模型独立成文件, 变换, 碰撞与构图集中在此配置.
(() => {
  const instances = [];
  function place(id, model, position, options = {}, boxes = [], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    instances.push({ id, model, position, rotation, scale, options, collision: boxes.length ? { enabled: true, boxes } : { enabled: false } });
  }
  const box = (size, offset = [0, 0, 0]) => ({ size, offset });
  const neighborhood = { height: 2.4, start: 20, depth: 38, width: 100, steps: 12, tread: .45, stairWidth: 7.6 };
  const level = z => z >= neighborhood.start ? neighborhood.height : 0;
  // 沙滩网格与浪花共用坡面参数, 防止岸线错位.
  const shoreline = { sandLevel: -1.05, sandStart: -18, slope: .04, halfWidth: 80, edgeSlope: .045 };
  // 先地面, 再近景主体, 然后远景与植被. 地面上表面为 Y=0.
  place('coastal-ground', 'kamakuraGround', [0, 0, 0], {}, [box([100, .6, 76], [0, -.3, 20]), box([8.2, .17, 4.6], [0, .085, 0])]);
  place('coastal-beach', 'coastalBeach', [0, 0, 0], shoreline);
  const { height, start, depth, width, steps, tread, stairWidth } = neighborhood;
  const terrace = [box([width, height, depth], [0, height / 2, start + depth / 2])];
  for (let i = 0; i < steps; i++) {
    const h = height * (i + 1) / steps, z = start - (steps - i - .5) * tread;
    terrace.push(box([stairWidth, h, tread], [0, h / 2, z]));
    for (const side of [-1, 1]) terrace.push(box([.18, h + .22, tread], [side * (stairWidth / 2 + .09), (h + .22) / 2, z]));
  }
  const railSpan = (width - stairWidth) / 2;
  for (const side of [-1, 1]) terrace.push(box([railSpan, .95, .1], [side * (stairWidth / 2 + railSpan / 2), height + .475, start + .1]));
  place('station-neighborhood', 'stationNeighborhood', [0, 0, 0], neighborhood, terrace);
  // 楼梯两侧只完善本站区, 铺地保持低矮, 前方和靠楼梯的一侧开放通行.
  place('station-cycle-court', 'pocketPaving', [-15.5, 0, 15.5], { width: 15, depth: 8, parking: true, parkingRows: [-3.3, .5] }, [box([15, .078, 8], [0, .039, 0])]);
  place('station-pocket-garden', 'pocketPaving', [18, 0, 15.5], { width: 19, depth: 8, garden: true }, [box([19, .06, 8], [0, .03, 0])]);
  place('station-stair-landing', 'pocketPaving', [.25, 0, 13.55], { width: 16.46, depth: 1.8 }, [box([16.46, .078, 1.8], [0, .039, 0])]);
  for (const [id, x] of [['station-bicycle-rack', -18.8], ['station-bicycle-rack-extra', -15]]) {
    place(id, 'bicycleRack', [x, .078, 15.5], {}, [-1.5, 0, 1.5].map(z => box([1.76, .82, .14], [0, .41, z])));
  }
  place('station-community-board', 'communityBoard', [-10.8, .078, 18.5], {}, [box([2.06, 2.28, .36], [0, 1.14, .035])], [0, Math.PI, 0]);
  for (const [i, x, y, z] of [[1, 13, .06, 16.5], [2, 23.7, .078, 13.3]]) {
    place('pocket-bench-' + i, 'parkBench', [x, y, z], {}, [box([2, .96, .66], [0, .48, -.035])], [0, Math.PI, 0]);
  }
  for (const [i, [x, y, z, w, d]] of [[-20.7, .078, 18.7, 3.4, 1.1], [13.2, .06, 18.65, 7.4, 1.3], [26.3, .06, 16.05, 1.35, 6.4]].entries()) {
    const rocks = i === 2 ? [[0, -2.65, .3], [.06, .05, .42], [-.04, .62, .27]] : [];
    place('pocket-flowerbed-' + i, 'stoneFlowerbed', [x, y, z], { width: w, depth: d, rocks }, [box([w, .24, d], [0, .12, 0]), ...rocks.map(([rx, rz, r]) => box([r * 2, r * .65, r * 1.6], [rx, .16 + r * .325, rz]))]);
  }
  // 商铺与棚架限定在本站区低地, 铺地相接处留 2 厘米缝, 避免重叠闪烁.
  place('shop-court-paving', 'pocketPaving', [-34.5, 0, 15.5], { width: 22.96, depth: 8 }, [box([22.96, .078, 8], [0, .039, 0])]);
  for (const [i, [x, w, kind, h]] of [[-35, 7, 'tea', 3.5], [-43, 4, 'kiosk', 3]].entries()) {
    place('station-shop-' + i, 'stationShop', [x, .078, 17], { width: w, kind }, [box([w - .6, h - .7, 3.2], [0, (h - .7) / 2, -.15]), box([w, .7, 4], [0, h - .35, 0]), box([w - .35, .12, .55], [0, 2.3, 1.7])], [0, Math.PI, 0]);
    const tea = kind === 'tea';
    if (tea) place('tea-shop-threshold', 'shopThreshold', [x + w * .32, .078, 15.3], {}, [box([1.16, .063, .5], [0, .0315, 0])], [0, Math.PI, 0]);
    place('shop-plaque-' + i, 'shopPlaque', [x + (tea ? 1.39 : 0), .078 + (tea ? 1.55 : .46), 15.532], tea ? {} : { width: .76, title: '冷たい飲み物', subtitle: 'お持ち帰り' }, [], [0, Math.PI, 0]);
  }
  // 门前格栅避开桌椅, 楼梯底部横向截水; 浅框可直接走过, 不占用通道净宽.
  for (const [id, x, z, length] of [['shop', -32.76, 14.75, 3.2], ['stairs', 0, 14.15, 7.4]]) {
    place('drain-' + id, 'drainGrate', [x, .078, z], { length }, [box([length, .015, .22], [0, .0075, 0])]);
  }
  for (const [i, x] of [-36.7, -33.3].entries()) place('cafe-table-' + i, 'cafeTableSet', [x, .078, 13.8], {}, [box([.65, .75, .65], [0, .375, 0]), ...[-.75, .75].map(cx => box([.46, .84, .44], [cx, .42, 0]))]);
  for (const [i, x] of [-39.8, -29.3].entries()) {
    place('shop-planter-' + i, 'stoneFlowerbed', [x, .078, 17.2], { width: 1.2, depth: 1.2, height: .45 }, [box([1.2, .45, 1.2], [0, .225, 0])]);
    place('shop-shrub-' + i, 'lowHedge', [x, .448, 17.2], { width: .9, depth: .9, height: .65 });
  }
  place('parked-bike-court', 'cityBicycle', [-18.8, .078, 17.22], { color: 0x8c7660 }, [box([2.1, 1.23, .64], [0, .615, 0])]);
  const shadeScale = [1, .06 / .078, 1];
  place('pergola-paving', 'pocketPaving', [36, 0, 15.8], { width: 9, depth: 7, stone: true }, [box([9, .078, 7], [0, .039, 0])], [0, 0, 0], shadeScale);
  place('garden-link-paving', 'pocketPaving', [29.5, 0, 13.55], { width: 3.96, depth: 1.8, stone: true }, [box([3.96, .078, 1.8], [0, .039, 0])]);
  place('garden-bin-footing', 'pocketPaving', [40.89, 0, 13.3], { width: .74, depth: .9 }, [box([.74, .078, .9], [0, .039, 0])], [0, 0, 0], shadeScale);
  const pergolaBoxes = [-2.7, 2.7].flatMap(x => [-1.7, 1.7].flatMap(z => [box([.26, .09, .26], [x, .045, z]), box([.17, 2.9, .17], [x, 1.45, z]), box([.68, .68, .1], [x - Math.sign(x) * .28, 2.6, z])]));
  pergolaBoxes.push(...[-1.7, 1.7].map(z => box([6, .2, .16], [0, 2.9, z])), box([6, .2, 4], [0, 3.1, 0]));
  place('garden-pergola', 'gardenPergola', [36, .06, 16], {}, pergolaBoxes);
  for (const [i, x] of [34.5, 37.5].entries()) place('pergola-bench-' + i, 'parkBench', [x, .06, 17.1], {}, [box([2, .96, .66], [0, .48, -.035])], [0, Math.PI, 0]);
  for (const [i, [x, z, length, yaw]] of [[34, 19.2, 4, 0], [43.5, 19.2, 4, 0], [46, 16, 6, Math.PI / 2]].entries()) {
    place('garden-hedge-' + i, 'lowHedge', [x, 0, z], { width: length }, [box([length, .9, .7], [0, .45, 0])], [0, yaw, 0]);
  }
  place('garden-drinking-fountain', 'drinkingFountain', [31.8, .06, 13.3], {}, [box([.55, .065, .5], [0, .0325, 0]), box([.3, .66, .27], [0, .395, -.035]), box([.5, .22, .45], [0, .79, 0])], [0, Math.PI, 0]);
  place('garden-recycling-bin', 'recyclingBin', [40.8, .06, 13.3], {}, [box([.72, 1.06, .56], [0, .53, -.005])], [0, Math.PI, 0]);
  for (const [i, [x, y]] of [[-39.9, .078], [-27, .078], [29, .078], [44.8, 0]].entries()) {
    place('court-lamp-' + i, 'streetLamp', [x, y, 12.9], {}, [box([.4, .2, .4], [0, .1, 0]), box([.14, 4.5, .14], [0, 2.25, 0])], [0, 0, 0], [1, 4.2 / 4.75, 1]);
  }
  place('enoden-305', 'enodenTrain', [-13.3, .16, 0], { cars: 2 }, [box([32.45, 3.35, 2.8], [-8.3, 2.05, 0]), box([.65, .24, .28], [8.15, .7, 0]), box([.65, .24, .28], [-24.75, .7, 0])]);
  const canopyLift = .65;
  const stairRail = [[16.8, 1.63, -1.02], [17.23, 1.63, -1.02], [18.67, 1.12, -1.02], [19.08, 1.12, -1.02]];
  const platform = [box([34, .68, 3.5], [0, .34, 0]), box([34, .08, .28], [0, .72, -1.58]), box([34, 1.04, .08], [0, 1.25, 1.65]), box([29.7, .35, 3.6], [-1, 3.43 + canopyLift, 0])];
  for (let i = 0; i < 4; i++) {
    const x = 17.23 + i * .48, h = .17 * (4 - i);
    platform.push(box([.48, h, 2.65], [x, h / 2, .22]), box([.14, .035, .14], [x, h + .0175, stairRail[0][2]]), box([.054, .915, .054], [x, h + .4925, stairRail[0][2]]));
  }
  for (let i = 1; i < stairRail.length; i++) {
    const a = stairRail[i - 1], b = stairRail[i];
    platform.push(box(a.map((v, axis) => Math.abs(b[axis] - v) + .064), a.map((v, axis) => (v + b[axis]) / 2)));
  }
  for (const x of [-13, -7, -1, 5, 11]) platform.push(box([.13, 2.65 + canopyLift, .14], [x, 2.06 + canopyLift / 2, .65]));
  for (const x of [-10, 0, 9]) platform.push(box([2.3, .92, .67], [x, 1.2, .57]));
  place('kamakura-platform', 'kamakuraStation', [-24.9, 0, 3.9], { canopyLift, stairRail }, platform);
  place('station-vending-machine', 'vendingMachine', [-39.4, .68, 4.75], {}, [box([1.04, 1.85, .765], [0, .925, .0075])], [0, Math.PI, 0]);
  for (const [i, [x, z, yaw]] of [[-9.1, 13.5, -Math.PI / 2], [8.6, 33.25, -Math.PI / 2]].entries()) {
    place('street-vending-' + i, 'vendingMachine', [x, i === 0 ? .078 : level(z), z], {}, [box([1.04, 1.85, .765], [0, .925, .0075])], [0, yaw, 0]);
  }
  // 物件按候车/停放/回收分组, 避开主楼梯与住宅围墙的开口.
  for (const [i, [x, z]] of [[-18.8, 14.22], [-18.8, 15.72], [10.8, 45.8], [13.1, 45.8], [-11.5, 45.8]].entries()) {
    place('parked-bike-' + i, 'cityBicycle', [x, i < 2 ? .078 : level(z), z], { color: [0x4d7775, 0xa08760, 0x728295][i % 3] }, [box([2.1, 1.23, .64], [0, .615, 0])]);
  }
  for (const [i, [x, z, yaw]] of [[-9.1, 15.1, -Math.PI / 2], [8.65, 35, -Math.PI / 2], [-10, -16.2, 0], [-10, 32.5, Math.PI / 2]].entries()) {
    place('recycling-bin-' + i, 'recyclingBin', [x, i === 0 ? .078 : level(z), z], {}, [box([.72, 1.06, .56], [0, .53, -.005])], [0, yaw, 0]);
  }
  for (const [i, [x, z]] of [[-4.3, 12.2], [4.3, 12.2], [4.5, 36], [-4.5, 43], [-19, -16.2], [-35, -16.2]].entries()) {
    place('street-lamp-' + i, 'streetLamp', [x, level(z), z], {}, [box([.4, .2, .4], [0, .1, 0]), box([.14, 4.5, .14], [0, 2.25, 0])], [0, x > 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
  }
  const crossing = [box([.7, 1.25, .85], [.12, .63, .27]), box([.24, 6.8, .24], [0, 3.4, 0]), box([3.55, .10, .085], [2.155, 1.2, .73])];
  place('crossing-near', 'railwayCrossing', [-4.65, 0, 3], { phase: 0 }, crossing);
  place('crossing-sea', 'railwayCrossing', [4.65, 0, -3], { phase: .55 }, crossing, [0, Math.PI, 0]);
  place('station-wayfinding', 'coastalStreet', [5.25, 0, 5.6], { kind: 'sign' }, [box([1.9, 2.75, .17], [0, 1.38, 0])]);
  place('convex-road-mirror', 'coastalStreet', [6.1, 0, -6.1], { kind: 'mirror' }, [box([.13, 3.8, .13], [0, 1.9, 0])], [0, -.3, 0]);
  place('seafront-railing', 'coastalStreet', [0, 0, -17.7], { kind: 'railing', length: 100 }, [box([100, 1.2, .15], [0, .6, 0])]);
  for (const [id, x, h] of [['left-lane-wall', -5.9, 1.3], ['right-garden-wall', 7.4, .7]]) {
    for (const [section, z, length, y] of [['lower', 9.4, 4.8, 0], ['upper-front', 25, 10, height], ['upper-middle', 39, 10, height], ['upper-back', 52, 8, height]]) {
      place(id + '-' + section, 'coastalStreet', [x, y, z], { kind: 'wall', length, height: h }, [box([.54, h + .1, length], [0, (h + .1) / 2, 0])]);
    }
  }
  // 围界仅约束当前已制作的一角, 后续分区接通时由场景配置移除.
  for (const side of [-1, 1]) for (const [section, z, length, y] of [['lower', 1, 38, 0], ['upper', 39, 38, height]]) {
    place('side-boundary-' + side + '-' + section, 'coastalStreet', [side * 49.6, y, z], { kind: 'wall', length, height: 1.8 }, [box([.54, 1.9, length], [0, .95, 0])]);
  }
  place('inland-boundary', 'coastalStreet', [0, height, 57.5], { kind: 'wall', length: 100, height: 1.8 }, [box([.54, 1.9, 100], [0, .95, 0])], [0, Math.PI / 2, 0]);
  // 三种独立房屋沿小路朝向街面, 留出院落, 月台入口和海侧交战路线.
  const homes = [['japaneseCottage', [6.9, 4.65, 7.8]], ['japaneseMachiya', [6.5, 7.2, 7.8]], ['japaneseResidence', [7.3, 6.4, 7.7]]];
  for (const [i, [kind, x, z, rotation]] of [
    [0, -35, 26], [1, -18, 26], [2, 18, 26], [0, 35, 26],
    [2, -35, 40], [0, -18, 40], [1, 18, 40], [2, 35, 40],
    [1, -35, 52], [2, -18, 52], [0, 18, 52], [1, 35, 52]
  ].entries()) {
    const [model, size] = homes[kind];
    const facing = [0, rotation ?? (x > 0 ? -Math.PI / 2 : Math.PI / 2), 0];
    place('coastal-yard-' + i, 'japaneseYard', [x, height, z], {}, [box([8, .06, 8.6], [0, .03, 0])], facing);
    place('coastal-home-' + i, model, [x, height, z], {}, [box(size, [0, size[1] / 2, .2])], facing);
  }
  const poles = [-47, -24, 9, 34, 49].map(x => box([.26, 8.4, .26], [x, 4.2, -2.2]));
  const utilityRows = [-15, 12, 34, 54];
  poles.push(...[-7.1, 8].flatMap(x => utilityRows.map(z => box([.3, 10.1, .3], [x, level(z) + 5.05, z]))));
  place('overhead-wires', 'coastalUtilities', [0, 0, 0], { rows: utilityRows, rowHeights: utilityRows.map(level) }, poles);
  place('sagami-bay', 'kamakuraOcean', [0, 0, 0], shoreline);
  for (const [i, [x, z, yaw, size]] of [[-58, -92, .7, 1], [-12, -130, -1.1, 1.1], [60, -108, 1.2, 1], [120, -190, -.6, 1.2], [-150, -225, .9, 1.3], [58, -230, .4, 1], [171, -410, -.7, .7], [-128, -580, .8, .8]].entries()) {
    place('coastal-sailboat-' + i, 'coastalSailboat', [x, -2.05, z], { phase: i * 1.7, color: i % 2 ? 0x718b89 : 0x557e85 }, [], [0, yaw, 0], [size, size, size]);
  }
  place('enoshima', 'enoshimaIsland', [132, -2, -640]);
  place('summer-clouds', 'coastalSky', [0, 0, 0], { steps: 48 });
  place('seagull-flocks', 'seagullFlock', [0, 0, 0]);
  for (let i = 0; i < 10; i++) {
    const z = i < 5 ? 8.5 + i * 1.85 : 22 + (i - 5) * 1.85;
    const garden = i >= 2 && i < 5, s = garden ? .75 : 1;
    place('hydrangea-right-' + i, 'coastalFoliage', garden ? [10.6 + (i - 2) * 2.5, .22, 18.65] : [5.1 + Math.sin(i * 1.7) * .38, level(z), z], { seed: 92 + i, color: i % 4 === 0 ? 'blue' : 'pink', blooms: garden ? 8 : 11 }, [], [0, 0, 0], [s, s, s]);
  }
  for (let i = 0; i < 5; i++) {
    const z = 10 + i * 4.2, garden = i === 1 || i === 2;
    place('hydrangea-left-' + i, 'coastalFoliage', garden ? [-21.4 + (i - 1) * 1.4, .238, 18.7] : [-5.1, level(z), z], { seed: 507 + i, color: 'blue', blooms: 8 }, [], [0, i, 0], [.7, .7, .7]);
  }
  for (const [i, z] of [14.5, 17.8].entries()) place('garden-hydrangea-' + i, 'coastalFoliage', [26.3, .22, z], { seed: 612 + i, color: i ? 'blue' : 'pink', blooms: 8 }, [], [0, i, 0], [.72, .72, .72]);
  for (const [i, [x, z, cherry, lift = 0]] of [
    [-8, 8, false], [-8, 24, true], [10, 31, true], [-24.8, 16.8, false, .078], [20.7, 16.4, true, .06],
    [-26, 34, true], [24, 35, true], [-42, 47, false], [42, 47, true], [10, 49, false],
    [-23, 8, true], [24.75, 5, false], [30.1, 17.5, false], [43, 15.5, false],
    // 前排统一对齐: 左排 Z=8, 株距 15 米; 右排 Z=5, 三棵树等距 11.25 米.
    [-38, 8, false], [36, 5, false], [13.5, 5, false]
  ].entries()) {
    place('tree-pit-' + i, 'treePlanter', [x, level(z) + lift, z], {}, [box([2.6, .79, 2.6], [0, .395, 0])]);
    place('coastal-tree-' + i, cherry ? 'sakuraTree' : 'zelkovaTree', [x, level(z) + lift + .08, z], { seed: 701 + i }, [box([.5, 2.9, .5], [0, 1.45, 0])]);
  }
  for (let i = 0; i < 7; i++) place('shore-shrub-' + i, 'coastalFoliage', [12 + i * 3.3, 0, -16.3], { kind: 'shrub', seed: 150 + i });
  // 月台出生高度取碰撞顶面; 动态敌人不投影, 保留海岸静态阴影缓存.
  for (const [i, position] of [[2.6, 0, 7], [-11, .68, 3], [11, 0, 5], [13, 0, -10]].entries()) {
    instances.push({ id: 'coastal-enemy-' + i, model: 'enemy', position,
      collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 },
      options: { speed: 1.8, fireInterval: 1.3 + i * .1, castShadow: false } });
  }
  // 主人物沿用原有第一人称手臂和武器, 挂载到相机并复用射击与动画接口.
  instances.push({ id: 'view-rifle', model: 'rifle', attach: 'camera', position: [.3, -.3, -.65], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: false } });
  window.FPS_LAYOUT = {
    name: '镰仓高校前 · 夏日海岸', mode: 'combat',
    // 五区仅记录规划, 保持本站区局部坐标; 其余四区暂不生成任何内容.
    regionPlan: { active: 'southwest', reserved: ['northwest', 'northeast', 'southeast', 'center'] },
    catalog: {
      kamakuraGround: 'models/kamakura-ground.js', enodenTrain: 'models/enoden-train.js',
      kamakuraStation: 'models/kamakura-station.js', railwayCrossing: 'models/railway-crossing.js',
      vendingMachine: 'models/vending-machine.js',
      coastalSailboat: 'models/coastal-sailboat.js', cityBicycle: 'models/city-bicycle.js',
      recyclingBin: 'models/recycling-bin.js', streetLamp: 'models/street-lamp.js',
      parkBench: 'models/park-bench.js', bicycleRack: 'models/bicycle-rack.js', communityBoard: 'models/community-board.js',
      pocketPaving: 'models/pocket-paving.js', stoneFlowerbed: 'models/stone-flowerbed.js',
      stationShop: 'models/station-shop.js', cafeTableSet: 'models/cafe-table-set.js', gardenPergola: 'models/garden-pergola.js',
      shopThreshold: 'models/shop-threshold.js', drainGrate: 'models/drain-grate.js', shopPlaque: 'models/shop-plaque.js',
      lowHedge: 'models/low-hedge.js', drinkingFountain: 'models/drinking-fountain.js',
      coastalBeach: 'models/coastal-beach.js', stationNeighborhood: 'models/station-neighborhood.js',
      japaneseCottage: 'models/japanese-cottage.js', japaneseMachiya: 'models/japanese-machiya.js', japaneseResidence: 'models/japanese-residence.js',
      japaneseYard: 'models/japanese-yard.js',
      treePlanter: 'models/tree-planter.js', zelkovaTree: 'models/zelkova-tree.js', sakuraTree: 'models/sakura-tree.js', seagullFlock: 'models/seagull-flock.js',
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
    player: { position: [.4, height, 29], yaw: -.065, pitch: .075 },
    preview: { position: [.6, height + 2.6, 29], target: [-.5, 3.25, -12] },
    atmosphere: { sky: 0xa6cbdc, fogNear: 180, fogFar: 2500, exposure: .94, cameraFar: 8000, fov: 64, pixelRatio: 1.5 },
    lights: [
      { type: 'hemisphere', sky: 0xc8e5f4, ground: 0x8c8065, intensity: 1.65, position: [0, 25, 0] },
      { type: 'sun', color: 0xffedce, intensity: 3.5, position: [-32, 48, -21], target: [0, 0, 0], shadow: true, shadowExtent: 52, shadowFar: 160, staticShadow: true }
    ],
    instances
  };
})();
