import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import { VRObject } from '../objects/VRObject';
import { SceneManager } from '../SceneManager';
import { XRRemappedGamepad } from '../types/XRRemappedGamepad';
import { ButtonName, Handedness, XRGamepadMonitor, EventTypes as XRGamepadMonitorEvents } from './XRGamepadMonitor';
import { EventsDispatcher } from './EventsDispatcher';
import { Clock } from '../utils/Clock';

export enum EventTypes {
  ON_CASTING_RAY = 'onCastingRay',
  ON_RAY_CASTED = 'onRayCaster',
  ON_Y_PRESSED = 'onYPRessed',
  ON_X_PRESSED = 'onXPRessed',
  ON_A_PRESSED = 'onAPRessed',
  ON_B_PRESSED = 'onBPRessed',
  ON_TRIGGER_DOWN = 'onTriggerDown',
  ON_TRIGGER_UP = 'onTriggerUp',
}

/** Different buttons or axes can cast a ray. This type specifies different ray castings */
export type CastingSensorType = 'forward' | 'trigger';

const SHOW_HIT_POINT = false;

export class HandController extends EventsDispatcher {
  handedness: Handedness;
  index: number;
  connected: boolean = false;
  skilled: boolean = false;

  private xr: THREE.WebXRManager;
  private monitor: XRGamepadMonitor;
  private sceneManager: SceneManager;
  private controller: THREE.XRTargetRaySpace;
  private gamepad: XRRemappedGamepad;

  // Temporal buffers
  private highlighted?: VRObject;
  private castingRay: boolean = false;
  private castingSensor?: CastingSensorType;

  private time = 0;
  private holdingPoint = new THREE.Object3D();
  private grip: THREE.Group;
  private controllerRay: THREE.Ray = new THREE.Ray();
  private cachedVRMenu: THREE.Object3D;

  private onConnectedCallback: (e: any) => void;
  private onDisconnectedCallback: (e: any) => void;

  // Debug
  private debugHitPoint: THREE.Mesh;

  constructor(xr: THREE.WebXRManager, sceneMngr: SceneManager) {
    super();
    this.xr = xr;
    this.sceneManager = sceneMngr;
  }

  get ray(): THREE.Ray {
    return this.controllerRay.clone();
  }

  setup(index: number) {
    this.index = index;
    this.controller = this.xr.getController(index);

    this.controller.addEventListener('connected', this.onConnected.bind(this));
    this.controller.addEventListener('disconnected', this.onDisconnected.bind(this));

    this.sceneManager.scene.add(this.controller);

    // The XRControllerModelFactory will automatically fetch controller models that match what the user is holding as closely as possible
    const controllerModelFactory = new XRControllerModelFactory();
    this.grip = this.xr.getControllerGrip(index);
    this.grip.name = `grip${index}`;
    this.grip.add(controllerModelFactory.createControllerModel(this.grip));
    this.grip.add(this.holdingPoint);

    let ax = new THREE.AxesHelper(0.05);
    ax.visible = true;
    this.holdingPoint.add(ax);

    // this.holdingPoint.rotation.set(0, -Math.PI / 2, 0);
    this.holdingPoint.position.z = -0.08;

    this.sceneManager.scene.add(this.grip);
  }

  getGrip() {
    return this.grip;
  }

  isDown(button: ButtonName) {
    return this.monitor.isDown(button);
  }

  update() {
    const delta = Clock.delta;
    this.time += delta;

    // Check if connection has already finished
    if (!this.monitor) return;

    this.monitor.update(delta);
    this.updateControllerRay();

    if (this.castingRay) {
      this.xr.dispatchEvent({
        type: EventTypes.ON_CASTING_RAY, // Override type
        sensor: this.castingSensor,
        handedness: this.handedness,
        mode: this.sceneManager.mode,
        ray: this.controllerRay.clone(),
      });
    }
  }

  /** Execute haptic vibration
   * @param intensity 0 to 1
   */
  pulse(intensity: number, millis: number) {
    this.gamepad.hapticActuators?.[0].pulse(intensity, millis);
  }

  onConnectedListener(callback: (e: any) => void) {
    this.onConnectedCallback = callback;
  }

  onDisconnectedListener(callback: (e: any) => void) {
    this.onDisconnectedCallback = callback;
  }

