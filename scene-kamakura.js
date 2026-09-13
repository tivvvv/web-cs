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
  const sun = [-32, 48, -21];
  // 先地面, 再近景主体, 然后远景与植被. 地面上表面为 Y=0.
  place('coastal-ground', 'kamakuraGround', [0, 0, 0], {}, [box([100, .6, 76], [0, -.3, 20]), box([8.2, .17, 4.6], [0, .085, 0])]);
  place('coastal-beach', 'coastalBeach', [0, 0, 0], shoreline);
  const { height, start, depth, width, steps, tread, stairWidth } = neighborhood;
  // 保留站区原坐标, 向 +X/+Z 扩展四角, 中心及十字连接带暂时只铺平地.
  const regionPlan = {
    active: 'southwest', cellSize: [100, 76], connectionWidth: 20, groundY: height,
    corners: [
      { id: 'southwest', name: '海滨车站', center: [0, 20], status: 'developed' },
      { id: 'northwest', name: '神社与林间公园', center: [0, 116], status: 'developed' },
      { id: 'northeast', name: '商店街与生活街区', center: [120, 116], status: 'flat' },
      { id: 'southeast', name: '渔港与仓储区', center: [120, 20], status: 'flat' }
    ],
    center: { name: '中央广场', position: [60, 68], size: [20, 20], status: 'flat' }
  };
  // 公园东半部湖区挖去原台地, 岸线共用于模型和岸边碰撞, 水下保留真实池底.
  const pond = { x: 25, z: 123, width: 40, depth: 44, bottom: -.55, waterLevel: -.18, rim: .024 };
  const pondCut = [pond.x - pond.width / 2, pond.z - pond.depth / 2, pond.x + pond.width / 2, pond.z + pond.depth / 2];
  const shore = Array.from({ length: 40 }, (_, i) => { const a = i * Math.PI / 20; return [(pond.width / 2 - 2) * Math.cos(a) * (1 + .09 * Math.sin(a)), Math.round((pond.depth / 2 - 2) * Math.sin(a) * 10000) / 10000]; });

  const parcels = [...[[-50, 78, pondCut[0], 154], [pondCut[2], 78, 50, 154], [pondCut[0], 78, pondCut[2], pondCut[1]], [pondCut[0], pondCut[3], pondCut[2], 154]].map(([x0, z0, x1, z1]) => [(x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0]), ...regionPlan.corners.slice(2).map(r => [...r.center, ...regionPlan.cellSize]), [60, 68, 20, 172], [0, 68, 100, 20], [120, 68, 100, 20]];
  const slabs = parcels.map(([x, z, w, d]) => box([w, height + .6, d], [x, (height - .6) / 2, z]));
  slabs.push(box([pond.width, height + .6 + pond.bottom, pond.depth], [pond.x, (height + pond.bottom - .6) / 2, pond.z]));
  // 外围用简单实心挡墙, 不复制砖块细节; 内部地块相接, 无叠面或额外台阶.
  const edges = [box([220, 1.8, .54], [60, height + .9, 153.73]), box([.54, 1.8, 171.46], [169.73, height + .9, 67.73]),
    box([119.46, 1.8, .54], [109.73, height + .9, -17.73]), box([.54, 1.8, 95.41], [-49.6, height + .9, 105.755])];
  place('reserved-district-ground', 'districtGround', [0, 0, 0], { slabs, edges }, [...slabs, ...edges]);
  // 西北公园: 南北参道, 西侧园林, 东侧湖面与北侧拜殿; 环路与东侧出口不封闭.
  const parkY = height + .024;
  const parkSurfaces = [
    [-44, 81, -5.5, 113, 2], [5.5, 81, 44, 113, 2], [-44, 117, -14, 149, 2], [14, 117, 44, 149, 2],
    [-3, 78, 3, 127, 1], [-32, 108, 3, 113, 1], [0, pond.z - 2, 49.3, pond.z + 2, 1], [-32, 86, -29, 143, 1], [45, 98, 48.5, 147.2, 1], [32, 98, 48.5, 101, 1],
    [-32, 140, 5, 143, 1], [2.5, 140, 5, 147.2, 1], [2.5, 145, 48.5, 147.2, 1], [-13, 116, 13, 143, 0], [-3, 116, 3, 127, 1], [22, 94, 33, 104, 1], [-23, 102, -15, 108, 1], [3, 98.3, 22, 99.7, 1], [...pondCut, -1]
  ];
  const bankSlices = Math.ceil(pond.depth / .75);
  const shoreRows = [...new Set([...shore.map(p => p[1]), ...Array.from({ length: bankSlices + 1 }, (_, i) => Math.round((-pond.depth / 2 + pond.depth * i / bankSlices) * 10000) / 10000)])].sort((a, b) => a - b), bankBoxes = [];
  for (let i = 0; i < shoreRows.length - 1; i++) {
    const z0 = shoreRows[i], z1 = shoreRows[i + 1], z = (z0 + z1) / 2, hits = [];
    // 每段取两端和中部的水域范围, 岸边碰撞向陆地内收, 避免扩大后出现水面上的隐形地板.
    for (const sample of [z0 + .000001, z, z1 - .000001]) shore.forEach(([x0, a], j) => {
      const [x1, b] = shore[(j + 1) % shore.length];
      if (sample > Math.min(a, b) && sample < Math.max(a, b)) hits.push(x0 + (x1 - x0) * (sample - a) / (b - a));
    });
    const spans = hits.length ? [[-pond.width / 2, Math.min(...hits)], [Math.max(...hits), pond.width / 2]] : [[-pond.width / 2, pond.width / 2]];
    for (const [a, b] of spans) bankBoxes.push(box([b - a, pond.rim - pond.bottom, z1 - z0], [(a + b) / 2, (pond.rim + pond.bottom) / 2, z]));
  }
  place('park-pond', 'parkPond', [pond.x, height, pond.z], { ...pond, shore }, bankBoxes);
  // 桥栏恢复正常观景比例, 防越界高度独立配置; 桥面与拱腹继续共用剖面和碰撞.
  const bridge = { width: 3.4, length: pond.width, rise: 2.4, railHeight: 1.16, barrierHeight: 1.9, bottom: pond.bottom - pond.rim }, bridgeTop = x => .12 + bridge.rise * (1 - (2 * x / bridge.length) ** 2);
  bridge.deck = Array.from({ length: bridge.length * 2 }, (_, i) => {
    const x = -bridge.length / 2 + .25 + i * .5;
    return box([.5, .12, bridge.width], [x, bridgeTop(x) - .06, 0]);
  });
  bridge.profile = Array.from({ length: bridge.length / 2.5 + 1 }, (_, i) => { const x = -bridge.length / 2 + i * 2.5; return [x, bridgeTop(x)]; });
  bridge.arches = [[-19, -9], [-8, 8], [9, 19]].map(([left, right]) => ({ left, right, crown: bridgeTop((left + right) / 2) - .65 }));
  const soffit = x => {
    const a = bridge.arches.find(a => x >= a.left && x <= a.right);
    return a ? bridge.bottom + (a.crown - bridge.bottom) * Math.sqrt(Math.max(0, 1 - ((2 * x - a.left - a.right) / (a.right - a.left)) ** 2)) : bridge.bottom;
  };
  bridge.body = bridge.deck.map(({ size, offset: [x, y] }) => ({ x0: x - .25, x1: x + .25, top: y - size[1] / 2, low0: soffit(x - .25), low1: soffit(x + .25) }));
  const bridgeBody = bridge.body.map(s => {
    const low = Math.max(s.low0, s.low1);
    return box([s.x1 - s.x0, s.top - low, bridge.width], [(s.x0 + s.x1) / 2, (s.top + low) / 2, 0]);
  });
  const bridgeRails = bridge.profile.slice(1).flatMap(([x, y], i) => [-1, 1].map(side => {
    const [px, py] = bridge.profile[i];
    return box([x - px + .36, bridge.barrierHeight + Math.abs(y - py), .36], [
      (x + px) / 2, Math.min(y, py) + (bridge.barrierHeight + Math.abs(y - py)) / 2, side * (bridge.width / 2 - .14)
    ]);
  }));
  place('park-lake-bridge', 'parkBridge', [pond.x, parkY, pond.z], bridge, [...bridge.deck, ...bridgeRails, ...bridgeBody]);
  for (const side of [-1, 1]) place('park-bridge-landing-' + side, 'pocketPaving', [pond.x + side * (bridge.length / 2 + 1), height, pond.z], { width: 2, depth: 4, stone: true }, [box([2, .078, 4], [0, .039, 0])]);
  // 1.05 米景观低栏沿岸线闭合并接上桥栏; 同位置保留 2.1 米防越界碰撞, 不增加可见高墙.
  const fence = {
    height: 1.05, barrierHeight: 2.1, railDepth: .095,
    postWidths: { base: .28, shaft: .2, cap: .27 }, segments: []
  }, fencePoints = shore.map(([x, z]) => [x * 1.045, z * 1.045]);
  for (let i = 0; i < fencePoints.length; i++) for (const side of [-1, 1]) {
    let a = fencePoints[i], b = fencePoints[(i + 1) % fencePoints.length];
    const edge = bridge.width / 2 - .14, da = a[1] * side - edge, db = b[1] * side - edge;
    if (da < 0 && db < 0) continue;
    if (da < 0 || db < 0) {
      const t = da / (da - db), cut = [a[0] + (b[0] - a[0]) * t, side * edge];
      if (da < 0) a = cut; else b = cut;
    }
    fence.segments.push([a, b]);
  }
  // 斜栏按横向误差最多 .1 米细分 AABB, 直栏无需细分; 木栏和石柱尺寸共用模型参数.
  const fenceBoxes = [], fencePosts = new Map();
  for (const [a, b] of fence.segments) {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < .0001) continue;
    const count = Math.max(1, Math.ceil(Math.abs(dx * dz) / length / .1));
    for (let i = 0; i < count; i++) fenceBoxes.push(box([
      Math.abs(dx) / count + fence.railDepth * Math.abs(dz) / length, fence.barrierHeight,
      Math.abs(dz) / count + fence.railDepth * Math.abs(dx) / length
    ], [a[0] + dx * (i + .5) / count, fence.barrierHeight / 2, a[1] + dz * (i + .5) / count]));
    for (const p of [a, b]) fencePosts.set(p.map(v => v.toFixed(4)).join(','), p);
  }
  const postWidth = Math.max(...Object.values(fence.postWidths));
  for (const [x, z] of fencePosts.values()) fenceBoxes.push(box([postWidth, fence.barrierHeight, postWidth], [x, fence.barrierHeight / 2, z]));
  place('park-lake-fence', 'lakeFence', [pond.x, parkY, pond.z], fence, fenceBoxes);
  for (const [i, n] of [8, 15, 32].entries()) {
    const [x, z] = shore[n]; place('park-lotus-' + i, 'pondLotus', [pond.x + x * .84, height + pond.waterLevel, pond.z + z * .84], { seed: 81 + i * 31 });
  }
  const pondRocks = [3, 8, 13, 18, 24, 29, 34, 38].map((n, i) => { const [x, z] = shore[n]; return [x * 1.008, z * 1.008, .65 + i % 3 * .13, .28 + i % 2 * .12, .6 + i % 3 * .1]; });
  place('park-pond-rocks', 'landscapeRocks', [pond.x, parkY, pond.z], { stones: pondRocks }, pondRocks.map(([x, z, w, h, d]) => box([w, h, d], [x, h / 2, z])));
  // 东北岸低景石扎入湖底, 水生花丛错落在岸内, 保留开阔水面.
  const waterRocks = [[0, 0, 2.2, 1.05, 1.7], [-1.3, .5, 1.6, .72, 1.1], [.85, -.6, 1.3, .6, 1], [.15, 1, 1.1, .52, .9]];
  place('park-water-rocks', 'landscapeRocks', [36, height + pond.bottom, 134], { stones: waterRocks }, waterRocks.map(([x, z, w, h, d]) => box([w, h, d], [x, h / 2, z])));
  for (const [i, [x, z]] of [[37.5, 135.3], [13.2, 131], [32, 107.5]].entries()) {
    place('park-water-iris-' + i, 'waterIris', [x, height + pond.bottom, z], { seed: 91 + i * 31 });
  }
  for (const [i, [x, z]] of [[12.5, 140.2], [37, 106]].entries()) {
    place('park-pond-grass-' + i, 'parkFlowerbed', [x, parkY, z], { width: 1.6, depth: 1, height: 1.1, kind: 'grass', count: 16, seed: 431 + i }, [box([1.64, .09, 1.02], [0, .045, 0])]);
  }
  place('northwest-park-ground', 'shrineParkGround', [0, height, 0], { bounds: [-49.3, 78, 49.3, 153.4], surfaces: parkSurfaces });
  place('park-station-link', 'pocketPaving', [0, height, 68], { width: 6, depth: 20, stone: true }, [box([6, .078, 20], [0, .039, 0])]);
  place('park-east-link', 'pocketPaving', [59.65, height, pond.z], { width: 20.7, depth: 5, stone: true }, [box([20.7, .078, 5], [0, .039, 0])]);
  place('park-torii', 'shrineTorii', [0, parkY, 86], {}, [
    ...[-1, 1].flatMap(side => [box([.92, .16, .88], [side * 2.71, .08, 0]), box([.75, 4.5, .66], [side * 2.65, 2.35, 0])]),
    box([6.7, .22, .34], [0, 3.72, 0]), box([7.6, .9, .65], [0, 4.65, 0])
  ]);
  place('park-entry-sign', 'parkSign', [-5, parkY, 81], {}, [box([1.94, 1.89, .32], [0, .945, 0])]);
  const shrineBoxes = [box([10.8, .6, 9], [0, .3, -.6]), box([8.8, 3.3, 6], [0, 2.25, .1]), box([12, 2, 10.2], [0, 5.5, -.65]), box([1.65, .76, .74], [0, .98, -4.25])];
  for (let i = 0; i < 4; i++) shrineBoxes.push(box([3.4, .15 * (i + 1), .45], [0, .075 * (i + 1), -6.675 + i * .45]));
  for (const side of [-1, 1]) {
    for (const z of [-4.75, -2.95, .1, 3.15]) shrineBoxes.push(box([.44, 4.4, .44], [side * 4.55, 2.8, z]));
    shrineBoxes.push(box([.1, .69, 8.6], [side * 5.18, .945, -.6]));
  }
  place('park-shrine', 'parkShrine', [0, parkY, 134], {}, shrineBoxes);
  place('park-temizuya', 'temizuya', [-19, parkY, 105.2], {}, [
    box([4.2, .1, 3.5], [0, .05, 0]), box([2.1, 1.08, 1.13], [0, .64, 0]), box([4.3, 1.2, 3.85], [0, 3.55, 0]),
    ...[-1.65, 1.65].flatMap(x => [-1.3, 1.3].map(z => box([.42, 2.95, .42], [x, 1.525, z])))
  ]);
  place('park-pavilion', 'parkPavilion', [27, parkY, 99], {}, [
    box([6.6, .12, 5.8], [0, .06, 0]), box([7.1, 1.38, 6.3], [0, 3.96, 0]),
    ...[-2.7, 2.7].flatMap(x => [-2.3, 2.3].map(z => box([.48, 3.2, .48], [x, 1.72, z]))),
    ...[-2.42, 2.42].map(x => box([.58, .5, 3.4], [x, .37, 0]))
  ]);
  for (const [i, [x, z]] of [[-4.3, 96], [4.3, 96], [-4.3, 118.5], [4.3, 118.5]].entries()) {
    place('park-stone-lantern-' + i, 'stoneLantern', [x, parkY, z], {}, [box([.95, .14, .95], [0, .07, 0]), box([.66, 1.75, .66], [0, 1.025, 0]), box([1.02, .72, 1.02], [0, 2.06, 0])]);
  }
  // 西侧枯山水: 石块与砂纹使用同一组局部坐标, 五块景石按大小与前后层次组合.
  const gardenStones = [[-3.2, .2, 2, 1.2, 1.7], [-1.65, .9, 1.1, .6, .9], [1.5, -1.2, 1.65, 1.55, 1.4], [2.5, -.25, .9, .5, .8], [3.8, 2, 1.2, .75, 1]];
  place('park-dry-garden', 'dryGarden', [-16, parkY, 98], { width: 12, depth: 8, stones: gardenStones }, [
    box([12, .073, 8], [0, .0365, 0]), ...[-1, 1].flatMap(side => [box([12, .1, .16], [0, .05, side * 3.92]), box([.16, .1, 7.68], [side * 5.92, .05, 0])])
  ]);
  place('park-garden-stones', 'landscapeRocks', [-16, parkY + .073, 98], { stones: gardenStones }, gardenStones.map(([x, z, w, h, d]) => box([w, h, d], [x, h / 2, z])));
  // 东侧花境分列短支路两侧, 低白花, 蓝紫花和观赏草形成高度层次, 不占木亭入口.
  for (const [i, [x, z, w, d, h, kind, count]] of [[14.1, 96.5, 3.8, 2.1, .55, 'white', 48], [18.7, 96.3, 3.8, 2.5, .85, 'blue', 56], [16.7, 101.65, 7.4, 2.2, 1, 'grass', 84]].entries()) {
    place('park-flower-border-' + i, 'parkFlowerbed', [x, parkY, z], { width: w, depth: d, height: h, kind, count, seed: 51 + i * 73 }, [box([w * 1.02, .09, d * 1.02], [0, .045, 0])]);
  }
  place('park-ema-rack', 'emaRack', [-9.6, parkY, 132.3], {}, [
    ...[-1.45, 1.45].flatMap(x => [box([.48, .14, .55], [x, .07, 0]), box([.15, 2.35, .16], [x, 1.315, 0])]),
    ...[1.1, 1.65].map(y => box([2.8, .43, .1], [0, y + .085, 0])), box([1.5, .25, .06], [0, 2.13, -.04]), box([3.52, .68, .84], [0, 2.7, 0])
  ]);
  // 木亭配套靠铺地东缘, 正面朝环路; 两件设施分开, 不挤占亭内长凳与进出口.
  place('park-drinking-fountain', 'drinkingFountain', [32.45, parkY, 102.8], {}, [box([.55, .9, .5], [0, .45, 0])], [0, -Math.PI / 2, 0]);
  place('park-recycling-bin', 'recyclingBin', [32.4, parkY, 95.1], {}, [box([.74, 1.06, .6], [0, .53, 0])], [0, -Math.PI / 2, 0]);
  // 前三组点缀枯山水, 后六组补外围树下层次; 土床与小景石复用现有单文件模型.
  for (const [i, [x, z, w, d, h]] of [[-20.5, 102.65, 1.5, .7, .55], [-12, 102.65, 1.8, .7, .45], [-10.7, 93.25, 1.3, .7, .4], [-43, 96, 3.5, 2.2, .7], [-43, 114, 3.5, 2.2, .55], [-43, 133, 3.5, 2.2, .65], [-32, 149.2, 4, 1.5, .55], [0, 149.2, 4, 1.5, .5], [32, 149.2, 4, 1.5, .6]].entries()) {
    const rocks = i < 3 ? [] : [[w * .32, d * .18, .25]];
    place('park-underplant-bed-' + i, 'stoneFlowerbed', [x, parkY, z], { width: w, depth: d, height: .14, rocks }, [box([w, .14, d], [0, .07, 0]), ...rocks.map(([rx, rz, r]) => box([r * 2, r * .65, r * 1.6], [rx, .06 + r * .325, rz]))]);
    place('park-underplant-' + i, 'lowHedge', [x - (i < 3 ? 0 : .35), parkY + .04, z], { width: i < 3 ? w - .25 : w - 1.2, depth: d - .25, height: h, seed: 381 + i });
  }
  // 树木只占用种植地块和前庭侧缘, 统一树池, 草地下仍为平整可走的原地面.
  const parkTrees = [[-39, 88], [-26, 87], [-39, 103], [-39, 122], [-39, 142], [-24, 146], [18, 148.7], [39, 142], [-19, 125], [40, 86], [27, 86], [13, 86], [39, 105], [-8, 93], [8, 93], [-8, 120], [-14, 86], [-24, 100], [10, 104]];
  parkTrees.forEach(([x, z], i) => {
    const scale = i > 16 ? 1.22 : i < 13 ? 1.45 : 1.15;
    place('park-tree-bed-' + i, 'treePlanter', [x, parkY, z], {}, [box([2.6, .79, 2.6], [0, .395, 0])]);
    place('park-tree-' + i, i > 16 ? 'sakuraTree' : 'zelkovaTree', [x, parkY + .08, z], { seed: 511 + i * 17 }, [box([.7, 5.3, .7], [0, 2.57, 0])], [0, i * .7, 0], [scale, scale, scale]);
  });
  for (const [i, [x, z, yaw]] of [[-25.7, 97, Math.PI / 2], [7, 136, Math.PI / 2], [-17.5, 138, -Math.PI / 2], [25, 148.5, Math.PI]].entries()) {
    place('park-bench-pad-' + i, 'pocketPaving', [x, height, z], { width: 3.2, depth: 2.3, stone: true }, [box([3.2, .078, 2.3], [0, .039, 0])]);
    place('park-bench-' + i, 'parkBench', [x, height + .078, z], {}, [box([2, .96, .66], [0, .48, -.035])], [0, yaw, 0]);
  }
  // 花叶与灌木允许穿过, 花坛/景石/树干保留实体碰撞; 后侧绿篱只遮景, 地图边界由外围墙负责.
  for (const [i, [x, z, w]] of [[-26, 151, 38], [26, 151, 38], [-41, 79.3, 12], [41, 79.3, 12]].entries()) {
    place('park-boundary-bed-' + i, 'stoneFlowerbed', [x, parkY, z], { width: w + .5, depth: 2, height: .16 }, [box([w + .5, .16, 2], [0, .08, 0])]);
    place('park-boundary-hedge-' + i, 'lowHedge', [x, parkY + .06, z], { width: w, depth: 1.5, height: 1.45, seed: 641 + i });
  }
  const terrace = [box([width, height, depth], [0, height / 2, start + depth / 2])];
  for (let i = 0; i < steps; i++) {
    const h = height * (i + 1) / steps, z = start - (steps - i - .5) * tread;
    terrace.push(box([stairWidth, h, tread], [0, h / 2, z]));
    for (const side of [-1, 1]) terrace.push(box([.18, h + .22, tread], [side * (stairWidth / 2 + .09), (h + .22) / 2, z]));
  }
  const railSpan = (width - stairWidth) / 2;
  for (const side of [-1, 1]) terrace.push(box([railSpan, .95, .1], [side * (stairWidth / 2 + railSpan / 2), height + .475, start + .1]));
  place('station-neighborhood', 'stationNeighborhood', [0, 0, 0], neighborhood, terrace);
  // 草坪只布置在本站区空地: 前排树池后留 .9 米, 宅院间留至少 1.5 米通行带.
  place('station-lawns', 'lawn', [0, 0, 0], { patches: [
    [17, 0, 8.6, 14, 2.8], [34.8, 0, 8.6, 13, 2.8],
    ...[-35, -18, 18, 35].map(x => [x, height, 33, Math.abs(x) === 35 ? 8 : 6, Math.abs(x) === 35 ? 3 : 2.4])
  ] });
  // 楼梯两侧只完善本站区, 铺地保持低矮, 前方和靠楼梯的一侧开放通行.
  place('station-cycle-court', 'pocketPaving', [-15.5, 0, 15.5], { width: 15, depth: 8, parking: true, parkingRows: [-3.3, .5] }, [box([15, .078, 8], [0, .039, 0])]);
  place('station-pocket-garden', 'pocketPaving', [18, 0, 15.5], { width: 19, depth: 8, garden: true }, [box([19, .06, 8], [0, .03, 0])]);
  place('station-stair-landing', 'pocketPaving', [.25, 0, 13.55], { width: 16.46, depth: 1.8 }, [box([16.46, .078, 1.8], [0, .039, 0])]);
  // 楼梯右侧落地导览牌, 距后墙约 1.3 米, 面向站前步行区, 保留楼梯侧通道.
  place('station-map-sign', 'stationMapSign', [6.65, 0, 18.5], { location: [6.65, 18.5] }, [
    ...[-.89, .89].flatMap(x => [box([.1, 2.3, .1], [x, 1.15, 0]), box([.28, .08, .32], [x, .04, 0])]),
    box([2.2, 1.42, .12], [0, 1.58, 0]), box([2.3, .06, .24], [0, 2.32, .015])
  ], [0, Math.PI, 0]);
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
  place('parked-bike-court-extra', 'cityBicycle', [-15, .078, 17.22], { color: 0x557d79 }, [box([2.1, 1.23, .64], [0, .615, 0])]);
  const shadeScale = [1, .06 / .078, 1];
  place('pergola-paving', 'pocketPaving', [36, 0, 15.8], { width: 9, depth: 7, stone: true }, [box([9, .078, 7], [0, .039, 0])], [0, 0, 0], shadeScale);
  place('garden-link-paving', 'pocketPaving', [29.5, 0, 13.55], { width: 3.96, depth: 1.8, stone: true }, [box([3.96, .078, 1.8], [0, .039, 0])]);
  place('garden-bin-footing', 'pocketPaving', [40.89, 0, 13.3], { width: .74, depth: .9 }, [box([.74, .078, .9], [0, .039, 0])], [0, 0, 0], shadeScale);
  const pergolaBoxes = [-2.7, 2.7].flatMap(x => [-1.7, 1.7].flatMap(z => [box([.26, .09, .26], [x, .045, z]), box([.17, 2.9, .17], [x, 1.45, z]), box([.68, .68, .1], [x - Math.sign(x) * .28, 2.6, z])]));
  pergolaBoxes.push(...[-1.7, 1.7].map(z => box([6, .2, .16], [0, 2.9, z])), box([6, .2, 4], [0, 3.1, 0]));
  place('garden-pergola', 'gardenPergola', [36, .06, 16], {}, pergolaBoxes);
  // 光束从格栅空隙向阳光方向的反向延伸, 在地面前淡出并避开后排座椅.
  for (const [i, x] of [34.42, 35.44].entries()) place('pergola-sunshaft-' + i, 'sunlightShaft', [x, 3.24, 14.8], { sun, drop: 2.98 });
  for (const [i, x] of [34.5, 37.5].entries()) place('pergola-bench-' + i, 'parkBench', [x, .06, 17.1], {}, [box([2, .96, .66], [0, .48, -.035])], [0, Math.PI, 0]);
  // 转角两条土床留 .1 米缝, 避免石沿交叠产生闪烁.
  for (const [i, [x, z, length, yaw]] of [[34, 19.2, 4, 0], [43.5, 19.2, 4, 0], [46, 15.65, 5.4, Math.PI / 2]].entries()) {
    place('garden-hedge-bed-' + i, 'stoneFlowerbed', [x, 0, z], { width: length + .4, depth: 1.1, height: .2 }, [box([length + .4, .2, 1.1], [0, .1, 0])], [0, yaw, 0]);
    place('garden-hedge-' + i, 'lowHedge', [x, .1, z], { width: length }, [], [0, yaw, 0]);
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
  place('platform-sunshaft', 'sunlightShaft', [-24, 3.5 + canopyLift, 1.9], { sun, drop: 2.57 + canopyLift, radius: .2 });
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
  place('crossing-warning-sign', 'crossingWarningSign', [6.1, 0, -6.1], {}, [
    box([.09, 2.2, .09], [0, 1.1, -.035]), box([.28, .1, .28], [0, .05, 0]),
    box([.85, .85, .034], [0, 2.075, 0]), box([.65, .25, .034], [0, 1.45, 0])
  ], [0, -.45, 0]);
  place('seafront-railing', 'coastalStreet', [0, 0, -17.7], { kind: 'railing', length: 100 }, [box([100, 1.2, .15], [0, .6, 0])]);
  for (const [id, x, h] of [['left-lane-wall', -5.9, 1.3], ['right-garden-wall', 7.4, .7]]) {
    for (const [section, z, length, y] of [['lower', 9.4, 4.8, 0], ['upper-front', 25, 10, height], ['upper-middle', 39, 10, height], ['upper-back', 52, 8, height]]) {
      place(id + '-' + section, 'coastalStreet', [x, y, z], { kind: 'wall', length, height: h }, [box([.54, h + .1, length], [0, (h + .1) / 2, 0])]);
    }
  }
  // 保留站区围墙, 东侧住宅层和北侧主路各留 8 米通路连接新地块.
  for (const side of [-1, 1]) {
    const upper = side < 0 ? [['upper', 39, 38, height]] : [['upper-front', 27.5, 15, height], ['upper-back', 50.5, 15, height]];
    for (const [section, z, length, y] of [['lower', 1, 38, 0], ...upper]) {
      place('side-boundary-' + side + '-' + section, 'coastalStreet', [side * 49.6, y, z], { kind: 'wall', length, height: 1.8 }, [box([.54, 1.9, length], [0, .95, 0])]);
    }
  }
  for (const side of [-1, 1]) place('inland-boundary-' + side, 'coastalStreet', [side * 27, height, 57.5], { kind: 'wall', length: 46, height: 1.8 }, [box([.54, 1.9, 46], [0, .95, 0])], [0, Math.PI / 2, 0]);
  // 三种独立房屋沿小路朝向街面, 留出院落, 月台入口和海侧交战路线.
  const homes = [['japaneseCottage', [6.9, 4.65, 7.8]], ['japaneseMachiya', [6.5, 7.2, 7.8]], ['japaneseResidence', [7.3, 6.4, 7.7]]];
  // 两层住宅按主体/阳台/外挂机拆分, 不再用整栋大盒代替凸出物的碰撞.
  const residenceBoxes = [
    box([6.6, .3, 6.2], [0, .15, 0]), box([6.4, 3, 6], [0, 1.8, 0]), box([5.8, 2.75, 5.8], [-.3, 4.675, -.1]),
    ...[3.34, 6.12].map(y => box([6.7, .18, 6.35], [0, y, 0])), box([6.6, .13, 6.28], [0, 6.275, 0]),
    // 窗框/玻璃合成浅盒, 窗檐单独保留真实厚度, 跳跃时也能正确顶头.
    ...[1.85, 4.68].flatMap(y => [-1.85, .85].flatMap(x => [
      box([1.75, 1.5, .16], [x, y, y < 3 ? 3.08 : 2.88]),
      box([1.9, .07, .35], [x, y + .83, y < 3 ? 3.16 : 2.96])
    ])),
    box([4.9, .16, 1.06], [-.55, 3.48, 3.28]), box([4.9, .825, .055], [-.55, 4.065, 3.79]),
    ...[-1, 1].map(side => box([.055, .82, .96], [-.55 + side * 2.42, 4.06, 3.29])),
    box([.82, 2.1, .17], [2.48, 1.35, 3.075]), // 包含门把手.
    box([1.15, .13, .85], [2.45, .065, 3.38]), box([.19, .42, .39], [3.29, 1.21, 2.65]),
    ...[.75, 3.95].flatMap(y => [box([.455, .61, .93], [-3.3775, y, -.8]), box([.055, 1.9, .055], [-3.25, y + .7, -.25])]) // 外机, 格栅和外露管线.
  ];
  for (const [i, [kind, x, z, rotation]] of [
    [0, -35, 26], [1, -18, 26], [2, 18, 26], [0, 35, 26],
    [2, -35, 40], [0, -18, 40], [1, 18, 40], [2, 35, 40],
    [1, -35, 52], [2, -18, 52], [0, 18, 52], [1, 35, 52]
  ].entries()) {
    const [model, size] = homes[kind];
    const facing = [0, rotation ?? (x > 0 ? -Math.PI / 2 : Math.PI / 2), 0];
    place('coastal-yard-' + i, 'japaneseYard', [x, height, z], {}, [box([8, .06, 8.6], [0, .03, 0])], facing);
    place('coastal-home-' + i, model, [x, height, z], {}, kind === 2 ? residenceBoxes : [box(size, [0, size[1] / 2, .2])], facing);
    // 前两排补生活细节, 沿各自门面摆放, 不占玄关或院落踏石; 后排保留疏密变化.
    const local = (a, b, c) => [x + a * Math.cos(facing[1]) + c * Math.sin(facing[1]), height + b, z - a * Math.sin(facing[1]) + c * Math.cos(facing[1])];
    if (i < 8) {
      if (kind !== 2) place('home-mailbox-' + i, 'residentialMailbox', local(-2, 0, 4.65), {}, [box([.38, 1.175, .28], [0, .5875, .015])], facing);
      place('home-pot-' + i, 'pottedShrub', local(kind === 2 ? -.9 : 1.65, 0, 4.65), { color: i % 2 ? 0x8a9583 : 0x98715a }, [box([.4, .3, .4], [0, .15, 0])], facing);
    }
    if (i === 2 || i === 4) place('balcony-laundry-' + i, 'balconyLaundry', local(-.55, 3.56, 3.4), {}, [], facing);
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
  place('summer-clouds', 'coastalSky', [0, 0, 0], { steps: 48, sun });
  place('sun-rays', 'sunRays', [0, 0, 0], { sun, samples: 32, strength: .65 });
  place('character-shadows', 'characterShadows', [0, 0, 0], { sun });
  place('seagull-flocks', 'seagullFlock', [0, 0, 0]);
  // 花带止于楼梯和侧向通道前, 复用低石花坛; 土面高 .1 米, 花根略埋入土中.
  for (const [id, x, z, length, bedWidth] of [
    ['right-lower', 5.25, 9.45, 4, 1.2], ['right-upper', 5.25, 25.7, 9.4, 1.2],
    ['left-lower', -5, 10, 2.2, 1.1], ['left-upper', -5, 24.7, 6.4, 1.1]
  ]) place('hydrangea-bed-' + id, 'stoneFlowerbed', [x, level(z), z], { width: length, depth: bedWidth, height: .18 }, [box([length, .18, bedWidth], [0, .09, 0])], [0, Math.PI / 2, 0]);
  for (let i = 0; i < 10; i++) {
    const z = i < 5 ? 8.5 + i * 1.85 : 22 + (i - 5) * 1.85;
    const garden = i >= 2 && i < 5, s = garden ? .75 : 1;
    place('hydrangea-right-' + i, 'coastalFoliage', garden ? [10.6 + (i - 2) * 2.5, .165, 18.65] : [5.25, level(z) + .03, z], { seed: 92 + i, color: i % 4 === 0 ? 'blue' : 'pink', blooms: garden ? 8 : 11 }, [], [0, 0, 0], [s, s, s]);
  }
  for (let i = 0; i < 5; i++) {
    const z = 10 + i * 4.2, garden = i === 1 || i === 2;
    place('hydrangea-left-' + i, 'coastalFoliage', garden ? [-21.4 + (i - 1) * 1.4, .19, 18.7] : [-5, level(z) + .03, z], { seed: 507 + i, color: 'blue', blooms: 8 }, [], [0, i, 0], [.7, .7, .7]);
  }
  for (const [i, z] of [14.5, 17.8].entries()) place('garden-hydrangea-' + i, 'coastalFoliage', [26.3, .165, z], { seed: 612 + i, color: i ? 'blue' : 'pink', blooms: 8 }, [], [0, i, 0], [.72, .72, .72]);
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
  // 月台出生高度取碰撞顶面; 角色投影由 characterShadows 更新, 不写入环境阴影缓存.
  for (const [i, position] of [[2.6, 0, 7], [-11, .68, 3], [11, 0, 5], [13, 0, -10]].entries()) {
    instances.push({ id: 'coastal-enemy-' + i, model: 'enemy', position,
      collision: { enabled: true, dynamic: true, radius: .42, height: 1.9 },
      options: { speed: 1.8, fireInterval: 1.3 + i * .1, castShadow: false } });
  }
  // 主人物沿用原有第一人称手臂和武器, 挂载到相机并复用射击与动画接口.
  instances.push({ id: 'view-rifle', model: 'rifle', attach: 'camera', position: [.3, -.3, -.65], rotation: [0, 0, 0], scale: [1, 1, 1], collision: { enabled: false } });
  window.FPS_LAYOUT = {
    name: '镰仓高校前 · 夏日海岸', mode: 'combat',
    regionPlan,
    catalog: {
      kamakuraGround: 'models/kamakura-ground.js', enodenTrain: 'models/enoden-train.js',
      kamakuraStation: 'models/kamakura-station.js', railwayCrossing: 'models/railway-crossing.js',
      vendingMachine: 'models/vending-machine.js',
      coastalSailboat: 'models/coastal-sailboat.js', cityBicycle: 'models/city-bicycle.js',
      recyclingBin: 'models/recycling-bin.js', streetLamp: 'models/street-lamp.js',
      parkBench: 'models/park-bench.js', bicycleRack: 'models/bicycle-rack.js', communityBoard: 'models/community-board.js',
      stationMapSign: 'models/station-map-sign.js',
      crossingWarningSign: 'models/crossing-warning-sign.js',
      pocketPaving: 'models/pocket-paving.js', stoneFlowerbed: 'models/stone-flowerbed.js',
      stationShop: 'models/station-shop.js', cafeTableSet: 'models/cafe-table-set.js', gardenPergola: 'models/garden-pergola.js',
      shopThreshold: 'models/shop-threshold.js', drainGrate: 'models/drain-grate.js', shopPlaque: 'models/shop-plaque.js',
      lowHedge: 'models/low-hedge.js', drinkingFountain: 'models/drinking-fountain.js',
      coastalBeach: 'models/coastal-beach.js', stationNeighborhood: 'models/station-neighborhood.js',
      districtGround: 'models/district-ground.js',
      lakeFence: 'models/lake-fence.js', pondLotus: 'models/pond-lotus.js', waterSplash: 'models/water-splash.js',
      waterIris: 'models/water-iris.js',
      parkBridge: 'models/park-bridge.js', parkPond: 'models/park-pond.js', parkFlowerbed: 'models/park-flowerbed.js', emaRack: 'models/ema-rack.js',
      dryGarden: 'models/dry-garden.js', landscapeRocks: 'models/landscape-rocks.js',
      shrineParkGround: 'models/shrine-park-ground.js', shrineTorii: 'models/shrine-torii.js', parkShrine: 'models/park-shrine.js',
      temizuya: 'models/temizuya.js', parkPavilion: 'models/park-pavilion.js', stoneLantern: 'models/stone-lantern.js', parkSign: 'models/park-sign.js',
      lawn: 'models/lawn.js',
      sunlightShaft: 'models/sunlight-shaft.js',
      sunRays: 'models/sun-rays.js',
      characterShadows: 'models/character-shadows.js',
      japaneseCottage: 'models/japanese-cottage.js', japaneseMachiya: 'models/japanese-machiya.js', japaneseResidence: 'models/japanese-residence.js',
      japaneseYard: 'models/japanese-yard.js',
      residentialMailbox: 'models/residential-mailbox.js', pottedShrub: 'models/potted-shrub.js', balconyLaundry: 'models/balcony-laundry.js',
      treePlanter: 'models/tree-planter.js', zelkovaTree: 'models/zelkova-tree.js', sakuraTree: 'models/sakura-tree.js', seagullFlock: 'models/seagull-flock.js',
      coastalStreet: 'models/coastal-street.js', coastalUtilities: 'models/coastal-utilities.js',
      kamakuraOcean: 'models/kamakura-ocean.js', enoshimaIsland: 'models/enoshima-island.js',
      coastalSky: 'models/coastal-sky.js', coastalFoliage: 'models/coastal-foliage.js',
      rifle: 'models/rifle.js', enemy: 'models/enemy.js', tracer: 'models/tracer.js', flash: 'models/flash.js',
      impact: 'models/impact.js', bulletmark: 'models/bulletmark.js', lampShards: 'models/lamp-shards.js'
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
      // 同一太阳向量保持光照方向, 扩大静态阴影覆盖车站和公园, 不增加贴图分辨率或光源.
      { type: 'sun', color: 0xffedce, intensity: 3.5, position: [-96, 146.4, 7], target: [0, 2.4, 70], shadow: true, shadowExtent: 105, shadowFar: 320, shadowBias: -.00055, staticShadow: true }
    ],
    instances
  };
})();
