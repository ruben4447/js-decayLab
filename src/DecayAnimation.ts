import Atom, { IDecayInfo } from "./Atom";
import SampleManager from "./SampleManager";
import { getSuitableFontSize, TWO_PI } from "./utils";

export default class DecayAnimation {
  public static totalFrames = 20;
  private _done: boolean = false;
  private _frame: number = 0;
  private _colourStage: number = 1;
  private _minRadius: number;
  private _maxRadius: number;
  private _decayMode: string;
  public x: number;
  public y: number;

  constructor(atom: Atom, decayInfo: IDecayInfo) {
    this._minRadius = (atom.getRadius() / 2);
    this._maxRadius = (atom.getRadius() / 3) * 4 - this._minRadius;
    this.x = atom.x;
    this.y = atom.y;
    this._decayMode = decayInfo.mode;
  }

  isDone() { return this._done; }

  getRadius() {
    return this._minRadius + ((this._frame / DecayAnimation.totalFrames) * this._maxRadius);
  }

  getTextSize(ctx: CanvasRenderingContext2D) {
    return getSuitableFontSize(this._decayMode, 'Arial', 100, 10, 2 * this.getRadius(), ctx);
  }

  /** Return: are we finished? */
  render(manager: SampleManager) {
    if (this._done) return true;

    const ctx = manager.ctx, opacity = 0.35;
    ctx.beginPath();
    if (this._colourStage == 0) ctx.fillStyle = `rgba(255, 128, 0, ${opacity})`;
    else if (this._colourStage == 1) ctx.fillStyle = `rgba(250, 0, 0, ${opacity})`;
    if (this._frame % 5 === 0) this._colourStage ^= 1;

    const radius = this.getRadius();
    ctx.arc(this.x, this.y, radius, 0, TWO_PI);
    ctx.fill();

    let size = this.getTextSize(ctx);
    ctx.font = size + 'px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(this._decayMode, this.x, this.y);

    this._frame++;

    if (this._frame > DecayAnimation.totalFrames) this._done = true;
    return this._done;
  }
}