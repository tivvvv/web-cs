// 公共驿站活动设施. 展陈/候车/补给/维修为同一静态设施族, 共用图集和四个材质批次.
FPS.models.hubActivity = (T, o = {}) => {
  const root=new T.Group(),parts=[[],[],[],[]],softRanges=[[],[],[],[]],counts=[0,0,0,0],pose=new T.Object3D();let frame=new T.Matrix4(),soft=false;
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=1024;const ctx=atlas.getContext('2d'),titleFont='"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", serif';
  const captions=[['海岸の暮らし','COASTAL COMMUNITY'],['海岸交通','COASTAL CONNECTIONS'],['登山準備','TRAIL SUPPLIES'],['港務作業','HARBOR WORKSHOP'],
    ['沿岸の記録','THE COAST THROUGH TIME'],['出発案内','DEPARTURE INFORMATION'],['安全な登山','WATER / REST / EQUIPMENT'],['整備中','MAINTENANCE SERVICES']];
  for(const [i,[title,subtitle]]of captions.entries()) {
    const x=i%2*512,y=Math.floor(i/2)*256;
    ctx.fillStyle=i<4?'#48675b':'#d5cfb7';ctx.fillRect(x,y,512,256);ctx.strokeStyle=i<4?'#b9bc99':'#748875';ctx.lineWidth=3;ctx.strokeRect(x+12,y+12,488,232);
    ctx.fillStyle=i<4?'#eee6cd':'#3b554a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 42px '+titleFont;ctx.fillText(title,x+256,y+57);
    ctx.font='500 17px sans-serif';ctx.fillText(subtitle,x+256,y+103);
    // 展陈插画/时刻条目直接烘焙在实体卡片上, 不加悬空贴片或额外小字网格.
    ctx.strokeStyle=i<4?'#b9bc99':'#71836a';ctx.lineWidth=4;
    if(i===0||i===4) {
      // 电车/林径/港口各自成景, 记录牌采用同一地点的旧时色调, 不重复占位山形.
      for(let j=0;j<3;j++) {
        const a=x+58+j*133,b=y+140;ctx.fillStyle=i===4?'#baa984':['#9bb6b1','#adb698','#a6b9b1'][j];ctx.fillRect(a,b,122,72);
        ctx.fillStyle=i===4?'#756e50':'#728e7e';ctx.fillRect(a,b+49,122,23);
        if(j===0) {
          ctx.fillStyle='#d8ccb0';ctx.beginPath();ctx.moveTo(a+5,b+29);ctx.lineTo(a+44,b+15);ctx.lineTo(a+83,b+29);ctx.closePath();ctx.fill();
          ctx.fillStyle='#486754';ctx.fillRect(a+23,b+37,79,24);ctx.fillStyle='#ddd2af';ctx.fillRect(a+23,b+52,79,4);
          ctx.fillStyle='#9bb5aa';for(let k=0;k<4;k++)ctx.fillRect(a+30+k*17,b+41,12,9);
          ctx.strokeStyle='#536653';ctx.lineWidth=2;for(const h of [63,68]){ctx.beginPath();ctx.moveTo(a+5,b+h);ctx.lineTo(a+117,b+h);ctx.stroke();}
          ctx.fillStyle='#3e5549';for(const k of [38,86]){ctx.beginPath();ctx.arc(a+k,b+61,4,0,Math.PI*2);ctx.fill();}
        } else if(j===1) {
          ctx.fillStyle='#647e60';ctx.beginPath();ctx.moveTo(a,b+48);ctx.lineTo(a+31,b+22);ctx.lineTo(a+52,b+38);ctx.lineTo(a+88,b+10);ctx.lineTo(a+122,b+46);ctx.lineTo(a+122,b+72);ctx.lineTo(a,b+72);ctx.closePath();ctx.fill();
          ctx.strokeStyle='#d6c5a0';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(a+28,b+72);ctx.bezierCurveTo(a+84,b+50,a+24,b+47,a+89,b+23);ctx.stroke();
          for(const k of [17,106]){ctx.fillStyle='#536951';ctx.fillRect(a+k,b+33,3,27);ctx.beginPath();ctx.moveTo(a+k-9,b+43);ctx.lineTo(a+k+1,b+22);ctx.lineTo(a+k+11,b+43);ctx.closePath();ctx.fill();}
        } else {
          ctx.fillStyle='#708c88';ctx.fillRect(a,b+54,122,18);ctx.fillStyle='#7f6950';ctx.beginPath();ctx.moveTo(a+35,b+56);ctx.lineTo(a+94,b+56);ctx.lineTo(a+82,b+64);ctx.lineTo(a+46,b+64);ctx.closePath();ctx.fill();
          ctx.fillStyle='#e2d5b2';ctx.beginPath();ctx.moveTo(a+64,b+22);ctx.lineTo(a+64,b+53);ctx.lineTo(a+86,b+53);ctx.closePath();ctx.fill();
          ctx.strokeStyle='#516958';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a+63,b+19);ctx.lineTo(a+63,b+57);ctx.moveTo(a+17,b+54);ctx.lineTo(a+17,b+14);ctx.lineTo(a+52,b+14);ctx.lineTo(a+39,b+27);ctx.moveTo(a+39,b+27);ctx.lineTo(a+39,b+38);ctx.stroke();
        }
        ctx.fillStyle=i===4?'#52624b':'#e8dfc3';ctx.font='500 12px sans-serif';ctx.textAlign='center';ctx.fillText(['RAIL / COAST','FOREST / TRAIL','PORT / WORK'][j],a+61,b+86);
      }
    } else if(i===5) {
      ctx.font='500 19px monospace';ctx.textAlign='left';
      for(const [j,row]of ['08:15  LOCAL  COASTAL STATION','08:30  LOCAL  HARBOR LINE','08:45  LOCAL  COASTAL STATION'].entries())ctx.fillText(row,x+47,y+147+j*29);
    } else {
      const rows={1:['STATION / PARK','HILL / HARBOR','LOCAL CONNECTIONS'],2:['WATER / REFILL','REST / TRAIL CHECK','BOOTS / EQUIPMENT'],
        3:['TOOLS / REPAIR','CABLE / PARTS','HARBOR MAINTENANCE'],6:['CHECK THE TRAIL','CARRY WATER','REST BEFORE CLIMBING'],7:['TOOLS / STORAGE','SERVICE ACCESS','KEEP PASSAGE CLEAR']}[i];
      ctx.font='500 20px sans-serif';ctx.textAlign='left';
      for(const [j,row]of rows.entries()){ctx.fillRect(x+65,y+143+j*27,6,6);ctx.fillText(row,x+85,y+147+j*27);}
    }
  }
  const print=new T.CanvasTexture(atlas);print.colorSpace=T.SRGBColorSpace;print.anisotropy=8;
  const pixels=new Uint8Array(128*256*4);let seed=2387;
  for(let y=0;y<256;y++)for(let x=0;x<128;x++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const v=202+Math.sin(x*.3+Math.sin(y*.02))*6+(seed/4294967296-.5)*9;pixels.set([v,v-13,v-31,255],(y*128+x)*4);
  }
  const timber=new T.DataTexture(pixels,128,256);timber.colorSpace=T.SRGBColorSpace;timber.wrapS=timber.wrapT=T.RepeatWrapping;
  timber.generateMipmaps=true;timber.minFilter=T.LinearMipmapLinearFilter;timber.magFilter=T.LinearFilter;timber.anisotropy=4;timber.needsUpdate=true;
  const materials=[new T.MeshStandardMaterial({map:timber,bumpMap:timber,bumpScale:.003,vertexColors:true,roughness:.87}),
    new T.MeshStandardMaterial({vertexColors:true,roughness:.94}),new T.MeshStandardMaterial({vertexColors:true,metalness:.35,roughness:.58}),new T.MeshStandardMaterial({map:print,roughness:.9})];
  materials.forEach(m=>m.shadowSide=T.FrontSide);
  function add(source,batch,color=0xffffff) {
    const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();
    if(batch!==3){const values=[],base=new T.Color(color),p=g.attributes.position;
      for(let i=0;i<p.count;i++){const shade=.9+.1*Math.min(1,Math.max(0,p.getY(i))/.5);values.push(base.r*shade,base.g*shade,base.b*shade);}g.setAttribute('color',new T.Float32BufferAttribute(values,3));}
    const count=g.attributes.position.count/3;
    if(soft)softRanges[batch].push([counts[batch],counts[batch]+count]);counts[batch]+=count;
    g.applyMatrix4(frame);parts[batch].push(g);
  }
  function box(size,p,batch=1,color=0xb5b7a1,yaw=0) {
    const g=new T.BoxGeometry(...size),a=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    if(batch===0)for(let i=0;i<a.count;i++){const values=[a.getX(i),a.getY(i),a.getZ(i)],normal=[n.getX(i),n.getY(i),n.getZ(i)],axes=[0,1,2].filter(k=>Math.abs(normal[k])<.5).sort((a,b)=>size[a]-size[b]);uv.setXY(i,values[axes[0]]/.35,values[axes[1]]/1.2);}
    add(g.rotateY(yaw).translate(...p),batch,color);
  }
  function beam(a,b,r=.02,color=0x637967,batch=2) {
    const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A);
    pose.position.copy(A).add(B).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());pose.scale.setScalar(1);pose.updateMatrix();
    add(new T.CylinderGeometry(r,r,v.length(),8).applyMatrix4(pose.matrix),batch,color);
  }
  function profile(points,depth,p,batch=1,color=0xb5b7a1) {
    // 闭合薄体用于帆面/工具/软包轮廓, 不靠双面透明贴片制造体积.
    const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    add(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1}).translate(p[0],p[1],p[2]-depth/2),batch,color);
  }
  function panel(w,h,p,slot) {
    const source=new T.BoxGeometry(w,h,.045).translate(...p),pos=source.attributes.position,norm=source.attributes.normal,uv=source.attributes.uv;
    for(const group of source.groups){const g=new T.BufferGeometry(),ps=[],ns=[],us=[];
      for(let k=group.start;k<group.start+group.count;k++){const j=source.index.getX(k);ps.push(pos.getX(j),pos.getY(j),pos.getZ(j));ns.push(norm.getX(j),norm.getY(j),norm.getZ(j));us.push((slot%2*512+uv.getX(j)*512)/1024,1-(Math.floor(slot/2)*256+(1-uv.getY(j))*256)/1024);}
      g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('normal',new T.Float32BufferAttribute(ns,3));g.setAttribute('uv',new T.Float32BufferAttribute(us,2));add(g,group.materialIndex===5?3:2,0x496456);
    }source.dispose();
    for(const side of [-1,1]){box([w+.12,.06,.09],[p[0],p[1]+side*(h/2+.03),p[2]+.02],0,0xaba58b);box([.06,h,.09],[p[0]+side*(w/2+.03),p[1],p[2]+.02],0,0xaba58b);}
  }
  function cabinet(p,size,color=0x6e8874) {
    const [x,y,z]=p,[w,h,d]=size;
    box(size,p,2,color);
    for(const side of [-1,1]) {
      box([w/2-.04,h-.12,.025],[x+side*w/4,y,z-d/2-.024],2,0x8e9b86);
      beam([x+side*.09,y-.13,z-d/2-.065],[x+side*.09,y+.12,z-d/2-.065],.014,0xc3c3ad);
      for(let i=0;i<3;i++)box([w*.27,.018,.022],[x+side*w/4,y+h*.27+i*.065,z-d/2-.05],2,0x405747);
    }
    for(const side of [-1,1])box([w*.16,.08,d*.7],[x+side*w*.32,y-h/2-.04,z],2,0x5e7262);
  }
  function seat(x,z) {
    box([.52,.06,.48],[x,.47,z],0,0xb6a786);box([.52,.37,.055],[x,.72,z+.23],0,0xb6a786);
    for(const side of [-1,1])for(const end of [-1,1]){const rear=end>0,dz=rear?.21:-.18;beam([x+side*.2,0,z+dz],[x+side*.2,rear?.87:.44,z+dz],.021);}
    beam([x-.2,.69,z+.24],[x+.2,.69,z+.24],.018);
  }
  function bag(p,size,color) {
    soft=true;
    const [x,y,z]=p,[w,h,d]=size,e=Math.min(w,h)*.12;
    profile([[-w/2+e,-h/2],[w/2-e,-h/2],[w/2,-h/2+e],[w/2,h/2-e],[w/2-e,h/2],[-w/2+e,h/2],[-w/2,h/2-e],[-w/2,-h/2+e]],d,p,1,color);
    box([w*.58,h*.35,.035],[x,y-h*.15,z-d/2-.014],1,0x647c6a);
    for(const side of [-1,1]){box([.04,h+.012,d+.028],[x+side*w*.3,y,z],1,0xa8a48b);beam([x+side*w*.17,y+h/2-.004,z],[x+side*w*.17,y+h/2+.11,z],.018,0x627365);}
    beam([x-w*.17,y+h/2+.11,z],[x+w*.17,y+h/2+.11,z],.018,0x627365);
    for(const side of [-1,1])add(new T.SphereGeometry(.035,6,4).translate(x+side*w*.3,y-h/2-.025,z-d*.24),2,0x46554b);
    soft=false;
  }
  function exhibit(site) {
    const displayZ=site.displayZ??-.65,rackZ=site.rackZ??-.55;
    for(const side of [-1,1]) {
      box([.12,2.3,.12],[side*2.25,1.15,1.28],0,0x9f987d);box([.25,.1,.25],[side*2.25,.05,1.28]);
    }
    box([4.8,.13,.28],[0,2.25,1.28],0,0x9b9379);
    panel(2.2,1.1,[-1.2,1.5,1.22],0);panel(2.2,1.1,[1.2,1.5,1.22],4);
    box([1.2,.56,.58],[2.35,.28,displayZ],0,0xb1a78a);
    box([1.26,.04,.62],[2.35,.58,displayZ],0,0xc0b696);
    // 展台上的船体和桅杆有真实体积, 不用无内容的展示柜占位.
    add(new T.SphereGeometry(.35,10,5).scale(1.4,.25,.48).translate(2.35,.68,displayZ),0,0x9a8465);
    box([.7,.032,.22],[2.35,.758,displayZ],0,0xb8a480);
    beam([2.35,.74,displayZ],[2.35,1.19,displayZ],.012,0x8f8b70);
    beam([2.35,.8,displayZ],[2.67,.8,displayZ],.009,0x8f8b70);
    profile([[0,0],[.29,0],[0,.36]],.015,[2.36,.805,displayZ],1,0xe1d5b3);
    // 资料架有背板/侧板/层板, 册子可见纸边, 不再是实心柜体前的彩色方块.
    box([.72,1.06,.035],[-2.5,.575,rackZ+.1075],0,0xa99a7b);
    for(const side of [-1,1])box([.04,1.15,.25],[-2.5+side*.38,.575,rackZ],0,0xa99a7b);
    for(const y of [.0225,1.1275])box([.72,.045,.25],[-2.5,y,rackZ],0,0xa99a7b);
    for(let i=0;i<3;i++) {
      box([.72,.035,.215],[-2.5,.32+i*.285,rackZ-.0175],0,0xb9aa89);
      for(let j=0;j<3;j++){const x=-2.5+(j-1)*.22,y=.4325+i*.285;box([.18,.19,.08],[x,y,rackZ-.065],1,[0xaeb99c,0xc1b48f,0x97ada3][j]);box([.155,.006,.065],[x,y+.093,rackZ-.063],1,0xdbd6bc);}
    }
  }
  function waiting() {
    panel(1,.5,[0,1.86,1.1],5);
    seat(-1.25,.8);seat(1.25,.8);bag([-.95,.3,-.45],[.44,.55,.26],0x9b9f84);bag([.9,.22,-.3],[.4,.38,.24],0x788c7c);
    // 挂钩、折伞、公告投递口集中在等候位置, 小构件不增加碰撞.
    for(const x of [-1.65,1.65]){
      box([.25,.05,.2],[x,.025,1.3],2,0x627565);beam([x,.04,1.3],[x,1.55,1.3],.018);
      beam([x,1.55,1.3],[x+.13,1.65,1.3],.018);beam([x+.13,1.65,1.3],[x+.18,1.58,1.3],.018);
      add(new T.ConeGeometry(.065,1.02,7).translate(x,.655,1.3),1,0x8b957d);box([.14,.035,.14],[x,.41,1.3],1,0x667d6a);
    }
    box([.8,.09,.36],[0,1.25,1.22],2,0x607769);box([.54,.14,.19],[0,1.36,1.3],1,0xd0cbb4);
  }
  function supply(site) {
    panel(1.6,.8,[-.4,2.33,1.52],2);
    const table=site.table??{size:[.92,.12,.65],offset:[1.95,.87,1.35]},[w,h,d]=table.size,[x,y,z]=table.offset,top=y+h/2;
    box(table.size,table.offset,0,0xb0a482);
    for(const side of [-1,1]){box([.12,.05,d*.8],[x+side*w*.35,.025,z],2,0x627565);beam([x+side*w*.35,.05,z],[x+side*w*.35,y-h/2,z],.03);}
    for(let i=0;i<3;i++){const px=x+(i-1)*.2;beam([px,top-.001,z],[px,top+.22,z],.048,0x839984);beam([px,top+.205,z],[px,top+.245,z],.028,0x839984);box([.065,.035,.065],[px,top+.255,z],2,0xb4b9a0);}
    bag([2.05,.23,-.25],[.4,.4,.27],0x9a9d7e);
    for(const x of [-2.1,-1.92]){beam([x,0,1.35],[x,1.2,1.35],.016);beam([x,1.19,1.35],[x,1.38,1.35],.026,0x586d60,1);add(new T.TorusGeometry(.04,.009,4,8).rotateX(Math.PI/2).translate(x,.17,1.35),2,0x627565);}
  }
  function workshop() {
    const w=2.8,z=1.2;
    box([w,.12,.8],[0,.92,z],0,0xbaa783);
    for(const x of [-1.2,1.2])for(const dz of [-.31,.31])box([.09,.86,.09],[x,.43,z+dz],2,0x587262);
    box([2.6,.045,.68],[0,.22,z],2,0x718573);
    box([2.7,.82,.11],[0,1.58,1.66],0,0x9a957b);
    // 可辨认的锤/开口扳手/梅花扳手/钳/螺丝刀, 挂钩接入工具板, 轮廓控制在牌框下方.
    for(let i=0;i<6;i++){const x=-1+i*.4;beam([x,1.66,1.6],[x,1.66,1.55],.013);}
    beam([-1,1.29,1.56],[-1,1.67,1.56],.022,0xad9674,0);box([.19,.065,.055],[-1,1.7,1.56],2,0xa9b1a0);
    profile([[-.025,0],[.025,0],[.028,.26],[.085,.29],[.085,.37],[.04,.37],[.035,.32],[-.035,.32],[-.04,.37],[-.085,.37],[-.085,.29],[-.028,.26]],.032,[-.6,1.35,1.576],2,0xb3b7a5);
    beam([-.2,1.31,1.576],[-.2,1.63,1.576],.021,0xb3b7a5);add(new T.TorusGeometry(.055,.017,5,10).translate(-.2,1.681,1.576),2,0xb3b7a5);
    for(const side of [-1,1]){beam([.2+side*.065,1.3,1.576],[.2,1.56,1.576],.019,0x677f6c,1);beam([.2,1.56,1.576],[.2+side*.036,1.72,1.576],.014,0xb3b7a5);}
    beam([.6,1.3,1.576],[.6,1.5,1.576],.027,0xaa9a78,0);beam([.6,1.48,1.576],[.6,1.72,1.576],.012,0xb3b7a5);
    for(const side of [-1,1]){beam([1+side*.065,1.3,1.576],[1,1.56,1.576],.019,0x677f6c,1);box([.03,.14,.033],[1+side*.017,1.635,1.576],2,0xb3b7a5);}
    box([.34,.045,.28],[.75,1.0025,1.1],2,0x6f8775);
    for(const x of [.63,.84]){box([.075,.14,.25],[x,1.095,1.1],2,0x7e8c76);box([.017,.045,.23],[x+(x<.75?.044:-.044),1.1375,1.1],2,0xb5b8a4);}
    beam([.58,1.064,1.1],[1.08,1.064,1.1],.022,0xb8b7a2);beam([1.06,.95,1.1],[1.06,1.18,1.1],.012,0xb8b7a2);
    for(let i=0;i<3;i++)box([.3,.05,.22],[-.84+i*.43,.2675,1.2],0,0xa38d66);
    beam([-.7,.98,1.12],[-.7,1.15,1.12],.048,0x718b76);beam([-.7,1.15,1.12],[-.53,1.24,1.12],.012,0x9fae98);
    // 线盘绕芯, 轴向盘片与绕线保持分离; 合入原金属/哑光批次.
    const cx=2.55,cz=1.12;
    for(const side of [-1,1])add(new T.CylinderGeometry(.38,.38,.045,12).rotateZ(Math.PI/2).translate(cx+side*.22,.38,cz),0,0xb19e77);
    add(new T.CylinderGeometry(.24,.24,.39,12).rotateZ(Math.PI/2).translate(cx,.38,cz),1,0x526b5e);
    // 四圈连续螺旋绕线替代五个不相连的圆环, 共用截面并减少隐藏内侧细分.
    const cablePositions=[],cableIndices=[],turns=4,steps=48,radial=4,pitch=.28/(turns*Math.PI*2);
    for(let i=0;i<=steps;i++){
      const a=i/steps*turns*Math.PI*2,side=new T.Vector3(-.26,-pitch*Math.sin(a),pitch*Math.cos(a)).normalize();
      for(let j=0;j<radial;j++){const b=j/radial*Math.PI*2,ax=Math.sin(b)*.0335,r=Math.cos(b)*.0335;
        cablePositions.push(cx-.14+i/steps*.28+side.x*ax,.38+(.26+r)*Math.cos(a)+side.y*ax,cz+(.26+r)*Math.sin(a)+side.z*ax);
      }
    }
    for(let i=0;i<steps;i++)for(let j=0;j<radial;j++){const a=i*radial+j,b=i*radial+(j+1)%radial;cableIndices.push(a,b,a+radial,b,b+radial,a+radial);}
    for(let j=1;j<radial-1;j++){cableIndices.push(0,j+1,j,steps*radial,steps*radial+j,steps*radial+j+1);}
    const cable=new T.BufferGeometry();cable.setAttribute('position',new T.Float32BufferAttribute(cablePositions,3));cable.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(cablePositions.length/3*2),2));cable.setIndex(cableIndices);cable.computeVertexNormals();add(cable,1,0x586957);
    for(const side of [-1,1])add(new T.CylinderGeometry(.085,.085,.012,8).rotateZ(Math.PI/2).translate(cx+side*.2485,.38,cz),2,0x718373);
    box([.75,.09,.6],[2.5,.5,-.6],2,0x80917c);
    for(const side of [-1,1]){beam([2.5+side*.28,.17,-.6],[2.5+side*.28,.48,-.6],.024);beam([2.5+side*.28,.5,-.37],[2.5+side*.28,1.07,-.37],.02);add(new T.TorusGeometry(.14,.032,5,12).rotateY(Math.PI/2).translate(2.5+side*.32,.17,-.6),2,0x46584b);}
    beam([2.22,1.07,-.37],[2.78,1.07,-.37],.025);beam([2.14,.17,-.6],[2.86,.17,-.6],.025);
    box([.4,.18,.32],[2.5,.635,-.6],0,0xa69776);box([.18,.045,.04],[2.5,.68,-.778],2,0x718373);panel(1.8,.9,[0,2.3,1.58],3);
  }
  const builders={exhibit,waiting,supply,workshop};
  for(const site of o.sites??[{kind:'exhibit',position:[0,0,0]}]) {
    const transform=new T.Object3D();transform.position.set(...site.position);transform.rotation.y=site.yaw??0;transform.updateMatrix();frame=transform.matrix;
    for(const item of site.cabinets??[])cabinet(item.offset,item.size,item.color);
    builders[site.kind]?.(site);
  }
  for(const [i,list]of parts.entries())if(list.length){const mesh=new T.Mesh(T.mergeGeometries(list),materials[i]);mesh.name=['hub-activity-timber','hub-activity-matte','hub-activity-metal','hub-activity-print'][i];mesh.userData.softRanges=softRanges[i];mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);list.forEach(g=>g.dispose());}
  let disposed=false;return {root,onHit(hit){if(hit.object.userData.softRanges?.some(([a,b])=>hit.faceIndex>=a&&hit.faceIndex<b))return {bulletmark:false,impact:false};},dispose(){if(disposed)return;disposed=true;print.dispose();timber.dispose();}};
};
