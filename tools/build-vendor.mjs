// 仅供开发阶段构建依赖, 提交后的产物可通过 file:// 直接离线运行.
import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';
await build({
  stdin: { contents: `export {
    Scene, Group, Object3D, PerspectiveCamera, OrthographicCamera, WebGLRenderer, WebGLRenderTarget, Color, Fog,
    AmbientLight, HemisphereLight, DirectionalLight, PointLight,
    Vector2, Vector3, Euler, Matrix4, Box3, Box3Helper, Raycaster,
    Mesh, InstancedMesh, Line, LineSegments, BufferGeometry, Float32BufferAttribute,
    BoxGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry,
    IcosahedronGeometry, TorusGeometry, Shape, ExtrudeGeometry,
    MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial,
    LineBasicMaterial, CanvasTexture, DepthTexture, HalfFloatType, UnsignedIntType, RepeatWrapping, BackSide,
    SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap, DoubleSide, ShaderChunk
  } from 'three';
  export { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';`, resolveDir: process.cwd() },
  bundle: true, minify: true, format: 'iife', globalName: 'THREE',
  outfile: 'vendor/three.min.js', legalComments: 'eof',
});
await copyFile('node_modules/three/LICENSE', 'vendor/LICENSE.three.txt');
