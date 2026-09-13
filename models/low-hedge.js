// 自然枝叶灌木: 成对生叶, 浅色新梢与错落株形; 无平铺贴图/实体绿墙, 叶片实例化, 枝条合批.
FPS.models.lowHedge = (T, o = {}) => {
  const w = o.width ?? 4, d = o.depth ?? .7, h = o.height ?? .9, root = new T.Group();
  let seed = o.seed ?? Math.round(w * 971 + d * 313 + h * 157);
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const nx = Math.max(1, Math.ceil(w / .8)), nz = Math.max(1, Math.ceil(d / .8)), nodes = 7;
  const cellX = w / nx, cellZ = d / nz, pose = new T.Object3D(), up = new T.Vector3(0, 1, 0), axis = new T.Vector3();
  // 一片叶子只有六个三角形, 外缘收尖, 中脉轻微隆起; 颜色沿中脉与边缘变化.
  const outline = [[0, .012, .5], [.28, -.018, .16], [.21, -.015, -.25], [0, 0, -.5], [-.21, -.015, -.25], [-.28, -.018, .16]];
  const vertices = [], colors = [];
  for (let i = 0; i < 6; i++) {
    vertices.push(0, .06, 0, ...outline[i], ...outline[(i + 1) % 6]);
    colors.push(1, 1, .92, .77, .85, .73, .84, .91, .8);
  }
  const leaf = new T.BufferGeometry(); leaf.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  leaf.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); leaf.computeVertexNormals();
  const leaves = new T.InstancedMesh(leaf, new T.MeshStandardMaterial({ vertexColors: true, roughness: .79, side: T.DoubleSide }), nx * nz * 4 * (nodes * 2 + 3));
  const stems = [], tint = new T.Color(), node = new T.Vector3(); let index = 0;
  function branch(a, b, radius) {
    axis.copy(b).sub(a); pose.position.copy(a).addScaledVector(axis, .5);
    pose.quaternion.setFromUnitVectors(up, axis.clone().normalize()); pose.scale.set(1, 1, 1); pose.updateMatrix();
    stems.push(new T.CylinderGeometry(radius * .42, radius, axis.length(), 5, 1, true).applyMatrix4(pose.matrix));
  }
  function foliage(point, yaw, fresh) {
    const size = (.15 + rand() * .07) * Math.min(1, h / .65);
    pose.rotation.set(-.5 + rand() * .95, yaw, (rand() - .5) * .65); pose.scale.set(size, size, size);
    axis.set(0, 0, 1).applyQuaternion(pose.quaternion); pose.position.copy(point).addScaledVector(axis, size * .44); pose.updateMatrix();
    leaves.setMatrixAt(index, pose.matrix);
    tint.setHSL(.255 + rand() * .035, .28 + rand() * .1, .27 + rand() * .055 + fresh * .095); leaves.setColorAt(index++, tint);
  }
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const x = -w / 2 + (ix + .5 + (rand() - .5) * .18) * cellX, z = -d / 2 + (iz + .5 + (rand() - .5) * .22) * cellZ;
    const base = new T.Vector3(x, .015, z), fork = new T.Vector3(x + (rand() - .5) * .055, h * (.12 + rand() * .06), z);
    branch(base, fork, Math.min(.023, h * .025)); const phase = rand() * Math.PI * 2;
    for (let shoot = 0; shoot < 4; shoot++) {
      const a = phase + shoot * Math.PI / 2 + (rand() - .5) * .4;
      const tip = new T.Vector3(x + Math.sin(a) * cellX * (.3 + rand() * .12), h * (.72 + rand() * .23), z + Math.cos(a) * cellZ * (.32 + rand() * .1));
      branch(fork, tip, Math.min(.012, h * .014));
      for (let j = 0; j < nodes; j++) {
        const t = .12 + .88 * j / (nodes - 1); node.copy(fork).lerp(tip, t);
        for (const side of [-1, 1]) foliage(node, a + side * (1.05 + rand() * .25), t * .55);
      }
      for (let j = 0; j < 3; j++) foliage(tip, a + j * 2.1, .9);
    }
  }
  const branches = new T.Mesh(T.mergeGeometries(stems), new T.MeshStandardMaterial({ color: 0x66644b, roughness: 1 }));
  for (const mesh of [branches, leaves]) { mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); }
  stems.forEach(g => g.dispose()); return { root };
};
