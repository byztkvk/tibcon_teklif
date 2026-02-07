"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    deleteUser,
    getSettings,
    listUsers,
    saveSettings,
    upsertUser,
    type Role,
    type Settings,
    type User,
} from "@/lib/sheets";

type Tab = "users" | "settings";

const ROLE_LABEL: Record<Role, string> = {
    sales: "sales (Satış Temsilcisi)",
    region_manager: "region_manager (Bölge Müdürü)",
    quote_manager: "quote_manager (Teklif Müdürü)",
    admin: "admin (Admin)",
};

export default function AdminPage() {
    const [tab, setTab] = useState<Tab>("users");

    const [err, setErr] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    // users
    const [users, setUsers] = useState<User[]>([]);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [formFullName, setFormFullName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formRole, setFormRole] = useState<Role>("sales");
    const [formRegion, setFormRegion] = useState("");
    const [formManagerEmail, setFormManagerEmail] = useState("");
    const [formActive, setFormActive] = useState<"1" | "0">("1");

    // settings
    const [settings, setSettingsState] = useState<Settings>({});
    const regionsList = useMemo(() => {
        const csv = String(settings.regions || "").trim();
        if (!csv) return ["1. Bölge", "2. Bölge", "3. Bölge"];
        return csv.split(",").map((x) => x.trim()).filter(Boolean);
    }, [settings.regions]);

    async function refreshAll() {
        setLoading(true);
        setErr("");
        console.log("[AdminPage] refreshAll starting...");
        try {
            const usersRes = await listUsers();
            console.log("[AdminPage] listUsers response:", usersRes);

            const s = await getSettings();
            console.log("[AdminPage] getSettings response:", s);

            setUsers(usersRes?.users || []);
            setSettingsState(s || {});
        } catch (e: any) {
            console.error("[AdminPage] refreshAll error:", e);
            setErr(String(e?.message || e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refreshAll();
    }, []);

    function openNewUserModal() {
        setErr("");
        setEditingUser(null);
        setFormFullName("");
        setFormEmail("");
        setFormPassword("");
        setFormRole("sales");
        setFormRegion(regionsList[0] || "1. Bölge");
        setFormManagerEmail("");
        setFormActive("1");
        setUserModalOpen(true);
    }

    function openEditUserModal(u: User) {
        setErr("");
        setEditingUser(u);
        setFormFullName(u.displayName);
        setFormEmail(u.email);
        setFormPassword(u.password || "");
        setFormRole(u.role);
        setFormRegion(u.region || "");
        setFormManagerEmail(u.managerEmail || "");
        setFormActive(u.active ? "1" : "0");
        setUserModalOpen(true);
    }

    async function handleSaveUser() {
        setErr("");

        const email = String(formEmail || "").trim();
        const fullName = String(formFullName || "").trim();
        const password = String(formPassword || "").trim();

        if (!email) return setErr("email required");
        if (!fullName) return setErr("adSoyad required");
        if (!password) return setErr("sifre required");

        const payload: User = {
            id: email,
            email,
            displayName: fullName,
            password,
            role: formRole,
            region: String(formRegion || "").trim(),
            managerEmail: String(formManagerEmail || "").trim(),
            active: formActive === "1",
        };

        setLoading(true);
        try {
            await upsertUser(payload);
            setUserModalOpen(false);
            setEditingUser(null);
            await refreshAll();
        } catch (e: any) {
            setErr(String(e?.message || e));
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteUser(email: string) {
        if (!email) return;
        setErr("");
        setLoading(true);
        try {
            await deleteUser(email);
            await refreshAll();
        } catch (e: any) {
            setErr(String(e?.message || e));
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveSettings() {
        setErr("");
        setLoading(true);
        try {
            await saveSettings(settings);
            const s = await getSettings();
            setSettingsState(s || {});
            alert("Ayarlar başarıyla kaydedildi.");
        } catch (e: any) {
            setErr(String(e?.message || e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page-container">
            <div style={headerContainerStyle}>
                <div>
                    <h1 className="title-lg outfit" style={{ margin: 0 }}>Yönetim Merkezi</h1>
                    <p className="text-muted" style={{ marginTop: "4px" }}>Sistem yapılandırması ve kullanıcı yetkilendirme</p>
                </div>

                <div style={tabContainerStyle}>
                    <button
                        onClick={() => setTab("users")}
                        className="tibcon-btn"
                        style={tab === "users" ? tabActiveStyle : tabInactiveStyle}
                    >
                        👥 Kullanıcılar
                    </button>
                    <button
                        onClick={() => setTab("settings")}
                        className="tibcon-btn"
                        style={tab === "settings" ? tabActiveStyle : tabInactiveStyle}
                    >
                        ⚙️ Ayarlar
                    </button>
                </div>
            </div>

            {err && (
                <div style={errorBannerStyle}>
                    {err}
                </div>
            )}

            <div className="premium-card" style={{ marginTop: "2rem" }}>
                {tab === "users" ? (
                    <>
                        <div style={sectionHeaderStyle}>
                            <h3 className="outfit" style={{ margin: 0 }}>Tanımlı Kullanıcılar</h3>
                            <button onClick={openNewUserModal} className="tibcon-btn tibcon-btn-primary">
                                + Yeni Kullanıcı Tanımla
                            </button>
                        </div>

                        <div style={{ marginTop: "2rem", overflowX: "auto" }}>
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th>Ad Soyad</th>
                                        <th>E-posta</th>
                                        <th>Rol</th>
                                        <th>Bölge</th>
                                        <th>Durum</th>
                                        <th style={{ textAlign: "right" }}>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--tibcon-gray-dark)" }}>Kullanıcı bulunamadı.</td>
                                        </tr>
                                    ) : (
                                        users.map((u) => (
                                            <tr key={u.email}>
                                                <td><div style={{ fontWeight: 700 }}>{u.displayName}</div></td>
                                                <td>{u.email}</td>
                                                <td><span className="badge" style={roleBadgeStyle(u.role)}>{u.role}</span></td>
                                                <td>{u.region || "-"}</td>
                                                <td>
                                                    <span className="badge" style={{
                                                        background: u.active ? "rgba(22, 163, 74, 0.1)" : "rgba(0,0,0,0.05)",
                                                        color: u.active ? "#16a34a" : "#666"
                                                    }}>
                                                        {u.active ? "AKTİF" : "PASİF"}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    <div style={{ display: "inline-flex", gap: "8px" }}>
                                                        <button
                                                            onClick={() => openEditUserModal(u)}
                                                            className="tibcon-btn"
                                                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", background: "#f8f9fa", border: "1px solid #ddd" }}
                                                        >
                                                            Düzenle
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u.email)}
                                                            className="tibcon-btn"
                                                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", color: "var(--tibcon-red)", borderColor: "rgba(227, 6, 19, 0.2)", background: "rgba(227, 6, 19, 0.05)" }}
                                                        >
                                                            Sil
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={sectionHeaderStyle}>
                            <h3 className="outfit" style={{ margin: 0 }}>Sistem Parametreleri</h3>
                        </div>

                        <div style={settingsGridStyle}>
                            <label style={labelStyle}>
                                Varsayılan İskonto (%)
                                <input
                                    value={settings.defaultDiscountPct ?? ""}
                                    onChange={(e) => setSettingsState((s) => ({ ...s, defaultDiscountPct: e.target.value }))}
                                    style={inputStyle}
                                    placeholder="61"
                                />
                                <span style={{ fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>Yeni tekliflerde otomatik uygulanır.</span>
                            </label>

                            <label style={labelStyle}>
                                Bölgeler (Virgülle ayırın)
                                <input
                                    value={settings.regions ?? ""}
                                    onChange={(e) => setSettingsState((s) => ({ ...s, regions: e.target.value }))}
                                    style={inputStyle}
                                    placeholder="1. Bölge, 2. Bölge"
                                />
                                <span style={{ fontSize: "0.75rem", color: "#666", marginTop: "4px" }}>Sistemdeki satış bölgelerini tanımlar.</span>
                            </label>
                        </div>

                        <div style={{ marginTop: "2.5rem", borderTop: "1px solid var(--tibcon-border)", paddingTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={handleSaveSettings} className="tibcon-btn tibcon-btn-primary" style={{ padding: "0.875rem 2.5rem" }} disabled={loading}>
                                Ayarları Kaydet
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Modal */}
            {userModalOpen && (
                <div style={modalBackdropStyle}>
                    <div className="premium-card" style={modalCardStyle}>
                        <h3 className="outfit" style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>
                            {editingUser ? "Kullanıcıyı Güncelle" : "Yeni Kullanıcı Ekle"}
                        </h3>

                        <div style={formGridStyle}>
                            <label style={labelStyle}>
                                Ad Soyad
                                <input style={inputStyle} value={formFullName} onChange={(e) => setFormFullName(e.target.value)} placeholder="İsim Soyisim" />
                            </label>
                            <label style={labelStyle}>
                                E-posta
                                <input style={inputStyle} disabled={!!editingUser} value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="vural@tibcon.com.tr" />
                            </label>

                            <label style={labelStyle}>
                                Şifre
                                <input value={formPassword} onChange={(e) => setFormPassword(e.target.value)} style={inputStyle} placeholder={editingUser ? "Değiştirmek istemiyorsanız boş bırakın" : "••••••"} />
                            </label>

                            <label style={labelStyle}>
                                Rol
                                <select value={formRole} onChange={(e) => setFormRole(e.target.value as Role)} style={inputStyle}>
                                    {Object.keys(ROLE_LABEL).map((r) => (
                                        <option key={r} value={r}>{ROLE_LABEL[r as Role].split(' ')[0]}</option>
                                    ))}
                                </select>
                            </label>

                            <label style={labelStyle}>
                                Bölge
                                <select value={formRegion} onChange={(e) => setFormRegion(e.target.value)} style={inputStyle}>
                                    {regionsList.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </label>

                            <label style={labelStyle}>
                                Yönetici E-posta
                                <input value={formManagerEmail} onChange={(e) => setFormManagerEmail(e.target.value)} style={inputStyle} placeholder="manager@tibcon.com.tr" />
                            </label>

                            <label style={labelStyle}>
                                Hesap Durumu
                                <select value={formActive} onChange={(e) => setFormActive(e.target.value as any)} style={inputStyle}>
                                    <option value="1">Aktif</option>
                                    <option value="0">Pasif</option>
                                </select>
                            </label>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "2.5rem" }}>
                            <button onClick={() => setUserModalOpen(false)} className="tibcon-btn tibcon-btn-outline">Vazgeç</button>
                            <button onClick={handleSaveUser} className="tibcon-btn tibcon-btn-primary" disabled={loading}>
                                {loading ? "İşleniyor..." : "Kaydet ve Tanımla"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && !users.length && (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--tibcon-gray-dark)" }}>
                    Veriler yükleniyor...
                </div>
            )}
        </div>
    );
}

// Admin Page Styles
const headerContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
    gap: "2rem",
    flexWrap: "wrap",
};

const tabContainerStyle: React.CSSProperties = {
    display: "flex",
    background: "rgba(0,0,0,0.04)",
    padding: "6px",
    borderRadius: "14px",
    gap: "4px",
};

const tabActiveStyle: React.CSSProperties = {
    background: "var(--tibcon-white)",
    color: "var(--tibcon-black)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "none",
    padding: "0.6rem 1.25rem",
};

const tabInactiveStyle: React.CSSProperties = {
    background: "transparent",
    color: "var(--tibcon-gray-dark)",
    border: "none",
    padding: "0.6rem 1.25rem",
};

const errorBannerStyle: React.CSSProperties = {
    padding: "1rem 1.5rem",
    borderRadius: "12px",
    background: "rgba(227, 6, 19, 0.05)",
    border: "1px solid rgba(227, 6, 19, 0.2)",
    color: "var(--tibcon-red)",
    marginBottom: "1.5rem",
    fontWeight: 600,
};

const sectionHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
};

const settingsGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "2rem",
};

const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--tibcon-anth)",
};

const inputStyle: React.CSSProperties = {
    padding: "0.875rem 1rem",
    borderRadius: "12px",
    border: "1px solid var(--tibcon-border)",
    fontSize: "1rem",
    outline: "none",
    background: "#fcfcfc",
    transition: "border-color 0.2s",
};

const modalBackdropStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
    zIndex: 1000,
};

const modalCardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "640px",
    maxHeight: "90vh",
    overflowY: "auto",
};

const formGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
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
