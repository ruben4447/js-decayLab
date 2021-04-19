import type Sample from './Sample';
import { createLink, elSetDisabled, extractCoords, numberWithCommas, RADIOACTIVE_SYMBOL, randomHSBColour, randomInt, removeChildren, round, secondsToAppropriateTime, sortObjectByProperty, _timeUnits, _timeUnitStrings } from './utils';
import Atom from './Atom';
import { generateAtomInfo, generateDecayHistory, generateElementInfo, generateFullLegend, generatePeriodicTable } from './generate-info';
import Popup from './Popup';

export default class SampleManager {
  private _sample: Sample;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _rendering: boolean = false;
  private _removeEventsFn: () => void;
  private _simulationTime: HTMLSpanElement; // <span/> to show simulation's current time
  private _lastTime: number; // Last time inserted into DOM from #<Sample>.getTime()
  private _optionsPopup: Popup; // Popup for options. Initialised in this.initOptionsPopup()
  private _legendContainer: HTMLElement; // Container for sample legend
  private _legendData: { [item: string]: ILegendItem } = {}; // Data for legend
  public readonly sampleConfig = createSampleConfigObject();

  constructor(canvas: HTMLCanvasElement) {
    this._sample = undefined;
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._removeEventsFn = this._addEvents();
  }

  destroy() {
    this._removeEventsFn();
  }

  get width() { return this._canvas.width; }
  set width(w: number) { this._canvas.width = w; }
  get height() { return this._canvas.height; }
  set height(h: number) { this._canvas.height = h; }
  get ctx() { return this._ctx; }
  get canvas() { return this._canvas; }

  setSample(sample: Sample) {
    this._sample = sample;
    return this;
  }

  isRendering() { return this._rendering; }

  start() {
    if (!this._rendering) {
      this._rendering = true;
      this._render();
    }
    return this;
  }

  stop() {
    this._rendering = false;
    return this;
  }

  _render() {
    if (this._sample && typeof this._sample.render == 'function') this._sample.render(this);
    if (this._rendering) globalThis.requestAnimationFrame(this._render.bind(this));

    let currentTime = this._sample.getTime();
    if (this._lastTime != currentTime) {
      const { time, unit } = secondsToAppropriateTime(currentTime);
      this._simulationTime.innerText = `${numberWithCommas(time)} ${unit}`;
      this._lastTime = currentTime;
    }
  }

  /** Add atom to sample, in a random position */
  addAtomToSample(atom: Atom) {
    if (this._sample.isSimulationRunning()) {
      return false;
    } else {
      const pad = 10;
      const x = randomInt(pad, this.width - pad), y = randomInt(pad, this.height - pad);
      atom.pos(x, y);
      this._sample.addAtom(atom);
      this.updateLegend();
      return true;
    }
  }

