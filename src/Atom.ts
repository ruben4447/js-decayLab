import elementData from '../data/elements.json';
import categoryColours from '../data/categories.json';
import SampleManager from './SampleManager';
import { rgbStringify, TWO_PI, randomChoice, getSuitableFontSize, getNeutronsProtonsFromIsotopeString, probability, analyseString, getAtomInfo } from './utils';
import { IAnalysisResult, IAttemptedDecayInfo, IDecayInfo, LegendOptionValues } from './InterfaceEnum';

globalThis.elementData = elementData;
const HIGHLIGHT_COLOUR = rgbStringify([255, 50, 250]);

elementData.symbol_map = {};
elementData.order.forEach(el => { elementData.symbol_map[elementData[el].symbol] = el; });

export default class Atom {
  private _data: IAnalysisResult;
  private _colour: string; // Cache for RGB colour
  private _radius: number; // Cache for radius
  private _fontSize: number = NaN; // Font for use in rendering
  public x: number;
  public y: number;
  public highlighted: boolean = false;
  private _history: string[]; // Array of historical isotopes. Populated from successful decay via this.decay()

  /**
   * Multiple Methods:
   * 1) (protons: number, neutrons: number)  --> Directly specify the number of protons and neutrons which make up this atom
   * 2) (str: string) --> Atom string which will be parsed via utils.js::analyseString()
   * 3) (obj: IAnalysisResult) --> Result from utils.js::analyseString()
   */
  constructor(a: number | string | IAnalysisResult, b?: number) {
    this.x = 0;
    this.y = 0;
    if (typeof a === 'string' && typeof b === 'undefined') {
      this.setString(a);
    } else if (typeof a === 'number' && typeof b === 'number') {
      this.set(a, b);
    } else if (typeof a === 'object' && a.IUPACName && typeof b === 'undefined') {
      this._data = a;
      this._prepare();
    } else {
      throw new TypeError(`new Atom(${a}: ${typeof a}, ${b}: ${typeof b}): no constructor of Atom takes provided arguments`);
    }
    this._history = [this.getIsotopeSymbol()];
  }

  /** Set position */
  pos(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Set protons/neutrons */
  set(protons: number, neutrons: number) {
    this._data = getAtomInfo(protons, neutrons);
    this._prepare();
  }

  /** Set to data string */
  setString(str: string) {
    this._data = analyseString(str);
    if (this._data == null) throw new Error(`#<Atom>.setString: unable to parse atom string '${str}'`);
    this._prepare();
  }

  /** Return this._radius */
  getRadius() { return this._radius; }

  render(manager: SampleManager) {
    const ctx = manager.ctx, config = manager.sampleConfig;

    if (isNaN(this._fontSize) && config.prettyStyle) {
      this._fontSize = getSuitableFontSize(this.getIsotopeSymbol(), 'Arial', 30, 5, 1.5 * this._radius, ctx);
    }

    ctx.beginPath();

    // Fill accordig=ng to the legend, or the category
    if (config.legend == LegendOptionValues.None) {
      ctx.fillStyle = this._colour;
    } else {
      let info = manager.getLegendItem(this);
      ctx.fillStyle = info ? info.colour : '#ccc';
      if (!this._data.exists) ctx.fillStyle += '66'; // Darken is not real
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
      ctx.fillText(this.getIsotopeSymbol(), this.x, this.y);
    }
  }

  /** Are the coordinates iven coliding with this atom? */
  areCoordsOn(x: number, y: number) {
    if (x < this.x - this._radius || x > this.x + this._radius || y < this.y - this._radius || y > this.y + this._radius) return false;
    return true;
  }

  /** Prepare properties such as _fontSize and _colour */
  private _prepare() {
    const name = this.getElementName().toLowerCase(), defaultColour = 'silver';

    // Set colour - if real, set equal to our category. Else, set a default colour.
    if (this._data.name) {
      this._colour = categoryColours[elementData[name].category] ? rgbStringify(categoryColours[elementData[name].category]) : defaultColour;
    } else {
      this._colour = defaultColour;
    }

    // Set atomic radius (on 'pretty' mode)
    this._radius = 10 + (this._data.protons + this._data.neutrons) / 10;

    this._fontSize = NaN;
  }

  /** Get a property from this._data */
  get<T>(prop: string): T { return this._data[prop]; }

  /** Get symbol (if available), or IUPAC symbol */
  getElementSymbol(): string { return this._data.symbol || this._data.IUPACSymbol; }

  /** Get name (if available), or IUPAC name */
  getElementName(): string { return this._data.name || this._data.IUPACName; }

  /** Get name of isotope */
  getIsotopeName() { return `${this.getElementName()}-${this._data.neutrons + this._data.protons}`; }

  /** Get isotope symbol */
  getIsotopeSymbol() { return this._data.isotopeSymbol; }

  /**
   * Decay isotope (modify data of this)
   * - return [IAttemptedDecayInfo] - decayed? (check success property)
   * - return [null] - could not decay
   */
  decay(): IAttemptedDecayInfo {
    if (this._data.isStable || !this._data.exists) return null;

    const data = elementData[this.getElementName().toLowerCase()].isotopes[this.getIsotopeSymbol()];
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

    let obj: IAttemptedDecayInfo = { ...decayInfo, success: undefined };
    if (decayInfo) {
      try {
        const [protons, neutrons] = getNeutronsProtonsFromIsotopeString(decayInfo.daughter);
        this.set(protons, neutrons);
        this._history.push(this.getIsotopeSymbol()); // Push new isotope to history
        obj.success = true;
      } catch (e) {
        // console.log(`Unable to decay atom ${this.getIsotopeSymbol()} to ${decayInfo.daughter} (${decayInfo.mode})`);
        obj.success = false;
      }
    } else {
      obj.success = false;
    }

    return obj;
  }

  /** Get chance to decay (per second) */
  decayChancePerSecond() {
    return 1 / (this._data.halflife * 2);
  }

  getHistory() { return [...this._history]; }
  resetHistory() { this._history = [this.getIsotopeSymbol()]; }

  /** Has this atom decayed? */
  hasDecayed() {
    return this._history.length > 1; // > 1 as history[] contains all past identities, including original
  }

  /** Return duplicate of self */
  clone() { return new Atom(this._data.protons, this._data.neutrons); }
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