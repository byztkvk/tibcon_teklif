import { StepPlan, CompensationInputs, ProductIndex } from "./types";

export function generateStepPlans(
    inputs: CompensationInputs,
    q_need: number,
    index: ProductIndex
): StepPlan[] {
    const { minFirstStepKvar, targetCapVoltage, gridVoltage, mode } = inputs;

    // 1. Get allowed kVAr values from CAP products
    // We strictly look for capacitors in the AG KONDANSATÖR category for plan generation too
    const capSearchV = mode === "FILTERED" ? targetCapVoltage : gridVoltage;
    const allowedKvars = (index.byType["CAP"] || [])
        .filter(p => p.mainCategory === "AG KONDANSATÖR")
        .filter(p => (p.voltage || 0) >= capSearchV)
        .map(p => p.kvar!)
        .filter((v, i, a) => v !== undefined && a.indexOf(v) === i && v > 0)
        .sort((a, b) => a - b);

    if (allowedKvars.length === 0) {
        // Fallback to standard values if no products found to at least show a plan
        allowedKvars.push(2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 100);
    }

    const relayCounts = [12, 15, 18, 27];
    const plans: StepPlan[] = relayCounts.map(n => createPlan(n, q_need, allowedKvars, minFirstStepKvar));

    let bestPlan = plans[0];
    plans.forEach(p => {
        if (Math.abs(p.errorPct) < Math.abs(bestPlan.errorPct)) {
            bestPlan = p;
        }
    });
    bestPlan.isRecommended = true;

    return plans;
}

function createPlan(N: number, q_need: number, allowed: number[], minFirst: number): StepPlan {
    const steps: number[] = [];

    // Rule: Step1 >= minFirstStepKvar AND Step1 >= 10% of Q_need (if possible)
    let step1Target = Math.max(minFirst, q_need * 0.10);
    // Find closest >= step1Target
    let step1 = allowed.find(a => a >= step1Target) || allowed[allowed.length - 1];
    steps.push(Math.round(step1 * 100) / 100);

    let remaining = q_need - step1;
    const smallStepLimit = Math.floor(N * 0.30);
    let smallStepCount = 0;

    for (let i = 1; i < N; i++) {
        let ideal = remaining / (N - i);

        // Find closest allowed
        let closest = allowed.reduce((prev, curr) =>
            Math.abs(curr - ideal) < Math.abs(prev - ideal) ? curr : prev
        );

        // Small step constraint (2.5 kVAr)
        if (closest <= 2.5) {
            if (smallStepCount >= smallStepLimit) {
                closest = allowed.find(a => a > 2.5) || closest;
            } else {
                smallStepCount++;
            }
        }

        const roundedClosest = Math.round(closest * 100) / 100;
        steps.push(roundedClosest);
        remaining -= roundedClosest;
    }

    const total = steps.reduce((a, b) => a + b, 0);
    const error = ((total - q_need) / q_need) * 100;

    return {
        id: `plan-${N}`,
        totalKvar: Math.round(total * 10) / 10,
        errorPct: Math.round(error * 10) / 10,
        minStep: Math.min(...steps),
        maxStep: Math.max(...steps),
        steps,
        sequence: formatSequence(steps)
    };
}

function formatSequence(steps: number[]): string {
    if (steps.length > 10) {
        const first = steps.slice(0, 5).join(" + ");
        const last = steps.slice(-3).join(" + ");
        return `${first} ... ${last} (${steps.length} kademe)`;
    }
    return steps.join(" + ");
}
