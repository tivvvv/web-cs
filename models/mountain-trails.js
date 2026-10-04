// 登山石阶, 崖边栈道与连续栏杆. 场景共用盒体/杆件规格, 模型不参与移动逻辑.
FPS.models.mountainTrails = (T, o = {}) => {
  const root = new T.Group(), parts = [[], [], []], pose = new T.Object3D();
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256); let seed = 211;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const row=Math.floor(y/128),u=(x+(row%2)*64)%128,v=y%128;
    const mortar=u<3||v<3,block=7*Math.sin(Math.floor((x+(row%2)*64)/128)*2.3+row*1.7);
    const value = (mortar?183:234+block) + (seed / 4294967296 - .5) * 18 + Math.sin(x * .057) * Math.cos(y * .06) * 4;
    pixels.data.set([value, value, value - 3, 255], (y * 256 + x) * 4);
  }
  ctx.putImageData(pixels, 0, 0); const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
  const woodCanvas = document.createElement('canvas'); woodCanvas.width = woodCanvas.height = 256;
  const wc = woodCanvas.getContext('2d'), woodPixels = wc.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const u=x/256*Math.PI*2,v=y/256*Math.PI*2;
    const plank=Math.floor(x/32),knot=Math.exp(-(((x%32)/32-.5)**2/.023+Math.sin((v-1.4-plank*1.7)/2)**2/.022));
    const value = x % 32 < 1 ? 164 : 226 + Math.sin(u*13+Math.sin(v)*.55+knot*1.8)*10 + Math.sin(u*31+Math.sin(v*2)*.8)*4-knot*18 + (seed / 4294967296 - .5) * 12;
    woodPixels.data.set([value, value, value - 3, 255], (y * 256 + x) * 4);
  }
  wc.putImageData(woodPixels, 0, 0); const woodMap = new T.CanvasTexture(woodCanvas); woodMap.colorSpace = T.SRGBColorSpace; woodMap.wrapS = woodMap.wrapT = T.RepeatWrapping; woodMap.anisotropy = 8;
  function add(source, kind) {
    const g = source.index ? source.toNonIndexed() : source; if (g !== source) source.dispose();
    const c = new T.Color(kind === 'rail' ? 0x635c48 : kind === 'wood' ? 0x967958 : kind === 'leg' ? 0x596d65 : 0xb8ae98), rgb = [];
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const weather=kind==='wood'?.95+.045*Math.sin(p.getX(i)*1.7+p.getZ(i)*.71):1;
      const shade = (n.getY(i) < -.5 ? .72 : n.getY(i)>.5?1:.93)*weather; rgb.push(c.r * shade, c.g * shade, c.b * shade);
      const top=Math.abs(n.getY(i))>.5,across=Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i);
      if (kind === 'wood') uv.setXY(i, top?p.getX(i)/2.2:across/.7, (top?p.getZ(i):p.getY(i))/3);
      else uv.setXY(i, across*(top?.55:.6), (top?p.getZ(i):p.getY(i))*(top?.55:1.8));
    }
    g.setAttribute('color', new T.Float32BufferAttribute(rgb, 3)); parts[kind === 'wood' ? 2 : kind === 'rail' || kind === 'leg' ? 1 : 0].push(g);
  }
  // 倒角向盒内收, 外包围尺寸/顶面高程与碰撞共用规格, 不叠加边缘片.
  function bevel(size,edge) {
    const h=size.map(v=>v/2),e=Math.min(edge,...size.map(v=>v*.08)),positions=[];
    function face(points){const a=new T.Vector3(...points[0]),b=new T.Vector3(...points[1]).sub(a),c=new T.Vector3(...points[2]).sub(a),center=points.reduce((sum,p)=>sum.add(new T.Vector3(...p)),new T.Vector3());
      if(b.cross(c).dot(center)<0)points.reverse();for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]])positions.push(...p);}
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]) {
      const a=(axis+1)%3,b=(axis+2)%3;
      face([[-1,-1],[1,-1],[1,1],[-1,1]].map(([sa,sb])=>{const p=[0,0,0];p[axis]=sign*h[axis];p[a]=sa*(h[a]-e);p[b]=sb*(h[b]-e);return p;}));
    }
    for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)for(const sa of [-1,1])for(const sb of [-1,1]) {
      const axis=3-a-b;face([[0,-1],[1,-1],[1,1],[0,1]].map(([t,s])=>{const p=[0,0,0];p[a]=sa*(h[a]-e*t);p[b]=sb*(h[b]-e*(1-t));p[axis]=s*(h[axis]-e);return p;}));
    }
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])face([0,1,2].map(axis=>[x,y,z].map((sign,i)=>sign*(h[i]-(i===axis?0:e)))));
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));g.computeVertexNormals();return g;
  }
  for (const b of o.boxes ?? []) {
    const kind=b.kind??'stone',g=kind==='stone'||kind==='wood'?bevel(b.size,kind==='stone'?.023:.008):new T.BoxGeometry(...b.size);
    add(g.translate(...b.offset),kind);
  }
  // 路基用实体斜裙与坡面相接, 顶面退入踏步; 不叠加共面装饰片.
  for (const f of o.footings ?? []) {
    const dx=f.b[0]-f.a[0],dz=f.b[2]-f.a[2],length=Math.hypot(dx,dz),nx=-dz/length*f.width/2,nz=dx/length*f.width/2;
    const vertices=[];
    for (const [p,bottom] of [[f.a,f.bottom[0]],[f.b,f.bottom[1]]])
      for (const y of [bottom,p[1]]) for (const side of [-1,1]) vertices.push(p[0]+nx*side,y,p[2]+nz*side);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    g.setIndex([0,1,2,1,3,2,4,6,5,5,6,7,0,2,4,2,6,4,1,5,3,3,5,7,0,4,1,1,4,5,2,3,6,3,7,6]);
    const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();
    flat.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(flat.attributes.position.count*2),2));add(flat,'stone');
  }
  for (const b of o.beams ?? []) {
    const from = new T.Vector3(...b.a), delta = new T.Vector3(...b.b).sub(from);
    pose.position.copy(from).addScaledVector(delta, .5); pose.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.clone().normalize()); pose.updateMatrix();
    add(new T.CylinderGeometry(b.radius ?? .035, b.radius ?? .035, delta.length(), 8).applyMatrix4(pose.matrix), b.kind ?? 'rail');
    if((b.kind??'rail')==='rail'&&delta.y>0&&Math.hypot(delta.x,delta.z)<1e-6) {
      // 栏柱脚座落到原板面并包住柱底. 低面数六角螺栓并入金属批次, 不加身体碰撞.
      const [x,y,z]=b.a;add(new T.BoxGeometry(.16,.046,.16).translate(x,y-.02,z),'leg');
      const decks=(o.boxes??[]).filter(d=>{const top=d.offset[1]+d.size[1]/2;return top>=y-.07&&top<=y&&Math.abs(x-d.offset[0])<=d.size[0]/2+.08&&Math.abs(z-d.offset[2])<=d.size[2]/2+.08;});
      const anchors=[];
      for(const sx of [-1,1])for(const sz of [-1,1])for(const [u,v]of [[.05,.05],[.06,.03],[.03,.06]]) {
        const a=[sx*u,sz*v];if(decks.some(d=>Math.abs(x+a[0]-d.offset[0])<=d.size[0]/2-.016&&Math.abs(z+a[1]-d.offset[2])<=d.size[2]/2-.016))anchors.push(a);
      }
      // 边缘柱的两个螺栓都朝板内固定, 避免把紧固件悬在栈道外侧.
      let pair=[],distance=0;for(const a of anchors)for(const b of anchors){const d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(d>distance){pair=[a,b];distance=d;}}
      for(const [dx,dz]of pair)add(new T.CylinderGeometry(.013,.015,.014,6).translate(x+dx,y+.005,z+dz),'leg');
    }
  }
  parts.forEach((batch, i) => { if (!batch.length) return; const surface = i === 2 ? woodMap : i === 0 ? map : null; const mesh = new T.Mesh(T.mergeGeometries(batch), new T.MeshStandardMaterial({ map: surface, bumpMap: surface, bumpScale: .004, vertexColors: true, roughness: i === 1 ? .65 : .88, metalness: i === 1 ? .38 : 0 })); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); batch.forEach(g => g.dispose()); });
  return { root, dispose() { map.dispose(); woodMap.dispose(); } };
};
