// 枢纽设施. 石墙/树池/长椅/导览/车架共用少量材质, 牌面属于实体, 细连接件不新增碰撞.
FPS.models.hubFixtures = (T, o = {}) => {
  const root=new T.Group(),parts=Array.from({length:6},()=>[]),pose=new T.Object3D(),up=new T.Vector3(0,1,0);
  const signs=o.signs??[],cards=(signs.length?signs:[{width:1.8,slot:0}]).map((sign,i)=>{
    const h=sign.panelHeight??.85,width=Math.min(512,256*(sign.width??1.8)/h),height=Math.min(256,512*h/(sign.width??1.8));
    return {x:i%2*512+(512-width)/2,y:Math.floor(i/2)*256+(256-height)/2,width,height};
  });
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=Math.max(512,Math.ceil(cards.length/2)*256);const ctx=atlas.getContext('2d'),titleFont='"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", serif';
  const labels=o.labels??[['海岸広場','COASTAL COMMON'],['駅と港','STATION / CARGO TERMINAL'],['杜と山','SHRINE PARK / COASTAL HILL'],['山と港','HILL / CARGO TERMINAL']];
  for(const [i,card]of cards.entries()) {
    const {x,y,width:w,height:h}=card,slot=signs[i]?.slot??0,title=labels[slot]?.[0]??'',subtitle=labels[slot]?.[1]??'';
    ctx.fillStyle=slot%2?'#436254':'#bcb9a2';ctx.fillRect(i%2*512,Math.floor(i/2)*256,512,256);
    ctx.strokeStyle=slot%2?'#c5c4a0':'#6c8266';ctx.lineWidth=3;ctx.strokeRect(x+8,y+8,w-16,h-16);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=slot%2?'#eee7cf':'#365448';
    const routes=signs[i]?.routes??[];
    ctx.font=`500 ${Math.min(h*(routes.length ? .22 : .28),w*.82/Math.max(1,title.length))}px ${titleFont}`;ctx.fillText(title,x+w/2,y+h*(routes.length ? .21 : .3));
    ctx.font=`500 ${Math.min(h*(routes.length ? .09 : .13),w*.85/Math.max(1,subtitle.length*.62))}px sans-serif`;ctx.fillText(subtitle,x+w/2,y+h*(routes.length ? .385 : .57));
    if(routes.length) {
      ctx.strokeStyle=slot%2?'#afbc99':'#6a8068';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+w*.09,y+h*.47);ctx.lineTo(x+w*.91,y+h*.47);ctx.stroke();
      for(const [j,route]of routes.slice(0,2).entries()) {
        const cy=y+h*(.59+j*.22),right=route.direction==='right',ax=x+w*(right ? .88 : .12),sign=right?1:-1;
        ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ax-sign*w*.04,cy);ctx.lineTo(ax+sign*w*.02,cy);ctx.lineTo(ax-sign*w*.005,cy-h*.032);ctx.moveTo(ax+sign*w*.02,cy);ctx.lineTo(ax-sign*w*.005,cy+h*.032);ctx.stroke();
        ctx.font=`600 ${Math.min(h*.095,w*.6/Math.max(1,route.title.length))}px "Hiragino Sans", "Yu Gothic", sans-serif`;ctx.fillText(route.title,x+w*.5,cy-h*.019);
        ctx.font=`500 ${Math.min(h*.052,w*.64/Math.max(1,route.subtitle.length*.6))}px sans-serif`;ctx.fillText(route.subtitle,x+w*.5,cy+h*.057);
      }
    }
  }
  const map=new T.CanvasTexture(atlas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  let seed=361;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),grains=new Uint8Array(128*128*4),fibers=new Uint8Array(256*256*4);
  // 1.2 x .6 米错缝石材, 细缝与石面共同过滤, 不生成逐块墙砖.
  for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
    const row=Math.floor(y/64),sx=(x+row*32)%128,edge=Math.min(sx%64,63-sx%64,y%64,63-y%64);
    const value=213+Math.min(1,edge/1.5)*21+(random()-.5)*12;
    grains.set([value,value,value,255],(y*128+x)*4);
  }
  for(let y=0;y<256;y++)for(let x=0;x<128;x++) {
    const knot=Math.exp(-(((x-41)/11)**2+((y-147)/32)**2)),phase=x*.29+Math.sin(y*.024)*1.1+knot*6;
    const v=190+Math.sin(phase)*6+Math.sin(phase*2.7)*3-knot*12+(random()-.5)*8;
    fibers.set([v,v-10,v-28,255],(y*256+x)*4);
    const radius=Math.hypot((x-58)/128,(y-139)/256),end=188+Math.sin(radius*125+Math.sin(radius*19)*.4)*8+Math.sin(x*7.3+y*11.1)*2;
    fibers.set([end,end-10,end-28,255],(y*256+x+128)*4);
  }
  const texture=(pixels,w,h)=>{const tex=new T.DataTexture(pixels,w,h);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;tex.anisotropy=4;tex.needsUpdate=true;return tex;};
  const grain=texture(grains,128,128),timber=texture(fibers,256,256);grain.colorSpace=T.SRGBColorSpace;timber.colorSpace=T.SRGBColorSpace;
  const materials=[new T.MeshStandardMaterial({map:grain,bumpMap:grain,bumpScale:.004,vertexColors:true,roughness:.98}),new T.MeshStandardMaterial({map:timber,bumpMap:timber,bumpScale:.003,vertexColors:true,roughness:.89}),
    new T.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:.25}),new T.MeshStandardMaterial({color:0x697451,roughness:1}),
    new T.MeshStandardMaterial({map,roughness:.94}),new T.MeshStandardMaterial({color:0x354741,roughness:.96})];
  materials.forEach(m=>m.shadowSide=T.FrontSide);
  function add(source,batch,color=0xffffff) {
    const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();
    if(batch<3){const p=g.attributes.position,n=g.attributes.normal,values=[],c=new T.Color(color);
      for(let i=0;i<p.count;i++){const shade=.93+.07*Math.max(0,n.getY(i))-.035*Math.cos(p.getX(i)*1.9+p.getZ(i)*.71);const tint=c.clone().multiplyScalar(shade);values.push(tint.r,tint.g,tint.b);}
      g.setAttribute('color',new T.Float32BufferAttribute(values,3));}
    parts[batch].push(g);
  }
  function box(size,p,batch=0,color=0xa5ad9b,yaw=0){
    const g=new T.BoxGeometry(...size),a=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    if(batch<2)for(let i=0;i<a.count;i++) {
      const v=[a.getX(i),a.getY(i),a.getZ(i)],normal=[n.getX(i),n.getY(i),n.getZ(i)];
      if(batch===1){
        const length=size.indexOf(Math.max(...size)),end=Math.abs(normal[length])>.5,axes=[0,1,2].filter(k=>Math.abs(normal[k])<.5).sort((x,y)=>size[x]-size[y]);
        // 同图集左半沿材长纤维, 右半锯切年轮; 端面按实尺寸映射, 不添加新材质.
        uv.setXY(i,(end?.51:.01)+(v[axes[0]]/size[axes[0]]+.5)*.48,end?.02+(v[axes[1]]/size[axes[1]]+.5)*.96:v[length]/1.2);
      }
      else if(Math.abs(normal[1])>.5)uv.setXY(i,.2+v[0]*.015,.25+v[2]*.015);
      else uv.setXY(i,(Math.abs(normal[0])>.5?v[2]+p[2]:v[0]+p[0])/1.2,(v[1]+p[1])/.6);
    }
    add(g.rotateY(yaw).translate(...p),batch,color);
  }
  // 石帽顶沿做 6 毫米倒角和分段细缝. 仍合入石材网格, 碰撞复用完整墙体.
  function cap(size,p,color=0xb8baa3) {
    const axis=size[0]>size[2]?0:2,count=Math.ceil(size[axis]/1.05),segment=size[axis]/count;
    for(let i=0;i<count;i++) {
      const dimensions=[...size],center=[...p];dimensions[axis]=segment-(i<count-1?.006:0);center[axis]+=-size[axis]/2+(i+.5)*segment;
      const [w,h,d]=dimensions,[x,y,z]=center,e=.006,low=y-h/2,high=y+h/2;
      const bottom=[[x-w/2,low,z-d/2],[x+w/2,low,z-d/2],[x+w/2,low,z+d/2],[x-w/2,low,z+d/2]],rim=bottom.map(([a,,b])=>[a,high-e,b]),top=bottom.map(([a,,b])=>[a+(a<x?e:-e),high,b+(b<z?e:-e)]),values=[];
      const tri=(a,b,c)=>values.push(...a,...b,...c);
      tri(bottom[0],bottom[1],bottom[2]);tri(bottom[0],bottom[2],bottom[3]);tri(top[0],top[3],top[1]);tri(top[1],top[3],top[2]);
      for(let j=0;j<4;j++){const k=(j+1)%4;tri(bottom[j],rim[j],bottom[k]);tri(bottom[k],rim[j],rim[k]);tri(rim[j],top[j],rim[k]);tri(rim[k],top[j],top[k]);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(values,3));g.computeVertexNormals();const uv=[];
      for(let j=0;j<values.length;j+=3)uv.push(.2+(values[j]-x)*.015,.25+(values[j+2]-z)*.015);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));add(g,0,color);
    }
  }
  function beam(a,b,r=.025,batch=2,color=0x5b7568) {const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A);pose.position.copy(A).add(B).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(up,v.clone().normalize());pose.scale.setScalar(1);pose.updateMatrix();add(new T.CylinderGeometry(r,r,v.length(),6,1).applyMatrix4(pose.matrix),batch,color);}
  function panel(size,p,slot=0,yaw=0) {
    const source=new T.BoxGeometry(...size).rotateY(yaw).translate(...p),positions=source.attributes.position,normals=source.attributes.normal,uv=source.attributes.uv;
    for(const [i,group]of source.groups.entries()) {
      const g=new T.BufferGeometry(),ps=[],ns=[],us=[],card=cards[slot];
      for(let k=group.start;k<group.start+group.count;k++){const j=source.index.getX(k);ps.push(positions.getX(j),positions.getY(j),positions.getZ(j));ns.push(normals.getX(j),normals.getY(j),normals.getZ(j));us.push((card.x+uv.getX(j)*card.width)/atlas.width,1-(card.y+(1-uv.getY(j))*card.height)/atlas.height);}
      g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('normal',new T.Float32BufferAttribute(ns,3));g.setAttribute('uv',new T.Float32BufferAttribute(us,2));add(g,i===5?4:2,0x577466);
    }source.dispose();
  }
  for(const b of o.blocks??[]) {
    const [w,h,d]=b.size,[x,y,z]=b.offset;
    if(b.kind==='planter') {
      for(const side of [-1,1]){box([w,h,.16],[x,y,z+side*(d/2-.08)]);box([.16,h,d-.32],[x+side*(w/2-.08),y,z]);}
      box([w-.32,.07,d-.32],[x,y+h/2-.16,z],3);
      for(const side of [-1,1]){cap([w+.1,.08,.22],[x,y+h/2,z+side*(d/2-.08)]);cap([.22,.08,d-.38],[x+side*(w/2-.08),y+h/2,z]);}
    } else {box(b.size,b.offset,b.kind==='wood'?1:0,b.color??0xa2aa97);if(h>.9)cap([w,.08,d],[x,y+h/2+.04,z],0xb9b9a3);}
  }
  for(const bench of o.benches??[{position:[0,2.4,0]}]) {
    const [x,y,z]=bench.position,yaw=bench.yaw??0,w=bench.width??1.9,c=Math.cos(yaw),s=Math.sin(yaw),p=([px,py,pz])=>[x+px*c+pz*s,y+py,z-px*s+pz*c];
    for(let i=0;i<4;i++)box([w,.07,.105],p([0,.48,(i-1.5)*.125]),1,0xb8a980,yaw);
    for(const sy of [.71,.86])box([w,.11,.055],p([0,sy,.27]),1,0xb6a17b,yaw);
    // 长座椅每跨不超过 1.8 米, 中间支架与椅面/靠背连成完整承重关系.
    const spans=Math.ceil(w*.7/1.8);
    for(let i=0;i<=spans;i++) {
      const a=-w*.35+i*w*.7/spans;
      for(const dz of [-.19,.19]){beam(p([a,.018,dz]),p([a,.45,dz]),.028);box([.1,.025,.1],p([a,.0125,dz]),2,0x667d6c,yaw);}
      beam(p([a,.41,.25]),p([a,.98,.25]),.027);
      beam(p([a,.43,-.19]),p([a,.43,.25]),.025);
      for(const dz of [-.14,.14])box([.035,.008,.018],p([a,.519,dz]),2,0x6b786b,yaw);
    }
    for(const side of [-1,1]) {
      beam(p([side*w*.43,.72,-.19]),p([side*w*.43,.72,.23]),.022);
      beam(p([side*w*.43,.49,-.19]),p([side*w*.43,.72,-.19]),.024);
    }
  }
  for(const [i,sign]of signs.entries()) {
    const [x,y,z]=sign.position,yaw=sign.yaw??0,w=sign.width??1.8,h=sign.height??2.35;
    const ph=sign.panelHeight??.85,wall=sign.mount==='wall',cy=wall?h*.59:h-.48,c=Math.cos(yaw),s=Math.sin(yaw),p=([a,b,e])=>[x+a*c+e*s,y+b,z-a*s+e*c];
    if(wall) {
      // 靠墙牌面有实体背板和分离的窄边框, 不在掩体前重复立柱/脚座.
      // 背板收进边框 2 厘米, 四边不和木框外侧共面, 侧向靠近时也不会争抢深度.
      box([w+.1,ph+.1,.07],p([0,cy,.005]),2,0x344f45,yaw);
      panel([w,ph,.06],p([0,cy,-.045]),i,yaw);
      for(const side of [-1,1]) {
        box([w+.14,.07,.12],p([0,cy+side*(ph/2+.035),-.025]),1,0x8a957b,yaw);
        box([.07,ph,.12],p([side*(w/2+.035),cy,-.025]),1,0x8a957b,yaw);
      }
    } else {
      panel([w,ph,.12],p([0,cy,0]),i,yaw);
      for(const side of [-1,1]) {
        const px=x+c*side*w*.39,pz=z-s*side*w*.39;
        box([.08,h,.08],[px,y+h/2,pz],2,0x637d6b);box([.21,.1,.21],[px,y+.05,pz],0,0xa9b19d);
      }
      box([w+.14,.065,.3],[x,y+h+.035,z],2,0x5e7666,yaw);
    }
  }
  for(const rack of o.bikeRacks??[]) {
    const [x,y,z]=rack.position,yaw=rack.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw),p=([a,b,e])=>[x+a*c+e*s,y+b,z-a*s+e*c];
    for(let i=0;i<3;i++) {
      const px=(i-1)*.65;beam(p([px,0,-.45]),p([px,.7,-.45]),.028);beam(p([px,.7,-.45]),p([px,.7,.45]),.028);beam(p([px,.7,.45]),p([px,0,.45]),.028);
      for(const dz of [-.45,.45])box([.14,.035,.14],p([px,.018,dz]),2,0x738676,yaw);
    }
    if(rack.bike) {
      // 车身纵轴沿 U 形架, 横向留出把手净空; 车架与自行车各用自己的局部变换.
      const bikeYaw=rack.bikeYaw??Math.PI/2,offset=rack.bikeOffset??[.27,-.015,0],bc=Math.cos(bikeYaw),bs=Math.sin(bikeYaw),
        bikePoint=([a,b,e])=>p([offset[0]+a*bc+e*bs,offset[1]+b,offset[2]-a*bs+e*bc]),angle=yaw+bikeYaw;
      const axle=[[-.55,.38,0],[.55,.38,0]];
      for(const center of axle){beam(bikePoint([center[0],.38,-.055]),bikePoint([center[0],.38,.055]),.045);const g=new T.TorusGeometry(.34,.025,5,24).rotateY(angle).translate(...bikePoint(center));add(g,5);for(const a of [0,Math.PI/3,Math.PI*2/3])beam(bikePoint([center[0]+Math.sin(a)*.3,.38+Math.cos(a)*.3,0]),bikePoint([center[0]-Math.sin(a)*.3,.38-Math.cos(a)*.3,0]),.007);}
      // 主梁/后撑/前叉采用各自的真实管径, 焊接处不叠等径多边管的侧平面.
      for(const [a,b,r]of [[axle[0],[0,.43,0],.018],[[0,.43,0],[-.25,.88,0],.027],[[-.25,.88,0],axle[0],.016],[[-.25,.88,0],[.35,.88,0],.022],[[.35,.88,0],axle[1],.024],[[.35,.88,0],[0,.43,0],.03]])beam(bikePoint(a),bikePoint(b),r,2,0x7c8c71);
      beam(bikePoint([-.25,.88,0]),bikePoint([-.25,1.03,0]),.024);box([.29,.06,.14],bikePoint([-.25,1.05,0]),5,0xffffff,angle);
      beam(bikePoint([.35,.88,0]),bikePoint([.3,1.08,0]),.018);beam(bikePoint([.3,1.08,-.19]),bikePoint([.3,1.08,.19]),.024);
      for(const side of [-1,1]) {
        beam(bikePoint([.3,1.08,side*.14]),bikePoint([.3,1.08,side*.21]),.031,5);
        beam(bikePoint([.34,1.055,side*.175]),bikePoint([.42,1.025,side*.1]),.01,2,0xa2ad94);
        beam(bikePoint([0,.43,side*.025]),bikePoint([side*.09,.43-side*.07,side*.12]),.013);
        box([.12,.025,.07],bikePoint([side*.09,.43-side*.07,side*.15]),5,0xffffff,angle);
      }
      // 链条外圈与内孔一次拉伸成闭合薄体, 不把等径细管在后轴上叠成闪烁的平面.
      const chain=new T.Shape(),hole=new T.Path();
      for(const [i,[a,b]]of [[0,.48],[-.57,.403],[-.57,.357],[0,.38]].entries())i?chain.lineTo(a,b):chain.moveTo(a,b);chain.closePath();
      for(const [i,[a,b]]of [[-.013,.465],[-.555,.393],[-.555,.368],[-.013,.395]].entries())i?hole.lineTo(a,b):hole.moveTo(a,b);hole.closePath();chain.holes.push(hole);
      add(new T.ExtrudeGeometry(chain,{depth:.014,bevelEnabled:false,steps:1}).translate(0,0,.058).rotateY(angle).translate(...bikePoint([0,0,0])),5);
    }
  }
  for(const item of o.services??[]) {
    const [x,y,z]=item.position,[w,h,d]=item.size,yaw=item.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw);
    const point=([a,b,e])=>[x+a*c+e*s,y+b,z-a*s+e*c],
      serviceBox=(size,p,batch,color)=>box(size,point(p),batch,color,yaw),
      serviceBeam=(a,b,r,batch,color)=>beam(point(a),point(b),r,batch,color);
    if(item.kind==='bin') {
      serviceBox([w,h*.72,d],[0,h*.36,0],2,item.color??0x617868);
      serviceBox([w,h*.12,d],[0,h*.94,0],2,0x829380);
      for(const side of [-1,1])serviceBox([w*.13,h*.16,d],[side*w*.435,h*.8,0],2,0x788b76);
      serviceBox([w*.74,h*.16,.035],[0,h*.8,d/2-.0175],2,0x4e6559);
      // 投入口有真实空隙, 口内底/后板与盖顶分离, 不用黑贴纸模拟凹槽.
      serviceBox([w*.74,.018,d-.06],[0,h*.722,0],5);
      serviceBox([w*.32,.04,.012],[0,h*.57,-d/2-.006],0,0xd3d2b7);
      serviceBox([w+.02,.05,d+.02],[0,.025,0],5);
    } else if(item.kind==='fountain') {
      serviceBeam([0,.06,0],[0,h*.67,0],w*.22,2,0x7e9483);
      serviceBox([w,.06,d],[0,.03,0],0,0xadb5a1);
      const bottom=h*.68,top=h*.84;
      serviceBox([w,.035,d],[0,bottom,0],2,0x9caa99);
      const rimBottom=bottom+.0175;
      for(const side of [-1,1]){serviceBox([w,top-rimBottom,.035],[0,(top+rimBottom)/2,side*(d/2-.0175)],2,0x9caa99);serviceBox([.035,top-rimBottom,d-.07],[side*(w/2-.0175),(top+rimBottom)/2,0],2,0x9caa99);}
      serviceBeam([0,top,d*.28],[0,h-.025,d*.28],.025,2,0xb1bbad);
      serviceBeam([0,h-.025,d*.28],[0,h-.025,d*.03],.022,2,0xb1bbad);
      serviceBox([.055,.006,.055],[0,bottom+.021,0],5);
      serviceBox([.085,.025,.045],[0,h-.018,d*.28],2,0x537362);
    }
  }
  for(const drain of o.drains??[]) {
    const [x,y,z]=drain.position,w=drain.width??1.1,d=drain.depth??.4;
    // 黑色沟底下沉, 格栅与边框上沿齐平; 地面模型在同一矩形内留空.
    box([w,.026,d],[x,y-.07,z],5);
    for(const side of [-1,1])box([w,.035,.025],[x,y-.0175,z+side*(d/2-.0125)],2,0x718475);
    for(let i=0;i<Math.ceil(w/.14);i++)box([.055,.035,d-.04],[x-w/2+(i+.5)*w/Math.ceil(w/.14),y-.0175,z],2,0x718475);
  }
  const names=['hub-stone-fixtures','hub-bench-timber','hub-metal-fixtures','hub-planter-soil','hub-signs','hub-rubber-insets'];
  parts.forEach((list,i)=>{if(!list.length)return;const mesh=new T.Mesh(T.mergeGeometries(list),materials[i]);mesh.name=names[i];mesh.castShadow=i!==3&&i!==4;mesh.receiveShadow=true;root.add(mesh);list.forEach(g=>g.dispose());});
  let disposed=false;return {root,onHit(hit){if(hit.object.name==='hub-planter-soil')return {bulletmark:false,surface:'soil'};},dispose(){if(disposed)return;disposed=true;map.dispose();grain.dispose();timber.dispose();}};
};
