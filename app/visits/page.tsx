"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { listVisits } from "@/lib/sheets";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function VisitsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [visits, setVisits] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedVisit, setSelectedVisit] = useState<any>(null);

    useEffect(() => {
        const raw = localStorage.getItem("tibcon_session");
        if (raw) setSession(JSON.parse(raw));

        const fetchVisits = async () => {
            setLoading(true);
            try {
                const res = await listVisits();
                if (res?.visits) {
                    setVisits(res.visits);
                }
            } catch (error) {
                console.error("Visits fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVisits();
    }, []);

    const filteredVisits = useMemo(() => {
        let list = visits.map(v => ({
            ...v,
            ZiyaretTarih: v.ziyaretTarihi || v.plannedDate || v.ZiyaretTarih,
            FirmaAdi: v.cariUnvan || v.firmaAdi || v.FirmaAdi,
            SatisPersoneli: v.personelAdi || v.satisPersoneli || v.SatisPersoneli,
            Bölge: v.regionId || v.bolge || v.Bölge,
            İl: v.sehir || v.İl || v.Sehir,
            İlçe: v.ilce || v.İlçe,
            YetkiliKisi: v.yetkiliKisi || v.YetkiliKisi || v.Yetkili,
            ZiyaretNotu: v.ziyaretNotu || v.notes || v.ZiyaretNot
        }));

        const role = session?.role;

        // No more email-based strict filtering for sales; the API handles city-based visibility.
        // But we can keep search filter.

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter(v =>
                v.FirmaAdi?.toLowerCase().includes(lower) ||
                v.İl?.toLowerCase().includes(lower) ||
                v.İlçe?.toLowerCase().includes(lower) ||
                v.ZiyaretNotu?.toLowerCase().includes(lower) ||
                v.SatisPersoneli?.toLowerCase().includes(lower)
            );
        }
        return [...list].sort((a, b) => new Date(b.ZiyaretTarih).getTime() - new Date(a.ZiyaretTarih).getTime());
    }, [visits, searchTerm, session]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        try {
            return new Date(dateStr).toLocaleDateString("tr-TR");
        } catch {
            return dateStr;
        }
    };

    // Calendar logic
    const [calendarView, setCalendarView] = useState<"month" | "week">("month");
    const [isMobile, setIsMobile] = useState(false);
    const [selectedDayForDetail, setSelectedDayForDetail] = useState<{ date: Date, visits: any[] } | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Calendar logic
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => {
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // 0 (Mon) to 6 (Sun)
    };

    const getWeekDays = (date: Date) => {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startOfWeek.setDate(diff);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (calendarView === "month") {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setDate(newDate.getDate() - 7);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (calendarView === "month") {
            newDate.setMonth(newDate.getMonth() + 1);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        setCurrentDate(newDate);
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        let daysToRender = [];
        let title = "";

        if (calendarView === "month") {
            const totalDays = daysInMonth(year, month);
            const startDay = firstDayOfMonth(year, month);
            title = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(currentDate);

            // Empty cells for the start
            for (let i = 0; i < startDay; i++) {
                daysToRender.push(<div key={`empty-${i}`} style={{ background: "#fcfcfc", borderRight: "1px solid #eee", borderBottom: "1px solid #eee" }}></div>);
            }

            // Days
            for (let d = 1; d <= totalDays; d++) {
                const dayDate = new Date(year, month, d);
                daysToRender.push(renderDayCell(dayDate));
            }
        } else {
            // Week view
            const weekDays = getWeekDays(currentDate);
            const startStr = new Intl.DateTimeFormat('tr-TR', { month: 'short', day: 'numeric' }).format(weekDays[0]);
            const endStr = new Intl.DateTimeFormat('tr-TR', { month: 'short', day: 'numeric', year: 'numeric' }).format(weekDays[6]);
            title = `${startStr} - ${endStr}`;

            daysToRender = weekDays.map(d => renderDayCell(d));
        }

        return (
            <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <h2 className="outfit" style={{ margin: 0, textTransform: "capitalize", fontSize: isMobile ? "1.2rem" : "1.5rem" }}>{title}</h2>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <div style={{ display: "flex", background: "#f8f9fa", padding: "3px", borderRadius: "8px", border: "1px solid #eee", marginRight: "10px" }}>
                            <button
                                onClick={() => setCalendarView("month")}
                                style={{
                                    padding: "4px 12px", borderRadius: "6px", border: "none",
                                    background: calendarView === "month" ? "white" : "transparent",
                                    color: calendarView === "month" ? "var(--tibcon-red)" : "#666",
                                    fontWeight: 600, cursor: "pointer", boxShadow: calendarView === "month" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                    fontSize: "0.85rem"
                                }}
                            >
                                Aylık
                            </button>
                            <button
                                onClick={() => setCalendarView("week")}
                                style={{
                                    padding: "4px 12px", borderRadius: "6px", border: "none",
                                    background: calendarView === "week" ? "white" : "transparent",
                                    color: calendarView === "week" ? "var(--tibcon-red)" : "#666",
                                    fontWeight: 600, cursor: "pointer", boxShadow: calendarView === "week" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                    fontSize: "0.85rem"
                                }}
                            >
                                Haftalık
                            </button>
                        </div>

                        <button onClick={handlePrev} className="tibcon-btn tibcon-btn-outline" style={{ padding: "0.5rem 0.8rem" }}>←</button>
                        <button onClick={() => setCurrentDate(new Date())} className="tibcon-btn tibcon-btn-outline" style={{ padding: "0.5rem 1rem" }}>Bugün</button>
                        <button onClick={handleNext} className="tibcon-btn tibcon-btn-outline" style={{ padding: "0.5rem 0.8rem" }}>→</button>
                    </div>
                </div>

                <div className="calendar-grid-container" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    border: "1px solid #eee",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#fff",
                }}>
                    {["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"].map(day => (
                        <div key={day} style={{ background: "#f8f9fa", padding: "12px 4px", textAlign: "center", fontWeight: 700, fontSize: isMobile ? "0.65rem" : "0.8rem", color: "#666", borderBottom: "1px solid #eee", borderRight: "1px solid #eee", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {isMobile ? day.substring(0, 3) : day}
                        </div>
                    ))}
                    {daysToRender}
                </div>
            </div>
        );
    };

    const renderDayCell = (date: Date) => {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const dayVisits = filteredVisits.filter(v => {
            const vDate = new Date(v.ZiyaretTarih);
            return vDate.getFullYear() === date.getFullYear() &&
                vDate.getMonth() === date.getMonth() &&
                vDate.getDate() === date.getDate();
        });

        const isToday = new Date().toDateString() === date.toDateString();
        const displayVisits = isMobile ? dayVisits.slice(0, 2) : dayVisits;
        const remaining = dayVisits.length - displayVisits.length;

        return (
            <div key={dateStr} className="day-cell" style={{
                minHeight: calendarView === "week" ? "300px" : (isMobile ? "80px" : "120px"),
                background: isToday ? "#fff8f8" : "white",
                borderRight: "1px solid #eee",
                borderBottom: "1px solid #eee",
                display: "flex",
                flexDirection: "column",
                padding: isMobile ? "4px" : "8px",
                minWidth: 0, // Critical for text-overflow to work in grid
                overflow: "hidden",
                cursor: isMobile ? "pointer" : "default"
            }} onClick={() => isMobile && dayVisits.length > 0 && setSelectedDayForDetail({ date, visits: dayVisits })}>
                <div style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: dayVisits.length > 0 ? "var(--tibcon-red)" : "#adb5bd",
                    marginBottom: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <span style={isToday ? { background: "var(--tibcon-red)", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: isMobile ? "0.7rem" : "0.8rem" } : { fontSize: isMobile ? "0.8rem" : "0.9rem" }}>
                        {date.getDate()}
                    </span>
                    {calendarView === "week" && <span style={{ fontSize: isMobile ? "0.6rem" : "0.75rem", fontWeight: 400, color: "#999", display: isMobile ? "none" : "inline" }}>{date.toLocaleDateString("tr-TR", { weekday: 'short' })}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "2px" : "4px", overflowY: "hidden", flex: 1 }}>
                    {displayVisits.map((v, i) => (
                        <div
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVisit(v);
                            }}
                            style={{
                                background: "rgba(180, 0, 0, 0.08)",
                                color: "var(--tibcon-red)",
                                fontSize: isMobile ? "0.65rem" : "0.75rem",
                                padding: isMobile ? "2px 4px" : "4px 8px",
                                borderRadius: "4px",
                                fontWeight: 700,
                                borderLeft: "3px solid var(--tibcon-red)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                cursor: "pointer",
                                lineHeight: "1.2"
                            }}
                            title={`${v.FirmaAdi} - ${v.SatisPersoneli}`}
                        >
                            {v.FirmaAdi}
                        </div>
                    ))}
                    {remaining > 0 && (
                        <div
                            style={{
                                fontSize: isMobile ? "0.6rem" : "0.7rem",
                                color: "#666",
                                textAlign: "center",
                                cursor: "pointer",
                                padding: "2px",
                                background: "#f0f0f0",
                                borderRadius: "4px"
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDayForDetail({ date, visits: dayVisits });
                            }}
                        >
                            +{remaining} daha
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <button onClick={() => router.push("/")} className="tibcon-btn tibcon-btn-outline" style={{ marginBottom: "1rem" }}>
                        ← Ana Sayfa
                    </button>
                    <h1 className="title-xl outfit">Ziyaretlerim</h1>
                    <p className="text-muted">Tibcon kurumsal ziyaret takip ve takvim sistemi.</p>
                </div>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div style={{ display: "flex", background: "#f0f0f0", padding: "4px", borderRadius: "10px" }}>
                        <button
                            style={{
                                padding: "6px 16px", borderRadius: "8px", border: "none",
                                background: viewMode === "calendar" ? "white" : "transparent",
                                color: viewMode === "calendar" ? "var(--tibcon-red)" : "#666",
                                fontWeight: 700, cursor: "pointer", boxShadow: viewMode === "calendar" ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
                            }}
                            onClick={() => setViewMode("calendar")}
                        >
                            📅 Takvim
                        </button>
                        <button
                            style={{
                                padding: "6px 16px", borderRadius: "8px", border: "none",
                                background: viewMode === "list" ? "white" : "transparent",
                                color: viewMode === "list" ? "var(--tibcon-red)" : "#666",
                                fontWeight: 700, cursor: "pointer", boxShadow: viewMode === "list" ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
                            }}
                            onClick={() => setViewMode("list")}
                        >
                            📋 Liste
                        </button>
                    </div>

                    <div style={{ position: "relative" }}>
                        <input
                            type="text"
                            placeholder="Filtrele..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                padding: "0.75rem 1rem", borderRadius: "10px",
                                border: "1px solid #ddd", width: "200px", fontSize: "0.9rem"
                            }}
                        />
                    </div>

                    <button onClick={() => router.push("/visits/new")} className="tibcon-btn tibcon-btn-primary">
                        + Yeni Ziyaret
                    </button>
                </div>
            </div>

            <div className="premium-card" style={{ padding: viewMode === "calendar" ? "2rem" : "0", overflow: "visible" }}>
                {loading ? (
                    <div style={{ padding: "4rem", textAlign: "center" }}>Veriler yükleniyor...</div>
                ) : filteredVisits.length === 0 && !searchTerm ? (
                    <div style={{ padding: "4rem", textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚗</div>
                        <h3 className="outfit">Henüz ziyaret kaydı yok</h3>
                        <p className="text-muted">Sahadaki çalışmalarınızı kayıt altına alarak başlayın.</p>
                    </div>
                ) : (
                    viewMode === "calendar" ? renderCalendar() : (
                        <div style={{ overflowX: "auto" }}>
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Firma</th>
                                        <th>Konum</th>
                                        <th>Personel</th>
                                        <th>Yetkili</th>
                                        <th>Not</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVisits.map((v, idx) => (
                                        <tr key={idx} onClick={() => setSelectedVisit(v)} style={{ cursor: "pointer" }}>
                                            <td style={{ fontWeight: 700 }}>{formatDate(v.ZiyaretTarih)}</td>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{v.FirmaAdi}</div>
                                                <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>{v.FirmaStatu || "Müşteri"}</div>
                                            </td>
                                            <td>{v.İl || v.Sehir} / {v.İlçe || v.ilce}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{v.SatisPersoneli}</div>
                                                <div style={{ fontSize: "0.7rem", color: "#666" }}>{v.Bölge}</div>
                                            </td>
                                            <td>{v.YetkiliKisi || v.Yetkili}</td>
                                            <td style={{ maxWidth: "250px", fontSize: "0.85rem" }}>{v.ZiyaretNotu}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
            {/* Visit Detail Modal */}
            {selectedVisit && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center",
                    alignItems: "center", zIndex: 1000, padding: "2rem"
                }} onClick={() => setSelectedVisit(null)}>
                    <div style={{
                        background: "white", borderRadius: "20px", width: "100%", maxWidth: "600px",
                        padding: "2rem", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", position: "relative",
                        animation: "modalFadeUp 0.3s ease-out"
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedVisit(null)}
                            style={{
                                position: "absolute", top: "1rem", right: "1rem", border: "none",
                                background: "#f0f0f0", width: "32px", height: "32px", borderRadius: "50%",
                                cursor: "pointer", fontSize: "1.2rem", color: "#666"
                            }}
                        >×</button>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <div className="badge" style={{ background: "rgba(180, 0, 0, 0.1)", color: "var(--tibcon-red)", marginBottom: "0.5rem", borderRadius: "20px", padding: "4px 12px", fontSize: "0.75rem", fontWeight: 700, display: "inline-block" }}>
                                {selectedVisit.FirmaStatu || "Müşteri"}
                            </div>
                            <h2 className="outfit" style={{ margin: 0, fontSize: "2rem" }}>{selectedVisit.FirmaAdi}</h2>
                            <p style={{ color: "#666", marginTop: "0.5rem" }}>
                                📅 {formatDate(selectedVisit.ZiyaretTarih)} | 📍 {selectedVisit.İl || selectedVisit.Sehir} / {selectedVisit.İlçe || selectedVisit.ilce}
                            </p>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                            <div>
                                <h4 style={{ margin: "0 0 0.5rem 0", color: "#888", fontSize: "0.8rem", textTransform: "uppercase" }}>Ziyaret Eden</h4>
                                <p style={{ margin: 0, fontWeight: 700 }}>{selectedVisit.SatisPersoneli}</p>
                                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: "#666" }}>{selectedVisit.Bölge}</p>
                            </div>
                            <div>
                                <h4 style={{ margin: "0 0 0.5rem 0", color: "#888", fontSize: "0.8rem", textTransform: "uppercase" }}>Görüşülen Yetkili</h4>
                                <p style={{ margin: 0, fontWeight: 700 }}>{selectedVisit.YetkiliKisi || selectedVisit.Yetkili || "-"}</p>
                                {selectedVisit.Telefon && (
                                    <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: "var(--tibcon-red)", fontWeight: 600 }}>
                                        📞 {selectedVisit.Telefon}
                                    </p>
                                )}
                                {selectedVisit.FirmaEmail && (
                                    <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: "#666" }}>
                                        ✉️ {selectedVisit.FirmaEmail}
                                    </p>
                                )}
                            </div>
                        </div>

                        {(selectedVisit.VergiDairesi || selectedVisit.VergiNo || selectedVisit.Adres) && (
                            <div style={{ marginBottom: "2rem", display: "grid", gap: "1rem" }}>
                                {selectedVisit.Adres && (
                                    <div>
                                        <h4 style={{ margin: "0 0 0.4rem 0", color: "#888", fontSize: "0.8rem", textTransform: "uppercase" }}>Adres</h4>
                                        <p style={{ margin: 0, fontSize: "0.9rem" }}>{selectedVisit.Adres}</p>
                                    </div>
                                )}
                                {(selectedVisit.VergiDairesi || selectedVisit.VergiNo) && (
                                    <div style={{ display: "flex", gap: "1.5rem" }}>
                                        {selectedVisit.VergiDairesi && (
                                            <div>
                                                <h4 style={{ margin: "0 0 0.4rem 0", color: "#888", fontSize: "0.8rem", textTransform: "uppercase" }}>V. Dairesi</h4>
                                                <p style={{ margin: 0, fontSize: "0.9rem" }}>{selectedVisit.VergiDairesi}</p>
                                            </div>
                                        )}
                                        {selectedVisit.VergiNo && (
                                            <div>
                                                <h4 style={{ margin: "0 0 0.4rem 0", color: "#888", fontSize: "0.8rem", textTransform: "uppercase" }}>V. No</h4>
                                                <p style={{ margin: 0, fontSize: "0.9rem" }}>{selectedVisit.VergiNo}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "12px", border: "1px solid #eee" }}>
                            <h4 style={{ margin: "0 0 1rem 0", color: "#888", fontSize: "0.8rem", textTransform: "uppercase" }}>Ziyaret Notları</h4>
                            <p style={{ margin: 0, fontSize: "1rem", lineHeight: "1.6", color: "var(--tibcon-anth)" }}>
                                {selectedVisit.ZiyaretNotu}
                            </p>
                        </div>

                        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={() => setSelectedVisit(null)} className="tibcon-btn tibcon-btn-primary">
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Day Details Modal for Mobile */}
            {selectedDayForDetail && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center",
                    alignItems: "center", zIndex: 1000, padding: "2rem"
                }} onClick={() => setSelectedDayForDetail(null)}>
                    <div style={{
                        background: "white", borderRadius: "12px", width: "100%", maxWidth: "400px",
                        maxHeight: "80vh", display: "flex", flexDirection: "column",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.2)", position: "relative",
                        animation: "modalFadeUp 0.3s ease-out"
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: "1rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 className="outfit" style={{ margin: 0 }}>
                                {selectedDayForDetail.date.toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                            </h3>
                            <button onClick={() => setSelectedDayForDetail(null)} style={{ border: "none", background: "none", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
                        </div>
                        <div style={{ padding: "1rem", overflowY: "auto" }}>
                            {selectedDayForDetail.visits.length === 0 ? (
                                <p style={{ textAlign: "center", color: "#666" }}>Kayıtlı ziyaret yok.</p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                    {selectedDayForDetail.visits.map((v, i) => (
                                        <div key={i} onClick={() => { setSelectedDayForDetail(null); setSelectedVisit(v); }} style={{
                                            padding: "10px", borderRadius: "8px", border: "1px solid #eee", background: "#f8f9fa", cursor: "pointer"
                                        }}>
                                            <div style={{ fontWeight: 700, color: "var(--tibcon-anth)", marginBottom: "4px" }}>{v.FirmaAdi}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#666" }}>{v.SatisPersoneli}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#999", marginTop: "4px" }}>{v.İl || v.Sehir} / {v.İlçe || v.ilce}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes modalFadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (max-width: 768px) {
                    .calendar-grid-container {
                        border-radius: 8px;
                    }
                    .premium-card {
                        padding: 1rem !important;
                    }
                }
            `}</style>
            {loading && <LoadingOverlay message="Ziyaret verileri yükleniyor..." />}
        </div>
    );
}
