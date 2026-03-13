"use client";

import React, { useEffect, useState } from "react";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [targets, setTargets] = useState({
        group1_target: 4,
        group2_target: 2,
        group3_target: 1
    });

    useEffect(() => {
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) {
                    setTargets({
                        group1_target: data.data.group1_target || 4,
                        group2_target: data.data.group2_target || 2,
                        group3_target: data.data.group3_target || 1
                    });
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(targets)
            });
            const data = await res.json();
            if (data.success) {
                alert("Hedefler başarıyla kaydedildi.");
            } else {
                alert("Hata: " + data.error);
            }
        } catch (e: any) {
            alert(e.message);
        }
        setSaving(false);
    };

    if (loading) return <LoadingOverlay message="Ayarlar yükleniyor..." />;

    return (
        <div className="page-container">
            <h1 className="title-lg outfit mb-4">⚙️ Sistem Ayarları</h1>

            <div className="premium-card">
                <h3 className="mb-4 outfit" style={{ color: "var(--tibcon-blue)" }}>Aylık Ziyaret Hedefleri</h3>
                <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
                    Satış noktası grupları için aylık minimum ziyaret sayılarını belirleyin.
                    Bu hedefler dashboard ve harita üzerindeki tamamlama oranlarını hesaplamak için kullanılır.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "400px" }}>
                    <div className="input-group">
                        <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>1. Grup Azami Ziyaret</label>
                        <input
                            type="number"
                            className="premium-input"
                            value={targets.group1_target}
                            onChange={e => setTargets({ ...targets, group1_target: Number(e.target.value) })}
                        />
                    </div>
                    <div className="input-group">
                        <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>2. Grup Azami Ziyaret</label>
                        <input
                            type="number"
                            className="premium-input"
                            value={targets.group2_target}
                            onChange={e => setTargets({ ...targets, group2_target: Number(e.target.value) })}
                        />
                    </div>
                    <div className="input-group">
                        <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>3. Grup Azami Ziyaret</label>
                        <input
                            type="number"
                            className="premium-input"
                            value={targets.group3_target}
                            onChange={e => setTargets({ ...targets, group3_target: Number(e.target.value) })}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="tibcon-btn tibcon-btn-primary"
                        style={{ marginTop: "1rem" }}
                    >
                        {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
                    </button>
                </div>
            </div>
        </div>
    );
}
