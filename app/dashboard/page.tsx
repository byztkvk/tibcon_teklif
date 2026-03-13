"use client";

import React, { useEffect, useState } from "react";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

    const fetchStats = async () => {
        setLoading(true);
        try {
            const session = JSON.parse(localStorage.getItem("tibcon_session") || "{}");
            const params = new URLSearchParams({
                month,
                role: session.role || "",
                email: session.email || "",
                cityIds: JSON.stringify(session.cityIds || []),
                regionIds: JSON.stringify(session.regionIds || [])
            });
            const res = await fetch(`/api/dashboard/stats?${params}`);
            const data = await res.json();
            if (data.success) {
                setStats(data);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStats();
    }, [month]);

    if (loading && !stats) return <LoadingOverlay message="İstatistikler yükleniyor..." />;

    const getProgressColor = (rate: number) => {
        if (rate < 40) return "bg-red";
        if (rate < 80) return "bg-orange";
        return "bg-green";
    };

    return (
        <div className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1 className="title-lg outfit">📊 Yönetici Özeti</h1>
                <input
                    type="month"
                    className="premium-input"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    style={{ padding: "0.5rem", borderRadius: "8px" }}
                />
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="premium-card kpi-card">
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--tibcon-gray-dark)" }}>BU AYKİ ZİYARETLER</span>
                    <div className="kpi-value">{stats?.stats?.totalVisits || 0}</div>
                    <span style={{ fontSize: "0.75rem", color: "var(--tibcon-blue)" }}>Toplam Kayıtlı</span>
                </div>
                <div className="premium-card kpi-card">
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--tibcon-gray-dark)" }}>VERİLEN TEKLİFLER</span>
                    <div className="kpi-value">{stats?.stats?.totalQuotes || 0}</div>
                    <span style={{ fontSize: "0.75rem", color: "var(--tibcon-blue)" }}>Toplam Adet</span>
                </div>
                <div className="premium-card kpi-card">
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--tibcon-gray-dark)" }}>SİPARİŞE DÖNÜŞEN</span>
                    <div className="kpi-value" style={{ color: "var(--tibcon-red)" }}>{stats?.stats?.convertedQuotes || 0}</div>
                    <span className="badge badge-success" style={{ width: "fit-content" }}>Başarılı</span>
                </div>
                <div className="premium-card kpi-card">
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--tibcon-gray-dark)" }}>BEKLEYEN TEKLİFLER</span>
                    <div className="kpi-value">{stats?.stats?.pendingQuotes || 0}</div>
                    <span className="badge badge-pending" style={{ width: "fit-content" }}>Takipte</span>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "2rem" }}>

                {/* Group Distribution */}
                <div className="premium-card">
                    <h3 className="outfit mb-4">🏷️ Grup Bazlı Dağılım</h3>
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Grup</th>
                                <th>Ziyaret</th>
                                <th>Teklif</th>
                                <th>Sipariş</th>
                            </tr>
                        </thead>
                        <tbody>
                            {["group1", "group2", "group3"].map(g => (
                                <tr key={g}>
                                    <td><strong>{g.replace("group", "").toUpperCase()}. GRUP</strong></td>
                                    <td>{stats?.groupMetrics?.[g]?.visits || 0}</td>
                                    <td>{stats?.groupMetrics?.[g]?.quotes || 0}</td>
                                    <td>
                                        <span className="badge badge-success">
                                            {stats?.groupMetrics?.[g]?.converted || 0}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* City Completion Rates */}
                <div className="premium-card">
                    <h3 className="outfit mb-4">📍 Şehir Bazlı Hedef Tamamlama</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {Object.entries(stats?.cityData || {}).map(([id, data]: any) => (
                            <div key={id}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                                    <span style={{ fontWeight: 600 }}>{data.name}</span>
                                    <span style={{ fontSize: "0.85rem", color: "var(--tibcon-gray-dark)" }}>
                                        {data.visits} / {data.target} Ziyaret (%{Math.round(data.rate)})
                                    </span>
                                </div>
                                <div className="progress-container">
                                    <div
                                        className={`progress-bar ${getProgressColor(data.rate)}`}
                                        style={{ width: `${Math.min(data.rate, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {Object.keys(stats?.cityData || {}).length === 0 && (
                            <div className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>
                                Sorumlu olduğunuz şehirlerde bu ay henüz veri bulunmuyor.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
