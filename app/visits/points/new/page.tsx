"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewSalesPointPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);

    const [cities, setCities] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);

    const [formData, setFormData] = useState({
        FirmaAdi: "",
        SehirId: "",
        ilce: "",
        Yetkili: "",
        Telefon: "",
        Adres: "",
        FirmaEmail: "",
        GrupId: "",
    });

    useEffect(() => {
        const raw = localStorage.getItem("tibcon_session");
        if (raw) {
            const parsed = JSON.parse(raw);
            setSession(parsed);

            // Fetch users to get my profile for cityIds if I am a sales rep
            fetch("/api/users")
                .then(res => res.json())
                .then(data => {
                    const me = data.data?.find((u: any) =>
                        u.email === parsed.email || u.uid === parsed.uid || u.id === parsed.id
                    );
                    setUserProfile(me);
                }).catch(console.error);
        }

        fetch("/api/cities")
            .then(res => res.json())
            .then(data => setCities(data.data || []))
            .catch(console.error);

        fetch("/api/salesPointGroups")
            .then(res => res.json())
            .then(data => setGroups(data.data || []))
            .catch(console.error);
    }, []);

    const getFilteredCities = () => {
        if (!session) return [];
        if (session.role === "admin") return cities;

        if (session.role === "region_manager") {
            const myRegionIds = session.regionIds || [];
            return cities.filter(c => myRegionIds.includes(c.assignedRegionId));
        }

        if (session.role === "sales_rep" && userProfile) {
            const myCityIds = userProfile.cityIds || [];
            return cities.filter(c => myCityIds.includes(c.id));
        }

        return [];
    };

    const displayCities = getFilteredCities();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { FirmaAdi, SehirId, ilce, Yetkili, Telefon, FirmaEmail, GrupId, Adres } = formData;

        if (!FirmaAdi || !SehirId || !GrupId) {
            alert("Lütfen Firma Adı, Şehir ve Satış Noktası Grubu alanlarını doldurun.");
            return;
        }

        const selectedCity = cities.find(c => c.id === SehirId);
        const selectedGroup = groups.find(g => g.id === GrupId);

        setLoading(true);
        try {
            const payload = {
                name: FirmaAdi.trim(),
                cityId: selectedCity.id,
                cityName: selectedCity.name,
                district: ilce.trim(),
                groupId: selectedGroup.id,
                groupName: selectedGroup.name,
                regionId: selectedCity.assignedRegionId || "",
                address: Adres.trim(),
                phone: Telefon.trim(),
                email: FirmaEmail.trim(),
                authorizedPerson: Yetkili.trim(),
            };

            const res = await fetch("/api/salesPoints", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                alert("Satış noktası başarıyla eklendi.");
                router.push("/visits/points");
            } else {
                alert("Hata: " + (data.error || "Bilinmeyen bir hata oluştu"));
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
                            <label style={labelStyle}>Şehir / Ülke *</label>
                            <select
                                className="premium-input"
                                value={formData.SehirId}
                                onChange={(e) => setFormData({ ...formData, SehirId: e.target.value })}
                                required
                            >
                                <option value="">Seçim Yapın</option>
                                {displayCities.map(city => (
                                    <option key={city.id} value={city.id}>{city.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>İlçe</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.ilce}
                                onChange={(e) => setFormData({ ...formData, ilce: e.target.value })}
                                placeholder="Örn: Ümraniye"
                            />
                        </div>
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Satış Noktası Grubu *</label>
                        <select
                            className="premium-input"
                            value={formData.GrupId}
                            onChange={(e) => setFormData({ ...formData, GrupId: e.target.value })}
                            required
                        >
                            <option value="">Grup Seçin</option>
                            {groups.map(grp => (
                                <option key={grp.id} value={grp.id}>{grp.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Telefon</label>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.Telefon}
                                onChange={(e) => setFormData({ ...formData, Telefon: e.target.value })}
                                placeholder="0(xxx) xxx xx xx"
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Mail Adresi</label>
                            <input
                                type="email"
                                className="premium-input"
                                value={formData.FirmaEmail}
                                onChange={(e) => setFormData({ ...formData, FirmaEmail: e.target.value })}
                                placeholder="Örn: info@firma.com"
                            />
                        </div>
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Yetkili Kişi</label>
                        <input
                            type="text"
                            className="premium-input"
                            value={formData.Yetkili}
                            onChange={(e) => setFormData({ ...formData, Yetkili: e.target.value })}
                            placeholder="Ad Soyad"
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

                    <button
                        type="submit"
                        className="tibcon-btn tibcon-btn-primary"
                        style={{ width: "100%", marginTop: "1rem" }}
                        disabled={loading || (session?.role !== "admin" && displayCities.length === 0)}
                    >
                        {loading ? "Kaydediliyor..." : "Satış Noktasını Kaydet"}
                    </button>

                    {session?.role !== "admin" && displayCities.length === 0 && (
                        <p style={{ color: "var(--tibcon-red)", fontSize: "0.85rem", textAlign: "center", marginTop: "10px" }}>
                            Şuan size atanmış herhangi bir şehir bulunmuyor. Bu nedenle satış noktası ekleyemezsiniz.
                        </p>
                    )}
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
