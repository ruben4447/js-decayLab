import elementData from '../data/elements.json';
import categoryColours from '../data/categories.json';
import SampleManager, { atomGetStringDependingOnLegend, LegendOptionValues } from './SampleManager';
import { rgbStringify, TWO_PI, randomChoice, RADIOACTIVE_SYMBOL, getSuitableFontSize, getNeutronsProtonsFromIsotopeString, probability } from './utils';

globalThis.elementData = elementData;
const HIGHLIGHT_COLOUR = rgbStringify([255, 50, 250]);

elementData.symbol_map = {};
elementData.order.forEach(el => { elementData.symbol_map[elementData[el].symbol] = el; });

export default class Atom {
  private _protons: number;
  private _neutrons: number;
  private _name: string;
  private _isotope: string;
  private _colour: string; // Cache for RGB colour
  private _radius: number; // Cache for radius
  private _hl: number; // Cache for halflife
  private _fontSize: number = NaN; // Font for use in rendering
  public x: number;
  public y: number;
  public highlighted: boolean = false;
  private _history: string[]; // Array of historical isotopes. Populated from successful decay via this.decay()

  constructor(protons: number, neutrons: number) {
    this.set(protons, neutrons);
    this.x = 0;
    this.y = 0;
    this._history = [this.getIsotopeSymbol()];
  }

  /** Set position */
  pos(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Return this._radius */
  getRadius() { return this._radius; }

  /** Get text rendered inside isotope */
  getTextContent() {
    let text = this.getIsotopeSymbol();
    if (!this.isStable()) text += RADIOACTIVE_SYMBOL;
    return text;
  }

  render(manager: SampleManager) {
    const ctx = manager.ctx, config = manager.sampleConfig;

    if (isNaN(this._fontSize) && config.prettyStyle) {
      this._fontSize = getSuitableFontSize(this.getTextContent(), 'Arial', 30, 5, 1.5 * this._radius, ctx);
    }

    ctx.beginPath();

    // Fill accordig=ng to the legend, or the category
    if (config.legend == LegendOptionValues.None) {
      ctx.fillStyle = this._colour;
    } else {
      ctx.fillStyle = manager.getLegendItem(this).colour;
    }

    ctx.arc(this.x, this.y, config.prettyStyle ? this._radius : config.atomRadius, 0, TWO_PI);
    if (this.highlighted) {
      ctx.strokeStyle = HIGHLIGHT_COLOUR;
      ctx.stroke();
    }
    ctx.fill();

    if (config.prettyStyle) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = rgbStringify([51]);
      ctx.font = `${this._fontSize}px Arial`;
      ctx.fillText(this.getTextContent(), this.x, this.y);
    }
  }

  /** Are the coordinates iven coliding with this atom? */
  areCoordsOn(x: number, y: number) {
    if (x < this.x - this._radius || x > this.x + this._radius || y < this.y - this._radius || y > this.y + this._radius) return false;
    return true;
  }

  set(protons: number, neutrons: number) {
    this._protons = protons;
    this._neutrons = neutrons;
    this._getInfo();
  }

  /** Populate self with if=nfo; uses this._protons and this._neutrons */
  private _getInfo() {
    let element: string = elementData.order[this._protons - 1];
    if (typeof element !== 'string') throw new Error(`Atom[p:${this._protons}, n:${this._neutrons}] -> invalid proton number`);
    this._name = element;
    this._isotope = this.getElementSymbol() + '-' + (this._protons + this._neutrons);
    this._colour = categoryColours[elementData[this._name].category] ? rgbStringify(categoryColours[elementData[this._name].category]) : 'silver';
    this._hl = this.getHalflife();
    this._radius = 10 + elementData[this._name].atomic_mass / 10;
    this._fontSize = NaN;
  }

  get neutrons() { return this._neutrons; }
  set neutrons(n: number) { this._neutrons = n; this._getInfo(); }
  get protons() { return this._protons; }
  set protons(p: number) { this._protons = p; this._getInfo(); }

  get name() { return this._name; }
  set name(n: string) {
    n = n.toLowerCase();
    if (elementData[n]) {
      this._protons = elementData[n].number;
      this._neutrons = Math.round(elementData[n].atomic_mass - this._protons);
      this._getInfo();
    } else {
      throw new Error(`Atom: set name: invalid element name '${n}'`);
    }
  }


  getElementSymbol(): string { return elementData[this._name].symbol; }
  getElementName(): string { return elementData[this._name].name; }
  getIsotopeSymbol() { return this._isotope; }

  /** Are we an actual isotope? */
  isReal() { return this._isotope in elementData[this._name].isotopes; }

  isStable() { return this.isReal() ? elementData[this._name].isotopes[this._isotope].is_stable : undefined; }

  /** Get halflife in seconds (return 0 if stable or not real) */
  getHalflife(): number {
    if (this.isReal()) {
      if (this.isStable()) {
        return 0;
      } else {
        return elementData[this._name].isotopes[this._isotope].halflife;
      }
    } else {
      return 0;
    }
  }

  /**
   * Decay isotope (modify data of this)
   * - return [null] - did not decay
   * - return [IDecayInfo] - decayed
   */
  decay(): IDecayInfo | null {
    if (this.isStable()) return null;

    const data = elementData[this._name].isotopes[this._isotope];
    let decayInfo: IDecayInfo = null;
    const percent_known: IDecayInfo[] = [], percent_unknown: IDecayInfo[] = [];
    for (const option of <IDecayInfo[]>data.decay) {
      if (option.daughter) {
        if (typeof option.percentage === 'number') {
          percent_known.push(option);
        } else {
          percent_unknown.push(option);
        }
      }
    }

    // Decay by chance?
    for (const option of percent_known) {
      if (probability(option.percentage / 100)) {
        decayInfo = { ...option };
        break;
      }
    }

    // Decay into random unknown
    if (percent_unknown.length !== 0) decayInfo = { ...randomChoice(percent_unknown) };

    if (decayInfo && decayInfo.daughter == undefined) decayInfo = null;

    if (decayInfo) {
      try {
        const [protons, neutrons] = getNeutronsProtonsFromIsotopeString(decayInfo.daughter);
        this.set(protons, neutrons);
        this._history.push(this.getIsotopeSymbol()); // Push new isotope to history
      } catch (e) {
        console.log(`Unable to decay atom ${this.getIsotopeSymbol()} to ${decayInfo.daughter} (${decayInfo.mode})`);
        throw e;
      }
    }

    return decayInfo;
  }

  /** Get chance to decay (per second) */
  decayChancePerSecond() {
    return 1 / (this._hl * 2);
  }

  getHistory() { return [...this._history]; }
  resetHistory() { this._history = [this.getIsotopeSymbol()]; }

  /** Return duplicate of self */
  clone() { return Atom.fromIsotopeString(this._isotope); }

  /** Create atom from isotope string e.g. "U-222" */
  public static fromIsotopeString(string: string) {
    let [protons, neutrons] = getNeutronsProtonsFromIsotopeString(string);
    return new Atom(protons, neutrons);
  }
}

export interface IDecayInfo {
  daughter?: string;
  mode?: string;
  percentage?: number;
}

export interface IIsotopeInfo {
  name: string; // Name of element
  mass: number; // Mass of isotope
}

export const DecayModes = {
  Alpha: 'α',
  BetaMinus: 'β−',
  BetaPlus: 'β+',
  NeutronEmission: 'n',
  SpontaneousFission: "SF",
  ElectronCapture: "EC",
  NuclearIsomer: "IT",
  ClusterDecay: "CD",
};
