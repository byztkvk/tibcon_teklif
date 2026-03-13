import { NextResponse } from "next/server";
import { proxyPut, proxyDelete } from "@/lib/api-proxy";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const auth = req.headers.get("Authorization");
        const data = await proxyPut(`/api/regions/${id}`, body, auth ? { Authorization: auth } : {});
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = req.headers.get("Authorization");
        const data = await proxyDelete(`/api/regions/${id}`, auth ? { Authorization: auth } : {});
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
