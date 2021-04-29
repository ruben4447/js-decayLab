import { IPiechartDataItem } from "./InterfaceEnum";
import { bestColour, isInsideSector, rotateCoords } from "./utils";

export default class Piechart {
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    public x = 0;
    public y = 0;
    private _radius: number = 50;
    private _data: { [label: string]: IPiechartDataItem } = {};
    private _total = 0;

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d");
    }

    get radius() { return this._radius; }
    set radius(r: number) { this._radius = Math.abs(r); }

    setPos(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    getPos() { return [this.x, this.y]; }

    hasData(label: string) {
        return this._data.hasOwnProperty(label);
    }

    getData(label: string) { return this._data[label]; }

    setData(label: string, count: number, rgb: number[]) {
        if (!this._data.hasOwnProperty(label)) {
            this._data[label] = { count, rgb, colour: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` };
            this._total += count;
            return true;
        } else {
            return false;
        }
    }

    removeData(label: string) {
        if (this._data.hasOwnProperty(label)) {
            this._total -= this._data[label].count;
            delete this._data[label];
            return true;
        } else {
            return false;
        }
    }

    reset() {
        this._data = {};
        this._total = 0;
    }

    getTotal() { return this._total; }

    getLabels() { return Object.keys(this._data); }

    render(labelHighlighted?: string) {
        let cangle = 0, ctx = this._ctx;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '10px sans-serif';

        for (let label in this._data) {
            if (this._data.hasOwnProperty(label)) {
                let decimal = this._data[label].count / this._total;
                let angle = decimal * Math.PI * 2;

                ctx.beginPath();
                ctx.fillStyle = this._data[label].colour;
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(...rotateCoords(this.x, this.y, this.radius, cangle));
                ctx.arc(this.x, this.y, this.radius, cangle, cangle + angle);
                // ctx.lineTo(...rotateCoords(this._x, this._y, radius, cangle + angle));
                ctx.lineTo(this.x, this.y);
                ctx.fill();
                if (labelHighlighted === label) {
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                this._data[label].angleStart = cangle;
                this._data[label].angleEnd = cangle + angle;

                if (decimal > 0.03) {
                    ctx.beginPath();
                    ctx.fillStyle = bestColour(this._data[label].rgb, true);
                    ctx.fillText(label, ...rotateCoords(this.x, this.y, this.radius / 2, cangle + angle / 2));
                }

                cangle += angle;
            }
        }
    }

    isOver(position: number[]) {
        const r = this.radius;
        if (position[0] < this.x - r || position[0] > this.x + r || position[1] < this.y - r || position[1] > this.y + r) return false;
        return true;
    }

    isOverLabel(label: string, position: number[]) {
        if (this._data.hasOwnProperty(label)) {
            const data = this._data[label];
            return isInsideSector(position, this.getPos(), this.radius, data.angleStart, data.angleEnd);
        } else {
            return false;
        }
    }
}