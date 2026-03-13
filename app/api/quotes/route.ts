import { NextResponse } from "next/server";
import { proxyGet, proxyPost } from "@/lib/api-proxy";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const auth = req.headers.get("Authorization");
        const data = await proxyGet(`/api/quotes${url.search}`, auth ? { Authorization: auth } : {});
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const auth = req.headers.get("Authorization");
        const data = await proxyPost("/api/quotes", body, auth ? { Authorization: auth } : {});
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
