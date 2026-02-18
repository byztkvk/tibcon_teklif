import { NextResponse } from "next/server";

/**
 * PATCH /api/visits/:id
 * Ziyaret planının alanlarını günceller (örn. eventDrop sonrası yeni tarih).
 * Body: { start?: string, status?: string, notes?: string, ... }
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const gasUrl = process.env.GAS_WEBAPP_URL;

    let body: Record<string, any>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { ok: false, message: "Invalid JSON body" },
            { status: 400 }
        );
    }

    if (!id) {
        return NextResponse.json(
            { ok: false, message: "Missing visit id" },
            { status: 400 }
        );
    }

    // GAS bağlantısı varsa oraya ilet
    if (gasUrl) {
        try {
            const payload = {
                action: "updateVisitPlan",
                id,
                ...body,
            };

            const res = await fetch(gasUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                redirect: "follow",
            });

            const text = await res.text();
            try {
                return NextResponse.json(JSON.parse(text));
            } catch {
                return NextResponse.json(
                    { ok: false, message: "Invalid JSON from GAS", raw: text.slice(0, 300) },
                    { status: 502 }
                );
            }
        } catch (e: any) {
            console.error("[api/visits/[id] PATCH] GAS error:", e);
            return NextResponse.json(
                { ok: false, message: String(e) },
                { status: 500 }
            );
        }
    }

    // GAS yoksa başarılı simüle et (dev mode)
    console.log(`[api/visits/${id}] PATCH (mock):`, body);
    return NextResponse.json({ ok: true, id, updated: body });
}

/**
 * DELETE /api/visits/:id
 * Ziyaret planını iptal eder.
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const gasUrl = process.env.GAS_WEBAPP_URL;

    if (!id) {
        return NextResponse.json(
            { ok: false, message: "Missing visit id" },
            { status: 400 }
        );
    }

    if (gasUrl) {
        try {
            const res = await fetch(gasUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "updateVisitPlanStatus", id, status: "CANCELLED" }),
                redirect: "follow",
            });
            const text = await res.text();
            try {
                return NextResponse.json(JSON.parse(text));
            } catch {
                return NextResponse.json({ ok: false, raw: text.slice(0, 300) }, { status: 502 });
            }
        } catch (e: any) {
            return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
        }
    }

    console.log(`[api/visits/${id}] DELETE (mock)`);
    return NextResponse.json({ ok: true, id, status: "CANCELLED" });
}
