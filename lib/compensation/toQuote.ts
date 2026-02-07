import { saveQuote } from "@/lib/sheets";
import { BomLine } from "./types";

export async function convertBomToQuote(
    bom: BomLine[],
    session: any,
    customerInfo: { name: string; city: string; district: string }
) {
    if (bom.length === 0) throw new Error("BOM boş.");

    const quoteRows = bom.map(item => ({
        code: item.productCode,
        name: item.name,
        qty: item.qty,
        currency: item.currency,
        listPrice: item.price,
        discountPct: 0,
        termin: "STOK"
    }));

    const quote = {
        id: "NEW",
        createdAt: new Date().toISOString(),
        cari: customerInfo.name,
        sehir: customerInfo.city,
        ilce: customerInfo.district,
        createdBy: session.email,
        ownerEmail: session.email,
        status: "DRAFT",
        rows: quoteRows,
        terms: "Kompanzasyon çözümü otomatik olarak oluşturulmuştur."
    };

    return await saveQuote({ quote, rows: quoteRows });
}
