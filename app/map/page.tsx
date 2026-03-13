"use client";

import React, { useEffect, useState, useMemo } from "react";
import LoadingOverlay from "@/components/LoadingOverlay";

// Note: In a production environment, you'd use a library like react-simple-maps.
// Here, we fetch the GeoJSON and render it using a simple SVG projection.

import { normalizeSehir } from "@/lib/utils";

export default function MapPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
    const [geoData, setGeoData] = useState<any>(null);
    const [selectedCity, setSelectedCity] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"cariler" | "ziyaretler" | "teklifler">("cariler");

    // Tab Data
    const [tabData, setTabData] = useState<any>({ cariler: [], ziyaretler: [], teklifler: [] });
    const [tabLoading, setTabLoading] = useState(false);

    const session = useMemo(() => {
        if (typeof window === "undefined") return {};
        return JSON.parse(localStorage.getItem("tibcon_session") || "{}");
    }, []);

    const isAdmin = session.role === "admin";

    useEffect(() => {
        // Fetch Turkey GeoJSON
        fetch("https://raw.githubusercontent.com/alpers/Turkey-Maps-GeoJSON/master/tr-cities.json")
            .then(res => res.json())
            .then(data => setGeoData(data))
            .catch(err => console.error("GeoJSON load error:", err));
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
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
        if (session.email) fetchStats();
    }, [month, session]);

    const handleCityClick = async (feature: any) => {
        const cityName = feature.properties.name;
        const normalizedName = normalizeSehir(cityName);

        // Search in cityData for the matching key
        const cityStats = stats?.cityData?.[normalizedName] || { visits: 0, target: 0, rate: 0, cariSayisi: 0 };

        setSelectedCity({
            id: normalizedName,
            name: cityName,
            stats: cityStats
        });
        setDrawerOpen(true);
        setActiveTab("cariler");

        fetchCityDetails(normalizedName);
    };

    const fetchCityDetails = async (normalizedCity: string) => {
        setTabLoading(true);
        try {
            // Updated to fetch based on city name matching
            const [caris, visits, quotes] = await Promise.all([
                fetch(`/api/salesPoints?cityId=${normalizedCity}&role=${session.role || ''}`).then(r => r.json()),
                fetch(`/api/visits?cityId=${normalizedCity}&month=${month}&role=${session.role || ''}`).then(r => r.json()),
                fetch(`/api/quotes?cityId=${normalizedCity}&role=${session.role || ''}`).then(r => r.json())
            ]);

            setTabData({
                cariler: caris.data || [],
                ziyaretler: visits.visits || [],
                teklifler: (quotes.quotes || quotes.data || []).filter((q: any) => (q.createdAt || "").startsWith(month))
            });
        } catch (e) {
            console.error(e);
        }
        setTabLoading(false);
    };

    const getCityColor = (name: string) => {
        const normalizedName = normalizeSehir(name);
        const cityEntry = stats?.cityData?.[normalizedName];

        if (!cityEntry || cityEntry.cariSayisi === 0) {
            // No customers or not authorized
            return "#e2e8f0";
        }

        const rate = cityEntry.rate;
        if (rate < 40) return "#ef4444"; // Red
        if (rate < 80) return "#f59e0b"; // Orange
        return "#10b981"; // Green
    };

    // Calculate bounding box for projection
    const projection = useMemo(() => {
        if (!geoData) return null;
        // Simplified lat/long to SVG x/y projection (Turkey is roughly 26-45E, 36-42N)
        const scale = 40;
        const offsetX = -25 * scale;
        const offsetY = 43 * scale;
        return (lon: number, lat: number) => ({
            x: (lon * scale) + offsetX,
            y: (offsetY - (lat * scale)) // Flip Y for SVG
        });
    }, [geoData]);

    if (loading && !stats) return <LoadingOverlay message="Harita verileri hazırlanıyor..." />;

    return (
        <div className="page-container" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h1 className="title-lg outfit">🗺️ Bölgem / Harita</h1>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.8rem", fontWeight: 600 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef4444" }}></div> %0-40</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: 12, height: 12, borderRadius: 2, background: "#f59e0b" }}></div> %40-80</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: 12, height: 12, borderRadius: 2, background: "#10b981" }}></div> %80+</span>
                    </div>
                    <input
                        type="month"
                        className="premium-input"
                        value={month}
                        onChange={e => setMonth(e.target.value)}
                        style={{ padding: "0.5rem", borderRadius: "8px" }}
                    />
                </div>
            </div>

            <div className="premium-card" style={{ padding: 0, overflow: "hidden", height: "calc(100vh - 180px)", background: "#f8fafc", position: "relative" }}>
                {geoData && (
                    <svg viewBox="0 0 850 350" style={{ width: "100%", height: "100%" }}>
                        {geoData.features.map((feature: any, idx: number) => {
                            // Render paths for each city
                            // Note: tr-cities.json features are usually Polygons or MultiPolygons
                            const drawPath = (coords: any) => {
                                return coords.map((ring: any) => {
                                    return ring.map((pt: any, i: number) => {
                                        const p = projection!(pt[0], pt[1]);
                                        return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
                                    }).join(' ') + 'Z';
                                }).join(' ');
                            };

                            let d = "";
                            if (feature.geometry.type === "Polygon") {
                                d = drawPath(feature.geometry.coordinates);
                            } else if (feature.geometry.type === "MultiPolygon") {
                                d = feature.geometry.coordinates.map((poly: any) => drawPath(poly)).join(' ');
                            }

                            return (
                                <path
                                    key={idx}
                                    d={d}
                                    fill={getCityColor(feature.properties.name)}
                                    stroke="white"
                                    strokeWidth="0.5"
                                    style={{ cursor: "pointer", transition: "fill 0.2s" }}
                                    onClick={() => handleCityClick(feature)}
                                >
                                    <title>{feature.properties.name}</title>
                                </path>
                            );
                        })}
                    </svg>
                )}
                {!geoData && <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>Harita yükleniyor...</div>}
            </div>

            {/* Right Drawer */}
            <div className={`drawer ${drawerOpen ? 'open' : ''}`}>
                <div className="drawer-header" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                        <div>
                            <h2 className="outfit" style={{ margin: 0 }}>{selectedCity?.name}</h2>
                            <span style={{ fontSize: "0.85rem", color: "var(--tibcon-gray-dark)" }}>
                                Tamamlama: %{Math.round(selectedCity?.stats?.rate || 0)}
                            </span>
                        </div>
                        <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
                    </div>
                    {/* Debug Info */}
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.5rem", background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", width: "100%" }}>
                        Cari: {selectedCity?.stats?.cariSayisi || 0} |
                        Ziyaret: {tabData.ziyaretler.length} |
                        Teklif: {tabData.teklifler.length} |
                        Key: {selectedCity?.id}
                    </div>
                </div>

                <div className="drawer-content">
                    <div className="tabs">
                        <div className={`tab ${activeTab === 'cariler' ? 'active' : ''}`} onClick={() => setActiveTab('cariler')}>Cariler</div>
                        <div className={`tab ${activeTab === 'ziyaretler' ? 'active' : ''}`} onClick={() => setActiveTab('ziyaretler')}>Ziyaretler</div>
                        <div className={`tab ${activeTab === 'teklifler' ? 'active' : ''}`} onClick={() => setActiveTab('teklifler')}>Teklifler</div>
                    </div>

                    {tabLoading ? <div>Yükleniyor...</div> : (
                        <div>
                            {activeTab === 'cariler' && (
                                <div>
                                    {tabData.cariler.map((c: any) => (
                                        <div key={c.id} className="premium-card" style={{ marginBottom: "1rem", padding: "1rem" }}>
                                            <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{c.name}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#666" }}>Grup: {c.groupName || "-"}</div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "0.8rem" }}>
                                                <span>Son Ziyaret: {c.lastVisitDate || "YOK"}</span>
                                                <span className="badge badge-pending">Grup {c.groupId || "?"}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {tabData.cariler.length === 0 && <p className="text-muted">Bu şehirde kayıtlı cari bulunamadı.</p>}
                                </div>
                            )}

                            {activeTab === 'ziyaretler' && (
                                <div>
                                    {tabData.ziyaretler.map((v: any) => (
                                        <div key={v.id} style={{ borderBottom: "1px solid #eee", padding: "0.75rem 0" }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{v.cariUnvan}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#666" }}>{v.ziyaretTarihi} - {v.personelAdi}</div>
                                            <div style={{ fontSize: "0.8rem", marginTop: "0.25rem", fontStyle: "italic" }}>{v.ziyaretNotu}</div>
                                        </div>
                                    ))}
                                    {tabData.ziyaretler.length === 0 && <p className="text-muted">Bu ay henüz ziyaret yapılmamış.</p>}
                                </div>
                            )}

                            {activeTab === 'teklifler' && (
                                <div>
                                    {tabData.teklifler.map((q: any) => (
                                        <div key={q.id} style={{ borderBottom: "1px solid #eee", padding: "0.75rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{q.cariUnvan}</div>
                                                <div style={{ fontSize: "0.8rem", color: "#666" }}>{q.id} - {q.createdAt.substring(0, 10)}</div>
                                                <div style={{ fontWeight: 600, marginTop: "0.25rem" }}>{q.total} {q.currency}</div>
                                            </div>
                                            <div className={`badge ${q.teklifDurumu === 'SIPARISE_DONUSTU' ? 'badge-success' : 'badge-pending'}`}>
                                                {q.teklifDurumu || "BEKLEMEDE"}
                                            </div>
                                        </div>
                                    ))}
                                    {tabData.teklifler.length === 0 && <p className="text-muted">Bu ay teklif verilmemiş.</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
