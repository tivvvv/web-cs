// 镰仓高校前海岸场景. 所有模型独立成文件, 变换, 碰撞与构图集中在此配置.
(() => {
  const instances = [];
  function place(id, model, position, options = {}, boxes = [], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    instances.push({ id, model, position, rotation, scale, options, collision: boxes.length ? { enabled: true, boxes } : { enabled: false } });
  }
  const box = (size, offset = [0, 0, 0]) => ({ size, offset });
  // 立面细节使用本地朝向和墙面原点, 将浅框/雨檐尺寸转换为同位置的 AABB.
  const facadeBox = (size, face, offset = [0, 0, 0]) => {
    const c = Math.cos(face.yaw), s = Math.sin(face.yaw), p = face.position;
    return box([Math.abs(c) * size[0] + Math.abs(s) * size[2], size[1], Math.abs(s) * size[0] + Math.abs(c) * size[2]],
      [p[0] + offset[0] * c + offset[2] * s, p[1] + offset[1], p[2] - offset[0] * s + offset[2] * c]);
  };
  const neighborhood = { height: 2.4, start: 20, depth: 38, width: 100, steps: 12, tread: .45, stairWidth: 7.6 };
  const level = z => z >= neighborhood.start ? neighborhood.height : 0;
  // 沙滩网格与浪花共用坡面参数, 防止岸线错位.
  const shoreline = { sandLevel: -1.05, sandStart: -18, slope: .04, halfWidth: 80, edgeSlope: .045 };
  const harborBasin = { bounds: [70, -78, 170, -18], bottom: -6 };
  const sun = [-36, 29, -28];
  // 先地面, 再近景主体, 然后远景与植被. 地面上表面为 Y=0.
  place('coastal-ground', 'kamakuraGround', [0, 0, 0], {}, [box([100, .6, 76], [0, -.3, 20]), box([8.2, .17, 4.6], [0, .085, 0])]);
  place('coastal-beach', 'coastalBeach', [0, 0, 0], { ...shoreline, basins: [harborBasin] });
  const { height, start, depth, width, steps, tread, stairWidth } = neighborhood;
  // 保留已定型站区/公园, 各分区的地形与通行由独立规格管理.
  const regionPlan = {
    active: 'southwest', cellSize: [100, 76], connectionWidth: 20, groundY: height,
    corners: [
      { id: 'southwest', name: '海滨车站', center: [0, 20], status: 'developed' },
      { id: 'northwest', name: '神社与林间公园', center: [0, 116], status: 'developed' },
      { id: 'northeast', name: '海望山与岩壁步道', center: [120, 116], status: 'developed' },
      { id: 'southeast', name: '集装箱货运码头', center: [120, 20], status: 'developed' }
    ],
    center: { name: '中央广场', position: [60, 68], size: [20, 20], status: 'developed' }
  };
  // 公园东半部湖区挖去原台地, 岸线共用于模型和岸边碰撞, 水下保留真实池底.
  const pond = { x: 25, z: 123, width: 40, depth: 44, bottom: -.55, waterLevel: -.18, rim: .024 };
  const pondCut = [pond.x - pond.width / 2, pond.z - pond.depth / 2, pond.x + pond.width / 2, pond.z + pond.depth / 2];
  const shore = Array.from({ length: 40 }, (_, i) => { const a = i * Math.PI / 20; return [(pond.width / 2 - 2) * Math.cos(a) * (1 + .09 * Math.sin(a)), Math.round((pond.depth / 2 - 2) * Math.sin(a) * 10000) / 10000]; });

  const parcels = [...[[-50, 78, pondCut[0], 154], [pondCut[2], 78, 50, 154], [pondCut[0], 78, pondCut[2], pondCut[1]], [pondCut[0], pondCut[3], pondCut[2], 154]].map(([x0, z0, x1, z1]) => [(x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0]), [60, 21, 20, 78], [60, 116, 20, 76], [0, 68, 100, 20], [120, 68, 100, 20]];
  const slabs = parcels.map(([x, z, w, d]) => box([w, height + .6, d], [x, (height - .6) / 2, z]));
  slabs.push(box([pond.width, height + .6 + pond.bottom, pond.depth], [pond.x, (height + pond.bottom - .6) / 2, pond.z]));
  // 外围用简单实心挡墙, 不复制砖块细节; 内部地块相接, 无叠面或额外台阶.
  const edges = [box([120, 1.8, .54], [10, height + .9, 153.73]), box([.54, 1.8, 19.73], [169.73, height + .9, 67.865]),
    box([19.73, 1.8, .54], [59.865, height + .9, -17.73]), box([.54, 1.8, 95.41], [-49.6, height + .9, 105.755])];
  place('reserved-district-ground', 'districtGround', [0, 0, 0], { slabs, edges }, [...slabs, ...edges]);
  // 集装箱码头: 低岸线, 作业台地, 箱顶与仓库夹层; 独立模型共用以下尺寸和实体支撑.
  const port = { center: [120, 20], yardY: height, quayY: .6, bounds: [70, -18, 170, 58] };
  const portPoint = ([x, y, z]) => [x - port.center[0], y, z - port.center[1]];
  const portWorld = ([x, y, z]) => [x + port.center[0], y, z + port.center[1]];
  const portBox = (size, point, kind) => ({ ...box(size, portPoint(point)), ...(kind ? { kind } : {}) });
  const portSlabs = [portBox([100, 3.6, 21.4], [120, -1.2, -7.3]), portBox([100, 5.4, 54.6], [120, -.3, 30.7])];
  const portWalls = [portBox([.26, 1.8, 21.4], [70.13, 1.5, -7.3], 'wall')];
  for (const [a, b] of [[70, 81.5], [86.5, 121.5], [126.5, 161.5], [166.5, 170]])
    portWalls.push(portBox([b - a, 1.8, .4], [(a + b) / 2, 1.5, 3.2], 'wall'));
  const markings = [];
  const paint = (points, width = .16, color = '#d5bd72', closed = false) => markings.push({ points: points.map(([x, z]) => [x - 120, z - 20]), width, color, closed });
  for (const x of [74, 82]) paint([[x, 5], [x, 55]]);
  for (const z of [4.5, 57]) paint([[72, z], [168, z]]);
  for (const [x, z, w, d] of [[100, 30, 9.6, 13.2], [158, 19, 9, 13.2], [124.4, 46, 7.8, 13.2], [112, 16, 10, 14], [98, -10, 27, 5]])
    paint([[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]], .14, '#c9cdb0', true);
  for (const z of [12, 30, 48]) { paint([[78, z - 2], [78, z + 2]], .35); paint([[76.9, z + .6], [78, z + 2], [79.1, z + .6]], .35); }
  const portInsets = [[81.1, 2.4, 31, .36, 47, 'drain'], [145, 2.4, 31.7, 18, .34, 'drain'],
    [78, 2.4, 19, 1.1, .85, 'hatch'], [132.5, 2.4, 27.7, 1.1, .85, 'hatch'], [114, .6, -6, 1.1, .85, 'hatch']]
    .map(([x, y, z, w, d, kind]) => ({ position: portPoint([x, y, z]), size: [w, d], kind }));
  place('port-ground', 'portGround', [120, 0, 20], { width: 100, depth: 76, slabs: portSlabs, walls: portWalls, markings, insets: portInsets,
    patches: [[116, 51, 6, 8], [145, 31, 9, 2.5], [78.2, 25, 5.5, 4], [130.8, 26.5, 3, 2], [113.5, -5.5, 5, 2.4]].map(([x, z, w, d]) => ({ position: [x - 120, z - 20], size: [w, d] })),
    dampPatches: [[81.1, 49.5, 1.6, 7, .78], [145, 31.7, 6, 1.5, .7], [157.1, 31.9, 1.5, 1, .6]].map(([x, z, w, d, strength]) => ({ position: [x - 120, z - 20], size: [w, d], strength })),
    tracks: [
      [[77, 8], [77.2, 20], [78.2, 29], [78.4, 40], [77.8, 54]],
      [[81, 23], [87, 24.5], [95, 26], [104, 26.6], [113, 26], [119, 25]],
      [[116.4, 51.5], [116.8, 46.5], [118.2, 42], [121, 39], [127, 36], [131, 35.5]]
    ].map(points => ({ points: points.map(([x, z]) => [x - 120, z - 20]), width: .23, gauge: 1.6 })),
    craneRails: [-12.5, -4.5].map(z => ({ a: portPoint([139, .6, z]), b: portPoint([168, .6, z]) })),
    labels: [[100, 38, 'A-01'], [158, 28, 'B-02'], [124, 54, 'C-03']].map(([x, z, label]) => ({ position: [x - 120, z - 20], label })) }, [...portSlabs, ...portWalls]);

  const cargoSkin = { wall: .125, floor: .16, roof: .22, end: .14, door: .075 };
  const cargoUnits = [
    [86, height, 15, 12, 0, 0x637d7f, [-1]], [89, height, 36, 12, 0, 0xb17157, [-1]],
    [96, height, 7, 12, Math.PI / 2, 0x50767e], [111, height, 7, 6, Math.PI / 2, 0xb39c62],
    [100, height, 30, 12, 0, 0x476f7b], [100, height + 3, 30, 12, 0, 0x987354], [103.2, height, 30, 12, 0, 0x789487],
    [110, height, 16, 12, 0, 0x8d665a], [115, height, 16, 12, 0, 0x587c89], [111, height, 34, 12, 0, 0x7c9074, [-1, 1]],
    [116, height, 32, 6, 0, 0xae9560, [1]], [103, height, 49, 12, 0, 0x788482], [108, height, 49, 12, 0, 0x9c6556],
    [122.8, height, 46, 12, 0, 0x3e6c76], [126, height, 46, 12, 0, 0x829581],
    [127, height, 18, 12, Math.PI / 2, 0x728a88], [130, height, 8, 6, Math.PI / 2, 0x9e7259],
    [141, height, 15, 12, 0, 0x587d85, [-1]], [145, height, 18, 6, 0, 0xa99469],
    [156, height, 19, 12, 0, 0x3e7483], [156, height + 3, 19, 12, 0, 0x8a9d83],
    [159.2, height, 19, 12, 0, 0xaa6b50], [159.2, height + 3, 19, 12, 0, 0x526c7b],
    [96, .6, -10, 12, Math.PI / 2, 0x8f7357], [108, .6, -10, 6, Math.PI / 2, 0x4f7f82], [127, .6, -10, 6, Math.PI / 2, 0x768878, [-1]]
  ].map(([x, y, z, length, yaw, color, openEnds = []]) => ({ position: portPoint([x, y, z]), width: 2.6, height: 3, length, yaw, color,
    skin: cargoSkin, openEnds, doorAngle: Math.PI * .8 }));
  const cargoBox = (u, size, offset) => {
    const c = Math.cos(u.yaw), s = Math.sin(u.yaw);
    return box([size[0] * Math.abs(c) + size[2] * Math.abs(s), size[1], size[0] * Math.abs(s) + size[2] * Math.abs(c)],
      [u.position[0] + offset[0] * c + offset[2] * s, u.position[1] + offset[1], u.position[2] - offset[0] * s + offset[2] * c]);
  };
  const cargoBoxes = cargoUnits.flatMap(u => {
    const { width: w, height: h, length: l, skin, openEnds } = u;
    if (!openEnds.length) return [cargoBox(u, [w, h, l], [0, h / 2, 0])];
    const shells = [cargoBox(u, [w, skin.floor, l], [0, skin.floor / 2, 0]), cargoBox(u, [w, skin.roof, l], [0, h - skin.roof / 2, 0]),
      ...[-1, 1].map(side => cargoBox(u, [skin.wall, h, l], [side * (w / 2 - skin.wall / 2), h / 2, 0])),
      ...[-1, 1].filter(sign => !openEnds.includes(sign)).map(sign => cargoBox(u, [w, h, skin.end], [0, h / 2, sign * (l / 2 - skin.end / 2)]))];
    // 打开的门扇按实际铰链旋转并分成短条, 不用整箱或门扇大 AABB 封住入口.
    const leaf = (w - .28) / 2, count = Math.ceil(leaf / .4);
    for (const sign of openEnds) for (const side of [-1, 1]) {
      const yaw = sign * side * u.doorAngle, angle = u.yaw + yaw, c = Math.cos(angle), s = Math.sin(angle);
      for (let i = 0; i < count; i++) {
        const x = side * (w / 2 - .14) - side * leaf * (i + .5) / count * Math.cos(yaw), z = sign * (l / 2 - .055) + side * leaf * (i + .5) / count * Math.sin(yaw);
        const uc = Math.cos(u.yaw), us = Math.sin(u.yaw), p = [u.position[0] + x * uc + z * us, u.position[1] + h / 2, u.position[2] - x * us + z * uc], thickness = skin.door + .12;
        shells.push(box([Math.abs(c) * leaf / count + Math.abs(s) * thickness, h - .28, Math.abs(s) * leaf / count + Math.abs(c) * thickness], p));
      }
    }
    return shells;
  });
  place('port-cargo-stacks', 'cargoContainer', [120, 0, 20], { units: cargoUnits }, cargoBoxes);

  const access = { boxes: [], beams: [] }, stairRoutes = [], accessRailRuns = [], levelRailBodies = [], railPosts = new Set();
  const accessBox = (size, point, kind = 'deck', decorative = false) => access.boxes.push({ ...portBox(size, point, kind), ...(decorative ? { decorative: true } : {}) });
  const railPost = point => {
    const key = point.map(v => v.toFixed(4)).join(','); if (railPosts.has(key)) return;
    railPosts.add(key); accessBox([.065, 1.12, .065], [point[0], point[1] + .56, point[2]], 'rail', true);
  };
  function levelRail(a, b, y) {
    const p = [a[0], y, a[1]], q = [b[0], y, b[1]], count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
    accessRailRuns.push({ a: p, b: q });
    for (const lift of [.55, 1.1]) access.beams.push({ a: portPoint([p[0], y + lift, p[2]]), b: portPoint([q[0], y + lift, q[2]]), width: .065, kind: 'rail' });
    for (let i = 0; i <= count; i++) railPost(p.map((v, j) => v + (q[j] - v) * i / count));
    levelRailBodies.push(portBox([Math.abs(q[0] - p[0]) + .065, .615, Math.abs(q[2] - p[2]) + .065], [(p[0] + q[0]) / 2, y + .825, (p[2] + q[2]) / 2]));
  }
  function portStairs(id, a, b, width = 2.2) {
    const count = Math.ceil(Math.abs(b[1] - a[1]) / .2), dx = (b[0] - a[0]) / count, dz = (b[2] - a[2]) / count, dy = (b[1] - a[1]) / count;
    stairRoutes.push({ id, a, b, width, count });
    for (let i = 0; i < count; i++) {
      const x = a[0] + dx * (i + .5), z = a[2] + dz * (i + .5), y = a[1] + dy * (i + 1);
      accessBox([Math.abs(dx) || width, .08, Math.abs(dz) || width], [x, y - .04, z], 'step');
    }
    const across = dx ? [0, 0, 1] : [1, 0, 0];
    for (const side of [-1, 1]) {
      const p = a.map((v, i) => v + across[i] * side * (width / 2 - .03)), q = b.map((v, i) => v + across[i] * side * (width / 2 - .03));
      accessRailRuns.push({ a: p, b: q });
      for (const lift of [-.14, .55, 1.1]) access.beams.push({ a: portPoint([p[0], p[1] + lift, p[2]]), b: portPoint([q[0], q[1] + lift, q[2]]), width: lift < 0 ? .12 : .065, kind: lift < 0 ? 'leg' : 'rail' });
      for (let i = 0; i <= count; i += 3) {
        const t = i / count, x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t, z = p[2] + (q[2] - p[2]) * t;
        // 柱子与两道扶手共用下方的侧栏碰撞带, 不重复检测每根小柱.
        railPost([x, y, z]);
      }
      railPost(q);
      for (const t of [1 / 3, 2 / 3]) {
        const top = p[1] + (q[1] - p[1]) * t - .14, foot = Math.min(a[1], b[1]);
        accessBox([.09, top - foot, .09], [p[0] + (q[0] - p[0]) * t, (top + foot) / 2, p[2] + (q[2] - p[2]) * t], 'leg');
      }
    }
  }
  for (const x of [84, 124, 164]) portStairs('quay-' + x, [x, .6, -2], [x, height, 3.4], 5);
  portStairs('stack-a-west', [95, height, 15.8], [95, height + 6, 33.8]);
  accessBox([2.2, .12, 2.2], [95, height + 5.94, 34.9]); accessBox([2.6, .12, 2.2], [97.4, height + 5.94, 34.9]);
  portStairs('stack-a-front', [103.2, height, 15], [103.2, height + 3, 24]);
  portStairs('stack-a-roof', [103.2, height + 3, 25], [103.2, height + 6, 34]);
  accessBox([2.2, .12, 1.2], [103.2, height + 5.94, 34.6]); accessBox([.8, .12, 1.2], [101.7, height + 5.94, 34.6]);
  accessBox([.6, .12, 2], [101.6, height + 2.94, 25]);
  portStairs('stack-b-south', [152, height, 5], [152, height + 6, 23]);
  accessBox([2.2, .12, 1.2], [152, height + 5.94, 23.6]); accessBox([1.6, .12, 1.2], [153.9, height + 5.94, 23.6]);
  portStairs('stack-b-back', [163.5, height, 42], [163.5, height + 6, 24]);
  accessBox([2.2, .12, 1.2], [163.5, height + 5.94, 23.4]); accessBox([1.9, .12, 1.2], [161.45, height + 5.94, 23.4]);
  portStairs('warehouse-cargo', [122.8, height, 31], [122.8, height + 3, 40]);
  accessBox([7.1, .16, 2.6], [130.85, height + 2.92, 47]);
  accessBox([.6, .12, 2.6], [124.4, height + 2.94, 47]);
  accessBox([23.2, .16, 6.5], [146, height + 2.92, 47.25]);
  for (const x of [137, 155]) portStairs('warehouse-inside-' + x, [x, height + .04, 35.5], [x, height + 3, 44]);
  // 夹层开口取两部楼梯扶手的实际端点, 平栏与斜栏在同一根端柱闭合.
  const galleryStairs = stairRoutes.filter(s => s.id.startsWith('warehouse-inside-'));
  const galleryEnds = galleryStairs.flatMap(s => [s.b[0] - s.width / 2 + .03, s.b[0] + s.width / 2 - .03]);
  const galleryLadder = { x: 146, z: 43.82, opening: 1.4 };
  for (const [a, b] of [[134.4, galleryEnds[0]], [galleryEnds[1], galleryLadder.x - galleryLadder.opening / 2],
    [galleryLadder.x + galleryLadder.opening / 2, galleryEnds[2]], [galleryEnds[3], 157.6]]) {
    levelRail([a, 44], [b, 44], height + 3);
  }
  for (const x of [135, 145, 157]) accessBox([.16, 2.84, .16], [x, height + 1.42, 49.8], 'leg');
  for (const z of [45.72, 48.28]) {
    levelRail([127.3, z], [134.4, z], height + 3);
  }
  levelRail([134.4, 44], [134.4, 45.72], height + 3);
  levelRail([134.4, 48.28], [134.4, 50.48], height + 3);
  // 登顶平台的外侧设双横杆, 箱顶方向留口; 支腿落在作业地面.
  for (const [x0, x1, z, y] of [[93.93, 98.7, 35.97, 8.4], [101.3, 104.27, 35.17, 8.4], [150.93, 154.7, 24.17, 8.4], [160.5, 164.57, 22.83, 8.4]]) {
    levelRail([x0, z], [x1, z], y);
    for (const x of [x0 + .04, x1 - .04]) {
      accessBox([.12, y - height - .12, .12], [x, (y - .12 + height) / 2, z], 'leg');
    }
  }
  for (const [a, b] of [
    [[93.93, 33.8], [93.93, 35.97]], [[96.07, 33.8], [98.7, 33.8]],
    [[104.27, 34], [104.27, 35.17]], [[101.3, 34], [102.13, 34]],
    [[150.93, 23], [150.93, 24.17]], [[153.07, 23], [154.7, 23]],
    [[164.57, 24], [164.57, 22.83]], [[160.5, 24], [162.43, 24]]
  ]) levelRail(a, b, height + 6);
  const jumpSteps = [[100, .75, -5.8], [98.4, 1.5, -6.6], [96.8, 2.25, -7.4]];
  for (const [x, h, z] of jumpSteps) accessBox([1.5, h, 1.5], [x, .6 + h / 2, z], 'crate');
  // 每侧的双横杆和小柱共用窄带, 沿坡度分段保留楼梯下方空间.
  const accessRails = stairRoutes.flatMap(({ a, b, width }) => {
    const dx = b[0] - a[0], dz = b[2] - a[2], count = Math.ceil(Math.hypot(dx, dz) / 1.8), across = dx ? [0, 0, 1] : [1, 0, 0];
    return [-1, 1].flatMap(side => Array.from({ length: count }, (_, i) => {
      const p = a.map((v, j) => v + (b[j] - v) * i / count), q = a.map((v, j) => v + (b[j] - v) * (i + 1) / count);
      const low = Math.min(p[1], q[1]) + .5175, high = Math.max(p[1], q[1]) + 1.1325;
      return portBox([Math.abs(q[0] - p[0]) + .065, high - low, Math.abs(q[2] - p[2]) + .065],
        [(p[0] + q[0]) / 2 + across[0] * side * (width / 2 - .03), (low + high) / 2, (p[2] + q[2]) / 2 + across[2] * side * (width / 2 - .03)]);
    }));
  });
  place('port-access-routes', 'portAccess', [120, 0, 20], access, [...access.boxes.filter(b => !b.decorative), ...accessRails, ...levelRailBodies]);
  // 竖梯在箱端和夹层提供短路线; 造型, 身体边框与通用攀爬数据共用位置和尺寸.
  const portLadders = [
    { id: 'stack-a-ladder', position: portPoint([100, height, 36.13]), height: 6, yaw: 0 },
    { id: 'stack-b-ladder', position: portPoint([159.2, height, 12.87]), height: 6, yaw: Math.PI },
    { id: 'single-box-ladder', position: portPoint([108, height, 55.13]), height: 3, yaw: 0 },
    { id: 'warehouse-gallery-ladder', position: portPoint([galleryLadder.x, height + .04, galleryLadder.z]), height: 2.96, yaw: Math.PI,
      topWidth: galleryLadder.opening, returnDepth: .18, mount: false, returnPost: false }
  ].map(l => ({ width: .9, returnDepth: .28, ...l }));
  const climbRoutes = portLadders.map(l => {
    const normal = [Math.sin(l.yaw), 0, Math.cos(l.yaw)], top = [l.position[0], l.position[1] + l.height, l.position[2]];
    return { id: l.id, bottom: l.position, top, normal, width: l.width, exit: top.map((v, i) => v - normal[i] * .65) };
  });
  place('port-vertical-ladders', 'verticalLadder', [120, 0, 20], { ladders: portLadders }, portLadders.flatMap(l => [-1, 1].map(side =>
    facadeBox([(l.topWidth ?? l.width) / 2 - l.width / 2 + .16, l.height + 1.14, l.returnDepth + .15], { position: l.position, yaw: l.yaw },
      [side * (l.width + (l.topWidth ?? l.width)) / 4, (l.height + 1.14) / 2, -l.returnDepth / 2]))));
  instances.at(-1).traversal = { ladders: climbRoutes };

  const warehouse = { width: 24, depth: 18, height: 8, roof: { rise: 1.35, overhang: .4, thickness: .12 }, canopy: { width: 8.5, depth: 2.3, height: 4.5 },
    floorZones: [{ bounds: [-6.7, -5, -3.3, -3.4], label: 'A-02' }, { bounds: [2.6, -6.7, 5.4, -1.8], label: 'FORKLIFT' },
      { bounds: [2.78, 6.33, 6.22, 7.67], label: 'B-02' }, { bounds: [9.32, 4.65, 11.68, 5.75], label: 'SERVICE' }], shell: [box([24, .08, 18], [0, 0, 0])] };
  warehouse.shell[0].kind = 'floor';
  const wall = (size, point) => warehouse.shell.push({ ...box(size, point), kind: 'wall' });
  for (const side of [-1, 1]) {
    for (const x of [-7.8, 7.8]) wall([8.4, 8, .22], [x, 4, side * 8.89]);
    wall([7.2, 3.8, .22], [0, 6.1, side * 8.89]);
  }
  wall([.22, 3, 18], [-11.89, 1.5, 0]); wall([.22, 2.7, 18], [-11.89, 6.65, 0]);
  wall([.22, 2.3, 12.5], [-11.89, 4.15, -2.75]); wall([.22, 2.3, 2.5], [-11.89, 4.15, 7.75]);
  for (const z of [-6.3, 6.3]) wall([.22, 8, 5.4], [11.89, 4, z]); wall([.22, 3.8, 7.2], [11.89, 6.1, 0]);
  // 坡屋顶按窄条包围, 共用屋面坡度和厚度, 避免一个大盒形成悬空天花板.
  const roofHalf = warehouse.width / 2 + warehouse.roof.overhang, roofCount = Math.ceil(roofHalf / .75), roofSlope = warehouse.roof.rise / (warehouse.width / 2);
  const roofSkin = warehouse.roof.thickness / 2 * Math.hypot(1, roofSlope), warehouseRoof = [];
  for (const side of [-1, 1]) for (let i = 0; i < roofCount; i++) {
    const a = roofHalf * i / roofCount, b = roofHalf * (i + 1) / roofCount;
    const low = warehouse.height + warehouse.roof.rise - b * roofSlope - roofSkin, high = warehouse.height + warehouse.roof.rise - a * roofSlope + roofSkin;
    warehouseRoof.push(box([b - a, high - low, warehouse.depth + warehouse.roof.overhang * 2], [side * (a + b) / 2, (low + high) / 2, 0]));
  }
  const canopy = warehouse.canopy, canopyZ = -warehouse.depth / 2 - canopy.depth / 2;
  const warehouseExtras = [box([canopy.width, .14, canopy.depth + .2], [0, canopy.height + .05, canopyZ]),
    ...[-1, 1].map(s => box([.13, canopy.height, .13], [s * (canopy.width / 2 - .18), canopy.height / 2, -warehouse.depth / 2 - canopy.depth + .12]))];
  place('port-logistics-warehouse', 'portWarehouse', [146, height, 42], warehouse, [...warehouse.shell, ...warehouseRoof, ...warehouseExtras]);

  const craneBodies = [-7, 7].flatMap(x => [-4, 4].flatMap(z => [box([2.2, .95, 2.3], [x, .475, z]), box([.72, 14, .72], [x, 7.5, z])]));
  place('port-gantry-crane', 'portCrane', [150, .6, -8.5], {}, craneBodies);
  place('port-moored-freighter', 'cargoShip', [122, -2.05, -31], { length: 78, width: 16 }, [box([78, 6.7, 16], [0, 1.55, 0])]);
  const railRuns = [
    { a: [70.3, .6, -17.7], b: [169.7, .6, -17.7] },
    { a: [169.7, .6, -17.7], b: [169.7, .6, 3.4] }, { a: [169.7, height, 3.4], b: [169.7, height, 58] }
  ];
  const bollards = [74, 86, 112, 136, 162].map(x => [x, .6, -16.2]);
  const fixtures = { rails: railRuns.map(r => ({ a: portPoint(r.a), b: portPoint(r.b) })), bollards: bollards.map(portPoint),
    fenders: [76, 87, 112, 134, 156, 166].map(x => portPoint([x, -1.2, -18.03])),
    ropes: [{ a: portPoint([86, 1.23, -16.2]), b: portPoint([89, 2.5, -23]), sag: .3 }, { a: portPoint([162, 1.23, -16.2]), b: portPoint([151, 2.5, -25]), sag: .25 }],
    coils: [[75.1, .6, -15.25], [113, .6, -15.25], [160.8, .6, -15.15]].map(p => ({ position: portPoint(p), radius: .48 })),
    signs: [{ position: portPoint([73, 6.4, 44]), width: 7.2, yaw: -Math.PI / 2, slot: 0, gate: true },
      { position: portPoint([80, 2.9, -14.5]), width: 2.8, yaw: 0, slot: 1 }, { position: portPoint([144, 4.7, 30]), width: 2.8, yaw: Math.PI, slot: 2 }] };
  const portBarriers = railRuns.map(({ a, b }) => portBox([Math.abs(b[0] - a[0]) || .12, 2.1, Math.abs(b[2] - a[2]) || .12], [(a[0] + b[0]) / 2, a[1] + 1.05, (a[2] + b[2]) / 2]));
  const signBodies = fixtures.signs.flatMap(({ position: [x, y, z], width, yaw, gate }) => {
    const c = Math.cos(yaw), s = Math.sin(yaw), panel = box([Math.abs(c) * (width + .12) + Math.abs(s) * .12, width * .156 + .12, Math.abs(s) * (width + .12) + Math.abs(c) * .12], [x, y, z]);
    return [panel, ...(gate ? [-1, 1].map(side => box([.18, 4.6, .18], [x + side * (width / 2 + .22) * c, y - 1.7, z - side * (width / 2 + .22) * s])) : [box([.1, 2.2, .1], [x, y - 1.2, z])])];
  });
  place('port-quay-fixtures', 'portFixtures', [120, 0, 20], fixtures, [...portBarriers, ...bollards.map(p => portBox([.76, .8, .65], [p[0], p[1] + .4, p[2]])), ...signBodies]);

  // 装卸车辆集中在箱堆间作业区, 西侧车道/仓库门洞/楼梯落脚点保持通畅.
  const reachBodies = [box([3.7, .62, 6.8], [0, 1.18, -.65]), box([3.9, 1.35, 2.4], [0, 1.88, -2.75]),
    box([2.4, 2.46, 2.15], [0, 2.73, -.6]), box([4.52, 1.9, 1.92], [0, .95, 1.9]), box([4.52, 1.67, 1.63], [0, .835, -2.4]),
    box([.94, 3.6, 3.1], [0, 3.79, 2.275]), box([.68, 1.95, 2.66], [0, 5.57, 4.15]), box([2.6, .91, 3], [0, 6.14, 5.4])];
  place('port-reachstacker', 'portReachstacker', [116.6, height, 50.3], {}, reachBodies, [0, Math.PI, 0]);
  const forkliftBodies = [box([1.89, 1.48, 2.5], [0, .74, -.15]), box([1.45, .13, 1.66], [0, 2.485, -.15]),
    ...[-1, 1].flatMap(s => [box([.095, 1.6, .095], [s * .61, 1.65, -.79]), box([.095, 1.6, .095], [s * .61, 1.66, .48]),
      box([.18, 2.79, .25], [s * .52, 1.395, 1.09]), box([.16, .11, 1.61], [s * .38, .295, 2.035])]),
    box([1.26, .16, .22], [0, 2.79, 1.09]), box([1.22, .2, .14], [0, .88, 1.26])];
  place('port-warehouse-forklift', 'portForklift', [150, height + .04, 38.4], {}, forkliftBodies, [0, Math.PI, 0]);
  const tractorBodies = [box([2.46, 1.12, 4.67], [0, .56, 0]), box([2.42, 2.65, 2.15], [0, 1.985, .88]),
    ...[-.82, .82].map(x => box([.22, .35, 9.2], [x, 1.47, -6.04])),
    ...[-1.55, -3.4, -5.6, -7.6, -10.5].map(z => box([2.55, .4, .37], [0, 1.5, z])),
    ...[-7.8, -8.75, -9.7].map(z => box([2.48, 1.14, 1.12], [0, .57, z])),
    ...[-.91, .91].map(x => box([.35, 1.25, .4], [x, 1.005, -4.08])), box([2.4, .25, .23], [0, .67, -10.63])];
  place('port-terminal-tractor', 'portTerminalTractor', [119, height, 25], {}, tractorBodies, [0, -Math.PI / 2, 0]);

  // 货位按装卸/储存/检修分组. 低层架放在夹层下, 高架避让楼梯和贯通门洞.
  const racks = [
    { position: portPoint([141, height + .04, 37.8]), width: 3, depth: 1.15, height: 4.15, levels: [.24, 1.7, 3.15] },
    { position: portPoint([150.5, height + .04, 49]), width: 3.1, depth: 1.1, height: 2.65, levels: [.22, 1.55] }
  ];
  const loads = [
    [143, 2.44, 45.6, 'wrapped', [1.2, 1.35, 1.1]], [141, 2.44, 48.3, 'drums', [1.35, 1.1, 1.25]],
    [154, 5.4, 49.6, 'crate', [1.4, 1.2, 1.1]], [139.5, 2.4, 29.9, 'wrapped', [1.4, 1.5, 1.2]],
    [137, 2.4, 54.1, 'crate', [1.4, 1.25, 1.2]], [135.4, 2.4, 54.1, 'wrapped', [1.3, 1.5, 1.2]],
    [116.4, .6, -11, 'reel', [1.9, 2.1, 1.4]], [118.8, .6, -11.4, 'crate', [1.3, 1.05, 1.1]],
    [85.2, 2.56, 18.5, 'crate', [.6, 1.25, 1.7]], [88.2, 2.56, 39.3, 'wrapped', [.6, 1.25, 1.5]],
    [140.2, 2.56, 18.4, 'crate', [.6, 1.25, 1.5]], [115.2, 2.56, 30.4, 'wrapped', [.6, 1.1, 1.2]]
  ].map(([x, y, z, kind, size]) => ({ position: portPoint([x, y, z]), kind, size }));
  const benches = [{ position: portPoint([156.5, height + .04, 47.2]) }];
  place('port-cargo-workarea', 'portCargoWorkarea', [120, 0, 20], { racks, loads, benches }, [
    ...racks.map(r => box([r.width + .11, r.height, r.depth + .11], [r.position[0], r.position[1] + r.height / 2, r.position[2]])),
    ...loads.map(l => box([l.size[0] + (l.kind === 'crate' ? .055 : 0), l.size[1] + .015, l.size[2] + (l.kind === 'crate' ? .12 : .055)], [l.position[0], l.position[1] + (l.size[1] + .015) / 2, l.position[2]])),
    box([2.1, 1.4, .8], [benches[0].position[0], benches[0].position[1] + .7, benches[0].position[2]])
  ]);
  const utilities = {
    fans: [[150.6, 7.2, 32.81, Math.PI], [139, 7.4, 51.19, 0], [158.19, 9.45, 45.6, Math.PI / 2]].map(([x, y, z, yaw]) => ({ position: portPoint([x, y, z]), yaw })),
    roofVents: [[140, 11.075, 40], [152, 11.075, 46]].map(p => ({ position: portPoint(p) })),
    lamps: [[139, 9.3, 42, .82], [146, 9.3, 42, .82], [153, 9.3, 42, .82], [156, 5.11, 47.2, .05]].map(([x, y, z, suspension]) => ({ position: portPoint([x, y, z]), suspension })),
    pipes: [
      { points: [[150.6, 7.2, 32.73], [157.1, 7.2, 32.73], [157.1, 2.5, 32.73]], clamps: [[157.1, 3.1, 32.73], [157.1, 5, 32.73], [153, 7.2, 32.73]], mount: [0, 0, .31] },
      { points: [[139, 7.4, 51.27], [134.7, 7.4, 51.27], [134.7, 2.5, 51.27]], clamps: [[134.7, 3.1, 51.27], [134.7, 5, 51.27]], mount: [0, 0, -.31] }
    ].map(p => ({ points: p.points.map(portPoint), clamps: p.clamps.map(portPoint), radius: .055, mount: p.mount })),
    trays: [{ a: portPoint([146, 9.9, 33.4]), b: portPoint([146, 9.9, 50.6]), width: .34, supports: [0, .5, 1], suspension: .22 }]
  };
  place('port-warehouse-utilities', 'portUtilities', [120, 0, 20], utilities, [
    ...utilities.fans.map(f => facadeBox([1.3, 1.3, .64], { position: f.position, yaw: f.yaw }, [0, 0, .12])),
    ...utilities.roofVents.map(v => box([1.28, 1.66, 1.28], [v.position[0], v.position[1] + .655, v.position[2]])),
    ...utilities.lamps.map(l => box([1.9, l.suspension + .186, .33], [l.position[0], l.position[1] + (l.suspension - .026) / 2, l.position[2]])),
    ...utilities.pipes.flatMap(p => p.points.slice(1).map((b, i) => { const a = p.points[i]; return box(a.map((v, j) => Math.abs(b[j] - v) + .12), a.map((v, j) => (v + b[j]) / 2)); })),
    ...utilities.trays.map(t => box([t.width, .112, Math.abs(t.b[2] - t.a[2])], [t.a[0], t.a[1] + .035, (t.a[2] + t.b[2]) / 2]))
  ]);
  const service = {
    lights: [[80, height, 8], [80, height, 54], [166, height, 49], [135, .6, -15]].map(p => ({ position: portPoint(p), height: 12 })),
    booths: [{ position: portPoint([73.5, height, 36]) }], barriers: [portPoint([73.5, height, 40.2])],
    cabinets: [[138.9, height, 32.45, 'fire', Math.PI], [165.8, height, 47, 'electrical', 0], [83, .6, -15.2, 'fire', 0]].map(([x, y, z, kind, yaw]) => ({ position: portPoint([x, y, z]), kind, yaw })),
    rings: [75, 118, 167].map(x => ({ position: portPoint([x, .6, -17.5]) })),
    ladders: [81, 132].map(x => ({ position: portPoint([x, .6, -18.02]) })),
    backgroundDock: { position: portPoint([206, -.6, -82]), width: 50, depth: 15 }
  };
  place('port-service-facilities', 'portService', [120, 0, 20], service, [
    ...service.lights.flatMap(l => [box([.8, .18, .8], [l.position[0], l.position[1] + .09, l.position[2]]), box([.32, l.height, .32], [l.position[0], l.position[1] + .18 + l.height / 2, l.position[2]])]),
    box([3.22, 2.98, 2.96], [service.booths[0].position[0], height + 1.49, service.booths[0].position[2]]),
    box([.58, 4.84, .57], [service.barriers[0][0], height + 2.42, service.barriers[0][2]]),
    ...service.cabinets.flatMap(c => [facadeBox([.9, 1.46, .7], { position: c.position, yaw: c.yaw }, [0, .73, 0]),
      ...(c.kind === 'fire' ? [facadeBox([.22, .9, .22], { position: c.position, yaw: c.yaw }, [.62, .45, 0])] : [])]),
    ...service.rings.map(r => box([.3, 2.05, .3], [r.position[0], r.position[1] + 1.025, r.position[2]]))
  ]);
  regionPlan.corners[3].routes = { stairs: stairRoutes, rails: accessRailRuns,
    ladders: climbRoutes.map(l => ({ ...l, bottom: portWorld(l.bottom), top: portWorld(l.top), exit: portWorld(l.exit) })),
    jumpSteps, quayY: .6, yardY: height, warehouse: [146, height, 42] };

  // 东北海岸小山: 连续岩脊, 两条完整登顶线与东侧栈道捷径; 高度数据同时供网格与通用碰撞使用.
  const mountainRoot = [120, 0, 116], mountainWorld = ([x, y, z]) => [x + 120, y, z + 116];
  const mountainStairs = [], mountainRails = [], trailBoxes = [], trailBeams = [], trailCollision = [], trailPosts = new Set(), trailPads = [];
  function trailBox(size, offset, kind = 'stone') { trailBoxes.push({ ...box(size, offset), kind }); trailCollision.push(box(size, offset)); }
  function trailRail(a, b) {
    mountainRails.push({ a: mountainWorld(a), b: mountainWorld(b) });
    for (const lift of [.55, 1.04]) trailBeams.push({ a: [a[0], a[1] + lift, a[2]], b: [b[0], b[1] + lift, b[2]], radius: .04 });
    const length = Math.hypot(b[0] - a[0], b[2] - a[2]), count = Math.max(1, Math.ceil(length / 2)), segments = Math.max(1, Math.ceil(Math.abs(b[1] - a[1]) / .7));
    for (let i = 0; i <= count; i++) {
      const p = a.map((v, j) => v + (b[j] - v) * i / count), key = p.map(v => v.toFixed(4)).join('/');
      if (trailPosts.has(key)) continue; trailPosts.add(key);
      trailBeams.push({ a: [p[0], p[1] + .035, p[2]], b: [p[0], p[1] + 1.07, p[2]], radius: .04 });
    }
    for (let i = 0; i < segments; i++) {
      const p = a.map((v, j) => v + (b[j] - v) * i / segments), q = a.map((v, j) => v + (b[j] - v) * (i + 1) / segments);
      trailCollision.push(box([Math.abs(q[0] - p[0]) + .12, 1.14 + Math.abs(q[1] - p[1]), Math.abs(q[2] - p[2]) + .12], [(p[0] + q[0]) / 2, Math.min(p[1], q[1]) + .55, (p[2] + q[2]) / 2]));
    }
  }
  function trailStair(id, a, b, width = 3.2, rails = true) {
    const dx = b[0] - a[0], dz = b[2] - a[2], count = Math.ceil((b[1] - a[1]) / .21), rise = (b[1] - a[1]) / count;
    for (let i = 0; i < count; i++) {
      const y = a[1] + (i + 1) * rise, size = dx ? [Math.abs(dx) / count, .65, width] : [width, .65, Math.abs(dz) / count];
      trailBox(size, [a[0] + dx * (i + .5) / count, y - .325, a[2] + dz * (i + .5) / count]);
    }
    if (rails) for (const side of [-1, 1]) {
      const shift = dx ? [0, 0, side * (width / 2 + .1)] : [side * (width / 2 + .1), 0, 0];
      trailRail(a.map((v, i) => v + shift[i]), b.map((v, i) => v + shift[i]));
    }
    mountainStairs.push({ id, a: mountainWorld(a), b: mountainWorld(b), width, localA: a, localB: b });
  }
  function trailPad(id, rect, top, kind = 'stone', fill = true) {
    const [x0, z0, x1, z1] = rect; trailPads.push({ id, rect, top, fill });
    const thickness = kind === 'wood' ? .18 : .55;
    trailBox([x1 - x0, thickness, z1 - z0], [(x0 + x1) / 2, top - thickness / 2, (z0 + z1) / 2], kind);
    if (kind === 'wood') for (let z = z0 + .35; z < z1; z += 1.8) trailBox([x1 - x0, .22, .14], [(x0 + x1) / 2, top - .29, z], 'wood');
  }
  const mountainPaths = [
    {id:'south-trail',width:3.2,points:[[-12,2.4,-38],[-12,3,-32],[-6,4.3,-28],[2,6.3,-26],[9,8.4,-23],[12,10.5,-17],[10,12.7,-11],[3,14.4,-8],[-4,17,-5],[-7,19.4,1],[-5,21.4,7],[1,22.4,9],[9,24.2,9],[16,24.2,12],[20,24.2,14.4]]},
    {id:'forest-trail',width:2.8,points:[[-50,2.4,0],[-43,3.6,-3],[-35,5.4,-1],[-30,7.2,5],[-31,9.4,12],[-27,11.8,18],[-21,14.1,20],[-15,16.2,22],[-10,18.6,26],[-4,20.8,28],[2,23,29],[6,24.2,27],[7,24.2,23],[1.8,24.2,22.5],[1.8,24.2,20],[4,24.2,20]]},
    {id:'coast-trail',width:3,points:[[40,2.4,-38],[39,4,-32],[34,6.4,-26],[30,8.5,-20],[31,11,-13],[37,13.8,-8],[39,15,-1],[33,15,0],[27,15,1.1]]}
  ];
  const mountainLinks=[
    {id:'west-traverse',width:2.6,points:[[-35,5.4,-1],[-30,7.2,5],[-25,7.3,0],[-20,6.6,-9],[-14,4.3,-18],[-6,4.3,-28],[2,6.3,-26]]},
    {id:'east-traverse',width:2.6,points:[[12,10.5,-17],[16,10.1,-19],[23,9,-21],[30,8.5,-20],[31,11,-13]]}
  ];
  const allMountainPaths=[...mountainPaths,...mountainLinks],shapingPaths=[...mountainLinks,...mountainPaths];
  // 折线转角用短切线圆角, 同一采样同时供地形整形, 地表土径和路线检查使用.
  for(const path of allMountainPaths) {
    const source=path.points,rounded=[source[0]],mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
    for(let i=1;i<source.length-1;i++) {
      const a=mix(source[i],source[i-1],.46),b=mix(source[i],source[i+1],.46);rounded.push(a);
      for(let j=1;j<=8;j++){const t=j/8;rounded.push(mix(mix(a,source[i],t),mix(source[i],b,t),t));}
    }
    rounded.push(source.at(-1));path.points=rounded;
  }
  trailPad('south-step-foot', [18.6,13.4,21.4,14.4], 24.2);
  trailPad('west-step-foot', [.4,18.5,4,21.5], 24.2);
  trailPad('east-upper', [24.2,-.8,26,5], 19.8, 'wood', false);
  trailPad('summit', [8,14,18,23.8], 26.4, 'wood');
  trailPad('summit-east', [18,20.4,23,23.8], 26.4, 'wood', false);
  trailPad('east-ladder-foot', [26,-.8,28.4,3], 15);
  trailPad('cliff-walk', [24, 5, 26.5, 24], 19.8, 'wood', false);
  trailPad('cliff-turn', [23.4, 20.4, 24, 24], 19.8, 'wood', false);
  trailStair('south-summit', [20,24.2,14.4], [20,26.4,20.4], 2.8, false);
  trailStair('west-summit', [4,24.2,20], [8,26.4,20], 2.8, false);
  // 山顶保留三处入口, 栈道转角闭合; 休息平台用岩石收边, 不围成单入口堡垒.
  for (const [a, b] of [
    [[8,26.4,14],[18,26.4,14]], [[8,26.4,14],[8,26.4,18.5]], [[8,26.4,21.5],[8,26.4,23.8]], [[8,26.4,23.8],[23,26.4,23.8]],
    [[18,26.4,14],[18,26.4,20.4]], [[18,26.4,20.4],[18.3,26.4,20.4]], [[21.7,26.4,20.4],[23,26.4,20.4]],
    [[23,26.4,20.4],[23,26.4,21.55]], [[23,26.4,22.85],[23,26.4,23.8]],
    [[26.5,19.8,5],[26.5,19.8,24]], [[23.4,19.8,24],[26.5,19.8,24]], [[24,19.8,5],[24,19.8,19.8]]
  ]) trailRail(a,b);
  const mountain = { bounds: [-50,-38,50,38], columns: 101, rows: 77, heights: [], paths:allMountainPaths,
    grassColors:{fresh:[98,125,65],dry:[135,140,83],shade:[70,102,53]}, soilPatches:[] };
  const distanceToRect = (x,z,[a,b,c,d]) => Math.hypot(Math.max(a-x,0,x-c),Math.max(b-z,0,z-d));
  function profileAt(x,z,points,roundHeights=false) {
    let distance=Infinity,top=2.4;
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz)));
      const d=Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);if(d<distance){distance=d;const along=roundHeights?t*t*(3-2*t):t;top=a[1]+(b[1]-a[1])*along;}
    }
    return {distance,top};
  }
  // 岩脊加宽草坡肩以留出横走空间, 峰顶高程平滑收坡; 道路仍按直线插值保持可走坡度.
  const mountainRidges=[
    {width:21,points:[[-20,14,-9],[-15,24,7],[-10,34,17],[-7,28,23],[-18,12,33]]},
    {width:19,points:[[-42,7.8,5],[-28,13.4,12],[-18,17,22],[-10,22,24]]},
    {width:18,points:[[13,16,4],[27,22,7],[36,18,20],[45,8,31]]}
  ];
  function mountainHeight(x,z) {
    let y=2.4;
    for(const ridge of mountainRidges){const p=profileAt(x,z,ridge.points,true);y=Math.max(y,2.4+(p.top-2.4)*Math.exp(-2*(p.distance/ridge.width)**2));}
    const relief=.65*Math.sin(x*.19+z*.13)+.35*Math.cos(z*.27-x*.09);
    const gully=1.9*Math.exp(-(((x+9-z*.22)/4.2)**2))*Math.exp(-(((z+6)/17)**2));
    y=2.4+(y-2.4+Math.min(1,(y-2.4)/5)*(relief-gully))*Math.min(1,Math.max(0,Math.min(x+50,z+38)/7));
    // 土径只整理脚下缓坡, 外缘以宽坡肩渐变; 平台整形限制在少量实际构筑物周围.
    for(const path of shapingPaths) {
      const p=profileAt(x,z,path.points),weight=Math.max(0,Math.min(1,1-(p.distance-path.width/2-1.8)/3.5));
      y+=(p.top-y)*weight*weight*(3-2*weight);
    }
    for (const p of trailPads) if (p.fill) {
      const distance = distanceToRect(x,z,p.rect), weight = Math.max(0,1-distance/3.5); y += (p.top-.28-y)*weight*weight*(3-2*weight);
    }
    let carved = Infinity;
    for (const p of trailPads) if (distanceToRect(x,z,p.rect) <= .05)
      carved = Math.min(carved,p.fill?p.top-.38:Math.min(y,p.top-.38));
    for (const route of mountainStairs) {
      const a=route.localA,b=route.localB,dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),t=((x-a[0])*dx+(z-a[2])*dz)/(length*length);
      const across=Math.abs((x-a[0])*dz-(z-a[2])*dx)/length;
      const distance=Math.hypot(Math.max(0,-t*length,(t-1)*length),Math.max(0,across-route.width/2));
      const target=a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,t))-.38,weight=Math.max(0,1-Math.max(0,distance-.8)/2.8);
      y+=(target-y)*weight*weight*(3-2*weight);
      if(distance<=.8)carved=Math.min(carved,target);
    }
    // 通道余量覆盖脚底采样及相邻网格, 避免路边三角面和平台整形产生隐形陡坎.
    for(const path of shapingPaths){
      const p=profileAt(x,z,path.points),weight=Math.max(0,Math.min(1,1-(p.distance-path.width/2-1.8)));
      y+=(p.top-y)*weight*weight*(3-2*weight);
    }
    return Math.max(2.4,Math.min(carved,y));
  }
  for (let j=0;j<mountain.rows;j++) for (let i=0;i<mountain.columns;i++) mountain.heights.push(mountainHeight(i-50,j-38));
  mountain.exclusions = [...trailPads.map(p=>p.rect),...mountainStairs.map(({localA:a,localB:b,width:w})=>[Math.min(a[0],b[0])-w/2-.5,Math.min(a[2],b[2])-w/2-.5,Math.max(a[0],b[0])+w/2+.5,Math.max(a[2],b[2])+w/2+.5])];
  const mountainSample = (x,z) => {
    const u=Math.max(0,Math.min(100,x+50)),v=Math.max(0,Math.min(76,z+38)),i=Math.min(99,Math.floor(u)),j=Math.min(75,Math.floor(v)),a=u-i,b=v-j,k=j*101+i,h=mountain.heights;
    return a+b<=1 ? h[k]+a*(h[k+1]-h[k])+b*(h[k+101]-h[k]) : h[k+102]+(a-1)*(h[k+102]-h[k+101])+(b-1)*(h[k+102]-h[k+1]);
  };
  const mountainBoundary = [box([100,1.8,.5],[0,3.3,37.75]),box([.5,1.8,76],[49.75,3.3,0])];
  mountain.walls = [];
  // 外侧用接边山脊延续轮廓, 不画矩形矮墙; 原边界约束仍防止从制高点跃出可玩范围.
  place('mountain-terrain','coastalMountain',mountainRoot,mountain,[{ ...box([100,36,76],[0,17.4,0]),heightfield:{columns:101,rows:77,heights:mountain.heights,maxSlope:1}},...mountainBoundary.map(b=>box([b.size[0],40,b.size[2]],[b.offset[0],19.4,b.offset[2]]))]);
  // 栈道立柱落到实际坡面, 只主体和横栏参与碰撞; 不对每条木纹/砌石生成实体.
  const cliffSupports=[...[[18.8,21,26.4],[22.6,23.8,26.4]],...[7,13,19,23.5].flatMap(z=>[24.3,26.1].map(x=>[x,z,19.8]))];
  for (const [x,z,top] of cliffSupports) {
    const bottom=mountainSample(x,z)-.25,head=top-.18;
    if(head-bottom>.4) {
      trailBox([.22,head-bottom,.22],[x,(bottom+head)/2,z],'wood');
      // 斜撑和连接片位于楼板下方, 射击使用实面, 身体以主体柱简化阻挡.
      const direction=x<25?1:-1,span=Math.min(1.25,(head-bottom)*.55);
      trailBeams.push({a:[x,head-span-.08,z],b:[x+direction*span*.8,head-.08,z],radius:.065,kind:'wood'});
      trailBoxes.push({...box([.3,.28,.035],[x,head-.38,z-.12]),kind:'leg'});
    }
  }
  const trailFootings=[];
  // 山顶只保留一块局部木屏, 主要掩体交给坡肩和出露岩脊, 不截断主路.
  const mountainCover=[{position:[16.4,26.4,23.52],size:[2.6,1.04,.24],kind:'wood'}];
  for(const p of mountainCover) {
    const [w,h,d]=p.size,[x,y,z]=p.position;trailBox([w,h+.08,d],[x,y+(h-.08)/2,z],p.kind??'stone');
    trailBox([w+.08,.09,d+.06],[x,y+h+.045,z],p.kind??'stone');
  }
  function trailFooting(a,b,width=.2) {
    const count=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/2.5);
    for(let i=0;i<count;i++) {
      const p=a.map((v,j)=>v+(b[j]-v)*i/count),q=a.map((v,j)=>v+(b[j]-v)*(i+1)/count);
      trailFootings.push({a:p,b:q,width,bottom:[p,q].map(v=>Math.min(v[1]-.65,mountainSample(v[0],v[2])-.24))});
    }
  }
  for(const {localA:a,localB:b,width:w} of mountainStairs) for(const side of [-1,1]) {
    const shift=b[0]!==a[0]?[0,-.2,side*(w/2-.07)]:[side*(w/2-.07),-.2,0];
    trailFooting(a.map((v,i)=>v+shift[i]),b.map((v,i)=>v+shift[i]),.16);
  }
  for(const {rect:[a,b,c,d],top,fill} of trailPads) if(fill) {
    const y=top-.17;for(const [p,q] of [[[a+.05,y,b+.05],[c-.05,y,b+.05]],[[c-.05,y,b+.05],[c-.05,y,d-.05]],
      [[c-.05,y,d-.05],[a+.05,y,d-.05]],[[a+.05,y,d-.05],[a+.05,y,b+.05]]]) trailFooting(p,q);
  }
  // 路裙只封闭原路面实体下方, 身体仍由踏步/坡面支撑; 不增加逐小块碰撞.
  place('mountain-trails','mountainTrails',mountainRoot,{boxes:trailBoxes,beams:trailBeams,footings:trailFootings},trailCollision);
  const mountainLadders=[{position:[26.6,15,1.1],height:4.8,width:.9,yaw:Math.PI/2,mountDepth:.6,returnDepth:.72},
    {position:[23.6,19.8,22.2],height:6.6,width:.9,yaw:Math.PI/2,mountDepth:.6,returnDepth:.72}];
  const mountainClimbs=mountainLadders.map(l=>{const top=[l.position[0],l.position[1]+l.height,l.position[2]],normal=[1,0,0];return {bottom:l.position,top,normal,width:l.width,exit:[top[0]-.85,top[1],top[2]]};});
  place('mountain-ladders','verticalLadder',mountainRoot,{ladders:mountainLadders},mountainLadders.flatMap(l=>[-1,1].map(side=>facadeBox([.16,l.height+1.14,.92],{position:l.position,yaw:l.yaw},[side*l.width/2,(l.height+1.14)/2,-.36]))));
  instances.at(-1).traversal={ladders:mountainClimbs};
  const mountainStones=[[-10,12,10,2.5,4],[-1,16,12,3.6,4],[19,6,7.5,2.8,3.8],[-23,9,6,1.7,3.8],
    [-36,23,5,1.5,4],[-23,-20,6.2,1,4.6],[29,-5,5,1.5,3.4],[14,30,8.5,2.1,4],[42,25,5.8,1.4,5.2],[-43,10,4.8,1.2,3.6],[43,-23,4,1.2,3],[-19,-2.6,3.6,1.6,2.8],[20,-15.5,3.6,1.7,2.8]]
    .map(([x,z,w,h,d])=>{
      const base=Math.min(...[-.48,0,.48].flatMap(a=>[-.48,0,.48].map(b=>mountainSample(x+a*w,z+b*d))))-.28;
      return {position:[x,base,z],size:[w,mountainSample(x,z)+h-base,d]};
    });
  // 岔路内侧留出换线节点, 前方坡肩/出露岩层提供局部遮挡, 不增建围墙.
  const mountainNodes=mountainLinks.map((path,i)=>{
    const target=i?[21,-20]:[-22,-5],point=path.points.reduce((a,b)=>
      Math.hypot(a[0]-target[0],a[2]-target[1])<Math.hypot(b[0]-target[0],b[2]-target[1])?a:b);
    return {id:i?'east-shoulder':'west-hollow',path:path.id,position:[point[0],mountainSample(point[0],point[2]),point[2]],rock:11+i};
  });
  const rockCollision=mountainStones.map(p=>box([p.size[0]*.76,p.size[1]*.88,p.size[2]*.76],[p.position[0],p.position[1]+p.size[1]*.44,p.position[2]]));
  const scree=[];let rockSeed=217;const rockRandom=()=>((rockSeed=(Math.imul(rockSeed,1664525)+1013904223)>>>0)/4294967296);
  for(const stone of mountainStones)for(let i=0;i<9;i++) {
    const a=rockRandom()*Math.PI*2,r=.5+rockRandom()*.65,x=stone.position[0]+Math.cos(a)*stone.size[0]*r,z=stone.position[2]+Math.sin(a)*stone.size[2]*r;
    if(x<-49||x>49||z<-37||z>37||allMountainPaths.some(p=>profileAt(x,z,p.points).distance<p.width/2+.8)||mountain.exclusions.some(rect=>distanceToRect(x,z,rect)<.8))continue;
    const w=.25+rockRandom()*.55;scree.push({position:[x,mountainSample(x,z)-.12,z],size:[w,.18+rockRandom()*.3,w*(.65+rockRandom()*.4)]});
  }
  mountain.soilPatches.push(...mountainStones.map(({position:[x,,z],size:[w,,d]})=>({center:[x,z],radius:[w*.85,d*.85],strength:.82})),
    {center:[-4,31],radius:[6,3.4],strength:.68},{center:[37,21],radius:[4.3,6],strength:.62});
  place('mountain-rocks','mountainRocks',mountainRoot,{stones:mountainStones,scree},rockCollision);
  const trailMarkers=[[-14.5,-36,0],[-9.5,-36,0],[-49,-3.2,Math.PI/2],[-49,3.2,Math.PI/2],[37.8,-36,0],[42.2,-36,0]]
    .map(([x,z,yaw],i)=>({position:[x,mountainSample(x,z),z],yaw,slot:i%2===0?0:undefined}));
  const trailFurniture={weathered:true,trailMap:allMountainPaths.map((p,i)=>({points:p.points,color:['#e2c990','#b9d0ac','#a7c7d0','#c2afa2','#c2afa2'][i]})),
    labels:[['海望山','COASTAL HILL / 03'],['山頂登山道','SUMMIT / SOUTH ROUTE'],['林間の登山道','SUMMIT / FOREST ROUTE'],['山頂展望台','SUMMIT / 26.4 M'],['海岸と港','COAST & TERMINAL'],['竪梯子 ↑','LADDER / SHORTCUT'],['登山道案内','TRAIL MAP'],['岩壁の桟道','CLIFF WALK']],
    markers:trailMarkers,benches:[{position:[14,26.4,22.5],yaw:Math.PI}],
    shelters:[{position:[13,26.4,16.8],width:4.2,depth:2.8,height:2.55,kind:'lookout',roofPitch:.24}],
    scopes:[{position:[10.2,26.4,22.8],yaw:Math.PI}],
    signs:[{position:[-17,mountainSample(-17,-35),-35],slot:0,width:1.6},
      {position:[-46,mountainSample(-46,-5.5),-5.5],slot:6,width:1.6,height:2.1,yaw:Math.PI/2},
      {position:[29,15,2.4],slot:5,width:1.2,height:2.1}],cabinets:[]};
  function trailFurnitureSolids(s) {
    return [...(s.planters??[]).map(p=>box(p.size,[p.position[0],p.position[1]+p.size[1]/2,p.position[2]])),
      ...(s.benches??[]).map(p=>facadeBox([p.width??2.1,.9,.6],{position:p.position,yaw:p.yaw??0},[0,.45,0])),
      ...(s.cabinets??[]).map(p=>box([p.size[0]+.08,p.size[1]+.06,p.size[2]+.12],[p.position[0],p.position[1]+p.size[1]/2,p.position[2]+.03])),
      ...(s.scopes??[]).map(p=>facadeBox([.7,1.5,.85],{position:p.position,yaw:p.yaw??0},[0,.75,-.1])),
      ...(s.markers??[]).map(p=>box([(p.width??.52)+.08,(p.height??1.3)+.1,(p.width??.52)+.08],[p.position[0],p.position[1]+((p.height??1.3)+.1)/2,p.position[2]])),
      ...(s.signs??[]).flatMap(p=>{const w=p.width??2.1,h=p.height??2.5,face={position:p.position,yaw:p.yaw??0};return [
        ...[-1,1].map(x=>facadeBox([.09,h,.09],face,[x*w*.36,h/2,0])),
        facadeBox([w,p.panelHeight??.7,.14],face,[0,h-.37,.04]),facadeBox([w+.2,.08,.36],face,[0,h+.1,.035])];}),
      ...(s.shelters??[]).flatMap(p=>{const w=p.width,d=p.depth,h=p.height??2.7,rise=p.kind==='lookout'?Math.tan(p.roofPitch??.24)*w/2:0;
        return [...[-1,1].flatMap(x=>[-1,1].map(z=>facadeBox([.3,h,.3],{position:p.position,yaw:p.yaw??0},[x*(w/2-.12),h/2,z*(d/2-.12)]))),
          facadeBox([w+(rise?.84:.38),rise+.38,d+(rise?.7:.44)],{position:p.position,yaw:p.yaw??0},[0,h+.04+rise/2,0]),
          ...(['pavilion','lookout'].includes(p.kind)?[facadeBox([w-.3,.52,.18],{position:p.position,yaw:p.yaw??0},[0,.26,-d/2+.12]),facadeBox([1.65,2.6,.2],{position:p.position,yaw:p.yaw??0},[w/2-1.1,1.3,-d/2+.12])]:[])];})];
  }
  place('mountain-rest-facilities','trailFacilities',mountainRoot,trailFurniture,trailFurnitureSolids(trailFurniture));
  // 三个疏密不同的林群围住山麓与沟谷, 给中坡留出草坡和射击窗口.
  const treeCandidates=[[-44,-27],[-38,-29],[-33,-25],[-43,-20],[-32,-32],[-39,-13],[-26,-26],
    [-43,3],[-39,9],[-36,15],[-44,18],[-40,28],[-30,28],[-25,32],[-21,5],[-18,1],
    [22,-25],[25,-20],[20,-17],[27,-13],[44,-18],[43,-8],[44,7],[40,15],[37,29],[29,32],[20,32]];
  const mountainTrees=treeCandidates.filter(([x,z])=>!allMountainPaths.some(p=>profileAt(x,z,p.points).distance<p.width/2+1.25)&&
    !mountainStones.some(s=>Math.abs(x-s.position[0])<s.size[0]/2+1&&Math.abs(z-s.position[2])<s.size[2]/2+1));
  const woodlandTrees=mountainTrees.map(([x,z],i)=>{
    const kind=i%3===0?'pine':'broadleaf',scale=kind==='pine'?1.05+(i%5)*.07:.78+(i%5)*.09;
    const y=Math.min(...[-.22,0,.22].flatMap(a=>[-.22,0,.22].map(b=>mountainSample(x+a*scale,z+b*scale))))-.025;
    return {position:[x,y,z],scale,kind,yaw:i*.67,seed:930+i};
  });
  place('mountain-woodland','mountainWoodland',mountainRoot,{trees:woodlandTrees},woodlandTrees.map(t=>
    box([.48*t.scale,3*t.scale,.48*t.scale],[t.position[0],t.position[1]+1.5*t.scale,t.position[2]])));
  mountain.woodland=mountainTrees.map(([x,z])=>[x,z,3.4]);
  mountain.soilPatches.push(...mountainTrees.map(([x,z])=>({center:[x,z],radius:[2.5,2.1],strength:.74})));
  // 背景只在东北区域外侧延续山势, 与可玩山体边界取相同剖面; 不新增身体或射线碰撞.
  place('mountain-distant-ridges','coastalRidges',mountainRoot,{...mountain,relief:.68,north:mountain.heights.slice(-101),east:Array.from({length:77},(_,j)=>mountain.heights[j*101+100])});
  const mountainPlants={...mountain,exclusions:[...mountain.exclusions,...mountainStones.map(({position:[x,,z],size:[w,,d]})=>[x-w/2,z-d/2,x+w/2,z+d/2])]};
  place('mountain-litter','mountainLitter',mountainRoot,{...mountainPlants,trees:woodlandTrees});
  place('mountain-grass','mountainGrass',mountainRoot,{...mountainPlants,spacing:.43,maxShort:8500,maxTall:400});
  place('mountain-groundcover','mountainGroundcover',mountainRoot,{...mountainPlants,
    zones:[...mountainTrees.map(([x,z])=>({kind:'fern',center:[x,z],radius:4.1,count:13})),
      ...[[-35,-17],[-16,-17],[18,-5],[-23,29],[37,23],[9,30]].map(center=>({kind:'scrub',center,radius:4,count:18})),
      ...[[-31,-28],[18,-28],[-44,-10],[43,-10],[40,26],[-26,31]].map(center=>({kind:'flower',center,radius:3,count:12}))]});
  regionPlan.corners[2].routes={paths:mountainPaths.map(p=>({...p,points:p.points.map(mountainWorld)})),links:mountainLinks.map(p=>({...p,points:p.points.map(mountainWorld)})),nodes:mountainNodes.map(n=>({...n,position:mountainWorld(n.position)})),ridges:mountainRidges.map(p=>({...p,points:p.points.map(mountainWorld)})),summitY:26.4,peakY:Math.max(Math.max(...mountain.heights),...mountainStones.map(s=>s.position[1]+s.size[1])),stairs:mountainStairs.map(({localA,localB,...r})=>r),rails:mountainRails,
    cover:mountainCover.map(p=>({...p,position:mountainWorld(p.position)})),
    ladders:mountainClimbs.map(l=>({...l,bottom:mountainWorld(l.bottom),top:mountainWorld(l.top),exit:mountainWorld(l.exit)})),
    approaches:[['south-trail','south-summit'],['forest-trail','west-summit'],['coast-trail']]};
  // 中央广场保留独立铺地与错位树池, 使用通用步道设施, 与山体模型分离.
  const squareSlabs=[box([20,3,20],[0,.9,0])];
  place('central-paving','terraceGround',[60,0,68],{bounds:[-10,-10,10,10],slabs:squareSlabs,surfaces:[{rect:[-10,-10,20,20],kind:'stone'}]},squareSlabs);
  const square={planters:[{position:[-6,2.4,2],size:[3.4,.72,4]},{position:[5.8,2.4,-2.5],size:[3.4,.72,4]}],
    shelters:[{position:[0,2.4,6],width:5.6,depth:3.2,height:3,kind:'pavilion'}],benches:[{position:[-6,2.4,-.7]},{position:[0,2.4,6]}],signs:[{position:[7.5,2.4,6.2],slot:1,width:2.2,height:2.5}]};
  place('central-facilities','trailFacilities',[60,0,68],square,trailFurnitureSolids(square));
  for(const[i,p]of square.planters.entries()) {
    place('central-tree-'+i,'zelkovaTree',[60+p.position[0],2.96,68+p.position[2]],{seed:850+i},[box([.48,3,.48],[0,1.5,0])]);
    place('central-shrub-'+i,'lowHedge',[60+p.position[0],2.96,68+p.position[2]],{width:2.95,depth:3.55,height:.6,dense:true,natural:true,seed:861+i});
  }

  // 西北公园: 南北参道, 西侧园林, 东侧湖面与北侧拜殿; 环路与东侧出口不封闭.
  const parkY = height + .024;
  const dryGarden = { x: -17, z: 97, width: 20, depth: 10, sandHeight: .09, edgeHeight: .14, wallHeight: 1.25, wallOffset: .25, apronDepth: 1.8, gateway: [-2, 3.4] };
  const gardenBounds = [dryGarden.x - dryGarden.width / 2, dryGarden.z - dryGarden.depth / 2, dryGarden.x + dryGarden.width / 2, dryGarden.z + dryGarden.depth / 2];
  const gardenCourtBounds = [gardenBounds[0] - .6, gardenBounds[1] - dryGarden.apronDepth - .38, gardenBounds[2] + .6, gardenBounds[3] + .85];
  // 园墙只包覆公园内侧灰墙; 原外围墙保留, 瓦帽的少量突出部分有独立碰撞.
  const gardenWalls = [
    { length: 74.73, height: 1.8, position: [-49.6, 0, 116.365], yaw: Math.PI / 2 },
    { length: 99.2, height: 1.8, position: [0, 0, 153.73], yaw: 0 }
  ];
  place('park-garden-boundary', 'parkGardenWall', [0, height, 0], { runs: gardenWalls }, [
    box([.79, .12, 74.73], [-49.6, 1.86, 116.365]), box([99.2, .12, .79], [0, 1.86, 153.73])
  ]);
  // 草地树群直接落地, 只在神社铺装区保留树池; 疏密与树高共同形成林缘.
  const parkTrees = [
    [-39, 88], [-26, 87], [-41.2, 103.4], [-38.5, 124.5], [-40.5, 141.5], [-24, 146], [18, 148.7], [39, 142], [-20.2, 128.2], [40, 86], [27, 86], [13, 86], [39, 105], [-6.3, 106], [8, 93], [-8, 120], [-14, 86], [-28.2, 101], [10, 104],
    [-45, 85], [-43, 92], [-35, 83], [-20, 82], [-10, 83], [10, 82], [21, 82], [34, 82], [44, 91],
    [-45, 108], [-37, 113], [-44, 118], [-23, 119], [-42, 130], [-35, 136], [-23, 135], [-45, 145], [-35, 148], [-14, 148], [-7, 146],
    [9, 148], [29, 149], [44, 145], [45, 137], [-16, 115], [-10, 103.3]
  ];
  const parkShrubs = [
    [-42, 86, 4.2, 2.6, 1.15], [-19, 82, 4.5, 2.5, .95], [-9, 85, 3.4, 2.4, .75], [10, 85, 3.5, 2.3, .9], [34, 85, 4.5, 2.6, 1.1],
    [-43, 109, 4, 3, 1.15], [-37, 116, 4.8, 2.8, .85], [-44, 127, 4, 3.5, 1.25], [-22, 122, 4.5, 2.8, .8], [-37, 139, 4.5, 3.3, 1.1],
    [-16, 148, 4.5, 2.4, .95], [10, 149, 3.5, 2, .75], [41, 145, 4, 2.4, .8],
    [-34.8, 104, 3.5, 2.8, .7], [-34.5, 112, 3, 2, .75], [-36.5, 125, 4, 2.8, .8], [-26, 124, 4, 3, .75],
    [-25, 137, 3, 3, .9], [-14, 113, 3.5, 2.5, .7], [-43, 97, 3, 2.5, .85], [-36, 91, 3.5, 3, .8],
    [-27, 146, 4, 2.6, .95], [-19, 141, 3.5, 2.6, .7], [37, 94, 4, 2.5, 1.15]
  ];
  // 园路采样一次, 地面绘制和地被避让共用同一条曲线.
  function gardenTrail(nodes, width = 2.3) {
    const points = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[Math.max(0, i - 1)], b = nodes[i], c = nodes[i + 1], d = nodes[Math.min(nodes.length - 1, i + 2)];
      const steps = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) * 2);
      for (let j = 0; j < steps; j++) {
        const t = j / steps;
        points.push(b.map((v, k) => .5 * (2 * v + (-a[k] + c[k]) * t + (2 * a[k] - 5 * v + 4 * c[k] - d[k]) * t * t + (-a[k] + 3 * v - 3 * c[k] + d[k]) * t * t * t)));
      }
    }
    return { points: [...points, nodes.at(-1)], width };
  }
  const parkTrails = [
    gardenTrail([[-30.5, 85], [-32, 94], [-29, 103], [-30, 113], [-33, 122], [-31, 132], [-30.5, 141.5]]),
    gardenTrail([[0, 92], [-7, 90], [-16, 87], [-23, 85], [-30.5, 85]]),
    gardenTrail([[-30, 113], [-24, 111], [-16, 109], [-8, 110], [0, 110]]),
    gardenTrail([[-30.5, 141.5], [-24, 144], [-16, 143], [-8, 141.5], [3, 141.5]]),
    gardenTrail([[-29, 103], [-26, 104], [-23, 104]], 1.7),
    gardenTrail([[-7, 90], [-10, 90.6], [-17, 90.7], [-28.4, 91.4], [-32, 94]], 1.7)
  ];
  // 连续缓丘共享采样顶点, .4 米支撑格取四角最高值, 支撑误差控制在几厘米内.
  const parkTerrainCells = [];
  for (const [x, z, w, d, rise] of [[-41, 115, 9.6, 12.8, .56], [-20, 133, 9.6, 11.2, .64]]) {
    const cell = .4, nx = Math.round(w / cell), nz = Math.round(d / cell);
    const top = (px, pz) => .024 + rise * Math.max(0, 1 - ((px - x) / (w / 2)) ** 2 - ((pz - z) / (d / 2)) ** 2) ** 2;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const cx = x - w / 2 + (i + .5) * cell, cz = z - d / 2 + (j + .5) * cell;
      const surface = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => top(cx + a * cell / 2, cz + b * cell / 2));
      const h = Math.max(...surface);
      if (h > .025) parkTerrainCells.push({ ...box([cell, h, cell], [cx, h / 2, cz]), surface });
    }
  }
  const terrainLevel = (x, z) => {
    let top = 0;
    // 格缝上的根部取相邻支撑格的最高面, 与通用碰撞的微小覆盖容差一致.
    for (const { size: s, offset: p } of parkTerrainCells)
      if (Math.abs(x - p[0]) <= s[0] / 2 + .001 && Math.abs(z - p[2]) <= s[2] / 2 + .001) top = Math.max(top, p[1] + s[1] / 2 - .024);
    return top;
  };
  place('park-soft-landforms', 'parkTerrain', [0, height, 0], { cells: parkTerrainCells, trees: parkTrees }, parkTerrainCells);
  const bambooClumps = [[-44.5, 127, 2, 17, 6.7], [-45, 139, 1.5, 15, 6.8], [-30.5, 147.3, 1.5, 13, 6.3], [-16, 145.7, 1.4, 13, 6], [36.5, 148.3, 1.5, 15, 5.8]];
  const bambooCulms = [], bambooBoxes = []; let bambooSeed = 1921;
  const bambooRandom = () => ((bambooSeed = (Math.imul(bambooSeed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (const [x, z, radius, count, h] of bambooClumps) {
    const trunks = [];
    for (let i = 0; i < count; i++) {
      const a = i * 2.4 + bambooRandom() * .4, r = radius * Math.sqrt((i + .5) / count), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const c = { foot: [px, .024 + terrainLevel(px, pz), pz], height: h * (.72 + bambooRandom() * .28), radius: .046 + bambooRandom() * .026, lean: [Math.cos(a) * .35, Math.sin(a) * .35], seed: 1921 + bambooCulms.length * 97 };
      bambooCulms.push(c);
      // 实体只取下部 3 米竿身, 覆盖人物与跳跃高度, 不把高处倾斜竹梢扩到脚边.
      const top = Math.min(3, c.height), t = top / c.height, tx = px + c.lean[0] * t, tz = pz + c.lean[1] * t;
      trunks.push({ minX: Math.min(px, tx) - c.radius, maxX: Math.max(px, tx) + c.radius,
        minZ: Math.min(pz, tz) - c.radius, maxZ: Math.max(pz, tz) + c.radius, bottom: c.foot[1], top: c.foot[1] + top });
    }
    // 每簇沿深度分三条窄带, 两端随竹竿分布收窄, 让出矩形包围盒角落的空地.
    const z0 = Math.min(...trunks.map(c => c.minZ)), z1 = Math.max(...trunks.map(c => c.maxZ)), band = (z1 - z0) / 3;
    for (let i = 0; i < 3; i++) {
      const a = z0 + i * band, b = z0 + (i + 1) * band, row = trunks.filter(c => c.minZ <= b && c.maxZ >= a);
      if (!row.length) continue;
      const low = [Math.min(...row.map(c => c.minX)), Math.min(...row.map(c => c.bottom)), a];
      const high = [Math.max(...row.map(c => c.maxX)), Math.max(...row.map(c => c.top)), b];
      bambooBoxes.push(box(high.map((v, i) => v - low[i]), high.map((v, i) => (v + low[i]) / 2)));
    }
  }
  place('park-bamboo-groves', 'parkBamboo', [0, height, 0], { culms: bambooCulms }, bambooBoxes);
  const trailStones = Array.from({ length: 6 }, (_, i) => [-36.5 + i * 1.1, 97 + i * .6, 1.02, .78, -.28 + i * .11]);
  place('park-grove-stepping-stones', 'parkTrailStones', [0, height, 0], { stones: trailStones }, trailStones.map(([x, z, w, d]) => box([w, .095, d], [x, .0475, z])));
  const parkSurfaces = [
    [-47, 81, -5.5, 149, 2], [5.5, 81, 44, 113, 2], [14, 117, 44, 149, 2],
    [-3, 78, 3, 127, 1], [0, pond.z - 2, 49.3, pond.z + 2, 1], [45, 98, 48.5, 147.2, 1], [32, 98, 48.5, 101, 1],
    [2.5, 140, 5, 147.2, 1], [2.5, 145, 48.5, 147.2, 1], [-13, 116, 13, 143, 0], [-3, 116, 3, 127, 1], [22, 94, 33, 104, 1], [-23, 102, -15, 108, 1], [3, 98.3, 22, 99.7, 1], [...pondCut, -1]
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
  // 岸面地被采样真实闭合水线, 不落到水上; 桥口, 木亭与观景台留空.
  place('park-bank-groundcover', 'parkGroundcover', [0, height, 0], {
    surfaces: [[...pondCut, 2]], water: shore.map(([x, z]) => [pond.x + x, pond.z + z]), trails: [], trees: [], cells: [], lush: true,
    exclusions: [[0, 120.4, 49.3, 125.6], [42.4, 111.3, 48.4, 116.7], [22, 94, 33, 104], [5.1, 134.5, 8.9, 137.5]],
    patches: [3, 8, 13, 18, 23, 28, 33, 38].map(n => [pond.x + shore[n][0] * 1.055, pond.z + shore[n][1] * 1.055, 3.7, 4.4, 180])
  });
  // 0.8 米宽踏步配 3.4 米拱高, 最大级差约 .261 米, 留在 .28 米自动登阶范围内.
  const bridge = { width: 3.4, length: pond.width, rise: 3.4, tread: .8, deckThickness: .12, railHeight: 1.16, barrierHeight: 1.9, bottom: pond.bottom - pond.rim }, bridgeTop = x => bridge.deckThickness + bridge.rise * (1 - (2 * x / bridge.length) ** 2);
  const bridgeStepCount = Math.round(bridge.length / bridge.tread), bridgeTread = bridge.length / bridgeStepCount;
  bridge.deck = Array.from({ length: bridgeStepCount }, (_, i) => {
    const x = -bridge.length / 2 + (i + .5) * bridgeTread;
    return box([bridgeTread, bridge.deckThickness, bridge.width], [x, bridgeTop(x) - bridge.deckThickness / 2, 0]);
  });
  // 柱脚取覆盖踏面的较低顶面, 避免加大级差后栏柱悬空; 栏杆和防越界碰撞共用高度.
  bridge.profile = Array.from({ length: bridge.length / 2.5 + 1 }, (_, i) => {
    const x = -bridge.length / 2 + i * 2.5;
    const top = Math.min(...bridge.deck.filter(s => Math.abs(s.offset[0] - x) < s.size[0] / 2 + .15).map(s => s.offset[1] + s.size[1] / 2));
    return [x, top];
  });
  bridge.arches = [[-19, -9], [-8, 8], [9, 19]].map(([left, right]) => ({ left, right, crown: bridgeTop((left + right) / 2) - .65 }));
  const soffit = x => {
    const a = bridge.arches.find(a => x >= a.left && x <= a.right);
    return a ? bridge.bottom + (a.crown - bridge.bottom) * Math.sqrt(Math.max(0, 1 - ((2 * x - a.left - a.right) / (a.right - a.left)) ** 2)) : bridge.bottom;
  };
  bridge.body = bridge.deck.map(({ size, offset: [x, y] }) => ({ x0: x - size[0] / 2, x1: x + size[0] / 2, top: y - size[1] / 2, low0: soffit(x - size[0] / 2), low1: soffit(x + size[0] / 2) }));
  const bridgeBody = bridge.body.map(s => {
    // 每级只用一个实体盒覆盖拱腹和石板, 不再重复检测薄桥面与下方桥身.
    const low = Math.max(s.low0, s.low1), top = s.top + bridge.deckThickness;
    return box([s.x1 - s.x0, top - low, bridge.width], [(s.x0 + s.x1) / 2, (top + low) / 2, 0]);
  });
  const bridgeRails = bridge.profile.slice(1).flatMap(([x, y], i) => [-1, 1].map(side => {
    const [px, py] = bridge.profile[i];
    return box([x - px + .36, bridge.barrierHeight + Math.abs(y - py), .36], [
      (x + px) / 2, Math.min(y, py) + (bridge.barrierHeight + Math.abs(y - py)) / 2, side * (bridge.width / 2 - .14)
    ]);
  }));
  place('park-lake-bridge', 'parkBridge', [pond.x, parkY, pond.z], bridge, [...bridgeRails, ...bridgeBody]);
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
  // 南岸荷花湾, 北东岸芦苇, 西北岸叠石, 东岸开放观景点; 桥口和湖心保持开阔.
  for (const [i, n] of [25, 27, 29, 31, 15].entries()) {
    const [x, z] = shore[n]; place('park-lotus-' + i, 'pondLotus', [pond.x + x * .84, height + pond.waterLevel, pond.z + z * .84], { seed: 81 + i * 31 });
  }
  for (const [i, n] of [3, 5, 7].entries()) {
    const [x, z] = shore[n]; place('park-reed-bank-' + i, 'parkReeds', [pond.x + x * .96, height + pond.bottom, pond.z + z * .96], { seed: 531 + i * 41 }, [], [0, -n * Math.PI / 20, 0]);
  }
  // 锦鲤在湖心区巡游, 活动半径避开近岸荷丛; 桥带与水石障碍让鱼绕行不穿模; 模型自带头尾摆动与涟漪.
  place('park-koi', 'pondKoi', [pond.x, height + pond.waterLevel, pond.z], { radiusX: pond.width / 2 - 5.5, radiusZ: pond.depth / 2 - 5.5, count: 6, seed: 277, bridgeHalf: bridge.width / 2 + .8, obstacles: [[36 - pond.x, 134 - pond.z, 3]] });
  const pondRocks = [3, 8, 13, 18, 24, 29, 34, 38].map((n, i) => { const [x, z] = shore[n]; return [x * 1.008, z * 1.008, .65 + i % 3 * .13, .28 + i % 2 * .12, .6 + i % 3 * .1]; });
  place('park-pond-rocks', 'landscapeRocks', [pond.x, parkY, pond.z], { stones: pondRocks }, pondRocks.map(([x, z, w, h, d]) => box([w, h, d], [x, h / 2, z])));
  const stoneBank = [11, 13, 15, 17].flatMap((n, i) => {
    const [x, z] = shore[n];
    return [[x * 1.09, z * 1.09, 2.15 + i % 2 * .4, .55 + i % 3 * .13, 1.55], [x * 1.09 + .85, z * 1.09 + .55, 1.25, .35, .9]];
  });
  place('park-northwest-stone-bank', 'landscapeRocks', [pond.x, parkY, pond.z], { stones: stoneBank }, stoneBank.map(([x, z, w, h, d]) => box([w, h, d], [x, h / 2, z])));
  const viewingDeck = { width: 5.5, depth: 4.8, height: .14, railHeight: .95 }, deckRailX = -viewingDeck.width / 2 + .07;
  place('park-east-viewing-deck', 'parkViewingDeck', [45.4, height, 114], viewingDeck, [
    box([viewingDeck.width, viewingDeck.height, viewingDeck.depth], [0, viewingDeck.height / 2, 0]),
    box([.14, viewingDeck.railHeight, viewingDeck.depth], [deckRailX, viewingDeck.height + viewingDeck.railHeight / 2, 0]),
    ...[-1, 1].map(side => box([1.74, viewingDeck.railHeight, .14], [deckRailX + .8, viewingDeck.height + viewingDeck.railHeight / 2, side * (viewingDeck.depth / 2 - .08)]))
  ]);
  // 东北岸低景石扎入湖底, 水生花丛错落在岸内, 保留开阔水面.
  const waterRocks = [[0, 0, 2.2, 1.05, 1.7], [-1.3, .5, 1.6, .72, 1.1], [.85, -.6, 1.3, .6, 1], [.15, 1, 1.1, .52, .9]];
  place('park-water-rocks', 'landscapeRocks', [36, height + pond.bottom, 134], { stones: waterRocks }, waterRocks.map(([x, z, w, h, d]) => box([w, h, d], [x, h / 2, z])));
  for (const [i, [x, z]] of [[37.5, 135.3], [13.2, 131], [32, 107.5], [16, 109], [23, 106], [31.5, 141]].entries()) {
    place('park-water-iris-' + i, 'waterIris', [x, height + pond.bottom, z], { seed: 91 + i * 31 });
  }
  for (const [i, [x, z]] of [[12.5, 140.2], [37, 106]].entries()) {
    place('park-pond-grass-' + i, 'parkFlowerbed', [x, parkY, z], { width: 1.6, depth: 1, height: 1.1, kind: 'grass', count: 24, seed: 431 + i, natural: true });
  }
  const woodlandPatches = [
    [-39, 94, 9, 10, 45], [-38.5, 106, 11, 9, 65], [-38, 119, 11, 11, 62], [-39, 132, 10, 12, 70],
    [-25, 128, 6, 14, 45], [-20, 138, 11, 8, 45], [-17, 114, 10, 7, 40], [-25, 91, 6, 8, 25],
    [-15, 84, 14, 5, 25], [-37, 145, 12, 6, 45], [22, 148.2, 23, 2.8, 30], [41, 95, 8, 7, 30], [10, 87, 6, 9, 15]
  ];
  const plantingExclusions = [[-30.8, 94.6, -27.2, 97.4], [-19.3, 136.6, -15.7, 139.4], gardenCourtBounds, [-37.2, 96.3, -30.3, 100.7], [-46, 150, 46, 154]];
  place('northwest-park-ground', 'shrineParkGround', [0, height, 0], { bounds: [-49.3, 78, 49.3, 153.4], surfaces: parkSurfaces, trails: parkTrails, woodland: woodlandPatches, trees: parkTrees.filter((_, i) => i !== 15) });
  place('park-fern-understorey', 'parkFerns', [0, height, 0], { patches: woodlandPatches, cells: parkTerrainCells, surfaces: parkSurfaces, trails: parkTrails, exclusions: plantingExclusions });
  place('park-forest-floor', 'parkGroundcover', [0, height, 0], {
    surfaces: parkSurfaces, trails: parkTrails, trees: parkTrees, cells: parkTerrainCells,
    exclusions: plantingExclusions,
    patches: [[-40, 115, 13, 53, 1050], [-20, 131, 14, 24, 650], [-17, 85.5, 25, 8, 450], [22, 85.5, 27, 8, 400], [-8, 147.5, 25, 5, 300], [38, 145, 15, 6, 240], [-19, 115, 13, 9, 260]]
  });
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
  // 七石分为三组: 左后主峰, 左前小岛, 右侧卧石; 中央与前景留白, 主峰接近成人高度.
  const gardenStones = [
    [-4.55, 1.35, 1.9, 1.95, 1.55], [-3.08, 1.72, 1.48, 1.22, 1.28], [-4.48, .17, 2.12, .63, 1.3],
    [-7.15, -2.12, 1.72, .76, 1.28], [-6.2, -1.81, 1.1, .38, .87],
    [4.62, -.35, 2.82, 1.04, 1.72], [6.18, .11, 1.3, .47, 1.03]
  ];
  // 苔岛与整组耙纹共用轮廓, 不再围绕每一块石头单独画圆.
  const gardenIslands = [[-3.98, 1.18, 2.32, 1.6, .08], [-6.83, -2.06, 1.54, 1.04, -.22], [5.1, -.2, 2.25, 1.36, .12]];
  place('park-dry-garden', 'dryGarden', [dryGarden.x, parkY, dryGarden.z], { ...dryGarden, stones: gardenStones, islands: gardenIslands }, [
    box([dryGarden.width, dryGarden.sandHeight, dryGarden.depth], [0, dryGarden.sandHeight / 2, 0]), ...[-1, 1].flatMap(side => [box([dryGarden.width, dryGarden.edgeHeight, .16], [0, dryGarden.edgeHeight / 2, side * (dryGarden.depth / 2 - .08)]), box([.16, dryGarden.edgeHeight, dryGarden.depth - .32], [side * (dryGarden.width / 2 - .08), dryGarden.edgeHeight / 2, 0])])
  ]);
  place('park-garden-stones', 'landscapeRocks', [dryGarden.x, parkY + dryGarden.sandHeight, dryGarden.z], { stones: gardenStones, moss: false, exactHeight: true, weathered: true }, gardenStones.map(([x, z, w, h, d]) => box([w, h, d], [x, h / 2, z])));
  const [gateX, gateWidth] = dryGarden.gateway, courtHalf = dryGarden.width / 2 + .25, wallZ = dryGarden.depth / 2 + dryGarden.wallOffset;
  const gardenWallRuns = [[-courtHalf, gateX - gateWidth / 2], [gateX + gateWidth / 2, courtHalf]];
  place('park-dry-garden-court', 'dryGardenCourt', [dryGarden.x, parkY, dryGarden.z], dryGarden, [
    box([dryGarden.width + .5, .12, dryGarden.apronDepth], [0, .06, -dryGarden.depth / 2 - .38 - dryGarden.apronDepth / 2]),
    ...gardenWallRuns.map(([a, b]) => box([b - a, dryGarden.wallHeight + .16, .66], [(a + b) / 2, (dryGarden.wallHeight + .16) / 2, wallZ])),
    ...[-1, 1].map(side => box([.14, 1.05, 2.4], [side * courtHalf, .525, dryGarden.depth / 2 - 1.1]))
  ]);
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
  // 庭院两端用低灌木接入林缘, 不把矩形花坛摆在砂面和观景铺地之间.
  for (const [i, [x, z, w, d, h]] of [[-25, 103.45, 2.7, 1, .6], [-8.1, 103.5, 2.2, 1.1, .5], [-28.15, 99.8, 1.4, 2.1, .48]].entries()) {
    place('park-underplant-' + i, 'lowHedge', [x, parkY, z], { width: w, depth: d, height: h, seed: 381 + i, dense: true, natural: true });
  }
  // 林内不摆围栏树池, 冠层允许穿过, 树干仍有实体碰撞.
  parkTrees.forEach(([x, z], i) => {
    const scale = i < 19 ? i > 16 ? 1.22 : i < 13 ? 1.45 : 1.15 : 1.2 + (i % 5) * .13;
    if (i === 15) place('park-tree-bed-' + i, 'treePlanter', [x, parkY, z], {}, [box([2.6, .79, 2.6], [0, .395, 0])]);
    // 西侧中景展冠和东侧较高树冠形成错落框景, 参道与林路仍完整开放.
    const form = i === 13 ? { spread: 1.35, growth: .9 } : i === 14 ? { spread: .9, growth: 1.08 } : i === 18 ? { spread: 1.2, growth: .97 } : { spread: .84 + (i * 7 % 6) * .06, growth: .92 + (i * 5 % 7) * .025 };
    place('park-tree-' + i, 'parkTree', [x, parkY + terrainLevel(x, z) + (i === 15 ? .08 : 0), z], { seed: 511 + i * 17, kind: [17, 18, 27, 37].includes(i) ? 'maple' : 'camphor', ...form }, [box([.48, 5.3, .48], [0, 2.57, 0])], [0, i * .7, 0], [scale, scale, scale]);
  });
  parkShrubs.forEach(([x, z, w, d, h], i) => place('park-grove-shrub-' + i, 'lowHedge', [x, parkY + terrainLevel(x, z), z], { width: w, depth: d, height: h, seed: 871 + i * 31, dense: true, natural: true }));
  for (const [i, [x, z, yaw]] of [[-29, 96, Math.PI / 2], [7, 136, Math.PI / 2], [-17.5, 138, -Math.PI / 2], [25, 148.5, Math.PI]].entries()) {
    place('park-bench-pad-' + i, 'pocketPaving', [x, height, z], { width: 3.2, depth: 2.3, stone: true }, [box([3.2, .078, 2.3], [0, .039, 0])]);
    place('park-bench-' + i, 'parkBench', [x, height + .078, z], {}, [box([2, .96, .66], [0, .48, -.035])], [0, yaw, 0]);
  }
  // 花叶与灌木允许穿过, 花坛/景石/树干保留实体碰撞; 后侧绿篱只遮景, 地图边界由外围墙负责.
  for (const [i, [x, z, w]] of [[-26, 151, 38], [26, 151, 38], [-41, 79.3, 12], [41, 79.3, 12]].entries()) {
    place('park-boundary-bed-' + i, 'stoneFlowerbed', [x, parkY, z], { width: w + .5, depth: 2, height: .16 }, [box([w + .5, .16, 2], [0, .08, 0])]);
    place('park-boundary-hedge-' + i, 'lowHedge', [x, parkY + .06, z], { width: w, depth: 1.5, height: 1.45, seed: 641 + i, dense: true });
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
    const tea = kind === 'tea';
    const pipeHeight = tea ? h - .96 : h - .34, roofExtra = tea ? .03 : 0;
    const details = {
      windows: [
        ...[-1, 1].map(side => ({ position: [side * (w / 2 - .3), 1.55, -.3], yaw: side * Math.PI / 2, width: 1.1, height: .95 })),
        ...(tea ? [-1.5, .15] : [-.65]).map(u => ({ position: [u, 1.64, -1.75], yaw: Math.PI, width: tea ? 1.25 : 1, height: .84 }))
      ],
      door: { position: [tea ? w / 2 - 1.3 : .8, 1.16, -1.75], yaw: Math.PI, width: .84, height: 1.95 },
      pipes: [-1, 1].map(side => ({ position: [side * (w / 2 - .46), .16 + pipeHeight / 2, -1.815], height: pipeHeight })),
      gutter: { size: [w, .1, .14], position: [0, .16 + pipeHeight, -1.95] },
      backSkirt: { size: [w - .72, .62, .055], position: [0, .57, -1.7775] }
    };
    place('station-shop-' + i, 'stationShop', [x, .078, 17], { width: w, kind, ...details }, [
      box([w - .6, h - .7, 3.2], [0, (h - .7) / 2, -.15]), box([w, .7 + roofExtra, 4], [0, h - .35 + roofExtra / 2, 0]), box([w - .35, .12, .55], [0, 2.3, 1.7]),
      ...details.windows.map(f => facadeBox([f.width + .23, f.height + .2, .2], f, [0, 0, .1])),
      facadeBox([details.door.width + .1, details.door.height + .08, .15], details.door, [0, 0, .075]),
      ...details.pipes.map(p => box([.1, p.height, .14], p.position)), box(details.gutter.size, details.gutter.position), box(details.backSkirt.size, details.backSkirt.position)
    ], [0, Math.PI, 0]);
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
  const vendingSize = [1.08, 1.85, .82], vendingOffset = [0, .925, -.02];
  place('station-vending-machine', 'vendingMachine', [-39.4, .68, 4.75], {}, [box(vendingSize, vendingOffset)], [0, Math.PI, 0]);
  for (const [i, [x, z, yaw]] of [[-9.1, 13.5, -Math.PI / 2], [8.6, 33.25, -Math.PI / 2]].entries()) {
    place('street-vending-' + i, 'vendingMachine', [x, i === 0 ? .078 : level(z), z], {}, [box(vendingSize, vendingOffset)], [0, yaw, 0]);
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
  const homeColors = [[0xd0c6ac, 0xcbc7b3, 0xc4c3b5], [0xc9c5ac, 0xd0cbbb, 0xbebba6], [0xdbd7c6, 0xcbd0c3, 0xd7cebb]];
  const residenceDetails = {
    windows: [
      ...[1.85, 4.68].flatMap(y => [-1.85, .85].map(x => ({ position: [x, y, y < 3 ? 3 : 2.8], yaw: 0, width: 1.75, height: 1.5, hoodDepth: .35 }))),
      ...[1.85, 4.68].flatMap(y => [-1, 1].map(side => ({ position: [side < 0 ? -3.2 : y < 3 ? 3.2 : 2.6, y, .65], yaw: side * Math.PI / 2, width: 1.35, height: 1.25, hoodDepth: .22 }))),
      ...[1.85, 4.68].flatMap(y => [-1.8, .85].map(x => ({ position: [x, y, -3], yaw: Math.PI, width: 1.45, height: 1.3, hoodDepth: .22 })))
    ],
    pipes: [-2.75, 2.35].map(x => ({ position: [x, 3.2, -3.065], height: 5.8 }))
  };
  // 两层住宅按主体/阳台/外挂机拆分, 不再用整栋大盒代替凸出物的碰撞.
  const residenceBoxes = [
    box([6.6, .3, 6.2], [0, .15, 0]), box([6.4, 3, 6], [0, 1.8, 0]), box([5.8, 2.75, 5.8], [-.3, 4.675, -.1]),
    ...[3.34, 6.12].map(y => box([6.7, .18, 6.35], [0, y, 0])), box([6.6, .13, 6.28], [0, 6.275, 0]),
    // 窗框/玻璃合成浅盒, 窗檐单独保留真实厚度, 跳跃时也能正确顶头.
    ...residenceDetails.windows.flatMap(f => [facadeBox([f.width, f.height, .16], f, [0, 0, .08]), facadeBox([f.width + .15, .07, f.hoodDepth], f, [0, f.height / 2 + .08, .16])]),
    ...residenceDetails.pipes.map(p => box([.1, p.height, .18], p.position)),
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
    place('coastal-yard-' + i, 'japaneseYard', [x, height, z], { seed: 913 + i * 31, foundation: kind === 2 ? [6.6, 6.2] : kind === 1 ? [5.9, 6.5] : [6.2, 6.2] }, [box([8, .06, 8.6], [0, .03, 0])], facing);
    place('coastal-home-' + i, model, [x, height, z], { ...(kind === 2 ? residenceDetails : {}), color: homeColors[kind][i % 3], seed: 113 + i * 19 }, kind === 2 ? residenceBoxes : [box(size, [0, size[1] / 2, .2])], facing);
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
  place('sagami-bay', 'kamakuraOcean', [0, 0, 0], { ...shoreline, sun, harbor: harborBasin, harbors: [[120, -24, 100, 12]] });
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
    const garden = i >= 2 && i < 5, s = garden ? .64 + (i % 3) * .055 : .78 + (i % 3) * .085;
    place('hydrangea-right-' + i, 'coastalFoliage', garden ? [10.6 + (i - 2) * 2.5, .165, 18.65] : [5.25 + .07 * Math.sin(i * 2.4), level(z) + .03, z + .13 * Math.sin(i * 1.7)], { seed: 92 + i, color: i % 4 === 0 ? 'blue' : 'pink', blooms: garden ? 7 : 8 + i % 3 }, [], [0, 0, 0], [s, s, s]);
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
      portGround: 'models/port-ground.js', cargoContainer: 'models/cargo-container.js', portAccess: 'models/port-access.js',
      portReachstacker: 'models/port-reachstacker.js', portForklift: 'models/port-forklift.js', portTerminalTractor: 'models/port-terminal-tractor.js',
      portCargoWorkarea: 'models/port-cargo-workarea.js', portService: 'models/port-service.js',
      portUtilities: 'models/port-utilities.js', verticalLadder: 'models/vertical-ladder.js',
      coastalMountain: 'models/coastal-mountain.js', coastalRidges: 'models/coastal-ridges.js', mountainRocks: 'models/mountain-rocks.js', mountainGroundcover: 'models/mountain-groundcover.js', mountainWoodland: 'models/mountain-woodland.js', mountainGrass: 'models/mountain-grass.js', mountainLitter: 'models/mountain-litter.js',
      mountainTrails: 'models/mountain-trails.js', trailFacilities: 'models/trail-facilities.js', terraceGround: 'models/terrace-ground.js',
      portWarehouse: 'models/port-warehouse.js', portCrane: 'models/port-crane.js', cargoShip: 'models/cargo-ship.js', portFixtures: 'models/port-fixtures.js',
      parkTerrain: 'models/park-terrain.js', parkTrailStones: 'models/park-trail-stones.js',
      parkGroundcover: 'models/park-groundcover.js',
      parkTree: 'models/park-tree.js',
      parkFerns: 'models/park-ferns.js',
      parkBamboo: 'models/park-bamboo.js', parkGardenWall: 'models/park-garden-wall.js',
      parkReeds: 'models/park-reeds.js', parkViewingDeck: 'models/park-viewing-deck.js',
      lakeFence: 'models/lake-fence.js', pondLotus: 'models/pond-lotus.js', pondKoi: 'models/pond-koi.js', waterSplash: 'models/water-splash.js',
      waterIris: 'models/water-iris.js',
      parkBridge: 'models/park-bridge.js', parkPond: 'models/park-pond.js', parkFlowerbed: 'models/park-flowerbed.js', emaRack: 'models/ema-rack.js',
      dryGarden: 'models/dry-garden.js', dryGardenCourt: 'models/dry-garden-court.js', landscapeRocks: 'models/landscape-rocks.js',
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
    atmosphere: { sky: 0xa6cbdc, fogNear: 130, fogFar: 1800, exposure: .94, cameraFar: 8000, fov: 64, pixelRatio: 1.5 },
    lights: [
      { type: 'hemisphere', sky: 0xc8e5f4, ground: 0x8c8065, intensity: 1.15, position: [0, 25, 0] },
      // 全图共用太阳与静态阴影缓存, 保持太阳方向和 4096 图, 覆盖东侧码头且不增加投影光源.
      { type: 'sun', color: 0xffedce, intensity: 3.15, position: [-48, 89.4, -16], target: [60, 2.4, 68], shadow: true, shadowExtent: 140, shadowFar: 320, shadowSize: 4096, shadowBias: -.0002, staticShadow: true }
    ],
    instances
  };
})();
