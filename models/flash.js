FPS.models.flash = (T, o) => {
  const root = new T.Group();
  const mat = new T.MeshBasicMaterial({ color: o.color || 0xffe8a7, transparent: true, opacity: .95, depthWrite: false, side: T.DoubleSide });
  for (let i = 0; i < 2; i++) {
    const m = new T.Mesh(new T.PlaneGeometry(.08, .3), mat); m.rotation.z = Math.PI * i / 2; root.add(m);
  }
  root.position.copy(o.position); if (o.rotation) root.quaternion.copy(o.rotation);
  return { root, duration: .045 };
};
