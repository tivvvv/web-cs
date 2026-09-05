// 使用有厚度的双层光束显示弹道, 避免单像素线在亮色场景中难以看清.
FPS.models.tracer = (T, o) => {
  const root = new T.Group(), delta = o.to.clone().sub(o.from), length = delta.length();
  if (length < .01) return { root, duration: .18 };
  root.position.copy(o.from).addScaledVector(delta, .5);
  root.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  const geometry = new T.CylinderGeometry(1, 1, 1, 6, 1, true);
  const core = new T.MeshBasicMaterial({ color: 0xfff6da, transparent: true, depthWrite: false, toneMapped: false });
  const glow = new T.MeshBasicMaterial({ color: o.color ?? 0xffd98a, transparent: true, opacity: .32, depthWrite: false, toneMapped: false });
  for (const [radius, material] of [[.012, core], [.038, glow]]) {
    const mesh = new T.Mesh(geometry, material); mesh.scale.set(radius, length, radius); root.add(mesh);
  }
  return { root, duration: .18, update(dt, progress) {
    const fade = (1 - progress) ** 2;
    core.opacity = fade; glow.opacity = fade * .32;
  } };
};
