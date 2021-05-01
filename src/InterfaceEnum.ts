/** Interface for isotope decay info */
export interface IDecayInfo {
    daughter?: string;
    mode?: string;
    percentage?: number;
}

/** Interface for isotope information */
export interface IIsotopeInfo {
    name: string; // Name of element
    mass: number; // Mass of isotope
}

/** Interface for return value of generate...() functions */
export interface IGeneratedInfo {
    title: string;
    body: HTMLDivElement;
}

/** Data object for Piechart */
export interface IPiechartDataItem {
    count: number;
    colour: string; // RGB string
    rgb: number[]; // RGB colours
    angleStart?: number;
    angleEnd?: number;
}

/** Canvas render modes */
export enum RenderMode {
    Atoms,
    Piechart,
}

/** Enum for legend view options */
export enum LegendOptionValues {
    None, // No Legend
    Isotopes, // All isotopes
    Elements, // Only elements
    Radioactive, // Radioactive : Stable
    Decayed, // Decayed or not?
    DecayedTimes, // How many times have these decayed?
}

/** An item in the legend */
export interface ILegendItem {
    colour: string;
    rgb: number[];
    count: number; // Number of items
    percent: number; // Percentage of sample
}

/** Interface outlining configuration object for Sample */
export interface ISampleConfig {
    prettyStyle: boolean; // Show atoms with text, varying size from mass?
    atomRadius: number; // If !prettyStyle, what is the radius of each atom?
    interactive: boolean; // Is the canvas interactive?
    renderMode: RenderMode;
    legend: LegendOptionValues; // Legend to display
    legendLength: number; // Number of items in legend
}

/** Function that creates a default version of ISampleConfig */
export function createSampleConfigObject(): ISampleConfig {
    return {
        prettyStyle: true,
        atomRadius: 20,
        interactive: true,
        renderMode: RenderMode.Atoms,
        legend: LegendOptionValues.None,
        legendLength: 7,
    };
}

/** Used to represent a time. Returned from utils.ts : secondsToAppropriateTime() */
export interface ITimeObject {
    unit: string;
    time: number;
}

export interface IAnalysisResult {
    name: string; // Element name
    symbol: string; // Element symbol
    protons: number;
    neutrons: number;
    isotope: IIsotopeAnalysisResult | null;
}

export interface IIsotopeAnalysisResult {
    symbol: string;
    parent: string; // Same as 'symbol' unless is isomer
    isomerNumber: number; // Number after 'm' e.g. 'In-119m2'. Default is NaN.
}