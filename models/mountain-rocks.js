// 连续出露岩层与坡脚碎石. 同一层理方向贯穿岩块, 所有实面合为一个静态网格.
FPS.models.mountainRocks = (T,o={}) => {
  const root=new T.Group(),parts=[];
  function add(source,smooth=false,stone) {
    const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();g.computeVertexNormals();
    const p=g.attributes.position,n=g.attributes.normal,colors=[],uv=[];
    // 同一断面内按面积平均受光, 较大的岩层折角保留, 不改变实面或射线命中.
    if(smooth) {
      const shared=new Map(),faceNormals=[];
      for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1).sub(a),c=new T.Vector3().fromBufferAttribute(p,i+2).sub(a),face=b.cross(c),area=face.length();face.normalize();
        for(let j=i;j<i+3;j++){const key=[p.getX(j),p.getY(j),p.getZ(j)].map(v=>Math.round(v*100000)).join('/');if(!shared.has(key))shared.set(key,[]);shared.get(key).push({index:j,face,area});faceNormals[j]=face;}
      }
      for(const group of shared.values())for(const {index}of group){const average=new T.Vector3();for(const {face,area}of group)if(face.dot(faceNormals[index])>.86)average.addScaledVector(face,area);average.normalize();n.setXYZ(index,average.x,average.y,average.z);}
    }
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),layer=y-x*.12-z*.07;
      const relative=stone?Math.max(0,Math.min(1,(y-stone.position[1])/stone.size[1])):1;
      const damp=Math.max(0,Math.sin(x*.39+z*.27)*.55+Math.cos(z*.61-x*.18)*.25),top=Math.max(0,n.getY(i)-.25);
      const c=new T.Color(0x999783).lerp(new T.Color(0x747e59),damp*top*.38);
      c.lerp(new T.Color(0x827355),Math.max(0,1-relative/.25)*.62);
      c.multiplyScalar(.94+.05*Math.sin(x*.12+z*.17)+Math.sin(layer*.95)*.055+relative*.035);colors.push(c.r,c.g,c.b);
      uv.push((Math.abs(n.getX(i))>.6?z:x)/2.2,layer/2.2);
    }
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));parts.push(g);
  }
  for(const [j,stone]of(o.stones??[]).entries()) {
    const g=new T.IcosahedronGeometry(1,3),p=g.attributes.position,planes=[];
    for(let side=0;side<7;side++){const a=side*Math.PI*2/7+j*.41;planes.push([Math.cos(a),.15+Math.sin(side*2+j)*.23,Math.sin(a),.68+Math.sin(side*1.8+j)*.12]);}
    planes.push([.38,1,-.26,.74],[-.35,1,.2,.88],[0,-1,0,.62]);
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);let radius=Infinity;
      for(const[nx,ny,nz,d]of planes){const dot=x*nx+y*ny+z*nz;if(dot>.00001)radius=Math.min(radius,d/dot);}
      // 大断面保留平整层理, 低幅风化只打破轮廓; 每块岩石的倾向由序号确定.
      radius+=.014*Math.sin(x*3+y*2+z*4+j);
      const lean=.06+.045*Math.sin(j*1.7);p.setXYZ(i,x*radius+y*lean,y*radius,z*radius-y*.055*Math.cos(j*.8));
    }
    g.computeBoundingBox();const b=g.boundingBox;
    for(let i=0;i<p.count;i++)p.setXYZ(i,stone.position[0]+((p.getX(i)-b.min.x)/(b.max.x-b.min.x)-.5)*stone.size[0],
      stone.position[1]+(p.getY(i)-b.min.y)/(b.max.y-b.min.y)*stone.size[1],stone.position[2]+((p.getZ(i)-b.min.z)/(b.max.z-b.min.z)-.5)*stone.size[2]);
    add(g,true,stone);
  }
  for(const [j,stone]of(o.scree??[]).entries()) {
    const g=new T.IcosahedronGeometry(1,0);g.scale(stone.size[0]*.5,stone.size[1]*.5,stone.size[2]*.5);g.rotateY(j*2.4);
    g.translate(stone.position[0],stone.position[1]+stone.size[1]*.5,stone.position[2]);add(g);
  }
  if(o.arch) {
    const {position,length,slope,inner,outer,spring}=o.arch,shape=new T.Shape();shape.moveTo(-outer,0);shape.lineTo(-outer,spring);
    for(let i=0;i<=14;i++){const a=Math.PI-i*Math.PI/14,r=outer*(1+.07*Math.sin(a*3)+.035*Math.sin(a*5));shape.lineTo(Math.cos(a)*r,spring+Math.sin(a)*r);}
    shape.lineTo(outer,0);shape.lineTo(inner,0);shape.lineTo(inner,spring);
    for(let i=0;i<=14;i++){const a=i*Math.PI/14;shape.lineTo(Math.cos(a)*inner,spring+Math.sin(a)*inner);}
    shape.lineTo(-inner,0);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false}),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const along=p.getZ(i)-length/2;p.setXYZ(i,position[0]+along,position[1]+p.getY(i)+along*slope,position[2]-p.getX(i));}
    add(g);
  }
  if(parts.length) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);let seed=82;
    for(let i=0;i<512*512;i++) {
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=i%512,y=Math.floor(i/512),u=x/512*Math.PI*2,vv=y/512*Math.PI*2,layer=y/512*3+Math.sin(u)*.13+Math.sin(u*3)*.035,crack=Math.abs(layer-Math.round(layer));
      // 整周期纹理消除平铺断缝; 小尺度孔隙保持低幅, 远处由 mipmap 平均.
      const v=(crack<.035?91:166)+Math.sin(vv*17+Math.sin(u*9)*.4)*9+(seed/4294967296-.5)*17;pixels.data.set([v,v,v-2,255],i*4);
    }
    ctx.putImageData(pixels,0,0);const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;
    const mesh=new T.Mesh(T.mergeGeometries(parts),new T.MeshStandardMaterial({bumpMap:map,bumpScale:.026,vertexColors:true,roughness:1}));mesh.name='mountain-outcrop';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);parts.forEach(g=>g.dispose());
    return {root,dispose(){map.dispose();}};
  }
  return {root};
};
