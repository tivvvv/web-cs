// 海面采用多方向波形, 菲涅耳反射, 太阳碎光与近岸泡沫. 动画由已有 update 接口驱动.
FPS.models.kamakuraOcean = (T, o = {}) => {
  const root = new T.Group();
  const material = new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSun: { value: new T.Vector3(-.48, .72, -.32).normalize() },
      uBeach: { value: new T.Vector3(o.sandStart ?? -18, o.sandLevel ?? -1.05, o.slope ?? .04) },
      uEdge: { value: new T.Vector3(o.halfWidth ?? 80, o.edgeSlope ?? .045, 150) }
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      float wave(vec2 p) {
        float chop=.085*sin(p.x*.44+p.y*.73+uTime*1.15)
          +.047*sin(p.x*1.17-p.y*.51+uTime*1.6)
          +.023*sin(p.x*2.37+p.y*1.54-uTime*1.9);
        float nearShore=smoothstep(-85.,-58.,p.y), phase=uTime*.68-p.y*.12-p.x*.018;
        return chop*(1.-nearShore*.7)+nearShore*.24*(sin(phase)+.22*sin(phase*2.));
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
      varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      void main() {
        vec2 p=vWorld.xz;
        vec2 slope = .085*cos(p.x*.44+p.y*.73+uTime*1.15)*vec2(.44,.73)
          +.047*cos(p.x*1.17-p.y*.51+uTime*1.6)*vec2(1.17,-.51)
          +.023*cos(p.x*2.37+p.y*1.54-uTime*1.9)*vec2(2.37,1.54);
        float nearShore=smoothstep(-85.,-58.,p.y), phase=uTime*.68-p.y*.12-p.x*.018;
        slope=slope*(1.-nearShore*.7)+nearShore*.24*(cos(phase)+.44*cos(phase*2.))*vec2(-.018,-.12);
        float detailFade=1.-smoothstep(100.,900.,distance(cameraPosition,vWorld));
        slope+=detailFade*.043*vec2(sin(p.x*12.+p.y*9.+uTime*2.8),cos(p.x*7.-p.y*11.+uTime*2.1));
        vec3 n=normalize(vec3(-slope.x,1.,-slope.y));
        vec3 viewDir=normalize(cameraPosition-vWorld);
        float fresnel=.025+.975*pow(1.-max(dot(n,viewDir),0.),5.);
        float depth=1.-smoothstep(-135.,-35.,p.y);
        vec3 water=mix(vec3(.045,.46,.47),vec3(.012,.155,.255),depth);
        vec3 reflection=mix(vec3(.24,.52,.69),vec3(.47,.67,.76),fresnel);
        vec3 color=mix(water,reflection,fresnel*.8);
        float spec=pow(max(dot(n,normalize(uSun+viewDir)),0.),220.);
        color+=vec3(1.8,1.65,1.24)*spec;
        // 使用与沙滩相同的坡面求实际水深, 浪头随水位上滩和退回, 不额外绘制透明水层.
        if(abs(p.x)<uEdge.z && p.y>uBeach.x-60.) {
          float sand=uBeach.y+(p.y-uBeach.x)*uBeach.z-max(0.,abs(p.x)-uEdge.x)*uEdge.y;
          float waterDepth=max(0.,vWorld.y-sand), grain=noise(p*3.+vec2(0.,uTime*.22));
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
  return { root, update(dt) { material.uniforms.uTime.value += dt; } };
};
