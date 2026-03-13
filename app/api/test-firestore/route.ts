import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from 'firebase-admin';

/**
 * GET /api/test-firestore
 * Temporary endpoint to test server-side initialized Firestore Administrator connection.
 */
export async function GET() {
    try {
        const debug = {
            projectId: process.env.FB_PROJECT_ID,
            clientEmail: process.env.FB_CLIENT_EMAIL
        };

        const testCollection = adminDb.collection("test");

        // a) Add a document using Admin SDK
        await testCollection.add({
            message: "ok",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // b) Read all documents
        const snapshot = await testCollection.get();
        const count = snapshot.size;

        // c) Return JSON
        return NextResponse.json({ success: true, count, debug });
    } catch (error: any) {
        console.error("[test-firestore] Error:", error);

        const debug = {
            projectId: process.env.FB_PROJECT_ID,
            clientEmail: process.env.FB_CLIENT_EMAIL
        };

        return NextResponse.json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.details,
            debug
        }, { status: 500 });
    }
}
