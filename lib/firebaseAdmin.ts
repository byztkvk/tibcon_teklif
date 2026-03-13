// import * as admin from 'firebase-admin';
// import { getFirestore } from 'firebase-admin/firestore';

// // Stub to prevent crash since we are migrating to SQL Server
// if (!admin.apps.length) {
//     try {
//         admin.initializeApp({
//             credential: admin.credential.cert({
//                 projectId: process.env.FB_PROJECT_ID,
//                 clientEmail: process.env.FB_CLIENT_EMAIL,
//                 privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n')
//             }),
//         });
//     } catch (error: any) {}
// }

// export const adminDb = getFirestore(admin.app(), "tibcon");

// REAL STUB
export const adminDb: any = {
    collection: () => ({
        doc: () => ({
            get: async () => ({ exists: false, data: () => ({}) }),
            set: async () => ({}),
            update: async () => ({}),
            delete: async () => ({}),
            collection: () => ({ get: async () => ({ docs: [] }) })
        }),
        get: async () => ({ docs: [] }),
        where: function() { return this; },
        orderBy: function() { return this; },
        limit: function() { return this; },
        add: async () => ({ id: "stub" })
    }),
    batch: () => ({
        set: () => ({}),
        update: () => ({}),
        delete: () => ({}),
        commit: async () => ({})
    })
};
