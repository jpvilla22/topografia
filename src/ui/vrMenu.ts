import * as THREE from 'three';
import { EventsDispatcher } from '../xr/EventsDispatcher';
import { htmlTemplate } from './vrMenuHtml';

export type TabTypes = 'main' | 'terrain' | 'illumination' | 'settings';
export type ModeTypes = 'navigate' | 'addPoint' | 'addPolygon' | 'remove';

type ModeIndex = {
  [key in ModeTypes]: { label: string };
};

type tabsIndexType = { [key: string]: HTMLElement };

export enum EventTypes {
  ON_MODE_CHANGED,
  ON_COLOR_CHANGED,
  ON_SLIDER_CHANGED,
}

function getBtnAttr(e: HTMLElement, attr: string) {
  let btn = (e as HTMLElement).closest('button');
  let a = btn.attributes.getNamedItem(attr);
  return a;
}

export class VRMenu extends EventsDispatcher {
  private tabs: tabsIndexType = {};
  private activeTab: TabTypes = 'main';
  private controlIndex = 0;
  private info: String;

  private currentSwatchColor: string | null = null;
  private currentColor: string | null = null;
  private swatchColors: string[] = [];
  private colors: string[] = [];

  private currentMode: ModeTypes | null = null;
  private modes: ModeIndex = {
    navigate: { label: 'Navegar' },
    addPoint: { label: 'Agregar punto' },
    addPolygon: { label: 'Agregar polígono' },
    remove: { label: 'Borrar' },
  };

  private domElement: HTMLElement;

  private colorButtons: HTMLButtonElement[] = [];
  private modeButtons: HTMLButtonElement[] = [];

  private versionCount = 0;

  constructor(sessionID: string) {
    super();

    this.domElement = document.createElement('div');
    this.domElement.setAttribute('id', 'vrmenu');
    this.domElement.innerHTML = htmlTemplate;

    //parentNode.append(this.domElement);

    this.buildTabs();
    this.onClickTab(this.activeTab);
    this.buildColorPallete();
    this.buildModesBar();
    this.setInfo('SessionID: ' + sessionID);
  }

  private buildTabs() {
    this.tabs['main'] = this.domElement.querySelector('#vrmenu #tab1');
    this.tabs['terrain'] = this.domElement.querySelector('#vrmenu #tab2');
    this.tabs['illumination'] = this.domElement.querySelector('#vrmenu #tab3');
    this.tabs['settings'] = this.domElement.querySelector('#vrmenu #tab4');

    for (let [k, v] of Object.entries(this.tabs)) {
      let anchor = this.domElement.querySelector('#vrmenu #topbar a[key="' + k + '"]');
      anchor.addEventListener('click', (e) => {
        let a = (e.target as HTMLElement).closest('a');
        let key = a.attributes.getNamedItem('key');
        if (key) this.onClickTab(key.value);
      });
    }
  }

  private buildModesBar() {
    let modesBar = this.domElement.querySelector('#vrmenu #modesBar');

    for (let [key, data] of Object.entries(this.modes)) {
      let html = data.label;

      let btn = document.createElement('button');
      btn.setAttribute('class', 'btn btn-primary btn-sm ');
      btn.setAttribute('type', 'button');
      btn.setAttribute('key', key);

      btn.innerHTML = html;
      modesBar.appendChild(btn);

      btn.addEventListener('click', (e) => {
        let key = getBtnAttr(e.target as HTMLElement, 'key');
        if (key) this.onClickModeButton(key.value as ModeTypes);
      });
      this.modeButtons.push(btn);
    }

    this.currentMode = Object.keys(this.modes)[0] as ModeTypes;

    this.updateModeButtons();
  }

  private onClickModeButton(mode: ModeTypes) {
    //console.log("onClickModeButton " + key)
    this.currentMode = mode;
    this.updateModeButtons();

    this.versionCount++;
    //this.setInfo('v:' + this.versionCount + ' k:' + mode);

    this.dispatchEvent({ type: EventTypes.ON_MODE_CHANGED, mode: mode });
  }

