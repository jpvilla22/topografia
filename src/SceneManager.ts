import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OnError, OnLoaded, OnProgress } from './types/SceneManager';
import { CanvasLogger, error } from './utils/logger';
import { VRObjectType, VRObjectsFactory } from './objects/VRObjectsFactory';
import { VRObject } from './objects/VRObject';
import { Minimap } from './objects/Minimap';
import { Flag } from './objects/Flag';
import { Sky } from 'three/examples/jsm/objects/Sky';
import { EventsDispatcher } from './xr/EventsDispatcher';
import { TerrainLine } from './objects/TerrainLine';
import { Terrain } from './Terrain';
import { Player } from './Player';
import { CastingSensorType, EventTypes as ControllerEvents, HandController } from './xr/HandController';
import { Handedness } from './xr/XRGamepadMonitor';
import { ModeTypes } from './ui/vrMenu';
import { ControllersManager } from './xr/ControllersManager';
import { MaterialLibrary } from './materials/MaterialLibrary';
import { dir } from 'console';

export type SceneManagerEvents = 'ON_VROBJECTS_CHANGED';

export class SceneManager extends EventsDispatcher {
  private static readonly MODELS_GLBS: string[] = ['models/flag.glb'];
  private static readonly ASSETS_GLBS: string[] = ['models/tower.glb'];

  mbLoaded: number = 0; // MegaBytes loaded
  models: VRObject[] = [];
  vrObjects: VRObject[] = [];
  controllersManager: ControllersManager;
  assets: THREE.Object3D[] = [];

  private _mode: ModeTypes = 'navigate';
  private currentColor: THREE.Color = new THREE.Color(0xffffff);

  // Special objects
  scene: THREE.Scene;
  terrain: Terrain;
  panel: THREE.Group;
  player: Player;
  minimap: Minimap;
  private navigationMarker: THREE.Object3D;
  private polygonMarker: THREE.Mesh;
  private container: THREE.Group;
  private nextFlag: Flag; // Used for setting placeholder
  private drawingLine?: TerrainLine;
  private deletingObject?: VRObject;

  private onProgressCallback: OnProgress;
  private onErrorCallback: OnError;
  private onLoadedCallback: OnLoaded;

  private sky: Sky;
  private sunLight: THREE.DirectionalLight;
  private renderer: THREE.WebGLRenderer;
  private tower: THREE.Object3D;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    super();
    this.scene = scene;
    this.renderer = renderer;

    this.container = new THREE.Group();
    this.container.name = 'container';
    this.scene.add(this.container);

    this.terrain = new Terrain();
    this.player = new Player(this.renderer.xr);

