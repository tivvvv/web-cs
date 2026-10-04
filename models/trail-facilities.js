// 登山步道设施与中央休息亭. 木亭, 观海设备与实体标牌按材质静态合批.
FPS.models.trailFacilities = (T, o = {}) => {
  const root = new T.Group(), parts = Array.from({ length: 6 }, () => []), pose = new T.Object3D(); let matrix = new T.Matrix4();
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const words = o.labels??[['海望山', 'COASTAL HILL / 03'], ['公園 ←   港 →', 'PARK / TERMINAL'], ['資源回収', 'RECYCLING'], ['山頂展望台', 'SUMMIT / 26.4 M'], ['案内所', 'INFORMATION'], ['関係者専用', 'SERVICE ACCESS'], ['登山道案内', 'TRAIL MAP'], ['岩壁の桟道', 'CLIFF WALK']];
  words.forEach((word, i) => {
    const x = i % 4 * 256, y = Math.floor(i / 4) * 256; ctx.fillStyle = i === 2 ? '#777968' : '#476c63'; ctx.fillRect(x, y, 256, 256);
    if(o.weathered) {
      // 边框, 漆面旧痕与图标直接画进原图集, 不叠共面牌片.
      ctx.fillStyle='#536f62';for(let k=0;k<40;k++)ctx.fillRect(x+8+(k*53%238),y+8+(k*97%238),1+k%3,1);
      ctx.strokeStyle='#afbaa0';ctx.lineWidth=2;ctx.beginPath();
      [[12,12],[244,12],[244,244],[12,244],[12,12]].forEach(([px,py],j)=>j?ctx.lineTo(x+px,y+py):ctx.moveTo(x+px,y+py));ctx.stroke();
      if(i!==6) {
        ctx.strokeStyle='#c5cbb0';ctx.lineWidth=3;ctx.beginPath();
        [[101,77],[119,51],[134,70],[145,58],[157,77],[101,77]].forEach(([px,py],j)=>j?ctx.lineTo(x+px,y+py):ctx.moveTo(x+px,y+py));ctx.stroke();
      }
    }
    ctx.fillStyle = '#e2d9bc'; ctx.textAlign = 'center'; ctx.font = '600 28px sans-serif'; ctx.fillText(word[0], x + 128, y + 121); ctx.font = '12px monospace'; ctx.fillText(word[1], x + 128, y + 157);
    if (i === 6) {
      // 导览图共用场景登山路线, 三种路线色与山脊等高轮廓烘焙在实体牌面.
      ctx.strokeStyle = '#8a9b7a'; ctx.lineWidth = 1.5;
      for (const r of [.45,.7,1]) {
        ctx.beginPath();
        for (let k=0;k<=16;k++) { const a=k*Math.PI/8,px=x+147+Math.cos(a)*72*r,py=y+67+Math.sin(a)*23*r; k?ctx.lineTo(px,py):ctx.moveTo(px,py); }
        ctx.stroke();
      }
      for (const [j,route] of (o.trailMap??[]).entries()) {
        ctx.strokeStyle = route.color??['#e2c990','#b9d0ac','#a7c7d0'][j%3]; ctx.lineWidth=2.5;ctx.beginPath();
        (route.points??route).forEach(([px,,pz],n)=>{const sx=x+24+(px+50)*208/100,sy=y+22+(pz+38)*72/76;n?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy);});ctx.stroke();
      }
    }
  });
  const labels = new T.CanvasTexture(canvas); labels.colorSpace = T.SRGBColorSpace; labels.anisotropy = 8;
  const grainCanvas = document.createElement('canvas'); grainCanvas.width = grainCanvas.height = 256;
  const gc = grainCanvas.getContext('2d'), grainPixels = gc.createImageData(256, 256); let seed = 241;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 231 + (seed / 4294967296 - .5) * 21 + Math.sin(x * .34 + Math.sin(y * .023)) * 7;
    grainPixels.data.set([v, v, v - 2, 255], (y * 256 + x) * 4);
  }
  gc.putImageData(grainPixels, 0, 0); const grain = new T.CanvasTexture(grainCanvas); grain.colorSpace = T.SRGBColorSpace; grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.anisotropy = 8;
  let woodMap;
  if(o.weathered) {
    const wc=document.createElement('canvas');wc.width=wc.height=256;const wctx=wc.getContext('2d'),pixels=wctx.createImageData(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
      const u=(x%128)/128,v=y/256,a=v*Math.PI*2;
      // 左半图是沿材长延伸的纤维, 右半图是锯切端面的年轮; 同一材质采样.
      const knot=Math.exp(-((u-.52)**2/.016+(v-.48)**2/.024)),warp=knot*Math.sin((v-.48)*15)*2.2;
      const rings=Math.hypot((u-.44)*1.15,(v-.56)*.9);
      const fiber=x<128?Math.sin(u*86+Math.sin(a)*1.3+warp)*10+Math.sin(u*173+Math.sin(a*2)*1.1)*4-knot*17:Math.sin(rings*116)*12;
      const value=227+fiber+Math.sin(x*17.3+y*31.7)*3;pixels.data.set([value,value-2,value-5,255],(y*256+x)*4);
    }
    wctx.putImageData(pixels,0,0);woodMap=new T.CanvasTexture(wc);woodMap.colorSpace=T.SRGBColorSpace;woodMap.wrapT=T.RepeatWrapping;woodMap.anisotropy=8;
  }
  function setPose(p, yaw = 0) { pose.position.set(...p); pose.rotation.set(0, yaw, 0); pose.updateMatrix(); matrix = pose.matrix.clone(); }
  function add(source, color, batch = 0, p = [0, 0, 0], r = [0, 0, 0], woodSize) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    if(o.weathered&&batch===1) {
      const uv=g.attributes.uv,p=g.attributes.position,n=g.attributes.normal,axis=woodSize?woodSize.indexOf(Math.max(...woodSize)):0;
      for(let i=0;i<uv.count;i++) {
        if(woodSize) {
          const a=(axis+1)%3,b=(axis+2)%3,coordinate=k=>p.array[i*3+k],end=Math.abs(n.array[i*3+axis])>.5;
          const across=end?a:Math.abs(n.array[i*3+a])>.5?b:a;
          uv.setXY(i,(end?.515:.015)+.47*(coordinate(across)/woodSize[across]+.5),end?.015+.97*(coordinate(b)/woodSize[b]+.5):coordinate(axis)/.95+.5);
        } else uv.setXY(i,.015+uv.getX(i)*.47,uv.getY(i));
      }
    }
    pose.position.set(...p); pose.rotation.set(...r); pose.updateMatrix(); g.applyMatrix4(pose.matrix);
    const vertices = g.attributes.position, normal = g.attributes.normal, uv = g.attributes.uv, tint=g.attributes.color, c = new T.Color(color), rgb = [];
    for (let i = 0; i < vertices.count; i++) {
      // 风化烘焙在顶点色里, 脚部略暗/端部失色, 无叠层贴片或新增材质.
      const weather=o.weathered&&batch!==3&&batch!==4 ? .94+.035*Math.sin(vertices.getX(i)*7+vertices.getZ(i)*3)-.07*Math.exp(-Math.abs(vertices.getY(i))/.2) : 1;
      const shade = (normal.getY(i) < -.5 ? .75 : 1)*weather; rgb.push(c.r * shade*(tint?.getX(i)??1), c.g * shade*(tint?.getY(i)??1), c.b * shade*(tint?.getZ(i)??1));
      if (batch === 2 || batch === 1&&!o.weathered) uv.setXY(i, (Math.abs(normal.getX(i)) > .5 ? vertices.getZ(i) : vertices.getX(i)) * 1.5, (Math.abs(normal.getY(i)) > .5 ? vertices.getZ(i) : vertices.getY(i)) * 1.5);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); g.applyMatrix4(matrix); parts[batch].push(g);
  }
  const box = (s, p, c = 0x6c8378, batch = 0, r) => add(new T.BoxGeometry(...s), c, batch, p, r, s);
  function brace(a,b) {
    const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),q=new T.Object3D();
    q.position.set(...a).addScaledVector(delta,.5);q.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());q.updateMatrix();
    add(new T.CylinderGeometry(.035,.035,delta.length(),6).applyMatrix4(q.matrix),0x806d54,1);
  }
  function bolt(p,face='front') {
    add(new T.CylinderGeometry(.026,.026,.032,6),0xc2bca3,0,p,face==='top'?[0,0,0]:[Math.PI/2,0,0]);
  }
  function sign(size, p, slot) {
    const g = new T.BoxGeometry(...size), uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const face = Math.abs(n.getZ(i)) > .5; uv.setXY(i, (slot % 4 + (face ? .015 + uv.getX(i) * .97 : .01)) / 4, 1 - (Math.floor(slot / 4) + (face ? .015 + (1 - uv.getY(i)) * .97 : .01)) / 2);
    }
    add(g, 0xffffff, 4, p);
  }
  function lens(radius) {
    const positions=[],normals=[],colors=[],segments=16,rings=3,sag=.008,center=new T.Color(0x193d50),edge=new T.Color(0x477b75);
    function vertex(r,a) {
      const x=Math.cos(a)*r,y=Math.sin(a)*r,z=sag*(1-r*r/(radius*radius)),normal=new T.Vector3(2*sag*x/(radius*radius),2*sag*y/(radius*radius),1).normalize();
      const color=center.clone().lerp(edge,Math.sin(r/radius*Math.PI)*.85);positions.push(x,y,z);normals.push(...normal.toArray());colors.push(color.r,color.g,color.b);
    }
    for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++) {
      const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments,inner=radius*ring/rings,outer=radius*(ring+1)/rings;
      vertex(inner,a);vertex(outer,a);vertex(outer,b);
      if(ring){vertex(inner,a);vertex(outer,b);vertex(inner,b);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));return g;
  }
  function insideTube(radius,length) {
    const g=new T.CylinderGeometry(radius,radius,length,16,1,true),indices=g.index.array,n=g.attributes.normal.array;
    for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    for(let i=0;i<n.length;i++)n[i]*=-1;return g;
  }
  for (const planter of o.planters ?? []) {
    setPose(planter.position); const [w, h, d] = planter.size;
    for (const side of [-1, 1]) {
      box([w, h, .18], [0, h / 2, side * (d / 2 - .09)], 0xa5aa97, 2);
      box([.18, h, d - .36], [side * (w / 2 - .09), h / 2, 0], 0xa5aa97, 2);
      box([w + .06, .09, .24], [0, h - .045, side * (d / 2 - .09)], 0xbebba5, 2);
      box([.24, .09, d - .42], [side * (w / 2 - .09), h - .045, 0], 0xbebba5, 2);
    }
    box([w - .36, .04, d - .36], [0, h - .16, 0], 0x716b51, 5);
  }
  for (const shelter of o.shelters ?? []) {
    setPose(shelter.position, shelter.yaw ?? 0); const w = shelter.width ?? 5, d = shelter.depth ?? 2.6, h = shelter.height ?? 2.7;
    for (const x of [-w / 2 + .12, w / 2 - .12]) for (const z of [-d / 2 + .12, d / 2 - .12]) {
      box([.11, h, .11], [x, h / 2, z], 0x5a776a); box([.3, .13, .3], [x, .065, z], 0xaaad99, 2);
      box([.1, .17, d], [x, h - .2, 0], 0x5a776a);
      if(o.weathered) {
        box([.145,.28,.145],[x,.25,z],0x697e70);
        box([.17,.23,.028],[x,h-.35,z+.072],0x677466);
        bolt([x,h-.3,z+.093]);bolt([x,h-.41,z+.093]);
        brace([x,h-.62,z],[x+(x>0?-.48:.48),h-.19,z]);
      }
    }
    if (shelter.kind === 'lookout') {
      const pitch=shelter.roofPitch??.24,rise=Math.tan(pitch)*w/2;
      for(const side of [-1,1]) {
        box([w/2/Math.cos(pitch)+.42,.15,d+.64],[side*w/4,h+.04+rise/2,0],0x526d62,0,[0,0,-side*pitch]);
        box([.1,.12,d+.65],[side*(w/2+.18),h-.01,0],0x415c52);
        for(const z of [-d/2+.12,0,d/2-.12]) box([w/2/Math.cos(pitch),.12,.09],[side*w/4,h-.11+rise/2,z],0x876b4d,1,[0,0,-side*pitch]);
      }
      box([.22,.13,d+.7],[0,h+.13+rise,0],0x6a8172);
      if(o.weathered) {
        // 檐口木封边包住板材端面; 屋面搭接肋沿坡面法线离开实面, 无共面闪烁.
        for(const side of [-1,1]) {
          for(const z of [-d/2-.32,d/2+.32])box([w/2/Math.cos(pitch)+.42,.13,.075],[side*w/4,h-.055+rise/2,z],0x7a664f,1,[0,0,-side*pitch]);
          for(const across of [.18,.38,.5]) {
            const x=side*w*across,y=h+.04+rise/2-(x-side*w/4)*side*Math.tan(pitch);
            box([.026,.025,d+.62],[x+side*Math.sin(pitch)*.09,y+Math.cos(pitch)*.09,0],0x6b8070,0,[0,0,-side*pitch]);
          }
        }
      }
      for(const z of [-d/2+.12,d/2-.12]) box([w-.16,.17,.13],[0,h-.12,z],0x876b4d,1);
      for(const side of [-1,1]) box([.065,h-.3,.065],[side*(w/2-.12),h/2-.15,-d/2+.24],0x516b5d);
    } else {
      box([w + .38, .12, d + .44], [0, h + .04, 0], 0x7b9684, 0, [.06, 0, 0]);
      box([w + .38, .1, .12], [0, h + .06, d / 2 + .22], 0x607c70);
      for (let x = -w / 2 + .15; x < w / 2; x += .7) box([.055, .035, d + .43], [x, h + .115, 0], 0xa4b2a0, 0, [.06, 0, 0]);
    }
    if (shelter.kind === 'pavilion' || shelter.kind === 'lookout') {
      box([w - .3, .52, .18], [0, .26, -d / 2 + .12], 0x9e9f89, 2);
      box([1.65, 2, .12], [w / 2 - 1.1, o.weathered?1.51:1.53, -d / 2 + .11], 0x7e8f7e, 1); sign([1.42, .94, .1], [w / 2 - 1.1, 1.96, -d / 2 + (o.weathered?.215:.23)], 4);
    } else {
      for (const z of [-d / 2 + .15]) for (const y of [.42, 1.03]) box([w - .3, .055, .06], [0, y, z], 0x688376);
    }
  }
  for (const scope of o.scopes ?? []) {
    setPose(scope.position,scope.yaw??0);
    box([.65,.16,.65],[0,.08,0],0xa6a693,2);
    add(new T.CylinderGeometry(.09,.13,1.05,10),0x6c8177,0,[0,.68,0]);
    box([.45,.12,.16],[0,1.22,0],0x7b8d80);
    for(const x of [-.16,.16]) {
      const angle=Math.PI/2-.13,barrel=[x,1.38,-.1];
      if(o.weathered) {
        // 物镜/目镜都是开口筒与内凹镜框, 取消遮住玻璃的金属端盖.
        add(new T.CylinderGeometry(.095,.075,.54,16,1,true),0xb8b99e,0,barrel,[angle,0,0]);
        const along=t=>[x,1.38+Math.cos(angle)*t,-.1+Math.sin(angle)*t];
        for(const side of [-1,1]) {
          const aperture=side>0?.068:.061,radius=side>0?.102:.082,rotation=[angle-side*Math.PI/2,0,0];
          add(new T.CylinderGeometry(radius,radius,.05,16,1,true),side>0?0x293c36:0x829389,0,along(side*.282),[angle,0,0]);
          add(insideTube(aperture,.042),0x1d302c,0,along(side*.286),[angle,0,0]);
          add(new T.RingGeometry(aperture,radius,16),side>0?0x293c36:0xa2b0a0,0,along(side*.307),rotation);
          add(lens(aperture),0xffffff,3,along(side*.275),rotation);
        }
      } else {
        add(new T.CylinderGeometry(.095,.075,.54,10),0xb8b99e,0,barrel,[angle,0,0]);
        add(new T.CylinderGeometry(.068,.068,.04,10),0x314842,0,[x,1.342,-.388],[angle,0,0]);
      }
    }
    box([.05,.24,.12],[.28,1.12,-.04],0x6e7562);
    if(o.weathered) {
      box([.2,.11,.23],[0,1.335,-.05],0x6e8176);
      add(new T.CylinderGeometry(.05,.055,.09,12),0x314b41,0,[0,1.435,-.015],[Math.PI/2-.13,0,0]);
      add(new T.CylinderGeometry(.058,.058,.5,10),0x566c61,0,[0,1.25,-.07],[0,0,Math.PI/2]);
      for(const x of [-.265,.265])add(new T.CylinderGeometry(.045,.045,.024,8),0xabb3a0,0,[x,1.25,-.07],[0,0,Math.PI/2]);
      for(const x of [-.22,.22])for(const z of [-.22,.22])bolt([x,.175,z],'top');
    }
  }
  for (const marker of o.markers ?? []) {
    setPose(marker.position,marker.yaw??0);const w=marker.width??.52,h=marker.height??1.3;
    box([w,h,w],[0,h/2,0],0xa4a38f,2);box([w+.08,.1,w+.08],[0,h+.05,0],0xb9b7a0,2);
    if(marker.slot!==undefined)sign([w-.12,.42,.08],[0,h-.28,w/2+.025],marker.slot);
  }
  for (const bench of o.benches ?? []) {
    setPose(bench.position, bench.yaw ?? 0); const w = bench.width ?? 2.1;
    for (const x of [-w * .36, w * .36]) { box([.08, .43, .54], [x, .215, 0], 0x50685d); box([.08, .51, .07], [x, .68, -.25], 0x50685d); }
    for (let z = -.21; z <= .23; z += .11) box([w, .065, .09], [0, .465, z], 0x9e815f, 1);
    for (const y of [.67, .83]) box([w, .13, .065], [0, y, -.255], 0x9e815f, 1);
    if(o.weathered)for(const x of [-w*.36,w*.36]) {
      box([.15,.07,.63],[x,.425,0],0x708273);
      for(const z of [-.21,.23])bolt([x,.507,z],'top');
      for(const y of [.67,.83])bolt([x,y,-.211]);
    }
  }
  for (const unit of o.cabinets ?? []) {
    setPose(unit.position, unit.yaw ?? 0); const [w, h, d] = unit.size, mailbox = unit.kind === 'mailbox';
    box([w, h, d], [0, h / 2, 0], mailbox ? 0x975e50 : 0x839684);
    box([w + .08, .065, d + .08], [0, h + .02, 0], 0x5a7765);
    box([w - .08, h - .12, .045], [0, h / 2, d / 2 + .0225], mailbox ? 0xb78769 : 0x92a18c);
    box([.04, .18, .04], [w * .28, h * .52, d / 2 + .062], 0xc2c4ac);
    if (mailbox) box([w * .68, .035, .02], [0, h * .8, d / 2 + .053], 0x374f48);
    else for (let x = -w * .35; x < w * .4; x += .12) box([.05, .18, .027], [x, h * .19, d / 2 + .062], 0x4e6b59);
  }
  for (const board of o.signs ?? []) {
    setPose(board.position, board.yaw ?? 0); const w = board.width ?? 2.1, h = board.height ?? 2.5;
    for (const x of [-w * .36, w * .36]) box([.09, h, .09], [x, h / 2, 0], 0x5e7b6d);
    sign([w, board.panelHeight ?? .7, .14], [0, h - .37, .04], board.slot ?? 0);
    box([w + .2, .08, .36], [0, h + .1, .035], 0x718778);
    if(o.weathered)for(const x of [-w*.36,w*.36]) {
      box([.22,.12,.22],[x,.06,0],0xaaab96,2);
      box([.09,.08,.09],[x,h+.03,0],0x5e7b6d);
      for(const y of [h-.56,h-.2])bolt([x,y,.12]);
    }
  }
  const surfaces = [{ vertexColors: true, roughness: .66, metalness: .22 },
    { map: woodMap??grain, bumpMap: woodMap??grain, bumpScale: .002, vertexColors: true, roughness: .91 },
    { map: grain, bumpMap: grain, bumpScale: .003, vertexColors: true, roughness: .93 },
    { vertexColors: true, roughness: .21, metalness: .35 },
    { map: labels, vertexColors: true, roughness: .83 }, { vertexColors: true, roughness: 1 }];
  parts.forEach((batch, i) => { if (!batch.length) return;
    const glass=o.weathered&&i===3,material=glass?new T.MeshPhysicalMaterial({vertexColors:true,roughness:.14,metalness:0,clearcoat:1,clearcoatRoughness:.09,envMapIntensity:1.1}):new T.MeshStandardMaterial(surfaces[i]);
    const mesh = new T.Mesh(T.mergeGeometries(batch),material); mesh.name = i === 5 ? 'mountain-planter-soil' : glass?'mountain-scope-glass':'mountain-street-fixtures'; mesh.castShadow = !glass;mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose()); });
  return { root, onHit(hit) { if (hit.object.name === 'mountain-planter-soil') return { bulletmark: false, surface: 'soil' }; }, dispose() { labels.dispose(); grain.dispose();woodMap?.dispose(); } };
};