  private updateModeButtons() {
    this.modeButtons.forEach((btn, i) => {
      let key = btn.attributes.getNamedItem('key');
      btn.classList.remove('active');
      if (key.value == this.currentMode) {
        //btn.innerHTML = key.value
        //btn.style.backgroundColor = "green";
        btn.classList.add('active');
      } else {
        //btn.style.backgroundColor = "black";
        //btn.innerHTML = key.value
      }
    });
  }

  private buildColorPallete() {
    let colorsNode = this.domElement.querySelector('#colors');

    // for the 2d menu
    const swatchLumLevels = [0.65, 0.45];
    const swatchSatLevels = [0.35, 1];

    // for the 3d scene
    const lumLevels = [0.45, 0.5];
    const satLevels = [0.55, 1];

    const swatchesPerRow = 10;
    for (let row = 0; row <= 1; row++) {
      for (let h = 0; h <= swatchesPerRow; h++) {
        let hue = h / swatchesPerRow;

        let s1 = swatchSatLevels[row];
        let s2 = satLevels[row];

        let l1 = swatchLumLevels[row];
        let l2 = lumLevels[row];

        if (h == swatchesPerRow) {
          if (row == 0) {
            l1 = 0.35;
            l2 = 0.1;
          } else if (row == 1) {
            l1 = 0.6;
            l2 = 0.3;
          }
          s1 = 0;
          s2 = 0;
        }
        let c1 = new THREE.Color().setHSL(hue, s1, l1).getHexString();
        this.swatchColors.push(c1);

        let c2 = new THREE.Color().setHSL(hue, s2, l2).getHexString();
        this.colors.push(c2);

        if (this.currentSwatchColor == null) this.currentSwatchColor = c1;
        if (this.currentColor == null) this.currentColor = c2;
      }
    }

    let count = 0;
    this.swatchColors.forEach((c, index) => {
      let style = 'background-color:#' + c;

      let active = c === this.currentSwatchColor ? 'active' : '';

      let btn = document.createElement('button');
      btn.setAttribute('class', 'btn colorswatch ');
      btn.setAttribute('type', 'button');
      btn.setAttribute('style', style);
      btn.setAttribute('colorIndex', String(index));
      btn.setAttribute('swatchColor', c);
      btn.setAttribute('color', this.colors[index]);

      colorsNode.appendChild(btn);
      btn.addEventListener('click', (e) => {
        let colorIndexStr = getBtnAttr(e.target as HTMLElement, 'colorIndex').value;
        if (colorIndexStr) this.onClickColorButton(colorIndexStr);
      });

      if (count < swatchesPerRow) {
        count++;
      } else {
        let br = document.createElement('br');
        colorsNode.appendChild(br);
        count = 0;
      }

      this.colorButtons.push(btn);
    });

    this.updateColorButtons();
  }

  private onClickColorButton(colorIndexStr: string) {
    //console.log("onClickColorButton " + key)
    this.versionCount++;
    //this.setInfo('v:' + this.versionCount + ' color:' + colorHex);

    let i = parseInt(colorIndexStr);
    this.currentSwatchColor = this.swatchColors[i];
    this.currentColor = this.colors[i];

    this.updateColorButtons();
    this.updateTabs();
    this.dispatchEvent({ type: EventTypes.ON_COLOR_CHANGED, color: this.currentColor });
  }

  private updateColorButtons() {
    // recorro los botones de colores
    this.colorButtons.forEach((btn, i) => {
      let hex = btn.attributes.getNamedItem('swatchColor').value;

      btn.classList.remove('active');
      if (hex == this.currentSwatchColor) {
        btn.classList.add('active');
        btn.innerHTML = '<div class="dot"><div>';
      } else {
        btn.innerHTML = '';
      }
    });
  }

  private onClickTab(key: string) {
    this.activeTab = key as TabTypes;
    this.updateTabs();
  }

  private updateTabs() {
    for (let [k, v] of Object.entries(this.tabs)) {
      let anchor = this.domElement.querySelector('#topbar a[key="' + k + '"]');
      if (k != this.activeTab) {
        anchor.classList.remove('active');
        (v as HTMLElement).style.display = 'none';
      } else {
        anchor.classList.add('active');
        (v as HTMLElement).style.display = 'block';
      }
    }
  }

