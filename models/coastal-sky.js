// 天空与体积积云. 云体使用三维密度场和光线步进, 不使用球体堆叠或透明图片.
FPS.models.coastalSky = (T, options = {}) => {
  const root = new T.Group();
  const steps = Math.max(24, Math.min(80, Math.round(options.steps || 48)));
  // 同一组云体同时定义密度和保守射线范围; 平移共用时间坐标, 不改变云形或步进间隔.
  const clouds = [
    [[1.9,.67,-2.85],[1.45,.43,.72]], [[2.05,1.08,-2.95],[.93,.75,.63]],
    [[2.18,1.65,-3.04],[.62,.6,.55]], [[1.56,1.25,-2.72],[.5,.44,.55]],
    [[2.69,1.03,-2.9],[.71,.57,.6]], [[-1.65,.65,-2.65],[.95,.32,.62]],
    [[-2.03,.88,-2.8],[.37,.4,.45]], [[-.15,.41,-4.9],[2.9,.19,.62]],
    [[-.25,.83,-2.65],[.95,.3,.65]], [[.15,1.,2.6],[1.2,.36,.85]],
    [[3.2,.8,1.9],[1.15,.56,1.2]], [[-2.7,.72,2.2],[.93,.47,.9]]
  ];
  const vector = a => 'vec3(' + a.join(',') + ')';
  const material = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: new T.Vector3(...(options.sun ?? [-32, 48, -21])).normalize() } },
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
      float ellipsoidSquared(vec3 p,vec3 c,vec3 r) { vec3 q=(p-c)/r; return dot(q,q); }
      void cloudInterval(vec3 origin,vec3 direction,vec3 center,vec3 radius,vec2 limits,inout vec2 span){
        vec3 p=(origin-center)/radius,d=direction/radius;
        float a=dot(d,d),b=dot(p,d),c=dot(p,p)-1.221*1.221,discriminant=b*b-a*c;
        if(discriminant<0.) return;
        float h=sqrt(discriminant),lo=(-b-h)/a,hi=(-b+h)/a;
        if(hi<limits.x||lo>limits.y) return;
        span=vec2(min(span.x,max(lo,limits.x)),max(span.y,min(hi,limits.y)));
      }
      float density(vec3 world) {
        // 沿 +X 以约 1.6 米/秒平移云场, 沿用现有步进与光照计算.
        vec3 p=world*.0025; p.x-=uTime*.004;
        // max(1-length) 等价于 1-sqrt(min(dot)), 每次密度查询只需求一次平方根.
        float squared=1.e20;
        ${clouds.map(([c,r]) => `squared=min(squared,ellipsoidSquared(p,${vector(c)},${vector(r)}));`).join('\n        ')}
        float shape=1.-sqrt(squared);
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
          // 只跳过密度必为零的前后空段, 所有原始采样位置和云内光照探针保持不变.
          vec3 origin=cameraPosition*.0025;origin.x-=uTime*.004;
          vec2 span=vec2(farT,nearT),limits=vec2(nearT,farT);
          ${clouds.map(([c,r]) => `cloudInterval(origin,ray*.0025,${vector(c)},${vector(r)},limits,span);`).join('\n          ')}
          float t=nearT+stepSize*.45, transmittance=1.;
          vec3 scattering=vec3(0.);
          for(int i=0;i<${steps};i++) {
            if(transmittance<.012 || t>farT || t>span.y) break;
            if(t<span.x){t+=stepSize;continue;}
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
  // 天空和地面色带生成环境贴图, 给电车漆面, 玻璃和金属提供统一反光; 无网络资源.
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,0,256);
  for(const [t,color] of [[0,'#417bb0'],[.32,'#86b6cf'],[.48,'#c4d7db'],[.52,'#bbbca3'],[.68,'#7c8063'],[1,'#5e604d']]) gradient.addColorStop(t,color);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);
  const direction=material.uniforms.uSun.value, sx=(.5+Math.atan2(direction.z,direction.x)/(Math.PI*2))*512, sy=(.5-Math.asin(direction.y)/Math.PI)*256;
  for(const offset of [-512,0,512]) {
    const halo=ctx.createRadialGradient(sx+offset,sy,1,sx+offset,sy,28);
    halo.addColorStop(0,'rgba(255,242,205,1)');halo.addColorStop(.14,'rgba(255,233,188,.8)');halo.addColorStop(1,'rgba(255,233,188,0)');
    ctx.fillStyle=halo;ctx.fillRect(0,0,512,128);
  }
  const environment=new T.CanvasTexture(canvas);environment.colorSpace=T.SRGBColorSpace;environment.mapping=T.EquirectangularReflectionMapping;
  let owner, previous, previousIntensity;
  return {
    root, update(dt) { material.uniforms.uTime.value += dt; },
    prepare(renderer, scene) { this.beforeRender(renderer, scene); },
    beforeRender(renderer, scene) {
      if(owner || !root.visible) return;
      owner=scene;previous=scene.environment;previousIntensity=scene.environmentIntensity;
      scene.environment=environment;scene.environmentIntensity=options.environmentIntensity ?? .38;
    },
    dispose() {
      if(owner?.environment===environment){owner.environment=previous;owner.environmentIntensity=previousIntensity;}
      environment.dispose();
    }
  };
};
