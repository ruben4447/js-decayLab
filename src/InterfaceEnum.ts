/** Interface for isotope decay info */
export interface IDecayInfo {
    daughter?: string;
    mode?: EnumDecayMode;
    percentage?: number;
}

/** Interface for ATTEMPTED isotope decay info */
export interface IAttemptedDecayInfo extends IDecayInfo {
    success: boolean;
    error?: Error;
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
    manualOverride: boolean; // Allow e.g. force decay and stuff
    bindSpacebar: boolean; // Bind spacebar to start/stop the simulation?
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
        manualOverride: false,
        bindSpacebar: false,
    };
}

/** Used to represent a time. Returned from utils.ts : secondsToAppropriateTime() */
export interface ITimeObject {
    unit: string;
    time: number;
}

export interface IAnalysisResult {
    exists: boolean;
    name: string; // Element name e.g. "Uranium"
    symbol: string; // Element symbol e.g. "U"
    protons: number;
    neutrons: number;
    isotopeSymbol: string; // Isotope symbol e.g. "U-235"
    isotopicIsomerNumber?: number; // Number after 'm' e.g. "In-119m2"
    isotopicIsomerParent?: string; // If isotopicIsomerNumber is !NaN, then contains parent e.g. parent of "In-119m2" is "In-119"
    IUPACName: string;
    IUPACSymbol: string;
    isStable: boolean; // If isotope does not exist, make estimate
    halflife: number; // If not exist, set to NaN (even if theoretical isStable is true)
}

export function createAnalysisResultObject(): IAnalysisResult {
    return {
        exists: undefined,
        name: undefined,
        symbol: undefined,
        protons: NaN,
        neutrons: NaN,
        isotopeSymbol: undefined,
        IUPACName: undefined,
        IUPACSymbol: undefined,
        isStable: undefined,
        halflife: NaN,
    };
}

export interface IAnalyseStringComponent {
    symbol: string, name: string, IUPACName: string, IUPACSymbol: string, protons: number,
}

/** Return value from getIUPACNameSymbol */
export interface IIUPACNameSymbol {
    name: string, symbol: string,
}

/** Decay modes (values of each in atom.ts/DecayModes) */
export const DecayMode = {
    Alpha: 'α',
    BetaMinus: 'β−',
    BetaPlus: 'β+',
    NeutronEmission: 'n',
    SpontaneousFission: "SF",
    ElectronCapture: "EC",
    NuclearIsomer: "IT",
    ClusterDecay: "CD",
};

/** Decay mode info */
export const DecayModeDescription = {
    Alpha: 'Eject an alpha particle (He-4)',
    BetaMinus: 'Eject an electron and an antineutrino - turn neutron to proton',
    BetaPlus: 'Eject a positron and a neutrino - turn proton to neutron',
    NeutronEmission: 'Eject 1 or more neutrons',
    // SpontaneousFission: '',
    ElectronCapture: 'Nucleus captures an orbiting electron, converting a proton into a neutron',
    // NuclearIsomer: '',
    ClusterDecay: 'Emits small cluster of nucleons',
};

export enum EnumDecayMode {
    Alpha, BetaMinus, BetaPlus, NeutronEmission, SpontaneousFission, ElectronCapture, NuclearIsomer, ClusterDecay
}