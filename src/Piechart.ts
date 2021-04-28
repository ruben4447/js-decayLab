import { bestColour, isInsideSector, rotateCoords } from "./utils";

export interface IDataItem {
    count: number;
    colour: string; // RGB string
    rgb: number[]; // RGB colours
    angleStart?: number;
    angleEnd?: number;
}

export default class Piechart {
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    private _x = 0;
    private _y = 0;
    private _width: number;
    private _data: { [label: string]: IDataItem } = {};
    private _total = 0;

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d");
        this._width = canvas.width;
    }

    get width() { return this._width; }
    set width(value: number) { this._width = value; }

    setPos(x: number, y: number) {
        this._x = x;
        this._y = y;
    }

    getPos() { return [this._x, this._y]; }

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

    getRadius() { return this._width / 2; }

    render(labelHighlighted?: string) {
        let cangle = 0, ctx = this._ctx, radius = this.getRadius();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '10px sans-serif';

        for (let label in this._data) {
            if (this._data.hasOwnProperty(label)) {
                let decimal = this._data[label].count / this._total;
                let angle = decimal * Math.PI * 2;

                ctx.beginPath();
                ctx.fillStyle = this._data[label].colour;
                ctx.moveTo(this._x, this._y);
                ctx.lineTo(...rotateCoords(this._x, this._y, radius, cangle));
                ctx.arc(this._x, this._y, radius, cangle, cangle + angle);
                // ctx.lineTo(...rotateCoords(this._x, this._y, radius, cangle + angle));
                ctx.lineTo(this._x, this._y);
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
                    ctx.fillText(label, ...rotateCoords(this._x, this._y, radius / 2, cangle + angle / 2));
                }

                cangle += angle;
            }
        }
    }

    isOver(position: number[]) {
        const r = this.getRadius();
        if (position[0] < this._x - r || position[0] > this._x + r || position[1] < this._y - r || position[1] > this._y + r) return false;
        return true;
    }

    isOverLabel(label: string, position: number[]) {
        if (this._data.hasOwnProperty(label)) {
            const data = this._data[label];
            return isInsideSector(position, [this._x, this._y], this.getRadius(), data.angleStart, data.angleEnd);
        } else {
            return false;
        }
    }
}