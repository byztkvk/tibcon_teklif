import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FB_PROJECT_ID,
            clientEmail: process.env.FB_CLIENT_EMAIL,
            privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
    });
}

const db = getFirestore();

async function test() {
    try {
        console.log("Testing with default database...");
        const collections = await db.listCollections();
        console.log("Collections:", collections.map(c => c.id));
    } catch (e) {
        console.error("Test failed:", e.message);
    }
}

test();
