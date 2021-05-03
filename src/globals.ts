import Atom from "./Atom";
import type Sample from "./Sample";
import type SampleManager from "./SampleManager";

export interface IGlobals {
  manager: SampleManager;
  sample: Sample;
  ver: number;
  atom: Atom;
}

export const globals: IGlobals = {
  manager: undefined,
  sample: undefined,
  ver: 0.165,
  atom: undefined, // Set via '#' key when manualOverride=true
};
globalThis.globals = globals;
export default globals;