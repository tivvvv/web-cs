// 连接带的灌木和花丛. 不透明静态实例化, 无细叶投影, 不增加碰撞或动画回调.
FPS.models.hubPlanting = (T, o = {}) => {
  const root=new T.Group(),pose=new T.Object3D(),tint=new T.Color();let seed=o.seed??361;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  // 路段预计算包围范围, 候选点先做快速拒绝, 不逐点构造路径闭包和平方根.
  const segments=(o.paths??[]).flatMap(path=>path.points.slice(1).map((b,i)=>{
    const a=path.points[i],dx=b[0]-a[0],dz=b[1]-a[1],r=path.width/2;
    return {x:a[0],z:a[1],dx,dz,length:dx*dx+dz*dz,r,bounds:[Math.min(a[0],b[0])-r,Math.min(a[1],b[1])-r,Math.max(a[0],b[0])+r,Math.max(a[1],b[1])+r]};
  }));
  function clear(x,z,margin=.22) {
    if((o.exclusions??[]).some(([a,b,c,d])=>x>a&&x<c&&z>b&&z<d))return false;
    for(const segment of segments) {
      const [a,b,c,d]=segment.bounds;if(x<a-margin||x>c+margin||z<b-margin||z>d+margin)continue;
      const t=segment.length?Math.max(0,Math.min(1,((x-segment.x)*segment.dx+(z-segment.z)*segment.dz)/segment.length)):0;
      const dx=x-segment.x-segment.dx*t,dz=z-segment.z-segment.dz*t;if(dx*dx+dz*dz<(segment.r+margin)**2)return false;
    }
    return true;
  }
  function surface(x,z,fallback) {
    const land=(o.landforms??[]).find(l=>x>=l.rect[0]&&x<=l.rect[2]&&z>=l.rect[1]&&z<=l.rect[3]);if(!land)return fallback;
    const {rect,columns,rows,heights}=land,u=(x-rect[0])/(rect[2]-rect[0])*(columns-1),v=(z-rect[1])/(rect[3]-rect[1])*(rows-1),i=Math.min(columns-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),a=u-i,b=v-j;
    const h0=heights[j*columns+i],h1=heights[j*columns+i+1],h2=heights[(j+1)*columns+i],h3=heights[(j+1)*columns+i+1];
    return a+b<=1?h0+(h1-h0)*a+(h2-h0)*b:h3+(h2-h3)*(1-a)+(h1-h3)*(1-b);
  }
  for(const kind of ['shrub','flower']) {
    const groups=[];
    for(const patch of o.patches??[{rect:[-2,-1,2,1],y:2.4,kind:'shrub'}])if((patch.kind??'shrub')===kind) {
      const [a,b,c,d]=patch.rect,spacing=kind==='flower'?.83:.72,inset=kind==='shrub'?(patch.raised?.22:.62):.12,points=[];
      for(let z=b+spacing/2;z<d;z+=spacing)for(let x=a+spacing/2;x<c;x+=spacing) {
        if(random()<.15)continue;const px=x+(random()-.5)*spacing*.45,pz=z+(random()-.5)*spacing*.45;
        if(px<a+inset||px>c-inset||pz<b+inset||pz>d-inset)continue;
        if(!patch.raised&&!clear(px,pz,kind==='shrub'?.85:.22))continue;points.push([px,(patch.raised?patch.y:surface(px,pz,patch.y))-.025,pz,(.75+random()*.35)*(patch.scale??(kind==='shrub'&&!patch.raised?1.55:1)),random()*Math.PI*2]);
      }
      if(points.length)groups.push({points,weight:patch.raised?3:1});
    }
    // 按有效种植面积分配预算, 花池优先保留密度, 每条连接带都有地被.
    const total=groups.reduce((n,g)=>n+g.points.length,0),weighted=groups.reduce((n,g)=>n+g.points.length*g.weight,0),limit=Math.min(total,o.budgets?.[kind]??(kind==='shrub'?360:42));
    const counts=groups.map(g=>Math.min(g.points.length,Math.floor(g.points.length*g.weight*limit/weighted)));
    for(let remaining=limit-counts.reduce((a,b)=>a+b,0),i=0;remaining;i=(i+1)%groups.length)if(counts[i]<groups[i].points.length){counts[i]++;remaining--;}
    const points=groups.flatMap((g,i)=>Array.from({length:counts[i]},(_,j)=>g.points[Math.floor((j+.5)*g.points.length/counts[i])]));
    if(!points.length)continue;
    const values=[],colors=[];
    const triangle=(a,b,c,color)=>{values.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(...color);};
    if(kind==='flower') {
      triangle([-.006,0,0],[.006,0,0],[.006,.23,0],[.31,.46,.23]);triangle([-.006,0,0],[.006,.23,0],[-.006,.23,0],[.31,.46,.23]);
      triangle([0,.1,0],[.12,.15,.025],[.07,.17,-.025],[.4,.53,.28]);
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5,center=[Math.sin(a)*.035,.235,Math.cos(a)*.035],side=[Math.cos(a)*.015,0,-Math.sin(a)*.015];
        triangle([0,.233,0],[center[0]-side[0],.239,center[2]-side[2]],[center[0]+side[0],.239,center[2]+side[2]],[.87,.82,.56]);}
    } else for(let i=0;i<18;i++) {
      const a=i*2.399,y=.15+i%4*.105,r=.15+(i%3)*.045,c=[Math.sin(a)*r,y,Math.cos(a)*r],side=[Math.cos(a)*.095,0,-Math.sin(a)*.095];
      const A=[c[0]-side[0],y,c[2]-side[2]],B=[c[0]+side[0],y,c[2]+side[2]],tip=[c[0]+Math.sin(a)*.2,y+.04,c[2]+Math.cos(a)*.2],stem=[c[0]-Math.sin(a)*.13,y-.04,c[2]-Math.cos(a)*.13];
      triangle(A,B,tip,[.31,.46,.23]);triangle(B,A,stem,[.42,.55,.29]);
    }
    let geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(values,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
    if(kind==='shrub') {
      // 闭合的柔和冠体补上枝叶内部, 细叶只修饰轮廓, 稀疏叶片不会像裸草一样露出土面.
      const source=new T.SphereGeometry(.42,8,5).scale(1,.62,.9).translate(0,.28,0),crown=source.toNonIndexed();source.dispose();
      const p=crown.attributes.position,colors=[];
      for(let i=0;i<p.count;i++){const shade=.7+.3*Math.min(1,p.getY(i)/.54);colors.push(.34*shade,.47*shade,.24*shade);}
      crown.deleteAttribute('uv');crown.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      const leaves=geometry;geometry=T.mergeGeometries([crown,leaves]);crown.dispose();leaves.dispose();
    }
    const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
    if(kind!=='shrub') {
      material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        #ifdef USE_INSTANCING
          float hubDistance=length((modelViewMatrix*vec4(instanceMatrix[3].xyz,1.)).xyz);
          transformed*=1.-smoothstep(38.,90.,hubDistance);
        #endif`);};material.customProgramCacheKey=()=> 'hub-flower-fade-1';
    }
    const mesh=new T.InstancedMesh(geometry,material,points.length);
    points.forEach(([x,y,z,s,a],i)=>{pose.position.set(x,y,z);pose.rotation.set(0,a,0);pose.scale.setScalar(s);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);tint.set(0xd0d4b9).multiplyScalar(.91+random()*.12);mesh.setColorAt(i,tint);});
    mesh.name='hub-'+kind;mesh.receiveShadow=kind==='shrub';mesh.raycast=()=>{};mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);
  }
  let disposed=false;return {root,dispose(){if(disposed)return;disposed=true;root.children.forEach(mesh=>mesh.dispose());}};
};
