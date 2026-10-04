// 山坡草甸. 曲叶分为短草/长草两批, 根部共用高度场, 只更新材质风动时间.
FPS.models.mountainGrass = (T, o = {}) => {
  const root = new T.Group(), [x0,z0,x1,z1] = o.bounds ?? [-50,-38,50,38];
  const cols = o.columns ?? 2, rows = o.rows ?? 2, heights = o.heights ?? [2.7,2.7,2.7,2.7];
  const dx = (x1-x0)/(cols-1), dz = (z1-z0)/(rows-1), clamp = n => Math.max(0,Math.min(1,n));
  const colors = o.grassColors ?? { fresh:[98,125,65], dry:[135,140,83], shade:[70,102,53] };
  const hash = (x,z) => { let n=Math.imul(x,374761393)^Math.imul(z,668265263)^831; n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967296; };
  function noise(x,z) {
    const i=Math.floor(x),j=Math.floor(z),a=x-i,b=z-j,u=a*a*(3-2*a),v=b*b*(3-2*b);
    return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;
  }
  let seed=o.seed??1831; const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  // 椭圆生态斑块共用场景规格, 表面土色和草丛密度按相同权重渐变.
  function soilWeight(x,z) {
    let weight=0;
    for(const {center:[cx,cz],radius:[rx,rz],strength} of o.soilPatches??[]) {
      const d=Math.hypot((x-cx)/rx,(z-cz)/rz),w=clamp((1-d)*1.7);
      weight=Math.max(weight,w*w*(3-2*w)*strength);
    }
    return weight;
  }
  const segments=(o.paths??[]).flatMap(path=>path.points.slice(1).map((b,i)=>({a:path.points[i],b,width:path.width})));
  function shoulder(x,z) {
    let gap=Infinity;
    for(const {a,b,width} of segments) {
      const ax=b[0]-a[0],az=b[2]-a[2],length=ax*ax+az*az,t=length?clamp(((x-a[0])*ax+(z-a[2])*az)/length):0;
      gap=Math.min(gap,Math.hypot(x-a[0]-ax*t,z-a[2]-az*t)-width/2);
    }
    return gap;
  }
  // 插值和对角线与地形完全一致; 草丛朝向真实三角面的坡面法线.
  function surface(x,z) {
    const u=clamp((x-x0)/(x1-x0))*(cols-1),v=clamp((z-z0)/(z1-z0))*(rows-1);
    const i=Math.min(cols-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),a=u-i,b=v-j,k=j*cols+i,h=heights;
    const first=a+b<=1,sx=(first?h[k+1]-h[k]:h[k+cols+1]-h[k+cols])/dx,sz=(first?h[k+cols]-h[k]:h[k+cols+1]-h[k+1])/dz;
    const y=first?h[k]+a*(h[k+1]-h[k])+b*(h[k+cols]-h[k]):h[k+cols+1]+(a-1)*(h[k+cols+1]-h[k+cols])+(b-1)*(h[k+cols+1]-h[k+1]);
    return {y,normal:new T.Vector3(-sx,1,-sz).normalize()};
  }
  const patches=[[],[]],spacing=Math.max(.35,o.spacing??.43),limits=[Math.floor(Math.max(0,Math.min(8500,o.maxShort??8500))),Math.floor(Math.max(0,Math.min(400,o.maxTall??400)))];
  for(let z=z0+1;z<z1-1;z+=spacing) for(let x=x0+1;x<x1-1;x+=spacing) {
    const px=x+(random()-.5)*spacing*.8,pz=z+(random()-.5)*spacing*.8,gap=shoulder(px,pz);
    if(gap<.6||(o.exclusions??[]).some(([a,b,c,d])=>px>a-.78&&px<c+.78&&pz>b-.78&&pz<d+.78))continue;
    const p=surface(px,pz); if(p.y<2.35||p.normal.y<.8)continue;
    const patch=noise(px/5.7,pz/5.7),detail=noise(px/1.9+17,pz/1.9),density=clamp(.18+patch*.96+detail*.18)*(1-soilWeight(px,pz)*.92);
    if(random()>density)continue;
    const forest=(o.woodland??[]).some(([cx,cz,r])=>Math.hypot(px-cx,pz-cz)<r*1.35);
    const tall=gap>.78&&(forest||gap<2.6)&&random()<.12;
    patches[tall?1:0].push({x:px,z:pz,...p,rank:random(),patch,forest});
  }
  // 超过预算时按随机优先级抽样, 避免按扫描顺序让地图一端缺草.
  patches.forEach((points,i)=>{points.sort((a,b)=>a.rank-b.rank);points.length=Math.min(points.length,limits[i]);});
  if(!patches.some(points=>points.length))return {root};
  function blades(tall) {
    const positions=[],tints=[],count=tall?5:4,steps=tall?3:2;
    for(let i=0;i<count;i++) {
      const angle=i*2.4+.25,forward=[Math.sin(angle),Math.cos(angle)],side=[forward[1],-forward[0]],h=.69+(i%3)*.145,lean=.19+(i%3)*.085;
      const at=(t,s)=>{
        const reach=.035+lean*t*t,width=.026*(1-t)+.022*Math.sin(t*Math.PI),twist=t*.52;
        return [forward[0]*reach+side[0]*width*s,h*(t-.12*t*t),forward[1]*reach+side[1]*width*s+twist*forward[0]*width*s];
      };
      const vertex=(t,s)=>{positions.push(...at(t,s));const tint=.58+.42*t;tints.push(tint,tint,tint);};
      for(let j=0;j<steps;j++) {
        const a=j/steps,b=(j+1)/steps;
        vertex(a,-1);vertex(a,1);vertex(b,1);
        if(j<steps-1){vertex(a,-1);vertex(b,1);vertex(b,-1);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(tints,3));g.computeVertexNormals();return g;
  }
  const time={value:0},material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
  material.customProgramCacheKey=()=> 'mountain-meadow-v1';
  material.onBeforeCompile=shader=>{
    shader.uniforms.grassTime=time;
    shader.vertexShader='uniform float grassTime; varying vec3 grassUp;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      grassUp=normalize(normalMatrix*vec3(0.,1.,0.));
      #ifdef USE_INSTANCING
        grassUp=normalize(normalMatrix*mat3(instanceMatrix)*vec3(0.,1.,0.));
        vec4 base=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
        float range=length((viewMatrix*base).xyz);
        float presence=1.-smoothstep(28.,82.,range);
        float tip=clamp(position.y,0.,1.);
        float phase=dot(base.xz,vec2(.63,.47));
        transformed.x+=sin(grassTime*1.25+phase)*.026*tip*tip;
        transformed.z+=cos(grassTime*.85+phase)*.018*tip*tip;
        transformed*=presence;
      #endif
    `);
    // 平均法线降低叶片正反面翻转的明暗跳变, 不增加透明排序或细叶投影.
    shader.fragmentShader='varying vec3 grassUp;\n'+shader.fragmentShader.replace('#include <normal_fragment_begin>',
      '#include <normal_fragment_begin>\nnormal=normalize(mix(normal,normalize(grassUp),.88));');
  };
  const pose=new T.Object3D(),up=new T.Vector3(0,1,0),tint=new T.Color();
  patches.forEach((points,kind)=>{
    if(!points.length)return;
    const mesh=new T.InstancedMesh(blades(kind===1),material,points.length);
    points.forEach((p,i)=>{
      pose.position.set(p.x,p.y-.035,p.z);pose.quaternion.setFromUnitVectors(up,p.normal);pose.rotateY(random()*Math.PI*2);
      pose.scale.set(.6+random()*.25,(kind ? .38 : .18)+random()*(kind ? .22 : .14)+p.patch*.035,.6+random()*.25);pose.updateMatrix();
      // 草根跨过相邻网格折线时, 按所有叶基取额外埋深, 不用中心点冒充整株接触.
      const vertices=mesh.geometry.attributes.position,base=new T.Vector3();let bury=0;
      for(let j=0;j<vertices.count;j++)if(vertices.getY(j)===0) {
        base.fromBufferAttribute(vertices,j).applyMatrix4(pose.matrix);
        bury=Math.max(bury,base.y-surface(base.x,base.z).y+.003);
      }
      pose.position.y-=bury;pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
      const dry=clamp(noise(p.x/10+7,p.z/10)*.75+(p.y-13)/40),damp=clamp(.65-noise(p.x/15,p.z/15)+.32*Math.exp(-(((p.x+9-p.z*.22)/5)**2)));
      const shade=clamp(damp*.6+(p.forest ? .08 : 0)),variation=.95+random()*.12;
      const rgb=colors.fresh.map((v,c)=>((v*(1-dry)+colors.dry[c]*dry)*(1-shade)+colors.shade[c]*shade)*variation/255);
      tint.setRGB(...rgb,T.SRGBColorSpace);mesh.setColorAt(i,tint);
    });
    mesh.name=kind?'mountain-tall-grass':'mountain-meadow-grass';mesh.receiveShadow=true;mesh.raycast=()=>{};
    mesh.computeBoundingBox();mesh.boundingBox.expandByScalar(.035);mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.035;root.add(mesh);
  });
  return {root,update(dt){time.value+=dt;}};
};
