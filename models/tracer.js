FPS.models.tracer = (T, o) => {
  const root = new T.Line(new T.BufferGeometry().setFromPoints([o.from, o.to]), new T.LineBasicMaterial({ color: o.color || 0xffd98a, transparent: true, opacity: .85 }));
  return { root, duration: .065 };
};
