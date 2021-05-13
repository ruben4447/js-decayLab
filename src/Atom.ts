import elementData from '../data/elements.json';
import categoryColours from '../data/categories.json';
import SampleManager from './SampleManager';
import { rgbStringify, TWO_PI, randomChoice, getSuitableFontSize, probability, analyseString, getAtomInfo, decaySymbolToEnumValue, getSuitableSFEmission } from './utils';
import { EnumDecayMode, IAnalysisResult, IAttemptedDecayInfo, IDecayInfo, LegendOptionValues } from './InterfaceEnum';

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
  private _history: IDecayInfo[]; // Array of historical isotopes. Populated from successful decay via this.decay()

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
    this.resetHistory();
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

  /** Can atom decay? */
  canDecay(): boolean {
    if (!this._data.exists || this._data.isStable === true || isNaN(this.decayChancePerSecond())) return false;
    for (let decayInfo of elementData[this._data.name.toLowerCase()].isotopes[this._data.isotopeSymbol].decay as IDecayInfo[]) {
      if ((decayInfo.daughter == undefined || decayInfo.daughter == '') && (decayInfo.mode == undefined || decayInfo.mode as any == '')) {
        return false;
      }
    }
    return true;
  }

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

    // Decay into random unknown if not have one already
    if (decayInfo == null && percent_unknown.length !== 0) decayInfo = { ...randomChoice(percent_unknown) };

    // If not decayed, but there is still some isotope left, choose one with the greatest percentage chance
    if (decayInfo == null && percent_known.length > 0) {
      let preferredOption = percent_known[0];
      for (let i = 0; i < percent_known.length; i++) {
        if (percent_known[i].percentage > preferredOption.percentage) preferredOption = percent_known[i];
      }
      decayInfo = { ...preferredOption };
    }

    // If *STILL* not decayed and decay mode == 'SF'...
    if (decayInfo == null && this._data.name) {
      let hasSF = false;
      for (let decayOption of elementData[this._data.name.toLowerCase()].isotopes[this._data.isotopeSymbol].decay) {
        if (decayOption.mode === 'SF') {
          hasSF = true;
          break;
        }
      }
      if (hasSF) {
        let daughter = getSuitableSFEmission(this._data);
        decayInfo = { daughter, mode: EnumDecayMode.SpontaneousFission };
      }
    }

    if (decayInfo && decayInfo.daughter == undefined) decayInfo = null;

    let obj: IAttemptedDecayInfo = { ...decayInfo, success: undefined };
    if (decayInfo) {
      try {
        this.setString(decayInfo.daughter);
        obj.success = true;
      } catch (e) {
        obj.success = false;
        obj.error = e;
      }
    } else {
      obj.success = false;
      obj.error = new Error(`No daughter isotope could be found`);
    }

    // If sucessful...
    if (obj.success) {
      // obj.mode: turn string symbol to EnumDecayMode
      if (typeof obj.mode === 'string') obj.mode = decaySymbolToEnumValue(obj.mode);
      // Add to history
      this._history.push({ daughter: obj.daughter, mode: obj.mode });
    }

    return obj;
  }

  /** Get chance to decay (per second) */
  decayChancePerSecond() {
    return 1 / (this._data.halflife * 2);
  }

  getHistory() { return [...this._history]; }
  resetHistory() { this._history = [{ daughter: this.getIsotopeSymbol(), mode: undefined }]; }

  /** Has this atom decayed? */
  hasDecayed() {
    return this._history.length > 1; // > 1 as history[] contains all past identities, including original
  }

  /** Return duplicate of self */
  clone() { return new Atom(this._data.protons, this._data.neutrons); }

  /**
   * Force decay
   * @param mode - Decay mode to inflict
   * @param neutrons - e.g. neutrons lost in NeutronEmission, neutrons of cluster in ClusterDecay
   * @param protons - e.g. proton count in ClusterDecay
   */
  forceDecay(mode: EnumDecayMode, neutrons?: number, protons?: number): IAttemptedDecayInfo {
    let Δp = 0, Δn = 0, error: Error;
    switch (mode) {
      case EnumDecayMode.Alpha:
        // Eject helium-4 nucleus (aka. alpha particle)
        Δp = -2;
        Δn = -2;
        break;
      case EnumDecayMode.BetaMinus:
        // Eject electron and antineutrino - neutron to proton
        Δp = 1;
        Δn = -1;
        break;
      case EnumDecayMode.BetaPlus:
        // Eject positron and neutrino - proton to neutron
        Δp = -1;
        Δn = 1;
        break;
      case EnumDecayMode.NeutronEmission:
        // Eject 1 or more neutrons
        Δn = -Math.floor(neutrons == undefined ? 1 : neutrons);
        break;
      case EnumDecayMode.ElectronCapture:
        // Nuclear captures an orbiting electron, converting a proton to convert into a neutron
        Δp = -1;
        Δn = 1;
        break;
      case EnumDecayMode.ClusterDecay:
        // Emit small cluster
        if (protons == undefined || neutrons == undefined) {
          error = new Error(`ClusterDecay: 'protons' and 'neutrons' arguments are required`);
        } else {
          Δp = -Math.floor(protons);
          Δn = -Math.floor(neutrons);
        }
        break;
      case EnumDecayMode.SpontaneousFission: {
        let daughterString = getSuitableSFEmission(this._data);
        if (daughterString == null) {
          error = new Error(`SpontaneousFission: unable to find suitable nucleus to emit`);
        } else {
          let daughter = analyseString(daughterString);
          Δp = -(this._data.protons - daughter.protons);
          Δn = -(this._data.neutrons - daughter.neutrons);
        }
        break;
      }
      default:
        error = new TypeError(`Unknown or unsupported decay mode: "${mode}"`);
    }

    if (error) {
      return { daughter: '?', mode, success: false, error };
    } else {
      let newp = this._data.protons + Δp, newn = this._data.neutrons + Δn;
      if (newp < 1 || newn < 0) {
        return { daughter: '?', mode, success: false, error: new Error(`Cannot undergo decay: nucleon proportion would be invalid (p ${newp}, n ${newn})`) };
      } else {
        this.set(newp, newn);
        this._history.push({ daughter: this.getIsotopeSymbol(), mode });
        return { daughter: this.getIsotopeSymbol(), mode, success: true };
      }
    }
  }
}