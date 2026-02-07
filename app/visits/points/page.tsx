"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { listSalesPoints } from "@/lib/sheets";

export default function SalesPointsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [points, setPoints] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [usersMap, setUsersMap] = useState<Record<string, any>>({});

    useEffect(() => {
        const raw = localStorage.getItem("tibcon_session");
        if (raw) setSession(JSON.parse(raw));

        // Load Users for Region Mapping
        try {
            const rawUsers = localStorage.getItem("tibcon_users");
            if (rawUsers) {
                const us = JSON.parse(rawUsers);
                const map: Record<string, any> = {};
                if (Array.isArray(us)) {
                    us.forEach((u: any) => { map[u.email.trim().toLowerCase()] = u; });
                }
                setUsersMap(map);
            }
        } catch (e) {
            console.error("Users load error", e);
        }

        const fetchPoints = async () => {
            try {
                const res: any = await listSalesPoints();
                if (res?.points) {
                    setPoints(res.points);
                } else if (res?.data?.points) {
                    setPoints(res.data.points);
                }
            } catch (error) {
                console.error("Points fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPoints();
    }, []);

    const filteredPoints = useMemo(() => {
        let list = points;
        const role = session?.role;
        const email = session?.email ? session.email.toLowerCase() : "";
        const region = session?.region;

        if (role === "sales") {
            // Sales Rep sees only their own points (Sales Rep Email matches)
            list = list.filter(p => (p.FirmaEmail || "").toLowerCase() === email);
        } else if (role === "region_manager") {

        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter(p =>
                (p.FirmaAdi || "").toLowerCase().includes(lower) ||
                (p.Sehir || "").toLowerCase().includes(lower) ||
                (p.Yetkili || "").toLowerCase().includes(lower)
            );
        }
        return list;
    }, [points, searchTerm, session]);

    return (
        <div className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <button onClick={() => router.push("/")} className="tibcon-btn tibcon-btn-outline" style={{ marginBottom: "1rem" }}>
                        ← Ana Sayfa
                    </button>
                    <h1 className="title-xl outfit">Satış Noktaları</h1>
                    <p className="text-muted">Müşteri ve bayi veritabanı.</p>
                </div>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                        <input
                            type="text"
                            placeholder="Firma Ara..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                padding: "0.75rem 1rem", borderRadius: "10px",
                                border: "1px solid #ddd", width: "250px", fontSize: "0.9rem"
                            }}
                        />
                    </div>

                    <button onClick={() => router.push("/visits/points/new")} className="tibcon-btn tibcon-btn-primary">
                        + Cari Ekle
                    </button>
                </div>
            </div>

            <div className="premium-card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table className="premium-table responsive-table">
                        <thead>
                            <tr>
                                <th>Firma Adı</th>
                                <th>Lokasyon</th>
                                <th>Yetkili</th>
                                <th>İletişim</th>
                                <th>Statü</th>
                                {session?.role !== "sales" && <th>Sorumlu</th>}
                                <th style={{ textAlign: "right" }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center" }}>Yükleniyor...</td></tr>
                            ) : filteredPoints.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#666" }}>Kayıt bulunamadı.</td></tr>
                            ) : (
                                filteredPoints.map((p, i) => (
                                    <tr key={i}>
                                        <td data-label="Firma Adı">
                                            <div style={{ fontWeight: 700 }}>{p.FirmaAdi}</div>
                                            {p.VergiNo && <div style={{ fontSize: "0.75rem", color: "#888" }}>VN: {p.VergiNo}</div>}
                                        </td>
                                        <td data-label="Lokasyon">{p.Sehir} / {p.ilce}</td>
                                        <td data-label="Yetkili">
                                            <div>{p.Yetkili}</div>
                                        </td>
                                        <td data-label="İletişim">
                                            {p.Telefon && <div>📞 {p.Telefon}</div>}
                                            {p.YetkiliEmail && <div style={{ fontSize: "0.8rem", color: "#666" }}>✉️ {p.YetkiliEmail}</div>}
                                        </td>
                                        <td data-label="Statü">
                                            <span className="badge" style={{
                                                background: p.FirmaStatu?.startsWith("1.GRUP") ? "rgba(25, 135, 84, 0.1)" :
                                                    p.FirmaStatu?.startsWith("2.GRUP") ? "rgba(13, 110, 253, 0.1)" :
                                                        p.FirmaStatu?.startsWith("3.GRUP") ? "rgba(102, 102, 102, 0.1)" : "rgba(0,0,0,0.05)",
                                                color: p.FirmaStatu?.startsWith("1.GRUP") ? "#198754" :
                                                    p.FirmaStatu?.startsWith("2.GRUP") ? "#0d6efd" :
                                                        p.FirmaStatu?.startsWith("3.GRUP") ? "#666" : "#444"
                                            }}>
                                                {p.FirmaStatu || "1.GRUP-BAYİ"}
                                            </span>
                                        </td>
                                        {session?.role !== "sales" && (
                                            <td data-label="Sorumlu" style={{ fontSize: "0.85rem", color: "#666" }}>
                                                {p.SatisPersoneli}
                                            </td>
                                        )}
                                        <td data-label="İşlemler" style={{ textAlign: "right" }}>
                                            <button
                                                onClick={() => router.push(`/agenda?salesPointId=${p.id}`)}
                                                className="tibcon-btn tibcon-btn-outline"
                                                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                            >
                                                📝 Not Ekle
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
