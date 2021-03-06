import type Sample from './Sample';
import { analyseString, bestColour, createLink, elSetDisabled, extractCoords, getRandomIsotopeString, numberWithCommas, RADIOACTIVE_SYMBOL, randomHSBColour, randomInt, round, secondsToAppropriateTime, sortObjectByProperty, _timeUnits, _timeUnitStrings } from './utils';
import Atom from './Atom';
import { clickLegendLink, generateAtomInfo, generateDecayHistory, generateEditProtonNeutronCount, generateElementInfo, generateForceDecayInterface, generateFullLegend, generateInsertPopup, generatePeriodicTable } from './generate-info';
import Popup from './Popup';
import Piechart from './Piechart';
import { AtomType, createSampleConfigObject, EnumDecayMode, ILegendItem, LegendOptionValues, RenderMode } from './InterfaceEnum';
import globals from './globals';

export default class SampleManager {
  private _sample: Sample;
  private _wrapper: HTMLElement;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _rendering: boolean = false;
  private _removeEventsFn: () => void;
  private _simulationTime: HTMLSpanElement; // <span/> to show simulation's current time
  private _lastTime: number; // Last time inserted into DOM from #<Sample>.getTime()
  private _optionsPopup: Popup; // Popup for options. Initialised in this.initOptionsPopup()
  private _legendContainer: HTMLElement; // Container for sample legend
  private _legendData: { [item: string]: ILegendItem } = {}; // Data for legend
  private _chart: Piechart; // For containing chart in rendering
  private _chartLabelOver: string; // Label of section we are over
  private _btnToggleSimulation: HTMLButtonElement; // Button to start/stop the simulation
  public readonly sampleConfig = createSampleConfigObject();
  private _mainAtomType: AtomType;
  private _mainAtom: string;

  constructor(wrapper: HTMLElement) {
    this._sample = undefined;
    this._wrapper = wrapper;
    this._canvas = document.createElement("canvas");
    this._wrapper.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');
    this._removeEventsFn = this._addEvents();
    this._chart = new Piechart(this._canvas);
    this._chart.setPos(this._canvas.width / 2, this._canvas.height / 2);
  }

  setMainAtom(str: string, type?: AtomType): boolean {
    let ok: boolean;
    if (type !== undefined) this._mainAtomType = type;
    try { 
      let info = analyseString(str);
      this._mainAtom = this._mainAtomType == 'element' ? info.name || info.IUPACName : info.isotopeSymbol;
      ok = true;
    } catch {
      ok = false;
    }
    if (this.sampleConfig.legend === LegendOptionValues.Main) this.updateLegend();
    return ok;
  }

  getMainAtom() {
    return {
      type: this._mainAtomType,
      value: this._mainAtom,
    };
  }

  destroy() {
    this._removeEventsFn();
  }

  get width() { return this._canvas.width; }
  set width(w: number) {
    let oldWidth = this.width;
    this._canvas.width = w;
    this._chart.x = w / 2; // Centre chart in x plane
    this._chart.radius = Math.min(w / 3, this.height / 3); // Set chart radius
    if (this._sample) this._sample.forEachAtom((atom) => atom.x = (atom.x / oldWidth) * w); // Scale x positions to fit inside new width
  }
  get height() { return this._canvas.height; }
  set height(h: number) {
    let oldHeight = this.height;
    this._canvas.height = h;
    this._chart.y = h / 2;
    this._chart.radius = Math.min(h / 3, this.width / 3); // Centre chart in y plane
    if (this._sample) this._sample.forEachAtom(atom => atom.y = (atom.y / oldHeight) * h); // Scale y positions to fit inside new height
  }
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
    if (this.sampleConfig.renderMode == RenderMode.Piechart) {
      this.clearCanvasBG(null);
      this._chart.reset();
      for (let key in this._legendData) {
        if (this._legendData.hasOwnProperty(key)) {
          this._chart.setData(key, this._legendData[key].count, this._legendData[key].rgb);
        }
      }
      this._chart.render(this._chartLabelOver);

      if (this._chartLabelOver !== undefined) {
        const label = this._chartLabelOver, xpad = 5, ypad = 5, ldata = this._chart.getData(label);
        if (ldata) {
          this._ctx.font = '13px sans-serif';
          let percent = (ldata.count / this._chart.getTotal()) * 100;
          const text = `${label} - ${round(percent, 2)}%`;

          const obj = this._ctx.measureText(text);
          const twidth = obj.width, theight = obj.actualBoundingBoxAscent + obj.actualBoundingBoxDescent;

          let ypos = this._canvas.height - theight - 2 * ypad;
          this._ctx.beginPath();
          this._ctx.fillStyle = bestColour(ldata.rgb);
          this._ctx.rect(0, ypos, twidth + 2 * xpad, theight + 2 * ypad);
          this._ctx.fill();

          this._ctx.fillStyle = ldata.colour;
          this._ctx.textAlign = 'left';
          this._ctx.textBaseline = 'top';
          this._ctx.fillText(text, xpad, ypos + ypad);
        }
      }
    } else {
      this.clearCanvasBG();
      this._sample.render(this);
    }

