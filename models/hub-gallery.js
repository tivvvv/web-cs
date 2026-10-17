// 中庭/林荫/海岸木廊. 多段变换和后排柱共用场景尺寸, 三批静态网格, 不依赖其他模型.
FPS.models.hubGallery = (T, o = {}) => {
  const root=new T.Group(),parts=[[],[],[]],pose=new T.Object3D();
  let roof,frame;
  const defaultRoof={width:7,depth:2.6,top:3.1,slope:.045,thickness:.12};
  const pixels=new Uint8Array(128*256*4);let seed=927;
  for(let y=0;y<256;y++)for(let x=0;x<128;x++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const knot=Math.exp(-(((x-47)/12)**2+((y-156)/35)**2)),phase=x*.28+Math.sin(y*.023)*1.2+knot*6;
    const value=193+Math.sin(phase)*6+Math.sin(phase*2.7)*3-knot*13+(seed/4294967296-.5)*8;
    pixels.set([value,value-12,value-32,255],(y*128+x)*4);
  }
  const timber=new T.DataTexture(pixels,128,256);timber.colorSpace=T.SRGBColorSpace;timber.wrapS=timber.wrapT=T.RepeatWrapping;
  timber.generateMipmaps=true;timber.minFilter=T.LinearMipmapLinearFilter;timber.magFilter=T.LinearFilter;timber.anisotropy=4;timber.needsUpdate=true;
  const materials=[new T.MeshStandardMaterial({map:timber,bumpMap:timber,bumpScale:.003,vertexColors:true,roughness:.87}),
    new T.MeshStandardMaterial({vertexColors:true,metalness:.27,roughness:.71}),new T.MeshStandardMaterial({color:0xa9b09e,roughness:.98})];
  materials.forEach(m=>m.shadowSide=T.FrontSide);
  function add(source,batch,color=0xffffff) {
    const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();
    if(batch<2){const values=[],c=new T.Color(color);for(let i=0;i<g.attributes.position.count;i++)values.push(c.r,c.g,c.b);g.setAttribute('color',new T.Float32BufferAttribute(values,3));}
    g.applyMatrix4(frame);parts[batch].push(g);
  }
  function box(size,p,batch=0,color=0xb9aa87,sloped=false) {
    const g=new T.BoxGeometry(...size),a=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    if(batch===0)for(let i=0;i<a.count;i++) {
      const v=[a.getX(i),a.getY(i),a.getZ(i)],normal=[n.getX(i),n.getY(i),n.getZ(i)],axes=[0,1,2].filter(k=>Math.abs(normal[k])<.5).sort((x,y)=>size[x]-size[y]);
      uv.setXY(i,v[axes[0]]/.35,v[axes[1]]/1.2);
    }
    g.translate(...p);
    if(sloped){for(let i=0;i<a.count;i++)a.setY(i,a.getY(i)+a.getZ(i)*roof.slope);g.computeVertexNormals();}
    add(g,batch,color);
  }
  function beam(a,b,r=.024,color=0x637a69) {
    const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.clone().sub(A);
    pose.position.copy(A).add(B).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());pose.updateMatrix();
    add(new T.CylinderGeometry(r,r,v.length(),6).applyMatrix4(pose.matrix),1,color);
  }
  for(const run of o.runs??[{roof:o.roof,posts:o.posts}]) {
    roof=run.roof??defaultRoof;
    const postZ=roof.depth/2-.1,postTop=roof.top-roof.thickness/2+postZ*roof.slope-.22;
    const posts=run.posts??[-3/7,-1/7,3/7].map(f=>({size:[.18,postTop-.08,.18],offset:[f*roof.width,(postTop+.08)/2,postZ]}));
    const transform=new T.Object3D();transform.position.set(...(run.position??[0,0,0]));transform.rotation.y=run.yaw??0;transform.updateMatrix();frame=transform.matrix;
    const underside=roof.top-roof.thickness/2;
    box([roof.width,roof.thickness,roof.depth],[0,roof.top,0],1,0x425e50,true);
    // 细立边有高度, 不与屋面重叠共面. 后檐止于服务点前沟, 保留两个屋面的排水间隙.
    for(const side of [-1,1])box([.06,.16,roof.depth],[side*(roof.width/2+.03),roof.top-.03,0],1,0x526e5b,true);
    for(const side of [-1,1])box([roof.width,.16,.06],[0,roof.top-.03,side*(roof.depth/2+.03)],1,0x526e5b,true);
    const ribCount=Math.ceil(roof.width/.65);
    for(let i=1;i<ribCount;i++)box([.022,.027,roof.depth-.08],[-roof.width/2+i*roof.width/ribCount,roof.top+roof.thickness/2+.0135,0],1,0x617c65,true);
    const beamZ=posts[0]?.offset[2]??1.2,beamTop=underside+beamZ*roof.slope;
    box([roof.width-.6,.22,.18],[0,beamTop-.11,beamZ],0,0xa59674);
    for(const post of posts) {
      box(post.size,post.offset);
      const [x,,z]=post.offset,bottom=post.offset[1]-post.size[1]/2;
      box([.32,bottom,.32],[x,bottom/2,z],2);
      // 柱脚套箍/螺栓/悬挑斜撑均属于合批外观, 身体只使用场景柱和柱脚碰撞.
      for(const side of [-1,1])box([.025,.14,.23],[x+side*.115,bottom+.07,z],1,0x5c7364);
      for(const side of [-1,1])box([.038,.016,.038],[x+side*.12,bottom+.008,z+.13],1,0x71816e);
      box([.14,.16,roof.depth-.16],[x,underside-.08,0],0,0xae9d7a,true);
      beam([x,beamTop-.7,z-.11],[x,underside-.19,-.12],.027);
      for(const side of [-1,1])beam([x+side*.09,beamTop-.42,z],[x+side*.48,beamTop-.24,z],.021);
    }
    const gutterZ=-roof.depth/2-.13,gutterY=roof.top-roof.depth/2*roof.slope-.14;
    box([roof.width+.12,.025,.16],[0,gutterY,gutterZ],1,0x748975);
    for(const side of [-1,1])box([roof.width+.12,.09,.022],[0,gutterY+.0575,gutterZ+side*.069],1,0x748975);
  }
  const names=['gallery-timber','gallery-roof-metal','gallery-footings'];
  parts.forEach((list,i)=>{if(!list.length)return;const mesh=new T.Mesh(T.mergeGeometries(list),materials[i]);mesh.name=names[i];mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);list.forEach(g=>g.dispose());});
  let disposed=false;return {root,dispose(){if(disposed)return;disposed=true;timber.dispose();}};
};
