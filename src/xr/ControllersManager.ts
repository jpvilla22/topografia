import * as THREE from 'three';
import { SceneManager } from '../SceneManager';
import { HandController } from './HandController';
import { Handedness } from './XRGamepadMonitor';

export class ControllersManager {
  xr: THREE.WebXRManager;
  sceneManager: SceneManager;

  private controller0: HandController;
  private controller1: HandController;
  private userHandedness: Handedness = 'right';
  private vrMenu?: THREE.Object3D;

  constructor(xr: THREE.WebXRManager, sceneMngr: SceneManager) {
    this.xr = xr;
    this.sceneManager = sceneMngr;
    this.sceneManager.controllersManager = this;
  }

  get connected(): boolean {
    return this.controller0?.connected && this.controller1?.connected;
  }

  get skilledHand(): HandController {
    if (this.controller0.handedness == this.userHandedness) return this.controller0;
    else return this.controller1;
  }

  get otherHand(): HandController {
    if (this.controller0.handedness != this.userHandedness) return this.controller0;
    else return this.controller1;
  }

  get right(): HandController {
    if (this.controller0.handedness == 'right') return this.controller0;
    else return this.controller1;
  }

  get left(): HandController {
    if (this.controller0.handedness == 'left') return this.controller0;
    else return this.controller1;
  }

  setup(vrMenu: THREE.Object3D) {
    this.vrMenu = vrMenu;
    this.controller0 = new HandController(this.xr, this.sceneManager);
    this.controller0.setup(0);

    this.controller1 = new HandController(this.xr, this.sceneManager);
    this.controller1.setup(1);

    this.controller0.onConnectedListener(this.onControllerConnected.bind(this, this.controller0));
    this.controller1.onConnectedListener(this.onControllerConnected.bind(this, this.controller1));

    // Debug stuff
    (window as any).handController0 = this.controller0;
    (window as any).handController1 = this.controller1;
  }

  update() {
    this.controller0?.update();
    this.controller1?.update();
  }

  toggleVRMenu(visible?: boolean) {
    if (!this.vrMenu) return;

    if (visible == undefined) visible = !this.vrMenu.visible;

    this.vrMenu.visible = visible;
  }

  toggleHandedness(handedness?: Handedness) {
    if (handedness == undefined) handedness = this.userHandedness == 'right' ? 'left' : 'right';

    this.userHandedness = handedness;

    this.right.skilled = handedness == 'right';
    this.left.skilled = handedness == 'left';

    this.vrMenu.removeFromParent();
    this.otherHand.getGrip().add(this.vrMenu);
  }

  private onControllerConnected(controller: HandController, event: any) {
    if (this.userHandedness == controller.handedness) {
      controller.skilled = true;
    } else {
      controller.skilled = false;
      controller.getGrip().add(this.vrMenu);
    }
  }
}
