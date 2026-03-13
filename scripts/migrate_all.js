const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// .env.local'dan basitçe değerleri okuyalım (dotenv bağımlılığı olmadan)
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
});

// API URL
const API_BASE_URL = env.NEXT_PUBLIC_API_URL || "https://app.tibcon.com.tr";

// Firebase Admin Başlat
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.FB_PROJECT_ID,
            clientEmail: env.FB_CLIENT_EMAIL,
            privateKey: env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
    });
}

const firestore = admin.firestore();

async function migrate() {
    console.log("Migration başlatıldı...");

    try {
        // 1. KULLANICILAR
        console.log("Kullanıcılar çekiliyor...");
        const usersSnap = await firestore.collection('users').get();
        const users = usersSnap.docs.map(doc => ({
            Email: doc.data().email,
            DisplayName: doc.data().displayName || doc.data().name,
            Role: (doc.data().role || 'sales').toUpperCase(),
            IsActive: doc.data().active !== false
        }));
        
        await fetch(`${API_BASE_URL}/api/migration/users`, {
            method: 'POST',
            body: JSON.stringify(users),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`${users.length} kullanıcı aktarıldı.`);

        // 2. MÜŞTERİLER
        console.log("Müşteriler çekiliyor...");
        const spSnap = await firestore.collection('salesPoints').get();
        const companies = spSnap.docs.map(doc => ({
            Name: doc.data().name,
            CityName: doc.data().cityName || doc.data().city || "",
            District: doc.data().district || "",
            Address: doc.data().address || "",
            Phone: doc.data().phone || "",
            Email: doc.data().email || "",
            GroupName: doc.data().groupName || ""
        }));
        
        await fetch(`${API_BASE_URL}/api/migration/companies`, {
            method: 'POST',
            body: JSON.stringify(companies),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`${companies.length} müşteri aktarıldı.`);

        // 3. TEKLİFLER
        console.log("Teklifler çekiliyor...");
        const quotesSnap = await firestore.collection('quotes').get();
        const offers = quotesSnap.docs.map(doc => {
            const data = doc.data();
            return {
                Id: doc.id,
                QuoteNo: data.quoteNo || "",
                TotalAmount: data.totalAmount || 0,
                Currency: data.currency || 'TRY',
                Status: data.status || 'DRAFT',
                CreatedAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                CompanyId: 0,
                UserId: 0
            };
        });
        
        await fetch(`${API_BASE_URL}/api/migration/offers`, {
            method: 'POST',
            body: JSON.stringify(offers),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`${offers.length} teklif aktarıldı.`);

        console.log("Migration TAMAMLANDI.");
        
    } catch (error) {
        console.error("HATA:", error.message);
    }
}

migrate();
