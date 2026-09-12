// 局部柔边光束, 原点为上端, sun 指向太阳; 解析计算光程, 无纹理或逐帧采样循环.
FPS.models.sunlightShaft = (T, o = {}) => {
  const root = new T.Group(), sun = new T.Vector3(...(o.sun ?? [-32, 48, -21])).normalize();
  const length = (o.drop ?? 3) / Math.max(.1, sun.y), radius = o.radius ?? .17;
  const material = new T.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, side: T.BackSide,
    uniforms: { uSun: { value: sun }, uDensity: { value: o.density ?? 1 }, uColor: { value: new T.Color(0xffefcf).multiplyScalar(1.4) } },
    vertexShader: `
      varying vec3 vLocal, vEye, vWorld;
      varying float vDistance;
      void main() {
        vLocal=position;
        vEye=(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz;
        vWorld=(modelMatrix*vec4(position,1.)).xyz;
        vDistance=distance(cameraPosition,modelMatrix[3].xyz);
        gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
      }
    `,
    fragmentShader: `
      uniform vec3 uSun, uColor;
      uniform float uDensity;
      varying vec3 vLocal, vEye, vWorld;
      varying float vDistance;
      void main() {
        if(vDistance>=32.) discard;
        vec3 delta=vLocal-vEye, direction=normalize(delta);
        float b=dot(vEye,direction);
        vec3 closest=vEye-b*direction;
        float h2=1.-dot(closest,closest);
        if(h2<=0.) discard;
        float h=sqrt(h2), a=max(b,-h);
        if(a>=h) discard;
        // 椭球内密度向四周及两端平滑归零, 从内部观察也不出现交叉光片.
        float integral=max(0.,h2*(h-a)-(h*h*h-a*a*a)/3.);
        vec3 viewRay=vWorld-cameraPosition;
        float worldScale=length(viewRay)/max(length(delta),.0001);
        float phase=.55+.45*pow(max(0.,dot(normalize(viewRay),uSun)),4.);
        float alpha=min(.18,1.-exp(-uDensity*integral*worldScale))*phase;
        alpha*=1.-smoothstep(20.,32.,vDistance);
        if(alpha<.001) discard;
        gl_FragColor=vec4(uColor,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  const beam = new T.Mesh(new T.BoxGeometry(2, 2, 2), material);
  beam.scale.set(radius, length / 2, radius);
  beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), sun);
  beam.position.copy(sun).multiplyScalar(-length / 2);
  // 保留深度遮挡, 不写深度或参与拾取, 不投影, 不影响敌人视线和射击.
  beam.raycast = () => {}; root.add(beam); return { root };
};