  private _addEvents() {
    const self = this;

    let mouseCoords = [NaN, NaN], _atomOver: Atom | null;
    const setAtomOver = (atom: Atom | null) => {
      if (_atomOver != null) _atomOver.highlighted = false;
      _atomOver = atom;
      if (_atomOver != null) _atomOver.highlighted = true;
    };


    const onMouseMove = (event: MouseEvent) => {
      if (Popup.popupsOpen() === 0 && self.sampleConfig.interactiveAtoms) {
        mouseCoords = extractCoords(event);
        if (self._sample) {
          const atom = self._sample.getAtomOver(mouseCoords[0], mouseCoords[1]);
          setAtomOver(atom);
        }
      }
    };
    this._canvas.addEventListener('mousemove', onMouseMove);

    const onClick = (event: MouseEvent) => {
      if (Popup.popupsOpen() !== 0 || !self.sampleConfig.interactiveAtoms) return;

      if (_atomOver !== null) {
        const { title, body } = generateAtomInfo(_atomOver);
        let popup = new Popup(title);
        popup.insertAdjacentElement("beforeend", body);
        popup.show();
      }
    };
    this._canvas.addEventListener('click', onClick);

    const onKeyDown = (event: KeyboardEvent) => {
      if (Popup.popupsOpen() === 0 && self.sampleConfig.interactiveAtoms && _atomOver) {
        if (event.key == 'd') {
          /// FORCE DECAY
          self._sample.atomDecay(_atomOver, true);
        } else if (event.key == 'l') {
          /// DEBUG: LOG INFO
          console.log(_atomOver);
        } else if (event.key == 'Delete') {
          if (!this._sample.isSimulationRunning()) {
            /// DELETE (prompt)
            let symbol = _atomOver.getIsotopeSymbol();
            let link = createLink(`Remove isotope ${symbol} from sample`);
            link.addEventListener('click', () => {
              this._sample.removeAtom(_atomOver);
              setAtomOver(null);
              popup.hide();
            });
            let popup = new Popup(`Remove ${symbol}?`);
            popup.insertAdjacentElement('beforeend', link);
            popup.show();
          }
        } else if (event.key == 'h') {
          /// DECAY HISTORY
          const { title, body } = generateDecayHistory(_atomOver.getHistory());
          new Popup(title).insertAdjacentElement('beforeend', body).show();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      this._canvas.removeEventListener('mousemove', onMouseMove);
      this._canvas.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }

  public initOptionsPopup() {
    this._optionsPopup = new Popup("Options");
    const body = document.createElement('div');
    body.classList.add('scroll-window');
    body.style.textAlign = 'left';
    this._optionsPopup.insertAdjacentElement('beforeend', body);

    /// Atom
    body.insertAdjacentHTML('beforeend', '<span class="heading">Atoms</span><br>');
    body.insertAdjacentHTML('beforeend', '<abbr title="Show isotope text, radioactive symbol and size depending upon isotopic mass">Pretty</abbr>: ');
    let checkboxPrettyStyle = document.createElement('input');
    checkboxPrettyStyle.type = 'checkbox';
    checkboxPrettyStyle.checked = this.sampleConfig.prettyStyle;
    checkboxPrettyStyle.addEventListener('change', () => {
      this.sampleConfig.prettyStyle = checkboxPrettyStyle.checked;
      elSetDisabled(inputAtomRadius, this.sampleConfig.prettyStyle);
    })
    body.appendChild(checkboxPrettyStyle);

    body.insertAdjacentHTML('beforeend', '<br><abbr title="Radius of atoms">Atom Radius</abbr>: ');
    let inputAtomRadius = document.createElement('input');
    inputAtomRadius.type = 'number';
    inputAtomRadius.min = '5';
    inputAtomRadius.max = '100';
    inputAtomRadius.value = this.sampleConfig.atomRadius.toString();
    elSetDisabled(inputAtomRadius, true);
    inputAtomRadius.addEventListener('change', () => {
      let value = parseInt(inputAtomRadius.value);
      if (isNaN(value) || value < parseInt(inputAtomRadius.min) || value > parseInt(inputAtomRadius.max)) {
        inputAtomRadius.value = this.sampleConfig.atomRadius.toString();
        new Popup("Invalid Input").insertAdjacentText("beforeend", `Invalid input for atom radius: "${value}" (between ${inputAtomRadius.min} and ${inputAtomRadius.max})`).show();
      } else {
        this.sampleConfig.atomRadius = value;
      }
    })
    body.appendChild(inputAtomRadius);

    body.insertAdjacentHTML('beforeend', '<br><abbr title="Click on atoms, keyboard events over atoms, ...">Interactive</abbr>: ');
    let checkboxInteractiveAtoms = document.createElement('input');
    checkboxInteractiveAtoms.type = 'checkbox';
    checkboxInteractiveAtoms.checked = this.sampleConfig.interactiveAtoms;
    checkboxInteractiveAtoms.addEventListener('change', () => {
      this.sampleConfig.interactiveAtoms = checkboxInteractiveAtoms.checked;
    });
    body.appendChild(checkboxInteractiveAtoms);

    /// Legend
    body.insertAdjacentHTML('beforeend', '<hr> <span class="heading">Legend</span><br>');
    const legendOptions = Object.keys(LegendOptionValues).filter(x => isNaN(parseInt(x))); // Get only string members of enum
    for (const legendOption of legendOptions) {
      let radioBtn = document.createElement('input');
      radioBtn.type = 'radio';
      radioBtn.name = 'option-legend';
      radioBtn.value = legendOption;
      if (this.sampleConfig.legend === LegendOptionValues[legendOption]) radioBtn.checked = true;
      radioBtn.addEventListener('change', () => {
        this.sampleConfig.legend = LegendOptionValues[legendOption];
        this.setupLegend();
        this.updateLegend();
      })
      body.appendChild(radioBtn);
      body.insertAdjacentHTML('beforeend', legendOption + '<br>');
    }

    body.insertAdjacentHTML('beforeend', '<abbr title="Max number of items to show in legend overview">Max Length</abbr>: ');
    let inputLegendLength = document.createElement('input');
    inputLegendLength.type = 'number';
    inputLegendLength.min = "1";
    inputLegendLength.max = "100";
    inputLegendLength.value = this.sampleConfig.legendLength.toString();
    inputLegendLength.addEventListener('change', () => {
      let value = parseInt(inputLegendLength.value);
      if (isNaN(value) || value < parseInt(inputLegendLength.min) || value > parseInt(inputLegendLength.max)) {
        inputLegendLength.value = this.sampleConfig.legendLength.toString();
        new Popup("Invalid Input").insertAdjacentText('beforeend', `Invalid legend length "${value}" (between 0 and ${inputLegendLength.min} and ${inputLegendLength.max})`).show();
      } else {
        this.sampleConfig.legendLength = value;
        this.updateLegend();
      }
    });
    body.appendChild(inputLegendLength);
  }

  deployHTML(container: HTMLElement, legendContainer: HTMLElement) {
    this._legendContainer = legendContainer;
    let fieldset = document.createElement('fieldset');
    container.appendChild(fieldset);
    // fieldset.insertAdjacentHTML('beforeend', '<legend>Controls</legend>');

    let btnPtable = document.createElement('button');
    btnPtable.innerText = 'Periodic Table';
    btnPtable.addEventListener('click', () => {
      const { title, body } = generatePeriodicTable(element => {
        const { title, body } = generateElementInfo(element);
        let popup = new Popup(title);
        popup.insertAdjacentElement('beforeend', body);
        popup.show();
      });
      let ptablePopup = new Popup(title);
      ptablePopup.insertAdjacentElement('beforeend', body);
      ptablePopup.show();
    });
    fieldset.appendChild(btnPtable);

    let btnOptions = document.createElement('button');
    btnOptions.innerText = 'Options';
    btnOptions.addEventListener('click', () => this._optionsPopup.show());
    fieldset.appendChild(btnOptions);

    let timeSpan = document.createElement('span'), p = document.createElement('p');
    this._simulationTime = timeSpan;
    timeSpan.innerText = '- s';
    p.insertAdjacentText('beforeend', 'Time Elapsed: ');
    p.insertAdjacentElement('beforeend', timeSpan);
    p.insertAdjacentHTML('beforeend', ' &nbsp;&nbsp;(+ ');
    let timeInput = document.createElement('input');
    timeInput.type = "number";
    timeInput.value = this._sample.getIncTimeAmount().toString();
    timeInput.min = "0";
    timeInput.addEventListener('change', () => {
      let value = parseInt(timeInput.value);
      if (value <= 0) {
        timeInput.value = this._sample.getIncTimeAmount().toString();
        new Popup("Invalid Input").insertAdjacentText("beforeend", `Invalid time: ${value}`).show();
      } else {
        let mult = parseInt(_timeUnits[timeUnitSelect.value]);
        this._sample.setIncTimeAmount(value * mult);
      }
    })
    p.insertAdjacentElement('beforeend', timeInput);
    p.insertAdjacentHTML('beforeend', '&nbsp;');
    let timeUnitSelect = document.createElement('select');
    for (let unit in _timeUnitStrings) {
      timeUnitSelect.insertAdjacentHTML('beforeend', `<option value='${unit}'>${_timeUnitStrings[unit]}s</option>`);
    }
    timeUnitSelect.addEventListener('change', () => {
      let mult = parseInt(_timeUnits[timeUnitSelect.value]);
      this._sample.setIncTimeAmount(parseInt(timeInput.value) * mult);
    });
    p.insertAdjacentElement('beforeend', timeUnitSelect);
    p.insertAdjacentHTML('beforeend', ' per actual second)');
    fieldset.appendChild(p);

    let btnToggle = document.createElement('button'), onclickStart = true;
    btnToggle.innerText = 'Start';
    btnToggle.addEventListener('click', () => {
      if (onclickStart) {
        onclickStart = false;
        btnToggle.innerText = 'Pause';
        this._sample.startSimulation();
        // timeSpan.innerText = this._sample.getTime().toString();
        timeInput.setAttribute('disabled', 'disabled');
        btnStep.setAttribute('hidden', 'hidden');
        btnReset.setAttribute('hidden', 'hidden');
        timeUnitSelect.setAttribute('disabled', 'disabled');
      } else {
        onclickStart = true;
        btnToggle.innerText = 'Start';
        this._sample.stopSimulation();
        timeInput.removeAttribute('disabled');
        btnStep.removeAttribute('hidden');
        btnReset.removeAttribute('hidden');
        timeUnitSelect.removeAttribute('disabled');
      }
    });
    fieldset.appendChild(btnToggle);

    let btnStep = document.createElement('button');
    btnStep.innerText = 'Step';
    btnStep.addEventListener('click', () => this._sample.simulationStep());
    fieldset.appendChild(btnStep);

    let btnReset = document.createElement('button');
    btnReset.innerText = 'Reset';
    btnReset.addEventListener('click', () => {
      this._sample.resetSimulation();
      this.updateLegend();
    });
    fieldset.appendChild(btnReset);
  }

  /** Setup legend inside element */
  setupLegend() {
    const body = this._legendContainer;
    body.innerHTML = '';
    this._legendData = {};
    body.dataset.legend = LegendOptionValues[this.sampleConfig.legend];
  }

  updateLegend() {
    if (this.sampleConfig.legend == LegendOptionValues.None) return;

    const totalAtoms = this._sample.getAtomCount();
    let radioactiveCount = 0;

    for (let string in this._legendData) this._legendData[string].count = 0; // Zero eny existing data in legend
    this._sample.forEachAtom((atom) => {
      let string = this.getLegendString(atom);

      if (!this._legendData.hasOwnProperty(string)) {
        const [r, g, b] = randomHSBColour();
        this._legendData[string] = { colour: `rgb(${r}, ${g}, ${b})`, percent: -1, count: 0 };
      }
      if (!atom.isStable()) radioactiveCount++;
      this._legendData[string].count++;
    });

    for (let string in this._legendData) {
      if (this._legendData[string].count == 0) {
        delete this._legendData[string];
      } else {
        this._legendData[string].percent = (this._legendData[string].count / totalAtoms) * 100;
      }
    }

    sortObjectByProperty(this._legendData, 'percent', true);

    const body = this._legendContainer;
    body.innerHTML = '';
    // Radioactive?
    let radioactivePercent = (radioactiveCount / totalAtoms) * 100;
    body.insertAdjacentHTML('beforeend', `<span>${totalAtoms} atoms &rarr; ${numberWithCommas(radioactiveCount)} ${RADIOACTIVE_SYMBOL} : ${numberWithCommas(totalAtoms - radioactiveCount)}  (<span title='${radioactivePercent}%'>${round(radioactivePercent, 3)}% ${RADIOACTIVE_SYMBOL}</span>)</span><br>`);

    // Atom legend
    body.insertAdjacentElement('beforeend', generateFullLegend(totalAtoms, this._legendData, this.sampleConfig.legendLength));
  }

  /** Given an atom, return this._legendData property which it falls into */
  getLegendString(atom: Atom) {
    let string;
    if (this.sampleConfig.legend === LegendOptionValues.Isotopes) string = atom.getIsotopeSymbol();
    else if (this.sampleConfig.legend === LegendOptionValues.Elements) string = atom.getElementName();
    else if (this.sampleConfig.legend === LegendOptionValues.Radioactive) string = atom.isStable() ? 'Stable' : 'Radioactive';
    else throw new Error(`Unknown legend option ${this.sampleConfig.legend}`);
    return string;
  }

  /** Get legend item for an atom */
  getLegendItem(atom: Atom) {
    return this._legendData[this.getLegendString(atom)];
  }
}



export const atomGetStringDependingOnLegend = (atom: Atom, legend: LegendOptionValues) => {
}

export interface ISampleConfig {
  prettyStyle: boolean; // Show atoms with text, varying size from mass?
  atomRadius: number; // If !prettyStyle, what is the radius of each atom?
  interactiveAtoms: boolean; // Interactive Atoms?
  legend: LegendOptionValues; // Legend to display
  legendLength: number; // Number of items in legend
}

export enum LegendOptionValues {
  None, // No Legend
  Isotopes, // All isotopes
  Elements, // Only elements
  Radioactive,
}

export interface ILegendItem {
  colour: string;
  count: number; // Number of items
  percent: number; // Percentage of sample
}

export function createSampleConfigObject(): ISampleConfig {
  return {
    prettyStyle: true,
    atomRadius: 20,
    interactiveAtoms: true,
    legend: LegendOptionValues.None,
    legendLength: 7,
  };
}