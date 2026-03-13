import { NextResponse } from "next/server";
import { proxyGet } from "@/lib/api-proxy";

export async function GET(req: Request) {
    try {
        const auth = req.headers.get("Authorization");
        const data = await proxyGet("/api/products", auth ? { Authorization: auth } : {});
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
