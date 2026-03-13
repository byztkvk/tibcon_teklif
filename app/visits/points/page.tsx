"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
// import { listSalesPoints } from "@/lib/sheets"; // Replaced with fetch API

export default function SalesPointsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [points, setPoints] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [usersMap, setUsersMap] = useState<Record<string, any>>({});

    useEffect(() => {
        const raw = localStorage.getItem("tibcon_session");
        if (!raw) {
            router.push("/login");
            return;
        }
        const sess = JSON.parse(raw);
        setSession(sess);

        const fetchPoints = async () => {
            try {
                // Determine user profile for cityIds if needed
                let cityIds = "";
                let regionIds = "";

                const userRes = await fetch("/api/users").then(r => r.json());
                const me = userRes.data?.find((u: any) => u.email === sess.email);

                if (me) {
                    if (me.cityIds) cityIds = me.cityIds.join(",");
                    if (me.regionIds) regionIds = JSON.stringify(me.regionIds);
                }

                const url = `/api/salesPoints?role=${sess.role}&regionId=${sess.region || ""}&regionIds=${regionIds}&cityIds=${cityIds}&ownerEmail=${sess.email}`;
                const res = await fetch(url).then(r => r.json());

                if (res.success) {
                    setPoints(res.data);
                }
            } catch (error) {
                console.error("Points fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPoints();
    }, [router]);

    const filteredPoints = useMemo(() => {
        if (!searchTerm) return points;
        const lower = searchTerm.toLowerCase();
        return points.filter(p =>
            (p.name || "").toLowerCase().includes(lower) ||
            (p.cityName || "").toLowerCase().includes(lower) ||
            (p.authorizedPerson || "").toLowerCase().includes(lower) ||
            (p.district || "").toLowerCase().includes(lower)
        );
    }, [points, searchTerm]);

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
                                    <tr key={p.id}>
                                        <td data-label="Firma Adı">
                                            <div style={{ fontWeight: 700 }}>{p.name}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#888" }}>{p.groupName}</div>
                                        </td>
                                        <td data-label="Lokasyon">{p.cityName} / {p.district}</td>
                                        <td data-label="Yetkili">
                                            <div>{p.authorizedPerson}</div>
                                        </td>
                                        <td data-label="İletişim">
                                            {p.phone && <div>📞 {p.phone}</div>}
                                            {p.email && <div style={{ fontSize: "0.8rem", color: "#666" }}>✉️ {p.email}</div>}
                                        </td>
                                        <td data-label="Adres" style={{ maxWidth: "200px" }}>
                                            <div style={{ fontSize: "0.75rem", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {p.address}
                                            </div>
                                        </td>
                                        {session?.role !== "sales" && (
                                            <td data-label="Bölge" style={{ fontSize: "0.85rem", color: "#666" }}>
                                                {p.regionId}
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
