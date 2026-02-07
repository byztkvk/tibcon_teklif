"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { listVisits, listUsers } from "@/lib/sheets";
import * as XLSX from "xlsx";
import AuthGate from "../components/AuthGate";

export default function ReportsPage() {
    return (
        <AuthGate allowedRoles={["region_manager", "admin"]}>
            <ReportsContent />
        </AuthGate>
    );
}

function ReportsContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Data
    const [visits, setVisits] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [session, setSession] = useState<any>(null);

    // Filters
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().slice(0, 10)); // First day of current month
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10)); // Today
    const [selectedRep, setSelectedRep] = useState("ALL");

    // Initial Load
    useEffect(() => {
        const load = async () => {
            try {
                // Session
                const sRaw = localStorage.getItem("tibcon_session");
                const s = sRaw ? JSON.parse(sRaw) : null;
                setSession(s);

                // Fetch Data Parallel
                const [vRes, uRes] = await Promise.all([
                    listVisits(),
                    listUsers()
                ]);

                if (vRes?.visits) setVisits(vRes.visits);
                if (uRes?.users) setUsers(uRes.users);

            } catch (e) {
                console.error("Load Error", e);
                alert("Veriler yüklenirken hata oluştu.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Filter Logic
    const filteredVisits = useMemo(() => {
        if (!session) return [];

        let data = visits;

        // 1. Filter: Date Range
        if (startDate && endDate) {
            data = data.filter(v => {
                const d = v.ZiyaretTarih || ""; // YYYY-MM-DD
                return d >= startDate && d <= endDate;
            });
        }

        // 2. Filter: Region & Role
        if (session.role === "admin") {
            // Admin sees all, unless rep selected
        } else if (session.role === "region_manager") {
            const managerRegions = (session.region || "").toLowerCase().split(",").map((r: string) => r.trim());

            // Filter users first to know who belongs to this manager
            // But easier: check if visit region matches OR visit rep matches user list

            data = data.filter(v => {
                const visitRegion = (v.Bölge || "").toLowerCase();
                // Simple check: Is visit in one of manager's regions?
                const regionMatch = managerRegions.some((mr: string) => visitRegion.includes(mr));
                return regionMatch;
            });
        } else {
            // Regular user shouldn't be here, but just in case
            return [];
        }

        // 3. Filter: Selected Rep
        if (selectedRep !== "ALL") {
            data = data.filter(v => v.SatisPersoneliEmail === selectedRep);
        }

        return data;
    }, [visits, session, startDate, endDate, selectedRep]);

    // Export Excel
    const handleDownloadExcel = () => {
        if (filteredVisits.length === 0) {
            alert("İndirilecek veri bulunamadı.");
            return;
        }
        setGenerating(true);
        setTimeout(() => {
            try {
                // Prepare Data for Excel
                const exportData = filteredVisits.map(v => ({
                    "Tarih": v.ZiyaretTarih,
                    "Firma": v.FirmaAdi,
                    "Şehir": v.İl,
                    "İlçe": v.İlçe,
                    "Ziyaret Eden": v.SatisPersoneli,
                    "Ziyaret Notu": v.ZiyaretNot,
                    "Yetkili": v.YetkiliKisi,
                    "Bölge": v.Bölge
                }));

                const worksheet = XLSX.utils.json_to_sheet(exportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Ziyaret Raporu");

                // Adjust column widths
                const wscols = [
                    { wch: 12 }, // Date
                    { wch: 30 }, // Firm
                    { wch: 15 }, // City
                    { wch: 15 }, // District
                    { wch: 20 }, // Rep
                    { wch: 50 }, // Note
                    { wch: 20 }, // Person
                    { wch: 15 }  // Region
                ];
                worksheet['!cols'] = wscols;

                XLSX.writeFile(workbook, `Ziyaret_Raporu_${startDate}_${endDate}.xlsx`);
            } catch (e) {
                console.error("Excel Error", e);
                alert("Excel oluşturulurken hata oluştu.");
            } finally {
                setGenerating(false);
            }
        }, 100);
    };

    // Get Reps for Dropdown
    const availableReps = useMemo(() => {
        if (!session || !users.length) return [];
        if (session.role === "admin") return users;

        // For managers, filter users in their regions AND with role='sales' or 'region_manager'
        // Actually, just showing all users in their region is good.
        const managerRegions = (session.region || "").toLowerCase().split(",").map((r: string) => r.trim());
        return users.filter(u => {
            const uRegion = (u.region || "").toLowerCase();
            return managerRegions.some((mr: string) => uRegion.includes(mr));
        });
    }, [users, session]);

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <div>
                    <h1 className="title-xl outfit">Ziyaret <span style={{ color: "var(--tibcon-red)" }}>Raporları</span></h1>
                    <p className="text-muted">Bölge ziyaretlerini filtreleyin ve Excel olarak indirin.</p>
                </div>
            </div>

            <div className="premium-card">
                {/* FILTERS */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Başlangıç Tarihi</label>
                        <input
                            type="date"
                            className="premium-input"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Bitiş Tarihi</label>
                        <input
                            type="date"
                            className="premium-input"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Satış Personeli</label>
                        <select
                            className="premium-input"
                            value={selectedRep}
                            onChange={e => setSelectedRep(e.target.value)}
                        >
                            <option value="ALL">Tümü</option>
                            {availableReps.map(u => (
                                <option key={u.id || u.email} value={u.email}>{u.displayName || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button
                            onClick={handleDownloadExcel}
                            disabled={generating || filteredVisits.length === 0}
                            className="tibcon-btn tibcon-btn-primary w-full"
                            style={{ background: "#217346" }} // Excel Green
                        >
                            {generating ? "Hazırlanıyor..." : "📊 Excel İndir"}
                        </button>
                    </div>
                </div>

                {/* SUMMARY */}
                <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#666" }}>
                    Toplam <strong>{filteredVisits.length}</strong> ziyaret listeleniyor.
                </div>

                {/* TABLE PREVIEW */}
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee", textAlign: "left" }}>
                                <th style={{ padding: "10px" }}>Tarih</th>
                                <th style={{ padding: "10px" }}>Firma</th>
                                <th style={{ padding: "10px" }}>Şehir / İlçe</th>
                                <th style={{ padding: "10px" }}>Personel</th>
                                <th style={{ padding: "10px" }}>Not</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVisits.length > 0 ? (
                                filteredVisits.slice(0, 50).map((v, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "10px" }}>{v.ZiyaretTarih}</td>
                                        <td style={{ padding: "10px", fontWeight: 600 }}>{v.FirmaAdi}</td>
                                        <td style={{ padding: "10px" }}>{v.İl} / {v.İlçe}</td>
                                        <td style={{ padding: "10px" }}>{v.SatisPersoneli}</td>
                                        <td style={{ padding: "10px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.ZiyaretNot}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
                                        Kriterlere uygun kayıt bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {filteredVisits.length > 50 && (
                        <div style={{ textAlign: "center", padding: "1rem", color: "#888", fontStyle: "italic" }}>
                            ... ve {filteredVisits.length - 50} kayıt daha (Tümünü görmek için Excel indirin)
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                .premium-input {
                    width: 100%;
                    padding: 0.6rem;
                    border-radius: 8px;
                    border: 1px solid var(--tibcon-border);
                    font-size: 0.9rem;
                    outline: none;
                }
                .premium-input:focus {
                    border-color: var(--tibcon-red);
                }
            `}</style>
        </div>
    );
}
