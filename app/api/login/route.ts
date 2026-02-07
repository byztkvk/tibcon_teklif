import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await req.json();
    const res = NextResponse.json({ ok: true });
    // Cookie is only a backup/server-side hint, main logic is localStorage
    res.cookies.set("tibcon_session", JSON.stringify(session), {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
    });
    return res;
}
