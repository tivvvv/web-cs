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
  const concrete = surface([165, 160, 144], 26, [8, 2]);
  const crossing = concrete.clone(); crossing.color.setHex(0xc8ccc9);
  const sand = surface([174, 162, 134], 34, [12, 7]);
  const ballast = surface([99, 94, 88], 64, [25, 2]);
  const white = new T.MeshStandardMaterial({ color: 0xe9e3cd, roughness: .91 });
  const steel = new T.MeshStandardMaterial({ color: 0x72797b, roughness: .33, metalness: .82 });
  const rust = new T.MeshStandardMaterial({ color: 0x725448, roughness: .87, metalness: .25 });
  const dark = new T.MeshStandardMaterial({ color: 0x333b3c, roughness: .85 });
  function box(size, pos, mat) {
    const mesh = new T.Mesh(new T.BoxGeometry(...size), mat); mesh.position.set(...pos);
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
  const beachGeometry = new T.PlaneGeometry(110, 28, 20, 16); beachGeometry.rotateX(-Math.PI / 2);
  const beachPositions = beachGeometry.attributes.position;
  for (let i = 0; i < beachPositions.count; i++) {
    const z = beachPositions.getZ(i) - 32;
    beachPositions.setXYZ(i, beachPositions.getX(i), -1.15 + (z + 18) * .047, z);
  }
  beachGeometry.computeVertexNormals();
  const beach = new T.Mesh(beachGeometry, sand); beach.receiveShadow = true; root.add(beach);
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
  // 排水沟盖, 检修井盖与细裂纹使用真实几何轮廓.
  for (let z = 7; z < 53; z += 5) {
    box([.32, .015, .66], [-3.67, .065, z], dark);
    for (let j = 0; j < 7; j++) box([.31, .018, .027], [-3.67, .076, z - .27 + j * .09], steel);
  }
  const cover = new T.Mesh(new T.CylinderGeometry(.42, .42, .017, 40), dark);
  cover.position.set(.8, .049, 16); root.add(cover);
  for (let i = -3; i <= 3; i++) box([.52, .014, .022], [.8, .063, 16 + i * .085], steel);
  const crackMat = new T.LineBasicMaterial({ color: 0x525556 }), crackPoints = [];
  for (let i = 0; i < 36; i++) {
    const x = (random() - .5) * 6.4, z = 4 + random() * 49, points = [];
    for (let j = 0; j < 5; j++) points.push(new T.Vector3(x + j * .12 + random() * .2, .043, z + j * .17 + random() * .1));
    for (let j = 1; j < points.length; j++) crackPoints.push(points[j - 1], points[j]);
  }
  root.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(crackPoints), crackMat));
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
  return { root };
};
