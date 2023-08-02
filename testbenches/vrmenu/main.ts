import { VRMenu } from '../../src/ui/vrMenu';

let params = {
  factor1: 0,
  factor2: 10,
  factor3: 75,
  factor4: 5,
  factor5: 25,
  doAction1: function () {
    console.log('doAction1');
  },
};

function start() {
  let menu = new VRMenu('ABCDE');
  let domElement = menu.getDomElement();
  document.body.append(domElement);

  let s = menu.addSlider('factor1', params, 'factor1', 'terrain', 0, 10, 0.01);
  s.onChange((value: number) => {
    console.log('onChange ' + value);
  });

  s = menu.addSlider('factor2', params, 'factor2', 'terrain', 5, 15);
  s.onChange((value: number) => {
    console.log('onChange ' + value);
  });
  s = menu.addSlider('factor3', params, 'factor3', 'illumination', 50, 200);

  s = menu.addSlider('factor4', params, 'factor4', 'settings', 50, 200);

  let b = menu.addButton('label', ' do action 1', params, 'doAction1', 'main');

  // Select the node that will be observed for mutations
  const targetNode = menu.getDomElement();

  // Options for the observer (which mutations to observe)
  const config = { attributes: true, childList: true, subtree: true };

  // Callback function to execute when mutations are observed
  const callback = () => {
    console.log('mutated');
  };
}

start();
