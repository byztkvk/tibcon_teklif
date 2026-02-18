import { CompProduct } from "./types";

export interface WizardSystemParams {
    gridVoltage: number; // e.g. 400
    phaseType: "MONOFAZE" | "TRIFAZE";
    relaySize: number; // 12, 18, 24
    harmonicFilter: boolean; // NEW: Is system filtered?
}

// Updated to support multiple items per slot
export type ComponentSlotType = "CAP" | "SWITCH" | "NH" | "LOAD_BREAK" | "FILTER" | "SHUNT" | "SVC" | "HARMONIC_FILTER";

export interface ComponentSelection {
    product: CompProduct;
    qty: number;
}

export interface WizardStep {
    id: number;
    active: boolean;
    // Now allows multiple items per slot type (e.g. 2 different capacitors)
    components: Partial<Record<ComponentSlotType, ComponentSelection[]>>;
}

export interface DesignState {
    system: WizardSystemParams;
    currentTransformer?: ComponentSelection; // NEW: Main Current Transformer
    relay: {
        maxSteps: number;
        activeSteps: boolean[];
        selectedProduct?: ComponentSelection;
    };
    svc: {
        active: boolean;
        driver: ComponentSelection[];
        fuse: ComponentSelection[];   // NH Yük Ayırıcı — birden fazla olabilir
        shunts: ComponentSelection[][];
    };
    steps: Record<number, WizardStep>;
}

export const INITIAL_DESIGN_STATE: DesignState = {
    system: { gridVoltage: 400, phaseType: "TRIFAZE", relaySize: 12, harmonicFilter: false }, // Updated with harmonicFilter
    relay: {
        maxSteps: 12,
        activeSteps: Array(12).fill(true)
    },
    svc: {
        active: false,
        driver: [],
        fuse: [],          // array olarak başlat
        shunts: [[], [], []],
    },
    steps: {}
};

// Helper to initialize steps
export function createEmptySteps(count: number): Record<number, WizardStep> {
    const steps: Record<number, WizardStep> = {};
    for (let i = 1; i <= count; i++) {
        steps[i] = {
            id: i,
            active: true,
            components: {}
        };
    }
    return steps;
}
