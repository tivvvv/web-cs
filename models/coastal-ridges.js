// 北东远景山脊. 近边界共用山体剖面, 渐变到远处岩肩; 仅静态背景, 不接管控制或渲染.
FPS.models.coastalRidges = (T,o={}) => {
  const root=new T.Group(),positions=[],indices=[],vertices=new Map(),north=o.north??[2.4,2.4],east=o.east??[2.4,2.4];
  const interpolate=(values,t)=>{const u=Math.max(0,Math.min(1,t))*(values.length-1),i=Math.min(values.length-2,Math.floor(u));return values[i]+(values[i+1]-values[i])*(u-i);};
  const clamp=n=>Math.max(0,Math.min(1,n)),grass=o.grassColors??{fresh:[98,125,65],dry:[135,140,83],shade:[70,102,53]};
  const hash=(x,z)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263)^831;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
  function noise(x,z){const i=Math.floor(x),j=Math.floor(z),a=x-i,b=z-j,u=a*a*(3-2*a),v=b*b*(3-2*b);return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;}
  const segments=(o.paths??[]).flatMap(p=>p.points.slice(1).map((b,i)=>({a:p.points[i],b,width:p.width})));
  // 接边法线沿用可玩高度场的单位面平均, 边界颜色采用同一草土/干湿规格.
  function boundaryNormal(x,z) {
    if(!o.heights)return new T.Vector3(0,1,0);
    const [x0,z0,x1,z1]=o.bounds,cols=o.columns,rows=o.rows,dx=(x1-x0)/(cols-1),dz=(z1-z0)/(rows-1),i=Math.round((x-x0)/dx),j=Math.round((z-z0)/dz),key=j*cols+i,sum=new T.Vector3();
    const point=k=>new T.Vector3(x0+k%cols*dx,o.heights[k],z0+Math.floor(k/cols)*dz);
    for(let row=Math.max(0,j-1);row<=Math.min(rows-2,j);row++)for(let col=Math.max(0,i-1);col<=Math.min(cols-2,i);col++){
      const k=row*cols+col;for(const ids of [[k,k+cols,k+1],[k+1,k+cols,k+cols+1]])if(ids.includes(key)){const [a,b,c]=ids.map(point);sum.add(b.sub(a).cross(c.sub(a)).normalize());}
    }
    return sum.normalize();
  }
  function edgeColor(x,y,z,ny) {
    const damp=clamp(.65-noise(x/15,z/15)+.32*Math.exp(-(((x+9-z*.22)/5)**2))),dry=clamp(noise(x/10+7,z/10)*.75+(y-13)/40),rock=clamp((.78-ny)/.23),grain=(noise(x/2,z/2)-.5)*10;
    let path=0,soil=0;const edge=(noise(x/2.4,z/2.4)-.5)*.42;
    for(const {a,b,width}of segments){const dx=b[0]-a[0],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz));path=Math.max(path,clamp((width*.5+.6+edge-Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t))/1.05));}
    for(const {center:[cx,cz],radius:[rx,rz],strength}of o.soilPatches??[]){const w=clamp((1-Math.hypot((x-cx)/rx,(z-cz)/rz))*1.7);soil=Math.max(soil,w*w*(3-2*w)*strength);}
    const earth=Math.max(soil,clamp((noise(x/4+12,z/4)-.52)*1.9+dry*.24))*(1-path),ground=[142-damp*29,117-damp*22,83-damp*15];
    const rgb=grass.fresh.map((v,i)=>{const g=(v*(1-dry)+grass.dry[i]*dry)*(1-damp*.6)+grass.shade[i]*damp*.6;return ((g*(1-earth)+ground[i]*earth)*(1-rock)+[145,143,127][i]*rock)*(1-path)+(ground[i]+path*path*9)*path+grain;});
    for(const [cx,cz,r]of o.woodland??[]){const dark=clamp(1-Math.hypot(x-cx,z-cz)/r)*.13;for(let i=0;i<3;i++)rgb[i]*=1-dark;}
    return new T.Color().setRGB(...rgb.map(v=>clamp(v/255)),T.SRGBColorSpace);
  }
  function height(x,z){
    const d=Math.hypot(Math.max(0,x-50),Math.max(0,z-38)),edge=x>=50&&z<=38?interpolate(east,(z+38)/76):interpolate(north,(x+50)/100);
    const relief=o.relief??1,ridge=7+49*relief*Math.exp(-(((x-130)/75)**2+((z-145)/62)**2))+28*relief*Math.exp(-(((x-25)/52)**2+((z-115)/65)**2));
    const shoulder=20*relief*Math.exp(-(((x-170+z*.2)/47)**2+((z-130)/83)**2));
    const shape=ridge+shoulder+(noise(x/31,z/38)-.5)*6+(noise(x/9+4,z/13)-.5)*2.4,blend=d/(d+13);
    return edge*(1-blend)+shape*blend;
  }
  function vertex(x,z){const key=x+'/'+z;if(vertices.has(key))return vertices.get(key);
    const index=positions.length/3;positions.push(x,height(x,z),z);vertices.set(key,index);
    return index;
  }
  function strip(xs,zs){const grid=[];for(const z of zs)for(const x of xs)grid.push(vertex(x,z));
    for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){const k=j*xs.length+i;indices.push(grid[k],grid[k+xs.length],grid[k+1],grid[k+1],grid[k+xs.length],grid[k+xs.length+1]);}
  }
  // 两翼的交界使用同一采样和索引, 防止 T 形接缝及独立法线造成明暗裂缝.
  const outerX=[50,55,65,81,103,131,165,207,260];
  strip([...Array.from({length:100},(_,i)=>i-50),...outerX],[38,43,53,69,91,119,153,195,239,284]);
  strip(outerX,Array.from({length:77},(_,i)=>i-38));
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  const normals=g.attributes.normal,colors=[];
  for(let i=0;i<positions.length/3;i++){
    const [x,y,z]=positions.slice(i*3,i*3+3),cx=Math.min(50,x),cz=Math.min(38,z),d=Math.hypot(x-cx,z-cz),normal=boundaryNormal(cx,cz);
    const near=edgeColor(cx,height(cx,cz),cz,normal.y),stone=clamp((.82-normals.getY(i))/.36),dry=clamp((y-16)/40+noise(x/32,z/32)*.2);
    const far=new T.Color(0x65784d).lerp(new T.Color(0x94917b),clamp(stone*.8+dry*.4));far.multiplyScalar(.9+noise(x/20,z/20)*.16);far.lerp(new T.Color(0x9dab9f),Math.min(.65,d/480));
    const c=near.lerp(far,1-Math.exp(-d/18));colors.push(c.r,c.g,c.b);
    if(d===0)normals.setXYZ(i,normal.x,normal.y,normal.z);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));mesh.name='coastal-background-ridges';root.add(mesh);
  return {root};
};
