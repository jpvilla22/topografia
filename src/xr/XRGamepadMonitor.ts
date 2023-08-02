import * as THREE from 'three';
import { EventsDispatcher } from './EventsDispatcher';

export type Handedness = 'left' | 'right';
export type ButtonName = 'Trigger' | 'Grip' | 'Joystick' | 'ButtonX' | 'ButtonY' | 'ButtonA' | 'ButtonB';
type ButtonsMappingType = { left: ButtonName[]; right: ButtonName[] };

const AXES_DEAD_ZONE = 0.4;
const HOLD_THRESHOLD = 0.7;
const HOLDED_EVENT_INTERVAL = 0.8; // in seconds

const buttonsMapping: ButtonsMappingType = {
  left: [
    /* 0 */ 'Trigger',
    /* 1 */ 'Grip',
    /* 2 */ null,
    /* 3 */ 'Joystick',
    /* 4 */ 'ButtonX',
    /* 5 */ 'ButtonY',
    /* 6 */ null,
    /* 7 */ null,
  ],
  right: [
    /* 0 */ 'Trigger',
    /* 1 */ 'Grip',
    /* 2 */ null,
    /* 3 */ 'Joystick',
    /* 4 */ 'ButtonA',
    /* 5 */ 'ButtonB',
    /* 6 */ null,
    /* 7 */ null,
  ],
};

export enum EventTypes {
  ON_BUTTON_UP,
  ON_BUTTON_DOWN,
  ON_AXIS_CHANGED,
  ON_AXIS_X_HOLDED, // is triggered every N seconds while the X axis of the stick is being hold out of the (0,0)
  ON_AXIS_Y_HOLDED, // same but for Y axis
  ON_AXIS_FORWARD_DOWN,
  ON_AXIS_FORWARD_UP,
  ON_AXIS_BACKWARD_DOWN,
  ON_AXIS_BACKWARD_UP,
  ON_AXIS_LEFT_DOWN,
  ON_AXIS_LEFT_UP,
  ON_AXIS_RIGHT_DOWN,
  ON_AXIS_RIGHT_UP,
}

/**
 * Source: https://stackoverflow.com/questions/62476426/webxr-controllers-for-button-pressing-in-three-js
 */
export class XRGamepadMonitor extends EventsDispatcher {
  private buttonsState: boolean[] = null;
  private axesPreviousState: number[] = null;
  private handedness: Handedness;
  private xr: THREE.WebXRManager;

  private stickPosition: THREE.Vector2 = new THREE.Vector2();
  private stickRawPosition: THREE.Vector2 = new THREE.Vector2();
  private stickPreviousPosition: THREE.Vector2 = new THREE.Vector2();
  private stickHoldingTimer: number = 0;

  private forwardIsDown = false;
  private backwardIsDown = false;
  private leftIsDown = false;
  private rightIsDown = false;

  constructor(xr: THREE.WebXRManager, handedness: Handedness) {
    super();
    this.xr = xr;
    this.handedness = handedness;
  }

  update(delta: number) {
    this.pollControllers(delta);
  }

  isDown(button: ButtonName): boolean {
    if (!this.buttonsState) return false;

    const buttonIdx = buttonsMapping[this.handedness].findIndex((name) => name == button);

    if (buttonIdx < 0) return false;
    else return this.buttonsState[buttonIdx];
  }

  getStickPosition(): THREE.Vector2 {
    return this.stickPosition.clone();
  }

