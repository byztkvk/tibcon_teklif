import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { visits } = body;

        if (!visits || !Array.isArray(visits)) {
            return NextResponse.json({ success: false, error: "Geçersiz veri formatı." }, { status: 400 });
        }

        // Fetch users to map emails to names if needed, and verify
        const usersSnap = await adminDb.collection("users").get();
        const usersMap = new Map();
        usersSnap.docs.forEach(doc => {
            const d = doc.data();
            usersMap.set(d.email.toLowerCase(), {
                name: d.displayName || d.name || d.fullName,
                regionId: d.regionId || "",
                regionIds: d.regionIds || []
            });
        });

        // Fetch sales points for mapping
        const spSnap = await adminDb.collection("salesPoints").get();
        const spMap = new Map(); // Key: "NAME|CITY"
        spSnap.docs.forEach(doc => {
            const d = doc.data();
            const key = `${(d.name || "").toLowerCase()}|${(d.cityName || "").toLowerCase()}`;
            spMap.set(key, {
                id: doc.id,
                cityId: d.cityId,
                cityName: d.cityName,
                regionId: d.regionId,
                district: d.district
            });
        });

        const batchAmount = 500;
        let batch = adminDb.batch();
        let opsCount = 0;
        let imported = 0;

        // Get all cities for name -> ID mapping (fallback if sales point match fails)
        const citiesSnap = await adminDb.collection("cities").get();
        const cityMap = new Map();
        citiesSnap.docs.forEach(doc => {
            const data = doc.data();
            const name = (data.name || "").toLowerCase().trim();
            if (name) cityMap.set(name, doc.id);
        });

        for (const v of visits) {
            // Try to find sales point for accurate cityId/regionId mapping
            const spKey = `${(v.firmaAdi || "").toLowerCase()}|${(v.sehir || "").toLowerCase()}`;
            const sp = spMap.get(spKey);

            // Fallback city identification by name
            const resolvedCityNameLower = (v.sehir || "").toString().toLowerCase().trim();
            const fallbackCityId = cityMap.get(resolvedCityNameLower) || "";

            const visitData = {
                cariId: sp?.id || "",
                cariUnvan: v.firmaAdi || sp?.name || "",
                sehir: v.sehir || sp?.cityName || "",
                ilce: v.ilce || sp?.district || "",
                ziyaretTarihi: v.ziyaretTarihi, // ISO string or YYYY-MM-DD
                ziyaretNotu: v.ziyaretNotu || "",
                personelAdi: v.personelAdi || "Bilinmeyen Personel",

                status: "COMPLETED",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                creatorId: "admin_import",
                ownerEmail: v.personelEmail || "",
                regionId: sp?.regionId || "",
                cityId: sp?.cityId || fallbackCityId || "",
                yetkiliKisi: v.yetkiliKisi || "",
                ziyaretTipi: v.ziyaretTipi || "Ziyaret",
                isImported: true
            };

            const docRef = adminDb.collection("visits").doc();
            batch.set(docRef, visitData);
            opsCount++;
            imported++;

            if (opsCount >= batchAmount) {
                await batch.commit();
                batch = adminDb.batch();
                opsCount = 0;
            }
        }

        if (opsCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, imported });
    } catch (e: any) {
        console.error("IMPORT VISITS ERR", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
