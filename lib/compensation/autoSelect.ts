import {
    CompensationInputs,
    BomLine,
    CompProduct,
    CompMappings,
    CalculationResults,
    StepPlan,
    AutoSelectResult,
    SelectionStepTrace,
    ProductIndex
} from "./types";
import { findBestMatch } from "./products";

const AMP_STANDARDS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 400, 630];

/**
 * Mevcut kondansatörlerden hedef kVAr'ı oluşturmaya çalışır.
 * Açgözlü (Greedy) yaklaşım kullanılır.
 */
function findCapCombination(
    targetKvar: number,
    voltage: number,
    index: ProductIndex
): { products: { product: CompProduct; qty: number }[]; total: number; solution: string } | undefined {

    // 1. Direkt eşleşme kontrolü
    const directKey = `CAP|${voltage}|${targetKvar.toFixed(2)}`;
    const directMatch = index.byStrictKey[directKey];
    if (directMatch) {
        return {
            products: [{ product: directMatch, qty: 1 }],
            total: targetKvar,
            solution: `1x${targetKvar} (${directMatch.orderCode})`
        };
    }

    // 2. Kombinasyon denemesi
    // İlgili voltajdaki mevcut kVAr değerlerini büyükten küçüğe al
    const available = (index.byType["CAP"] || [])
        .filter(p => (p.voltage || 0) === voltage && (p.kvar || 0) > 0)
        .sort((a, b) => (b.kvar || 0) - (a.kvar || 0));

    if (available.length === 0) return undefined;

    let remaining = targetKvar;
    const result: { product: CompProduct; qty: number }[] = [];
    let currentTotal = 0;

    for (const p of available) {
        const val = p.kvar || 0;
        if (val <= remaining + 0.05) { // Tolerans dahilinde
            const count = Math.floor((remaining + 0.05) / val);
            if (count > 0) {
                result.push({ product: p, qty: count });
                remaining -= val * count;
                currentTotal += val * count;
            }
        }
    }

    // Tolerans kontrolü (±0.05)
    if (Math.abs(currentTotal - targetKvar) <= 0.05) {
        const solutionStrings = result.map(r => `${r.qty}x${r.product.kvar} (${r.product.orderCode})`);
        return {
            products: result,
            total: Math.round(currentTotal * 100) / 100,
            solution: solutionStrings.join(" + ")
        };
    }

    return undefined;
}

export function autoSelectProducts(
    inputs: CompensationInputs,
    results: CalculationResults,
    index: ProductIndex,
    mappings: CompMappings,
    selectedPlan: StepPlan
): AutoSelectResult {
    const { mode, gridVoltage, phaseType, targetCapVoltage, pPct } = inputs;
    const bom: BomLine[] = [];
    const trace: SelectionStepTrace[] = [];

    // 1. Kapasitör Voltaj Sınıfı Belirle
    let capV_selected = mode === "FILTERED" ? targetCapVoltage : gridVoltage;

    const availableCapVoltages = (index.byType["CAP"] || [])
        .filter(p => p.mainCategory === "AG KONDANSATÖR")
        .map(p => p.voltage!)
        .filter((v, i, a) => v !== undefined && a.indexOf(v) === i)
        .sort((a, b) => a - b);

    if (mode === "UNFILTERED") {
        if (!availableCapVoltages.includes(capV_selected)) {
            const higher = availableCapVoltages.find(v => v >= capV_selected);
            if (higher) capV_selected = higher;
            else if (availableCapVoltages.length > 0) capV_selected = availableCapVoltages[availableCapVoltages.length - 1];
        }
    }

    // 2. Kademeleri İşle
    selectedPlan.steps.forEach((sKvar) => {
        const roundedKvar = Math.round(sKvar * 100) / 100;
        const stepTrace: SelectionStepTrace = { stepKvar: roundedKvar };

        // --- KAPASİTÖR Seçimi (Kombinasyon Destekli) ---
        const capResult = findCapCombination(roundedKvar, capV_selected, index);

        if (!capResult) {
            stepTrace.error = `Bu kademeyi (${roundedKvar} kVAr / ${capV_selected}V) mevcut kondansatör kVAr seçenekleriyle kuramadım.`;
        } else {
            stepTrace.solution = capResult.solution;
            stepTrace.totalReached = capResult.total;

            // İlk ürünü (veya tek ürünü) trace'e sembolik koy (UI uyumluluğu için)
            const mainCap = capResult.products[0].product;
            stepTrace.cap = { code: mainCap.orderCode, voltage: mainCap.voltage || 0, kvar: mainCap.kvar || 0 };

            // Ürünleri BOM'a ekle
            capResult.products.forEach(r => {
                addOrMerge(bom, r.product, r.qty);
            });

            // --- FİLTRE Seçimi ---
            if (mode === "FILTERED") {
                const filter = findBestMatch(index.byType["FILTER"] || [], {
                    type: "FILTER",
                    voltage: gridVoltage,
                    pPct: pPct,
                    kvar: roundedKvar
                });
                if (filter) {
                    stepTrace.filter = { code: filter.orderCode, pPct: filter.pPct! };
                    addOrMerge(bom, filter, 1);
                } else {
                    stepTrace.error = (stepTrace.error ? stepTrace.error + " | " : "") + `Filtre bulunamadı (${roundedKvar}kVAr / ${pPct}%).`;
                }
            }

            // --- NH SİGORTA Seçimi ---
            const denom = phaseType === "TRIFAZE" ? (Math.sqrt(3) * gridVoltage) : 230;
            const i_nominal = (roundedKvar * 1000) / denom;
            const i_required = i_nominal * 1.5;
            const pickAmp = AMP_STANDARDS.find(a => a >= i_required) || AMP_STANDARDS[AMP_STANDARDS.length - 1];

            const nh = findBestMatch(index.byType["NH"] || [], { type: "NH", ampA: pickAmp });
            if (nh) {
                stepTrace.nh = { code: nh.orderCode, amp: nh.ampA! };
                addOrMerge(bom, nh, phaseType === "TRIFAZE" ? 3 : 1);
            }

            // --- KONTAKTÖR Seçimi ---
            const cont = findBestMatch(index.byType["CONTACTOR"] || [], { type: "CONTACTOR", kvar: roundedKvar });
            if (cont) {
                stepTrace.contactor = { code: cont.orderCode };
                addOrMerge(bom, cont, 1);
            }
        }
        trace.push(stepTrace);
    });

    return { bom, trace, capV_selected };
}

function addOrMerge(bom: BomLine[], product: CompProduct, qty: number) {
    const existing = bom.find(b => b.orderCode === product.orderCode);
    if (existing) {
        existing.qty += qty;
    } else {
        bom.push({
            id: Math.random().toString(36).substr(2, 9),
            orderCode: product.orderCode,
            productCode: product.productCode,
            name: product.name,
            type: product.type,
            qty: qty,
            price: product.listPrice,
            currency: product.currency || "USD",
            unitKvar: product.kvar || 0,
            voltage: product.voltage || 0,
            pPct: product.pPct
        });
    }
}
