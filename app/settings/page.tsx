"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, saveSettings } from "@/lib/sheets";
import AuthGate from "../components/AuthGate";

type Settings = {
    // defaults
    defaultDiscountPct: number;
    companyName: string;
    // visit module
    allowRepDeletePlan: boolean;
    visitTargetPerMonth: number;
    maintenanceMode: boolean;
};

export default function SettingsPage() {
    return (
        <AuthGate allowedRoles={["admin"]}>
            <SettingsContent />
        </AuthGate>
    );
}

function SettingsContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Settings>({
        defaultDiscountPct: 61,
        companyName: "TIBCON",
        allowRepDeletePlan: false,
        visitTargetPerMonth: 20,
        maintenanceMode: false
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getSettings();
                if (res && res.settings) {
                    // Merge with defaults
                    setSettings(prev => ({
                        ...prev,
                        ...res.settings,
                        // Ensure types
                        defaultDiscountPct: Number(res.settings.defaultDiscountPct || 61),
                        allowRepDeletePlan: res.settings.allowRepDeletePlan === true || res.settings.allowRepDeletePlan === "true",
                        visitTargetPerMonth: Number(res.settings.visitTargetPerMonth || 20),
                        maintenanceMode: res.settings.maintenanceMode === true || res.settings.maintenanceMode === "true"
                    }));
                }
            } catch (e) {
                console.error("Load settings error", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaved(false);
        try {
            await saveSettings(settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            alert("Ayarlar kaydedilirken hata oluştu.");
        }
    };

    if (loading) return <div className="p-8 text-center">Ayarlar yükleniyor...</div>;

    return (
        <div className="page-container">
            <div className="premium-card" style={{ maxWidth: "700px", margin: "2rem auto" }}>
                <div style={headerStyle}>
                    <div>
                        <h1 className="title-lg outfit" style={{ margin: 0 }}>Sistem Ayarları</h1>
                        <p className="text-muted" style={{ margin: "4px 0 0" }}>Tüm sistem genelindeki yapılandırmaları buradan yönetebilirsiniz.</p>
                    </div>
                </div>

                {/* VISIT MANAGEMENT */}
                <h3 className="outfit" style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "20px", color: "var(--tibcon-red)" }}>Ziyaret Yönetimi</h3>

                <div style={formGroupStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <label style={labelStyle}>Temsilci Plan Silebilir</label>
                            <p style={hintStyle}>Aktif edilirse, satış temsilcileri atanan planları doğrudan silebilir.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings.allowRepDeletePlan}
                                onChange={e => setSettings({ ...settings, allowRepDeletePlan: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div style={formGroupStyle}>
                    <label style={labelStyle}>Aylık Ziyaret Hedefi</label>
                    <input
                        type="number"
                        value={settings.visitTargetPerMonth}
                        onChange={(e) => setSettings({ ...settings, visitTargetPerMonth: Number(e.target.value) })}
                        style={inputStyle}
                    />
                    <p style={hintStyle}>Her satış temsilcisi için varsayılan aylık ziyaret hedefi.</p>
                </div>

                {/* GENERAL SETTINGS */}
                <h3 className="outfit" style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "20px", marginTop: "30px", color: "var(--tibcon-red)" }}>Genel Ayarlar</h3>

                <div style={formGroupStyle}>
                    <label style={labelStyle}>Varsayılan İskonto (%)</label>
                    <input
                        type="number"
                        value={settings.defaultDiscountPct}
                        onChange={(e) => setSettings({ ...settings, defaultDiscountPct: Number(e.target.value) })}
                        style={inputStyle}
                        placeholder="61"
                    />
                </div>

                <div style={formGroupStyle}>
                    <label style={labelStyle}>Şirket Kimliği</label>
                    <input
                        value={settings.companyName}
                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                        style={inputStyle}
                        placeholder="TIBCON"
                    />
                </div>

                {/* SYSTEM */}
                <h3 className="outfit" style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "20px", marginTop: "30px", color: "#666" }}>Sistem</h3>

                <div style={formGroupStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <label style={labelStyle}>Bakım Modu</label>
                            <p style={hintStyle}>Sistemi kullanıcı girişine kapatır (Sadece Admin girebilir).</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings.maintenanceMode}
                                onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div style={{ marginTop: "2.5rem", display: "flex", gap: "12px" }}>
                    <button onClick={() => router.push("/")} className="tibcon-btn tibcon-btn-outline" style={{ flex: 1 }}>
                        Vazgeç
                    </button>
                    <button onClick={handleSave} className="tibcon-btn tibcon-btn-primary" style={{ flex: 2 }}>
                        {saved ? "Ayarlar Kaydedildi! ✓" : "Değişiklikleri Uygula"}
                    </button>
                </div>
            </div>
            <style jsx>{`
                .switch {
                  position: relative;
                  display: inline-block;
                  width: 50px;
                  height: 28px;
                }
                .switch input { 
                  opacity: 0;
                  width: 0;
                  height: 0;
                }
                .slider {
                  position: absolute;
                  cursor: pointer;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background-color: #ccc;
                  -webkit-transition: .4s;
                  transition: .4s;
                }
                .slider:before {
                  position: absolute;
                  content: "";
                  height: 20px;
                  width: 20px;
                  left: 4px;
                  bottom: 4px;
                  background-color: white;
                  -webkit-transition: .4s;
                  transition: .4s;
                }
                input:checked + .slider {
                  background-color: var(--tibcon-red);
                }
                input:focus + .slider {
                  box-shadow: 0 0 1px var(--tibcon-red);
                }
                input:checked + .slider:before {
                  -webkit-transform: translateX(22px);
                  -ms-transform: translateX(22px);
                  transform: translateX(22px);
                }
                .slider.round {
                  border-radius: 34px;
                }
                .slider.round:before {
                  border-radius: 50%;
                }
            `}</style>
        </div>
    );
}

// Modern Settings Styles
const headerStyle: React.CSSProperties = {
    marginBottom: "2.5rem",
};

const formGroupStyle: React.CSSProperties = {
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--tibcon-anth)",
};

const inputStyle: React.CSSProperties = {
    padding: "0.875rem 1rem",
    borderRadius: "8px",
    border: "1px solid var(--tibcon-border)",
    fontSize: "1rem",
    outline: "none",
    background: "#fff",
};

const hintStyle: React.CSSProperties = {
    margin: 0,
    fontSize: "0.8rem",
    color: "#666",
};
