import Sample from './Sample';
import SampleManager from './SampleManager';
import Popup from './Popup';
import globals from './globals';
import { arrFromBack } from './utils';
import { DecayMode, EnumDecayMode, LegendOptionValues } from './InterfaceEnum';

var wrapper: HTMLElement;
var log: string = '';

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

  const elDecayOutput = document.getElementById('decay-output');

  const sample = new Sample();
  globals.sample = sample;
  sample.onAtomDecay((atom, info, time) => {
    const dmode = DecayMode[EnumDecayMode[info.mode]];
    manager.updateLegend();
    let text: string;
    if (info.success) {
      if (globals.manager.sampleConfig.decayAnimations) globals.sample.addAnimation(atom, info); // Push decay animation

      text = `DECAY @ ${time}s [✓] : ${arrFromBack(atom.getHistory(), 2).daughter} -> (${dmode}) -> ${atom.getIsotopeSymbol()}`;
    } else {
      const message = info.error === undefined ? '<unprovided>' : info.error.message;
      text = `DECAY @ ${time}s [⨯] : ${atom.getIsotopeSymbol()} -> (${dmode}) -> ${info.daughter} - ${message}`;
    }
    log += text + '\n';
    elDecayOutput.innerText = text;
  });
  sample.onAtomRemove((atom, reason) => {
    log += `REMOVE ${atom.getIsotopeSymbol()} : "${reason}" \n`;
  });
  
  const btnShowLog = document.getElementById('btn-view-log');
  btnShowLog.addEventListener('click', () => {
    const textarea = document.createElement('textarea');
    textarea.rows = 25;
    textarea.cols = 75;
    textarea.value = log;
    new Popup("Log")
      .insertAdjacentElement('beforeend', textarea)
      .show();
  });

  const manager = new SampleManager(wrapper);
  manager.width = 800;
  manager.height = 400;
  globals.manager = manager;
  manager.setSample(sample);
  manager.deployHTML(document.getElementById('controls'), document.getElementById('legend'));
  manager.sampleConfig.bindSpacebar = true;
  manager.sampleConfig.manualOverride = true;
  manager.sampleConfig.legend = LegendOptionValues.Radioactive;
  manager.initOptionsPopup();
  manager.setupLegend();
  manager.start();

  manager.insertRandomAtom('', 200);
}

main();