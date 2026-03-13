"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addVisit, updateVisitPlanStatus } from "@/lib/sheets";
import LoadingOverlay from "@/components/LoadingOverlay";

// Helper component to handle search params
function VisitFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Params
    const planIdParam = searchParams.get("planId");
    const firmaParam = searchParams.get("firma");
    const tarihParam = searchParams.get("tarih");

    const [loading, setLoading] = useState(false);
    const [loadingPoints, setLoadingPoints] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [salesPoints, setSalesPoints] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [manualYetkili, setManualYetkili] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        Yil: new Date().getFullYear().toString(),
        Ay: (new Date().getMonth() + 1).toString(),
        ZiyaretTarih: new Date().toISOString().split('T')[0],
        Bolge: "",
        SatisPersoneli: "",
        FirmaAdi: "",
        Il: "",
        Ilce: "",
        FirmaStatu: "",
        YetkiliKisi: "",
        ZiyaretNot: "",
        Telefon: "",
        Adres: "",
        VergiDairesi: "",
        VergiNo: "",
        FirmaEmail: "",
    });

    useEffect(() => {
        const raw = localStorage.getItem("tibcon_session");
        if (raw) {
            const s = JSON.parse(raw);
            setSession(s);
            setFormData(prev => ({
                ...prev,
                Bolge: s.region || "",
                SatisPersoneli: s.fullName || ""
            }));
        }

        // Apply URL params if present
        if (firmaParam) {
            setSearchTerm(firmaParam);
            setFormData(prev => ({ ...prev, FirmaAdi: firmaParam }));
        }
        if (tarihParam) {
            const d = new Date(tarihParam);
            setFormData(prev => ({
                ...prev,
                ZiyaretTarih: tarihParam,
                Yil: d.getFullYear().toString(),
                Ay: (d.getMonth() + 1).toString()
            }));
        }

        // Fetch sales points for lookup
        const fetchPoints = async () => {
            setLoadingMessage("Müşteri listesi hazırlanıyor...");
            try {
                const sRaw = localStorage.getItem("tibcon_session");
                if (!sRaw) return;
                const s = JSON.parse(sRaw);

                // Filter for Sales Points / Region Managers via API
                let cityIds = "";
                let regionIdsArr = "";

                const userRes = await fetch("/api/users").then(r => r.json());
                const me = userRes.data?.find((u: any) => u.email === s.email);

                if (me) {
                    if (me.cityIds) cityIds = me.cityIds.join(",");
                    if (me.regionIds) regionIdsArr = JSON.stringify(me.regionIds);
                }

                const pointsUrl = `/api/salesPoints?role=${s.role}&regionId=${s.region || ""}&regionIds=${regionIdsArr}&cityIds=${cityIds}&ownerEmail=${s.email}`;
                const res = await fetch(pointsUrl).then(r => r.json());

                if (res?.success && res.data) {
                    const allPoints = res.data;
                    setSalesPoints(allPoints);

                    // If we have a firmaParam, try to auto-select the point to fill other fields
                    if (firmaParam) {
                        const match = allPoints.find((p: any) =>
                            (p.name || p.FirmaAdi || "").toLowerCase() === firmaParam.toLowerCase()
                        );
                        if (match) {
                            handleSelectPoint(match); // Auto-fill details
                        }
                    }
                }
            } catch (error) {
                console.error("Sales points fetch error:", error);
            } finally {
                setLoadingPoints(false);
                setLoadingMessage(null);
            }
        };
        fetchPoints();
    }, [firmaParam, tarihParam]); // Re-run if params change (unlikely but safe)

    // Data Adapter (Backend Verified)
    const adaptPoint = (rawP: any) => {
        if (!rawP) return {};

        return {
            ...rawP,
            FirmaAdi: rawP.name || rawP.FirmaAdi,
            Sehir: rawP.cityName || rawP.Sehir,
            ilce: rawP.district || rawP.ilce || rawP.District,
            Yetkili: rawP.authorizedPerson || rawP.Yetkili,
            FirmaStatu: rawP.FirmaStatu || "Müşteri",
            FirmaEmail: rawP.email || rawP.YetkiliEmail || rawP.FirmaEmail,
            Telefon: rawP.phone || rawP.Telefon,
            Adres: rawP.address || rawP.Adres,
            SatisPersoneli: rawP.SatisPersoneli,
            VergiDairesi: rawP.taxOffice || rawP.VergiDairesi,
            VergiNo: rawP.taxNumber || rawP.VergiNo,
            id: rawP.id
        };
    };

    const filteredPoints = useMemo(() => {
        // Hierarchy filtering
        let results = salesPoints.map(adaptPoint); // Apply adapter
        const role = session?.role;
        const email = session?.email ? (session.email as string).toLowerCase().trim() : "";

        if (searchTerm.length < 3) return [];

        const normalize = (s: string) => {
            if (!s) return "";
            const map: any = { 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c', 'İ': 'i' };
            return s.toLowerCase().trim().replace(/[ğüşıöçİ]/g, char => map[char] || char);
        };

        const term = normalize(searchTerm);

        const filtered = results.filter(p => {
            const name = normalize(p.FirmaAdi || "");
            const sehir = normalize(p.Sehir || "");
            const ilce = normalize(p.ilce || "");

            // Role filtering - relaxed to allow finding any existing customer
            // but we can still prioritize or indicate if it's their customer
            const allValues = [
                p.FirmaAdi,
                p.Sehir,
                p.ilce,
                p.Yetkili,
                p.FirmaEmail,
                p.Telefon,
                p.FirmaStatu,
                p.SatisPersoneli
            ].map(v => normalize(String(v || ""))).join(" ");

            return allValues.includes(term);
        }).slice(0, 50);

        return filtered;
    }, [searchTerm, salesPoints, session]);

    const getVal = (obj: any, keys: string[]) => {
        if (!obj) return "";
        // Try exact matches first
        for (const k of keys) {
            if (k in obj && obj[k] !== null && obj[k] !== undefined) return String(obj[k]).trim();
        }
        // Try normalized key matching
        const normalizeKey = (s: string) => s.toLowerCase().trim()
            .replace(/İ/g, "i").replace(/ı/g, "i")
            .replace(/ğ/g, "g").replace(/ü/g, "u")
            .replace(/ş/g, "s").replace(/ö/g, "o")
            .replace(/ç/g, "c");

        const objKeys = Object.keys(obj);
        for (const targetKey of keys) {
            const normTarget = normalizeKey(targetKey);
            const foundKey = objKeys.find(ok => normalizeKey(ok) === normTarget);
            if (foundKey && obj[foundKey] !== null && obj[foundKey] !== undefined) return String(obj[foundKey]).trim();
        }
        return "";
    };

    const handleSelectPoint = (point: any) => {
        const p = adaptPoint(point); // Apply adapter
        setFormData(prev => ({
            ...prev,
            FirmaAdi: getVal(p, ["FirmaAdi", "Firma Adı", "Firma", "name", "Name"]),
            Il: getVal(p, ["Sehir", "Şehir", "İl", "Il", "City"]),
            Ilce: getVal(p, ["ilce", "İlçe", "District"]),
            FirmaStatu: getVal(p, ["FirmaStatu", "Firma Statüsü", "Statü", "Status"]),
            YetkiliKisi: getVal(p, ["Yetkili", "Yetkili Kişi", "Contact"]),
            Telefon: getVal(p, ["İletisim", "Telefon", "Telefon No", "Tel", "Phone", "GSM", "Cep", "GsmNo", "CepTel", "Mobile"]),
            Adres: getVal(p, ["Adres", "Address"]),
            VergiDairesi: getVal(p, ["VergiDairesi", "Vergi Dairesi", "TaxOffice"]),
            VergiNo: getVal(p, ["VergiNo", "Vergi No", "TaxNo"]),
            FirmaEmail: getVal(p, ["FirmaEmail", "Email", "Mail Adresi", "Mail", "E-posta", "Eposta"]),
            SatisPersoneli: getVal(p, ["SatisPersoneli", "Satış Personeli", "Personel"]),
        }));
        setSearchTerm(getVal(p, ["FirmaAdi", "Firma Adı", "Firma", "name", "Name"]));
        setShowDropdown(false);
        setManualYetkili(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.FirmaAdi || !formData.ZiyaretTarih || !formData.ZiyaretNot) {
            alert("Lütfen zorunlu alanları (Firma, Tarih, Not) doldurun.");
            return;
        }

        setLoading(true);
        setLoadingMessage("Ziyaret kaydı kaydediliyor...");
        try {
            // Find the selected point to get cityId/regionId
            const selectedPoint = salesPoints.find(p => (p.name || p.FirmaAdi) === formData.FirmaAdi);
            const adapted = adaptPoint(selectedPoint);

            const res = await addVisit({
                cariId: adapted.id || "",
                cariUnvan: formData.FirmaAdi,
                ziyaretTarihi: formData.ZiyaretTarih,
                personelAdi: session?.fullName || session?.name || "Bilinmeyen Personel",
                sehir: formData.Il,
                ilce: formData.Ilce,
                ziyaretNotu: formData.ZiyaretNot,
                yetkiliKisi: formData.YetkiliKisi,
                telefon: formData.Telefon,
                regionId: adapted.regionId || "",
                cityId: adapted.cityId || "",
                ziyaretTipi: "Ziyaret",
                planId: planIdParam || ""
            });
            if (res?.ok) {
                // If this visits came from a plan, mark plan as completed
                if (planIdParam) {
                    try {
                        try {
                            console.log("Marking plan as completed:", planIdParam);
                            await updateVisitPlanStatus({ id: planIdParam, status: "COMPLETED" });
                        } catch (e) {
                            console.error("Failed to update plan status", e);
                        }
                    } catch (e) {
                        console.error("Failed to update plan status", e);
                    }
                }

                alert("Ziyaret kaydı başarıyla oluşturuldu.");
                router.push("/");
            } else {
                alert("Hata: " + (res?.message || "Bilinmeyen bir hata oluştu"));
            }
        } catch (error) {
            console.error(error);
            alert("Bir hata oluştu.");
        } finally {
            setLoading(false);
            setLoadingMessage(null);
        }
    };

    return (
        <div className="page-container">
            <div style={{ marginBottom: "2rem" }}>
                <button onClick={() => router.back()} className="tibcon-btn tibcon-btn-outline" style={{ marginBottom: "1rem" }}>
                    ← Geri Dön
                </button>
                <h1 className="title-xl outfit">Ziyaret <span style={{ color: "var(--tibcon-red)" }}>Girişi</span></h1>
                <p className="text-muted">Gerçekleştirilen bir ziyarete dair detayları girin.</p>
            </div>

            <div className="premium-card" style={{ maxWidth: "800px" }}>
                <form onSubmit={handleSubmit} style={formStyle}>

                    <div style={sectionGridStyle}>
                        <div style={{ ...inputGroupStyle, position: "relative" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <label style={labelStyle}>Firma Adı *</label>
                                {salesPoints.length > 0 && <span style={{ fontSize: "0.7rem", color: "#888" }}>{salesPoints.length} kayıt yüklendi</span>}
                            </div>
                            <input
                                type="text"
                                className="premium-input"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(true);
                                    if (!e.target.value) {
                                        setFormData(prev => ({ ...prev, FirmaAdi: "" }));
                                    }
                                }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Firma ara..."
                                autoComplete="off"
                            />
                            {showDropdown && filteredPoints.length > 0 && (
                                <div style={dropdownStyle}>
                                    {filteredPoints.map((p, idx) => (
                                        <div
                                            key={idx}
                                            style={dropdownItemStyle}
                                            onClick={() => handleSelectPoint(p)}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f9fa")}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                                        >
                                            <div style={{ fontWeight: 600 }}>{p.FirmaAdi || "-"}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                                                {p.Sehir || "-"} / {p.ilce || "-"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {showDropdown && searchTerm.length >= 3 && filteredPoints.length === 0 && (
                                <div style={dropdownStyle}>
                                    <div style={{ padding: "1rem", fontSize: "0.9rem", color: "#6c757d" }}>
                                        Sonuç bulunamadı. <br />
                                        <a href="/visits/points/new" style={{ color: "var(--tibcon-red)", textDecoration: "underline" }}>
                                            Yeni Satış Noktası Ekle
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Ziyaret Tarihi *</label>
                            <input
                                type="date"
                                className="premium-input"
                                value={formData.ZiyaretTarih}
                                onChange={(e) => {
                                    const date = new Date(e.target.value);
                                    setFormData({
                                        ...formData,
                                        ZiyaretTarih: e.target.value,
                                        Yil: date.getFullYear().toString(),
                                        Ay: (date.getMonth() + 1).toString()
                                    });
                                }}
                                required
                            />
                        </div>
                    </div>

                    <div style={sectionGridStyle}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Şehir</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.Il}
                                onChange={(e) => setFormData({ ...formData, Il: e.target.value })}
                                readOnly={!manualYetkili}
                                style={!manualYetkili ? { background: "#f8f9fa", cursor: "not-allowed" } : {}}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>İlçe</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.Ilce}
                                onChange={(e) => setFormData({ ...formData, Ilce: e.target.value })}
                                readOnly={!manualYetkili}
                                style={!manualYetkili ? { background: "#f8f9fa", cursor: "not-allowed" } : {}}
                            />
                        </div>
                    </div>

                    <div style={sectionGridStyle}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Yetkili Kişi</label>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <input
                                    type="text"
                                    className="premium-input"
                                    value={formData.YetkiliKisi}
                                    onChange={(e) => setFormData({ ...formData, YetkiliKisi: e.target.value })}
                                    placeholder="Seçilen firmadan otomatik gelir"
                                    readOnly={!manualYetkili}
                                    style={!manualYetkili ? { background: "#f8f9fa" } : {}}
                                />
                                <button
                                    type="button"
                                    className="tibcon-btn tibcon-btn-outline"
                                    style={{ padding: "0 0.5rem", fontSize: "0.75rem" }}
                                    onClick={() => setManualYetkili(!manualYetkili)}
                                >
                                    {manualYetkili ? "Kapat" : "Manuel"}
                                </button>
                            </div>
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Firma Statü</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.FirmaStatu}
                                onChange={(e) => setFormData({ ...formData, FirmaStatu: e.target.value })}
                                readOnly={!manualYetkili}
                                style={!manualYetkili ? { background: "#f8f9fa" } : {}}
                            />
                        </div>
                    </div>

                    <div style={sectionGridStyle}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Telefon</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.Telefon}
                                onChange={(e) => setFormData({ ...formData, Telefon: e.target.value })}
                                readOnly={!manualYetkili}
                                style={!manualYetkili ? { background: "#f8f9fa" } : {}}
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Mail Adresi</label>
                            <input
                                type="email"
                                className="premium-input"
                                value={formData.FirmaEmail}
                                onChange={(e) => setFormData({ ...formData, FirmaEmail: e.target.value })}
                                readOnly={!manualYetkili}
                                style={!manualYetkili ? { background: "#f8f9fa" } : {}}
                            />
                        </div>
                    </div>

                    {/* Vergi Bilgisi Removed as per user request */}

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Adres</label>
                        <textarea
                            className="premium-input"
                            rows={2}
                            value={formData.Adres}
                            onChange={(e) => setFormData({ ...formData, Adres: e.target.value })}
                            readOnly={!manualYetkili}
                            style={!manualYetkili ? { background: "#f8f9fa", resize: "none" } : { resize: "none" }}
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Ziyaret Notu *</label>
                        <textarea
                            className="premium-input"
                            rows={4}
                            value={formData.ZiyaretNot}
                            onChange={(e) => setFormData({ ...formData, ZiyaretNot: e.target.value })}
                            placeholder="Görüşme detaylarını buraya yazın..."
                            required
                            style={{ resize: "vertical" }}
                        />
                    </div>

                    <div style={infoGridStyle}>
                        <div style={infoBoxStyle}>
                            <span style={infoLabelStyle}>Personel:</span>
                            <span>{formData.SatisPersoneli}</span>
                        </div>
                        <div style={infoBoxStyle}>
                            <span style={infoLabelStyle}>Bölge:</span>
                            <span>{formData.Bolge}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="tibcon-btn tibcon-btn-primary"
                        style={{ width: "100%", marginTop: "1rem" }}
                        disabled={loading || !formData.FirmaAdi}
                    >
                        {loading ? "Kaydediliyor..." : "Ziyaret Kaydını Tamamla"}
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
            <LoadingOverlay message={loadingMessage} />
        </div>
    );
}

export default function NewVisitPage() {
    return (
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <VisitFormContent />
        </Suspense>
    );
}

const formStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
};

const sectionGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
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

const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "white",
    border: "1px solid var(--tibcon-border)",
    borderRadius: "12px",
    boxShadow: "var(--shadow-lg)",
    zIndex: 100,
    marginTop: "4px",
    overflow: "hidden",
};

const dropdownItemStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    cursor: "pointer",
    transition: "background 0.2s",
    borderBottom: "1px solid #f1f3f5",
};

const infoGridStyle: React.CSSProperties = {
    display: "flex",
    gap: "2rem",
    padding: "1rem",
    background: "#f8f9fa",
    borderRadius: "12px",
    border: "1px solid var(--tibcon-border)",
};

const infoBoxStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    display: "flex",
    gap: "0.5rem",
};

const infoLabelStyle: React.CSSProperties = {
    fontWeight: 700,
    color: "#6c757d",
};
