import type Atom from "./Atom";
import type Sample from "./Sample";
import type SampleManager from "./SampleManager";
import elementData from '../data/elements.json'
import * as utils from './utils';

export interface IGlobals {
  manager: SampleManager;
  sample: Sample;
  ver: number;
  atom: Atom;
  elementData: object;
  utils: any,
}

export const globals: IGlobals = {
  manager: undefined,
  sample: undefined,
  ver: 0.181,
  atom: undefined, // Set via '#' key when manualOverride=true
  elementData,
  utils,
};
globalThis.globals = globals;
export default globals;