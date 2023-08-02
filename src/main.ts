/*

This document explains the portion of the WebXR APIs for managing input across the range of XR hardware
https://immersive-web.github.io/webxr/input-explainer

*/

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import StatsVR from 'statsvr'; // https://github.com/Sean-Bradley/StatsVR
import { Clock } from './utils/Clock';
import { SceneManager, SceneManagerEvents } from './SceneManager';
import { EventTypes as PlayerEventTypes } from './Player';
import { CanvasLogger, canvasLog, warn } from './utils/logger';
import { MaterialLibrary } from './materials/MaterialLibrary';
import { MinimapTextureGenerator } from './materials/MinimapTextureGenerator';
import { HTMLMesh } from 'three/examples/jsm/interactive/HTMLMesh';
import { InteractiveGroup } from 'three/examples/jsm/interactive/InteractiveGroup.js';
import { VRMenu, EventTypes as VRMenuEventTypes } from './ui/vrMenu';
import { ControllersManager } from './xr/ControllersManager';
import { ActivityLog } from './ActivityLog';

const w = window as any; // This is for debug purposes
w.THREE = THREE;

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;

let sceneManager: SceneManager;

let controls: OrbitControls;

let loaderElement: HTMLElement;
let statsVR: StatsVR;

let handControllersManager: ControllersManager;

let interactiveGroup: THREE.Object3D;

let htmlMesh: HTMLMesh;
let frame = 0;
let vrmenu: VRMenu;

let sessionId: string = '';

let enableShadows = false;

let activityLog: ActivityLog;

let menuParams = {
  terrainScale: 0,
  sunTheta: 90, // 0 a 360
  sunPhi: 10, // 0 a 90
  heightOffset: 0,
  minimapScale: 1,
  changeSkilledHand: function () {
    handControllersManager.toggleHandedness();
  },
  resetToDefaults: function () {
    console.log('resetToDefaults');
  },
  endVRSession: function () {
    renderer.xr.getSession().end();
  },
};

/*
Sobre Three.js y WebXR
https://codingxr.com/articles/getting-started-with-webxr-and-threejs/

button vr example
https://sbcode.net/threejs/buttonvr/

*/

function setupThreejs() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 2.2;
  renderer.xr.enabled = true;
  renderer.setClearColor(0xccccff);
  // renderer.xr.setFramebufferScaleFactor(0.5); // Use this to improve performance. Useful for debugging with lower-tier headset

  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.enabled = enableShadows;
  if (!renderer.shadowMap.enabled) warn('Renderer shadowMap is disabled (maybe an unwanted commit...?)');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, undefined, 0.01, 50000);
  camera.position.set(0, 250, 600);
  scene.add(camera);

  controls = new OrbitControls(camera, renderer.domElement);
  document.getElementById('container3D').appendChild(renderer.domElement);

  loaderElement = document.getElementById('loader');

  window.addEventListener('resize', onWindowResize, false);
  onWindowResize();

  statsVR = new StatsVR(scene, camera);
  sceneManager = w.sceneManager = new SceneManager(scene, renderer);

  sceneManager.onProgress(() => {
    const megabytes = Number(sceneManager.mbLoaded).toFixed(2);
    loaderElement.innerHTML = `${megabytes} MB loaded`;
  });

  sceneManager.onLoaded(() => {
    initVRGUI();
  });

  sceneManager.addEventListener('ON_VROBJECTS_CHANGED', (e) => {
    activityLog.sendDataToServer(sceneManager.getAddedObjectsJSON());
  });

  handControllersManager = w.ctrlsManager = new ControllersManager(renderer.xr, sceneManager);

  // Rendered logger
  w.canvasLog = CanvasLogger.log.bind(CanvasLogger);
}

