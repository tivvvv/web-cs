// 敌人专属造型, 关节, 状态机和动画统一维护在本文件.
// 主程序提供玩家状态 player, 视点 eye(), 碰撞移动 move() 和视线判断 visible().
// 射击使用 shoot(), 特效使用 effect(), 首次死亡时调用 killed() 记录击杀.
FPS.models.enemy = (() => {
  const navigationCache=new WeakMap(),mergedGeometry=new Map();
  let geometry, armor, joints, visor, weapon, debugMaterial, bodyGeometry, bodyMaterial;
  return (T, o = {}) => {
    if(!geometry){const shape=new T.Shape();shape.moveTo(-.44,-.44);shape.lineTo(.44,-.44);shape.lineTo(.44,.44);shape.lineTo(-.44,.44);shape.closePath();geometry=new T.ExtrudeGeometry(shape,{depth:.88,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:1,steps:1,curveSegments:1}).translate(0,0,-.44);}
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
      m.castShadow = o.castShadow !== false; m.receiveShadow = true; parent.add(m); return m;
    };
    box(torso, [.64, .58, .34], [0, 1.22, 0], armor);
    box(torso, [.44, .34, .075], [0, 1.23, .2], joints);
    box(torso, [.15, .07, .015], [0, 1.34, .247], visor);
    box(root, [.48, .21, .3], [0, .84, 0], joints);
    const head = box(torso, [.38, .36, .35], [0, 1.72, 0], armor); head.userData.zone = 'head';
    box(torso, [.33, .105, .035], [0, 1.75, .188], visor).userData.zone = 'head';
    // 背负与胸前模块沿身体贴合, 不扩大物理半径; 头/腿命中区仍沿节点继承.
    box(torso,[.44,.42,.11],[0,1.25,-.23],joints);
    for(const side of [-1,1]){box(torso,[.055,.43,.05],[side*.24,1.27,.19],joints);box(torso,[.18,.18,.1],[side*.15,1.12,.23],armor);}
    box(torso,[.21,.075,.02],[0,1.4,.197],visor);
    const legs = [], arms = [], knees = [];
    for (const side of [-1, 1]) {
      const leg = new T.Group(); leg.position.set(side * .19, .82, 0); root.add(leg); legs.push(leg);
      leg.userData.zone = 'leg'; // 大腿, 小腿和脚沿父节点继承命中部位, 不受行走动画影响.
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
    // 同一关节的静态构件按材质/命中区合批; 不合并独立关节, 多名角色复用合批几何.
    const parents=[];root.traverse(n=>{if(n.isGroup)parents.push(n);});
    for(const parent of parents){const groups=new Map();for(const mesh of parent.children.filter(n=>n.isMesh&&!n.material.wireframe)){mesh.updateMatrix();const key=mesh.material.uuid+'/'+(mesh.userData.zone??'body');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);}
      for(const list of groups.values()){if(list.length<2)continue;const key=list[0].material.uuid+'/'+(list[0].userData.zone??'body')+'/'+list.map(m=>m.matrix.elements.join(',')).join(';');let g=mergedGeometry.get(key);
        if(!g){const parts=list.map(m=>m.geometry.clone().applyMatrix4(m.matrix));g=T.mergeGeometries(parts);parts.forEach(p=>p.dispose());mergedGeometry.set(key,g);}
        const mesh=new T.Mesh(g,list[0].material);mesh.userData.zone=list[0].userData.zone;mesh.castShadow=list[0].castShadow;mesh.receiveShadow=true;
        const wire=new T.Mesh(g,debugMaterial);wire.visible=false;wire.renderOrder=998;wire.raycast=()=>{};mesh.add(wire);list.forEach(m=>parent.remove(m));parent.add(mesh);
      }
    }
    debugMeshes.length=0;root.traverse(n=>{if(n.isMesh&&n.material===debugMaterial)debugMeshes.push(n);});
    let phase=0,cooldown=1.2+(o.seed??root.id)%7*.07,recoil=0,death=0,stuck=0,stepDistance=0,vision=(root.id%7)*.023,seen=false,memory=0,notice=0,patrolIndex=0,replan=0,search=0;
    const lastSeen=new T.Vector3(),goal=new T.Vector3(),direction=new T.Vector3(),target=new T.Vector3(),eye=new T.Vector3();
    let home,route=[],cursor=0,routeGoal=new T.Vector3(Infinity,Infinity,Infinity),graph;
    const nav=o.navigation;
    if(nav?.nodes?.length){graph=navigationCache.get(nav);if(!graph){
      const neighbors=nav.nodes.map(()=>[]);for(const edge of nav.edges){const a=new T.Vector3(...nav.nodes[edge.a]),b=new T.Vector3(...nav.nodes[edge.b]),cost=a.distanceTo(b)*(edge.ladder?1.5:1);neighbors[edge.a].push({to:edge.b,cost,ladder:edge.ladder});neighbors[edge.b].push({to:edge.a,cost,ladder:edge.ladder});}
      graph={points:nav.nodes.map(p=>new T.Vector3(...p)),neighbors};navigationCache.set(nav,graph);
    }}
    function nearest(p,api){
      const candidates=graph.points.map((point,i)=>({i,d:Math.hypot(point.x-p.x,point.z-p.z)+Math.abs(point.y-p.y)*4})).sort((a,b)=>a.d-b.d);
      for(const {i,d}of candidates.slice(0,6))if(d<.2||d<18&&api.visible(p.clone().add(new T.Vector3(0,1.2,0)),graph.points[i].clone().add(new T.Vector3(0,1.2,0))))return i;
      return -1;
    }
    function plan(api,destination){
      const start=nearest(root.position,api),finish=nearest(destination,api);if(start<0||finish<0)return [];
      const n=graph.points.length,cost=new Float64Array(n).fill(Infinity),previous=new Int32Array(n).fill(-1),heap=[];
      const push=(id,score)=>{let i=heap.length;heap.push({id,score});while(i){const p=(i-1)>>1;if(heap[p].score<=score)break;heap[i]=heap[p];i=p;}heap[i]={id,score};};
      const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].score<heap[j].score)j++;if(heap[j].score>=last.score)break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;};
      cost[start]=0;push(start,graph.points[start].distanceTo(graph.points[finish]));
      while(heap.length){const {id,score}=pop();if(score>cost[id]+graph.points[id].distanceTo(graph.points[finish])+1.e-6)continue;if(id===finish)break;
        for(const edge of graph.neighbors[id]){const next=cost[id]+edge.cost;if(next>=cost[edge.to])continue;cost[edge.to]=next;previous[edge.to]=id;push(edge.to,next+graph.points[edge.to].distanceTo(graph.points[finish]));}}
      if(!Number.isFinite(cost[finish]))return [];const result=[finish];while(result[0]!==start)result.unshift(previous[result[0]]);return result;
    }
    function travel(api,destination,dt){
      if(!graph)return destination;
      replan-=dt;if(!root.userData.actor?.body?.traversing&&(replan<=0&&(routeGoal.distanceTo(destination)>2||!route.length||stuck>.65))){route=plan(api,destination);cursor=0;routeGoal.copy(destination);replan=1.2+(root.id%5)*.07;}
      while(cursor<route.length&&Math.hypot(root.position.x-graph.points[route[cursor]].x,root.position.z-graph.points[route[cursor]].z)<.24&&Math.abs(root.position.y-graph.points[route[cursor]].y)<.6)cursor++;
      if(cursor>=route.length)return destination;
      const point=graph.points[route[cursor]],edge=cursor?graph.neighbors[route[cursor-1]].find(e=>e.to===route[cursor]):null;
      if(edge?.ladder&&api.climb){const result=api.climb(root,edge.ladder,point.y>graph.points[route[cursor-1]].y?1:-1,dt);if(result==='done')cursor++;else if(result==='blocked'){stuck+=dt;replan=0;}return null;}
      return point;
    }
    const actor = { root, muzzle, debugMeshes, bodyWire, health: o.health || 100, alive: true, state: 'approach', shots: 0,
      navigationState(){return {cursor,route:route.map(i=>graph.points[i].toArray()),patrolIndex,goal:goal.toArray(),stuck,seen,memory};},
      damage(amount, api) {
        if (!actor.alive) return;
        actor.health = Math.max(0, actor.health - amount); recoil = .5;
        if(api.player?.position){lastSeen.copy(api.player.position);memory=3;vision=0;notice=0;}
        if (!actor.health) {
          // 先关闭存活状态并同步通知主程序, 死亡音效不依赖后续动画或清理.
          if(actor.body)actor.body.traversing=null;
          actor.alive = false; actor.state = 'dead'; api.killed(actor);
          bodyWire.visible = false; debugMeshes.forEach(w => w.visible = false);
        }
      },
      update(dt, api) {
        if (!actor.alive) {
          death = Math.min(1, death + dt * 2.5); root.rotation.x = -death * 1.5;
          torso.position.y = -death * .16; return;
        }
        if(!Number.isFinite(dt)||dt<=0)return;
        const distance=root.position.distanceTo(api.player.position);vision-=dt;memory=Math.max(0,memory-dt);home??=root.position.clone();
        eye.copy(root.position).y+=1.65;
        if(vision<=0){vision=.14+(root.id%4)*.012;
          direction.copy(api.player.position).sub(root.position);const horizontal=Math.hypot(direction.x,direction.z),facing=horizontal<.01?1:(direction.x*Math.sin(root.rotation.y)+direction.z*Math.cos(root.rotation.y))/horizontal;
          seen=!api.player.debug&&api.player.health>0&&distance<(o.sightRange??38)&&(facing>.15||distance<7||memory>0)&&api.visible(eye,api.eye());
          if(seen){lastSeen.copy(api.player.position);memory=6;}
        }
        notice=seen?notice+dt:0;cooldown-=dt;
        const patrol=o.patrol??[];
        if(seen){actor.state='engage';goal.copy(lastSeen);}
        else if(memory>0){actor.state='search';goal.copy(lastSeen);}
        else if(patrol.length){actor.state='patrol';goal.set(...patrol[patrolIndex]);if(root.position.distanceTo(goal)<.55){patrolIndex=(patrolIndex+1)%patrol.length;goal.set(...patrol[patrolIndex]);}}
        else {actor.state='guard';goal.copy(home);}
        let moved=0;
        if(!seen&&memory>0&&root.position.distanceTo(goal)<.7){search+=dt;root.rotation.y+=dt*.65;if(search>1.6){memory=0;search=0;}}
        else if(seen&&Math.abs(lastSeen.y-root.position.y)<1.6&&distance<20&&!actor.body?.traversing){
          direction.copy(lastSeen).sub(root.position);direction.y=0;direction.normalize();const side=Math.sin(phase*.25+root.id)>0?1:-1,dx=direction.x,dz=direction.z;
          direction.set(dz*side,0,-dx*side).multiplyScalar(.45);if(distance<5)direction.addScaledVector(goal.clone().sub(root.position).setY(0).normalize(),-.7);
          moved=api.move(root,direction.x*(o.speed??2.1)*dt,direction.z*(o.speed??2.1)*dt,.42,1.9);
        }else{
          const waypoint=travel(api,goal,dt);
          if(waypoint){direction.copy(waypoint).sub(root.position);direction.y=0;const length=direction.length();if(length>.06){direction.multiplyScalar(1/length);const step=Math.min(length,(o.speed??2.1)*dt);moved=api.move(root,direction.x*step,direction.z*step,.42,1.9);}}
        }
        if(moved<.002&&!actor.body?.traversing)stuck+=dt;else stuck=0;
        if(stuck>.25&&!actor.body?.traversing){const side=root.id%2?1:-1;moved+=api.move(root,direction.z*side*.6*dt,-direction.x*side*.6*dt,.42,1.9);}
        if(seen&&!actor.body?.traversing)root.rotation.y=Math.atan2(lastSeen.x-root.position.x,lastSeen.z-root.position.z);
        else if(moved>.001)root.rotation.y=Math.atan2(direction.x,direction.z);
        const climbing=!!actor.body?.traversing,strideDistance=climbing?1.8*dt:moved;gun.visible=!climbing;
        stepDistance+=strideDistance;if(stepDistance>1.4){stepDistance=0;api.footstep?.(root.position,!!actor.body?.traversing);}
        phase += strideDistance * 5;
        const swing = strideDistance > .002 ? climbing ? .6 : .48 : 0;
        for (let i = 0; i < 2; i++) {
          const stride = Math.sin(phase + i * Math.PI);
          legs[i].rotation.x += (stride * swing - legs[i].rotation.x) * Math.min(1, dt * 16);
          knees[i].rotation.x = Math.max(0, -stride) * swing;
          arms[i].rotation.x = climbing ? -1.85+stride*.3 : -.12 + stride * swing * .2 - recoil * .2;
        }
        torso.position.y = Math.abs(Math.cos(phase)) * swing * .045;
        recoil = Math.max(0, recoil - dt * 6); gun.position.z = .4 - recoil * .07;
        if (seen && notice > .22 && cooldown <= 0 && !api.player.debug && !actor.body?.traversing) {
          root.updateMatrixWorld(true);
          const from = muzzle.getWorldPosition(new T.Vector3());
          target.copy(api.eye());
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
