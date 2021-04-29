import type Sample from "./Sample";
import type SampleManager from "./SampleManager";

export interface IGlobals {
  manager: SampleManager;
  sample: Sample;
  ver: number;
}

export const globals: IGlobals = {
  manager: undefined,
  sample: undefined,
  ver: 0.16,
};
globalThis.globals = globals;
export default globals;