// 江之电风格双节电车. X 为车长方向, 门窗保留实际开口和车内空间.
FPS.models.enodenTrain = (T, options = {}) => {
  const root = new T.Group(), parts = new Map();
  const material = (color, roughness = .55, metalness = .15) => new T.MeshStandardMaterial({ color, roughness, metalness });
  const green = material(0x16796e, .34, .38), cream = material(0xe4ddbc, .48, .24);
  // 漆面粗糙度和细微凹凸由噪声生成, 保留金属涂装的高光而非塑料平涂.
  const enamel = document.createElement('canvas'); enamel.width = enamel.height = 128;
  const enamelContext = enamel.getContext('2d'), enamelPixels = enamelContext.createImageData(128, 128);
  let seed = 305;
  for (let i = 0; i < enamelPixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = 180 + (seed >>> 26);
    enamelPixels.data[i] = enamelPixels.data[i + 1] = enamelPixels.data[i + 2] = value; enamelPixels.data[i + 3] = 255;
  }
  enamelContext.putImageData(enamelPixels, 0, 0);
  const enamelMap = new T.CanvasTexture(enamel); enamelMap.wrapS = enamelMap.wrapT = T.RepeatWrapping; enamelMap.repeat.set(4, 2);
  for (const m of [green, cream]) { m.roughnessMap = enamelMap; m.bumpMap = enamelMap; m.bumpScale = .003; }
  const metal = material(0x9ca9a7, .3, .78), dark = material(0x252e31, .7, .5);
  const rubber = material(0x162024, .95, .05), roof = material(0x758584, .7, .45);
  const seat = material(0x42786d, .92, 0), floor = material(0x7d786c, .94, 0);
  const glass = new T.MeshPhysicalMaterial({ color: 0x9ecbd2, roughness: .12, metalness: .12, transparent: true, opacity: .36, side: T.DoubleSide, depthWrite: false });
  const lamp = new T.MeshStandardMaterial({ color: 0xffefd0, emissive: 0xffd38c, emissiveIntensity: 1.2, roughness: .22 });
  const red = new T.MeshStandardMaterial({ color: 0x941e18, emissive: 0xaa1b10, emissiveIntensity: .3, roughness: .3 });
  function add(geometry, mat, position, rotation = [0, 0, 0]) {
    const mesh = new T.Mesh(geometry, mat); mesh.position.set(...position); mesh.rotation.set(...rotation); mesh.updateMatrix();
    if (mat === glass) { root.add(mesh); return mesh; }
    if (!parts.has(mat)) parts.set(mat, []);
    parts.get(mat).push(geometry.applyMatrix4(mesh.matrix)); return mesh;
  }
  const box = (s, p, m, r) => add(new T.BoxGeometry(...s), m, p, r);
  function rod(a, b, radius, mat = metal) {
    const p = new T.Vector3(...a), q = new T.Vector3(...b), d = q.clone().sub(p);
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, d.length(), 10), mat);
    mesh.position.copy(p.add(q).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); mesh.updateMatrix();
    if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(mesh.geometry.applyMatrix4(mesh.matrix));
  }
  function lettering(text, subtext, w, h, bg = '#123f39', fg = '#f5efd9') {
    const c = document.createElement('canvas'); c.width = 768; c.height = 256;
    const ctx = c.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 768, 256);
    ctx.textAlign = 'center'; ctx.fillStyle = fg; ctx.font = '600 110px sans-serif'; ctx.fillText(text, 384, 135);
    ctx.font = '32px sans-serif'; ctx.fillText(subtext, 384, 205);
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace;
    return { geo: new T.PlaneGeometry(w, h), mat: new T.MeshStandardMaterial({ map, roughness: .6, side: T.DoubleSide }) };
  }
  const destination = lettering('鎌倉', 'KAMAKURA', 1.15, .36);
  const logo = lettering('江ノ電', 'ENODEN  ·  305', 1.05, .32, '#16796e');
  const cars = Math.max(1, Math.min(2, options.cars ?? 2));
  for (let car = 0; car < cars; car++) {
    const cx = -car * 16.6;
    box([15.8, .18, 2.55], [cx, 1.04, 0], floor);
    box([15.65, .37, 2.35], [cx, .82, 0], dark);
    // 下围裙, 腰线和窗带的高度与材质独立, 避免整块玻璃贴在实心车身上.
    for (const side of [-1, 1]) {
      const z = side * 1.32;
      box([15.7, .86, .095], [cx, 1.55, z], green);
      box([15.7, .06, .108], [cx, 2.015, z], metal);
      box([15.7, .16, .095], [cx, 2.12, z], cream);
      box([15.7, .27, .10], [cx, 3.34, z], cream);
      box([15.7, .13, .11], [cx, 3.52, z], green);
      const windows = [-6.9, -5.55, -2.7, -1.3, .1, 1.5, 4.35, 5.75, 7.05];
      for (const x of windows) {
        const width = Math.abs(x) > 6.8 ? .9 : 1.12;
        // 窗框用四条边拼接, 不遮挡可透视的内部.
        for (const dx of [-1, 1]) {
          box([.11, 1.15, .12], [cx + x + dx * (width / 2 + .055), 2.69, z], cream);
          box([.034, 1.01, .14], [cx + x + dx * width / 2, 2.69, z], rubber);
        }
        for (const y of [2.18, 3.2]) box([width + .045, .035, .14], [cx + x, y, z], rubber);
        box([width, .027, .15], [cx + x, 2.69, z], metal);
        add(new T.PlaneGeometry(width, 1), glass, [cx + x, 2.69, z], [0, side < 0 ? Math.PI : 0, 0]);
      }
      for (const x of [-4.15, 2.95]) {
        box([1.4, 1.1, .07], [cx + x, 1.62, z - side * .015], cream);
        box([1.4, .22, .07], [cx + x, 3.17, z - side * .015], cream);
        for (const dx of [-.66, 0, .66]) box([.08, .98, .07], [cx + x + dx, 2.65, z], cream);
        for (const dx of [-.34, .34]) {
          for (const edge of [-1, 1]) {
            box([.037, 1.01, .09], [cx + x + dx + edge * .25, 2.65, z + side * .03], rubber);
            box([.54, .037, .09], [cx + x + dx, 2.65 + edge * .49, z + side * .03], rubber);
          }
          add(new T.PlaneGeometry(.46, .91), glass, [cx + x + dx, 2.65, z + side * .083], [0, side < 0 ? Math.PI : 0, 0]);
          box([.65, .72, .085], [cx + x + dx, 1.49, z + side * .015], green);
          box([.02, 2.13, .10], [cx + x, 2.16, z + side * .02], metal);
          box([.025, .16, .035], [cx + x + dx * .35, 2.12, z + side * .09], dark);
        }
        box([1.52, .085, .24], [cx + x, 1.01, z], metal);
      }
      for (const x of [-7.72, -6.25, -3.37, -.6, .8, 2.2, 3.7, 5.05, 6.42, 7.73]) box([.12, 1.16, .09], [cx + x, 2.7, z], cream);
      for (const x of [-5.6, -.8, 5.3]) {
        box([2.5, .18, .46], [cx + x, 1.58, side * .98], seat);
        box([2.5, .6, .14], [cx + x, 1.93, side * 1.18], seat);
        for (const end of [-1, 1]) rod([cx + x + end * 1.3, 1.16, side * .72], [cx + x + end * 1.3, 3.13, side * .72], .022);
      }
      rod([cx - 7.2, 3.12, side * .73], [cx + 7.2, 3.12, side * .73], .025);
      for (let x = -6.5; x < 7; x += .75) {
        rod([cx + x, 3.11, side * .73], [cx + x, 2.91, side * .73], .013, cream);
        add(new T.TorusGeometry(.064, .012, 6, 12), cream, [cx + x, 2.85, side * .73]);
      }
      add(logo.geo.clone(), logo.mat, [cx - .6, 1.55, side * 1.375], [0, side < 0 ? Math.PI : 0, 0]);
      for (let x = -7.4; x < 7.6; x += .45) add(new T.SphereGeometry(.014, 6, 4), metal, [cx + x, 1.22, side * 1.378]);
    }
    // 弧顶通过截面挤出, 与侧面的实体窗柱共同形成完整车壳.
    const section = new T.Shape(); section.moveTo(-1.36, 3.47);
    section.lineTo(-1.36, 3.58); section.quadraticCurveTo(0, 4.02, 1.36, 3.58);
    section.lineTo(1.36, 3.47); section.closePath();
    add(new T.ExtrudeGeometry(section, { depth: 15.85, bevelEnabled: false, curveSegments: 12 }), roof, [cx - 7.925, 0, 0], [0, Math.PI / 2, 0]);
    for (let x = -5.4; x <= 5.4; x += 2.7) {
      box([1.08, .18, .84], [cx + x, 3.88, 0], roof);
      for (let j = 0; j < 6; j++) box([.83, .023, .037], [cx + x, 3.977, -.3 + j * .12], dark);
    }
    for (const x of [-4.9, 4.9]) {
      box([2.6, .28, 1.85], [cx + x, .61, 0], dark);
      for (const dx of [-.79, .79]) {
        rod([cx + x + dx, .49, -1.17], [cx + x + dx, .49, 1.17], .09, dark);
        for (const side of [-1, 1]) {
          add(new T.CylinderGeometry(.38, .38, .17, 28), rubber, [cx + x + dx, .49, side * 1.08], [Math.PI / 2, 0, 0]);
          add(new T.CylinderGeometry(.26, .26, .18, 24), metal, [cx + x + dx, .49, side * 1.09], [Math.PI / 2, 0, 0]);
          box([2.5, .14, .14], [cx + x, .58, side * 1.23], dark);
          for (let j = 0; j < 5; j++) add(new T.TorusGeometry(.09, .022, 5, 12), metal, [cx + x + dx, .63 + j * .035, side * 1.23], [Math.PI / 2, 0, 0]);
        }
      }
    }
    for (const x of [-2, 1.2]) box([2.1, .42, 1.1], [cx + x, .56, 0], dark);
    for (const end of [-1, 1]) {
      const x = cx + end * 7.89;
      box([.10, 1.02, 2.64], [x, 1.57, 0], green);
      box([.11, .18, 2.62], [x, 2.16, 0], cream);
      box([.11, .29, 2.63], [x, 3.32, 0], cream);
      for (const z of [-1.25, -.43, .43, 1.25]) box([.13, 1.07, .095], [x, 2.68, z], cream);
      for (const z of [-.83, 0, .83]) {
        add(new T.PlaneGeometry(.73, .91), glass, [x + end * .06, 2.69, z], [0, end * Math.PI / 2, 0]);
        rod([x + end * .075, 2.25, z - .23], [x + end * .077, 2.7, z + .15], .016, rubber);
      }
      for (const z of [-.88, .88]) {
        add(new T.CylinderGeometry(.16, .16, .10, 24), metal, [x + end * .085, 1.82, z], [0, 0, Math.PI / 2]);
        add(new T.CylinderGeometry(.125, .125, .115, 24), car === 0 && end > 0 ? lamp : red, [x + end * .1, 1.82, z], [0, 0, Math.PI / 2]);
      }
      add(destination.geo.clone(), destination.mat, [x + end * .068, 3.33, 0], [0, end * Math.PI / 2, 0]);
      box([.18, .18, 2.18], [x + end * .14, 1.12, 0], metal);
      box([.6, .22, .24], [x + end * .3, .7, 0], dark);
      rod([x, .94, -.45], [x + end * .25, .5, -.38], .035, rubber);
    }
    const px = cx - 2.5;
    box([1.85, .12, 1.15], [px, 3.95, 0], dark);
    for (const z of [-.43, .43]) {
      for (const side of [-1, 1]) {
        rod([px, 4.02, z], [px + side * .93, 4.68, z], .032, dark);
        rod([px + side * .93, 4.68, z], [px, 5.3, z], .027, metal);
      }
    }
    rod([px, 5.3, -.72], [px, 5.3, .72], .044, dark);
  }
  if (cars === 2) for (let i = 0; i < 7; i++) box([.06, 2.15, 1.55], [-8.03 - i * .09, 2.12, 0], rubber);
  // 静态构件按材质合并, 让螺栓, 悬挂与窗框细节不产生数百次绘制.
  for (const [mat, geometries] of parts) {
    const geometry = T.mergeGeometries(geometries.map(g => g.index ? g.toNonIndexed() : g), false), mesh = new T.Mesh(geometry, mat);
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); geometries.forEach(g => g.dispose());
  }
  destination.geo.dispose(); logo.geo.dispose();
  return { root };
};
