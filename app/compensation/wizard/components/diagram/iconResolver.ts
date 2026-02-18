/**
 * iconResolver.ts
 * Blok tipi → /products/ görsel yolu eşleştirmesi.
 * Kullanıcı public/products'a yeni dosya koyduğunda burası güncellenir.
 *
 * Mevcut public/products/ dosyaları:
 *   NH SİGORTA.png
 *   KONTAKTÖR.png
 *   TRİSTÖRLÜ ANAHTARLAMA MODULÜ.jpg
 *   ŞÖNT REAKTÖR.png
 *   HARMONİK FİLTRE.png          ← harmonik filtre reaktörü (hasHF=true bloğu)
 *   YÜK SÜRÜCÜ - SVC.png
 *   OG AKIM TRAFOSU.png
 *   REAKTİF GÜÇ KONTROL RÖLESİ.png
 *   DEŞARJ DİRENCİ - 02.png
 *   ENERJİ ANALİZÖRLERİ.jpg
 *
 * NOT: Kondansatör görseli henüz eklenmedi.
 * Eklemek için: public/products/KONDANSATÖR.png koyun ve
 * aşağıdaki kondansator satırını güncelleyin.
 */

export type BlockType =
    | "nh_sigorta"
    | "kontaktor"
    | "tristor"
    | "reaktor"          // Şönt reaktör (normal kademe reaktörü)
    | "harmonik_filtre"  // Harmonik filtre reaktörü (hasHF=true olduğunda)
    | "kondansator"      // Kondansatör (görseli eklenince güncelle)
    | "svc"
    | "ct"
    | "relay"
    | "desarj_direnci"
    | "placeholder";

/**
 * PRODUCT_ICONS — tek düzenlenecek yer.
 * Değer: /products/... yolu (public/ altı, başında / ile)
 *
 * Kondansatör görseli eklendiğinde:
 *   kondansator: "/products/KONDANSATÖR.png"
 * şeklinde güncelleyin.
 */
export const PRODUCT_ICONS: Record<BlockType, string> = {
    nh_sigorta: "/products/NH SİGORTA.png",
    kontaktor: "/products/KONTAKTÖR.png",
    tristor: "/products/TRİSTÖRLÜ ANAHTARLAMA MODULÜ.jpg",
    reaktor: "/products/ŞÖNT REAKTÖR.png",
    harmonik_filtre: "/products/HARMONİK FİLTRE.png",   // ✅ Doğru eşleşme
    kondansator: "/products/KONDANSATÖR.png",           // ✅ Doğru eşleşme
    svc: "/products/YÜK SÜRÜCÜ - SVC.png",
    ct: "/products/OG AKIM TRAFOSU.png",
    relay: "/products/REAKTİF GÜÇ KONTROL RÖLESİ.png",
    desarj_direnci: "/products/DEŞARJ DİRENCİ - 02.png",
    placeholder: "/products/ENERJİ ANALİZÖRLERİ.jpg",
};

/**
 * Türkçe karakter normalize (dosya adı eşleştirme için)
 */
function normalize(s: string): string {
    return s
        .toLowerCase()
        .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u")
        .replace(/ö/g, "o").replace(/ı/g, "i").replace(/ç/g, "c")
        .replace(/İ/g, "i").replace(/Ş/g, "s").replace(/Ğ/g, "g")
        .replace(/Ü/g, "u").replace(/Ö/g, "o").replace(/Ç/g, "c")
        .replace(/[^a-z0-9]/g, "");
}

/**
 * resolveIcon — blockType'a göre görsel yolu döner.
 */
export function resolveIcon(blockType: BlockType): string {
    return PRODUCT_ICONS[blockType] ?? PRODUCT_ICONS.placeholder;
}

/**
 * guessBlockType — ürün kodu string'inden kontaktör/tristör tahmin eder.
 */
export function guessBlockType(productCode: string | undefined): "kontaktor" | "tristor" {
    if (!productCode) return "kontaktor";
    const n = normalize(productCode);
    if (n.includes("scr") || n.includes("tristor") || n.includes("thyristor") || n.includes("triac")) {
        return "tristor";
    }
    return "kontaktor";
}
