// 第一人称步枪. 静态零件按材质合批, 弹匣/枪机/双手独立动画, 无模型外依赖.
FPS.models.rifle = T => {
  const root=new T.Group(),body=new T.Group(),magazine=new T.Group(),bolt=new T.Group(),left=new T.Group(),right=new T.Group();root.add(body);body.add(magazine,bolt,left,right);
  const grain=new Uint8Array(64*64*4);let seed=61;
  for(let i=0;i<grain.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=227+(seed/4294967296-.5)*24;grain.set([v,v,v,255],i);}
  const finish=new T.DataTexture(grain,64,64);finish.wrapS=finish.wrapT=T.RepeatWrapping;finish.generateMipmaps=true;finish.minFilter=T.LinearMipmapLinearFilter;finish.magFilter=T.LinearFilter;finish.needsUpdate=true;
  const materials=[new T.MeshStandardMaterial({color:0x42514b,metalness:.7,roughness:.46,roughnessMap:finish}),new T.MeshStandardMaterial({color:0x17221f,roughness:.84,roughnessMap:finish}),new T.MeshStandardMaterial({color:0xae9c72,metalness:.12,roughness:.67,roughnessMap:finish}),new T.MeshStandardMaterial({color:0x708078,metalness:.85,roughness:.32}),new T.MeshStandardMaterial({color:0x617066,roughness:.93}),new T.MeshBasicMaterial({color:0xcaf2ac})];
  const batches=new Map(),pose=new T.Object3D();
  function add(source,mat,parent=body,p=[0,0,0],r=[0,0,0]){const g=source.index?source.toNonIndexed():source;if(g!==source)source.dispose();pose.position.set(...p);pose.rotation.set(...r);pose.scale.setScalar(1);pose.updateMatrix();g.applyMatrix4(pose.matrix);if(!batches.has(parent))batches.set(parent,new Map());const parts=batches.get(parent);if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(g);}
  function box(size,p,mat=0,parent=body,r=[0,0,0],bevel=.003){
    const [w,h,d]=size,b=Math.min(bevel,w*.18,h*.18,d*.18),shape=new T.Shape();shape.moveTo(-w/2+b,-h/2+b);shape.lineTo(w/2-b,-h/2+b);shape.lineTo(w/2-b,h/2-b);shape.lineTo(-w/2+b,h/2-b);shape.closePath();
    add(new T.ExtrudeGeometry(shape,{depth:d-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:1,steps:1,curveSegments:1}).translate(0,0,-d/2+b),mat,parent,p,r);
  }
  function tube(radius,length,p,mat=0,parent=body){add(new T.CylinderGeometry(radius,radius,length,12).rotateX(Math.PI/2),mat,parent,p);}
  // 上下机匣、枪托与护木具有分层轮廓, 枪管和消焰器使用连续圆形截面.
  box([.137,.158,.48],[0,.008,-.19]);box([.145,.065,.39],[0,.113,-.22],2);
  box([.106,.09,.27],[0,-.105,-.09],0);box([.084,.19,.115],[0,-.185,.09],1,body,[.23,0,0]);
  box([.077,.065,.18],[0,.028,.13],0);box([.109,.143,.245],[0,.005,.31],2,body,[-.035,0,0]);box([.116,.155,.028],[0,.005,.443],1);
  box([.16,.113,.37],[0,.014,-.594],2);tube(.021,.32,[0,.015,-.92]);tube(.033,.105,[0,.015,-1.09],0);tube(.023,.012,[0,.015,-1.148],1);
  for(const side of [-1,1]){
    box([.013,.044,.29],[side*.083,.025,-.59],1);
    for(let z=-.48;z>-.74;z-=.055)box([.006,.018,.026],[side*.091,.025,z],0);
    box([.008,.04,.16],[side*.073,.045,-.14],1);
    for(const z of [-.37,-.03])tube(.009,.006,[side*.077,-.02,z],3,body);
  }
  // 顶部导轨和机械瞄具留出连续瞄准通道, 不增加发光大面.
  box([.064,.017,.61],[0,.083,-.42],0);
  for(let z=-.16;z>-.72;z-=.045)box([.083,.012,.018],[0,.098,z],0);
  for(const side of [-1,1])box([.012,.076,.035],[side*.043,.159,-.17],0);
  box([.098,.014,.035],[0,.204,-.17],0);box([.014,.049,.022],[0,.116,-.8],0);box([.008,.012,.008],[0,.146,-.8],5);
  box([.01,.07,.18],[.077,.035,-.19],1);box([.014,.032,.115],[.083,.037,-.175],3,bolt);
  box([.027,.018,.056],[.087,.015,-.075],0,bolt);
  // 扳机护圈分段留空, 拇指和手指不与机匣穿插.
  box([.08,.018,.11],[0,-.172,.025],0);for(const z of [-.029,.079])box([.012,.06,.016],[.033,-.146,z],0);
  box([.012,.04,.015],[0,-.143,.024],3,body,[.18,0,0]);
  box([.1,.239,.117],[0,0,0],2,magazine,[-.11,0,0]);box([.111,.024,.132],[0,-.123,.012],1,magazine);
  for(const side of [-1,1])for(const z of [-.033,.01,.044])box([.005,.16,.008],[side*.052,-.008,z],0,magazine,[-.11,0,0],.001);
  function hand(parent,support){
    box([.104,.105,.14],[0,0,0],1,parent,[support?-.16:.22,0,0],.012);
    box([.075,.066,.26],[0,-.014,.165],4,parent,[support?-.12:.04,0,0],.012);
    box([.09,.022,.055],[0,.044,.073],2,parent,[0,0,0],.004);
    for(let i=0;i<4;i++)box([.024,.052,.067],[-.036+i*.024,-.035,-.052],1,parent,[.34,0,0],.006);
    box([.035,.064,.065],[support?.056:-.056,.006,.004],1,parent,[0,0,support?-.48:.48],.008);
  }
  hand(left,true);hand(right,false);
  for(const [parent,groups]of batches)for(const [id,parts]of groups){const mesh=new T.Mesh(T.mergeGeometries(parts),materials[id]);mesh.name='rifle-'+(parent===body?'body':parent===magazine?'magazine':parent===bolt?'bolt':parent===left?'support':'trigger')+'-'+id;parent.add(mesh);parts.forEach(g=>g.dispose());}
  const muzzle=new T.Object3D();muzzle.position.set(0,.015,-1.155);body.add(muzzle);
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  let disposed=false;
  const model={root,muzzle,update(dt,s){
    const reload=s.reloadProgress===undefined?(s.reload||0)*.5:s.reloadProgress,reloading=reload>0&&reload<1;
    const lower=reloading?smooth(reload/.17)*(1-smooth((reload-.82)/.18)):0;
    const kick=s.recoil||0,travel=reloading?smooth((reload-.17)/.16)*(1-smooth((reload-.55)/.2)):0;
    body.position.set(Math.sin(s.time*9)*s.walk*.006-lower*.09,Math.abs(Math.cos(s.time*9))*s.walk*.009+kick*.022+lower*.12,kick*.105);
    body.rotation.set(kick*.09+lower*.18,kick*.009+lower*.22,lower*-.28-kick*.018);
    magazine.position.set(-travel*.085,-.208-travel*.27,-.1+travel*.055);magazine.rotation.z=travel*-.22;
    magazine.visible=!reloading||reload<.4||reload>.52;
    left.position.set(-.065+lower*.045,-.1-lower*.115-travel*.12,-.49+lower*.39+travel*.045);left.rotation.set(-lower*.12,0,-lower*.3);
    right.position.set(.024,-.18,.12);right.rotation.set(.17,0,0);bolt.position.z=kick*-.032;
  },dispose(){if(disposed)return;disposed=true;finish.dispose();}};
  model.update(0,{time:0,walk:0,recoil:0,reloadProgress:0});return model;
};
