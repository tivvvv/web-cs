// 山脚低卧景石. 大半埋入共用地形, 一批封闭几何, 不叠地表贴片或悬挂小石头.
FPS.models.hubLandscape = (T, o = {}) => {
  const root=new T.Group(),parts=[],pose=new T.Object3D();
  for(const [i,rock]of (o.rocks??[{position:[0,2.28,0],size:[2.3,.62,1.6],yaw:0}]).entries()) {
    const source=new T.SphereGeometry(1,9,6),p=source.attributes.position;
    const [w,h,d]=rock.size;
    for(let j=0;j<p.count;j++) {
      const x=p.getX(j),y=p.getY(j),z=p.getZ(j),shape=1+.07*Math.sin(x*4.1+z*3.7+i*1.3);
      p.setXYZ(j,x*w*.5*shape,(y+1)*h*.44,z*d*.5*shape);
    }
    source.computeVertexNormals();const g=source.toNonIndexed();source.dispose();
    const colors=[],a=g.attributes.position;
    for(let j=0;j<a.count;j++){const t=Math.max(0,Math.min(1,a.getY(j)/h)),shade=.82+.18*t;colors.push(.43*shade,.46*shade,.36*shade);}
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));pose.position.set(...rock.position);pose.rotation.y=rock.yaw??0;pose.updateMatrix();g.applyMatrix4(pose.matrix);parts.push(g);
  }
  if(parts.length){const mesh=new T.Mesh(T.mergeGeometries(parts),new T.MeshStandardMaterial({vertexColors:true,roughness:1}));mesh.name='hub-landscape-rocks';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);parts.forEach(g=>g.dispose());}
  return {root,dispose(){}};
};
