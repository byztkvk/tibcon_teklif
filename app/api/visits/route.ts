import { NextResponse } from "next/server";

// ─── Mock data (GAS bağlantısı yokken fallback) ───────────────────────────────
const MOCK_VISITS = [
    {
        id: "mock-1",
        firmaAdi: "Örnek Firma A",
        sehir: "İstanbul",
        ilce: "Kadıköy",
        plannedDate: new Date().toISOString().slice(0, 10),
        notes: "İlk görüşme",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        assignedTo: "",
        creatorId: "",
    },
    {
        id: "mock-2",
        firmaAdi: "Örnek Firma B",
        sehir: "Ankara",
        ilce: "Çankaya",
        plannedDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        notes: "Teklif sunumu",
        status: "OFFERED",
        createdAt: new Date().toISOString(),
        assignedTo: "",
        creatorId: "",
    },
];

/**
 * GET /api/visits?month=YYYY-MM
 * Belirtilen aya ait ziyaret planlarını döndürür.
 * GAS bağlantısı varsa oradan, yoksa mock data döner.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. "2026-02"
    const gasUrl = process.env.GAS_WEBAPP_URL;

    // GAS bağlantısı varsa oradan çek
    if (gasUrl) {
        try {
            const params = new URLSearchParams({ action: "listVisitPlans" });
            if (month) params.set("month", month);

            const res = await fetch(`${gasUrl}?${params.toString()}`, {
                cache: "no-store",
            });
            const text = await res.text();

            try {
                const data = JSON.parse(text);
                // Filter by month if provided
                if (month && data.plans) {
                    data.plans = data.plans.filter((p: any) =>
                        (p.plannedDate || "").startsWith(month)
                    );
                }
                return NextResponse.json(data);
            } catch {
                return NextResponse.json(
                    { ok: false, message: "Invalid JSON from GAS", raw: text.slice(0, 300) },
                    { status: 502 }
                );
            }
        } catch (e: any) {
            console.error("[api/visits GET] GAS error:", e);
            // Fallback to mock
        }
    }

    // Mock fallback
    let visits = MOCK_VISITS;
    if (month) {
        visits = visits.filter((v) => v.plannedDate.startsWith(month));
    }

    return NextResponse.json({ ok: true, plans: visits });
}
