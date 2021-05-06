import elementData from "../data/elements.json";
import { createAnalysisResultObject, DecayMode, EnumDecayMode, IAnalyseStringComponent, IAnalysisResult, IDecayInfo, IIsotopeInfo, IIUPACNameSymbol, ITimeObject } from "./InterfaceEnum";

export function rgbStringify(array: number[]) {
  if (array.length === 1) return `rgb(${array[0]}, ${array[0]}, ${array[0]})`;
  return `rgb(${array[0]}, ${array[1]}, ${array[2]})`;
}

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function arrayRemove<T>(array: T[], item: T): boolean {
  let i = array.indexOf(item);
  if (i === -1) {
    return false;
  } else {
    array.splice(i, 1);
    return true;
  }
}

export function extractCoords(event: MouseEvent) {
  const box = (<HTMLElement>event.target).getBoundingClientRect();
  return [event.clientX - box.left, event.clientY - box.top];
}

export function numberWithCommas(x: number) {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

export const TWO_PI = 2 * Math.PI;

export const isInteger = (n: number) => parseInt(n.toString()) === n;

export const scaleRange = (n: number, inMin: number, inMax: number, outMin: number, outMax: number) => (n - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;

export const inRange = (n: number, min: number, max: number) => n >= min && n < max;

export const round = (n: number, dp: number) => {
  const x = Math.pow(10, dp);
  return Math.round(n * x) / x;
};

export const _timeUnits = {
  min: 60, // Minute
  ms: 0.001, // Millisecond
  μs: 1e-6, // Microsecond
  ns: 1e-9, // Nanosecond
  ps: 1e-12, // Picosecond
  y: 3.154e+7, // Year
  a: 3.154e+7, // Year (annum)
  d: 86400, // Day
  h: 3600, // Hour
  s: 1, // Second
};

export const _timeUnitStrings = {
  s: 'second',
  min: 'minute',
  ms: 'millisecond',
  μs: 'microsecond',
  ns: 'nanosecond',
  ps: 'picosecond',
  y: 'year',
  a: 'annum',
  d: 'day',
  h: 'hour',
};

export const secondsToAppropriateTime = (s: number): ITimeObject => {
  if (s === 0) return { unit: 's', time: 0 };
  let approproate_time = NaN, appropriate_unit: string, smallest_delta_1 = Infinity;
  for (let unit in _timeUnits) {
    if (_timeUnits.hasOwnProperty(unit)) {
      let time = s / _timeUnits[unit];
      let delta1 = Math.abs(1 - time) * _timeUnits[unit]; // We want the closest number to "1" (seconds)
      if (delta1 < smallest_delta_1) {
        appropriate_unit = unit;
        approproate_time = time;
        smallest_delta_1 = delta1;
      }
    }
  }

  return { unit: appropriate_unit, time: approproate_time, };
};

export const createLink = (html?: string) => {
  const link = document.createElement("span");
  if (typeof html === 'string') link.innerHTML = html;
  link.classList.add("link");
  return link;
};

export const capitaliseString = (string: string) => string[0].toUpperCase() + string.substr(1).toLowerCase();

/** e.g. "HelloWorld" --> "Hello World" */
export const spaceBetweenCaps = (str: string): string => str.replace(/(?<=[a-z])(?=[A-Z])/g, ' ');

/** Basically, replace "null" or "undefined" with "?" for nice display */
export const nicifyNull = (string: string) => string == undefined || string == null ? "<span class='null'>?</span>" : string;

export const RADIOACTIVE_SYMBOL = '☢';
export const INFO_SYMBOL = 'ⓘ';

export function getSuitableFontSize(text: string, fontFamily: string, max: number, min: number, maxWidth: number, ctx: CanvasRenderingContext2D) {
  let fontSize: number, originalFont = ctx.font;

  for (let size = max; size >= min; size--) {
    ctx.font = `${size}px ${fontFamily}`;
    let { width } = ctx.measureText(text);
    // console.log(`Font "${ctx.font}" is width "${width} (${maxWidth})`);
    if (width < maxWidth) {
      fontSize = size;
      break;
    }
  }

  ctx.font = originalFont;
  if (fontSize == undefined) fontSize = min;
  return fontSize
}

export function decaySymbolToEnumValue(symbol: string): EnumDecayMode | null {
  if (symbol.match(DecayMode.Alpha)) return EnumDecayMode.Alpha;
  if (symbol.match(DecayMode.BetaMinus)) return EnumDecayMode.BetaMinus;
  if (symbol.match(DecayMode.BetaPlus)) return EnumDecayMode.BetaPlus;
  if (symbol.match(DecayMode.NeutronEmission)) return EnumDecayMode.NeutronEmission;
  if (symbol.match(DecayMode.SpontaneousFission)) return EnumDecayMode.SpontaneousFission;
  if (symbol.match(DecayMode.ElectronCapture)) return EnumDecayMode.ElectronCapture;
  if (symbol.match(DecayMode.NuclearIsomer)) return EnumDecayMode.NuclearIsomer;
  if (symbol.match(DecayMode.ClusterDecay)) return EnumDecayMode.ClusterDecay;
  return null;
}

export function isotopeInfoFromString(string: string): IIsotopeInfo {
  let [symbol, mass] = string.split('-');
  if (!elementData.symbol_map.hasOwnProperty(symbol)) throw new Error(`Invalid symbol "${symbol}" (isotope string "${string}}")`);
  return { name: elementData.symbol_map[symbol], mass: +mass };
}

/**
 * Return decay info that takes isotope (a) to (b).
 * i.e. how did isotopeA decay to isotopeB?
*/
export function getIsotopeDecayInfo(a: string, b: string): IDecayInfo | undefined {
  const aInfo = isotopeInfoFromString(a);
  const aAdvInfo = elementData[aInfo.name].isotopes[elementData[aInfo.name].symbol + '-' + aInfo.mass];

  for (const decayObj of aAdvInfo.decay) {
    if (decayObj.daughter === b) return decayObj;
  }
  return undefined;
}

/** Takes number [n] between 0..1 */
export const probability = (n: number) => !!n && Math.random() <= n;

export const elSetDisabled = (el: HTMLElement, disabled: boolean) => disabled ? el.setAttribute('disabled', 'disabled') : el.removeAttribute('disabled');
export function removeChildren(el: HTMLElement) {
  while (el.firstElementChild) {
    el.firstElementChild.remove();
  }
}

const _IUPACNameParts = ["nil", "un", "bi", "tri", "quad", "pent", "hex", "sept", "oct", "enn"];

/** get IUAPC name/symbol from atomic number */
export function getIUPACNameSymbol(atomicNumber: number): IIUPACNameSymbol {
  let name = "", symbol = "", number = atomicNumber.toString();
  for (let i = 0; i < number.length; i++) {
    let part = _IUPACNameParts[+number[i]];
    if (part == undefined) throw new Error(`getIUPACNameSymbol: cannot find for number '${number}': cannot find part for '${number[i]}'`);
    name += part;
    symbol += part[0];
  }
  return {
    name: capitaliseString(name) + "ium",
    symbol: capitaliseString(symbol),
  };
}

/** Analyse symbol component */
export function analyseSymbolString(symbol: string): IAnalyseStringComponent | null {
  const obj: IAnalyseStringComponent = { symbol: undefined, name: undefined, IUPACName: undefined, IUPACSymbol: undefined, protons: undefined, };
  symbol = capitaliseString(symbol);

  // Exists?
  if (elementData.symbol_map.hasOwnProperty(symbol)) {
    let name = elementData.symbol_map[symbol];
    obj.symbol = symbol;
    obj.name = elementData[name].name;
    obj.protons = elementData[name].number;

    let iupac = getIUPACNameSymbol(obj.protons);
    obj.IUPACName = iupac.name;
    obj.IUPACSymbol = iupac.symbol;
  } else {
    let name = "", atomicNumberStr = "", lsymbol = symbol.toLowerCase();
    for (let i = 0; i < lsymbol.length; i++) {
      let ok = false;
      for (let pi = 0; pi < _IUPACNameParts.length; pi++) {
        if (lsymbol[i] === _IUPACNameParts[pi][0]) {
          name += _IUPACNameParts[pi];
          atomicNumberStr += pi.toString();
          ok = true;
          break;
        }
      }
      if (!ok) return null;
    }
    if (name.length === 0) return null;
    obj.IUPACSymbol = symbol;
    obj.IUPACName = capitaliseString(name) + "ium";
    obj.protons = parseInt(atomicNumberStr);
    if (elementData.order[obj.protons - 1]) {
      let actualName = elementData.order[obj.protons - 1]
      obj.name = elementData[actualName].name;
      obj.symbol = elementData[actualName].symbol;
    }
  }
  return obj;
}

export function analyseElementName(name: string): IAnalyseStringComponent | null {
  let lname = name.toLowerCase();
  const obj: IAnalyseStringComponent = { symbol: undefined, name: undefined, IUPACName: undefined, IUPACSymbol: undefined, protons: undefined, };

  // Actual name?
  if (elementData.order.indexOf(lname) !== -1) {
    obj.name = elementData[lname].name;
    obj.symbol = elementData[lname].symbol;
    obj.protons = elementData[lname].number;

    let ipuac = getIUPACNameSymbol(obj.protons);
    obj.IUPACName = ipuac.name;
    obj.IUPACSymbol = ipuac.symbol;
  } else {
    let hasIum = !!(lname.match("ium")), name = lname.replace("ium", ""), symbol = "", atomicNumberStr = "";
    for (let i = 0; i < name.length;) {
      let ok = false;
      for (let pi = 0; pi < _IUPACNameParts.length; pi++) {
        let namePart = _IUPACNameParts[pi], strPart = name.substr(i, namePart.length);
        if (namePart === strPart) {
          ok = true;
          symbol += namePart[0];
          atomicNumberStr += pi.toString();
          i += namePart.length;
        }
      }
      if (!ok) return null;
    }
    if (!hasIum) return null; // All IUPAC names have '-ium'
    obj.IUPACName = capitaliseString(lname);
    obj.IUPACSymbol = capitaliseString(symbol);
    obj.protons = parseInt(atomicNumberStr);
    if (elementData.order[obj.protons - 1]) {
      let actualName = elementData.order[obj.protons - 1]
      obj.name = elementData[actualName].name;
      obj.symbol = elementData[actualName].symbol;
    }
  }
  return obj;
}

/**
 * Estimate whether isotope with provided Z, N is stable
 * - Source: https://chem.libretexts.org/Bookshelves/Physical_and_Theoretical_Chemistry_Textbook_Maps/Supplemental_Modules_(Physical_and_Theoretical_Chemistry)/Nuclear_Chemistry/Nuclear_Energetics_and_Stability/Nuclear_Magic_Numbers
 */
function estimateIsStable(Z: number, N: number) {
  const A = Z + N;

  // Is atomic number above Polonium?
  if (Z >= 84) return false;

  // If nucleon count is even, good chance that isotope is stable
  if (A % 2 === 0) return true;

  // Are the Z/N numbers a magic number?
  const magicGeneral = [2, 8, 20, 28, 50, 82], magicProtons = [114], magicNeutrons = [126, 184];
  if (magicGeneral.indexOf(Z) !== -1 || magicGeneral.indexOf(N) !== -1) return true;
  if (magicNeutrons.indexOf(N) !== -1) return true;
  if (magicProtons.indexOf(Z) !== -1) return true;

  // N:Z ratio
  const R = N / Z;
  if (R < 1) return false;
}

export function analyseString(str: string): IAnalysisResult | null {
  const obj = createAnalysisResultObject(), lstr = str.toLowerCase();
  let atomicMass: number;

  if (lstr.indexOf('-') !== -1) {
    /// ISOTOPE FORMAT!
    let [identifier, mass] = lstr.split('-');
    atomicMass = parseInt(mass);
    str = identifier;

    if (mass.indexOf('m') !== -1) {
      let [_, n] = mass.split('m');
      if (n.length === 0) n = '0'; // Default one
      obj.metastableIsotopeNumber = parseInt(n);
    }
  }

  // Is element name?
  let analysis = analyseElementName(str);
  if (analysis == null) {
    // Is symbol?
    analysis = analyseSymbolString(str);
  }

  if (analysis != null) {
    obj.name = analysis.name;
    obj.IUPACName = analysis.IUPACName;
    obj.symbol = analysis.symbol;
    obj.IUPACSymbol = analysis.IUPACSymbol;
    obj.protons = analysis.protons;
    if (atomicMass == undefined) {
      if (obj.name) {
        atomicMass = elementData[obj.name.toLowerCase()].atomic_mass;
      } else {
        throw new Error(`analyseString: neutron count must be stated for theoretical elements - '${str}'`);
      }
    }
  } else {
    return null; // No flippin' clue.
  }

  // Get neutron number
  if (typeof atomicMass === 'number') {
    obj.neutrons = Math.round(atomicMass - obj.protons);
  }

  // Get isotope symbol
  if (!isNaN(obj.neutrons)) {
    obj.isotopeSymbol = `${obj.symbol || obj.IUPACSymbol}-${obj.neutrons + obj.protons}`;
    if (obj.metastableIsotopeNumber != undefined) {
      obj.metastableIsotopeParent = obj.isotopeSymbol; // Parent isotope (without 'm')
      obj.isotopeSymbol += 'm';
      if (obj.metastableIsotopeNumber !== 0) obj.isotopeSymbol += obj.metastableIsotopeNumber.toString();
    }
  }

  if (obj.name) {
    const elData = elementData[obj.name.toLowerCase()];
    if (elData) {
      const isoData = elData.isotopes[obj.isotopeSymbol];
      if (isoData) {
        obj.exists = true;
        obj.halflife = isoData.halflife;
        obj.isStable = isoData.is_stable;
      } else {
        obj.exists = false;
      }
    } else {
      obj.exists = false;
    }
  } else {
    obj.exists = false;
  }

  return Object.freeze(obj);
}

export function getAtomInfo(protons: number, neutrons: number): IAnalysisResult | null {
  const obj = createAnalysisResultObject();
  obj.protons = protons;
  obj.neutrons = neutrons;
  obj.exists = false; // Assume that it does not exist

  // Does the element exist?
  if (elementData.order[protons - 1] != undefined) {
    const name = elementData.order[protons - 1];
    obj.name = elementData[name].name;
    obj.symbol = elementData[name].symbol;
  } else {
    obj.exists = false;
    const iupac = getIUPACNameSymbol(protons);
    obj.IUPACName = iupac.name;
    obj.IUPACSymbol = iupac.symbol;
  }

  // Isotope
  obj.isotopeSymbol = (obj.symbol || obj.IUPACSymbol) + '-' + (protons + neutrons).toString();

  // Does isotope exist?
  if (obj.name) {
    const idata = elementData[obj.name.toLowerCase()].isotopes[obj.isotopeSymbol];
    if (idata) {
      obj.exists = true;
      obj.isStable = idata.is_stable;
      obj.halflife = idata.halflife;
    }
  }

  return Object.freeze(obj);
}

export function hslToRgb(h: number, s: number, l: number) {
  // Must be fractions of 1
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return [r, g, b];
}
export const randomHSBColour = (): number[] => hslToRgb(randomInt(0, 359), 100, 50);

/** Get best foreground/background colour depending on colour */
export function bestColour(rgb: number[], txt = true, n = 100) {
  if (txt) if ((rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) > n) return "black"; else return "white";
  if (!txt) if ((rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) > n) return "white"; else return "black";
}

/** Sort object in form { key: value } */
export function sortObject(object: object, ascending: boolean = false): object {
  const entries = Object.entries(object);
  entries.sort(ascending ? (a, b) => b[1] - a[1] : (a, b) => a[1] - b[1]);
  for (let key in object) delete object[key];
  for (let entry of entries) object[entry[0]] = entry[1];
  return object;
}

/** Sort object in form { key: { key1: value1, key2: value2, ... } } */
export function sortObjectByProperty(object: object, property: string, ascending: boolean = false): object {
  const entries = Object.entries(object);
  entries.sort(ascending ? (a, b) => b[1][property] - a[1][property] : (a, b) => a[1][property] - b[1][property]);
  for (let key in object) delete object[key];
  for (let entry of entries) object[entry[0]] = entry[1];
  return object;
}

export function arrFromBack<T>(array: T[], n: number): T {
  return array[array.length - n];
}


export const rotateCoords = (cx: number, cy: number, r: number, theta: number): [number, number] => ([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);

/** Used by isInsideSector */
function areClockwise(center: number[], radius: number, angle: number, point: number[]) {
  var point1 = [
    (center[0] + radius) * Math.cos(angle),
    (center[1] + radius) * Math.sin(angle)
  ];
  return -point1[0] * point[1] + point1[1] * point[0] > 0;
}

/** Is a point inside a sector of a circle? */
export function isInsideSector(point: number[], center: number[], radius: number, angle1: number, angle2: number) {
  var relPoint = [
    point[0] - center[0],
    point[1] - center[1]
  ];

  if (angle2 - angle1 < Math.PI) {
    return !areClockwise(center, radius, angle1, relPoint) &&
      areClockwise(center, radius, angle2, relPoint) &&
      (relPoint[0] * relPoint[0] + relPoint[1] * relPoint[1] <= radius * radius);
  } else {
    const half = (angle1 + angle2) / 2;
    return isInsideSector(point, center, radius, angle1, angle2 - half) || isInsideSector(point, center, radius, angle1 + half, angle2);
  }
}