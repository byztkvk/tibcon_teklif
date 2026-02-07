import { CompensationInputs, CalculationResults } from "./types";

export function calculateCompensation(inputs: CompensationInputs): CalculationResults {
    const {
        trafoKva,
        loadRatio,
        currentCos,
        targetCos,
        gridVoltage,
        gridFrequency,
        pPct,
        mode
    } = inputs;

    // Active Power: P = S * loadRatio * currentCos
    const p_kw = trafoKva * loadRatio * currentCos;

    // Target reactive power: Q = P * (tan(acos(cos1)) - tan(acos(cos2)))
    const cos1 = Math.min(0.999, Math.max(0.01, currentCos));
    const cos2 = Math.min(0.999, Math.max(0.01, targetCos));

    const phi1 = Math.acos(cos1);
    const phi2 = Math.acos(cos2);

    const q_need_kvar = p_kw * (Math.tan(phi1) - Math.tan(phi2));

    let results: CalculationResults = {
        p_kw: Math.round(p_kw * 100) / 100,
        q_need_kvar: Math.round(q_need_kvar * 100) / 100,
        recommendedSteps: inputs.stepCount,
        suggestFilter: false
    };

    // Heuristics for filter suggestion
    if (mode === "UNFILTERED") {
        if (inputs.harmonicSuspicion || (gridVoltage === 400 && q_need_kvar > 50)) {
            results.suggestFilter = true;
        }
    }

    // Filter Specific Calculations
    if (mode === "FILTERED") {
        // Vmin = gridV * (1 / (1 - p%))
        const p = pPct / 100;
        const vmin = gridVoltage * (1 / (1 - p));
        results.vmin = Math.round(vmin * 10) / 10;

        // fr = gridF / sqrt(p%)
        const fr_hz = gridFrequency / Math.sqrt(p);
        results.fr_hz = Math.round(fr_hz * 10) / 10;

        // Capacitance C (uF)
        // trifaze: C_uF = 1e6 * (Q*1000) / (V^2 * 2*pi*f * 3)
        // We use q_need_kvar for the target calculation
        const factor = inputs.phaseType === "TRIFAZE" ? 3 : 1;
        const omega = 2 * Math.PI * gridFrequency;
        const cap_f = (q_need_kvar * 1000) / (Math.pow(gridVoltage, 2) * omega * factor);
        results.cap_uf = Math.round(cap_f * 1e6 * 100) / 100;

        // Reactor Inductance L (mH)
        // L = 1 / ((2*pi*fr)^2 * C)
        const omega_r = 2 * Math.PI * fr_hz;
        const l_h = 1 / (Math.pow(omega_r, 2) * cap_f);
        results.reactor_lmh = Math.round(l_h * 1000 * 100) / 100;
    }

    return results;
}

export function formatTRNumber(val: string): number {
    if (!val) return 0;
    const normalized = val.replace(/\./g, "").replace(/,/g, ".");
    return parseFloat(normalized) || 0;
}
