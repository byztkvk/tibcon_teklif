import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.salesPoints || !Array.isArray(body.salesPoints)) {
            return NextResponse.json({ success: false, error: "Invalid payload: salesPoints array required" }, { status: 400 });
        }

        const batch = adminDb.batch();
        let count = 0;

        body.salesPoints.forEach((sp: any) => {
            if (!sp.name) return;
            const spRef = adminDb.collection("salesPoints").doc();
            batch.set(spRef, {
                name: sp.name,
                cityId: sp.cityId || "",
                cityName: sp.cityName || "", // denormalized
                district: sp.district || "",
                groupId: sp.groupId || "", // New required group id
                groupName: sp.groupName || "", // denormalized
                regionId: sp.regionId || "", // denormalized
                address: sp.address || "",
                phone: sp.phone || "",
                email: sp.email || "",
                authorizedPerson: sp.authorizedPerson || "",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
        });

        if (count > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, imported: count });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
