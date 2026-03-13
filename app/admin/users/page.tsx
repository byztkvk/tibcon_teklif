"use client";

import React, { useEffect, useState } from "react";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formEmail, setFormEmail] = useState("");
    const [formRole, setFormRole] = useState("SALES_REP");
    const [formRegion, setFormRegion] = useState("");
    const [formRegionIds, setFormRegionIds] = useState<string[]>([]);
    const [formCities, setFormCities] = useState<string[]>([]);
    const [formIsActive, setFormIsActive] = useState(true);
    const [formDisplayName, setFormDisplayName] = useState("");
    const [formUid, setFormUid] = useState(""); // if editing

    const fetchAll = async () => {
        try {
            const [uRes, rRes] = await Promise.all([
                fetch("/api/users").then(r => r.json()),
                fetch("/api/regions").then(r => r.json())
            ]);
            setUsers(uRes.data || []);
            setRegions(rRes.data || []);
            if (rRes.data && rRes.data.length > 0) {
                setFormRegion(rRes.data[0].id);
            }
        } catch (e: any) {
            console.error(e);
        }
    };

    const fetchCitiesForRegion = async (regionId: string, editingUid?: string) => {
        try {
            const res = await fetch(`/api/cities?assignableForRep=true&regionId=${regionId}`);
            const json = await res.json();

            // Allow currently assigned cities as well if editing
            const allCitiesRes = await fetch(`/api/cities`);
            const allCitiesJson = await allCitiesRes.json();
            let all = allCitiesJson.data || [];

            let allowedCities = all.filter((c: any) =>
                c.assignedRegionId === regionId
            );

            setCities(allowedCities);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        if (formRegion) fetchCitiesForRegion(formRegion, formUid);
    }, [formRegion, formUid]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                uid: formUid || formEmail, // simplified doc naming
                email: formEmail,
                role: formRole,
                regionId: formRole === "SALES_REP" ? Number(formRegion) : (formRegionIds[0] ? Number(formRegionIds[0]) : null),
                regionIds: formRole === "REGION_MANAGER" ? formRegionIds.map(Number) : (formRegion ? [Number(formRegion)] : []),
                cityIds: formRole === "SALES_REP" ? formCities.map(Number) : [],
                isActive: formIsActive,
                displayName: formDisplayName
            };
            const res = await fetch("/api/users", {
                method: "POST",
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

    const startAdd = () => {
        setFormUid("");
        setFormEmail("");
        setFormDisplayName("");
        setFormRole("sales_rep");
        setFormCities([]);
        setFormRegionIds([]);
        setFormIsActive(true);
        setModalOpen(true);
    };

    const startEdit = (u: any) => {
        setFormUid(u.id || u.Id);
        setFormEmail(u.email || u.Email);
        const uDisplayName = u.displayName || u.DisplayName;
        setFormDisplayName(uDisplayName || u.email || u.Email);
        const uRole = u.role || u.Role;
        setFormRole(uRole?.toUpperCase() || "SALES_REP");
        const uRegionId = u.regionId || u.RegionId;
        setFormRegion(String(uRegionId || (regions[0]?.id || regions[0]?.Id || "")));
        const uRegionIds = u.regionIds || u.RegionIds || [];
        setFormRegionIds(uRegionIds.map(String) || (uRegionId ? [String(uRegionId)] : []));
        const uCityIds = u.cityIds || u.CityIds || [];
        setFormCities(uCityIds.map(String) || []);
        setFormIsActive(typeof u.isActive !== 'undefined' ? u.isActive : u.IsActive);
        setModalOpen(true);
    }

    const toggleCity = (cityId: string) => {
        if (formCities.includes(cityId)) {
            setFormCities(formCities.filter(id => id !== cityId));
        } else {
            setFormCities([...formCities, cityId]);
        }
    }

    const toggleRegion = (regionId: string) => {
        if (formRegionIds.includes(regionId)) {
            setFormRegionIds(formRegionIds.filter(id => id !== regionId));
        } else {
            setFormRegionIds([...formRegionIds, regionId]);
        }
    }

    return (
        <div className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
                <h1 className="title-lg outfit">👥 Kullanıcılar</h1>
                <button onClick={startAdd} className="tibcon-btn tibcon-btn-primary">+ Yeni Kullanıcı</button>
            </div>

            <table className="premium-table">
                <thead>
                    <tr>
                        <th>Ad Soyad</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Bölge ID</th>
                        <th>Durum</th>
                        <th>İşlem</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => {
                        const uId = u.id || u.Id;
                        const uRole = u.role || u.Role;
                        const uRegionIds = u.regionIds || u.RegionIds;
                        const uRegionId = u.regionId || u.RegionId;
                        return (
                        <tr key={uId}>
                            <td>{u.displayName || u.DisplayName}</td>
                            <td>{u.email || u.Email}</td>
                            <td>{uRole?.toUpperCase()}</td>
                            <td>{uRole?.toUpperCase() === "REGION_MANAGER" && uRegionIds?.length > 0 ? `${uRegionIds.length} Bölge` : (uRegionId || "-")}</td>
                            <td>{(typeof u.isActive !== 'undefined' ? u.isActive : u.IsActive) ? "Aktif" : "Pasif"}</td>
                            <td><button onClick={() => startEdit(u)} className="tibcon-btn tibcon-btn-outline">Düzenle</button></td>
                        </tr>
                    )})}
                </tbody>
            </table>

            {modalOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="premium-card" style={{ width: "100%", maxWidth: "600px" }}>
                        <h3 style={{ marginBottom: "1rem" }}>{formUid ? "Düzenle" : "Yeni Kullanıcı"}</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <input value={formDisplayName} onChange={e => setFormDisplayName(e.target.value)} placeholder="İsim Soyisim" className="p-3 border rounded" style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "12px" }} />
                            <input value={formEmail} onChange={e => setFormEmail(e.target.value)} disabled={!!formUid} placeholder="E-posta" className="p-3 border rounded" style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "12px" }} />
                            <select value={formRole} onChange={e => setFormRole(e.target.value)} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "12px" }}>
                                <option value="SALES_REP">Satış Temsilcisi (Şehir Atamalı)</option>
                                <option value="REGION_MANAGER">Bölge Müdürü (Bölge Atamalı)</option>
                                <option value="ADMIN">Admin (Tüm Erişim)</option>
                            </select>

                            {formRole === "SALES_REP" && (
                                <select value={formRegion} onChange={e => setFormRegion(e.target.value)} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "12px" }}>
                                    {regions.map(r => <option key={r.id || r.Id} value={r.id || r.Id}>{r.name || r.Name}</option>)}
                                </select>
                            )}

                            {formRole === "REGION_MANAGER" && (
                                <div style={{ background: "#f9f9f9", padding: "12px", border: "1px solid #eee", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                    <b style={{ gridColumn: "span 2" }}>Sorumlu Olduğu Bölgeler (Çoklu Seçim):</b>
                                    {regions.map(r => {
                                        const rId = String(r.id || r.Id);
                                        return (
                                        <label key={rId} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                                            <input type="checkbox" checked={formRegionIds.includes(rId)} onChange={() => toggleRegion(rId)} />
                                            {r.name || r.Name}
                                        </label>
                                    )})}
                                    {regions.length === 0 && <span style={{ fontSize: "0.8rem", color: "var(--tibcon-gray-dark)" }}>Tanımlı bölge bulunmamaktadır.</span>}
                                </div>
                            )}

                            {formRole === "SALES_REP" && (
                                <div style={{ background: "#f9f9f9", padding: "12px", border: "1px solid #eee", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                    <b style={{ gridColumn: "span 2" }}>Atanabilir Şehirler Seçimi:</b>
                                    {cities.map(c => {
                                        const cId = String(c.id || c.Id);
                                        const reps = c.assignedRepUids || c.AssignedRepUids || [];
                                        return (
                                        <label key={cId} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                                            <input type="checkbox" checked={formCities.includes(cId)} onChange={() => toggleCity(cId)} />
                                            {c.name || c.Name} {reps.length > 0 ? <span style={{ fontSize: "0.75rem", color: "var(--tibcon-gray-dark)" }}>({reps.length} kişiye atalı)</span> : ""}
                                        </label>
                                    )})}
                                    {cities.length === 0 && <span style={{ fontSize: "0.8rem", color: "red" }}>Bu bölgeye ait atanabilir boş şehir bulunmamaktadır. Şehirlerin önce bölgeye eklenmesi gerek.</span>}
                                </div>
                            )}

                            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} />
                                Kullanıcı Aktif
                            </label>

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
