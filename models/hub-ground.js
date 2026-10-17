// 中央枢纽地面. 平地/低庭院/坡道共用场景规格, 顶面与立面分批, 路面图案不叠贴片.
FPS.models.hubGround = (T, o = {}) => {
  const root = new T.Group(), bounds = o.bounds ?? [-10,-10,10,10], [x0,z0,x1,z1] = bounds;
  const plots = o.plots ?? [{ rect:bounds, top:2.4 }], paths = o.paths ?? [], soil = o.soil ?? [], parts = [[],[]];
  const w=x1-x0,d=z1-z0,canvas=document.createElement('canvas');
  canvas.width=Math.min(2048,Math.max(128,Math.ceil(w/.11/128)*128));canvas.height=Math.min(1536,Math.max(128,Math.ceil(d/.115/128)*128));
  const ctx=canvas.getContext('2d'),turf=o.turf??{},grassColors=turf.colors??{fresh:[99,124,65],dry:[135,139,83],shade:[70,100,53]};let seed=turf.seed??1483;
  const pavingCanvas=document.createElement('canvas');pavingCanvas.width=pavingCanvas.height=512;const rc=pavingCanvas.getContext('2d');
  const woodland=turf.woodland??(o.treeBases??[]).map((center,i)=>({center,radius:[2.6,2.6],seed:461+i*31}));
  const rgb=(color,scale=1,alpha=1)=>`rgba(${color.map(v=>Math.round(v*scale)).join(',')},${alpha})`;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  // 大底色用画布填充, 近景颗粒仅生成小纹理, 避免百万次 JavaScript 像素分配.
  ctx.fillStyle=rgb(grassColors.fresh,.9);ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/w,0,0,canvas.height/d,-x0*canvas.width/w,-z0*canvas.height/d);
  rc.fillStyle='#a9a79d';rc.fillRect(0,0,512,512);rc.setTransform(512/w,0,0,512/d,-x0*512/w,-z0*512/d);
  // 过渡大色块使用世界坐标, 接边不出现重复贴片; 近景细粒靠独立米制纹理补足.
  for(const zone of o.zones??[]) {
    const [a,b,c,e]=zone.rect,g=rc.createLinearGradient(a,b,c,e);
    g.addColorStop(0,zone.colors[0]);g.addColorStop(1,zone.colors[1]);rc.fillStyle=g;rc.fillRect(a,b,c-a,e-b);
  }
  for(const rect of soil){const [a,b,c,e]=rect;ctx.save();ctx.beginPath();ctx.rect(a,b,c-a,e-b);ctx.clip();
    ctx.fillStyle=rgb(grassColors.fresh,.9);ctx.fillRect(a,b,c-a,e-b);
    // 草坪远景保留连续疏密色斑, 不用裸土色底和成排方形颗粒代替草地.
    for(let i=0;i<(c-a)*(e-b)/20;i++) {
      const x=a+random()*(c-a),z=b+random()*(e-b),r=1.2+random()*2.6,color=i%3?grassColors.dry:grassColors.shade;
      const g=ctx.createRadialGradient(x,z,.08,x,z,r);g.addColorStop(0,rgb(color,.94,.3));g.addColorStop(1,rgb(color,.94,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,z,r,0,Math.PI*2);ctx.fill();
    }
    // 磨损裸土的椭圆范围与草丛减量共用, 地表与植被不会各画各的.
    for(const p of turf.soilPatches??[]) {
      ctx.save();ctx.setTransform(canvas.width/w*p.radius[0],0,0,canvas.height/d*p.radius[1],(p.center[0]-x0)*canvas.width/w,(p.center[1]-z0)*canvas.height/d);
      const g=ctx.createRadialGradient(0,0,.12,0,0,1);g.addColorStop(0,`rgba(139,131,97,${p.strength})`);g.addColorStop(.5,`rgba(139,131,97,${p.strength*.55})`);g.addColorStop(1,'rgba(139,131,97,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    // 林下底色沿同一树冠范围渐变, 根颈用多瓣腐殖土接地, 保留不规则草土过渡.
    for(const {center:[x,z],radius:[rx,rz],seed:s}of woodland) {
      if(x+rx<a||x-rx>c||z+rz<b||z-rz>e)continue;
      let floorSeed=s??461;const floorRandom=()=>((floorSeed=(Math.imul(floorSeed,1664525)+1013904223)>>>0)/4294967296);
      ctx.save();ctx.setTransform(canvas.width/w*rx,0,0,canvas.height/d*rz,(x-x0)*canvas.width/w,(z-z0)*canvas.height/d);
      const moss=ctx.createRadialGradient(0,0,.12,0,0,1);moss.addColorStop(0,rgb(grassColors.shade,.94,.42));moss.addColorStop(.55,rgb(grassColors.shade,.94,.25));moss.addColorStop(1,rgb(grassColors.shade,.94,0));
      ctx.fillStyle=moss;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
      for(let i=0;i<4;i++) {
        const angle=i*2.399+floorRandom(),cx=x+Math.sin(angle)*.23,cz=z+Math.cos(angle)*.23,r=.65+floorRandom()*.28;
        const dirt=ctx.createRadialGradient(cx,cz,.1,cx,cz,r);dirt.addColorStop(0,'rgba(104,96,67,.62)');dirt.addColorStop(.45,'rgba(116,110,75,.3)');dirt.addColorStop(1,'rgba(116,110,75,0)');
        ctx.fillStyle=dirt;ctx.beginPath();ctx.arc(cx,cz,r,0,Math.PI*2);ctx.fill();
      }
      // 大色图只画落叶层的柔和色斑, 亚纹素叶片留给小纹理, 不烘焙成方块颗粒.
      for(let i=0;i<9;i++) {
        const angle=floorRandom()*Math.PI*2,r=Math.sqrt(floorRandom())*.65,cx=x+Math.cos(angle)*rx*r,cz=z+Math.sin(angle)*rz*r,size=.3+floorRandom()*.3;
        const litter=ctx.createRadialGradient(cx,cz,0,cx,cz,size);litter.addColorStop(0,'rgba(136,125,73,.13)');litter.addColorStop(1,'rgba(136,125,73,0)');
        ctx.fillStyle=litter;ctx.beginPath();ctx.arc(cx,cz,size,0,Math.PI*2);ctx.fill();
      }
    }
    // 草坪边缘只留窄土色收口, 不把大片浅砂带暴露在种植岛周围.
    for(const [p,q,area]of [[[a,b],[a+.06,b],[a,b,.06,e-b]],[[c,b],[c-.06,b],[c-.06,b,.06,e-b]],[[a,b],[a,b+.06],[a,b,c-a,.06]],[[a,e],[a,e-.06],[a,e-.06,c-a,.06]]]){
      const g=ctx.createLinearGradient(...p,...q);g.addColorStop(0,'rgba(139,131,97,.65)');g.addColorStop(1,'rgba(139,131,97,0)');ctx.fillStyle=g;ctx.fillRect(...area);
    }ctx.restore();}
  function stroke(context,path,width,color) {
    context.strokeStyle=color;context.lineWidth=width;context.beginPath();
    path.points.forEach(([x,z],i)=>i?context.lineTo(x,z):context.moveTo(x,z));context.stroke();
  }
  const roads=paths.filter(p=>p.kind==='asphalt'),walks=paths.filter(p=>p.kind!=='asphalt');
  rc.lineJoin='round';rc.lineCap='round';
  // 铺地与草色分开取样, 边界不再混在覆盖全图的低频底色中.
  for(const [a,b,c,e]of soil) {
    const crossing=walks.filter(path=>path.points.slice(1).some((q,i)=>{const p=path.points[i],r=path.width/2;return Math.max(p[0],q[0])+r>a&&Math.min(p[0],q[0])-r<c&&Math.max(p[1],q[1])+r>b&&Math.min(p[1],q[1])-r<e;}));
    if(!crossing.length)continue;
    rc.save();rc.beginPath();rc.rect(a,b,c-a,e-b);rc.clip();
    for(const path of crossing)stroke(rc,path,path.width,'#aaa99e');
    rc.restore();
  }
  // 车行路按层绘制整个路网, 同色实心交汇不会被支路的浅色边缘盖住.
  for(const [extra,color]of [[.36,'#a0a79e'],[.24,'#9aa39a'],[.12,'#8e9993'],[0,'#7f8883']])
    for(const path of roads)stroke(rc,path,path.width+extra,color);
  for(const [a,b,c,e]of o.pads??[]){rc.fillStyle='#aaa99e';rc.fillRect(a,b,c-a,e-b);}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  const paving=new T.CanvasTexture(pavingCanvas);paving.anisotropy=8;
  const {min,max,hypot,round}=Math;
  const segments=paths.flatMap(path=>path.points.slice(1).map((b,i)=>{
    const a=path.points[i],x=b[0]-a[0],z=b[1]-a[1],radius=path.width/2;
    return {a,x,z,length:x*x+z*z,radius,bounds:[min(a[0],b[0])-radius-2,min(a[1],b[1])-radius-2,max(a[0],b[0])+radius+2,max(a[1],b[1])+radius+2]};
  }));
  function rectDistance(x,z,[a,b,c,e]) {
    if(x<a-2||x>c+2||z<b-2||z>e+2)return 2;
    const dx=max(a-x,0,x-c),dz=max(b-z,0,z-e);
    return dx||dz?min(2,hypot(dx,dz)):-min(2,x-a,c-x,z-b,e-z);
  }
  function soilDistance(x,z) {
    let distance=2;for(const rect of soil)distance=min(distance,rectDistance(x,z,rect));
    if(distance>=2)return distance;
    for(const s of segments) {
      if(x<s.bounds[0]||z<s.bounds[1]||x>s.bounds[2]||z>s.bounds[3])continue;
      const px=x-s.a[0],pz=z-s.a[1],t=s.length?max(0,min(1,(px*s.x+pz*s.z)/s.length)):0;
      distance=max(distance,s.radius-hypot(px-s.x*t,pz-s.z*t));
    }
    for(const rect of o.pads??[])distance=max(distance,-rectDistance(x,z,rect));
    return distance;
  }
  // RG 编码有符号米制距离, 线性插值仍保持距离; 基础层显式取样避免 mipmap 移动边界.
  const boundaryPixels=new Uint8Array(512*512*4);
  for(let j=0;j<512;j++)for(let i=0;i<512;i++) {
    const distance=soilDistance(x0+(i+.5)*w/512,z0+(j+.5)*d/512),value=max(0,min(65535,round(distance*2048+32768))),k=((511-j)*512+i)*4;
    boundaryPixels[k]=value>>8;boundaryPixels[k+1]=value&255;boundaryPixels[k+3]=255;
  }
  const boundary=new T.DataTexture(boundaryPixels,512,512);boundary.name='hub-boundary-distance';
  boundary.minFilter=boundary.magFilter=T.LinearFilter;boundary.generateMipmaps=false;boundary.needsUpdate=true;
  // 1.2 x 1.8 米小纹理. RG 存铺石高度/色差, BA 存草坪高度/色差, 共用同一绘制批次.
  const detailPixels=new Uint8Array(256*256*4),tones=Array.from({length:8},()=>205+random()*37);
  for(let j=0;j<256;j++)for(let i=0;i<256;i++) {
    const row=Math.floor(j/64),sx=(i+(row%2)*64)%256,column=Math.floor(sx/128),grain=(random()-.5)*13;
    const edge=Math.min(sx%128,127-sx%128,j%64,63-j%64),joint=Math.min(1,Math.max(0,(edge-.5)/1.5));
    detailPixels.set([110+joint*89+grain,161+joint*(tones[row*2+column]-161)+grain,169+grain,204+grain],(j*256+i)*4);
  }
  // 弯曲细叶直接烘焙进循环小纹理, 远处三维草收小后仍有草坪微观质感.
  for(let blade=0;blade<340;blade++) {
    const x=random()*256,z=random()*256,angle=random()*Math.PI*2,length=7+random()*18,lean=(random()-.5)*6,tone=blade%3?232:176;
    for(let j=0;j<Math.ceil(length);j++) {
      const t=j/length,px=x+Math.sin(angle)*j+Math.cos(angle)*lean*t*t,pz=z+Math.cos(angle)*j-Math.sin(angle)*lean*t*t;
      for(let side=-1;side<=1;side++){const ix=(Math.round(px+Math.cos(angle)*side)+256)%256,iz=(Math.round(pz-Math.sin(angle)*side)+256)%256,k=(iz*256+ix)*4;
        detailPixels[k+2]=Math.max(detailPixels[k+2],184+11*(1-Math.abs(side)));detailPixels[k+3]=tone;}
    }
  }
  const detail=new T.DataTexture(detailPixels,256,256);detail.wrapS=detail.wrapT=T.RepeatWrapping;
  detail.generateMipmaps=true;detail.minFilter=T.LinearMipmapLinearFilter;detail.magFilter=T.LinearFilter;detail.anisotropy=8;detail.needsUpdate=true;
  const materials=[new T.MeshStandardMaterial({map,bumpMap:detail,bumpScale:.006,roughness:.98}),
    new T.MeshStandardMaterial({color:0x969b8d,bumpMap:detail,bumpScale:.006,roughness:.98})];
  materials.forEach(m=>m.shadowSide=T.FrontSide);
  materials[0].onBeforeCompile=shader=>{
    shader.uniforms.hubBoundaryMap={value:boundary};shader.uniforms.hubPavingMap={value:paving};
    shader.vertexShader='varying vec2 vHubDetail; varying vec2 vHubSurfaceUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHubDetail=position.xz/vec2(1.2,1.8);vHubSurfaceUv=uv;');
    const bump=T.ShaderChunk.bumpmap_pars_fragment.replaceAll('vBumpMapUv','vHubDetail')
      .replace('vec2 dHdxy_fwd()',`float hubHeight(vec2 uv) {
        vec4 detail=texture2D(bumpMap,uv);
        return mix(detail.b,detail.r,hubStoneWeight);
      }
      vec2 dHdxy_fwd()`)
      .replace(/texture2D\( bumpMap, ([^)]+) \)\.x/g,'hubHeight($1)');
    shader.fragmentShader='varying vec2 vHubDetail; varying vec2 vHubSurfaceUv; uniform sampler2D hubBoundaryMap; uniform sampler2D hubPavingMap; float hubStoneWeight;\n'+shader.fragmentShader
      .replace('#include <bumpmap_pars_fragment>',bump)
      .replace('#include <map_fragment>',`#include <map_fragment>
        vec2 hubBoundary=textureLod(hubBoundaryMap,vHubSurfaceUv,0.).rg;
        float hubDistance=(dot(hubBoundary,vec2(65280.,255.))-32768.)/2048.;
        float hubWidth=max(fwidth(hubDistance),1./2048.);
        hubStoneWeight=smoothstep(-.5*hubWidth,.5*hubWidth,hubDistance);
        vec3 hubPaving=sRGBTransferEOTF(texture2D(hubPavingMap,vHubSurfaceUv)).rgb;
        diffuseColor.rgb=mix(diffuseColor.rgb,hubPaving,hubStoneWeight);
        vec4 hubDetail=texture2D(bumpMap,vHubDetail);
        diffuseColor.rgb*=mix(.60+.5*hubDetail.a,.72+.31*hubDetail.g,hubStoneWeight);`);
  };materials[0].customProgramCacheKey=()=> 'hub-ground-turf-5';
  function geometry(values,batch) {
    const g=new T.BufferGeometry(),p=[],uv=[];
    for(const [x,y,z]of values){p.push(x,y,z);uv.push(batch?(x+z)/1.6:(x-x0)/w,batch?y/1.6:1-(z-z0)/d);}
    g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();parts[batch].push(g);
  }
  function patch(rect,heights,bottom=-.6,neighbors) {
    const [a,b,c,e]=rect,[h0,h1,h2,h3]=heights,A=[a,h0,b],B=[c,h1,b],C=[a,h2,e],D=[c,h3,e];
    geometry([A,C,B,B,C,D],0);
    for(const [p,q]of [[A,B],[B,D],[D,C],[C,A]]) {
      if(!neighbors){geometry([p,q,[p[0],bottom,p[2]],q,[q[0],bottom,q[2]],[p[0],bottom,p[2]]],1);continue;}
      const axis=p[0]===q[0]?2:0,delta=q[axis]-p[axis],length=Math.abs(delta),nx=(q[2]-p[2])/length,nz=-(q[0]-p[0])/length;
      const adjacent=neighbors.filter(f=>axis===0?p[2]+nz*.00001>f.rect[1]&&p[2]+nz*.00001<f.rect[3]:p[0]+nx*.00001>f.rect[0]&&p[0]+nx*.00001<f.rect[2]);
      const cuts=[...new Set([0,1,...adjacent.flatMap(f=>[f.rect[axis===0?0:1],f.rect[axis===0?2:3]].map(v=>(v-p[axis])/delta)).filter(v=>v>0&&v<1)])].sort((a,b)=>a-b);
      for(let i=1;i<cuts.length;i++) {
        const a=p.map((v,k)=>v+(q[k]-v)*cuts[i-1]),b=p.map((v,k)=>v+(q[k]-v)*cuts[i]),x=(a[0]+b[0])/2+nx*.00001,z=(a[2]+b[2])/2+nz*.00001;
        const lower=Math.max(bottom,...adjacent.filter(f=>x>f.rect[0]&&x<f.rect[2]&&z>f.rect[1]&&z<f.rect[3]).map(f=>f.top));
        if(lower>=a[1]-.00001)continue;
        geometry([a,b,[a[0],lower,a[2]],b,[b[0],lower,b[2]],[a[0],lower,a[2]]],1);
      }
    }
  }
  // 格栅直接嵌入挖空的铺地, 不在大地面上叠近共面的薄板.
  function subtract(rect,cut) {
    const [a,b,c,d]=rect,[x,z,u,v]=cut,l=Math.max(a,x),r=Math.min(c,u),n=Math.max(b,z),s=Math.min(d,v);
    if(l>=r||n>=s)return [rect];
    return [[a,b,l,d],[r,b,c,d],[l,b,r,n],[l,s,r,d]].filter(([a,b,c,d])=>c-a>1e-5&&d-b>1e-5);
  }
  const floorFaces=plots.flatMap(p=>{
    const cuts=[...(o.landforms??[]).filter(l=>Math.min(...l.heights)>=p.top).map(l=>l.rect),...(o.insets??[]),...plots.filter(q=>q.top>p.top).map(q=>q.rect),...(o.ramps??[]).filter(r=>Math.min(...r.heights)>=p.top).map(r=>r.rect)];
    let faces=[p.rect];for(const cut of cuts)faces=faces.flatMap(rect=>subtract(rect,cut));return faces.map(rect=>({...p,rect}));
  });
  for(const p of floorFaces)patch(p.rect,[p.top,p.top,p.top,p.top],p.bottom,floorFaces);
  for(const land of o.landforms??[]) {
    const {rect:[a,b,c,d],columns,rows,heights}=land,vertices=[],normals=[];
    const at=(i,j)=>[a+i*(c-a)/(columns-1),heights[j*columns+i],b+j*(d-b)/(rows-1)];
    const normal=(i,j)=>{const left=Math.max(0,i-1),right=Math.min(columns-1,i+1),near=Math.max(0,j-1),far=Math.min(rows-1,j+1);
      return new T.Vector3(-(heights[j*columns+right]-heights[j*columns+left])/((right-left)*(c-a)/(columns-1)),1,
        -(heights[far*columns+i]-heights[near*columns+i])/((far-near)*(d-b)/(rows-1))).normalize().toArray();};
    for(let j=0;j<rows-1;j++)for(let i=0;i<columns-1;i++)for(const [x,z]of [[i,j],[i,j+1],[i+1,j],[i+1,j],[i,j+1],[i+1,j+1]]){vertices.push(at(x,z));normals.push(...normal(x,z));}
    geometry(vertices,0);parts[0].at(-1).setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  }
  for(const ramp of o.ramps??[])patch(ramp.rect,ramp.heights,ramp.bottom??1.65);
  for(const step of o.steps??[]) {
    const [x,y,z]=step.offset,[sw,sh,sd]=step.size,top=y+sh/2,bevel=Math.min(.008,sw*.1,sd*.1,sh*.1);
    const outer=[[x-sw/2,top-bevel,z-sd/2],[x+sw/2,top-bevel,z-sd/2],[x+sw/2,top-bevel,z+sd/2],[x-sw/2,top-bevel,z+sd/2]],
      inner=outer.map(([a,,b])=>[a+(a<x?bevel:-bevel),top,b+(b<z?bevel:-bevel)]);
    geometry([inner[0],inner[3],inner[1],inner[1],inner[3],inner[2]],0);
    for(let i=0;i<4;i++){const j=(i+1)%4,p=outer[i],q=outer[j];geometry([p,inner[i],q,q,inner[i],inner[j]],0);
      geometry([p,q,[p[0],y-sh/2,p[2]],q,[q[0],y-sh/2,q[2]],[p[0],y-sh/2,p[2]]],1);}
  }
  parts.forEach((list,i)=>{if(!list.length)return;const mesh=new T.Mesh(T.mergeGeometries(list),materials[i]);mesh.name=i?'hub-ground-retaining':'hub-ground-surface';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);list.forEach(g=>g.dispose());});
  const local=new T.Vector3();let disposed=false;
  return {root,onHit(hit){
    if(hit.object.name!=='hub-ground-surface')return;
    local.copy(hit.point);root.worldToLocal(local);
    if(soilDistance(local.x,local.z)<0)return {bulletmark:false,surface:'soil'};
  },dispose(){if(disposed)return;disposed=true;map.dispose();paving.dispose();detail.dispose();boundary.dispose();}};
};
