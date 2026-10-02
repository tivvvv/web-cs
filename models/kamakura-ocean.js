// 海面采用像素过滤波纹, 菲涅耳反射, 太阳碎光与近岸泡沫. 动画由已有 update 接口驱动.
FPS.models.kamakuraOcean = (T, o = {}) => {
  const root = new T.Group();
  const material = new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSun: { value: new T.Vector3(...(o.sun ?? [-32, 48, -21])).normalize() },
      uBeach: { value: new T.Vector3(o.sandStart ?? -18, o.sandLevel ?? -1.05, o.slope ?? .04) },
      uEdge: { value: new T.Vector3(o.halfWidth ?? 80, o.edgeSlope ?? .045, 150) },
      uHarbor: { value: o.harbor?.bounds ?? [1, 1, 0, 0] }, uHarborFloor: { value: o.harbor?.bottom ?? -6 }
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      float wave(vec2 p) {
        // 网格约 3.2 米一格, 短波只参与材质法线; 粗远海及侧翼保持稳定平面.
        float chop=.085*sin(p.x*.44+p.y*.73+uTime*1.15)*(1.-smoothstep(95.,240.,-p.y));
        float nearShore=smoothstep(-85.,-58.,p.y), phase=uTime*.68-p.y*.12-p.x*.018;
        return (chop*(1.-nearShore*.7)+nearShore*.24*(sin(phase)+.22*sin(phase*2.)))*(1.-smoothstep(210.,250.,abs(p.x)));
      }
      void main() {
        vec4 world = modelMatrix * vec4(position,1.);
        world.y += wave(world.xz);
        vWorld=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSun;
      uniform vec3 uBeach, uEdge;
      uniform vec4 uHarbor;
      uniform float uHarborFloor;
      varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      vec2 filteredSlope(float phase, vec2 frequency, vec2 amplitude, vec2 dx, vec2 dy, inout vec3 covariance) {
        // 相位跨越一个像素的幅度, 包含掠射视角压缩; 亚像素波纹在混叠前渐退.
        float span=abs(dot(frequency,dx))+abs(dot(frequency,dy));
        float weight=1.-smoothstep(.6,2.4,span);
        covariance+=.5*vec3(amplitude.x*amplitude.x,amplitude.y*amplitude.y,amplitude.x*amplitude.y)*(1.-weight*weight);
        return amplitude*cos(phase)*weight;
      }
      void main() {
        vec2 p=vWorld.xz, dx=dFdx(p), dy=dFdy(p);
        float nearShore=smoothstep(-85.,-58.,p.y), phase=uTime*.68-p.y*.12-p.x*.018;
        float chop=1.-nearShore*.7;
        vec3 covariance=vec3(0.);
        vec2 slope=filteredSlope(p.x*.44+p.y*.73+uTime*1.15,vec2(.44,.73),chop*.085*vec2(.44,.73),dx,dy,covariance);
        slope+=filteredSlope(p.x*1.17-p.y*.51+uTime*1.6,vec2(1.17,-.51),chop*.047*vec2(1.17,-.51),dx,dy,covariance);
        slope+=filteredSlope(p.x*2.37+p.y*1.54-uTime*1.9,vec2(2.37,1.54),chop*.023*vec2(2.37,1.54),dx,dy,covariance);
        slope+=filteredSlope(phase,vec2(-.018,-.12),nearShore*.24*vec2(-.018,-.12),dx,dy,covariance);
        slope+=filteredSlope(phase*2.,vec2(-.036,-.24),nearShore*.24*.44*vec2(-.018,-.12),dx,dy,covariance);
        float detailFade=1.-smoothstep(100.,900.,distance(cameraPosition,vWorld));
        slope+=filteredSlope(p.x*12.+p.y*9.+uTime*2.8-1.5707963,vec2(12.,9.),vec2(detailFade*.043,0.),dx,dy,covariance);
        slope+=filteredSlope(p.x*7.-p.y*11.+uTime*2.1,vec2(7.,-11.),vec2(0.,detailFade*.043),dx,dy,covariance);
        vec3 n=normalize(vec3(-slope.x,1.,-slope.y));
        vec3 viewDir=normalize(cameraPosition-vWorld);
        // 按视线方向平均未解析微波的反射, 防止退纹后远海变成过亮镜面.
        float facing=dot(n,viewDir), spread=.7978846*sqrt(max(0.,covariance.x*viewDir.x*viewDir.x+covariance.y*viewDir.z*viewDir.z+2.*covariance.z*viewDir.x*viewDir.z));
        float fresnel=.025+.4875*(pow(1.-clamp(facing-spread,0.,1.),5.)+pow(1.-clamp(facing+spread,0.,1.),5.));
        float depth=1.-smoothstep(-135.,-35.,p.y);
        vec3 water=mix(vec3(.045,.46,.47),vec3(.012,.155,.255),depth);
        vec3 reflection=mix(vec3(.24,.52,.69),vec3(.47,.67,.76),fresnel);
        vec3 color=mix(water,reflection,fresnel*.8);
        // 将被过滤的法线能量并入高光宽度, 保留碎光能量而不产生亚像素亮点.
        vec3 nx=dFdx(n), ny=dFdy(n);
        float variance=covariance.x+covariance.y;
        float power=1./(1./220.+variance+.25*(dot(nx,nx)+dot(ny,ny)));
        float spec=pow(max(dot(n,normalize(uSun+viewDir)),0.),power)*(power+2.)/222.;
        color+=vec3(1.8,1.65,1.24)*spec;
        // 使用与沙滩相同的坡面求实际水深, 浪头随水位上滩和退回, 不额外绘制透明水层.
        if(abs(p.x)<uEdge.z && p.y>uBeach.x-60.) {
          float sand=uBeach.y+(p.y-uBeach.x)*uBeach.z-max(0.,abs(p.x)-uEdge.x)*uEdge.y;
          if(p.x>=uHarbor.x && p.y>=uHarbor.y && p.x<=uHarbor.z && p.y<=uHarbor.w) sand=min(sand,uHarborFloor);
          float waterDepth=max(0.,vWorld.y-sand), grainWeight=1.-smoothstep(.3,1.2,3.*max(length(dx),length(dy)));
          float grain=mix(.5,noise(p*3.+vec2(0.,uTime*.22)),grainWeight);
          color=mix(vec3(.31,.27,.18)*(.94+grain*.12),color,smoothstep(0.,.38,waterDepth));
          float foam=(1.-smoothstep(.012,.075,waterDepth))*smoothstep(0.,.018,waterDepth);
          foam*=smoothstep(.18,.72,grain)*(.65+.35*sin(phase));
          color=mix(color,vec3(.83,.89,.84),foam);
        }
        float haze=1.-exp(-distance(cameraPosition,vWorld)*.00029);
        color=mix(color,vec3(.47,.66,.75),haze);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  // 近海有足够网格支撑波形, 远海只用低细分平面延伸地平线.
  const near = new T.Mesh(new T.PlaneGeometry(500, 485, 160, 150), material);
  near.rotation.x = -Math.PI / 2; near.position.set(0, -2.05, -272.5); root.add(near);
  const far = new T.Mesh(new T.PlaneGeometry(6000, 4600, 24, 24), material);
  far.rotation.x = -Math.PI / 2; far.position.set(0, -2.05, -2815); root.add(far);
  for (const side of [-1, 1]) {
    const wing = new T.Mesh(new T.PlaneGeometry(2750, 485, 12, 8), material);
    wing.rotation.x = -Math.PI / 2; wing.position.set(side * 1625, -2.05, -272.5); root.add(wing);
  }
  // 新岸线只补原近海北缘之外的水面, 共用波形和时间, 接缝处不重叠.
  for (const [x, z, w, d] of o.harbors ?? []) {
    // 接边顶点对齐原近海的横向采样格, 避免不同波形插值在接缝处裂开.
    const cell = 500 / 160, x0 = Math.floor((x - w / 2) / cell) * cell, x1 = Math.ceil((x + w / 2) / cell) * cell;
    const harbor = new T.Mesh(new T.PlaneGeometry(x1 - x0, d, Math.round((x1 - x0) / cell), Math.ceil(d / (485 / 150))), material);
    harbor.rotation.x = -Math.PI / 2; harbor.position.set((x0 + x1) / 2, -2.05, z); root.add(harbor);
  }
  return { root, update(dt) { material.uniforms.uTime.value += dt; } };
};