function generateRandomKey() {
  var clave = '';
  var caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (var i = 0; i < 6; i++) {
    var indice = Math.floor(Math.random() * caracteres.length);
    clave += caracteres.charAt(indice);
  }

  return clave;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initVRGUI() {
  vrmenu = new VRMenu(sessionId);
  let node = vrmenu.getDomElement();
  document.body.append(node);

  node.style.visibility = 'hidden';

  sceneManager.updateColor(parseInt(vrmenu.getCurrentColor(), 16));

  vrmenu.addButton('', 'Cambiar mano hábil', menuParams, 'changeSkilledHand', 'main');
  //vrmenu.addButton('', 'resetear valores', menuParams, 'resetToDefaults', 'main');
  vrmenu.addButton('', 'Terminar sesión VR', menuParams, 'endVRSession', 'main');

  // terrain tab
  vrmenu.addSlider('escala terreno', menuParams, 'terrainScale', 'terrain', 0, 100, 10).onChange((v: any) => {
    let s = Math.max(0.005, Math.pow(v / 100, 2));
    sceneManager.setTerrainScale(s);
  });

  vrmenu.addSlider('coloración', sceneManager.terrain.getUniform('mixFactor'), 'value', 'terrain', 0, 1, 0.01);
  vrmenu.addSlider('cota inferior', sceneManager.terrain.getUniform('lowLevel'), 'value', 'terrain', 0, 250, 0.01);
  vrmenu.addSlider('cota superior', sceneManager.terrain.getUniform('highLevel'), 'value', 'terrain', 0, 250, 0.01);
  vrmenu
    .addSlider(
      'sep. curvas nivel',
      sceneManager.terrain.getUniform('levelCurveRange'),
      'value',
      'terrain',
      0.1,
      8,
      0.01
    )
    .onChange((value: number) => {
      sceneManager.minimap.updateLevelHeight(value);
    });

  vrmenu.addSlider(
    'espesor linea',
    sceneManager.terrain.getUniform('levelCurveThickness'),
    'value',
    'terrain',
    0.001,
    0.2,
    0.001
  );
  // illumination tab
  vrmenu.addSlider('Azimuth sol', menuParams, 'sunPhi', 'illumination', 0, 75, 1).onChange((v: any) => {
    sceneManager.setSunLocation(menuParams.sunPhi, menuParams.sunTheta);
  });

  vrmenu.addSlider('Orientación sol', menuParams, 'sunTheta', 'illumination', 0, 360, 1).onChange((v: any) => {
    sceneManager.setSunLocation(menuParams.sunPhi, menuParams.sunTheta);
  });

  vrmenu.addEventListener(VRMenuEventTypes.ON_SLIDER_CHANGED, (e: any) => {
    console.log(e);
  });

  let updateTowerTimer: NodeJS.Timeout;

  sceneManager.player.addEventListener(PlayerEventTypes.ON_POSITION_CHANGE, (e: any) => {
    //e.offsetPosition;
    let tower = sceneManager.getTower();
    tower.visible = false;
    clearTimeout(updateTowerTimer);
    updateTowerTimer = setTimeout(() => {
      tower.position.copy(e.position);
      tower.position.y += e.heightOffset;
      if (e.heightOffset > 3) tower.visible = true;
    }, 300);
  });

  // settings tab
  vrmenu
    .addSlider('altura sobre terreno', menuParams, 'heightOffset', 'settings', 0, 50, 0.01)
    .onChange((v: number) => {
      sceneManager.player.setHeightOffset(v);
    });

  vrmenu.addSlider('escala mapa', menuParams, 'minimapScale', 'settings', 0.5, 2, 0.01).onChange((v: number) => {
    sceneManager.minimap.scale = v;
  });

  // Listeners
  vrmenu.addEventListener(VRMenuEventTypes.ON_MODE_CHANGED, (event: any) => {
    sceneManager.mode = event.mode;
  });

  vrmenu.addEventListener(VRMenuEventTypes.ON_COLOR_CHANGED, (event: any) => {
    sceneManager.updateColor(parseInt(event.color, 16));
  });

  interactiveGroup = new InteractiveGroup(renderer, camera);
  interactiveGroup.name = 'vrmenu';
  const mesh = new HTMLMesh(node);

  mesh.position.y = 0.3;
  mesh.position.z = -0.15;

  mesh.rotation.x = -0.2 * Math.PI;
  //mesh.rotation.z = 0.5 * Math.PI;
  //mesh.rotation.z = Math.PI / 2;
  mesh.scale.setScalar(0.75);
  interactiveGroup.add(mesh);

  const material = new THREE.MeshBasicMaterial({ color: 0x101010 });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.001, 0.47), material);
  cube.rotation.x = Math.PI / 2;
  cube.position.z = -0.002;
  mesh.add(cube);

  htmlMesh = mesh;
}

function animate() {
  Clock.start();
  renderer.setAnimationLoop(render);
}

function render() {
  Clock.update();

  statsVR.update();
  sceneManager.update();
  handControllersManager.update();

  // Draw everything
  renderer.render(scene, camera);
}

async function start() {
  setupThreejs();

  sessionId = generateRandomKey();

  activityLog = new ActivityLog(sessionId);
  w.activityLog = activityLog;

  let infoDiv = document.getElementById('info');
  infoDiv.innerHTML = 'Session ID: ' + sessionId;
  MinimapTextureGenerator.init(renderer);
  await MaterialLibrary.init();
  await sceneManager.loadModels();

  canvasLog('SceneManager loaded');

  renderer.xr.addEventListener('sessionstart', function (event: any) {
    w.session = renderer.xr.getSession();
    handControllersManager.setup(interactiveGroup);
  });

  renderer.xr.addEventListener('sessionend', function (event: any) {});

  // Add a button to enter/exit vr to the page
  document.body.appendChild(VRButton.createButton(renderer));

  loaderElement.style.visibility = 'hidden';
  animate();
}

window.addEventListener('load', () => {
  start();
});