    this.renderer.xr.addEventListener(ControllerEvents.ON_RAY_CASTED, this.onRayCasted.bind(this));
    this.renderer.xr.addEventListener(ControllerEvents.ON_CASTING_RAY, this.onCastingRay.bind(this));
    this.renderer.xr.addEventListener(ControllerEvents.ON_TRIGGER_DOWN, this.onTriggerDown.bind(this));
    this.renderer.xr.addEventListener(ControllerEvents.ON_TRIGGER_UP, this.onTriggerUp.bind(this));
    this.renderer.xr.addEventListener(ControllerEvents.ON_B_PRESSED, this.onBPressed.bind(this));
    this.renderer.xr.addEventListener(ControllerEvents.ON_A_PRESSED, this.onAPressed.bind(this));
    this.renderer.xr.addEventListener(ControllerEvents.ON_X_PRESSED, this.onXPressed.bind(this));
    this.renderer.xr.addEventListener(ControllerEvents.ON_Y_PRESSED, this.onYPressed.bind(this));
  }

  get mode(): ModeTypes {
    return this._mode;
  }

  set mode(newMode: ModeTypes) {
    this.nextFlag.placeholder.visible = false;
    this.finishDrawingLine();

    this._mode = newMode;
  }

  update() {
    this.polygonMarker.visible = false;

    if (!this.controllersManager.connected) return;

    const ray = this.controllersManager.skilledHand.ray;

    if (this._mode == 'addPoint') this.projectFlagRay(ray);
    else if (this._mode == 'addPolygon') this.projectPolygonRay(ray);
    else if (this._mode == 'remove') {
      if (this.controllersManager.skilledHand.isDown('Trigger')) {
        if (!this.deletingObject) return;
        if (this.getPointedVRObject(ray) != this.deletingObject) {
          this.deletingObject.highlight(false);
          this.deletingObject = undefined;
        }
      } else {
        this.projectEraseRay(ray);
      }
    }
  }

  getTower() {
    return this.tower;
  }

  setTerrainScale(s: number) {
    this.container.scale.set(s, s, s);
  }

  repositionPanel() {
    const mapDistanceToPlayer = 0.65; // meters
    const mapInclination = 20; // degrees
    const verticalOffset = -0.4;
    // get player position & direction in reference space
    // WARNING: position includes the offsetPosition
    let headsetData = this.getHeadsetPositionDirection();
    let d = headsetData.direction;
    let p = headsetData.position;
    p.sub(this.player.getOffsetPosition());

    d.y = 0; // we want to project direction on XZ plane
    d.normalize();
    d.multiplyScalar(mapDistanceToPlayer);

    let panelPos = this.player.worldPosition.clone();
    panelPos.add(d); // from the player move away in d vector
    panelPos.sub(p);
    this.panel.visible = true;
    this.panel.rotation.order = 'ZYX';

    this.panel.position.copy(panelPos);

    this.panel.position.y += this.player.yPosition + verticalOffset;
    //this.panel.position.z -= 0.5;

    this.panel.rotation.y = -Math.atan2(d.z, d.x) - Math.PI / 2;
    this.panel.rotation.x = -THREE.MathUtils.degToRad(mapInclination);

    this.minimap.updateUserIcon(this.player.worldPosition);
    this.minimap.toggleVisibility();
  }

  setSunLocation(a: number, b: number) {
    const uniforms = this.sky.material.uniforms;
    const phi = THREE.MathUtils.degToRad(90 - a);
    const theta = THREE.MathUtils.degToRad(b);

    const sunDir = new THREE.Vector3();
    sunDir.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(sunDir);

    let pos = sunDir.clone();
    pos.multiplyScalar(1000);

    this.sunLight.position.copy(pos);
    this.renderer.shadowMap.needsUpdate = true;
  }

  updateColor(color: THREE.ColorRepresentation) {
    this.currentColor.set(color);
    (this.polygonMarker.material as THREE.MeshStandardMaterial).color.set(color);
    this.nextFlag.color = this.currentColor;
    if (this.drawingLine) this.drawingLine.color = this.currentColor;
  }

  // User can setup optional onProgress callback
  onProgress(callback: OnProgress) {
    this.onProgressCallback = callback;
    return this;
  }

  // Setup optional onError callback
  onError(callback: OnError) {
    this.onErrorCallback = callback;
    return this;
  }

  // Setup optional onLoaded callback
  onLoaded(callback: OnLoaded) {
    this.onLoadedCallback = callback;
    return this;
  }

  async loadModels() {
    const mbsArray = new Array(SceneManager.MODELS_GLBS.length + 1).fill(0);

    const modelsPromises = SceneManager.MODELS_GLBS.map(
      (filepath, fileIdx) =>
        new Promise<GLTF>((resolve, reject) => {
          const loader = new GLTFLoader();
          return loader.load(
            filepath,
            (gltf: GLTF) => {
              this.preprocessModels(gltf);
              resolve(gltf);
            },
            (event) => {
              mbsArray[fileIdx] = event.loaded / 1024 ** 2;
              this.mbLoaded = mbsArray.reduce((sum, mbs) => (sum += mbs), 0);
              this.onProgressCallback?.(event);
            },
            (err) => {
              reject(err);
              error(`Error loading GLB '${filepath}': ${err.message}`);
              this.onErrorCallback?.(err);
            }
          );
        })
    );

    const assetsPromises = SceneManager.ASSETS_GLBS.map(
      (filepath, fileIdx) =>
        new Promise<GLTF>((resolve, reject) => {
          const loader = new GLTFLoader();
          return loader.load(
            filepath,
            (gltf: GLTF) => {
              this.preprocessAssets(gltf);
              resolve(gltf);
            },
            (event) => {
              mbsArray[fileIdx] = event.loaded / 1024 ** 2;
              this.mbLoaded = mbsArray.reduce((sum, mbs) => (sum += mbs), 0);
              this.onProgressCallback?.(event);
            },
            (err) => {
              reject(err);
              error(`Error loading GLB '${filepath}': ${err.message}`);
              this.onErrorCallback?.(err);
            }
          );
        })
    );

    this.terrain.onProgress((event) => {
      mbsArray[mbsArray.length - 1] = event.loaded / 1024 ** 2;
      this.mbLoaded = mbsArray.reduce((sum, mbs) => (sum += mbs), 0);
      this.onProgressCallback?.(event);
    });

    // Wait for all promises to finish
    await Promise.all<GLTF>([this.terrain.load('mountains'), ...modelsPromises, ...assetsPromises]);

    this.postprocessScene();

    this.onLoadedCallback?.();
  }

  private preprocessAssets(gltf: GLTF) {
    gltf.scene.children.forEach((child) => {
      this.assets.push(child);
    });
  }

  private preprocessModels(gltf: GLTF) {
    gltf.scene.children.forEach((child) => {
      if (VRObjectsFactory.isVRObject(child)) {
        const vrobj = VRObjectsFactory.buildFrom(child);
        this.models.push(vrobj);
      }
    });
  }

  private createNavigationMarker() {
    // Navigation marker
    const MARKER_HEIGHT = 30;
    const markerGeo = new THREE.CylinderGeometry(0.8, 0.8, MARKER_HEIGHT, 16, 2);
    markerGeo.translate(0, -1 + MARKER_HEIGHT / 2, 0);

    const markerMat = MaterialLibrary.createNavigationMarkerMaterial();
    markerMat.uniforms.height.value = MARKER_HEIGHT;

    const navigationMarker = new THREE.Mesh(markerGeo, markerMat);
    navigationMarker.name = 'navigationMarker';
    navigationMarker.visible = false;
    navigationMarker.onBeforeRender = () => (markerMat.uniforms.time.value += 1 / 60);

    return navigationMarker;
  }

  private buildScene() {
    this.navigationMarker = this.createNavigationMarker();
    this.scene.add(this.navigationMarker);

    // Polygon marker
    const polymarkerGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.1);
    const polymarkerMat = new THREE.MeshBasicMaterial({ color: this.currentColor, transparent: true, opacity: 0.5 });
    this.polygonMarker = new THREE.Mesh(polymarkerGeom, polymarkerMat);
    this.polygonMarker.visible = false;
    this.polygonMarker.name = 'polygonMarker';
    this.scene.add(this.polygonMarker);

    // Lights
    var light: THREE.Light = new THREE.HemisphereLight(0xccccff, 0xffccbb, 0.9);
    this.scene.add(light);

    const side = 750;
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 8192;
    this.sunLight.shadow.mapSize.height = 8192;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 1500;
    this.sunLight.shadow.camera.top = -side;
    this.sunLight.shadow.camera.left = -side;
    this.sunLight.shadow.camera.bottom = side;
    this.sunLight.shadow.camera.right = side;
    this.sunLight.shadow.bias = -0.001; // 0.005
    this.scene.add(this.sunLight);

    const size = 1000;
    const divisions = 10;
    const gridHelper = new THREE.GridHelper(size, divisions);
    // this.scene.add(gridHelper);

    // Canvas logger
    const loggerGeom = new THREE.PlaneGeometry(4, 2);
    const loggerMat = CanvasLogger.buildMaterial(loggerGeom);
    const logger = new THREE.Mesh(loggerGeom, loggerMat);
    logger.name = 'logger';
    logger.visible = false;
    let y = this.terrain.getHeightAt(0, -20);
    logger.position.set(0, y + loggerGeom.parameters.height + 1, -20);
    this.scene.add(logger);

    // Build panel with minimap
    this.minimap = new Minimap(this.terrain.geometry);
    this.panel = new THREE.Group();
    this.panel.name = 'panel';
    this.panel.visible = false;
    //this.panel.rotateX(-0.25 * Math.PI);
    this.panel.add(this.minimap.object);
    this.scene.add(this.panel);

    // Add Sky
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);

    // https://threejs.org/examples/webgl_shaders_sky.html
    const uniforms = this.sky.material.uniforms;
    uniforms['turbidity'].value = 0.2;
    uniforms['rayleigh'].value = 0.22;
    uniforms['mieCoefficient'].value = 0.05;
    uniforms['mieDirectionalG'].value = 0.95;

    this.setSunLocation(25, 0);

    const envMap = MaterialLibrary.getTexture('envMap1');
    if (envMap) envMap.mapping = THREE.EquirectangularReflectionMapping;

    this.tower = this.findAssetByName('tower');
    let mat = (this.tower.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    mat.envMap = envMap;
    mat.metalness = 0.8;
    mat.roughness = 0.1;
    this.tower.castShadow = true;
    this.tower.receiveShadow = true;
    this.tower.visible = true;
    this.scene.add(this.tower);

    this.renderer.shadowMap.needsUpdate = true;
  }

  private postprocessScene() {
    this.buildScene();
    this.container.add(this.terrain.object);

    // Setup starting position
    const [x, z] = [0, -25];
    const y = this.terrain.getHeightAt(x, z);
    this.player.worldPosition.set(x, y, z);

    this.buildNextFlag();

    //this.debugBuildScene();
  }

  private getHeadsetPositionDirection(): any {
    let xrCamera: THREE.ArrayCamera = this.renderer.xr.getCamera();
    let e = xrCamera.matrixWorld.elements;
    let direction = new THREE.Vector3(-e[8], -e[9], -e[10]).normalize();
    let position = new THREE.Vector3(-e[12] / e[15], -e[13] / e[15], -e[14] / e[15]);

    return { position, direction };
  }

  private findModel(type: VRObjectType): VRObject {
    return this.models.find((vrobj) => vrobj.type == type);
  }

  private findAssetByName(name: String): THREE.Object3D {
    return this.assets.find((obj) => obj.name == name);
  }

  private onRayCasted(event: any) {
    const mode: ModeTypes = event.mode;
    const sensor: CastingSensorType = event.sensor;
    const handedness: Handedness = event.handedness;

    if (handedness == 'right' && sensor == 'forward') {
      this.castTeleportRay(event.ray);
    } else if (mode == 'addPoint' && sensor == 'trigger') {
      this.castFlagRay(event.ray);
    } else if (mode == 'addPolygon' && sensor == 'trigger') {
      this.castLineRay(event.ray);
    }
  }

  private onCastingRay(event: any) {
    const mode: ModeTypes = event.mode;
    const sensor: CastingSensorType = event.sensor;
    const handedness: Handedness = event.handedness;

    if (handedness == 'right' && sensor == 'forward') {
      this.projectTeleportRay(event.ray);
    }
  }

  private castTeleportRay(ray: THREE.Ray) {
    const raycaster = new THREE.Raycaster();
    raycaster.ray = ray;

    const intersection = raycaster.intersectObject(this.terrain.object)?.[0]?.point;
    if (intersection) this.player.teleport(intersection);

    this.navigationMarker.visible = false;
  }

  private projectTeleportRay(ray: THREE.Ray) {
    const raycaster = new THREE.Raycaster();
    raycaster.ray = ray;
    var intersection = raycaster.intersectObject(this.terrain.object)?.[0]?.point;

    if (intersection) {
      this.navigationMarker.visible = true;
      this.navigationMarker.position.copy(intersection);
    } else {
      this.navigationMarker.visible = false;
    }
  }

  private castFlagRay(ray: THREE.Ray) {
    const raycaster = new THREE.Raycaster();
    raycaster.ray = ray;
    const intersection = raycaster.intersectObject(this.terrain.object)?.[0]?.point;

    if (intersection) this.placeFlag(intersection);
  }

  private projectFlagRay(ray: THREE.Ray) {
    const raycaster = new THREE.Raycaster();
    raycaster.ray = ray;
    var intersection = raycaster.intersectObject(this.terrain.object)?.[0]?.point;

    if (intersection) {
      this.nextFlag.placeholder.visible = true;
      this.nextFlag.placeholder.position.copy(intersection);
    } else {
      this.nextFlag.placeholder.visible = false;
    }
  }

  private castLineRay(ray: THREE.Ray) {
    const raycaster = new THREE.Raycaster();
    raycaster.ray = ray;
    const intersection = raycaster.intersectObject(this.terrain.object)?.[0]?.point;

    if (!intersection) return;

    if (!this.drawingLine) {
      this.drawingLine = new TerrainLine({ color: this.currentColor });
      this.container.add(this.drawingLine.object);
    }

    intersection.y += 1; // Make the line float a little bit above the ground
    this.drawingLine.addPoint(intersection);
    this.drawingLine.disablePlaceholder();
    this.renderer.shadowMap.needsUpdate = true;
  }

  private projectPolygonRay(ray: THREE.Ray) {
    const raycaster = new THREE.Raycaster();
    raycaster.ray = ray;
    var intersection = raycaster.intersectObject(this.terrain.object)?.[0];

    if (!intersection) {
      this.drawingLine?.disablePlaceholder();
      this.polygonMarker.visible = false;
    } else if (this.drawingLine) {
      this.drawingLine.enablePlaceholder();
      intersection.point.y += 1;
      this.drawingLine.updatePlaceholder(intersection.point);
    } else {
      const yAxis = new THREE.Vector3(0, 1, 0);
      const rotationQuat = new THREE.Quaternion().setFromUnitVectors(yAxis, intersection.face.normal);
      this.polygonMarker.visible = true;
      this.polygonMarker.position.copy(intersection.point);
      this.polygonMarker.quaternion.copy(rotationQuat);
    }
  }

  private castEraseRay(ray: THREE.Ray) {
    if (!this.deletingObject) return;

    const pointed = this.getPointedVRObject(ray);
    if (pointed != this.deletingObject) {
      this.deletingObject.highlight(false);
      this.deletingObject = undefined;
      return;
    }

    this.removeVRObject(this.deletingObject);
    this.controllersManager.skilledHand.pulse(0.7, 200);
    this.renderer.shadowMap.needsUpdate = true;
  }

  private projectEraseRay(ray: THREE.Ray) {
    this.vrObjects.forEach((line) => line.highlight(false));

    const line = this.getPointedVRObject(ray);
    if (line) line.highlight();
  }

  private onTriggerDown(event: any) {
    const mode: ModeTypes = event.mode;
    const ray: THREE.Ray = event.ray;

    if (mode == 'remove') {
      if (!event.skilled) return;

      const vrobject = this.getPointedVRObject(ray);
      if (!vrobject) return;
      else this.deletingObject = vrobject;
    }
  }

  private onTriggerUp(event: any) {
    const mode: ModeTypes = event.mode;

    if (mode == 'remove') {
      if (!event.skilled) return;
      this.castEraseRay(event.ray);
    }
  }

  private onBPressed(event: any) {
    if (this.drawingLine) this.finishDrawingLine();
    else this.repositionPanel();
  }

  private onAPressed(event: any) {
    if (this.drawingLine) this.finishDrawingLine();
    else this.controllersManager.toggleVRMenu();
  }

  private onYPressed(event: any) {
    if (this.drawingLine) this.finishDrawingLine();
    else this.repositionPanel();
  }

  private onXPressed(event: any) {
    if (this.drawingLine) this.finishDrawingLine();
    else this.controllersManager.toggleVRMenu();
  }

  private removeVRObject(vrobj: VRObject) {
    vrobj.object.removeFromParent();

    const idx = this.vrObjects.indexOf(vrobj);
    if (idx > 0) this.vrObjects.splice(idx, 1);

    this.minimap.removeIcon(vrobj);
    this.dispatchEvent({
      type: 'ON_VROBJECTS_CHANGED',
    });
  }

  private finishDrawingLine() {
    if (!this.drawingLine) return;

    if (this.drawingLine.points.length < 2) {
      this.drawingLine = undefined;
      return;
    }

    this.drawingLine.disablePlaceholder();
    this.vrObjects.push(this.drawingLine);
    this.container.add(this.drawingLine.object);
    this.minimap.addLine(this.drawingLine);
    this.drawingLine = undefined;
    this.dispatchEvent({
      type: 'ON_VROBJECTS_CHANGED',
    });
  }

  private getPointedVRObject(ray: THREE.Ray): VRObject | undefined {
    const raycaster = new THREE.Raycaster();
    raycaster.ray = ray;

    const intersections = this.vrObjects
      .map((vrobj) => {
        const intersection = raycaster.intersectObject(vrobj.hitSurface)[0];
        return intersection ? { vrobject: vrobj, ...intersection } : undefined;
      })
      .filter((int) => int);

    const closest = intersections.sort((a, b) => a.distance - b.distance)[0];

    return closest?.vrobject;
  }

  /** `pos` is the position of the flag relative to the unscaled terrain */
  private placeFlag(pos: THREE.Vector3) {
    const flag = this.nextFlag;

    this.vrObjects.push(flag);
    this.container.add(flag.object);
    flag.object.position.copy(pos);
    flag.placeholder.removeFromParent();

    this.minimap.addFlagIcon(flag);

    this.buildNextFlag();
    this.renderer.shadowMap.needsUpdate = true;
    this.dispatchEvent({
      type: 'ON_VROBJECTS_CHANGED',
    });
  }

  private buildNextFlag() {
    this.nextFlag = this.findModel('flag').clone() as Flag;
    this.nextFlag.color = this.currentColor.clone();
    this.nextFlag.placeholder.visible = false;
    this.container.add(this.nextFlag.placeholder);
  }

  private debugGetTerrainLinePoints(pA: THREE.Vector3, pB: THREE.Vector3, count: number) {
    const points: THREE.Vector3[] = [];
    const dir = pB.clone();
    dir.sub(pA);

    for (let i = 0; i < count; i++) {
      let inc = dir.clone();

      inc.multiplyScalar(i / count);
      let p = pA.clone();
      p.add(inc);

      let y = this.terrain.getHeightAt(p.x, p.z);
      p.y = y + 2;

      points.push(p);
    }
    return points;
  }

  private debugBuildScene() {
    let flagsCoords = [
      [215, 130],
      [10, 10],
      [-450, 250],
      [300, 300],
      [-300, -200],
      [400, 200],
      [0, 450],
      [-200, 150],
    ];

    flagsCoords.forEach((coord) => {
      const y = this.terrain.getHeightAt(coord[0], coord[1]);
      this.placeFlag(new THREE.Vector3(coord[0], y, coord[1]));
    });

    const points = [
      ...this.debugGetTerrainLinePoints(new THREE.Vector3(6.6, 0, -208), new THREE.Vector3(5, 0, -204.6), 3),
      ...this.debugGetTerrainLinePoints(new THREE.Vector3(5, 0, -204.6), new THREE.Vector3(3.2, 0, -192.4), 8),
      ...this.debugGetTerrainLinePoints(new THREE.Vector3(3.2, 0, -192.4), new THREE.Vector3(-4.7, 0, -174), 12),
      ...this.debugGetTerrainLinePoints(new THREE.Vector3(-4.7, 0, -174), new THREE.Vector3(-34.9, 0, -138.5), 20),
      ...this.debugGetTerrainLinePoints(new THREE.Vector3(-34.9, 0, -138.5), new THREE.Vector3(-65.7, 0, -107.8), 20),
    ];

    const line = new TerrainLine({ points, color: 0xff0066 });
    this.vrObjects.push(line);
    this.container.add(line.object);
    this.minimap.addLine(line);

    const points2 = this.debugGetTerrainLinePoints(new THREE.Vector3(0, 0, 30), new THREE.Vector3(220, 0, 120), 50);
    const line2 = new TerrainLine({ points: points2, color: 0x0044bb });
    this.vrObjects.push(line2);
    this.container.add(line2.object);
    this.minimap.addLine(line2);

    // Debug TV
    const tvGeom = new THREE.BoxGeometry(4, 2, 0.05);
    const tvMat = CanvasLogger.buildMaterial(tvGeom);
    const tv = new THREE.Mesh(tvGeom, tvMat);
    const [x, z] = [0, -30];
    tv.position.set(x, this.terrain.getHeightAt(x, z) + 2, z);
    tv.name = 'tv';
    // this.scene.add(tv);
  }

  public getAddedObjectsJSON() {
    let data: any = {
      flags: [],
      terrainLines: [],
    };

    this.container.traverse((child) => {
      if (child.userData.type == 'flag') {
        console.log('add flag');
        let p = child.position;
        let flagData = {
          color: child.userData.color,
          position: [p.x, p.y, p.z],
        };
        data.flags.push(flagData);
      }

      if (child.userData.type == 'terrainLine') {
        console.log('add terrainLine');
        let lineData: any = {
          color: child.userData.color,
          points: [],
        };
        child.userData.points.forEach((v: THREE.Vector3, i: number) => {
          lineData.points.push([v.x, v.y, v.z]);
        });

        data.terrainLines.push(lineData);
      }
    });
    return data;
  }
}
