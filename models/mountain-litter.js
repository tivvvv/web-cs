// 山地林下落叶/松针/枯枝. 每个顶点贴合高度场, 全部合成一个不透明装饰网格.
FPS.models.mountainLitter = (T, o = {}) => {
  const root=new T.Group(),positions=[],colors=[],[x0,z0,x1,z1]=o.bounds??[-50,-38,50,38];
  const cols=o.columns??2,rows=o.rows??2,h=o.heights??[2.4,2.4,2.4,2.4],clamp=n=>Math.max(0,Math.min(1,n));
  let seed=o.seed??971,count=0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function height(x,z) {
    const u=clamp((x-x0)/(x1-x0))*(cols-1),v=clamp((z-z0)/(z1-z0))*(rows-1),i=Math.min(cols-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),a=u-i,b=v-j,k=j*cols+i;
    return a+b<=1?h[k]+a*(h[k+1]-h[k])+b*(h[k+cols]-h[k]):h[k+cols+1]+(a-1)*(h[k+cols+1]-h[k+cols])+(b-1)*(h[k+cols+1]-h[k+1]);
  }
  function triangle(points,x,z,yaw,color) {
    const c=Math.cos(yaw),s=Math.sin(yaw),tint=new T.Color(color).multiplyScalar(.83+random()*.27);
    for(const [px,lift,pz]of points){const wx=x+px*c+pz*s,wz=z-px*s+pz*c;positions.push(wx,height(wx,wz)+lift,wz);colors.push(tint.r,tint.g,tint.b);}
  }
  const segments=(o.paths??[]).flatMap(p=>p.points.slice(1).map((b,i)=>({a:p.points[i],b,width:p.width})));
  for(const tree of o.trees??[])for(let n=0;n<(tree.litterCount??18)&&count<(o.maxCount??600);n++) {
    const a=random()*Math.PI*2,r=.65+Math.sqrt(random())*((tree.litterRadius??3.05)-.65),x=tree.position[0]+Math.cos(a)*r,z=tree.position[2]+Math.sin(a)*r;
    if(x<x0+.4||x>x1-.4||z<z0+.4||z>z1-.4||(o.exclusions??[]).some(([a,b,c,d])=>x>a-.35&&x<c+.35&&z>b-.35&&z<d+.35))continue;
    if(segments.some(({a,b,width})=>{const dx=b[0]-a[0],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz));return Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t)<width/2+.65;}))continue;
    if(Math.hypot(height(x+.15,z)-height(x-.15,z),height(x,z+.15)-height(x,z-.15))/.3>(tree.litterSlope??.65))continue;
    const yaw=random()*Math.PI*2;
    if(tree.kind==='pine')for(let needle=0;needle<4;needle++) {
      const turn=yaw+needle*.63;
      triangle([[-.055,.012,-.009],[.09,.018,0],[-.055,.012,.009]],x,z,turn,needle%2?0x84744c:0x72674b);
    } else {
      // 叶缘轻卷, 叶脉直接分割实面, 没有与叶片共面的装饰线.
      const tip=[.115,.014,0],heel=[-.09,.012,0],veins=[];
      for(const side of [-1,1]) {
        const a=[-.022,.028,side*.002],b=[.024,.03,side*.002],edgeA=[-.047,.019,side*.03],edgeB=[.022,.012,side*.05];veins.push([a,b]);
        for(const points of [[heel,edgeA,a],[edgeA,edgeB,a],[edgeB,b,a],[edgeB,tip,b]])triangle(points,x,z,yaw,side>0?0x96835a:0x82784f);
      }
      for(const points of [[heel,veins[0][0],veins[1][0]],[tip,veins[1][1],veins[0][1]],[veins[0][0],veins[0][1],veins[1][0]],[veins[1][0],veins[0][1],veins[1][1]]])triangle(points,x,z,yaw,0xa19769);
    }
    if(n%5===0) {
      // 四棱枯枝有厚度和浅色断口, 上下表面仍保持在坡面 1~3 cm 范围内.
      const ends=[-.12,.14].map(px=>[[-.008,.021],[0,.029],[.008,.021],[0,.013]].map(([pz,lift])=>[px,lift,pz]));
      for(let i=0;i<4;i++){const j=(i+1)%4;for(const points of [[ends[0][i],ends[1][i],ends[1][j]],[ends[0][i],ends[1][j],ends[0][j]]])triangle(points,x+.07,z-.05,yaw+.7,0x605846);}
      for(const end of ends)for(const points of [[end[0],end[1],end[2]],[end[0],end[2],end[3]]])triangle(points,x+.07,z-.05,yaw+.7,0xa18b61);
    }
    count++;
  }
  if(positions.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();
    const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));mesh.name='mountain-forest-litter';mesh.receiveShadow=true;mesh.raycast=()=>{};root.add(mesh);}
  return {root};
};
