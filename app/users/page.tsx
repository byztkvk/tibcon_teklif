"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listUsers, upsertUser, type User, listRegions, addRegion, deleteRegion } from "@/lib/sheets";

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [regions, setRegions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: "", // Display Name
        email: "",
        password: "",
        role: "sales",
        region: "",
        managerEmail: "",
        active: "1"
    });
    // Region Mgmt State
    const [showRegionModal, setShowRegionModal] = useState(false);
    const [newRegionName, setNewRegionName] = useState("");
    const [regionList, setRegionList] = useState<string[]>([]); // For UI list

    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState("");

    // Load users
    useEffect(() => {
        loadUsersLocal();
        // Arka planda güncelle
        refreshUsers();
    }, []);

    const loadUsersLocal = () => {
        const raw = localStorage.getItem("tibcon_users");
        if (raw) {
            try {
                setUsers(JSON.parse(raw));
            } catch (e) { console.error(e); }
        }
        setLoading(false);
    };

    const refreshUsers = async () => {
        try {
            const [uRes, rRes] = await Promise.all([listUsers(), listRegions()]);
            if (uRes?.users) {
                setUsers(uRes.users);
                localStorage.setItem("tibcon_users", JSON.stringify(uRes.users));
            }
            if (rRes?.regions) {
                setRegions(rRes.regions);
            }
        } catch (e) {
            console.error("Refresh failed", e);
        }
    };

    const handleAddRegion = async () => {
        if (!newRegionName) return;
        try {
            const res: any = await addRegion(newRegionName);
            if (!res || !res.ok) {
                alert("Hata: " + (res?.message || "Bilinmeyen hata"));
                return;
            }
            setNewRegionName("");
            await refreshUsers();
        } catch (e: any) {
            alert("Bölge eklenemedi: " + (e.message || String(e)));
        }
    };

    const handleDeleteRegion = async (r: string) => {
        if (!confirm(r + " bölgesini silmek istediğinize emin misiniz?")) return;
        try {
            await deleteRegion(r);
            await refreshUsers();
        } catch (e) { alert("Silinemedi"); }
    };

    const handleEdit = (u: User) => {
        setFormData({
            name: u.displayName,
            email: u.email,
            password: u.password || "",
            role: u.role,
            region: u.region || "",
            managerEmail: u.managerEmail || "",
            active: u.active ? "1" : "0"
        });
        setIsEditing(true);
        setShowForm(true);
        setMsg("");
    };

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMsg("");

        try {
            await upsertUser({
                displayName: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role as any,
                region: formData.region,
                managerEmail: formData.managerEmail,
                active: formData.active === "1"
            });

            setMsg(isEditing ? "Kullanıcı başarıyla güncellendi!" : "Kullanıcı başarıyla eklendi!");
            setFormData({ name: "", email: "", password: "", role: "sales", region: "", managerEmail: "", active: "1" });
            setShowForm(false);
            setIsEditing(false);

            await refreshUsers();
        } catch (err: any) {
            setMsg("Hata: " + (err.message || String(err)));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container">
            <div className="premium-card">
                <div style={headerStyle}>
                    <div>
                        <h1 className="title-lg outfit" style={{ margin: 0 }}>Kullanıcı Yönetimi</h1>
                        <p className="text-muted" style={{ margin: "4px 0 0" }}>Toplam {users.length} kullanıcı tanımlı.</p>
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                            onClick={() => setShowRegionModal(true)}
                            className="tibcon-btn tibcon-btn-outline"
                        >
                            🌍 Bölgeleri Yönet
                        </button>
                        <button
                            onClick={() => {
                                if (showForm) {
                                    setIsEditing(false);
                                    setFormData({ name: "", email: "", password: "", role: "sales", region: "", managerEmail: "", active: "1" });
                                }
                                setShowForm(!showForm);
                            }}
                            className={`tibcon-btn ${showForm ? 'tibcon-btn-outline' : 'tibcon-btn-primary'}`}
                        >
                            {showForm ? "İptal" : "+ Yeni Kullanıcı"}
                        </button>
                    </div>
                </div>

                {msg && (
                    <div style={{
                        padding: "1rem",
                        background: "rgba(227, 6, 19, 0.05)",
                        border: "1px solid rgba(227, 6, 19, 0.2)",
                        color: "var(--tibcon-red)",
                        marginBottom: "1.5rem",
                        borderRadius: "12px",
                        fontWeight: 600
                    }}>
                        {msg}
                    </div>
                )}

                {/* CREATE/EDIT FORM */}
                {showForm && (
                    <form onSubmit={handleCreateOrUpdate} style={formBoxStyle}>
                        <h3 className="outfit" style={{ marginTop: 0, marginBottom: "1.5rem", color: "var(--tibcon-anth)" }}>
                            {isEditing ? "Kullanıcı Bilgilerini Güncelle" : "Yeni Kullanıcı Oluştur"}
                        </h3>
                        <div style={grid2Style}>
                            <label style={labelStyle}>
                                Ad Soyad
                                <input required style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="İsim Soyisim" />
                            </label>
                            <label style={labelStyle}>
                                Email
                                <input required type="email" style={inputStyle} disabled={isEditing} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="vural@tibcon.com.tr" />
                            </label>
                            <label style={labelStyle}>
                                Şifre
                                <input required style={inputStyle} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••" />
                            </label>
                            <label style={labelStyle}>
                                Rol
                                <select style={inputStyle} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="sales">Satış Temsilcisi</option>
                                    <option value="region_manager">Bölge Müdürü</option>
                                    <option value="quote_manager">Teklif Müdürü</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </label>
                            <label style={labelStyle}>
                                Bölge Seçimi
                                {formData.role === "region_manager" ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "10px", background: "white", borderRadius: "10px", border: "1px solid var(--tibcon-border)" }}>
                                        {regions.length === 0 && <span style={{ fontSize: "0.8rem", color: "#999" }}>Lütfen önce bölge tanımlayın.</span>}
                                        {regions.map(r => {
                                            const selectedRegions = formData.region.split(",").map(s => s.trim()).filter(Boolean);
                                            const isSelected = selectedRegions.includes(r);
                                            return (
                                                <div key={r}
                                                    onClick={() => {
                                                        let newSet = new Set(selectedRegions);
                                                        if (isSelected) newSet.delete(r);
                                                        else newSet.add(r);
                                                        setFormData({ ...formData, region: Array.from(newSet).join(",") });
                                                    }}
                                                    style={{
                                                        padding: "4px 10px", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer",
                                                        background: isSelected ? "var(--tibcon-red)" : "#f1f3f5",
                                                        color: isSelected ? "white" : "#495057"
                                                    }}>
                                                    {r} {isSelected && "✓"}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <select style={inputStyle} value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })}>
                                        <option value="">Seçiniz...</option>
                                        {regions.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                )}
                                <span style={{ fontSize: "0.75rem", color: "#888" }}>
                                    {formData.role === "region_manager" ? "Birden fazla bölge seçebilirsiniz." : "Personelin bağlı olduğu tek bölge."}
                                </span>
                            </label>
                            <label style={labelStyle}>
                                Yönetici Email (Opsiyonel)
                                <input type="email" style={inputStyle} value={formData.managerEmail} onChange={e => setFormData({ ...formData, managerEmail: e.target.value })} placeholder="manager@tibcon.com.tr" />
                            </label>
                            <label style={labelStyle}>
                                Durum
                                <select style={inputStyle} value={formData.active} onChange={e => setFormData({ ...formData, active: e.target.value as any })}>
                                    <option value="1">Aktif</option>
                                    <option value="0">Pasif</option>
                                </select>
                            </label>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                            <button disabled={submitting} className="tibcon-btn tibcon-btn-primary" style={{ padding: "0.875rem 2rem" }}>
                                {submitting ? "İşleniyor..." : (isEditing ? "Değişiklikleri Kaydet" : "Kullanıcıyı Tanımla")}
                            </button>
                        </div>
                    </form>
                )}

                {/* LIST */}
                <div style={{ overflowX: "auto", marginTop: "1rem" }}>
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Ad Soyad</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Bölge</th>
                                <th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--tibcon-gray-dark)" }}>Veriler güncelleniyor...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--tibcon-gray-dark)" }}>Kullanıcı kaydı bulunamadı.</td></tr>
                            ) : (
                                users.map((u: User, i: number) => (
                                    <tr key={u.id || i}>
                                        <td>
                                            <div style={{ fontWeight: 700, color: "var(--tibcon-anth)" }}>{u.displayName}</div>
                                            {!u.active && <span className="badge" style={{ background: "#eee", color: "#666", fontSize: "0.6rem" }}>PASİF</span>}
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className="badge" style={roleBadgeStyle(u.role)}>
                                                {u.role === "admin" ? "Yönetici" :
                                                    u.role === "region_manager" ? "Bölge Müdürü" :
                                                        u.role === "quote_manager" ? "Teklif Müdürü" : "Satış Sorumlusu"}
                                            </span>
                                        </td>
                                        <td>{u.region || "-"}</td>
                                        <td>
                                            <button
                                                onClick={() => handleEdit(u)}
                                                className="tibcon-btn tibcon-btn-outline"
                                                style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                                            >
                                                Düzenle
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* REGION MODAL */}
            {showRegionModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)",
                    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
                }} onClick={() => setShowRegionModal(false)}>
                    <div style={{
                        background: "white", width: "100%", maxWidth: "400px", borderRadius: "20px", padding: "2rem",
                        boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
                    }} onClick={e => e.stopPropagation()}>
                        <h3 className="outfit" style={{ marginTop: 0 }}>Bölge Yönetimi</h3>

                        <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
                            <input
                                className="tibcon-input"
                                style={{ ...inputStyle, flex: 1 }}
                                placeholder="Yeni bölge adı..."
                                value={newRegionName}
                                onChange={e => setNewRegionName(e.target.value)}
                            />
                            <button className="tibcon-btn tibcon-btn-primary" onClick={handleAddRegion}>Ekle</button>
                        </div>

                        <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                            {regions.map(r => (
                                <div key={r} style={{ padding: "10px", background: "#f8f9fa", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontWeight: 600 }}>{r}</span>
                                    <button onClick={() => handleDeleteRegion(r)} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>🗑️</button>
                                </div>
                            ))}
                            {regions.length === 0 && <div style={{ color: "#999", textAlign: "center" }}>Henüz bölge eklenmemiş.</div>}
                        </div>

                        <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
                            <button onClick={() => setShowRegionModal(false)} className="tibcon-btn tibcon-btn-outline">Kapat</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Modern styles for User page
const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2.5rem",
};

const formBoxStyle: React.CSSProperties = {
    background: "var(--tibcon-gray)",
    padding: "2rem",
    borderRadius: "16px",
    marginBottom: "2.5rem",
    border: "1px solid var(--tibcon-border)",
};

const grid2Style: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.5rem",
};

const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--tibcon-anth)",
};

const inputStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    border: "1px solid var(--tibcon-border)",
    fontSize: "0.95rem",
    outline: "none",
    background: "white",
    transition: "border-color 0.2s",
};

function roleBadgeStyle(role: string): React.CSSProperties {
    let bg = "#eee";
    let col = "#222";

    if (role === "admin") { bg = "var(--tibcon-black)"; col = "white"; }
    else if (role === "sales") { bg = "rgba(227, 6, 19, 0.08)"; col = "var(--tibcon-red)"; }
    else if (role === "region_manager") { bg = "#e9ecef"; col = "#495057"; }

    return {
        background: bg,
        color: col,
    };
}
