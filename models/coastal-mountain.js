// 海岸自然山体. 地貌, 土径与身体共用高度场, 大色块/近景颗粒分尺度取样.
FPS.models.coastalMountain = (T, o = {}) => {
  const root=new T.Group(),[x0,z0,x1,z1]=o.bounds??[-50,-38,50,38],columns=o.columns??41,rows=o.rows??33;
  const heights=o.heights??Array.from({length:columns*rows},(_,k)=>2.4+24*Math.max(0,1-((x0+k%columns*(x1-x0)/(columns-1)-9)/39)**2-((z0+Math.floor(k/columns)*(z1-z0)/(rows-1)-14)/24)**2)**1.2);
  const dx=(x1-x0)/(columns-1),dz=(z1-z0)/(rows-1),parts=[[],[]],triangles=[],normalSums=Array.from({length:heights.length},()=>new T.Vector3());
  const grassColors=o.grassColors??{fresh:[98,125,65],dry:[135,140,83],shade:[70,102,53]};
  const point=k=>new T.Vector3(x0+k%columns*dx,heights[k],z0+Math.floor(k/columns)*dz),clamp=n=>Math.max(0,Math.min(1,n));
  const hash=(x,z)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263)^831;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
  function noise(x,z){const i=Math.floor(x),j=Math.floor(z),a=x-i,b=z-j,u=a*a*(3-2*a),v=b*b*(3-2*b);return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;}
  // 椭圆生态斑块共用场景规格, 表面土色和草丛密度按相同权重渐变.
  function soilWeight(x,z) {
    let weight=0;
    for(const {center:[cx,cz],radius:[rx,rz],strength} of o.soilPatches??[]) {
      const d=Math.hypot((x-cx)/rx,(z-cz)/rz),w=clamp((1-d)*1.7);
      weight=Math.max(weight,w*w*(3-2*w)*strength);
    }
    return weight;
  }
  const segments=(o.paths??[]).flatMap(p=>p.points.slice(1).map((b,i)=>({a:p.points[i],b,width:p.width})));
  function trailWeight(x,z){let weight=0;const edge=(noise(x/2.4,z/2.4)-.5)*.42;for(const {a,b,width}of segments){const ax=b[0]-a[0],az=b[2]-a[2],t=clamp(((x-a[0])*ax+(z-a[2])*az)/(ax*ax+az*az));const d=Math.hypot(x-a[0]-ax*t,z-a[2]-az*t);weight=Math.max(weight,clamp((width*.5+.6+edge-d)/1.05));}return weight;}
  for(let j=0;j<rows-1;j++)for(let i=0;i<columns-1;i++) {
    const k=j*columns+i;
    for(const indices of [[k,k+columns,k+1],[k+1,k+columns,k+columns+1]]) {
      const p=indices.map(point),n=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize();indices.forEach(k=>normalSums[k].add(n));triangles.push(indices);
    }
  }
  normalSums.forEach(n=>n.normalize());
  function palette(x,y,z,ny){
    const damp=clamp(.65-noise(x/15,z/15)+.32*Math.exp(-(((x+9-z*.22)/5)**2))),dry=clamp(noise(x/10+7,z/10)*.75+(y-13)/40);
    const rock=clamp((.78-ny)/.23),path=trailWeight(x,z),grain=(noise(x/2,z/2)-.5)*10;
    const grass=grassColors.fresh.map((v,i)=>(v*(1-dry)+grassColors.dry[i]*dry)*(1-damp*.6)+grassColors.shade[i]*damp*.6),stone=[145,143,127],soil=[142-damp*29,117-damp*22,83-damp*15];
    // 草土混合和踩踏只改变色图, 物理路宽与坡度不受视觉边缘影响.
    const earth=Math.max(soilWeight(x,z),clamp((noise(x/4+12,z/4)-.52)*1.9+dry*.24))*(1-path),wear=path*path;
    const rgb=grass.map((v,i)=>((v*(1-earth)+soil[i]*earth)*(1-rock)+stone[i]*rock)*(1-path)+(soil[i]+wear*9)*path+grain);
    for(const patch of o.woodland??[]){const r=Math.hypot(x-patch[0],z-patch[1])/patch[2],dark=clamp(1-r)*.13;for(let i=0;i<3;i++)rgb[i]*=1-dark;}
    return {rgb,damp,path,rock,y};
  }
  const samples=heights.map((y,k)=>palette(x0+k%columns*dx,y,z0+Math.floor(k/columns)*dz,normalSums[k].y));
  // 裸岩和草土按最终覆盖色块分批, 草坡不会因三角面倾斜而留下硬面弹痕.
  for(const indices of triangles){const rock=indices.reduce((sum,k)=>sum+samples[k].rock*(1-samples[k].path),0)/3;parts[rock>.5?1:0].push(indices);}
  function sample(x,z) {
    const u=clamp((x-x0)/(x1-x0))*(columns-1),v=clamp((z-z0)/(z1-z0))*(rows-1);
    const i=Math.min(columns-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),a=u-i,b=v-j,k=j*columns+i;
    const blend=values=>values[0]*(1-a)*(1-b)+values[1]*a*(1-b)+values[2]*(1-a)*b+values[3]*a*b;
    const corners=[samples[k],samples[k+1],samples[k+columns],samples[k+columns+1]];
    return {rgb:[0,1,2].map(c=>blend(corners.map(p=>p.rgb[c]))),damp:blend(corners.map(p=>p.damp)),path:blend(corners.map(p=>p.path)),rock:blend(corners.map(p=>p.rock)),y:blend(corners.map(p=>p.y))};
  }
  function texture(size,draw,color=false,repeat=true) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)pixels.data.set([...draw(x,y,size),255],(y*size+x)*4);
    ctx.putImageData(pixels,0,0);const map=new T.CanvasTexture(canvas);
    if(color)map.colorSpace=T.SRGBColorSpace;
    if(repeat)map.wrapS=map.wrapT=T.RepeatWrapping;
    map.anisotropy=8;return map;
  }
  // 覆盖整座山的大图保留边缘像素, 只有近景细节重复, 避免两侧颜色跨边界串色.
  const macro=texture(1024,(x,y,n)=>{
    const wx=x0+x/(n-1)*(x1-x0),wz=z1-y/(n-1)*(z1-z0),p=sample(wx,wz);
    const grain=(hash(x,y)-.5)*7,pebble=hash(Math.floor(wx*9),Math.floor(wz*9))>.92?-19:0;
    const strata=Math.sin((p.y-wx*.12-wz*.07)*7.2)*4*p.rock;
    const mottled=(noise(wx*2.5,wz*2.5)-.5)*13*p.path;
    return p.rgb.map(v=>v+grain+pebble*p.path+mottled+strata);
  },true,false);
  const rough=texture(256,(x,y,n)=>{const v=251-sample(x0+x/(n-1)*(x1-x0),z1-y/(n-1)*(z1-z0)).damp*43;return [v,v,v];},false,false);
  const soilDetail=texture(256,(x,y)=>{const fiber=Math.sin(x*.53+noise(x/19,y/27)*6+y*.16),v=158+(noise(x/5,y/5)-.5)*38+(hash(x,y)-.5)*23+fiber*12;return [v,v,v];});soilDetail.repeat.set((x1-x0)/1.8,(z1-z0)/1.8);
  const rockBump=texture(512,(x,y)=>{const layer=y*.026+noise(x/74,y/74)*2.1,crack=Math.abs(layer-Math.round(layer)),v=crack<.035?56:156+noise(x/14,y/14)*54;return [v,v,v];});rockBump.channel=1;
  // 土面/陡岩共用同一宏观色图和粗糙度, 独立 UV 只负责岩纹凹凸, 避免分材质边界跳色.
  const maps=[macro,rough,soilDetail,rockBump],materials=[
    new T.MeshStandardMaterial({map:macro,bumpMap:soilDetail,bumpScale:.016,roughnessMap:rough,roughness:1}),
    new T.MeshStandardMaterial({map:macro,bumpMap:rockBump,bumpScale:.045,roughnessMap:rough,roughness:1})
  ];
  parts.forEach((batch,kind)=>{
    const positions=[],normals=[],uv=[],uv1=[];
    function vertex(p,n,projection=n){positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);
      const side=Math.abs(projection.x)>Math.abs(projection.z);
      uv.push((p.x-x0)/(x1-x0),(p.z-z0)/(z1-z0));uv1.push((side?p.z:p.x)/2.2,(projection.y>.6?p.z:p.y)/2.2);
    }
    for(const indices of batch){const p=indices.map(point),face=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize();indices.forEach((k,i)=>vertex(p[i],normalSums[k],face));}
    if(kind)for(const edge of [Array.from({length:columns},(_,i)=>i),Array.from({length:columns},(_,i)=>(rows-1)*columns+i).reverse(),Array.from({length:rows},(_,i)=>i*columns).reverse(),Array.from({length:rows},(_,i)=>i*columns+columns-1)])for(let i=0;i<edge.length-1;i++){
      const a=point(edge[i]),b=point(edge[i+1]),c=b.clone(),d=a.clone();c.y=d.y=-.6;const n=b.clone().sub(a).cross(d.clone().sub(a)).normalize();for(const p of [a,b,d,b,c,d])vertex(p,n);
    }
    if(kind)for(const wall of o.walls??[]){const source=new T.BoxGeometry(...wall.size),g=source.toNonIndexed();source.dispose();g.translate(...wall.offset);const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++)vertex(new T.Vector3().fromBufferAttribute(p,i),new T.Vector3().fromBufferAttribute(n,i));g.dispose();}
    if(!positions.length)return;
    const g=new T.BufferGeometry();for(const [name,values,size]of [['position',positions,3],['normal',normals,3],['uv',uv,2],['uv1',uv1,2]])g.setAttribute(name,new T.Float32BufferAttribute(values,size));
    const mesh=new T.Mesh(g,materials[kind]);mesh.name=kind?'mountain-rock-face':'mountain-soil-face';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  });
  return {root,onHit(hit){if(hit.object.name!=='mountain-rock-face')return {bulletmark:false,surface:'soil'};},dispose(){maps.forEach(map=>map.dispose());}};
};
