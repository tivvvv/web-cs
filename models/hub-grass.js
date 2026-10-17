// 中央草坪. 短草和林缘长草各一个不透明实例批次, 共用地表生态规格和真实坡面.
FPS.models.hubGrass = (T, o = {}) => {
  const root=new T.Group(),clamp=n=>Math.max(0,Math.min(1,n)),turf=o.turf??{};
  const colors=turf.colors??{fresh:[99,124,65],dry:[135,139,83],shade:[70,100,53]};
  const woodland=turf.woodland??(o.treeBases??[]).map((center,i)=>({center,radius:[2.6,2.6],seed:461+i*31}));
  let seed=turf.seed??1483;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const hash=(x,z)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263)^1483;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
  function noise(x,z) {
    const i=Math.floor(x),j=Math.floor(z),a=x-i,b=z-j,u=a*a*(3-2*a),v=b*b*(3-2*b);
    return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;
  }
  const segments=(o.paths??[]).flatMap(path=>path.points.slice(1).map((b,i)=>{
    const a=path.points[i],dx=b[0]-a[0],dz=b[1]-a[1],r=path.width/2;
    return {x:a[0],z:a[1],dx,dz,length:dx*dx+dz*dz,r,bounds:[Math.min(a[0],b[0])-r,Math.min(a[1],b[1])-r,Math.max(a[0],b[0])+r,Math.max(a[1],b[1])+r]};
  }));
  let nearbyTrees=[],nearbyExclusions=[],nearbySegments=[],nearbyWoodland=[];
  const overlaps=([a,b,c,d],[x,z,u,v],margin=0)=>a<=u+margin&&c>=x-margin&&b<=v+margin&&d>=z-margin;
  function clear(x,z,margin) {
    if(nearbyTrees.some(([cx,cz])=>(x-cx)**2+(z-cz)**2<(.44+margin)**2))return false;
    if(nearbyExclusions.some(([a,b,c,d])=>x>a-margin&&x<c+margin&&z>b-margin&&z<d+margin))return false;
    for(const s of nearbySegments) {
      const [a,b,c,d]=s.bounds;if(x<a-margin||x>c+margin||z<b-margin||z>d+margin)continue;
      const t=s.length?clamp(((x-s.x)*s.dx+(z-s.z)*s.dz)/s.length):0;
      if((x-s.x-s.dx*t)**2+(z-s.z-s.dz*t)**2<(s.r+margin)**2)return false;
    }
    return true;
  }
  const landforms=(o.landforms??[]).map(l=>({...l,dx:(l.rect[2]-l.rect[0])/(l.columns-1),dz:(l.rect[3]-l.rect[1])/(l.rows-1)}));
  // 三角插值与地面网格一致, 复用法线向量, 平地草丛不重复采样全部叶基.
  function surface(x,z,normal) {
    let land;for(const l of landforms)if(x>=l.rect[0]&&x<=l.rect[2]&&z>=l.rect[1]&&z<=l.rect[3]){land=l;break;}
    if(!land){normal?.set(0,1,0);return o.y??2.4;}
    const {rect,columns,rows,heights:h,dx,dz}=land;
    const u=(x-rect[0])/dx,v=(z-rect[1])/dz,i=Math.min(columns-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),a=u-i,b=v-j,k=j*columns+i,first=a+b<=1;
    const sx=(first?h[k+1]-h[k]:h[k+columns+1]-h[k+columns])/dx,sz=(first?h[k+columns]-h[k]:h[k+columns+1]-h[k+1])/dz;
    normal?.set(-sx,1,-sz).normalize();return first?h[k]+a*(h[k+1]-h[k])+b*(h[k+columns]-h[k]):h[k+columns+1]+(a-1)*(h[k+columns+1]-h[k+columns])+(b-1)*(h[k+columns+1]-h[k+1]);
  }
  function wear(x,z) {
    let result=0;
    for(const p of turf.soilPatches??[]) {const d=Math.hypot((x-p.center[0])/p.radius[0],(z-p.center[1])/p.radius[1]),w=clamp((1-d)*1.7);result=Math.max(result,w*w*(3-2*w)*p.strength);}
    return result;
  }
  function forestWeight(x,z) {
    let result=0;
    for(const {center:[cx,cz],radius:[rx,rz]}of nearbyWoodland) {
      if(Math.abs(x-cx)>rx||Math.abs(z-cz)>rz)continue;
      const w=clamp((1-Math.hypot((x-cx)/rx,(z-cz)/rz))*1.6);result=Math.max(result,w*w*(3-2*w));
    }return result;
  }
  const groups=[[],[]],spacing=Math.max(.25,o.spacing??.38),tallDensity=clamp(o.tallDensity??.24),limits=[Math.min(12000,Math.max(0,Math.floor(o.maxShort??12000))),Math.min(800,Math.max(0,Math.floor(o.maxTall??800)))];
  for(const rect of o.soil??[[-2,-2,2,2]]) {
    const [a,b,c,d]=rect;
    // 每岛只扫描相邻通路/树根/设施, 避免每个候选点都遍历整张中央图.
    nearbyTrees=(o.treeBases??[]).filter(([x,z])=>overlaps(rect,[x,z,x,z],1.12));
    nearbyExclusions=(o.exclusions??[]).filter(r=>overlaps(rect,r,.68));
    nearbySegments=segments.filter(s=>overlaps(rect,s.bounds,.68));
    nearbyWoodland=woodland.filter(({center:[x,z],radius:[rx,rz]})=>overlaps(rect,[x-rx,z-rz,x+rx,z+rz]));
    for(let z=b+.36;z<d-.36;z+=spacing)for(let x=a+.36;x<c-.36;x+=spacing) {
      const px=x+(random()-.5)*spacing*.88,pz=z+(random()-.5)*spacing*.88;
      if(px<a+.44||px>c-.44||pz<b+.44||pz>d-.44||!clear(px,pz,.46))continue;
      const patch=noise(px/5.7,pz/5.7),worn=wear(px,pz),forest=forestWeight(px,pz),density=clamp(.28+patch*.85+noise(px/1.9+17,pz/1.9)*.15)*(1-worn*.92)*(1-forest*.16);
      if(random()>density)continue;
      const edge=Math.min(px-a,c-px,pz-b,d-pz),p={x:px,z:pz,worn,forest,rank:random()};groups[0].push(p);
      if((forest>.25||edge<2.3)&&edge>.68&&clear(px,pz,.68)&&random()<tallDensity)groups[1].push({...p,rank:random()});
    }
  }
  // 随机优先级保留各臂覆盖, 避免顺序截断和等距抽样留下整齐的秃行.
  groups.forEach((points,i)=>{points.sort((a,b)=>a.rank-b.rank);points.length=Math.min(points.length,limits[i]);});
  function blades(tall) {
    const positions=[],tints=[],bladeIds=[],indices=[],shared=new Map(),count=tall?7:5,steps=tall?3:2,angles=tall?[.25,.82,1.51,2.97,3.41,4.85,5.67]:[.35,1.04,2.9,4.15,5.31];
    for(let i=0;i<count;i++) {
      const angle=angles[i],forward=[Math.sin(angle),Math.cos(angle)],side=[forward[1],-forward[0]],h=tall?.74+i%3*.14:.36+i%3*.045,lean=(tall?.23:.19)+i%3*.035;
      const at=(t,s)=>{const reach=.035+i%2*.035+lean*t*t,width=(tall?.023:.027)*(1-t)+.017*Math.sin(Math.PI*t),twist=t*.35;
        return [forward[0]*reach+side[0]*(width*s+(i%3-1)*.021),h*(t-.08*t*t),forward[1]*reach+side[1]*width*s+twist*forward[0]*width*s+(i%2-.5)*.027];};
      // 同一叶片的曲面节点共享顶点, 保留叶数/轮廓并平滑折段受光.
      const vertex=(t,s)=>{const key=i+':'+t+':'+(t===1?0:s);let index=shared.get(key);
        if(index===undefined){index=positions.length/3;shared.set(key,index);positions.push(...at(t,t===1?0:s));const shade=(.58+.42*t)*(1-i%3*.035);tints.push(shade,shade,shade);bladeIds.push(i);}indices.push(index);};
      for(let j=0;j<steps;j++){const a=j/steps,b=(j+1)/steps;vertex(a,-1);vertex(a,1);vertex(b,1);if(b<1){vertex(a,-1);vertex(b,1);vertex(b,-1);}}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(tints,3));g.setAttribute('hubBlade',new T.Float32BufferAttribute(bladeIds,1));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const time={value:0},pose=new T.Object3D(),up=new T.Vector3(0,1,0),normal=new T.Vector3(),tint=new T.Color(),base=new T.Vector3();
  groups.forEach((points,kind)=>{
    if(!points.length)return;
    const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
    material.onBeforeCompile=shader=>{
      shader.uniforms.hubGrassTime=time;
      shader.vertexShader='attribute float hubBlade; uniform float hubGrassTime; varying vec3 hubGrassUp; varying float hubGrassTip;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        hubGrassUp=normalize(normalMatrix*vec3(0.,1.,0.));
        hubGrassTip=clamp(position.y/${kind?'1.02':'.45'},0.,1.);
        #ifdef USE_INSTANCING
          hubGrassUp=normalize(normalMatrix*mat3(instanceMatrix)*vec3(0.,1.,0.));
          vec4 hubGrassBase=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
          float hubGrassRange=length((viewMatrix*hubGrassBase).xyz);
          float hubGrassPhase=dot(hubGrassBase.xz,vec2(.63,.47));
          // 静态叶形变化由局部根坐标决定, 整体移动或旋转不会让草叶突然换形.
          float hubGrassVariant=fract(dot(instanceMatrix[3].xz,vec2(.1031,.0973)));
          vec2 hubGrassLean=fract(vec2(hubGrassVariant*13.71,hubGrassVariant*31.13)+hubBlade*vec2(.37,.71))-.5;
          transformed.xz+=hubGrassLean*.06*hubGrassTip*hubGrassTip;
          transformed.y*=.9+fract(hubGrassVariant*7.19+hubBlade*.43)*.2;
          transformed.x+=sin(hubGrassTime*1.15+hubGrassPhase)*.022*hubGrassTip*hubGrassTip;
          transformed.z+=cos(hubGrassTime*.82+hubGrassPhase)*.016*hubGrassTip*hubGrassTip;
          float hubGrassFadeOffset=(fract(hubGrassVariant*9.13+hubBlade*.29)-.5)*8.;
          transformed*=1.-smoothstep(${kind?'40.,90.':'24.,68.'},hubGrassRange+hubGrassFadeOffset);
        #endif`);
      shader.fragmentShader='varying vec3 hubGrassUp; varying float hubGrassTip;\n'+shader.fragmentShader
        .replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
          vec3 grassNormal=normal*faceDirection, grassUp=normalize(hubGrassUp);
          grassNormal*=dot(grassNormal,grassUp)<-.0001?-1.:1.;
          normal=normalize(mix(grassNormal,grassUp,.88));`)
        .replace('#include <lights_fragment_begin>',`#include <lights_fragment_begin>
          #if NUM_DIR_LIGHTS > 0
            float hubGrassTransmission=pow(max(dot(geometryViewDir,-directionalLights[0].direction),0.),3.);
            reflectedLight.directDiffuse+=diffuseColor.rgb*directLight.color*(.025+.12*hubGrassTransmission)*hubGrassTip;
          #endif`);
    };material.customProgramCacheKey=()=> 'hub-meadow-'+kind+'-3';
    const mesh=new T.InstancedMesh(blades(kind===1),material,points.length),vertices=mesh.geometry.attributes.position;
    const leafBases=[],seen=new Set();for(let j=0;j<vertices.count;j++)if(vertices.getY(j)===0){const key=vertices.getX(j)+','+vertices.getZ(j);if(!seen.has(key)){seen.add(key);leafBases.push(new T.Vector3().fromBufferAttribute(vertices,j));}}
    points.forEach((p,i)=>{
      const y=surface(p.x,p.z,normal);pose.position.set(p.x,y-.03,p.z);pose.quaternion.setFromUnitVectors(up,normal);pose.rotateY(random()*Math.PI*2);
      pose.scale.set(.8+random()*.32,(kind?.4:.44)+random()*(kind?.23:.28),.8+random()*.32);pose.updateMatrix();
      let bury=0;if(landforms.some(({rect:[a,b,c,d]})=>p.x>a-.18&&p.x<c+.18&&p.z>b-.18&&p.z<d+.18))
        for(const leafBase of leafBases){base.copy(leafBase).applyMatrix4(pose.matrix);bury=Math.max(bury,base.y-surface(base.x,base.z)+.004);}
      pose.position.y-=bury;pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
      const dry=clamp(noise(p.x/9+7,p.z/9)*.6+p.worn*.5),shade=.08+noise(p.x/13,p.z/13)*.16+p.forest*.22,variation=.94+random()*.12;
      tint.setRGB(...colors.fresh.map((v,k)=>((v*(1-dry)+colors.dry[k]*dry)*(1-shade)+colors.shade[k]*shade)*variation/255),T.SRGBColorSpace);mesh.setColorAt(i,tint);
    });
    mesh.name=kind?'hub-tall-grass':'hub-meadow-grass';mesh.receiveShadow=true;mesh.raycast=()=>{};
    // 包围体包含叶形变化和风幅, 不让边缘草叶因静态包围体过小被提前裁掉.
    mesh.computeBoundingBox();mesh.boundingBox.expandByScalar(.12);mesh.geometry.computeBoundingSphere();mesh.boundingSphere=mesh.geometry.boundingSphere.clone();mesh.boundingBox.getBoundingSphere(mesh.boundingSphere);root.add(mesh);
  });
  let disposed=false;return {root,update(dt){if(Number.isFinite(dt)&&dt>0)time.value=(time.value+dt)%(200*Math.PI);},dispose(){if(disposed)return;disposed=true;root.children.forEach(mesh=>mesh.dispose());}};
};
