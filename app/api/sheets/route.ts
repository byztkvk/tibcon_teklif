import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const gasUrl = process.env.GAS_WEBAPP_URL;

    console.log("----------------------------------------------------------------");
    console.log(`[API] GET Request: action=${action}`);

    if (!gasUrl) {
        console.error("[API] ERROR: GAS_WEBAPP_URL missing in .env.local");
        return NextResponse.json({ ok: false, message: "Missing Server Configuration" }, { status: 500 });
    }

    try {
        const target = `${gasUrl}?${searchParams.toString()}`;
        console.log(`[API] Fetching: ${target}`);

        const res = await fetch(target, { cache: "no-store" });
        const text = await res.text();

        if (!res.ok) {
            console.error(`[API] Fetch failed. Status: ${res.status}`);
            return NextResponse.json({ ok: false, message: `GAS Error: ${res.status}`, raw: text }, { status: res.status });
        }

        try {
            return NextResponse.json(JSON.parse(text));
        } catch (e) {
            console.error(`[API] JSON Parse Error:`, e);
            return NextResponse.json({ ok: false, message: "Invalid JSON from GAS", raw: text.slice(0, 500) }, { status: 502 });
        }
    } catch (error: any) {
        console.error(`[API] Network/Server Error:`, error);
        return NextResponse.json({ ok: false, message: String(error) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const gasUrl = process.env.GAS_WEBAPP_URL;
    if (!gasUrl) {
        return NextResponse.json({ ok: false, message: "Missing GAS_WEBAPP_URL" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const action = body.action || new URL(req.url).searchParams.get("action");

        console.log("----------------------------------------------------------------");
        console.log(`[API] POST Request: action=${action}`);

        const res = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            redirect: "follow",
        });

        const text = await res.text();
        console.log(`[API] GAS POST Response Body: ${text.slice(0, 200)}...`);

        if (!res.ok) {
            return NextResponse.json({ ok: false, message: `GAS POST Error: ${res.status}`, raw: text }, { status: res.status });
        }

        try {
            return NextResponse.json(JSON.parse(text));
        } catch (e) {
            return NextResponse.json({ ok: false, message: "Invalid JSON from GAS POST", raw: text.slice(0, 500) }, { status: 502 });
        }
    } catch (error: any) {
        console.error(`[API] POST Network/Server Error:`, error);
        return NextResponse.json({ ok: false, message: String(error) }, { status: 500 });
    }
}
