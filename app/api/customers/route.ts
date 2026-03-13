import { NextResponse } from "next/server";
import { proxyGet, proxyPost } from "@/lib/api-proxy";

export async function GET(req: Request) {
    try {
        const auth = req.headers.get("Authorization");
        const data = await proxyGet("/api/salesPoints", auth ? { Authorization: auth } : {});
        return NextResponse.json({ ok: true, points: data.data || [] });
    } catch (error: any) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const auth = req.headers.get("Authorization");
        const data = await proxyPost("/api/salesPoints", body, auth ? { Authorization: auth } : {});
        return NextResponse.json({ ok: true, id: data.id });
    } catch (error: any) {
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}
