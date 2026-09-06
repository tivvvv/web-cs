// 仅供开发阶段构建依赖, 提交后的产物可通过 file:// 直接离线运行.
import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';
await build({
  stdin: { contents: `export {
    Scene, Group, Object3D, PerspectiveCamera, WebGLRenderer, Color, Fog,
    AmbientLight, HemisphereLight, DirectionalLight, PointLight,
    Vector3, Euler, Matrix4, Box3, Box3Helper, Raycaster,
    Mesh, InstancedMesh, Line, LineSegments, BufferGeometry, Float32BufferAttribute,
    BoxGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry,
    IcosahedronGeometry, TorusGeometry, Shape, ExtrudeGeometry,
    MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial,
    LineBasicMaterial, CanvasTexture, RepeatWrapping, BackSide,
    SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap, DoubleSide
  } from 'three';
  export { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';`, resolveDir: process.cwd() },
  bundle: true, minify: true, format: 'iife', globalName: 'THREE',
  outfile: 'vendor/three.min.js', legalComments: 'eof',
});
await copyFile('node_modules/three/LICENSE', 'vendor/LICENSE.three.txt');
