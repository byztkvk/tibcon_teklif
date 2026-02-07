import { Product } from "@/lib/sheets";

export type CompProduct = Omit<Product, 'kvar' | 'voltage' | 'pPct' | 'ampA' | 'listPrice'> & {
    kvar?: number;
    voltage?: number;
    pPct?: number;
    ampA?: number;
    listPrice: number;
    mainCategory: string;
    type: string;
    _rawKvar?: any;
};

export type CompensationMode = "UNFILTERED" | "FILTERED";

export type CompensationInputs = {
    trafoKva: number;
    loadRatio: number;
    currentCos: number;
    targetCos: number;
    gridVoltage: number;
    gridFrequency: number;
    phaseType: "TRIFAZE" | "MONOFAZE";
    harmonicSuspicion: boolean;
    pPct: number;
    targetCapVoltage: number;
    filterType: string;
    stepCount: number;
    mode: CompensationMode;
    minFirstStepKvar: number;
};

export type CalculationResults = {
    p_kw: number;
    q_need_kvar: number;
    recommendedSteps: number;
    suggestFilter: boolean;
    vmin?: number;
    cap_uf?: number;
    reactor_lmh?: number;
    fr_hz?: number;
    capV_selected?: number;
};

export interface StepPlan {
    id: string;
    totalKvar: number;
    errorPct: number;
    minStep: number;
    maxStep: number;
    steps: number[];
    sequence: string;
    isRecommended?: boolean;
}

export type BomLine = {
    id: string;
    orderCode: string;
    productCode: string;
    name: string;
    type: string;
    qty: number;
    price: number;
    currency: string;
    unitKvar: number;
    voltage: number;
    pPct?: number;
};

export type CompMappings = {
    harmonicMap: any[];
    protectionMap: any[];
};

export interface ProductIndex {
    byOrderCode: { [key: string]: CompProduct };
    byType: { [key: string]: CompProduct[] };
    byStrictKey: { [key: string]: CompProduct }; // "TYPE|VOLTAGE|KVAR"
}

export interface SelectionStepTrace {
    stepKvar: number;
    solution?: string; // Ör: "2x30 (TBC1111)"
    totalReached?: number;
    cap?: { code: string; voltage: number; kvar: number };
    filter?: { code: string; pPct: number };
    nh?: { code: string; amp: number };
    contactor?: { code: string };
    error?: string;
}

export interface AutoSelectResult {
    bom: BomLine[];
    trace: SelectionStepTrace[];
    capV_selected: number;
}
