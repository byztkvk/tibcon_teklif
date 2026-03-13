import { NextResponse } from "next/server";
import { proxyGet } from "@/lib/api-proxy";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const auth = req.headers.get("Authorization");
        const data = await proxyGet(`/api/dashboard/stats${url.search}`, auth ? { Authorization: auth } : {});
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
