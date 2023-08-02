import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MinimapTextureGenerator } from '../../src/materials/MinimapTextureGenerator';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { error } from '../../src/utils/logger';

const w = window as any;
w.THREE = THREE;

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;

let textureGenerator: MinimapTextureGenerator;
let renderedPlane: THREE.Mesh;

let loaderElement: HTMLElement;

const guiOptions = {
  showTexture: false,
  levelHeight: 20,
  curveWidth: 0.5,
};

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupGUI() {
  const gui = new dat.GUI();

  gui.add(guiOptions, 'showTexture');
  gui.add(guiOptions, 'levelHeight', 1, 100).onChange((value) => (textureGenerator.levelHeight = value));
  gui.add(guiOptions, 'curveWidth', 0.01, 5).onChange((value) => (textureGenerator.curveWidth = value));
}

function setupThreejs() {
  // Make a renderer that fills the screen
  renderer = new THREE.WebGLRenderer({ antialias: true });
  w.session = renderer.xr.getSession();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.xr.enabled = true;
  renderer.setClearColor(0xccccff);

  scene = new THREE.Scene();
  w.scene = scene;
  camera = new THREE.PerspectiveCamera(50, undefined, 0.01, 10000);
  camera.position.set(-5, 3, 5);
  scene.add(camera);

  controls = new OrbitControls(camera, renderer.domElement);
  document.getElementById('container3D').appendChild(renderer.domElement);

  loaderElement = document.getElementById('loader');

  window.addEventListener('resize', onWindowResize, false);
  onWindowResize();
}

async function loadTerrainModel(): Promise<THREE.Mesh> {
  const loader = new GLTFLoader();
  const filepath = 'models/desierto.glb';

  const gltf = await new Promise<GLTF>((resolve, reject) => {
    new GLTFLoader().load(
      filepath,
      resolve,
      () => { },
      (err) => {
        error(`Error loading GLB '${filepath}': ${err.message}`);
        reject(err);
      }
    );
  });

  return gltf.scene.getObjectByName('terrain') as THREE.Mesh;
}

function setupRenderedPlane() {
  const { width, height } = textureGenerator;

  const planeGeom = new THREE.PlaneGeometry(width, height);
  const planeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  planeMat.map = textureGenerator.texture;
  renderedPlane = new THREE.Mesh(planeGeom, planeMat);
  scene.add(renderedPlane);
}

function updateRenderedPlane() {
  renderedPlane.visible = guiOptions.showTexture;
  if (!renderedPlane.visible) return;

  textureGenerator.render();

  const position = controls.target.clone().sub(camera.position).setLength(1).add(camera.position);
  renderedPlane.position.copy(position);

  const { width, height } = (renderedPlane.geometry as THREE.PlaneGeometry).parameters;
  const scale = Math.max(width, height) ** -1 / 2;
  renderedPlane.scale.set(scale, scale, scale);

  renderedPlane.lookAt(camera.position);
}

function animate() {
  renderer.setAnimationLoop(update);
}

function update() {
  updateRenderedPlane();

  renderer.render(scene, camera);
}

async function start() {
  setupThreejs();
  setupGUI();

  // Generate minimap scene
  MinimapTextureGenerator.init(renderer);
  const terrain = await loadTerrainModel();
  textureGenerator = new MinimapTextureGenerator(terrain.geometry);

  const generator: any = (w.generator = textureGenerator);
  scene.add(generator.scene);
  scene.add(new THREE.CameraHelper(generator.camera));

  // Setup the resulting plane
  setupRenderedPlane();

  loaderElement.style.visibility = 'hidden';
  animate();
}

start();
