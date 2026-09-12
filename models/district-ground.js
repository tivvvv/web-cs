// 预留街区的平地与外围挡墙, 尺寸和碰撞共用场景配置; 不生成建筑或动画.
FPS.models.districtGround = (T, o = {}) => {
  const root = new T.Group(), parts = [];
  for (const [boxes, color] of [[o.slabs ?? [], 0xb6b39f], [o.edges ?? [], 0x929b8f]]) for (const { size, offset } of boxes) {
    const source = new T.BoxGeometry(...size), g = source.toNonIndexed(); source.dispose(); g.translate(...offset);
    const c = new T.Color(color), colors = [];
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); parts.push(g);
  }
  if (parts.length) {
    const mesh = new T.Mesh(T.mergeGeometries(parts), new T.MeshStandardMaterial({ vertexColors: true, roughness: .95 }));
    mesh.receiveShadow = true; root.add(mesh); parts.forEach(g => g.dispose());
  }
  return { root };
};
