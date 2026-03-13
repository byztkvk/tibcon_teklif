import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

export async function GET() {
    return NextResponse.json({ success: true, message: "Use POST to trigger migration. Be sure to understand what this does." });
}

export async function POST(req: Request) {
    try {
        const batchAmount = 100;

        // 1. MIGRATE QUOTES
        const quotesSnap = await adminDb.collection("quotes").get();
        let migratedQuotesCount = 0;

        let batch = adminDb.batch();
        let opsCount = 0;

        // Fetch cities map
        const citiesSnap = await adminDb.collection("cities").get();
        const citiesMap = new Map();
        citiesSnap.docs.forEach((doc: any) => {
            const data = doc.data();
            citiesMap.set(data.name.toUpperCase(), doc.id);
        });

        for (const doc of quotesSnap.docs) {
            const data = doc.data();
            let updateData: any = {};
            let needsUpdate = false;

            // Missing cityId logic
            if (!data.cityId) {
                // Try to infer from cari (usually "NAME - CITY") or sehir if available
                let matchedCityId = null;

                // Attempt to map sehir if not mapped yet
                if (data.sehir && citiesMap.has(data.sehir.toUpperCase())) {
                    matchedCityId = citiesMap.get(data.sehir.toUpperCase());
                } else if (data.cari) {
                    // VERY basic infer
                    for (const [cityName, cityId] of citiesMap.entries()) {
                        if (data.cari.toUpperCase().includes(cityName)) {
                            matchedCityId = cityId;
                            break;
                        }
                    }
                }

                if (matchedCityId) {
                    updateData.cityId = matchedCityId;
                    needsUpdate = true;
                }
            }

            if (!data.regionId && updateData.cityId) {
                // Infer region from the matched city
                const targetCity = citiesSnap.docs.find((c: any) => c.id === updateData.cityId);
                if (targetCity && targetCity.data()?.assignedRegionId) {
                    updateData.regionId = targetCity.data().assignedRegionId;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                batch.update(adminDb.collection("quotes").doc(doc.id), updateData);
                opsCount++;
                migratedQuotesCount++;

                if (opsCount >= batchAmount) {
                    await batch.commit();
                    batch = adminDb.batch();
                    opsCount = 0;
                }
            }
        }

        // Commit remaining for quotes
        if (opsCount > 0) {
            await batch.commit();
            batch = adminDb.batch();
            opsCount = 0;
        }

        // 2. MIGRATE SALES POINTS (if any exist natively, skipping for now as requested, only map cityName to cityId)
        const spSnap = await adminDb.collection("salesPoints").get();
        let migratedSpCount = 0;

        for (const doc of spSnap.docs) {
            const data = doc.data();
            let updateData: any = {};
            let needsUpdate = false;

            if (!data.cityId && data.cityName) {
                if (citiesMap.has(data.cityName.toUpperCase())) {
                    updateData.cityId = citiesMap.get(data.cityName.toUpperCase());
                    needsUpdate = true;
                }
            }

            if (!data.regionId && updateData.cityId) {
                const targetCity = citiesSnap.docs.find((c: any) => c.id === updateData.cityId);
                if (targetCity && targetCity.data()?.assignedRegionId) {
                    updateData.regionId = targetCity.data().assignedRegionId;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                batch.update(adminDb.collection("salesPoints").doc(doc.id), updateData);
                opsCount++;
                migratedSpCount++;

                if (opsCount >= batchAmount) {
                    await batch.commit();
                    batch = adminDb.batch();
                    opsCount = 0;
                }
            }
        }

        if (opsCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            message: `Migrated ${migratedQuotesCount} Quotes, ${migratedSpCount} SalesPoints.`
        });

    } catch (e: any) {
        console.error("MIGRATE ERR", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
