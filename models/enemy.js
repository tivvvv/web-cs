// 敌人专属造型, 关节, 状态机和动画统一维护在本文件.
// 主程序提供玩家状态 player, 视点 eye(), 碰撞移动 move() 和视线判断 visible().
// 射击使用 shoot(), 特效使用 effect(), 首次死亡时调用 killed() 记录击杀.
FPS.models.enemy = (() => {
  let geometry, armor, joints, visor, weapon, debugMaterial, bodyGeometry, bodyMaterial;
  return (T, o = {}) => {
    geometry ||= new T.BoxGeometry(1, 1, 1);
    armor ||= new T.MeshStandardMaterial({ color: 0xc7b79a, roughness: .75, metalness: .2 });
    joints ||= new T.MeshStandardMaterial({ color: 0x263d38, roughness: .8 });
    visor ||= new T.MeshStandardMaterial({ color: 0xff673d, emissive: 0xf04419, emissiveIntensity: 1.5, roughness: .4 });
    weapon ||= new T.MeshStandardMaterial({ color: 0x192a26, metalness: .65, roughness: .4 });
    debugMaterial ||= new T.MeshBasicMaterial({ color: 0xffb86b, wireframe: true, depthTest: false, depthWrite: false, toneMapped: false });
    const root = new T.Group(), torso = new T.Group(); root.add(torso);
    const debugMeshes = [];
    // 主程序按布局中的物理尺寸缩放和定位, 独立于四肢动画, 不参与射击命中.
    bodyGeometry ||= new T.CylinderGeometry(1, 1, 1, 16, 1, true);
    bodyMaterial ||= new T.MeshBasicMaterial({ color: 0x64d7ee, wireframe: true, depthTest: false, depthWrite: false, toneMapped: false });
    const bodyWire = new T.Mesh(bodyGeometry, bodyMaterial); bodyWire.visible = false; bodyWire.renderOrder = 999; bodyWire.raycast = () => {};
    const box = (parent, size, pos, mat) => {
      const m = new T.Mesh(geometry, mat); m.scale.set(...size); m.position.set(...pos);
      // 复用命中网格的几何体, 作为子节点自动继承关节动画和缩放, 显隐由主程序控制.
      const wire = new T.Mesh(geometry, debugMaterial); wire.visible = false; wire.renderOrder = 998;
      wire.raycast = () => {}; m.add(wire); debugMeshes.push(wire);
      m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };
    box(torso, [.64, .58, .34], [0, 1.22, 0], armor);
    box(torso, [.44, .34, .075], [0, 1.23, .2], joints);
    box(torso, [.15, .07, .015], [0, 1.34, .247], visor);
    box(root, [.48, .21, .3], [0, .84, 0], joints);
    const head = box(torso, [.38, .36, .35], [0, 1.72, 0], armor); head.userData.zone = 'head';
    box(torso, [.33, .105, .035], [0, 1.75, .188], visor).userData.zone = 'head';
    const legs = [], arms = [], knees = [];
    for (const side of [-1, 1]) {
      const leg = new T.Group(); leg.position.set(side * .19, .82, 0); root.add(leg); legs.push(leg);
      box(leg, [.23, .36, .25], [0, -.18, 0], armor);
      const knee = new T.Group(); knee.position.y = -.36; leg.add(knee); knees.push(knee);
      box(knee, [.19, .32, .22], [0, -.16, 0], joints);
      box(knee, [.23, .13, .36], [0, -.39, .055], weapon);
      const arm = new T.Group(); arm.position.set(side * .41, 1.47, 0); torso.add(arm); arms.push(arm);
      box(arm, [.22, .3, .24], [0, -.12, 0], armor);
      box(arm, [.16, .17, .38], [0, -.29, .15], joints);
    }
    const gun = new T.Group(); gun.position.set(.32, 1.15, .4); torso.add(gun);
    box(gun, [.13, .17, .55], [0, 0, 0], weapon);
    box(gun, [.055, .055, .25], [0, .01, .37], weapon);
    const muzzle = new T.Object3D(); muzzle.position.set(0, .01, .52); gun.add(muzzle);
    let phase = 0, cooldown = 1.2 + Math.random(), recoil = 0, death = 0, stuck = 0;
    const actor = { root, muzzle, debugMeshes, bodyWire, health: o.health || 100, alive: true, state: 'approach', shots: 0,
      damage(amount, api) {
        if (!actor.alive) return;
        actor.health = Math.max(0, actor.health - amount); recoil = .5;
        if (!actor.health) {
          // 先关闭存活状态并同步通知主程序, 死亡音效不依赖后续动画或清理.
          actor.alive = false; actor.state = 'dead'; api.killed(actor);
          bodyWire.visible = false; debugMeshes.forEach(w => w.visible = false);
        }
      },
      update(dt, api) {
        if (!actor.alive) {
          death = Math.min(1, death + dt * 2.5); root.rotation.x = -death * 1.5;
          torso.position.y = -death * .16; return;
        }
        const delta = api.player.position.clone().sub(root.position), distance = delta.length(); delta.y = 0;
        root.rotation.y = Math.atan2(delta.x, delta.z);
        root.updateMatrixWorld(true);
        const eye = root.position.clone().add(new T.Vector3(0, 1.65, 0)), target = api.eye();
        const visible = api.visible(eye, target);
        actor.state = visible && distance < 20 ? 'engage' : 'approach';
        // 横移方向使用独立向量, 避免改写朝向玩家的追击方向.
        const direction = delta.clone().normalize();
        if (actor.state === 'engage') {
          const side = Math.sin(phase * .25 + root.id) > 0 ? 1 : -1;
          direction.set(direction.z * side, 0, -direction.x * side).multiplyScalar(.45);
          if (distance < 5) direction.addScaledVector(delta.clone().normalize(), -.7);
        }
        const speed = o.speed || 2.1;
        let moved = api.move(root, direction.x * speed * dt, direction.z * speed * dt, .42, 1.9);
        if (moved < .005) stuck += dt; else stuck = 0;
        if (stuck > .15 || (!visible && moved < .005)) {
          const side = root.id % 2 ? 1 : -1;
          moved += api.move(root, direction.z * side * speed * dt, -direction.x * side * speed * dt, .42, 1.9);
        }
        phase += moved * 5;
        const swing = moved > .002 ? .48 : 0;
        for (let i = 0; i < 2; i++) {
          const stride = Math.sin(phase + i * Math.PI);
          legs[i].rotation.x += (stride * swing - legs[i].rotation.x) * Math.min(1, dt * 16);
          knees[i].rotation.x = Math.max(0, -stride) * swing;
          arms[i].rotation.x = -.12 + stride * swing * .2 - recoil * .2;
        }
        torso.position.y = Math.abs(Math.cos(phase)) * swing * .045;
        recoil = Math.max(0, recoil - dt * 6); gun.position.z = .4 - recoil * .07;
        cooldown -= dt;
        if (actor.state === 'engage' && cooldown <= 0 && !api.player.debug) {
          root.updateMatrixWorld(true);
          const from = muzzle.getWorldPosition(new T.Vector3());
          target.x += (Math.random() - .5) * (distance * .07 + .4);
          target.y += (Math.random() - .5) * (distance * .025 + .25);
          const aim = target.sub(from).normalize();
          api.shoot(from, aim, 'enemy', o.damage || 9);
          api.effect('flash', { position: from, rotation: root.quaternion });
          recoil = 1; actor.shots++; cooldown = o.fireInterval || .95;
        }
      }
    };
    return actor;
  };
})();
