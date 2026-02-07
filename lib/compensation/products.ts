import { listProducts, Product } from "@/lib/sheets";
import { CompProduct, ProductIndex } from "./types";

/**
 * Türk yerel ayarları için sağlam sayısal ayrıştırıcı.
 * "1.156,00" -> 1156.0
 * "40,00" -> 40.0
 * "7,50" -> 7.5
 */
export function normalizeNumberTR(val: any): number | undefined {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === "number") return isNaN(val) ? undefined : val;

    let str = val.toString().trim().replace(/\s/g, "");
    if (!str) return undefined;

    // Tüm "." binlik ayırıcılarını kaldır
    str = str.replace(/\./g, "");
    // Virgülü (.) ile değiştir (ondalık ayırıcı)
    str = str.replace(",", ".");

    const value = parseFloat(str);
    return isNaN(value) ? undefined : value;
}

// Geriye dönük uyumluluk için takma ad
export const parseNum = normalizeNumberTR;

export async function getIndexedProducts(): Promise<ProductIndex> {
    const res = await listProducts();
    const rawItems = res?.products || [];

    const index: ProductIndex = {
        byOrderCode: {},
        byType: {},
        byStrictKey: {}
    };

    rawItems.forEach((p) => {
        const type = (p.type || "OTHER").toString().trim().toUpperCase();

        // DEBUG LOGGING
        if (p.kvar !== undefined && p.kvar !== "") {
            // console.log(`[Products] Found kvar for ${p.productCode}:`, p.kvar);
        } else if (Math.random() < 0.01) {
            console.log(`[Products] Sample raw product (no kvar?):`, p);
        }

        const kvar = normalizeNumberTR(p.kvar);
        const voltage = normalizeNumberTR(p.voltage);

        const normalized: CompProduct = {
            ...p,
            mainCategory: (p.mainCategory || "").toString().trim().toUpperCase(),
            type: type,
            kvar: kvar,
            voltage: voltage,
            pPct: normalizeNumberTR(p.pPct),
            ampA: normalizeNumberTR(p.ampA),
            listPrice: normalizeNumberTR(p.listPrice) || 0,
            // Fallback chain: GroupCode -> Type -> MainCategory -> "Genel"
            groupCode: (p.groupCode || p.type || p.mainCategory || "Genel").toString().trim()
        };

        if (normalized.orderCode) {
            index.byOrderCode[normalized.orderCode] = normalized;
        }

        const typeKey = normalized.type;
        if (!index.byType[typeKey]) index.byType[typeKey] = [];
        index.byType[typeKey].push(normalized);

        // Strict Key Indexing: "TYPE|VOLTAGE|KVAR"
        if (kvar !== undefined && voltage !== undefined) {
            const strictKey = `${normalized.type}|${voltage}|${kvar.toFixed(2)}`;
            index.byStrictKey[strictKey] = normalized;
        }
    });

    console.log("[Compensation] Normalized Product Counts:",
        Object.keys(index.byType).map(t => `${t}: ${index.byType[t].length}`)
    );

    return index;
}

export function findBestMatch(
    products: CompProduct[],
    filters: {
        kvar?: number;
        voltage?: number;
        pPct?: number;
        ampA?: number;
        type?: string;
        mainCategory?: string;
    }
): CompProduct | undefined {
    if (products.length === 0) return undefined;

    let candidates = products;

    if (filters.type) {
        candidates = candidates.filter(p => p.type === filters.type);
    }

    if (filters.mainCategory) {
        candidates = candidates.filter(p => p.mainCategory === filters.mainCategory);
    }

    if (filters.voltage !== undefined) {
        candidates = candidates.filter(p => p.voltage === filters.voltage);
    }

    if (filters.kvar !== undefined) {
        candidates = candidates.filter(p => Math.abs((p.kvar || 0) - filters.kvar!) < 0.01);
    }

    if (filters.pPct !== undefined) {
        candidates = candidates.filter(p => Math.abs((p.pPct || 0) - filters.pPct!) < 0.01);
    }

    if (filters.ampA !== undefined) {
        candidates = candidates.filter(p => (p.ampA || 0) >= filters.ampA!);
        if (candidates.length > 0) {
            return candidates.sort((a, b) => (a.ampA || 0) - (b.ampA || 0))[0];
        }
    }

    return candidates[0];
}
