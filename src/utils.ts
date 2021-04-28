import { DecayModes, IDecayInfo, IIsotopeInfo } from "./Atom";
import elementData from "../data/elements.json";

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

interface ITimeObject {
  unit: string;
  time: number;
}

export const createLink = (html?: string) => {
  const link = document.createElement("span");
  if (typeof html === 'string') link.innerHTML = html;
  link.classList.add("link");
  return link;
};

export const capitaliseString = (string: string) => string[0].toUpperCase() + string.substr(1).toLowerCase();

/** Basically, replace "null" or "undefined" with "?" for nice display */
export const nicifyNull = (string: string) => string == undefined || string == null ? "<span class='null'>?</span>" : string;

export const RADIOACTIVE_SYMBOL_HTML = '&#9762;';
export const RADIOACTIVE_SYMBOL = '☢';

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

export function decayModeToString(symbol: string) {
  if (symbol.match(DecayModes.Alpha)) return "alpha";
  if (symbol.match(DecayModes.BetaMinus)) return "beta-minus";
  if (symbol.match(DecayModes.BetaPlus)) return "beta-plus";
  if (symbol.match(DecayModes.NeutronEmission)) return "neutron emission";
  if (symbol.match(DecayModes.SpontaneousFission)) return "spontaneous fission";
  if (symbol.match(DecayModes.ElectronCapture)) return "electron capture";
  if (symbol.match(DecayModes.NuclearIsomer)) return "electron capture";
  if (symbol.match(DecayModes.ClusterDecay)) return "cluster decay";
  return "<unknown>";
}

export function isotopeInfoFromString(string: string): IIsotopeInfo {
  let [symbol, mass] = string.split('-');
  if (!elementData.symbol_map.hasOwnProperty(symbol)) throw new Error(`Invalid symbol "${symbol}" (isotope string "${string}}")`);
  return { name: elementData.symbol_map[symbol], mass: +mass };
}

/** From an isitope string, returns [protons, neutrons] */
export function getNeutronsProtonsFromIsotopeString(isotope: string): number[] {
  const { name } = isotopeInfoFromString(isotope);

  let data = elementData[name];
  if (data.isotopes[isotope]) {
    return [
      data.isotopes[isotope].Z,
      data.isotopes[isotope].N
    ];
  } else {
    throw new Error(`Unknown isotope of ${data.name} : "${isotope}"`);
  }
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