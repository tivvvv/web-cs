// 锦鲤: 参数化放样鱼身(头钝, 胸厚, 尾柄细), 尾鳍/胸鳍/背鳍/眼/触须合并为单网格;
// 花纹按鱼生成(红白/三色/黄金), 脊柱行波由 CPU 顶点驱动, 头稳尾摆; 不参与射击, 不依赖其他模型.
FPS.models.pondKoi = (T, o = {}) => {
  const root = new T.Group(), rx = o.radiusX ?? 14, rz = o.radiusZ ?? 16, count = o.count ?? 6, bandHalf = o.bridgeHalf ?? 0, obstacles = o.obstacles ?? [], swimY = -.005;
  let seed = o.seed ?? 57, time = 0;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const profile = pts => t => {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const [t1, v1] = pts[i], [t0, v0] = pts[i - 1];
      if (t <= t1) { const k = (t - t0) / (t1 - t0); return v0 + (v1 - v0) * (.5 - .5 * Math.cos(k * Math.PI)); }
    }
    return pts[pts.length - 1][1];
  };
  const width = profile([[0, .012], [.12, .052], [.32, .07], [.62, .052], [1, .013]]);
  const depth = profile([[0, .015], [.1, .068], [.3, .088], [.62, .06], [1, .016]]);
  // 贴图宽 272: 左 16px 为鳍(浅)/眼(黑)色块, 鱼身展开在右侧, v=.25 对应背部正中.
  function bodyGeometry() {
    const seg = 22, radial = 10, positions = [], uvs = [], indices = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, z = (.5 - t) * .7;
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * Math.PI * 2, sy = Math.sin(a);
        positions.push(Math.cos(a) * width(t), sy * depth(t) * (sy < 0 ? .82 : 1), z);
        uvs.push((16 + t * 256) / 272, j / radial);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const body = new T.BufferGeometry();
    body.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    body.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    body.setIndex(indices); body.computeVertexNormals();
    const flat = body.toNonIndexed(); body.dispose(); return flat;
  }
  function pinUv(g, u, v) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v); return g; }
  // 平面鳍以根点为扇心连接轮廓, 中段沿 X 微弓避免死板; uv 固定到浅色块.
  function finGeometry(root, outline, bow = .015) {
    const pts = outline.map((p, i) => [p[0] + bow * Math.sin(i / (outline.length - 1) * Math.PI), p[1], p[2]]), positions = [], uvs = [];
    for (let i = 1; i < pts.length; i++) positions.push(...root, ...pts[i - 1], ...pts[i]);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(new Array(positions.length / 3).fill(0).flatMap(() => [.03, .78]), 2));
    g.computeVertexNormals(); return g;
  }
  function dorsalGeometry() {
    const positions = [], n = 6, base = [], top = [];
    for (let i = 0; i < n; i++) {
      const z = .02 - i / (n - 1) * .28, y = depth(.5 - z / .7) * .98;
      base.push([0, y, z]); top.push([0, y + .008 + .034 * Math.sin(i / (n - 1) * Math.PI), z]);
    }
    for (let i = 1; i < n; i++) positions.push(...base[i - 1], ...top[i - 1], ...base[i], ...top[i - 1], ...top[i], ...base[i]);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(new Array(positions.length / 3).fill(0).flatMap(() => [.03, .78]), 2));
    g.computeVertexNormals(); return g;
  }
  function pattern() {
    const canvas = document.createElement('canvas'); canvas.width = 272; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eed9bd'; ctx.fillRect(0, 0, 16, 64); ctx.fillStyle = '#181310'; ctx.fillRect(0, 64, 16, 64);
    const kind = random(), white = kind < .55, sanke = white && kind >= .3;
    ctx.fillStyle = white ? '#f3ecdc' : '#e8781a'; ctx.fillRect(16, 0, 256, 128);
    const blotch = (u, v, r, color) => {
      ctx.fillStyle = color;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.ellipse(16 + u * 256 + (random() - .5) * r * 300, (1 - v) * 128 + (random() - .5) * r * 190, r * (150 + random() * 150), r * (90 + random() * 90), random() * 3, 0, 7);
        ctx.fill();
      }
    };
    const red = ['#c1320f', '#a82a0c', '#d44a16'];
    if (white) {
      // 远距离辨识优先: 红斑覆盖背部六到八成, 避免白底融入水面.
      const n = 5 + (random() * 3 | 0);
      for (let i = 0; i < n; i++) blotch(.06 + (i + .5) / n * .9, .25 + (random() - .5) * .19, .13 + random() * .09, red[i % 3]);
      if (sanke) for (let i = 0; i < 4; i++) blotch(.15 + random() * .7, .25 + (random() - .5) * .2, .026 + random() * .02, '#201a16');
    } else for (let i = 0; i < 3; i++) blotch(.2 + random() * .6, .25 + (random() - .5) * .2, .07 + random() * .06, '#b8370f');
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace; return map;
  }
  const parts = [bodyGeometry()];
  for (const s of [-1, 1]) {
    parts.push(finGeometry([s * .048, -.028, .2], [[s * .095, -.05, .13], [s * .115, -.062, .05], [s * .1, -.07, -.01], [s * .062, -.055, .03]], s * .012));
    parts.push(pinUv(new T.SphereGeometry(.012, 6, 4).scale(1, .85, .7).translate(s * .044, .014, .26).toNonIndexed(), .03, .25));
    parts.push(pinUv(new T.CylinderGeometry(.0018, .0032, .03, 4).rotateX(2.04).translate(s * .016, -.022, .34).toNonIndexed(), .03, .75));
  }
  parts.push(finGeometry([0, 0, -.35], [[0, .085, -.57], [0, .05, -.5], [0, .012, -.45], [0, -.05, -.5], [0, -.085, -.57]]));
  parts.push(dorsalGeometry());
  const template = T.mergeGeometries(parts); parts.forEach(g => g.dispose());
  const fishes = [];
  for (let i = 0; i < count; i++) {
    const geometry = template.clone();
    const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ map: pattern(), roughness: .55, side: T.DoubleSide }));
    mesh.raycast = () => {}; mesh.scale.setScalar(1 + random() * .35); mesh.rotation.order = 'YXZ'; root.add(mesh);
    // 出生点避开桥带, 防止开局穿模.
    let a0 = random() * 6.283;
    while (bandHalf && Math.abs(Math.sin(a0)) < .45) a0 += .7;
    fishes.push({ mesh, base: geometry.attributes.position.array.slice(), swim: 1.6 + random() * .9, phase: random() * 6.283, a: a0, speed: .022 + random() * .02, r: .5 + random() * .25, wobble: random() * 6.283, ripple: i * .4, leap: 8 + random() * 22, leapT: -1, leapDir: [0, 1], dive: 0, divePitch: 0, amp: .05, blend: 0, landX: 0, landZ: 0, yawSet: false, yaw: 0 });
  }
  template.dispose();
  // 涟漪环对象池复用, 浅色环扩张淡出, 不写深度避免与水面互闪.
  const ringGeometry = new T.RingGeometry(.42, .5, 40).rotateX(-Math.PI / 2), rings = [];
  for (let i = 0; i < 9; i++) {
    const m = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: 0xeaf7f0, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.raycast = () => {}; root.add(m); rings.push({ m, life: 9, boost: 1 });
  }
  let ringSlot = 0;
  function update(dt, api) {
    time += dt;
    for (const f of fishes) {
      f.a += f.speed * dt * (1 + .3 * Math.sin(time * .13 + f.wobble));
      const r = f.r + .12 * Math.sin(time * .11 + f.wobble * 2), x = Math.cos(f.a) * rx * r, z = Math.sin(f.a) * rz * r;
      // 桥带禁区: 接近桥带中线即掉头游回, 远离时不重复翻转避免振荡.
      if (bandHalf && Math.abs(z) < bandHalf && z * Math.cos(f.a) * f.speed < 0) f.speed = -f.speed;
      // 水中障碍 (景石): 进入包围圆且朝向圆心时掉头.
      let dirSign = f.speed < 0 ? -1 : 1;
      for (const [ox, oz, or] of obstacles) {
        const dx = x - ox, dz = z - oz;
        if (dx * dx + dz * dz < or * or) {
          const tx = -Math.sin(f.a) * rx * dirSign, tz = Math.cos(f.a) * rz * dirSign;
          if (tx * -dx + tz * -dz > 0) { f.speed = -f.speed; dirSign = -dirSign; break; }
        }
      }
      // 朝向取轨道解析切线 (含巡游方向), 不用位移差分, 不会倒游.
      const targetYaw = f.leapT >= 0 || f.dive > 0 ? f.yaw : Math.atan2(-Math.sin(f.a) * rx * dirSign, Math.cos(f.a) * rz * dirSign);
      if (!f.yawSet) { f.yaw = targetYaw; f.yawSet = true; }
      let d = targetYaw - f.yaw;
      while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283;
      f.yaw += d * Math.min(1, dt * 2.5);
      // 跃出水面: 沿起跳朝向走抛物线, 空中俯仰跟随轨迹; 落水后轨道按落点重锚定, 不瞬移.
      let lx = x, lz = z, ly = swimY + .012 * Math.sin(time * .6 + f.wobble), pitchX = 0;
      if (f.leapT < 0) {
        f.leap -= dt;
        if (f.leap <= 0) {
          // 预测起跳到回浮的全程终点, 会超出巡游范围, 跨越桥带或撞上水中障碍则不跳, 稍后重试.
          const dir = [Math.sin(f.yaw), Math.cos(f.yaw)], ex = x + dir[0] * 2.8, ez = z + dir[1] * 2.8, mx = (x + ex) / 2, mz = (z + ez) / 2;
          if (Math.hypot(ex / rx, ez / rz) <= .72 && (!bandHalf || (z * ez > 0 && Math.abs(ez) > bandHalf + .8))
            && obstacles.every(([ox, oz, or]) => Math.hypot(ex - ox, ez - oz) > or + .8 && Math.hypot(mx - ox, mz - oz) > or)) {
            f.leapT = 0; f.leapDir = dir;
            api?.effect('waterSplash', { position: new T.Vector3(x, 0, z).add(root.position), direction: new T.Vector3(0, 1, 0) });
          } else f.leap = 2 + random() * 3;
        }
      }
      if (f.leapT >= 0) {
        f.leapT += dt / 1.15;
        const t = Math.min(1, f.leapT);
        lx += f.leapDir[0] * 1.6 * t; lz += f.leapDir[1] * 1.6 * t;
        ly = swimY + 4.2 * t * (1 - t);
        // 俯仰跟随速度方向 (rotation.x 正值低头), 起跳前 20% 行程渐入避免瞬间抬头.
        pitchX = -Math.atan2(4.2 * (1 - 2 * t), 1.6) * Math.min(1, t * 5);
        if (f.leapT >= 1) {
          f.leapT = -1; f.leap = 35 + random() * 35; f.dive = 1.2; f.divePitch = pitchX; f.diveDir = f.leapDir; f.landX = lx; f.landZ = lz;
          api?.effect('waterSplash', { position: new T.Vector3(lx, 0, lz).add(root.position), direction: new T.Vector3(0, 1, 0) });
          const ring = rings[ringSlot]; ringSlot = (ringSlot + 1) % rings.length;
          ring.life = 0; ring.boost = 2; ring.m.visible = true; ring.m.position.set(lx, .006, lz);
        }
      } else if (f.dive > 0) {
        // 入水后保持向前的动量: 边前进边下潜, 到深处再边前进边浮起, 轨道锚定到前进后的位置.
        f.dive -= dt;
        const k = 1 - Math.max(0, f.dive) / 1.2, dist = 1.68 * (k - .3 * k * k);
        lx = f.landX + f.diveDir[0] * dist; lz = f.landZ + f.diveDir[1] * dist;
        ly = swimY - .3 * Math.sin(Math.PI * k); pitchX = f.divePitch * Math.pow(1 - k, 1.5);
        if (f.dive <= 0) {
          // 锚定半径必须扣除当前摆动项, 否则下一帧轨道会重复叠加摆动造成错位.
          const wob = .12 * Math.sin(time * .11 + f.wobble * 2);
          f.a = Math.atan2(lz / rz, lx / rx); f.r = Math.min(.85, Math.max(.35, Math.hypot(lx / rx, lz / rz) - wob));
          f.landX = lx; f.landZ = lz; f.blend = .5;
        }
      }
      // 锚定点向轨道位置平滑融合 (满幅起步无跳变), 消除摆动项残差.
      if (f.blend > 0 && f.leapT < 0 && f.dive <= 0) {
        f.blend = Math.max(0, f.blend - dt);
        const k = Math.min(1, f.blend / .5), b = k * k * (3 - 2 * k);
        lx += (f.landX - lx) * b; lz += (f.landZ - lz) * b;
      }
      f.mesh.position.set(lx, ly, lz);
      f.mesh.rotation.set(pitchX, f.yaw, .05 * Math.sin(time * 1.7 + f.wobble));
      // 脊柱行波: 摆幅向尾递增, 相位沿体轴延迟形成 S 形推进; 空中目标摆幅加大, 连续过渡.
      f.amp += ((f.leapT >= 0 ? .085 : .05) - f.amp) * Math.min(1, dt * 6);
      const pos = f.mesh.geometry.attributes.position, base = f.base, w = time * f.swim + f.phase;
      for (let i = 0; i < pos.count; i++) {
        const bz = base[i * 3 + 2], k = Math.pow(Math.min(1, Math.max(0, (.12 - bz) / .55)), 1.5);
        pos.array[i * 3] = base[i * 3] + Math.sin(w - bz * 4.2) * f.amp * k;
      }
      pos.needsUpdate = true;
      f.ripple -= dt;
      if (f.ripple <= 0 && f.leapT < 0 && f.dive <= 0) {
        f.ripple = 1.2 + random() * .9;
        const ring = rings[ringSlot]; ringSlot = (ringSlot + 1) % rings.length;
        ring.life = 0; ring.boost = 1; ring.m.visible = true; ring.m.position.set(x, .006, z);
      }
    }
    for (const ring of rings) {
      if (!ring.m.visible) continue;
      ring.life += dt; const k = ring.life / 2.4;
      if (k >= 1) { ring.m.visible = false; continue; }
      ring.m.scale.setScalar((.3 + k * 2.2) * ring.boost); ring.m.material.opacity = .2 * Math.pow(1 - k, 1.5);
    }
  }
  return { root, update, dispose() {
    for (const f of fishes) { f.mesh.geometry.dispose(); f.mesh.material.map.dispose(); f.mesh.material.dispose(); }
    ringGeometry.dispose(); rings.forEach(r => r.m.material.dispose());
  } };
};
