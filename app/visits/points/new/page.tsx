"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addSalesPoint } from "@/lib/sheets";
import { TURKEY_DATA } from "@/lib/turkey_data";

export default function NewSalesPointPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);

    const [formData, setFormData] = useState({
        FirmaAdi: "",
        Sehir: "",
        ilce: "",
        Yetkili: "",
        FirmaStatu: "1.GRUP-BAYİ",
        Telefon: "",
        Adres: "",
        VergiDairesi: "",
        VergiNo: "",
        FirmaEmail: "",
    });

    const statuOptions = [
        "1.GRUP-BAYİ",
        "1.GRUP-MÜŞTERİ",
        "1.GRUP-PANO PARTNERLERİ",
        "2.GRUP-ALT BAYİ",
        "2.GRUP-MÜHENDİSLİK FİRMASI",
        "2.GRUP-POTANSİYEL BAYİ",
        "2.GRUP-POTANSİYEL MÜŞTERİ",
        "2.GRUP-POTANSİYEL PANO PARTNER",
        "2.GRUP-TAAHHÜT FİRMASI",
        "3.GRUP- KAMU KURUMU",
        "3.GRUP-DİĞER SON KULLANICI",
        "3.GRUP-FABRİKA"
    ];

    const cityOptions = [
        "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
        "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
        "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
        "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
        "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
        "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
        "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
        "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
    ].sort((a, b) => a.localeCompare(b, "tr"));

    useEffect(() => {
        const raw = localStorage.getItem("tibcon_session");
        if (raw) setSession(JSON.parse(raw));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { FirmaAdi, Sehir, ilce, Yetkili, Telefon, FirmaEmail } = formData;
        if (!FirmaAdi || !Sehir || !ilce || !Yetkili || !Telefon || !FirmaEmail) {
            alert("Lütfen tüm zorunlu alanları doldurun: Firma Adı, Şehir, İlçe, Yetkili Kişi, Telefon ve Mail adresi.");
            return;
        }

        setLoading(true);
        try {
            const res = await addSalesPoint({
                ...formData,
                "İl": formData.Sehir,
                SatisPersoneliEmail: session?.email || "",
                SatisPersoneliName: session?.fullName || "",
                Bolge: session?.region || ""
            });
            if (res?.ok) {
                alert("Satış noktası başarıyla eklendi.");
                router.push("/");
            } else {
                alert("Hata: " + (res?.message || "Bilinmeyen bir hata oluştu"));
            }
        } catch (error) {
            console.error(error);
            alert("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div style={{ marginBottom: "2rem" }}>
                <button onClick={() => router.back()} className="tibcon-btn tibcon-btn-outline" style={{ marginBottom: "1rem" }}>
                    ← Geri Dön
                </button>
                <h1 className="title-xl outfit">Satış Noktası <span style={{ color: "var(--tibcon-red)" }}>Ekle</span></h1>
                <p className="text-muted">Yeni bir firma veya satış noktası bilgilerini kaydedin.</p>
            </div>

            <div className="premium-card" style={{ maxWidth: "600px" }}>
                <form onSubmit={handleSubmit} style={formStyle}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Firma Adı *</label>
                        <input
                            type="text"
                            className="premium-input"
                            value={formData.FirmaAdi}
                            onChange={(e) => setFormData({ ...formData, FirmaAdi: e.target.value })}
                            placeholder="Örn: Tibcon Enerji"
                            required
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Şehir *</label>
                            <select
                                className="premium-input"
                                value={formData.Sehir}
                                onChange={(e) => setFormData({ ...formData, Sehir: e.target.value })}
                                required
                            >
                                <option value="">Şehir Seçin</option>
                                {cityOptions.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>İlçe *</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.ilce}
                                onChange={(e) => setFormData({ ...formData, ilce: e.target.value })}
                                placeholder="Örn: Ümraniye"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Telefon *</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.Telefon}
                                onChange={(e) => setFormData({ ...formData, Telefon: e.target.value })}
                                placeholder="0(xxx) xxx xx xx"
                                required
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Mail Adresi *</label>
                            <input
                                type="email"
                                className="premium-input"
                                value={formData.FirmaEmail}
                                onChange={(e) => setFormData({ ...formData, FirmaEmail: e.target.value })}
                                placeholder="Örn: info@firma.com"
                                required
                            />
                        </div>
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Yetkili Kişi *</label>
                        <input
                            type="text"
                            className="premium-input"
                            value={formData.Yetkili}
                            onChange={(e) => setFormData({ ...formData, Yetkili: e.target.value })}
                            placeholder="Ad Soyad"
                            required
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Adres</label>
                        <textarea
                            className="premium-input"
                            rows={2}
                            value={formData.Adres}
                            onChange={(e) => setFormData({ ...formData, Adres: e.target.value })}
                            placeholder="Tam adres bilgisi..."
                            style={{ resize: "vertical" }}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Vergi Dairesi</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.VergiDairesi}
                                onChange={(e) => setFormData({ ...formData, VergiDairesi: e.target.value })}
                                placeholder="Daire adı"
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Vergi No</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.VergiNo}
                                onChange={(e) => setFormData({ ...formData, VergiNo: e.target.value })}
                                placeholder="10 haneli numara"
                            />
                        </div>
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Firma Statüsü</label>
                        <select
                            className="premium-input"
                            value={formData.FirmaStatu}
                            onChange={(e) => setFormData({ ...formData, FirmaStatu: e.target.value })}
                        >
                            {statuOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="tibcon-btn tibcon-btn-primary"
                        style={{ width: "100%", marginTop: "1rem" }}
                        disabled={loading}
                    >
                        {loading ? "Kaydediliyor..." : "Satış Noktasını Kaydet"}
                    </button>
                </form>
            </div>

            <style jsx>{`
        .premium-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border: 1px solid var(--tibcon-border);
          font-family: inherit;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        .premium-input:focus {
          outline: none;
          border-color: var(--tibcon-red);
        }
      `}</style>
        </div>
    );
}

const formStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
};

const inputGroupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--tibcon-anth)",
};
