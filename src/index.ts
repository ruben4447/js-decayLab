import Sample from './Sample';
import Atom from './Atom';
import SampleManager, { LegendOptionValues } from './SampleManager';
import Popup from './Popup';
import globals from './globals';
import elementData from '../data/elements.json';
import { arrFromBack, arrLastItem, randomChoice } from './utils';

var wrapper: HTMLElement, canvas: HTMLCanvasElement;
globalThis.sample = undefined;
globalThis.mgr = undefined;

async function main() {
  wrapper = document.getElementById('wrapper');

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Close latest popup
      let popup = Popup.getTopmostPopup();
      if (popup != undefined) {
        popup.hide();
      }
    }
  });

  document.body.insertAdjacentHTML('beforeend', `<p><em>Decay Lab version ${globals.ver}</em></p>`);

  const sample = new Sample();
  globals.sample = sample;
  sample.onAtomDecay((atom, info, time) => {
    manager.updateLegend();
    console.log(`[${time} s] ${arrFromBack(atom.getHistory(), 2)} -> (${info.mode}) -> ${atom.getIsotopeSymbol()}`);
  });

  const manager = new SampleManager(wrapper);
  manager.width = 800;
  manager.height = 600;
  globals.manager = manager;
  manager.setSample(sample);
  manager.deployHTML(document.getElementById('controls'), document.getElementById('legend'));
  manager.sampleConfig.legend = LegendOptionValues.Elements;
  manager.initOptionsPopup();
  manager.setupLegend();
  manager.start();

  // let atom = Atom.fromIsotopeString('U-235');
  // manager.addAtomToSample(atom);
  // atom.pos(canvas.width / 2, canvas.height / 2);

  for (let i = 0; i < 100; i++) {
    let element = randomChoice(elementData.order);
    let isotope = randomChoice(Object.keys(elementData[element].isotopes));
    if (isotope == undefined) {
      i--;
    } else {
      let atom = Atom.fromIsotopeString(isotope);
      manager.addAtomToSample(atom);
    }
  }
}

main();