  private onConnected(event: THREE.Event & THREE.XRTargetRaySpace) {
    this.connected = true;
    this.handedness = event.data.handedness;
    this.gamepad = event.data.gamepad;
    this.monitor = new XRGamepadMonitor(this.xr, this.handedness);

    this.monitor.addEventListener(XRGamepadMonitorEvents.ON_BUTTON_DOWN, (event) => {
      if (event.button == 'ButtonB' && this.handedness == 'right') this.onBDown(event);
      else if (event.button == 'ButtonA' && this.handedness == 'right') this.onADown(event);
      else if (event.button == 'ButtonY' && this.handedness == 'left') this.onYDown(event);
      else if (event.button == 'ButtonX' && this.handedness == 'left') this.onXDown(event);
      else if (event.button == 'Trigger') this.onSelectDown(event);
    });

    this.monitor.addEventListener(XRGamepadMonitorEvents.ON_BUTTON_UP, (event: any) => {
      if (event.button == 'Trigger') this.onSelectUp(event);
    });

    this.monitor.addEventListener(XRGamepadMonitorEvents.ON_AXIS_FORWARD_UP, (event: any) => {
      this.onAxisForwardUp(event);
    });

    this.monitor.addEventListener(XRGamepadMonitorEvents.ON_AXIS_FORWARD_DOWN, (event: any) => {
      this.onAxisForwardDown(event);
    });

    this.controller.add(this.buildController(event.data));

    // Debug stuff
    if (SHOW_HIT_POINT) {
      this.debugHitPoint = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 4, 4),
        new THREE.MeshBasicMaterial({ color: this.handedness == 'left' ? 0x0088ee : 0xff6600 })
      );
      this.debugHitPoint.name = 'debugHitPoint';
      this.debugHitPoint.visible = false;
      this.sceneManager.scene.add(this.debugHitPoint);
    }

    this.onConnectedCallback?.(event);
  }

  private onDisconnected(event: THREE.Event & THREE.XRTargetRaySpace) {
    this.controller.remove(this.controller.children[0]);
    this.onDisconnectedCallback?.(event);
  }

  private onBDown(monitorEvent: any) {
    this.xr.dispatchEvent({
      ...monitorEvent,
      type: EventTypes.ON_B_PRESSED,
    });
  }

  private onADown(monitorEvent: any) {
    this.xr.dispatchEvent({
      ...monitorEvent,
      type: EventTypes.ON_A_PRESSED,
    });
  }

  private onYDown(monitorEvent: any) {
    this.xr.dispatchEvent({
      ...monitorEvent,
      type: EventTypes.ON_Y_PRESSED,
    });
  }

  private onXDown(monitorEvent: any) {
    this.xr.dispatchEvent({
      ...monitorEvent,
      type: EventTypes.ON_X_PRESSED,
    });
  }

  private onAxisForwardDown(monitorEvent: any) {
    this.castingRay = true;
    this.castingSensor = 'forward';
  }

  private onSelectDown(monitorEvent: any) {
    if (!this.skilled) return;

    // First, check if the ray intersects the VR menu to avoid casting a ray (if controller has menu)
    const raycaster = new THREE.Raycaster();
    raycaster.ray.copy(this.controllerRay);
    const intersectsMenu = !!raycaster.intersectObject(this.getVRMenu())[0];
    if (intersectsMenu) return;

    if (this.highlighted) this.highlighted.onTriggerDown();
    this.castingRay = true;
    this.castingSensor = 'trigger';

    this.xr.dispatchEvent({
      type: EventTypes.ON_TRIGGER_DOWN,
      handedness: this.handedness,
      skilled: this.skilled,
      ray: this.controllerRay.clone(),
      mode: this.sceneManager.mode,
    });
  }

  private onSelectUp(monitorEvent: any) {
    if (!this.skilled) return;

    if (this.castingRay) {
      this.xr.dispatchEvent({
        ...monitorEvent,
        type: EventTypes.ON_RAY_CASTED, // Override type
        sensor: this.castingSensor,
        handedness: this.handedness,
        mode: this.sceneManager.mode,
        ray: this.controllerRay.clone(),
      });
    }

    this.xr.dispatchEvent({
      type: EventTypes.ON_TRIGGER_UP,
      handedness: this.handedness,
      skilled: this.skilled,
      ray: this.controllerRay.clone(),
      mode: this.sceneManager.mode,
    });

    this.castingRay = false;
    this.castingSensor = undefined;
  }

  private onAxisForwardUp(monitorEvent: any) {
    this.xr.dispatchEvent({
      ...monitorEvent,
      type: EventTypes.ON_RAY_CASTED, // Override type
      sensor: this.castingSensor,
      handedness: this.handedness,
      mode: this.sceneManager.mode,
      ray: this.controllerRay.clone(),
    });

    this.castingRay = false;
    this.castingSensor = undefined;
  }

  private updateControllerRay() {
    const mat = new THREE.Matrix4();

    mat.identity().extractRotation(this.controller.matrixWorld);

    const origin = new THREE.Vector3().setFromMatrixPosition(this.controller.matrixWorld);
    const direction = new THREE.Vector3().set(0, 0, -1).applyMatrix4(mat);

    this.controllerRay.origin.copy(origin);
    this.controllerRay.direction.copy(direction);
  }

  private getVRMenu() {
    if (!this.cachedVRMenu) this.cachedVRMenu = this.grip.parent.getObjectByName('vrmenu');
    return this.cachedVRMenu;
  }

  private buildController(data: any) {
    let geometry, material;

    // See WebXR > Concepts > Targeting categories
    // https://immersive-web.github.io/webxr/input-explainer.html#concepts
    switch (data.targetRayMode) {
      // Pointers can be tracked separately from the viewer (e.g. Cculus touch controllers)
      case 'tracked-pointer':
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

        material = new THREE.LineBasicMaterial({
          vertexColors: true,
          blending: THREE.AdditiveBlending,
        });

        return new THREE.Line(geometry, material);

      // Gaze-based input sources do not have their own tracking mechanism and instead use the viewer’s head position for targeting.
      case 'gaze':
        geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
        material = new THREE.MeshBasicMaterial({
          opacity: 0.5,
          transparent: true,
        });
        return new THREE.Mesh(geometry, material);
    }
  }
}
