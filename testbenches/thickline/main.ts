import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import dat from 'dat.gui';
import { TerrainLine } from '../../src/objects/TerrainLine';

const w = window as any;
w.THREE = THREE;

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let orbitCtrl: OrbitControls;

let line: TerrainLine;
const cursor = new THREE.Object3D();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function buildGUI() {
  const opts = {
    addPoint: () => {
      line.addPoint(cursor.position);
    },
  };

  const gui = new dat.GUI();
  gui.add(opts, 'addPoint').name('Add point');
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
  camera = new THREE.PerspectiveCamera(50, undefined, 0.01, 100);
  camera.position.set(5, 3, 5);
  scene.add(camera);

  const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  scene.add(light);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight);

  scene.add(new THREE.GridHelper(10, 10));
  scene.add(new THREE.AxesHelper(3));

  cursor.position.set(2.5, 0.1, -0.5);
  cursor.name = 'cursor';
  w.cursor = cursor;
  scene.add(cursor);

  orbitCtrl = new OrbitControls(camera, renderer.domElement);
  document.getElementById('container3D').appendChild(renderer.domElement);

  const transformCtrl = new TransformControls(camera, renderer.domElement);
  transformCtrl.size = 0.5;
  transformCtrl.addEventListener('dragging-changed', (event) => (orbitCtrl.enabled = !event.value));
  transformCtrl.attach(cursor);
  scene.add(transformCtrl);

  window.addEventListener('resize', onWindowResize, false);
  onWindowResize();
}

function update() {
  //line.updatePlaceholder(cursor.position);
  renderer.render(scene, camera);
}

async function start() {
  setupThreejs();
  buildGUI();

  let points = [];

  let count = 0;
  for (let x = 0; x <= 2 * Math.PI; x = x + Math.PI / 8) {

    let y = Math.sin(x);

    //if (count % 2 == 0) y = 1;
    //else y = 0;
    points.push(new THREE.Vector3(x - Math.PI, y, 0));
    count++
  }

  console.log(points)

  line = w.line = new TerrainLine({ points, color: 0xdd0022, thickness: 0.2 });
  line.addPoint(new THREE.Vector3(10, 0, 0));
  line.enablePlaceholder();

  scene.add(line.object);

  renderer.setAnimationLoop(update);
}

start();
