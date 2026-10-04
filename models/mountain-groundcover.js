// 山径林下蕨类与低矮野花. 实体叶面静态实例化, 共用场景高度场且避让通道.
FPS.models.mountainGroundcover = (T, o = {}) => {
  const root=new T.Group(),[x0,z0,x1,z1]=o.bounds??[-50,-38,50,38],cols=o.columns??2,rows=o.rows??2;
  const heights=o.heights??[2.4,2.4,2.4,2.4],dx=(x1-x0)/(cols-1),dz=(z1-z0)/(rows-1);
  let seed=o.seed??407;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function surface(x,z) {
    const u=Math.max(0,Math.min(cols-1,x/dx-x0/dx)),v=Math.max(0,Math.min(rows-1,z/dz-z0/dz));
    const i=Math.min(cols-2,Math.floor(u)),j=Math.min(rows-2,Math.floor(v)),a=u-i,b=v-j,k=j*cols+i,h=heights;
    return a+b<=1?h[k]+a*(h[k+1]-h[k])+b*(h[k+cols]-h[k]):
      h[k+cols+1]+(a-1)*(h[k+cols+1]-h[k+cols])+(b-1)*(h[k+cols+1]-h[k+1]);
  }
  function plant(kind) {
    const p=[],colors=[];
    const leaf=(a,b,c,d,color)=>{
      const tint=new T.Color(color);
      for(const tri of [[a,b,c],[a,c,d]]) {
        const edge=new T.Vector3(...tri[1]).sub(new T.Vector3(...tri[0])),other=new T.Vector3(...tri[2]).sub(new T.Vector3(...tri[0]));
        if(edge.cross(other).lengthSq()<1e-12)continue;
        for(const v of tri){const light=.68+.32*Math.min(1,v[1]/.45);p.push(...v);colors.push(tint.r*light,tint.g*light,tint.b*light);}
      }
    };
    if(kind==='fern') for(let branch=0;branch<5;branch++) {
      const angle=branch*2.4,forward=[Math.cos(angle),Math.sin(angle)],side=[-forward[1],forward[0]],span=.53+branch%3*.045,arc=.44+.065*Math.sin(branch*1.7);
      for(let j=1;j<=7;j++) {
        const t=j/8,r=span*t,h=arc*Math.sin(t*2.85)+.035*t,w=.12*Math.sin(Math.PI*t)**.65*(.88+.2*Math.sin(j*1.8+branch));
        const prev=(j-1)/8,base=[forward[0]*span*prev,arc*Math.sin(prev*2.85)+.035*prev,forward[1]*span*prev],tip=[forward[0]*r,h,forward[1]*r];
        leaf([base[0]-side[0]*.009,base[1],base[2]-side[1]*.009],[tip[0]-side[0]*.007,tip[1],tip[2]-side[1]*.007],
          [tip[0]+side[0]*.007,tip[1],tip[2]+side[1]*.007],[base[0]+side[0]*.009,base[1],base[2]+side[1]*.009],0x637a50);
        for(const s of [-1,1]) {
          const c=[forward[0]*r,h,forward[1]*r],end=[c[0]+side[0]*w*s+forward[0]*.065,c[1]-.035,c[2]+side[1]*w*s+forward[1]*.065];
          leaf([c[0]-forward[0]*.032,c[1],c[2]-forward[1]*.032],end,[c[0]+forward[0]*.038,c[1]+.017,c[2]+forward[1]*.038],c,branch%2?0x71875a:0x536d4c);
        }
      }
    } else if(kind==='scrub') for(let shoot=0;shoot<9;shoot++) {
      const a=shoot*2.4,h=.41+.33*Math.sin(shoot*.8)**2,x=Math.cos(a)*(.16+shoot%3*.035),z=Math.sin(a)*(.16+shoot%3*.035);
      leaf([x-.014,0,z],[x+.014,0,z],[x+.045,h,z+.05],[x+.025,h,z+.05],0x6f7250);
      for(let j=1;j<=5;j++)for(const side of [-1,1]) {
        const y=h*(j/6+(side>0?.035:0)),r=(.11+.05*Math.sin(j))*(1-j*.07),end=[x+Math.cos(a+.3*j)*r*side,y+.045,z+Math.sin(a+.3*j)*r*side];
        leaf([x,y-.04,z],end,[end[0]+.04,y+.09,end[2]+.025],[x+.025,y+.012,z+.02],shoot%2?0x829060:0x667952);
      }
    } else for(let stem=0;stem<3;stem++) {
      const a=stem*2.1,x=Math.cos(a)*.17,z=Math.sin(a)*.17,h=.29+stem*.075;
      leaf([x-.012,0,z],[x+.012,0,z],[x+.014,h,z],[x-.01,h,z],0x687e50);
      for(const side of [-1,1])leaf([x,h*.5,z],[x+side*.2,h*.6,z+.04],[x+side*.06,h*.53,z+.07],[x,h*.48,z],0x718953);
      for(let petal=0;petal<6;petal++) {
        const t=petal*Math.PI/3,n=t+.5,r=.055+.013*Math.sin(petal*2+stem)**2;
        leaf([x,h,z],[x+Math.cos(t)*r,h+.014,z+Math.sin(t)*r],[x+Math.cos(n)*r,h+.02,z+Math.sin(n)*r],[x,h+.018,z],stem%2?0xb9aa82:0xa8a0b1);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  }
  for(const kind of ['fern','flower','scrub']) {
    const points=[];
    for(const zone of o.zones??[]) if(zone.kind===kind) for(let i=0;i<(zone.count??12);i++) {
      const angle=random()*Math.PI*2,r=Math.sqrt(random())*zone.radius,x=zone.center[0]+Math.cos(angle)*r,z=zone.center[1]+Math.sin(angle)*r;
      if(x<x0+.8||x>x1-.8||z<z0+.8||z>z1-.8||(o.exclusions??[]).some(([a,b,c,d])=>x>a-.68&&x<c+.68&&z>b-.68&&z<d+.68))continue;
      if((o.paths??[]).some(path=>path.points.slice(1).some((b,i)=>{const a=path.points[i],dx=b[0]-a[0],dz=b[2]-a[2],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t)<path.width/2+.7;})))continue;
      const y=surface(x,z),slope=Math.hypot(surface(x+.25,z)-surface(x-.25,z),surface(x,z+.25)-surface(x,z-.25))*2;
      if(slope>.45)continue;points.push([x,y-.035,z,.7+random()*.45,random()*Math.PI*2]);
    }
    if(!points.length)continue;
    const mesh=new T.InstancedMesh(plant(kind),new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}),points.length),pose=new T.Object3D();
    const tint=new T.Color();points.forEach(([x,y,z,s,yaw],i)=>{pose.position.set(x,y,z);pose.rotation.set(0,yaw,0);pose.scale.setScalar(s);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);tint.set(kind==='flower'?0xe4dfcf:0xcbd1b3).multiplyScalar(.91+random()*.12);mesh.setColorAt(i,tint);});
    mesh.name='mountain-'+kind;mesh.receiveShadow=true;mesh.raycast=()=>{};root.add(mesh);
  }
  return {root};
};
