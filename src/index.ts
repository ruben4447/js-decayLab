import Sample from './Sample';
import Atom from './Atom';
import SampleManager from './SampleManager';
import Popup from './Popup';
import globals from './globals';
import elementData from '../data/elements.json';
import { arrFromBack, randomChoice } from './utils';
import { LegendOptionValues, RenderMode } from './InterfaceEnum';

var wrapper: HTMLElement;

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
    if (info.success) {
      console.log(`%c✓ [${time} s] decay: ${arrFromBack(atom.getHistory(), 2)} -> (${info.mode}) -> ${atom.getIsotopeSymbol()}`, 'color:forestgreen;');
    } else {
      console.log(`%c⨯ [${time} s] decay failed: ${atom.getIsotopeSymbol()} -> (${info.mode}) -> ${info.daughter}`, 'color:tomato;');
    }
  });
  sample.onAtomRemove(atom => {
    console.log(`Removed atom ${atom.getIsotopeSymbol()}`);
  });

  const manager = new SampleManager(wrapper);
  manager.width = 800;
  manager.height = 400;
  globals.manager = manager;
  manager.setSample(sample);
  manager.deployHTML(document.getElementById('controls'), document.getElementById('legend'));
  manager.sampleConfig.legend = LegendOptionValues.Radioactive;
  manager.sampleConfig.manualOverride = true;
  manager.initOptionsPopup();
  manager.setupLegend();
  manager.start();

  manager.addAtomToSample(new Atom("Ub-429"));

  // for (let i = 0; i < 100; i++) {
  //   let element = randomChoice(elementData.order);
  //   let isotope = randomChoice(Object.keys(elementData[element].isotopes));
  //   if (isotope == undefined) {
  //     i--;
  //   } else {
  //     let atom = Atom.fromIsotopeString(isotope);
  //     manager.addAtomToSample(atom);
  //   }
  // }
}

main();