  private getControlIndex() {
    this.controlIndex++;
    return this.controlIndex - 1;
  }

  getDomElement() {
    return this.domElement;
  }

  addSlider(
    label: string,
    targetObj: any,
    property: string,
    tab: TabTypes,
    min: number,
    max: number,
    step: number = 1
  ) {
    if (!targetObj || !targetObj.hasOwnProperty(property))
      throw Error('VRMenu.addSlider targetObject.property=' + property + ' not defined. label:' + label);

    let currentValue = targetObj[property] as number;
    if (!step) step = 1;
    let idx = this.getControlIndex();

    let html = `<div class="row mt-2 sliderControl">
        <div class="col col-md-4 text-end label">${label}</div>
        <div class="col col-md-6 first">
          <input type="range" class="range lineal" min="${min}" max="${max}" step="${step}" value="${currentValue}" index="${idx}"/>
        </div>
        <div class="col col-md-2 display">${idx * 10}</div>`;

    let field = document.createElement('div');
    field.innerHTML = html;

    let internalOnChange: Function = null;
    this.tabs[tab].querySelector('.card-body').appendChild(field);

    let input = field.querySelector('.card-body input') as HTMLInputElement;
    let display = field.querySelector('.card-body .display');

    let mouseIsDown = false;

    // this method only occurs when trigger is releases or pressed
    // "change" event is not sintetized by HTMLMesh, so no event is trigger while mouse/controller button is being hold
    input.addEventListener('input', (e) => {
      let n = e.target as HTMLInputElement;
      display.innerHTML = n.value;
      let num = Number(n.value);

      targetObj[property] = num;

      if (internalOnChange) internalOnChange(num);

      this.dispatchEvent({ type: EventTypes.ON_SLIDER_CHANGED, value: num, label: label });
    });

    // the following event listeners are used to update the slider while trigger is being holded

    input.addEventListener('mousedown', (e) => {
      mouseIsDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      mouseIsDown = false;
    });

    window.addEventListener('mousemove', (e: any) => {
      if (mouseIsDown) {
        const rect = input.getBoundingClientRect();

        const width = rect.width;
        const offsetX = e.x - rect.x;
        let proportion = offsetX / width;

        proportion = Math.max(0, Math.min(1, proportion));

        let mappedValue = min + (max - min) * proportion;
        mappedValue = Math.floor(mappedValue / step) * step; //apply step

        let strValue = mappedValue.toFixed(3).replace(/0+$/, ''); // eliminate trailing zeros
        strValue = strValue.replace(/\.$/, ''); // eliminate a . without numbers to the right

        display.innerHTML = strValue;
        input.value = strValue;

        targetObj[property] = mappedValue;

        if (internalOnChange) internalOnChange(mappedValue);

        this.dispatchEvent({ type: EventTypes.ON_SLIDER_CHANGED, value: mappedValue, label: label });
      }
    });

    let sliderProxy = {
      onChange: (callback: Function) => {
        internalOnChange = callback;
      },
    };
    return sliderProxy;
  }

  addButton(label: string, text: string, targetObj: any, callback: string, tab: TabTypes) {
    if (!targetObj || !targetObj[callback])
      throw Error('VRMenu.addButton targetObject.' + callback + ' not defined. label:' + label);

    let func = targetObj[callback];

    let html = `
    <div class="row mt-2">
        <div class="col col-md-12"></div>
    </div>`;

    let row = document.createElement('div');
    row.innerHTML = html;

    let btn = document.createElement('button');
    btn.setAttribute('class', 'btn btn-primary btn-sm ');
    btn.setAttribute('type', 'button');
    btn.innerHTML = text;

    row.querySelector('.col').appendChild(btn);
    this.tabs[tab].querySelector('.card-body').appendChild(row);

    btn.addEventListener('click', (e) => {
      targetObj[callback]();
    });
  }

  getCurrentColor() {
    return this.currentColor;
  }

  getCurrentMode() {
    return this.currentMode;
  }

  private setInfo(txt: string) {
    let node = this.domElement.querySelector('#footer') as HTMLElement;
    node.innerHTML = txt;
  }
}
