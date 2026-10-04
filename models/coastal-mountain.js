// 海岸自然山体. 纹理和地表采样可在线程生成, 网格/材质与身体仍共用同一高度场.
FPS.models.coastalMountain = (() => {
  function buildTextures(o) {
    const [x0,z0,x1,z1]=o.bounds??[-50,-38,50,38],columns=o.columns??41,rows=o.rows??33;
    const heights=o.heights??Array.from({length:columns*rows},(_,k)=>2.4+24*Math.max(0,1-((x0+k%columns*(x1-x0)/(columns-1)-9)/39)**2-((z0+Math.floor(k/columns)*(z1-z0)/(rows-1)-14)/24)**2)**1.2);
    const dx=(x1-x0)/(columns-1),dz=(z1-z0)/(rows-1),normalValues=new Float64Array(heights.length*3);
    const grassColors=o.grassColors??{fresh:[98,125,65],dry:[135,140,83],shade:[70,102,53]};
    const clamp=n=>Math.max(0,Math.min(1,n));
    const hash=(x,z)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263)^831;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
    function noise(x,z,period=0){const i=Math.floor(x),j=Math.floor(z),a=x-i,b=z-j,u=a*a*(3-2*a),v=b*b*(3-2*b);
      const ix=period?(i%period+period)%period:i,iz=period?(j%period+period)%period:j,nx=period?(ix+1)%period:i+1,nz=period?(iz+1)%period:j+1;
      return (hash(ix,iz)*(1-u)+hash(nx,iz)*u)*(1-v)+(hash(ix,nz)*(1-u)+hash(nx,nz)*u)*v;
    }
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
    function addNormal(a,b,c) {
      const ax=x0+a%columns*dx,az=z0+Math.floor(a/columns)*dz;
      const ux=x0+b%columns*dx-ax,uy=heights[b]-heights[a],uz=z0+Math.floor(b/columns)*dz-az;
      const vx=x0+c%columns*dx-ax,vy=heights[c]-heights[a],vz=z0+Math.floor(c/columns)*dz-az;
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,factor=1/(Math.sqrt(nx*nx+ny*ny+nz*nz)||1);
      for(const k of [a,b,c]){normalValues[k*3]+=nx*factor;normalValues[k*3+1]+=ny*factor;normalValues[k*3+2]+=nz*factor;}
    }
    for(let j=0;j<rows-1;j++)for(let i=0;i<columns-1;i++) {
      const k=j*columns+i;addNormal(k,k+columns,k+1);addNormal(k+1,k+columns,k+columns+1);
    }
    for(let k=0;k<normalValues.length;k+=3) {
      const x=normalValues[k],y=normalValues[k+1],z=normalValues[k+2],factor=1/(Math.sqrt(x*x+y*y+z*z)||1);
      normalValues[k]*=factor;normalValues[k+1]*=factor;normalValues[k+2]*=factor;
    }
    function palette(x,y,z,ny,curvature){
      const damp=clamp(.65-noise(x/15,z/15)+.32*Math.exp(-(((x+9-z*.22)/5)**2))),dry=clamp(noise(x/10+7,z/10)*.75+(y-13)/40);
      const rock=clamp((.78-ny)/.23),path=trailWeight(x,z),grain=(noise(x/2,z/2)-.5)*10;
      const weather=(noise(x/7+y*.08,z/8)-.5)*18;
      const grass=grassColors.fresh.map((v,i)=>(v*(1-dry)+grassColors.dry[i]*dry)*(1-damp*.6)+grassColors.shade[i]*damp*.6),stone=[145+weather,143+weather*.84,127+weather*.65],soil=[142-damp*29,117-damp*22,83-damp*15];
      // 草土混合和踩踏只改变色图, 物理路宽与坡度不受视觉边缘影响.
      const earth=Math.max(soilWeight(x,z),clamp((noise(x/4+12,z/4)-.52)*1.9+dry*.24))*(1-path),wear=path*path;
      const rgb=grass.map((v,i)=>((v*(1-earth)+soil[i]*earth)*(1-rock)+stone[i]*rock)*(1-path)+(soil[i]+wear*9)*path+grain);
      // 凹坡脚积土接到裸岩, 随真实地形曲率淡入; 不额外叠贴片或在陡壁上挂碎石.
      const contact=clamp((curvature-.04)*1.1)*rock*(1-path)*.42,deposit=[119-damp*12,111-damp*9,86-damp*7];
      for(let i=0;i<3;i++)rgb[i]=rgb[i]*(1-contact)+deposit[i]*contact;
      // 根域腐殖土与苔色写入山体本身, 噪声打散轮廓, 不另叠圆形地面贴片.
      for(const [cx,cz,radius,kind] of o.woodland??[]) {
        const edge=.82+noise(x*1.25+cx,z*1.25+cz)*.36,r=Math.hypot((x-cx)/radius,(z-cz)/(radius*.86))/edge;
        const t=clamp(1-r),cover=t*t*(3-2*t)*(1-path),soil=kind==='pine'?[98,88,60]:[87,98,62];
        for(let i=0;i<3;i++)rgb[i]=(rgb[i]*(1-cover*.58)+soil[i]*cover*.58)*(1-cover*.09);
      }
      return {rgb,damp,path,rock};
    }
    const samples=heights.map((y,k)=>{
      const i=k%columns,j=Math.floor(k/columns),curvature=((heights[i?k-1:k]+heights[i<columns-1?k+1:k])/dx**2+(heights[j?k-columns:k]+heights[j<rows-1?k+columns:k])/dz**2-y*(2/dx**2+2/dz**2))/4;
      return palette(x0+i*dx,y,z0+j*dz,normalValues[k*3+1],curvature);
    });
    const interpolated={rgb:[0,0,0],damp:0,path:0},rgb=[0,0,0];
    function blend(v0,v1,v2,v3,a,b){return v0*(1-a)*(1-b)+v1*a*(1-b)+v2*(1-a)*b+v3*a*b;}
    function sample(x,z) {
      const u=clamp((x-x0)/(x1-x0))*(columns-1),v=clamp((z-z0)/(z1-z0))*(rows-1);
      const i=Math.min(columns-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),a=u-i,b=v-j,k=j*columns+i;
      const p=samples[k],q=samples[k+1],r=samples[k+columns],s=samples[k+columns+1];
      for(let c=0;c<3;c++)interpolated.rgb[c]=blend(p.rgb[c],q.rgb[c],r.rgb[c],s.rgb[c],a,b);
      interpolated.damp=blend(p.damp,q.damp,r.damp,s.damp,a,b);
      interpolated.path=blend(p.path,q.path,r.path,s.path,a,b);return interpolated;
    }
    // 复用采样容器, 避免百万像素逐次分配数组/对象, 同步回退也使用同一算法.
    function texture(size,draw) {
      const pixels=new Uint8ClampedArray(size*size*4);
      for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
        const color=draw(x,y,size),i=(y*size+x)*4;
        pixels[i]=color[0];pixels[i+1]=color[1];pixels[i+2]=color[2];pixels[i+3]=255;
      }
      return {size,pixels};
    }
    // 覆盖整座山的大图保留边缘像素, 只有近景细节重复, 避免两侧颜色跨边界串色.
    const macro=texture(1024,(x,y,n)=>{
      const wx=x0+x/(n-1)*(x1-x0),wz=z1-y/(n-1)*(z1-z0),p=sample(wx,wz);
      const grain=(hash(x,y)-.5)*7,pebble=hash(Math.floor(wx*9),Math.floor(wz*9))>.92?-19:0;
      const mottled=(noise(wx*2.5,wz*2.5)-.5)*13*p.path;
      for(let c=0;c<3;c++)rgb[c]=p.rgb[c]+grain+pebble*p.path+mottled;return rgb;
    });
    const rough=texture(256,(x,y,n)=>{const v=251-sample(x0+x/(n-1)*(x1-x0),z1-y/(n-1)*(z1-z0)).damp*43;rgb[0]=rgb[1]=rgb[2]=v;return rgb;});
    const soilDetail=texture(256,(x,y,n)=>{
      const u=x/(n-1),v=y/(n-1),grain=noise(u*64,v*64,64)-.5;
      const h=158+(noise(u*32,v*32,32)-.5)*38+grain*23+(noise(u*8,v*8,8)-.5)*24;
      rgb[0]=rgb[1]=rgb[2]=h;return rgb;
    });
    // 周期噪声与扰动裂隙在四边严格接续. R 为细微凹凸, G 为风化明暗, 同一次采样复用.
    const rockBump=texture(512,(x,y,n)=>{
      const u=x/(n-1),v=y/(n-1),warp=noise(u*4,v*4,4),grain=noise(u*48,v*48,48);
      const bed=v*3+.21*Math.sin(u*Math.PI*2)+.12*Math.sin(u*Math.PI*4)+(warp-.5)*.32;
      const joint=u*5+.16*Math.sin(v*Math.PI*2)+(warp-.5)*.4;
      const cracks=Math.max(1-clamp(Math.abs(bed-Math.round(bed))/.07),1-clamp(Math.abs(joint-Math.round(joint))/.04));
      rgb[0]=146+(noise(u*12,v*12,12)-.5)*62+(grain-.5)*26-cracks*35;
      rgb[1]=128+(noise(u*6,v*6,6)-.5)*83+(grain-.5)*18-cracks*36;
      rgb[2]=rgb[0];return rgb;
    });
    return {heights,normalValues,samples,textures:[macro,rough,soilDetail,rockBump]};
  }
  const factory = (T, o = {}, assets) => {
    const root=new T.Group(),[x0,z0,x1,z1]=o.bounds??[-50,-38,50,38],columns=o.columns??41,rows=o.rows??33;
    const {heights,normalValues,samples,textures}=assets??buildTextures(o),parts=[[],[]];
    const dx=(x1-x0)/(columns-1),dz=(z1-z0)/(rows-1),point=k=>new T.Vector3(x0+k%columns*dx,heights[k],z0+Math.floor(k/columns)*dz);
    const normalSums=Array.from({length:heights.length},(_,k)=>new T.Vector3(normalValues[k*3],normalValues[k*3+1],normalValues[k*3+2]));
    // 裸岩和草土分批仍使用同一地表采样, 保留命中规则和原始三角面顺序.
    for(let j=0;j<rows-1;j++)for(let i=0;i<columns-1;i++) {
      const k=j*columns+i;
      for(const indices of [[k,k+columns,k+1],[k+1,k+columns,k+columns+1]]) {
        const rock=indices.reduce((sum,k)=>sum+samples[k].rock*(1-samples[k].path),0)/3;parts[rock>.5?1:0].push(indices);
      }
    }
    const maps=textures.map(({size,pixels},index)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
      const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);image.data.set(pixels);ctx.putImageData(image,0,0);
      const map=new T.CanvasTexture(canvas);if(index===0)map.colorSpace=T.SRGBColorSpace;
      if(index>1)map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;return map;
    });
    const [macro,rough,soilDetail,rockBump]=maps;soilDetail.repeat.set((x1-x0)/1.8,(z1-z0)/1.8);
    // 世界米制三向混合投影, 消除俯投拉伸和逐面换轴接缝. 两批次同算法保证草土/岩面的过渡.
    const materials=[
      new T.MeshStandardMaterial({map:macro,bumpMap:soilDetail,bumpScale:.016,roughnessMap:rough,roughness:1}),
      new T.MeshStandardMaterial({map:macro,bumpMap:rockBump,bumpScale:.035,roughnessMap:rough,roughness:1})
    ];
    for(const material of materials) {
      material.customProgramCacheKey=()=> 'coastal-mountain/world-rock-1';
      material.onBeforeCompile=shader=>{
        shader.uniforms.mountainSoilDetail={value:soilDetail};shader.uniforms.mountainRockDetail={value:rockBump};
        shader.vertexShader='attribute float rockMix; varying float vMountainRock; varying vec3 vMountainPosition; varying vec3 vMountainNormal;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
          vMountainRock=rockMix; vMountainPosition=(modelMatrix*vec4(transformed,1.)).xyz;
          vMountainNormal=inverseTransformDirection(transformedNormal,viewMatrix);`);
        shader.fragmentShader='uniform sampler2D mountainSoilDetail; uniform sampler2D mountainRockDetail; varying float vMountainRock; varying vec3 vMountainPosition; varying vec3 vMountainNormal;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          vec3 mountainWeights=abs(vMountainNormal); mountainWeights*=mountainWeights; mountainWeights*=mountainWeights;
          mountainWeights/=max(dot(mountainWeights,vec3(1.)),.0001);
          vec3 mountainUV=vMountainPosition/2.6;
          vec2 mountainDetail=texture2D(mountainRockDetail,mountainUV.zy).rg*mountainWeights.x
            +texture2D(mountainRockDetail,mountainUV.xz).rg*mountainWeights.y
            +texture2D(mountainRockDetail,mountainUV.xy).rg*mountainWeights.z;
          float mountainBlend=smoothstep(.25,.9,vMountainRock);
          diffuseColor.rgb*=1.+(mountainDetail.g-.5)*.28*mountainBlend;
          float mountainBump=mix(texture2D(mountainSoilDetail,vMountainPosition.xz/1.8).r*.016,mountainDetail.r*.035,mountainBlend);`);
        // 一次采样的高度用屏幕导数复用为凹凸, 四次细节读取代替逐投影的九次差分读取.
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replace('dHdxy_fwd()','vec2(dFdx(mountainBump),dFdy(mountainBump))'));
      };
    }
    parts.forEach((batch,kind)=>{
      const positions=[],normals=[],uv=[],rockMix=[];
      function vertex(p,n,blend=1){positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);rockMix.push(blend);
        uv.push((p.x-x0)/(x1-x0),(p.z-z0)/(z1-z0));
      }
      for(const indices of batch)for(const k of indices)vertex(point(k),normalSums[k],samples[k].rock*(1-samples[k].path));
      if(kind)for(const edge of [Array.from({length:columns},(_,i)=>i),Array.from({length:columns},(_,i)=>(rows-1)*columns+i).reverse(),Array.from({length:rows},(_,i)=>i*columns).reverse(),Array.from({length:rows},(_,i)=>i*columns+columns-1)])for(let i=0;i<edge.length-1;i++){
        const a=point(edge[i]),b=point(edge[i+1]),c=b.clone(),d=a.clone();c.y=d.y=-.6;const n=b.clone().sub(a).cross(d.clone().sub(a)).normalize();for(const p of [a,b,d,b,c,d])vertex(p,n);
      }
      if(kind)for(const wall of o.walls??[]){const source=new T.BoxGeometry(...wall.size),g=source.toNonIndexed();source.dispose();g.translate(...wall.offset);const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++)vertex(new T.Vector3().fromBufferAttribute(p,i),new T.Vector3().fromBufferAttribute(n,i));g.dispose();}
      if(!positions.length)return;
      const g=new T.BufferGeometry();for(const [name,values,size]of [['position',positions,3],['normal',normals,3],['uv',uv,2],['rockMix',rockMix,1]])g.setAttribute(name,new T.Float32BufferAttribute(values,size));
      const mesh=new T.Mesh(g,materials[kind]);mesh.name=kind?'mountain-rock-face':'mountain-soil-face';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
    });
    return {root,onHit(hit){if(hit.object.name!=='mountain-rock-face')return {bulletmark:false,surface:'soil'};},dispose(){maps.forEach(map=>map.dispose());}};
  };
  factory.preload = (options, {compute}) => compute(buildTextures, options);
  return factory;
})();
