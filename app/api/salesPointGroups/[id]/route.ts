import { NextResponse } from "next/server";
import { proxyDelete } from "@/lib/api-proxy";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = req.headers.get("Authorization");
        const data = await proxyDelete(`/api/salesPointGroups/${id}`, auth ? { Authorization: auth } : {});
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
