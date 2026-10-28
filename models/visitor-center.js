// 游客服务点. 墙洞由场景分段, 四面/室内/雨棚全部静态合批, 印字直接使用实体牌面.
FPS.models.visitorCenter = (T, o = {}) => {
  const root=new T.Group(),w=o.width??6,d=o.depth??5,h=o.height??3.05,parts=Array.from({length:6},()=>[]),pose=new T.Object3D();
  const wood=document.createElement('canvas');wood.width=wood.height=256;const wc=wood.getContext('2d'),wp=wc.createImageData(256,256);
  let seed=803;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
    const knot=Math.exp(-(((x-96)/19)**2+((y-145)/33)**2)),phase=x*.23+Math.sin(y*.025)*1.3+knot*6;
    const v=160+Math.sin(phase)*6+Math.sin(phase*2.7)*3-knot*12+(random()-.5)*10;
    wp.data.set([v+14,v,v-24,255],(y*256+x)*4);
  }
  wc.putImageData(wp,0,0);const timber=new T.CanvasTexture(wood);timber.colorSpace=T.SRGBColorSpace;timber.wrapS=timber.wrapT=T.RepeatWrapping;timber.anisotropy=4;
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;const ctx=atlas.getContext('2d'),titleFont='"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", serif';
  const labels=o.labels??[['海岸案内所','COASTAL INFORMATION'],['海・公園・登山道','STATION / PARK / HILL / PORT'],['ご案内','OPEN  /  VISITOR SERVICES'],['海望ルート','COASTAL CONNECTIONS']];
  // 图集卡片与各实体牌面保持相同宽高比, 不把竖牌/横匾的文字拉伸.
  const cards=[[3.9,.57],[2.2,.64],[.56,.78],[1.65,.9]].map(([w,h],i)=>{
    const width=Math.min(512,256*w/h),height=Math.min(256,512*h/w);
    return {x:i%2*512+(512-width)/2,y:Math.floor(i/2)*256+(256-height)/2,width,height};
  });
  for(let slot=0;slot<4;slot++) {
    const {x,y,width:sw,height:sh}=cards[slot],title=labels[slot]?.[0]??'',subtitle=labels[slot]?.[1]??'';
    ctx.fillStyle=slot===3?'#c9c5ad':'#3c5b50';ctx.fillRect(slot%2*512,Math.floor(slot/2)*256,512,256);
    ctx.strokeStyle='#adae83';ctx.lineWidth=3;ctx.strokeRect(x+8,y+8,sw-16,sh-16);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=slot===3?'#3c544b':'#ede7d1';ctx.font=`500 ${Math.min(sh*(slot===3?.14:.27),sw*.8/Math.max(1,title.length))}px ${titleFont}`;ctx.fillText(title,x+sw/2,y+sh*(slot===3?.13:.35));
    ctx.font=`500 ${Math.min(sh*.12,sw*.8/Math.max(1,subtitle.length*.62))}px sans-serif`;ctx.fillText(subtitle,x+sw/2,y+sh*(slot===3?.92:.67));
    if(slot===3&&o.map) {
      const [a,b,c,d]=o.map.bounds,scale=Math.min(sw*.8/(c-a),sh*.53/(d-b)),px=x+sw/2,pz=y+sh*.535;
      const point=([u,v])=>[px+(u-(a+c)/2)*scale,pz-(v-(b+d)/2)*scale];
      ctx.lineCap=ctx.lineJoin='round';
      for(const path of o.map.paths){ctx.strokeStyle=path.kind==='asphalt'?'#697d72':'#9e9977';ctx.lineWidth=Math.max(1.5,path.width*scale);ctx.beginPath();path.points.forEach((p,i)=>i?ctx.lineTo(...point(p)):ctx.moveTo(...point(p)));ctx.stroke();}
      ctx.fillStyle='#a86643';ctx.beginPath();ctx.arc(...point(o.map.position),4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#3c544b';ctx.font=`500 ${sh*.07}px sans-serif`;ctx.fillText('N',px+sw*.29,pz-sh*.22);
    }
  }
  const print=new T.CanvasTexture(atlas);print.colorSpace=T.SRGBColorSpace;print.anisotropy=8;
  const grainPixels=new Uint8Array(128*128*4);for(let i=0;i<grainPixels.length;i+=4){const v=150+(random()-.5)*35;grainPixels.set([v,239+(v-150)*.35,v,255],i);}
  const grain=new T.DataTexture(grainPixels,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.generateMipmaps=true;grain.minFilter=T.LinearMipmapLinearFilter;grain.magFilter=T.LinearFilter;grain.anisotropy=4;grain.needsUpdate=true;
  const materials=[new T.MeshStandardMaterial({bumpMap:grain,roughnessMap:grain,bumpScale:.004,vertexColors:true,roughness:1}),
    new T.MeshStandardMaterial({map:timber,bumpMap:timber,bumpScale:.004,vertexColors:true,roughness:.88}),
    new T.MeshStandardMaterial({vertexColors:true,metalness:.28,roughness:.63}),
    new T.MeshStandardMaterial({color:0x294d4a,metalness:.22,roughness:.27}),
    new T.MeshStandardMaterial({map:print,roughness:.9}),new T.MeshStandardMaterial({vertexColors:true,metalness:.2,roughness:.78})];
  // 灰泥的连续低频色差和墙脚吸水带, 不叠贴片, 不把表面颗粒放大成斑点.
  materials[0].customProgramCacheKey=()=> 'visitor-plaster-finish-v1';
  materials[0].onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 plasterPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n plasterPoint=position;');
    shader.fragmentShader='varying vec3 plasterPoint;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float damp=exp(-max(plasterPoint.y,0.)/.19);
      float mottling=sin(plasterPoint.x*1.37+plasterPoint.z*.79)*sin(plasterPoint.y*2.1+plasterPoint.z*.42);
      diffuseColor.rgb*=vec3(1.-damp*.035,1.-damp*.045,1.-damp*.065)*(.992+mottling*.008);`);
  };
  materials.forEach(m=>m.shadowSide=T.FrontSide);
  function add(source,batch,color=0xffffff) {
    const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();
    if(batch!==3&&batch!==4){const p=g.attributes.position,n=g.attributes.normal,colors=[],base=new T.Color(color);
      for(let i=0;i<p.count;i++){const dirt=batch===0?.9+.1*Math.min(1,Math.max(0,p.getY(i))/.65):.96+.04*Math.max(0,n.getY(i));const c=base.clone().multiplyScalar(dirt);colors.push(c.r,c.g,c.b);}
      g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}
    parts[batch].push(g);
  }
  function box(size,p,batch=0,color=0xc5c8b4,yaw=0) {
    const g=new T.BoxGeometry(...size),pos=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    // 局部米制纹理在旋转前展开, 木纹沿构件长轴, 长梁不会把一块木纹拉到整面墙.
    if(batch<2)for(let i=0;i<pos.count;i++) {
      const values=[pos.getX(i),pos.getY(i),pos.getZ(i)],normal=[n.getX(i),n.getY(i),n.getZ(i)],axes=[0,1,2].filter(k=>Math.abs(normal[k])<.5);
      axes.sort((a,b)=>size[a]-size[b]);uv.setXY(i,(values[axes[0]]+(batch===0?p[axes[0]]:0))/(batch===1?.35:1),(values[axes[1]]+(batch===0?p[axes[1]]:0))/(batch===1?1.2:1));
    }
    add(g.rotateY(yaw).translate(...p),batch,color);
  }
  function beam(a,b,r,batch=2,color=0x4e665b) {const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A);pose.position.copy(A).add(B).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());pose.scale.setScalar(1);pose.updateMatrix();add(new T.CylinderGeometry(r,r,v.length(),7,1).applyMatrix4(pose.matrix),batch,color);}
  function pipe(points,r=.035) {
    // 折管共用转角截面, 不让独立圆柱的同向侧面在弯头处互相穿插.
    const path=points.map(p=>new T.Vector3(...p)),rings=path.map((p,i)=>{
      const direction=i?path[i].clone().sub(path[i-1]).normalize():path[1].clone().sub(p).normalize();
      if(i&&i<path.length-1)direction.add(path[i+1].clone().sub(p).normalize()).normalize();
      const q=pose.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
      return Array.from({length:7},(_,j)=>new T.Vector3(Math.cos(j*Math.PI*2/7)*r,0,Math.sin(j*Math.PI*2/7)*r).applyQuaternion(q).add(p));
    }),vertices=[],tri=(a,b,c)=>vertices.push(...a.toArray(),...b.toArray(),...c.toArray());
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<7;j++){const k=(j+1)%7;tri(rings[i][j],rings[i+1][j],rings[i+1][k]);tri(rings[i][j],rings[i+1][k],rings[i][k]);}
    for(let j=1;j<6;j++){tri(rings[0][0],rings[0][j],rings[0][j+1]);tri(rings.at(-1)[0],rings.at(-1)[j+1],rings.at(-1)[j]);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
    g.setAttribute('uv',new T.Float32BufferAttribute(vertices.flatMap((_,i)=>i%3===0?[vertices[i],vertices[i+1]]:[]),2));add(g,2,0x4e665b);
  }
  const walls=o.walls??[
    {size:[w+.2,h,.2],offset:[0,h/2,d/2]}, {size:[.2,h,d-.2],offset:[-w/2,h/2,0]},
    {size:[.2,h,d-.2],offset:[w/2,h/2,0]}, {size:[w*.32+.1,h,.2],offset:[-w*.34-.05,h/2,-d/2]},
    {size:[w*.32+.1,h,.2],offset:[w*.34+.05,h/2,-d/2]}, {size:[w*.36,h-2.35,.2],offset:[0,(h+2.35)/2,-d/2]}
  ];
  for(const b of [...walls,...(o.structure??[])]) {
    if(b.kind!=='wood'&&Math.abs(b.offset[1]-b.size[1]/2)<1e-5&&b.size[1]>.3) {
      // 石质墙脚替换原墙的下段, 不另叠共面贴片或扩大门洞碰撞.
      box([b.size[0],.22,b.size[2]],[b.offset[0],.11,b.offset[2]],0,0xa0aa98,b.yaw??0);
      box([b.size[0],b.size[1]-.22,b.size[2]],[b.offset[0],(b.size[1]+.22)/2,b.offset[2]],0,b.color??0xc7c9b6,b.yaw??0);
    } else box(b.size,b.offset,b.kind==='wood'?1:0,b.kind==='wood'?0xb0a488:b.color??0xc7c9b6,b.yaw??0);
  }
  // 室内地板高 4 厘米, 避免和外部铺地共面; 门口同一规格作为低门槛.
  for(const floor of o.floors??[{size:[w,.14,d],offset:[0,-.03,0]}])box(floor.size,floor.offset,0,0xb5b39e);
  const roofs=o.roofs??[{width:w+.8,depth:d+.8,center:[0,0],top:h+.16,slope:.035}];
  for(const roof of roofs) {
    const {width:rw,depth:rd,center:[px,pz],top,slope}=roof;
    if(roof.pitch) {
      // 连续封闭折板, 中脊没有两套相互重叠的封面; 山墙和屋面各自闭合.
      const rise=rw/2*roof.pitch,t=roof.thickness??.16,vertices=[];
      const point=(x,y,z)=>[px+x,y,pz+z],quad=(a,b,c,d)=>vertices.push(...a,...b,...c,...a,...c,...d);
      for(const side of [-1,1]) {
        const x=side*rw/2,low=top-t/2,high=top+t/2;
        const a=point(x,high,-rd/2),b=point(0,high+rise,-rd/2),c=point(0,high+rise,rd/2),e=point(x,high,rd/2);
        const A=point(x,low,-rd/2),B=point(0,low+rise,-rd/2),C=point(0,low+rise,rd/2),E=point(x,low,rd/2);
        if(side<0){quad(a,e,c,b);quad(A,B,C,E);quad(A,E,e,a);quad(A,a,b,B);quad(E,C,c,e);}
        else {quad(a,b,c,e);quad(A,E,C,B);quad(A,a,e,E);quad(A,B,b,a);quad(E,e,c,C);}
      }
      const skin=new T.BufferGeometry();skin.setAttribute('position',new T.Float32BufferAttribute(vertices,3));skin.computeVertexNormals();
      skin.setAttribute('uv',new T.Float32BufferAttribute(vertices.flatMap((_,i)=>i%3===0?[vertices[i]*.5,vertices[i+2]*.5]:[]),2));add(skin,5,0x405d51);
      const gw=roof.gableWidth??w,gd=roof.gableDepth??d,wall=roof.wallHeight??h,peak=top+rise-t/2-.02,eave=top+(rw-gw)/2*roof.pitch-t/2-.02;
      for(const side of [-1,1]) {
        const z=pz+side*gd/2,values=[],tri=(a,b,c)=>values.push(...a,...b,...c);
        const front=[[px-gw/2,wall,z+side*.1],[px-gw/2,eave,z+side*.1],[px,peak,z+side*.1],[px+gw/2,eave,z+side*.1],[px+gw/2,wall,z+side*.1]],back=front.map(([x,y,z])=>[x,y,z-side*.2]);
        for(let i=1;i<4;i++)if(side<0){tri(front[0],front[i],front[i+1]);tri(back[0],back[i+1],back[i]);}else{tri(front[0],front[i+1],front[i]);tri(back[0],back[i],back[i+1]);}
        for(let i=0;i<5;i++){const j=(i+1)%5;if(side<0){tri(front[i],back[i],front[j]);tri(front[j],back[i],back[j]);}else{tri(front[i],front[j],back[i]);tri(front[j],back[j],back[i]);}}
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(values,3));g.computeVertexNormals();g.setAttribute('uv',new T.Float32BufferAttribute(values.flatMap((_,i)=>i%3===0?[values[i],values[i+1]]:[]),2));add(g,0,0xcacbb8);
      }
      for(const side of [-1,1]) {
        box([.1,.18,rd],[px+side*(rw/2+.05),top-.05,pz],2,0x597366);
        // 双坡屋面沿两侧低檐排水, 山墙端不放横跨高低屋面的平檐沟.
        const gy=top-.15,gx=px+side*(rw/2+.185),z=pz-rd/2+.33,pipeX=px+side*(gw/2+.13);
        box([.17,.025,rd],[gx,gy,pz],2,0x748779);
        for(const edge of [-1,1])box([.02,.1,rd],[gx+edge*.075,gy+.063,pz],2,0x748779);
        pipe([[gx,gy,z],[pipeX,gy-.2,z],[pipeX,.16,z],[pipeX,.12,z-.14]]);
      }
      box([.18,.1,rd+.08],[px,top+rise+t/2+.05,pz],2,0x657c6d);
      for(let i=1,n=Math.ceil(rw/.75);i<n;i++) {
        const x=px-rw/2+i*rw/n,y=top+(rw/2-Math.abs(x-px))*roof.pitch+t/2+.014;
        box([.022,.028,rd-.06],[x,y,pz],5,0x718575);
      }
      if(o.weatherVane&&roof===roofs[0]) {
        const base=top+rise+t/2+.1;
        beam([px,base,pz],[px,base+.72,pz],.023,2,0x8b947c);
        beam([px-.43,base+.52,pz],[px+.43,base+.52,pz],.014,2,0x8b947c);
        box([.28,.12,.04],[px-.32,base+.52,pz],2,0x8b947c);
        box([.1,.16,.05],[px+.41,base+.52,pz],2,0x8b947c);
      }
      continue;
    }
    const slopedBox=(size,p,batch,color)=>{
      const g=new T.BoxGeometry(...size).translate(...p),pos=g.attributes.position;
      for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)+(pos.getZ(i)-pz)*slope);
      g.computeVertexNormals();add(g,batch,color);
    };
    const thickness=roof.thickness??.18;
    slopedBox([rw,thickness,rd],[px,top,pz],5,0x405b50);
    for(let i=0;i<=Math.ceil(rw/.65);i++){const x=px-rw/2+i*rw/Math.ceil(rw/.65);slopedBox([.022,.026,rd-.06],[x,top+thickness/2+.013,pz],5,0x5e7563);}
    // 雨棚插入较高屋面时, 侧封边止于上层檐沟外沿, 不在搭接范围叠两套同平面封边.
    const upper=roofs.find(r=>r!==roof&&r.top>top&&px-rw/2>=r.center[0]-r.width/2-1e-6&&px+rw/2<=r.center[0]+r.width/2+1e-6&&
      pz-rd/2+.06<r.center[1]-r.depth/2-.23&&pz+rd/2>r.center[1]-r.depth/2);
    const end=upper?upper.center[1]-upper.depth/2-.23:pz+rd/2-.06,start=pz-rd/2+.06;
    for(const z of upper?[-1]:[-1,1])slopedBox([rw+.12,.2,.12],[px,top-.02,pz+z*rd/2],2,0x4a655a);
    for(const x of [-1,1])slopedBox([.12,.2,end-start],[px+x*rw/2,top-.02,(start+end)/2],2,0x4a655a);
    const gz=pz-rd/2-.135,gy=top-rd/2*slope-.14;
    // 檐沟侧板接在底板上方, 端头比封边各长 2 厘米, 避免底面/端面重叠.
    box([rw+.16,.026,.19],[px,gy,gz],2,0x6a8071);
    for(const side of [-1,1])box([rw+.16,.12,.026],[px,gy+.073,gz+side*.082],2,0x6a8071);
    for(const side of [-1,1]) {
      const shade=pz<-d/2,x=shade?(side>0?(o.posts?.[0]?.[0]??px+rw/2-.23):px+side*(rw/2-.23)):side*(w/2+.12),
        z=shade?pz-rd/2+.45-(side>0?.09:0):-d/2-.13;
      beam([x,gy,gz],[x,gy-.2,z],.035);beam([x,.15,z],[x,gy-.2,z],.035);
      beam([x,.15,z],[x,.12,z-.14],.035);
      for(const y of [.55,1.8])if(y<gy-.25)beam([x,y,z],[x-(shade&&side>0?0:side*.12),y,z+(shade?.09:.13)],.012,2,0x647c6c);
    }
  }
  // 檐下椽子与室内梁形成真实遮挡, 柱脚和紧固件不逐件增加身体碰撞.
  for(const x of [-w/2+.18,0,w/2-.18])box([.12,.17,d+.42],[x,h-.11,0],1,0xa59b80);
  for(const z of [-d/2+.1,d/2-.1])box([w-.1,.2,.14],[0,h-.25,z],1,0x9b8b70);
  function face(window) {
    const axis=window.axis??'z',side=window.side??-1,yaw=axis==='z'?(side<0?0:Math.PI):(side<0?Math.PI/2:-Math.PI/2);
    const origin=window.origin??(axis==='z'?[window.center??0,0,side*d/2]:[side*w/2,0,window.center??0]),c=Math.cos(yaw),s=Math.sin(yaw);
    return {yaw,point:([x,y,z])=>[origin[0]+x*c+z*s,origin[1]+y,origin[2]-x*s+z*c]};
  }
  for(const win of o.windows??[]) {
    const f=face(win),ww=win.width,hh=win.height,cy=win.bottom+hh/2;
    box([ww-.08,hh-.08,.055],f.point([0,cy,.025]),3,0xffffff,f.yaw);
    for(const x of [-ww/2,0,ww/2])box([.065,hh+.08,.11],f.point([x,cy,-.075]),1,0xb1aa8d,f.yaw);
    for(const y of [win.bottom,win.bottom+hh])box([ww+.1,.075,.13],f.point([0,y,-.07]),1,0xb1aa8d,f.yaw);
    box([ww+.2,.08,.24],f.point([0,win.bottom-.045,-.06]),0,0x9fa797,f.yaw);
    box([ww+.24,.09,.34],f.point([0,win.bottom+hh+.16,-.1]),2,0x557063,f.yaw);
  }
  for(const door of o.doors??[{axis:'z',side:-1,center:0,width:w*.36,height:2.35}]) {
    const f=face(door);
    // 门框突出墙面 3.5 厘米, 横梁与立框相接并低于洞顶, 三者均不共面交叠.
    const frameTop=door.height-.035;
    for(const x of [-door.width/2,door.width/2])box([.075,frameTop,.15],f.point([x,frameTop/2,-.06]),1,0xa99d81,f.yaw);
    box([door.width+.15,.095,.15],f.point([0,frameTop+.0475,-.06]),1,0xa99d81,f.yaw);
  }
  function plate(size,p,slot,yaw=0) {
    const source=new T.BoxGeometry(...size);source.rotateY(yaw).translate(...p);
    const pos=source.attributes.position,norm=source.attributes.normal,uv=source.attributes.uv,indices=source.index;
    for(const [i,group]of source.groups.entries()) {
      const g=new T.BufferGeometry(),pv=[],nv=[],tv=[];
      const card=cards[slot];
      for(let k=group.start;k<group.start+group.count;k++){const j=indices.getX(k);pv.push(pos.getX(j),pos.getY(j),pos.getZ(j));nv.push(norm.getX(j),norm.getY(j),norm.getZ(j));tv.push((card.x+uv.getX(j)*card.width)/1024,1-(card.y+(1-uv.getY(j))*card.height)/512);}
      g.setAttribute('position',new T.Float32BufferAttribute(pv,3));g.setAttribute('normal',new T.Float32BufferAttribute(nv,3));g.setAttribute('uv',new T.Float32BufferAttribute(tv,2));add(g,i===5?4:2,0x4e665b);
    }source.dispose();
  }
  plate([3.9,.57,.11],[.2,h-.35,-d/2-.145],0);
  plate([.56,.78,.07],[o.entryPlaqueX??(o.windows?.length?-.15:-w*.38),1.45,-d/2-.135],2);
  plate([2.2,.64,.11],[.1,h-.375,d/2+.145],1,Math.PI);
  plate([1.65,.9,.08],o.mapPosition??[-w/2+.18,1.6,-1.55],3,-Math.PI/2);
  for(const post of o.posts??[]) {
    box([.13,h-.15,.13],[post[0],(h-.15)/2,post[1]],1,0xa99c7e);
    box([.23,.12,.23],[post[0],.06,post[1]],2,0x738779);
    box([.18,.1,.18],[post[0],h-.25,post[1]],2,0x617867);
  }
  for(const item of o.interior??[{size:[2,.9,.6],offset:[.4,.49,1.85]}]) {
    if(item.size[1]>1.3){
      // 高柜改为真实开放资料架, 层板/册页有空隙, 共用原木材/哑光批次.
      const [x,y,z]=item.offset,[iw,ih,id]=item.size,base=y-ih/2;
      box([iw,ih,.05],[x,y,z+id/2-.025],1,0xa49c80);
      for(const side of [-1,1])box([.065,ih,id-.05],[x+side*(iw/2-.0325),y,z-.025],1,0xc2b69a);
      for(let row=0;row<=4;row++){
        const level=base+.04+row*(ih-.08)/4;
        box([iw-.13,.055,id-.05],[x,level,z-.025],1,0xc8bb98);
        if(row===4)continue;
        for(let i=0;i<5;i++){
          const bh=.22+(i+row)%3*.035,bw=.09+(i%2)*.018;
          box([bw,bh,id*.48],[x-iw*.34+i*iw*.16,level+.0275+bh/2,z-id*.12],0,[0x9baa8c,0xc7bb99,0x96aea7][(i+row)%3]);
        }
      }
      continue;
    }
    box(item.size,item.offset,1,0xc2b69a);box([item.size[0]+.06,.07,item.size[2]+.04],[item.offset[0],item.offset[1]+item.size[1]/2+.035,item.offset[2]],1,0xd1c5a5);
    const [x,y,z]=item.offset,[iw,ih,id]=item.size,front=z-id/2;
    for(const side of [-1,1]) {
      box([iw*.47,ih*.3,.02],[x+side*iw*.245,y+ih*.21,front-.01],1,0xb3a487);
      box([iw*.47,ih*.52,.02],[x+side*iw*.245,y-ih*.22,front-.01],1,0xc2b69a);
      box([.18,.025,.025],[x+side*iw*.245,y+ih*.21,front-.032],2,0x697d6c);
    }
    const top=y+ih/2+.07;
    box([.44,.025,.28],[x-iw*.27,top+.0125,z],1,0x9b9379);
    for(let i=0;i<3;i++)box([.12,.016,.21],[x-iw*.27+(i-1)*.135,top+.033,z],0,[0xc6cbac,0xd6c9a1,0xafc4b0][i],(i-1)*.08);
  }
  const names=['visitor-plaster','visitor-timber','visitor-metal','visitor-glass','visitor-signs','visitor-roof'];
  parts.forEach((list,i)=>{if(!list.length)return;const mesh=new T.Mesh(T.mergeGeometries(list),materials[i]);mesh.name=names[i];mesh.castShadow=i!==3;mesh.receiveShadow=true;root.add(mesh);list.forEach(g=>g.dispose());});
  let disposed=false;return {root,dispose(){if(disposed)return;disposed=true;timber.dispose();print.dispose();grain.dispose();}};
};
