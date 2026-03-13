import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

const TURKEY_CITIES = [
    { id: "TR-01", name: "ADANA", plateCode: 1 },
    { id: "TR-02", name: "ADIYAMAN", plateCode: 2 },
    { id: "TR-03", name: "AFYONKARAHİSAR", plateCode: 3 },
    { id: "TR-04", name: "AĞRI", plateCode: 4 },
    { id: "TR-05", name: "AMASYA", plateCode: 5 },
    { id: "TR-06", name: "ANKARA", plateCode: 6 },
    { id: "TR-07", name: "ANTALYA", plateCode: 7 },
    { id: "TR-08", name: "ARTVİN", plateCode: 8 },
    { id: "TR-09", name: "AYDIN", plateCode: 9 },
    { id: "TR-10", name: "BALIKESİR", plateCode: 10 },
    { id: "TR-11", name: "BİLECİK", plateCode: 11 },
    { id: "TR-12", name: "BİNGÖL", plateCode: 12 },
    { id: "TR-13", name: "BİTLİS", plateCode: 13 },
    { id: "TR-14", name: "BOLU", plateCode: 14 },
    { id: "TR-15", name: "BURDUR", plateCode: 15 },
    { id: "TR-16", name: "BURSA", plateCode: 16 },
    { id: "TR-17", name: "ÇANAKKALE", plateCode: 17 },
    { id: "TR-18", name: "ÇANKIRI", plateCode: 18 },
    { id: "TR-19", name: "ÇORUM", plateCode: 19 },
    { id: "TR-20", name: "DENİZLİ", plateCode: 20 },
    { id: "TR-21", name: "DİYARBAKIR", plateCode: 21 },
    { id: "TR-22", name: "EDİRNE", plateCode: 22 },
    { id: "TR-23", name: "ELAZIĞ", plateCode: 23 },
    { id: "TR-24", name: "ERZİNCAN", plateCode: 24 },
    { id: "TR-25", name: "ERZURUM", plateCode: 25 },
    { id: "TR-26", name: "ESKİŞEHİR", plateCode: 26 },
    { id: "TR-27", name: "GAZİANTEP", plateCode: 27 },
    { id: "TR-28", name: "GİRESUN", plateCode: 28 },
    { id: "TR-29", name: "GÜMÜŞHANE", plateCode: 29 },
    { id: "TR-30", name: "HAKKARİ", plateCode: 30 },
    { id: "TR-31", name: "HATAY", plateCode: 31 },
    { id: "TR-32", name: "ISPARTA", plateCode: 32 },
    { id: "TR-33", name: "MERSİN", plateCode: 33 },
    { id: "TR-34", name: "İSTANBUL", plateCode: 34 },
    { id: "TR-35", name: "İZMİR", plateCode: 35 },
    { id: "TR-36", name: "KARS", plateCode: 36 },
    { id: "TR-37", name: "KASTAMONU", plateCode: 37 },
    { id: "TR-38", name: "KAYSERİ", plateCode: 38 },
    { id: "TR-39", name: "KIRKLARELİ", plateCode: 39 },
    { id: "TR-40", name: "KIRŞEHİR", plateCode: 40 },
    { id: "TR-41", name: "KOCAELİ", plateCode: 41 },
    { id: "TR-42", name: "KONYA", plateCode: 42 },
    { id: "TR-43", name: "KÜTAHYA", plateCode: 43 },
    { id: "TR-44", name: "MALATYA", plateCode: 44 },
    { id: "TR-45", name: "MANİSA", plateCode: 45 },
    { id: "TR-46", name: "KAHRAMANMARAŞ", plateCode: 46 },
    { id: "TR-47", name: "MARDİN", plateCode: 47 },
    { id: "TR-48", name: "MUĞLA", plateCode: 48 },
    { id: "TR-49", name: "MUŞ", plateCode: 49 },
    { id: "TR-50", name: "NEVŞEHİR", plateCode: 50 },
    { id: "TR-51", name: "NİĞDE", plateCode: 51 },
    { id: "TR-52", name: "ORDU", plateCode: 52 },
    { id: "TR-53", name: "RİZE", plateCode: 53 },
    { id: "TR-54", name: "SAKARYA", plateCode: 54 },
    { id: "TR-55", name: "SAMSUN", plateCode: 55 },
    { id: "TR-56", name: "SİİRT", plateCode: 56 },
    { id: "TR-57", name: "SİNOP", plateCode: 57 },
    { id: "TR-58", name: "SİVAS", plateCode: 58 },
    { id: "TR-59", name: "TEKİRDAĞ", plateCode: 59 },
    { id: "TR-60", name: "TOKAT", plateCode: 60 },
    { id: "TR-61", name: "TRABZON", plateCode: 61 },
    { id: "TR-62", name: "TUNCELİ", plateCode: 62 },
    { id: "TR-63", name: "ŞANLIURFA", plateCode: 63 },
    { id: "TR-64", name: "UŞAK", plateCode: 64 },
    { id: "TR-65", name: "VAN", plateCode: 65 },
    { id: "TR-66", name: "YOZGAT", plateCode: 66 },
    { id: "TR-67", name: "ZONGULDAK", plateCode: 67 },
    { id: "TR-68", name: "AKSARAY", plateCode: 68 },
    { id: "TR-69", name: "BAYBURT", plateCode: 69 },
    { id: "TR-70", name: "KARAMAN", plateCode: 70 },
    { id: "TR-71", name: "KIRIKKALE", plateCode: 71 },
    { id: "TR-72", name: "BATMAN", plateCode: 72 },
    { id: "TR-73", name: "ŞIRNAK", plateCode: 73 },
    { id: "TR-74", name: "BARTIN", plateCode: 74 },
    { id: "TR-75", name: "ARDAHAN", plateCode: 75 },
    { id: "TR-76", name: "IĞDIR", plateCode: 76 },
    { id: "TR-77", name: "YALOVA", plateCode: 77 },
    { id: "TR-78", name: "KARABÜK", plateCode: 78 },
    { id: "TR-79", name: "KİLİS", plateCode: 79 },
    { id: "TR-80", name: "OSMANİYE", plateCode: 80 },
    { id: "TR-81", name: "DÜZCE", plateCode: 81 }
];