    if (this._rendering) globalThis.requestAnimationFrame(this._render.bind(this));

    let currentTime = this._sample.getTime();
    if (this._lastTime != currentTime) {
      const { time, unit } = secondsToAppropriateTime(currentTime);
      this._simulationTime.innerText = `${numberWithCommas(time)} ${unit}`;
      this._lastTime = currentTime;
    }
  }

  private clearCanvasBG(fillColour = "rgb(141, 141, 141)") {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    if (typeof fillColour === 'string') {
      this._ctx.fillStyle = "rgb(141, 141, 141)";
      this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }

  /** Add atom to sample, in a random position */
  addAtomToSample(atom: Atom) {
    if (this._sample.isSimulationRunning()) {
      return false;
    } else {
      const pad = atom.getRadius();
      const x = randomInt(pad, this.width - pad), y = randomInt(pad, this.height - pad);
      atom.pos(x, y);
      this._sample.addAtom(atom);
      this.updateLegend();
      return true;
    }
  }

  /** Prepare to begin simulation */
  prepareForSimulation() {
    // Remove all theoretical atoms
    const self = this;
    this._sample.forEachAtom(atom => {
      if (!atom.get<boolean>('exists')) {
        self._sample.removeAtom(atom, "atom does not exist");
      }
    });
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
      if (Popup.popupsOpen() === 0 && self.sampleConfig.interactive) {
        /// RenderMode=Atoms
        if (self.sampleConfig.renderMode == RenderMode.Atoms) {
          mouseCoords = extractCoords(event);
          if (self._sample) {
            const atom = self._sample.getAtomOver(mouseCoords[0], mouseCoords[1]);
            setAtomOver(atom);
          }
        } else if (self.sampleConfig.renderMode == RenderMode.Piechart) {
          mouseCoords = extractCoords(event);
          this._chartLabelOver = undefined;
          if (this._chart.isOver(mouseCoords)) {
            for (let label of this._chart.getLabels()) {
              if (this._chart.isOverLabel(label, mouseCoords)) {
                this._chartLabelOver = label;
                break;
              }
            }
          }
        }
      }
    };
    this._canvas.addEventListener('mousemove', onMouseMove);

    const onClick = (event: MouseEvent) => {
      if (Popup.popupsOpen() !== 0 || !self.sampleConfig.interactive) return;

      /// RenderMode=Atoms
      if (self.sampleConfig.renderMode === RenderMode.Atoms) {
        if (_atomOver != null) {
          const { title, body } = generateAtomInfo(_atomOver.getIsotopeSymbol());
          let popup = new Popup(title);
          popup.insertAdjacentElement("beforeend", body);
          popup.show();
        }
      } else if (self.sampleConfig.renderMode === RenderMode.Piechart) {
        if (self._chartLabelOver !== undefined) {
          clickLegendLink(self.sampleConfig.legend, self._chartLabelOver);
        }
      }
    };
    this._canvas.addEventListener('click', onClick);

    const onKeyDown = (event: KeyboardEvent) => {
      if (Popup.popupsOpen() === 0 && self.sampleConfig.interactive) {
        if (event.key == ' ' && self.sampleConfig.bindSpacebar) {
          /// TOGGLE SIMULATION
          console.log("Spacebar: simulation " + (self._sample.isSimulationRunning() ? "stopping" : "starting"));
          this._btnToggleSimulation.click();
        }

        /// RenderMode=Atoms
        else if (self.sampleConfig.renderMode == RenderMode.Atoms) {
          if (_atomOver != null) {
            /// RenderMode=Atoms
            if (event.key == 'l') {
              /// DEBUG: LOG INFO
              console.log(_atomOver);
            } else if (event.key == 'Delete') {
              if (!this._sample.isSimulationRunning()) {
                /// DELETE (prompt)
                let symbol = _atomOver.getIsotopeSymbol();
                let link = createLink(`Remove isotope ${symbol} from sample`);
                link.addEventListener('click', () => {
                  this._sample.removeAtom(_atomOver, "removed by user");
                  setAtomOver(null);
                  popup.hide();
                });
                let popup = new Popup(`Remove ${symbol}?`);
                popup.insertAdjacentElement('beforeend', link);
                popup.show();
              }
            } else if (event.key == 'h') {
              /// DECAY HISTORY
              const { title, body } = generateDecayHistory(_atomOver);
              new Popup(title).insertAdjacentElement('beforeend', body).show();
            } else if (this.sampleConfig.manualOverride) {
              // More options for manual Override
              if (event.key == 'd') {
                /// FORCE DECAY (naturally)
                self._sample.atomDecay(_atomOver, true);
              } else if (event.key == '#') {
                // Assign to global variable
                console.log(`Set globals.atom = #<Atom:${_atomOver.getIsotopeSymbol()}>`);
                globals.atom = _atomOver;
              } else if (event.key == 'D') {
                /// FORCE DECAY (interface)
                let { title, body } = generateForceDecayInterface((mode, n, p) => {
                  this._sample.forcedAtomDecay(_atomOver, mode, n, p);
                });
                title += `: ${_atomOver.getIsotopeSymbol()}`;
                new Popup(title).insertAdjacentElement('beforeend', body).show();
              } else if (event.key == 'A') {
                /// FORCE DECAY: alpha
                this._sample.forcedAtomDecay(_atomOver, EnumDecayMode.Alpha);
              } else if (event.key == 'E') {
                // EDIT PROTON/NEUTRON COUNT
                let { title, body } = generateEditProtonNeutronCount(_atomOver.get<number>("protons"), _atomOver.get<number>("neutrons"), (p, n) => {
                  if (n < 0 || p < 1) {
                    new Popup('Unable to Make Changes').insertAdjacentText('beforeend', `Invalid nucleon count: ${p} protons, ${n} neutrons`).show();
                  } else {
                    _atomOver.set(p, n);
                    popup.hide();
                  }
                });
                title += ': ' + _atomOver.getIsotopeSymbol();
                let popup = new Popup(title).insertAdjacentElement('beforeend', body).show();
              }
            }
          }
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

    /// Render Mode
    body.insertAdjacentHTML('beforeend', '<span class="heading">Rendering</span><br>');
    const renderModeClassName = 'option-renderMode';
    for (let mode in RenderMode) {
      if (isNaN(+mode)) {
        // body.insertAdjacentHTML('beforeend', '<br>');
        const modeValue = <RenderMode>(<unknown>RenderMode[mode]);
        let radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = renderModeClassName;
        if (this.sampleConfig.renderMode == modeValue) radio.checked = true;
        radio.addEventListener('change', () => {
          this.sampleConfig.renderMode = modeValue;
        })
        body.appendChild(radio);
        body.insertAdjacentHTML('beforeend', ` &nbsp;<span>${mode}</span> &nbsp;|`);
      }
    }

    body.insertAdjacentHTML('beforeend', '<br><abbr title="Interactive canvas/webpage">Interactive</abbr>: ');
    let checkboxInteractive = document.createElement('input');
    checkboxInteractive.type = 'checkbox';
    checkboxInteractive.checked = this.sampleConfig.interactive;
    checkboxInteractive.addEventListener('change', () => {
      this.sampleConfig.interactive = checkboxInteractive.checked;
    });
    body.appendChild(checkboxInteractive);

    body.insertAdjacentHTML('beforeend', '<br><abbr title="Render decay animations (slows down performance)">Decay Animations</abbr>: ');
    let checkboxRenderDecayAnimations = document.createElement('input');
    checkboxRenderDecayAnimations.type = 'checkbox';
    checkboxRenderDecayAnimations.checked = this.sampleConfig.decayAnimations;
    checkboxRenderDecayAnimations.addEventListener('change', () => {
      this.sampleConfig.decayAnimations = checkboxRenderDecayAnimations.checked;
    });
    body.appendChild(checkboxRenderDecayAnimations);

    body.insertAdjacentHTML('beforeend', '<br><abbr title="Pressing spacebar starts/stops the simulation">Bind Spacebar</abbr>: ');
    let checkboxBindSpacebar = document.createElement('input');
    checkboxBindSpacebar.type = 'checkbox';
    checkboxBindSpacebar.checked = this.sampleConfig.bindSpacebar;
    checkboxBindSpacebar.addEventListener('change', () => {
      this.sampleConfig.bindSpacebar = checkboxBindSpacebar.checked;
    });
    body.appendChild(checkboxBindSpacebar);

    /// DIMENSIONS
    body.insertAdjacentHTML('beforeend', '<hr><span class="heading">Dimensions</span><br>');
    body.insertAdjacentHTML('beforeend', `<abbr title='Width of canvas; initial = ${this.width} px'>Width </abbr> `);
    let rangeWidth = document.createElement('input');
    rangeWidth.type = 'range';
    rangeWidth.min = "100";
    rangeWidth.step = "10";
    rangeWidth.max = window.screen.width.toString();
    rangeWidth.value = this.width.toString();
    rangeWidth.addEventListener('input', () => {
      let value = parseInt(rangeWidth.value);
      this.width = value;
      updateSpanWidth();
    });
    body.insertAdjacentElement('beforeend', rangeWidth);
    let spanWidth = document.createElement('span');
    const updateSpanWidth = () => spanWidth.innerText = ` (${Math.round(this.width)} px)`;
    updateSpanWidth();
    body.insertAdjacentElement('beforeend', spanWidth);

    body.insertAdjacentHTML('beforeend', `<br><abbr title='Height of canvas; initial = ${this.height} px'>Height </abbr> `);
    let rangeHeight = document.createElement('input');
    rangeHeight.type = 'range';
    rangeHeight.min = "100";
    rangeHeight.step = "10";
    rangeHeight.max = window.screen.height.toString();
    rangeHeight.value = this.height.toString();
    rangeHeight.addEventListener('input', () => {
      let value = parseInt(rangeHeight.value);
      this.height = value;
      updateSpanHeight();
    });
    body.insertAdjacentElement('beforeend', rangeHeight);
    let spanHeight = document.createElement('span');
    const updateSpanHeight = () => spanHeight.innerText = ` (${Math.round(this.height)} px)`;
    updateSpanHeight();
    body.insertAdjacentElement('beforeend', spanHeight);

    /// Atom
    body.insertAdjacentHTML('beforeend', '<hr><span class="heading">Atoms</span><br>');
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

    body.insertAdjacentHTML('beforeend', '<br><abbr title="Remove atoms in simulation which are unable to decay (not including stable isotopes)">Remove Cannot Decay</abbr>: ');
    let checkboxRemoveAtomsWhichCannotDecay = document.createElement("input");
    checkboxRemoveAtomsWhichCannotDecay.type = "checkbox";
    checkboxRemoveAtomsWhichCannotDecay.checked = this.sampleConfig.removeIsotopesWhichCannotDecay;
    checkboxRemoveAtomsWhichCannotDecay.addEventListener('change', () => {
      this.sampleConfig.removeIsotopesWhichCannotDecay = checkboxRemoveAtomsWhichCannotDecay.checked;
    })
    body.appendChild(checkboxRemoveAtomsWhichCannotDecay);

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
      body.insertAdjacentHTML('beforeend', legendOption + ' | ');
    }

    body.insertAdjacentHTML('beforeend', '<br><abbr title="Max number of items to show in legend overview">Max Length</abbr>: ');
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

    // Manual Override
    body.insertAdjacentHTML('beforeend', '<hr> <span class="heading">Manual Override</span><br>');
    let checkboxManualOverride = document.createElement('input');
    checkboxManualOverride.type = "checkbox";
    checkboxManualOverride.checked = this.sampleConfig.manualOverride;
    checkboxManualOverride.addEventListener('change', () => {
      if (checkboxManualOverride.checked) {
        checkboxManualOverride.checked = false; // Turn off for now...
        let content = document.createElement('div');
        content.classList.add('manual-override-confirm');
        content.insertAdjacentHTML('beforeend', `<p>Enable manual override? This option will allow impossible actions to be executed.<br><em>Note: Simulation will obey standard rules.</em></p>`);
        let btn = document.createElement('button');
        btn.innerText = 'Enable Manual Override';
        content.appendChild(btn);
        btn.addEventListener('click', () => {
          checkboxManualOverride.checked = true;
          this.sampleConfig.manualOverride = true;
          popup.hide();
        })
        let popup = new Popup('Manual Override').insertAdjacentElement('beforeend', content).show();
      } else {
        this.sampleConfig.manualOverride = false;
      }
    })
    body.appendChild(checkboxManualOverride);
  }

  /** Insert <count> atoms into sample. Return if it was succesful or not. */
  insertAtom(string: string, count: number = 1) {
    let success = true;
    for (let i = 0; i < count; i++) {
      const atom = new Atom(string);
      let added = globals.manager.addAtomToSample(atom);
      if (!added) {
        success = false;
        break;
      }
    }
    return success;
  }

  /** Generate a <count> random isotopes from the prompt <string> (blank: 100% random; string: random iotope for this element)
   * Return: NULL (if OK) or string (where the error occured)
  */
  insertRandomAtom(string: string, count: number = 1) {
    for (let i = 0; i < count; i++) {
      // Generate random isotope from given string
      let isotopeString = getRandomIsotopeString(string);
      if (isotopeString == null) {
        return string;
      }

      // Add atom to Sample
      const atom = new Atom(isotopeString);
      let added = globals.manager.addAtomToSample(atom);
      if (!added) {
        return isotopeString;
      }
    }
    return null;
  }

  deployHTML(container: HTMLElement, legendContainer: HTMLElement) {
    let p: HTMLParagraphElement;
    this._legendContainer = legendContainer;
    let fieldset = document.createElement('fieldset');
    fieldset.id = 'simulation-controls';
    container.appendChild(fieldset);

    let btnInsert = document.createElement('button');
    btnInsert.innerText = 'Insert';
    btnInsert.addEventListener('click', () => {
      const fail = (string: string) => new Popup("Unable to Insert Isotope").insertAdjacentText('beforeend', `Unable to add '${string}' to sample. Make sure that the simulation is not running.`).show();

      const { title, body } = generateInsertPopup(this.sampleConfig.manualOverride, (string, count, isRandom) => {
        if (isNaN(count) || count < 1) return new Popup("Invalid Number").insertAdjacentText('beforeend', `Invalid isotope count '${count}'; must be an integer greater than 0`).show();
        
        try {
          let errorString: string;
          if (isRandom) {
            errorString = this.insertRandomAtom(string, count);
          } else {
            let ok = this.insertAtom(string, count);
            if (!ok) errorString = string;
          }
          if (typeof errorString === 'string') {
            fail(errorString);
          } else {
            popupInsert.hide();
          }
        } catch (err) {
          console.error(err);
          fail(string);
        }
      });
      const popupInsert = new Popup(title).insertAdjacentElement('beforeend', body).show();
    });
    fieldset.appendChild(btnInsert);

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

    // MAIN
    p = document.createElement("p");
    fieldset.appendChild(p);
    p.insertAdjacentHTML('beforeend', `Main `);
    let selectMainType = document.createElement("select");
    selectMainType.insertAdjacentHTML('beforeend', `<option value='element'>Element</option>`);
    selectMainType.insertAdjacentHTML('beforeend', `<option value='isotope'>Isotope</option>`);
    selectMainType.addEventListener('change', () => {
      let type = selectMainType.value as AtomType;
      let ok = this.setMainAtom(inputMain.value, type);
      if (!ok) {
        new Popup("Invalid Atom").insertAdjacentText('beforeend', `Invalid atom string '${inputMain.value}'`).show();
      }
      inputMain.value = this._mainAtom;
    });
    this._mainAtomType = 'element';
    p.appendChild(selectMainType);
    p.insertAdjacentHTML('beforeend', ` &equals; `);
    let inputMain = document.createElement("input");
    inputMain.type = "text";
    this._mainAtom = 'Uranium';
    this.updateLegend();
    inputMain.value = this._mainAtom;
    inputMain.addEventListener('change', () => {
      let ok = this.setMainAtom(inputMain.value);
      if (!ok) {
        new Popup("Invalid Atom").insertAdjacentText('beforeend', `Invalid atom string '${inputMain.value}'`).show();
      }
      inputMain.value = this._mainAtom;
    });
    p.appendChild(inputMain);

    // TIME
    let timeSpan = document.createElement('span');
    p = document.createElement('p');
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
      let value = Math.floor(+timeInput.value);
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
    this._btnToggleSimulation = btnToggle;
    btnToggle.innerText = 'Start';
    btnToggle.addEventListener('click', () => {
      if (onclickStart) {
        onclickStart = false;
        btnToggle.innerText = 'Pause';
        this.prepareForSimulation();
        this._sample.startSimulation();
        timeInput.setAttribute('disabled', 'disabled');
        spanOtherButtons.setAttribute('hidden', 'hidden');
        timeUnitSelect.setAttribute('disabled', 'disabled');
        fieldset.dataset.running = "true";
      } else {
        onclickStart = true;
        btnToggle.innerText = 'Start';
        this._sample.stopSimulation();
        timeInput.removeAttribute('disabled');
        spanOtherButtons.removeAttribute('hidden');
        timeUnitSelect.removeAttribute('disabled');
        fieldset.dataset.running = "false";
      }
    });
    fieldset.appendChild(btnToggle);

    // Other buttons
    let spanOtherButtons = document.createElement('span');
    fieldset.appendChild(spanOtherButtons);

    let btnStep = document.createElement('button');
    btnStep.innerText = 'Step';
    btnStep.addEventListener('click', () => {
      this.prepareForSimulation();
      this._sample.simulationStep();
    });
    spanOtherButtons.appendChild(btnStep);

    let btnReset = document.createElement('button');
    btnReset.innerText = 'Reset';
    btnReset.addEventListener('click', () => {
      this._sample.resetSimulation();
      this.updateLegend();
    });
    spanOtherButtons.appendChild(btnReset);

    let btnClear = document.createElement('button');
    btnClear.innerText = 'Clear';
    btnClear.addEventListener('click', () => {
      this._sample.resetSimulation();
      this._sample.removeAllAtoms();
      this.updateLegend();
    });
    spanOtherButtons.appendChild(btnClear);
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
        this._legendData[string] = createLegendDataItem(this.sampleConfig.legend, string);
      }
      if (!atom.get<boolean>('isStable')) radioactiveCount++;
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
    // Radioactive ratio?
    let radioactivePercent = (radioactiveCount / totalAtoms) * 100;
    body.insertAdjacentHTML('beforeend', `<span>${totalAtoms} atoms &rarr; ${numberWithCommas(radioactiveCount)} ${RADIOACTIVE_SYMBOL} : ${numberWithCommas(totalAtoms - radioactiveCount)}  (<span title='${radioactivePercent}%'>${round(radioactivePercent, 3)}% ${RADIOACTIVE_SYMBOL}</span>)</span><br>`);

    // Atom legend
    body.insertAdjacentElement('beforeend', generateFullLegend(totalAtoms, this._legendData, this.sampleConfig.legendLength));
  }

  /** Given an atom, return this._legendData property which it falls into */
  getLegendString(atom: Atom, legend = this.sampleConfig.legend) {
    let string: string;
    if (legend === LegendOptionValues.Isotopes) string = atom.getIsotopeSymbol();
    else if (legend === LegendOptionValues.Elements) string = atom.getElementName();
    else if (legend === LegendOptionValues.Radioactive) {
      let s = atom.get<boolean>('isStable');
      if (s === true) string = 'Stable';
      else if (s === false) string = 'Radioactive';
      else string = 'Unknown';
    } else if (legend === LegendOptionValues.Decayed) string = atom.hasDecayed() ? 'Decayed' : 'Not Decayed';
    else if (legend === LegendOptionValues.DecayedTimes) string = (atom.getHistory().length - 1).toString();
    else if (legend === LegendOptionValues.Main) {
      const atomString = this._mainAtomType === 'element' ? atom.get<string>('name') : atom.get<string>('isotopeSymbol');
      string = atomString === this._mainAtom ? "Main" : "Other";
    }
    else throw new Error(`Unknown legend option ${legend}`);
    return string;
  }

  /** Get legend item for an atom */
  getLegendItem(atom: Atom) {
    return this._legendData[this.getLegendString(atom)];
  }
}

function createLegendDataItem(option: LegendOptionValues, string: string): ILegendItem {
  let rgb: number[];
  if (option === LegendOptionValues.Radioactive) {
    if (string == 'Radioactive') rgb = [0, 255, 229];
    else if (string == 'Stable') rgb = [255, 162, 0];
    else rgb = [200, 215, 125];
  } else if (option === LegendOptionValues.Decayed) {
    rgb = string == 'Decayed' ? [250, 0, 0] : [247, 247, 0];
  } else {
    rgb = randomHSBColour();
  }
  return { rgb, colour: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`, percent: -1, count: 0 };
}