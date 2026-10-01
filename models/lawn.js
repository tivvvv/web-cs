// 修剪草坪: 收边与土面静态合批, 短草实例化并随风轻动.
FPS.models.lawn = (T, o = {}) => {
  const root = new T.Group(), parts = [], canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256);
  let seed = 819;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const shade = 175 + (random() - .5) * 28 + 9 * Math.sin(x * Math.PI / 128) * Math.cos(y * Math.PI / 64), i = (y * 256 + x) * 4;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0); ctx.lineWidth = .8;
  for (let i = 0; i < 4200; i++) {
    const x = random() * 256, y = random() * 256, dx = (random() - .5) * 5, dy = 2 + random() * 4, shade = 115 + random() * 110;
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    // 边缘草纹回绕, 缩小时使用 mipmap, 避免远处产生颗粒闪烁.
    for (const ox of [0, x < 5 ? 256 : -256]) for (const oy of [0, -256]) {
      ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + dx, y + oy + dy); ctx.stroke();
    }
  }
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 4;
  function add(g, outer, inner = outer, repeat = 1 / 1.2) {
    const p = g.attributes.position, colors = [], uv = [], palette = [new T.Color(outer), new T.Color(inner)];
    for (let i = 0; i < p.count; i++) {
      uv.push(p.getX(i) * repeat, p.getZ(i) * repeat);
      const c = palette[i < 4 ? 0 : 1], shade = 1 + .035 * Math.sin(p.getX(i) * .47 + p.getZ(i) * .31);
      colors.push(c.r * shade, c.g * shade, c.b * shade);
    }
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  for (const [x, y, z, w, d] of o.patches ?? []) {
    // 收边和草根均向原地块内收, 石条底部埋入地面, 不占用通道.
    function ring(inset, band, edgeY, outer, inner = outer, repeat = 1 / 1.2) {
      const positions = [], indices = [];
      for (const [offset, lift] of [[inset, edgeY], [inset + band, .006]]) {
        for (const [sx, sz] of [[-1, -1], [-1, 1], [1, 1], [1, -1]]) positions.push(x + sx * (w / 2 - offset), y + lift, z + sz * (d / 2 - offset));
      }
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; indices.push(i, j, i + 4, j, j + 4, i + 4); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      g.setIndex(indices); g.computeVertexNormals(); add(g, outer, inner, repeat);
    }
    ring(0, .1, .003, 0x929184, 0x929184, 6); // 低于石面的接缝底色, 避免缝隙露出亮色铺地.
    // 约 60 厘米一块, 接缝 6 毫米; 顶面高 18 毫米, 上沿做 4 毫米倒角.
    for (const [axis, span, cross] of [[0, w, d], [1, d - .2, w]]) for (const side of [-1, 1]) {
      const count = Math.ceil(span / .6), length = span / count;
      for (let i = 0; i < count; i++) {
        const along = (i + .5) * length - span / 2, across = side * (cross / 2 - .05);
        const g = new T.BoxGeometry(axis ? .1 : length - .006, 1, axis ? length - .006 : .1, 1, 2, 1), p = g.attributes.position;
        for (let j = 0; j < p.count; j++) {
          const top = p.getY(j) > 0, bevel = top ? .004 : 0;
          p.setXYZ(j, p.getX(j) - Math.sign(p.getX(j)) * bevel, top ? .018 : p.getY(j) < 0 ? -.008 : .014, p.getZ(j) - Math.sign(p.getZ(j)) * bevel);
        }
        g.computeVertexNormals(); g.translate(x + (axis ? across : along), y, z + (axis ? along : across));
        const color = [0xc1c3b6, 0xb7bcad, 0xbcc0b2][(i + axis + (side > 0 ? 1 : 0)) % 3];
        add(g, color, color, 6);
      }
    }
    ring(.1, .05, .006, 0x948366, 0x879860); // 5 厘米土色逐渐融入短草.
    add(new T.PlaneGeometry(w - .3, d - .3).rotateX(-Math.PI / 2).translate(x, y + .006, z), 0x879860);
  }
  if (parts.length) {
    const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .003, vertexColors: true, roughness: 1 }));
    mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  }
  const positions = [];
  for(let i=0;i<3;i++) {
    const a=i*2.4, at=(t,side)=>[Math.sin(a)*.2*t*t+Math.cos(a)*.035*(1.-t)*side,t,Math.cos(a)*.2*t*t-Math.sin(a)*.035*(1.-t)*side];
    for(let j=0;j<2;j++) { const t=j/2,u=(j+1)/2; positions.push(...at(t,-1),...at(t,1),...at(u,1),...at(t,-1),...at(u,1),...at(u,-1)); }
  }
  const geometry=new T.BufferGeometry(); geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3)); geometry.computeVertexNormals();
  const grassMaterial=new T.MeshStandardMaterial({side:T.DoubleSide,roughness:1});

  const wind = { value: 0 };
  grassMaterial.customProgramCacheKey = () => 'grass-wind-transmission-v1';
  grassMaterial.onBeforeCompile = shader => {
    shader.uniforms.grassTime = wind;
    shader.vertexShader = 'uniform float grassTime; varying float grassHeight;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      grassHeight=clamp(position.y,0.,1.);
      #ifdef USE_INSTANCING
        float phase=dot(instanceMatrix[3].xyz,vec3(.45,0.,.61));
        transformed.x+=sin(grassTime*1.4+phase)*.10*grassHeight*grassHeight;
        transformed.z+=cos(grassTime*.9+phase)*.06*grassHeight*grassHeight;
      #endif
    `);
    shader.fragmentShader = 'varying float grassHeight;\n'+shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      diffuseColor.rgb*=mix(.55,1.1,smoothstep(0.,.8,grassHeight));
    `).replace('#include <lights_fragment_begin>', `
      #include <lights_fragment_begin>
      #if NUM_DIR_LIGHTS > 0
        float transmission=pow(max(dot(geometryViewDir,-directionalLights[0].direction),0.),3.);
        reflectedLight.directDiffuse+=diffuseColor.rgb*directLight.color*(.04+.24*transmission)*grassHeight;
      #endif
    `);
  };

  const count=(o.patches??[]).reduce((n,[x,y,z,w,d])=>n+Math.floor((w-.4)*(d-.4)*130),0);
  const grass=new T.InstancedMesh(geometry,grassMaterial,count), pose=new T.Object3D(), tint=new T.Color(); let index=0;
  for(const [x,y,z,w,d] of o.patches??[]) for(let i=0,n=Math.floor((w-.4)*(d-.4)*130);i<n;i++) {
    pose.position.set(x+(random()-.5)*(w-.4),y+.007,z+(random()-.5)*(d-.4)); pose.rotation.y=random()*Math.PI*2;
    pose.scale.set(.25+random()*.2,.055+random()*.065,.25+random()*.2); pose.updateMatrix(); grass.setMatrixAt(index,pose.matrix);
    tint.set([0x73894b,0x82945a,0x647e46,0x8b9b5d][i%4]); grass.setColorAt(index++,tint);
  }
  grass.receiveShadow=true; grass.raycast=()=>{}; root.add(grass);
  return { root, update(dt) { wind.value += dt; } };
};