const INITIAL_REGIONS = [
    { id: "region-1", name: "1.BÖLGE" },
    { id: "region-2", name: "2.BÖLGE" },
    { id: "region-3", name: "3.BÖLGE" }
];

export async function POST(req: Request) {
    try {
        let cityAddedCount = 0;
        let regionAddedCount = 0;

        const url = new URL(req.url);
        const forceRefresh = url.searchParams.get("force") === "true"; // Careful, rewrites regions and drops refs

        const batchAmount = 50;

        // Cities Seed (Upsert logic to keep IDs & plateCodes)
        for (let i = 0; i < TURKEY_CITIES.length; i += batchAmount) {
            const batchObj = adminDb.batch();
            const chunk = TURKEY_CITIES.slice(i, i + batchAmount);

            for (const city of chunk) {
                const cityRef = adminDb.collection("cities").doc(city.id);
                const cityDoc = await cityRef.get();

                if (!cityDoc.exists || forceRefresh) {
                    batchObj.set(cityRef, {
                        name: city.name,
                        plateCode: city.plateCode,
                        assignedRegionId: cityDoc.exists ? cityDoc.data()?.assignedRegionId || null : null,
                        assignedRepUids: cityDoc.exists ? cityDoc.data()?.assignedRepUids || [] : [],
                        createdAt: cityDoc.exists ? cityDoc.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    cityAddedCount++;
                }
            }
            if (cityAddedCount > 0) {
                await batchObj.commit();
            }
        }

        // Regions Seed
        for (const region of INITIAL_REGIONS) {
            const regionRef = adminDb.collection("regions").doc(region.id);
            const regionDoc = await regionRef.get();
            if (!regionDoc.exists || forceRefresh) {
                await regionRef.set({
                    name: region.name,
                    cityIds: regionDoc.exists ? regionDoc.data()?.cityIds || [] : [],
                    createdAt: regionDoc.exists ? regionDoc.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                regionAddedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Seeded successfully: ${TURKEY_CITIES.length} cities (${cityAddedCount} newly updated) and ${INITIAL_REGIONS.length} regions (${regionAddedCount} newly updated).`
        });

    } catch (e: any) {
        console.error("SEED ERR", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