  private pollControllers(delta: number) {
    let session = this.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
      if (source && source.handedness && source.handedness == this.handedness) {
        if (!source.gamepad) return;
        this.pollButtons(source.gamepad);
        this.pollAxes(source.gamepad, delta);
      }
    }
  }

  private pollAxes(gamepad: Gamepad, delta: number) {
    if (gamepad.axes.length >= 4) {
      this.stickRawPosition = new THREE.Vector2(gamepad.axes[2], gamepad.axes[3]);
      this.stickPosition = this.applyDeadZone([gamepad.axes[2], gamepad.axes[3]]);

      if (this.stickPreviousPosition.distanceTo(this.stickPosition) > 0) {
        this.dispatchEvent({
          type: EventTypes.ON_AXIS_CHANGED,
          handedness: this.handedness,
          position: this.stickPosition,
          frameDelta: delta,
        });

        let eType: EventTypes | null = null;

        if (
          Math.abs(this.stickPreviousPosition.y) < HOLD_THRESHOLD &&
          Math.abs(this.stickPosition.y) > HOLD_THRESHOLD
        ) {
          if (this.stickPosition.y < 0 && !this.forwardIsDown) {
            eType = EventTypes.ON_AXIS_FORWARD_DOWN;
            this.forwardIsDown = true;
          }

          if (this.stickPosition.y > 0 && !this.backwardIsDown) {
            eType = EventTypes.ON_AXIS_BACKWARD_DOWN;
            this.backwardIsDown = true;
          }
        }

        if (Math.abs(this.stickPosition.y) < HOLD_THRESHOLD) {
          if (this.forwardIsDown) {
            eType = EventTypes.ON_AXIS_FORWARD_UP;
            this.forwardIsDown = false;
          }
          if (this.backwardIsDown) {
            eType = EventTypes.ON_AXIS_BACKWARD_UP;
            this.backwardIsDown = false;
          }
        }

        if (
          Math.abs(this.stickPreviousPosition.x) < HOLD_THRESHOLD &&
          Math.abs(this.stickPosition.x) > HOLD_THRESHOLD
        ) {
          if (this.stickPosition.x < 0 && !this.leftIsDown) {
            eType = EventTypes.ON_AXIS_LEFT_DOWN;
            this.leftIsDown = true;
          }

          if (this.stickPosition.x > 0 && !this.rightIsDown) {
            eType = EventTypes.ON_AXIS_RIGHT_DOWN;
            this.rightIsDown = true;
          }
        }
        if (Math.abs(this.stickPosition.x) < HOLD_THRESHOLD) {
          if (this.leftIsDown) {
            eType = EventTypes.ON_AXIS_LEFT_UP;
            this.leftIsDown = false;
          }
          if (this.rightIsDown) {
            eType = EventTypes.ON_AXIS_RIGHT_UP;
            this.rightIsDown = false;
          }
        }

        if (eType) {
          this.dispatchEvent({
            type: eType,
            handedness: this.handedness,
            position: this.stickPosition,
            frameDelta: delta,
          });
        }
      }
      this.checkStickHolding(delta);
      this.stickPreviousPosition.copy(this.stickPosition);
    }
  }

  private checkStickHolding(delta: number) {
    if (this.stickPosition.length() > 0 && this.stickHoldingTimer <= 0) {
      // if the holding timer reached 0

      if (Math.abs(this.stickRawPosition.x) > HOLD_THRESHOLD) {
        // dispatch AXIS_X_HOLDED event every HOLDED_EVENT_INTERVAL seconds
        this.dispatchEvent({
          type: EventTypes.ON_AXIS_X_HOLDED,
          handedness: this.handedness,
          value: this.stickPosition.x,
        });
      }
      if (Math.abs(this.stickPosition.y) > HOLD_THRESHOLD) {
        // dispatch AXIS_Y_HOLDED event every HOLDED_EVENT_INTERVAL seconds
        this.dispatchEvent({
          type: EventTypes.ON_AXIS_Y_HOLDED,
          handedness: this.handedness,
          value: this.stickPosition.y,
        });
      }
      this.stickHoldingTimer = HOLDED_EVENT_INTERVAL; // re set the timer to HOLDED_EVENT_INTERVAL
    } else {
      // no time to dispatch events yet
      this.stickHoldingTimer = Math.max(0, this.stickHoldingTimer - delta); // decrease timer value
    }
  }

  private applyDeadZone(values: number[]): THREE.Vector2 {
    /*
      for each component of values, if abs(x)<AXES_DEAD_ZONE x=0

    */
    values.map((value) => {
      let x;
      if (value < 0) x = Math.min(0, value + AXES_DEAD_ZONE);
      else x = Math.max(0, value - AXES_DEAD_ZONE);
      return x;
    });
    return new THREE.Vector2(values[0], values[1]);
  }

  private pollButtons(gamepad: Gamepad) {
    const previousState = this.buttonsState;
    const newState: boolean[] = gamepad.buttons.map((b: any) => b.pressed);

    if (!previousState) {
      // First frame
      this.buttonsState = newState;
      return;
    }

    newState.forEach((state, i) => {
      // Check if button was pressed on this frame
      if (previousState[i] === false && state === true) {
        this.dispatchEvent({
          type: EventTypes.ON_BUTTON_DOWN,
          index: i,
          button: buttonsMapping[this.handedness][i],
          handedness: this.handedness,
        });
      }

      // Check if button was released on this frame
      if (previousState[i] === true && state === false) {
        this.dispatchEvent({
          type: EventTypes.ON_BUTTON_UP,
          index: i,
          button: buttonsMapping[this.handedness][i],
          handedness: this.handedness,
        });
      }
    });

    this.buttonsState = newState;
  }
}
