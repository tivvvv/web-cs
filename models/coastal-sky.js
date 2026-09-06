// 天空与体积积云. 云体使用三维密度场和光线步进, 不使用球体堆叠或透明图片.
FPS.models.coastalSky = (T, options = {}) => {
  const root = new T.Group();
  const steps = Math.max(24, Math.min(80, Math.round(options.steps || 48)));
  const material = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: new T.Vector3(-.48, .72, -.32).normalize() } },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld=(modelMatrix*vec4(position,1.)).xyz;
        gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
        gl_Position.z=gl_Position.w;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSun;
      varying vec3 vWorld;
      float hash(vec3 p) {
        p=fract(p*.3183099+vec3(.17,.31,.53)); p*=17.;
        return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
      }
      float noise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float fbm(vec3 p) {
        float f=.54*noise(p); p=p*2.03+11.7;
        f+=.27*noise(p); p=p*2.07+8.3;
        f+=.13*noise(p); p=p*2.01+13.1;
        return f+.06*noise(p);
      }
      float ellipsoid(vec3 p,vec3 c,vec3 r) { return 1.-length((p-c)/r); }
      float density(vec3 world) {
        vec3 p=world*.0025; p.x-=uTime*.0007;
        // 右侧高耸积云有宽阔云底和不对称云塔, 左侧云带留出蓝天.
        float shape=ellipsoid(p,vec3(1.9,.67,-2.85),vec3(1.45,.43,.72));
        shape=max(shape,ellipsoid(p,vec3(2.05,1.08,-2.95),vec3(.93,.75,.63)));
        shape=max(shape,ellipsoid(p,vec3(2.18,1.65,-3.04),vec3(.62,.6,.55)));
        shape=max(shape,ellipsoid(p,vec3(1.56,1.25,-2.72),vec3(.5,.44,.55)));
        shape=max(shape,ellipsoid(p,vec3(2.69,1.03,-2.9),vec3(.71,.57,.6)));
        shape=max(shape,ellipsoid(p,vec3(-1.65,.65,-2.65),vec3(.95,.32,.62)));
        shape=max(shape,ellipsoid(p,vec3(-2.03,.88,-2.8),vec3(.37,.4,.45)));
        shape=max(shape,ellipsoid(p,vec3(-.15,.41,-4.9),vec3(2.9,.19,.62)));
        shape=max(shape,ellipsoid(p,vec3(3.2,.8,1.9),vec3(1.15,.56,1.2)));
        shape=max(shape,ellipsoid(p,vec3(-2.7,.72,2.2),vec3(.93,.47,.9)));
        if(shape<-.22) return 0.;
        float billows=fbm(p*5.2);
        float d=shape+(billows-.5)*.64;
        d-=.12*(1.-noise(p*35.));
        return smoothstep(-.065,.25,d)*smoothstep(.28,.49,p.y);
      }
      void main() {
        vec3 ray=normalize(vWorld-cameraPosition);
        float altitude=max(ray.y,0.);
        vec3 sky=mix(vec3(.49,.70,.81),vec3(.035,.245,.52),pow(altitude,.46));
        float sun=max(dot(ray,uSun),0.);
        sky+=vec3(1.,.8,.52)*pow(sun,420.)*1.8+vec3(.24,.18,.09)*pow(sun,12.);
        if(ray.y>.025) {
          float nearT=max(0.,(118.-cameraPosition.y)/ray.y);
          float farT=min(4200.,(950.-cameraPosition.y)/ray.y);
          float stepSize=max(0.,farT-nearT)/float(${steps});
          float t=nearT+stepSize*.45, transmittance=1.;
          vec3 scattering=vec3(0.);
          for(int i=0;i<${steps};i++) {
            if(transmittance<.012 || t>farT) break;
            vec3 p=cameraPosition+ray*t;
            float d=density(p);
            if(d>.005) {
              float shadow=density(p+uSun*24.)*.55+density(p+uSun*65.)*.8+density(p+uSun*135.)*1.05;
              float light=exp(-shadow*1.5);
              float edge=pow(sun,8.)*.28;
              vec3 cloud=mix(vec3(.29,.39,.51),vec3(1.65,1.62,1.48),light)+edge;
              cloud+=vec3(.11,.14,.17)*smoothstep(170.,800.,p.y);
              float alpha=1.-exp(-d*stepSize*.037);
              float haze=1.-exp(-t*.000065);
              cloud=mix(cloud,sky,haze);
              scattering+=transmittance*alpha*cloud;
              transmittance*=1.-alpha;
            }
            t+=stepSize;
          }
          sky=sky*transmittance+scattering;
        }
        gl_FragColor=vec4(sky,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  const dome = new T.Mesh(new T.SphereGeometry(4800, 32, 20), material);
  // 不透明物体先写入深度, 天空只对未被遮挡的像素计算体积云.
  dome.renderOrder = 100; dome.frustumCulled = false; root.add(dome);
  return { root, update(dt) { material.uniforms.uTime.value += dt; } };
};
