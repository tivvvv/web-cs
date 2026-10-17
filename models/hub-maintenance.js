// 港口连接带维护小屋. 双向通道和设备尺寸由场景提供, 三批静态网格, 无外部模型依赖.
FPS.models.hubMaintenance = (T, o = {}) => {
  const root=new T.Group(),parts=[[],[],[]],pose=new T.Object3D();
  const w=o.width??7,d=o.depth??6.4,h=o.height??3.05,door=o.door??{center:-.3,width:3.2,height:2.55};
  const roof=o.roof??{width:w+.6,depth:d+.6,top:h+.13,slope:.025,thickness:.14};
  const pixels=new Uint8Array(128*128*4);let seed=741;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const groove=Math.sin(x*Math.PI/16),v=210+groove*13+(seed/4294967296-.5)*5;
    pixels.set([v,v,v,255],(y*128+x)*4);
  }
  const grain=new T.DataTexture(pixels,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;
  grain.generateMipmaps=true;grain.minFilter=T.LinearMipmapLinearFilter;grain.magFilter=T.LinearFilter;grain.anisotropy=4;grain.needsUpdate=true;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#47675d';ctx.fillRect(0,0,512,128);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e4dfc6';
  ctx.font='500 35px "Hiragino Sans", "Yu Gothic", "Noto Sans CJK JP", sans-serif';ctx.fillText('港湾整備室',256,42);ctx.font='500 16px sans-serif';ctx.fillText('HARBOR MAINTENANCE  /  04',256,88);
  ctx.fillStyle='#c8c2a9';ctx.fillRect(0,128,512,128);ctx.fillStyle='#3c554a';ctx.textAlign='left';
  ctx.font='600 21px "Hiragino Sans", "Yu Gothic", "Noto Sans CJK JP", sans-serif';ctx.fillText('整備記録 / SERVICE BOARD',26,153);
  ctx.font='500 16px monospace';
  for(const [i,text]of ['04-A  CABLE / INSPECTED','04-B  TOOLS / RETURN AFTER USE','KEEP BOTH DOORWAYS CLEAR'].entries())ctx.fillText(text,26,181+i*25);
  const print=new T.CanvasTexture(canvas);print.colorSpace=T.SRGBColorSpace;print.anisotropy=8;
  const materials=[new T.MeshStandardMaterial({vertexColors:true,bumpMap:grain,bumpScale:.008,metalness:.22,roughness:.82}),
    new T.MeshStandardMaterial({vertexColors:true,metalness:.25,roughness:.7}),new T.MeshStandardMaterial({map:print,roughness:.86})];
  materials.forEach(m=>m.shadowSide=T.FrontSide);
  function add(source,batch,color=0xffffff) {
    const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();
    if(batch!==2){const values=[],base=new T.Color(color),p=g.attributes.position;
      for(let i=0;i<p.count;i++){const shade=.88+.12*Math.min(1,Math.max(0,p.getY(i))/.6);values.push(base.r*shade,base.g*shade,base.b*shade);}g.setAttribute('color',new T.Float32BufferAttribute(values,3));}
    parts[batch].push(g);
  }
  function box(size,p,batch=0,color=0x9eaa9d,slope=0) {
    const g=new T.BoxGeometry(...size),a=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    for(let i=0;i<a.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?a.getZ(i)+p[2]:a.getX(i)+p[0])/1.2,(a.getY(i)+p[1])/1.8);
    g.translate(...p);if(slope){for(let i=0;i<a.count;i++)a.setY(i,a.getY(i)+a.getZ(i)*slope);g.computeVertexNormals();}add(g,batch,color);
  }
  function beam(a,b,r=.026,color=0x7c8c76) {
    const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A);pose.position.copy(A).add(B).multiplyScalar(.5);
    pose.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());pose.updateMatrix();
    add(new T.CylinderGeometry(r,r,v.length(),6).applyMatrix4(pose.matrix),1,color);
  }
  const walls=o.walls??(()=>{
    const list=[{size:[w,h,.16],offset:[0,h/2,-d/2]},{size:[w,h,.16],offset:[0,h/2,d/2]}];
    for(const side of [-1,1]){for(const [a,b]of [[-d/2+.08,door.center-door.width/2],[door.center+door.width/2,d/2-.08]])list.push({size:[.16,h,b-a],offset:[side*w/2,h/2,(a+b)/2]});
      list.push({size:[.16,h-door.height,door.width],offset:[side*w/2,(h+door.height)/2,door.center]});}return list;
  })();
  for(const wall of walls)box(wall.size,wall.offset);
  const floor=o.floor??{size:[w-.16,.12,d-.16],offset:[0,-.02,0]};
  box(floor.size,floor.offset,1,0xa4aa9b);
  box([roof.width,roof.thickness,roof.depth],[0,roof.top,0],1,0x476256,roof.slope);
  for(const side of [-1,1]) {
    box([.06,.18,roof.depth],[side*(roof.width/2+.03),roof.top-.03,0],1,0x5f7968,roof.slope);
    box([roof.width,.18,.06],[0,roof.top-.03,side*(roof.depth/2+.03)],1,0x5f7968,roof.slope);
    // 外露门框位于薄墙外, 卷帘收在门洞上方, 不挡住两端穿行.
    for(const edge of [-1,1])box([.08,door.height,.1],[side*(w/2+.12),door.height/2,door.center+edge*(door.width/2+.05)],1,0x3e5b51);
    box([.08,.14,door.width+.2],[side*(w/2+.12),door.height+.07,door.center],1,0x3e5b51);
    box([.25,.24,door.width+.28],[side*(w/2+.2),door.height+.31,door.center],1,0x81937f);
    for(let i=0;i<6;i++)box([.015,.015,door.width+.2],[side*(w/2+.334),door.height+.21+i*.032,door.center],1,0x5d7665);
  }
  const ribs=Math.ceil(roof.width/.8);
  for(let i=1;i<ribs;i++)box([.022,.024,roof.depth-.1],[-roof.width/2+i*roof.width/ribs,roof.top+roof.thickness/2+.012,0],1,0x78907a,roof.slope);
  // 前檐排水槽的底和侧缘分离, 管线向外折到柜体旁, 不穿越门洞.
  const gutterZ=-roof.depth/2-.15,gutterY=roof.top+gutterZ*roof.slope-.14;
  box([roof.width,.025,.16],[0,gutterY,gutterZ],1,0x849680);
  for(const side of [-1,1])box([roof.width,.1,.022],[0,gutterY+.0625,gutterZ+side*.069],1,0x849680);
  beam([-w/2+.3,gutterY,gutterZ],[-w/2+.3,.15,gutterZ],.035);
  beam([-w/2+.3,.15,gutterZ],[-w/2+.1,.15,gutterZ-.2],.035);
  for(const equipment of o.equipment??[]) {
    const [a,b,c]=equipment.offset,[ew,eh,ed]=equipment.size,bottom=b-eh/2;
    if(equipment.kind==='bench') {
      box([ew,.12,ed],[a,b+eh/2-.06,c],1,0x8f9580);
      for(const sx of [-1,1])for(const sz of [-1,1])box([.09,eh-.12,.09],[a+sx*(ew/2-.08),bottom+(eh-.12)/2,c+sz*(ed/2-.08)],1,0x526b5e);
      box([ew-.2,.04,ed-.16],[a,bottom+.2,c],1,0x697e6b);
      // 台上工具箱具备分层箱盖/搭扣/提手, 避免只摆三个无用途的方块.
      for(let i=0;i<2;i++){
        const x=a-.55+i*.55,top=bottom+eh;
        box([.31,.14,.28],[x,top+.07,c],1,i?0x6c8270:0x947d58);
        box([.33,.025,.3],[x,top+.1525,c],1,0x9c9e80);
        for(const side of [-1,1]){box([.025,.055,.018],[x+side*.095,top+.115,c-.149],1,0xc0bda3);beam([x+side*.065,top+.165,c],[x+side*.065,top+.22,c],.009);}
        beam([x-.065,top+.22,c],[x+.065,top+.22,c],.01,0x425c50);
      }
      box([.22,.035,.29],[a+.55,bottom+eh+.0175,c],1,0xb6b39a);
    } else if(equipment.kind==='materials') {
      for(let i=0;i<4;i++)box([ew,.1,ed/4-.025],[a,bottom+.05,c+(i-1.5)*ed/4],1,0xa4916c);
      for(const side of [-1,1])box([.15,.13,ed],[a+side*ew*.33,bottom+.165,c],1,0x8d7c5a);
      box([ew-.18,eh-.23,ed-.15],[a,bottom+(eh+.23)/2,c],0,0x617e68);
      for(const side of [-1,1])box([.035,eh-.23+.026,ed-.1],[a+side*ew*.26,bottom+(eh+.23+.026)/2,c],1,0xb4b296);
    } else {
      box(equipment.size,equipment.offset,0,0x738977);
      for(const side of [-1,1])box([ew/2-.035,eh-.1,.035],[a+side*ew/4,b,c-ed/2-.0175],1,0x82917c);
      for(const side of [-1,1])beam([a+side*.07,b-.12,c-ed/2-.05],[a+side*.07,b+.14,c-ed/2-.05],.015,0xc2c0a4);
      for(let i=0;i<4;i++)box([ew*.28,.015,.02],[a,b+eh*.27+i*.05,c-ed/2-.045],1,0x364c42);
    }
  }
  box([2,.5,.07],[.7,2.2,-d/2-.11],1,0x354e45);
  function plate(size,center,slot){
    const sign=new T.BoxGeometry(...size),p=sign.attributes.position,uv=sign.attributes.uv;
    // 同图集上半为外牌/下半为工单, 印字只放在厚牌外向面.
    for(const group of sign.groups){const g=new T.BufferGeometry(),ps=[],us=[];
      for(let i=group.start;i<group.start+group.count;i++){const k=sign.index.getX(i);ps.push(p.getX(k)+center[0],p.getY(k)+center[1],p.getZ(k)+center[2]);us.push(uv.getX(k),(slot?0:.5)+uv.getY(k)*.5);}
      g.setAttribute('position',new T.Float32BufferAttribute(ps,3));g.setAttribute('uv',new T.Float32BufferAttribute(us,2));g.computeVertexNormals();add(g,group.materialIndex===5?2:1,0x355047);
    }sign.dispose();
  }
  plate([1.84,.46,.026],[.7,2.2,-d/2-.16],0);
  plate([1.6,.4,.035],[.4,1.65,d/2-.15],1);
  parts.forEach((list,i)=>{if(!list.length)return;const mesh=new T.Mesh(T.mergeGeometries(list),materials[i]);mesh.name=['hub-maintenance-panels','hub-maintenance-structure','hub-maintenance-sign'][i];mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);list.forEach(g=>g.dispose());});
  let disposed=false;return {root,dispose(){if(disposed)return;disposed=true;grain.dispose();print.dispose();}};
};
