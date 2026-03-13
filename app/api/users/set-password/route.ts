import { NextResponse } from "next/server";
import { proxyPost } from "@/lib/api-proxy";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const auth = req.headers.get("Authorization");
        const data = await proxyPost("/api/users/set-password", body, auth ? { Authorization: auth } : {});
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
