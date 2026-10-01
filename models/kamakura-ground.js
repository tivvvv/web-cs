// 海岸街区地面, 轨道与路面细节. 纹理在本文件内生成, 不加载图片.
FPS.models.kamakuraGround = T => {
  const root = new T.Group();
  let seed = 713;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function surface(base, variation, repeat) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 512);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const n = (random() - .5) * variation;
      for (let c = 0; c < 3; c++) pixels.data[i + c] = base[c] + n;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(...repeat); map.anisotropy = 4;
    return new T.MeshStandardMaterial({ map, roughness: .94 });
  }
  const asphalt = surface([92, 96, 99], 34, [5, 8]);
  // 沥青的大尺度色差按整个街区烘焙, 轮迹沿道路延伸, 路肩积尘; 近景颗粒独立重复.
  const roadCanvas = document.createElement('canvas'); roadCanvas.width = roadCanvas.height = 1024;
  const rc = roadCanvas.getContext('2d'), roadPixels = rc.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    const wx = x / 1024 * 100 - 50, wz = 58 - y / 1024 * 76;
    const lane = wz > -7 ? wx : wz + 11, half = wz > -7 ? 3.8 : 4;
    const verge = Math.pow(Math.min(1, Math.abs(lane) / half), 8);
    const tracks = Math.exp(-(((Math.abs(lane) - 1.25) / .3) ** 2));
    const cloud = Math.sin(wx * .52 + Math.sin(wz * .21)) * Math.sin(wz * .31 - wx * .13);
    const shade = cloud * 5 + verge * 17 - tracks * 9 + (random() - .5) * 7;
    roadPixels.data.set([90 + shade, 95 + shade, 95 + shade - verge * 5, 255], (y * 1024 + x) * 4);
  }
  rc.putImageData(roadPixels, 0, 0); rc.setTransform(1024 / 100, 0, 0, -1024 / 76, 512, 58 * 1024 / 76);
  // 修补块与裂缝进入材质, 不用贴在路面上方的细线制造浮动/闪烁.
  for (const [x, z, w, d] of [[1.1, 8, 1.2, 2.7], [-1.6, 17.5, 2.1, 1.7], [2, 39, 1.4, 3.8], [-28, -10, 2.8, 2.1]]) {
    rc.fillStyle = '#545d5c66'; rc.fillRect(x - w / 2, z - d / 2, w, d);
    rc.strokeStyle = '#343d3938'; rc.lineWidth = .025; rc.strokeRect(x - w / 2, z - d / 2, w, d);
  }
  rc.strokeStyle = '#39444088'; rc.lineWidth = .018;
  for (let i = 0; i < 28; i++) {
    const x = (random() - .5) * 6.4, z = 5 + random() * 48;
    rc.beginPath(); rc.moveTo(x, z); rc.lineTo(x + .23, z + .32); rc.lineTo(x + .14, z + .56); rc.lineTo(x + .5, z + .84); rc.stroke();
  }
  const roadMap = new T.CanvasTexture(roadCanvas); roadMap.colorSpace = T.SRGBColorSpace; roadMap.anisotropy = 8;
  const detail = asphalt.map; detail.repeat.set(100 / 1.3, 76 / 1.3);
  asphalt.map = roadMap; asphalt.bumpMap = detail; asphalt.bumpScale = .004;
  asphalt.customProgramCacheKey = () => 'coastal-road-grain-v1';
  asphalt.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= .75 + .36 * texture2D(bumpMap,vBumpMapUv).r;'); };
  const concrete = surface([165, 160, 144], 26, [8, 2]);
  const crossing = concrete.clone(); crossing.color.setHex(0xc8ccc9);
  const ballast = surface([99, 94, 88], 64, [25, 2]);
  const white = new T.MeshStandardMaterial({ color: 0xe9e3cd, roughness: .91 });
  const steel = new T.MeshStandardMaterial({ color: 0x72797b, roughness: .33, metalness: .82 });
  const rust = new T.MeshStandardMaterial({ color: 0x725448, roughness: .87, metalness: .25 });
  const dark = new T.MeshStandardMaterial({ color: 0x333b3c, roughness: .85 });
  function box(size, pos, mat) {
    const g = new T.BoxGeometry(...size);
    if (mat === asphalt) {
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + pos[0] + 50) / 100, (p.getZ(i) + pos[2] + 18) / 76);
    }
    const mesh = new T.Mesh(g, mat); mesh.position.set(...pos);
    mesh.receiveShadow = true; root.add(mesh); return mesh;
  }
  box([100, .6, 76], [0, -.3, 20], concrete);
  box([7.6, .035, 67], [0, .018, 23.5], asphalt);
  box([100, .04, 8], [0, .021, -11], asphalt);
  // 道砟顶面 .09, 轨枕顶面 .14, 避免共面引起移动时闪烁.
  box([100, .09, 4.4], [0, .045, 0], ballast);
  // 道口用浅灰板面与更亮的窄收边区分沥青, 接缝下凹避免共面闪烁.
  // 外轮廓与顶面仍为 8.2 x 4.6 米和 .17 米, 沿用现有碰撞与自动登阶.
  box([7.9, .156, 4.3], [0, .078, 0], dark);
  for (let i = 0; i < 4; i++) box([1.955, .014, 4.28], [(i - 1.5) * 1.975, .163, 0], crossing);
  for (const side of [-1, 1]) {
    box([8.2, .17, .15], [0, .085, side * 2.225], concrete);
    box([.15, .17, 4.3], [side * 4.025, .085, 0], concrete);
  }
  box([100, 2, .65], [0, -1, -18], concrete);
  // 白线略有磨损分段, 轨头, 轨腰和轨底分别建模.
  for (const x of [-3.45, 3.45]) {
    box([.11, .012, 48], [x, .043, 29], white);
    box([.11, .012, 4], [x, .183, 0], white);
  }
  for (let x = -48; x < 50; x += 5.5) box([2.6, .015, .1], [x, .05, -11], white);
  for (const z of [-14.5, -7.5]) box([100, .014, .11], [0, .05, z], white);
  for (const z of [-.5335, .5335]) {
    box([100, .06, .13], [0, .23, z], steel);
    box([100, .06, .047], [0, .18, z], rust);
    box([100, .025, .18], [0, .1525, z], rust);
    box([8.1, .018, .085], [0, .177, z + Math.sign(z) * .14], dark);
  }
  const sleeperGeometry = new T.BoxGeometry(.22, .12, 2.05);
  const sleeper = new T.InstancedMesh(sleeperGeometry, dark, 144);
  const matrix = new T.Matrix4(); let count = 0;
  for (let x = -49; x <= 49; x += .68) if (Math.abs(x) > 4.3) {
    matrix.makeTranslation(x, .08, 0); sleeper.setMatrixAt(count++, matrix);
  }
  sleeper.count = count; sleeper.receiveShadow = true; root.add(sleeper);
  const stones = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), ballast, 1300);
  const dummy = new T.Object3D();
  for (let i = 0; i < 1300; i++) {
    let x = random() * 98 - 49; if (Math.abs(x) < 4.4) x += x < 0 ? -5 : 5;
    dummy.position.set(x, .09, (random() - .5) * 4.2);
    dummy.rotation.set(random() * 3, random() * 6, random() * 3);
    dummy.scale.set(.035 + random() * .075, .02 + random() * .04, .04 + random() * .07);
    dummy.updateMatrix(); stones.setMatrixAt(i, dummy.matrix);
  }
  stones.receiveShadow = true; root.add(stones);
  for (let z = 5; z < 56; z += 1.2) for (const x of [-3.9, 3.9]) {
    box([.35, .085, 1.16], [x, .06, z], concrete);
  }
  // 排水沟盖与检修井盖使用实体几何, 裂缝由路面材质负责.
  for (let z = 7; z < 53; z += 5) {
    box([.32, .015, .66], [-3.67, .065, z], dark);
    for (let j = 0; j < 7; j++) box([.31, .018, .027], [-3.67, .076, z - .27 + j * .09], steel);
  }
  const cover = new T.Mesh(new T.CylinderGeometry(.42, .42, .017, 40), dark);
  cover.position.set(.8, .049, 16); root.add(cover);
  for (let i = -3; i <= 3; i++) box([.52, .014, .022], [.8, .063, 16 + i * .085], steel);
  // 统一合并静态地面构件, 道砟与轨枕继续保留实例化绘制.
  const groups = new Map();
  for (const mesh of [...root.children]) if (mesh.isMesh && !mesh.isInstancedMesh) {
    mesh.updateMatrix();
    if (!groups.has(mesh.material)) groups.set(mesh.material, []);
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    groups.get(mesh.material).push(geometry.applyMatrix4(mesh.matrix));
    if (geometry !== mesh.geometry) mesh.geometry.dispose(); root.remove(mesh);
  }
  for (const [mat, geometries] of groups) {
    const mesh = new T.Mesh(T.mergeGeometries(geometries), mat); mesh.receiveShadow = true; root.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  return { root, onHit(hit) {
    if (hit.object.material === ballast) return { bulletmark: false, surface: 'soil' };
  } };
};
