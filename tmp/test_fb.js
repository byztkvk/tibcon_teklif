const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        let key = parts[0].trim();
        let val = parts.slice(1).join('=').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
        env[key] = val;
    }
});

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.FB_PROJECT_ID,
            clientEmail: env.FB_CLIENT_EMAIL,
            privateKey: (env.FB_PRIVATE_KEY || '').replace(/\\n/g, '\n')
        }),
    });
}

async function testWith(dbId) {
    try {
        console.log(`Testing with database: ${dbId || '(default)'}...`);
        const db = dbId ? getFirestore(admin.app(), dbId) : getFirestore();
        const collections = await db.listCollections();
        console.log(`Success! Collections:`, collections.map(c => c.id));
        return true;
    } catch (e) {
        console.error(`Failed with ${dbId || '(default)'}:`, e.message);
        return false;
    }
}

async function run() {
    await testWith();
    await testWith('tibcon');
    await testWith('tibcon-teklif');
}

run();
