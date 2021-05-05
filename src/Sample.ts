import Atom from './Atom';
import { arrayRemove, probability, getNeutronsProtonsFromIsotopeString } from './utils';
import SampleManager from './SampleManager';
import DecayAnimation from './DecayAnimation';
import { EnumDecayMode, IAttemptedDecayInfo } from './InterfaceEnum';

type AtomDecayCallback = (atom: Atom, info: IAttemptedDecayInfo, time: number) => void;
type AtomRemoveCallback = (atom: Atom) => void;

export class Sample {
  private _animations: DecayAnimation[] = [];
  private _atoms: Atom[] = [];
  private _time = 0;
  private _incTimeAmount = 1;
  private _loopIntervalID = NaN;

  private _callbackAtomDecay: AtomDecayCallback;
  private _callbackAtomRemove: AtomRemoveCallback;

  constructor() { }

  forEachAtom(fn: (value: Atom, index: number, array: Atom[]) => void) {
    this._atoms.forEach(fn);
  }

  getAtomCount() { return this._atoms.length; }

  render(manager: SampleManager) {
    this._atoms.forEach(atom => atom.render(manager));
    for (let i = this._animations.length - 1; i >= 0; i--) {
      const a = this._animations[i];
      a.render(manager);
      if (a.isDone()) {
        this._animations.splice(i, 1);
      }
    }
  }

  /** Are we over any atoms? */
  getAtomOver(x: number, y: number): Atom | null {
    for (let i = this._atoms.length - 1; i >= 0; i--) {
      let atom = this._atoms[i];
      if (atom.areCoordsOn(x, y)) return atom;
    }
    return null;
  }

  /** Reset self; clear atoms array */
  reset() {
    this._atoms.length = 0;
  }

  /** Set atoms to [n] number of speficied isotopes */
  addAtom(atom: Atom) {
    this._atoms.push(atom);
  }

  /** Set callback for when an atom is removed */
  onAtomRemove(callback: AtomRemoveCallback) {
    this._callbackAtomRemove = callback;
    return this;
  }

  removeAtom(atom: Atom) {
    const success = arrayRemove(this._atoms, atom);
    if (success && typeof this._callbackAtomRemove) this._callbackAtomRemove(atom);
    return success;
  }

  removeAllAtoms() {
    this._atoms.length = 0;
  }

  /** Set callback for when atom decays */
  onAtomDecay(callback: AtomDecayCallback) {
    this._callbackAtomDecay = callback;
    return this;
  }

  /** Decay an atom. Return did it decay? */
  atomDecay(atom: Atom, force: boolean = false): boolean {
    if (force || probability(atom.decayChancePerSecond() * this._incTimeAmount)) {
      if (atom.get<boolean>('isStable') === false) {
        let info = atom.decay();
        if (info) {
          if (info.success) this._animations.push(new DecayAnimation(atom, info)); // Push decay animation
          if (typeof this._callbackAtomDecay === 'function') this._callbackAtomDecay(atom, info, this._time);
          return info.success;
        } else {
          return false;
        }
      }
    }
    return false;
  }

  /** Decay an atom as per stated */
  forcedAtomDecay(atom: Atom, mode: EnumDecayMode, neutrons?: number, protons?: number): boolean {
    let info = atom.forceDecay(mode, neutrons, protons);
    if (info) {
      if (info.success) this._animations.push(new DecayAnimation(atom, info)); // Push decay animation
      if (typeof this._callbackAtomDecay === 'function') this._callbackAtomDecay(atom, info, this._time);
      return info.success;
    } else {
      return false;
    }
  }

  getTime() { return this._time; }

  getIncTimeAmount() { return this._incTimeAmount; }
  setIncTimeAmount(amount: number) { this._incTimeAmount = amount; }

  /** Is simulation running? */
  isSimulationRunning() { return !isNaN(this._loopIntervalID); }

  startSimulation() {
    if (!this.isSimulationRunning()) {
      this._loopIntervalID = globalThis.setInterval(this.simulationStep.bind(this), 1000);
    }
  }

  /** Called internally in interval initiated by this.startSimulation() */
  simulationStep() {
    let atoms = [...this._atoms]; // Atoms to evaluate
    for (let i = 0, atom: Atom; i < atoms.length; i++) {
      atom = atoms[i];
      let decayed = this.atomDecay(atom, false);
      if (decayed) {
        atoms.push(atom); // Re-evaluate daughter isotope
      }
    }

    this._time += this._incTimeAmount;
  }

  stopSimulation() {
    if (this.isSimulationRunning()) {
      globalThis.clearInterval(this._loopIntervalID);
      this._loopIntervalID = NaN;
    }
  }

  resetSimulation() {
    this._time = 0;
    this._atoms.forEach(atom => {
      let initial = atom.getHistory()[0];
      if (typeof initial == 'string' && initial !== atom.getIsotopeSymbol()) {
        atom.setString(initial);
        atom.resetHistory();
      }
    });
  }
}

export default Sample;