"use client";

import React, { useEffect, useState } from "react";

export default function AdminRegionsPage() {
    const [regions, setRegions] = useState<any[]>([]);
    const [allCities, setAllCities] = useState<any[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formName, setFormName] = useState("");
    const [formCities, setFormCities] = useState<string[]>([]);
    const [formId, setFormId] = useState(""); // if editing
    const [formIsAbroad, setFormIsAbroad] = useState(false);

    const fetchAll = async () => {
        try {
            const [rRes, cRes] = await Promise.all([
                fetch("/api/regions").then(r => r.json()),
                fetch("/api/cities").then(r => r.json())
            ]);
            setRegions(rRes.data || []);
            setAllCities(cRes.data || []);
        } catch (e: any) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                name: formName,
                isAbroad: formIsAbroad,
                cityIds: formCities.map(id => Number(id))
            };

            const url = formId ? `/api/regions/${formId}` : "/api/regions";
            const method = formId ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setModalOpen(false);
                fetchAll();
            } else {
                alert(data.error);
            }
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    }

    const handleAddCustomCity = async (isCountry: boolean = false) => {
        const label = isCountry ? "Ülke" : "Şehir / Alt Bölge";
        const placeholder = isCountry ? "Almanya" : "İSTANBUL - AVRUPA";
        const name = window.prompt(`Yeni eklenecek ${label} adını giriniz (Örn: ${placeholder}):`);
        if (!name?.trim()) return;

        setLoading(true);
        try {
            const res = await fetch("/api/cities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), isCountry })
            });
            const data = await res.json();
            if (data.success) {
                alert(`${label} eklendi!`);
                fetchAll();
            } else {
                alert("Hata: " + data.error);
            }
        } catch (e: any) {
            alert(e.message);
        }
        setLoading(false);
    };

    const startAdd = () => {
        setFormId("");
        setFormName("");
        setFormIsAbroad(false);
        setFormCities([]);
        setModalOpen(true);
    };

    const startEdit = (region: any) => {
        setFormId(String(region.id || region.Id));
        setFormName(region.name || region.Name);
        setFormIsAbroad(!!(region.isAbroad || region.IsAbroad));
        const cIds = region.cityIds || region.CityIds || [];
        setFormCities(cIds.map(String));
        setModalOpen(true);
    }

    const toggleCity = (cityId: string) => {
        if (formCities.includes(cityId)) {
            setFormCities(formCities.filter(id => id !== cityId));
        } else {
            setFormCities([...formCities, cityId]);
        }
    }

    return (
        <div className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 className="title-lg outfit">🗺️ Bölgeler</h1>
                    <p className="text-muted" style={{ fontSize: "0.85rem" }}>Özel şehir isimleri (Avrupa/Anadolu vb) oluşturarak bölgesel bölünmeleri kolaylaştırın.</p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <button onClick={() => handleAddCustomCity(false)} className="tibcon-btn tibcon-btn-outline" style={{ background: "white" }}>+ Özel Şehir Ekle</button>
                    <button onClick={() => handleAddCustomCity(true)} className="tibcon-btn tibcon-btn-outline" style={{ background: "white" }}>+ Ülke Ekle</button>
                    <button onClick={startAdd} className="tibcon-btn tibcon-btn-primary">+ Yeni Bölge</button>
                </div>
            </div>

            <table className="premium-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Bölge Adı</th>
                        <th>Atanan Şehir Sayısı</th>
                        <th>İşlem</th>
                    </tr>
                </thead>
                <tbody>
                    {regions.map(r => {
                        const rId = r.id || r.Id;
                        const rName = r.name || r.Name;
                        const rIsAbroad = typeof r.isAbroad !== 'undefined' ? r.isAbroad : r.IsAbroad;
                        const cIds = r.cityIds || r.CityIds || [];
                        return (
                        <tr key={rId}>
                            <td>{rId}</td>
                            <td><strong>{rName}</strong> {rIsAbroad && <span style={{ fontSize: "0.7rem", color: "var(--tibcon-red)", background: "rgba(227,6,19,0.1)", padding: "2px 6px", borderRadius: "4px", marginLeft: "8px" }}>Yurt Dışı</span>}</td>
                            <td>{cIds.length} {rIsAbroad ? "Ülke" : "Şehir"}</td>
                            <td><button onClick={() => startEdit(r)} className="tibcon-btn tibcon-btn-outline">Düzenle</button></td>
                        </tr>
                    )})}
                </tbody>
            </table>

            {modalOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="premium-card" style={{ width: "100%", maxWidth: "600px" }}>
                        <h3 style={{ marginBottom: "1rem" }}>{formId ? "Bölgeyi Güncelle" : "Yeni Bölge"}</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Bölge Adı (örn: 1. BÖLGE)" style={{ flex: 1, border: "1px solid #ddd", borderRadius: "8px", padding: "12px" }} />
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                                    <input type="checkbox" checked={formIsAbroad} onChange={e => {
                                        setFormIsAbroad(e.target.checked);
                                        setFormCities([]); // Clear assigned cities when toggling abroad
                                    }} />
                                    Yurt Dışı mı?
                                </label>
                            </div>

                            <div style={{ background: "#f9f9f9", padding: "12px", border: "1px solid #eee", borderRadius: "8px", maxHeight: "300px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <b>{formIsAbroad ? "Atanacak Ülkeler:" : "Atanacak Şehirler:"}</b>
                                    <button onClick={() => handleAddCustomCity(formIsAbroad)} className="tibcon-btn" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>+ Hızlı Ekle</button>
                                </div>
                                {allCities.filter(c => {
                                    const cIsCountry = typeof c.isCountry !== 'undefined' ? c.isCountry : c.IsCountry;
                                    return !!cIsCountry === formIsAbroad;
                                }).map(c => {
                                    const cId = String(c.id || c.Id);
                                    const cName = c.name || c.Name;
                                    const cRegionId = c.assignedRegionId || c.RegionId;
                                    const isAssignedToOther = cRegionId && String(cRegionId) !== String(formId);
                                    return (
                                        <label key={cId} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", opacity: isAssignedToOther ? 0.4 : 1 }}>
                                            <input
                                                type="checkbox"
                                                checked={formCities.includes(cId)}
                                                onChange={() => toggleCity(cId)}
                                                disabled={isAssignedToOther}
                                            />
                                            {cName} {isAssignedToOther ? "(Başkasına Atalı)" : ""}
                                        </label>
                                    )
                                })}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                                <button onClick={() => setModalOpen(false)} className="tibcon-btn tibcon-btn-outline">İptal</button>
                                <button onClick={handleSave} disabled={loading} className="tibcon-btn tibcon-btn-primary">{loading ? "..." : "Kaydet"}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
