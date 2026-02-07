"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { listSalesPoints, listVisitPlans, listUsers, addVisitPlan, updateVisitPlanStatus, requestPlanChange, resolvePlanChange, getSettings } from "@/lib/sheets";

type VisitPlan = {
    id: string;
    salesPointId?: string;
    firmaAdi: string;
    sehir: string;
    ilce: string;
    plannedDate: string; // YYYY-MM-DD
    notes: string;
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    createdAt: string;
    assignedTo?: string; // Email of the rep
    assignedByName?: string; // Name of the manager who assigned
    creatorId?: string;
    proposedDate?: string;
    proposedNote?: string;
};

const PLANS_KEY = "tibcon_plans";

export default function VisitPlanningPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<VisitPlan[]>([]);
    const [salesPoints, setSalesPoints] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [session, setSession] = useState<any>(null);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [searchFirm, setSearchFirm] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [formDate, setFormDate] = useState("");
    const [formNote, setFormNote] = useState("");
    const [selectedPoint, setSelectedPoint] = useState<any>(null);
    const [selectedRep, setSelectedRep] = useState<string>("");

    // Change Request Modal State
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [changeTxId, setChangeTxId] = useState<string | null>(null);
    const [changeDate, setChangeDate] = useState("");
    const [changeNote, setChangeNote] = useState("");

    const [settings, setSettings] = useState<any>({});

    // Initial Load
    useEffect(() => {
        const load = async () => {
            try {
                // Parallel load for performance
                const [sRes, pRes, spRes, uRes, setRes]: any[] = await Promise.all([
                    // Session is local but let's emulate async structure if needed, or just do it
                    Promise.resolve(localStorage.getItem("tibcon_session")),
                    listVisitPlans(),
                    listSalesPoints(),
                    listUsers(),
                    getSettings()
                ]);

                // Session
                if (sRes) {
                    const s = JSON.parse(sRes);
                    setSession(s);
                    setSelectedRep(s.email);
                }

                // Plans
                if (pRes?.plans) setPlans(pRes.plans);

                // Points
                if (spRes?.points) setSalesPoints(spRes.points);
                else if (Array.isArray(spRes)) setSalesPoints(spRes);

                // Users
                if (uRes?.users) setUsers(uRes.users);

                // Settings
                if (setRes?.settings) setSettings(setRes.settings);

            } catch (e) {
                console.error("Load Error", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredPoints = useMemo(() => {
        if (!searchFirm) return [];
        const lower = searchFirm.toLowerCase();
        return salesPoints.filter(p => {
            const name = (p.FirmaAdi || p["Firma Adı"] || "").toLowerCase();
            return name.includes(lower);
        }).slice(0, 10);
    }, [salesPoints, searchFirm]);

    const savePlan = async () => {
        if (!selectedPoint || !formDate) {
            alert("Lütfen bir firma ve tarih seçin.");
            return;
        }

        const isManager = session?.role === "region_manager" || session?.role === "admin";

        const newPlan: VisitPlan = {
            id: crypto.randomUUID(),
            salesPointId: selectedPoint.id || "",
            firmaAdi: selectedPoint.FirmaAdi || selectedPoint["Firma Adı"],
            sehir: selectedPoint.Sehir || selectedPoint["Şehir"] || "",
            ilce: selectedPoint.ilce || selectedPoint["İlçe"] || "",
            plannedDate: formDate,
            notes: formNote,
            status: "PENDING",
            createdAt: new Date().toISOString(),
            assignedTo: selectedRep || session?.email,
            assignedByName: isManager ? (users.find(u => u.email === selectedRep)?.displayName || selectedRep) : undefined,
            creatorId: session?.email
        };

        const updated = [...plans, newPlan];
        setPlans(updated);

        try {
            const res: any = await addVisitPlan(newPlan);
            if (!res || !res.ok) {
                throw new Error(res?.message || "Kayıt başarısız");
            }
        } catch (e) {
            console.error("Save Error", e);
            alert("Plan kaydedilemedi! Lütfen tekrar deneyin.");
            // Revert optimistic update
            setPlans(plans);
            return;
        }

        // Reset and Close
        setShowModal(false);
        setSearchFirm("");
        setFormNote("");
        setSelectedPoint(null);
    };

    const deletePlan = async (id: string) => {
        if (!confirm("Planı silmek istediğinize emin misiniz?")) return;

        // Optimistic
        const updated = plans.filter(p => p.id !== id);
        setPlans(updated);

        try {
            await updateVisitPlanStatus({ id, status: "CANCELLED" });
        } catch (e) {
            console.error(e);
        }
    };

    const completePlan = (plan: VisitPlan) => {
        // PERMISSION CHECK:
        // If plan is assigned to someone else, current user cannot complete it.
        if (plan.assignedTo && plan.assignedTo !== session?.email) {
            alert(`Bu planı sadece atanan kişi (${plan.assignedTo}) tamamlayabilir.`);
            return;
        }

        // Redirect to New Visit page with pre-filled data
        const params = new URLSearchParams();
        params.set("planId", plan.id);
        params.set("firma", plan.firmaAdi);
        params.set("tarih", plan.plannedDate);
        router.push(`/visits/new?${params.toString()}`);
    };

    const handleRequestChange = async () => {
        if (!changeTxId || !changeDate || !changeNote) {
            alert("Lütfen yeni tarih ve açıklama giriniz.");
            return;
        }

        try {
            const res: any = await requestPlanChange({ id: changeTxId, newDate: changeDate, note: changeNote });
            if (!res || !res.ok) throw new Error(res?.message);
            // Optimistic update
            setPlans(prev => prev.map(p => p.id === changeTxId ? { ...p, proposedDate: changeDate, proposedNote: changeNote } : p));
            setShowChangeModal(false);
            setChangeDate("");
            setChangeNote("");
            setChangeTxId(null);
            alert("Talebiniz yöneticiye iletildi.");
        } catch (e: any) {
            alert("Talep hatası: " + e.message);
        }
    };

    const handleResolveChange = async (plan: VisitPlan, decision: "APPROVED" | "REJECTED") => {
        if (!confirm(`Bu talebi ${decision === "APPROVED" ? "ONAYLAMAK" : "REDDETMEK"} istediğinize emin misiniz?`)) return;

        try {
            const res: any = await resolvePlanChange({ id: plan.id, decision });
            if (!res || !res.ok) throw new Error(res?.message);

            setPlans(prev => prev.map(p => {
                if (p.id !== plan.id) return p;
                if (decision === "APPROVED") {
                    return {
                        ...p,
                        plannedDate: p.proposedDate!,
                        notes: p.notes + ` [Değişiklik: ${p.proposedNote}]`,
                        proposedDate: undefined,
                        proposedNote: undefined
                    };
                } else {
                    return { ...p, proposedDate: undefined, proposedNote: undefined };
                }
            }));
        } catch (e: any) {
            alert("İşlem hatası: " + e.message);
        }
    };

    // Calendar Helpers
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => {
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Mon=0
    };

    const monthName = new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const renderCalendar = () => {
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);

        const grid = [];
        // Empty slots
        for (let i = 0; i < startDay; i++) {
            grid.push(<div key={`empty-${i}`} style={{ background: "#f8f9fa" }}></div>);
        }

        // Days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = new Date().toISOString().slice(0, 10) === dateStr;
            const dayPlans = plans.filter(p => p.plannedDate === dateStr && p.status !== "CANCELLED");

            grid.push(
                <div
                    key={d}
                    onClick={() => {
                        setFormDate(dateStr);
                        setShowModal(true);
                    }}
                    className="calendar-cell"
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "white"}
                >
                    <div className="calendar-date-header">
                        <span>{d}</span>
                        {isToday && <span className="today-badge">BUGÜN</span>}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {dayPlans.map(p => {
                            const isAssigned = p.creatorId && p.assignedTo && p.creatorId !== p.assignedTo;
                            return (
                                <div
                                    key={p.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        completePlan(p);
                                    }}
                                    className={`plan-pill ${p.status === "COMPLETED" ? "completed" : isAssigned ? "assigned" : "pending"}`}
                                >
                                    {isAssigned && <span style={{ fontSize: "0.6rem", background: "#3b82f6", color: "white", padding: "0 2px", borderRadius: "2px", marginRight: "2px" }}>A</span>}
                                    {p.status === "COMPLETED" && "✅"} {p.firmaAdi}
                                </div>
                            );
                        })}
                    </div>

                    <div className="add-btn-overlay">+</div>
                </div>
            );
        }
        return grid;
    };

    return (
        <div className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <div>
                    <button onClick={() => router.back()} className="tibcon-btn tibcon-btn-outline" style={{ marginBottom: "1rem" }}>
                        ← Geri Dön
                    </button>
                    <h1 className="title-xl outfit">Ziyaret <span style={{ color: "var(--tibcon-red)" }}>Planlama</span></h1>
                    <p className="text-muted">Müşteri ziyaretlerinizi aylık olarak planlayın ve takip edin.</p>
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                    <button title="Önceki Ay" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="tibcon-btn tibcon-btn-outline">◀</button>
                    <h2 className="outfit" style={{ margin: 0, width: "200px", textAlign: "center" }}>{monthName} {year}</h2>
                    <button title="Sonraki Ay" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="tibcon-btn tibcon-btn-outline">▶</button>
                </div>
            </div>

            <div className="planning-grid">
                {/* CALENDAR */}
                <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
                    <div className="calendar-header-row">
                        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(d => (
                            <div key={d} className="calendar-day-name">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="calendar-body-grid">
                        {renderCalendar()}
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="premium-card sidebar-card">
                    <h3 className="outfit" style={{ marginTop: 0 }}>Yaklaşan Planlar</h3>
                    <div className="sidebar-list">
                        {plans.filter(p => p.status === "PENDING").length === 0 ? (
                            <div style={{ textAlign: "center", color: "#999", padding: "2rem" }}>
                                Planlanmış ziyaretiniz yok.
                            </div>
                        ) : plans.filter(p => p.status === "PENDING").sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)).map(p => {
                            const isAssigned = p.creatorId && p.assignedTo && p.creatorId !== p.assignedTo;
                            const assignerName = users.find(u => u.email === p.creatorId)?.displayName || p.creatorId;

                            return (
                                <div key={p.id} className="plan-item">
                                    <div style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600 }}>{new Date(p.plannedDate).toLocaleDateString("tr-TR")}</div>
                                    <div style={{ fontWeight: 700, color: "var(--tibcon-anth)", margin: "4px 0" }}>{p.firmaAdi}</div>
                                    <div style={{ fontSize: "0.85rem", color: "#666" }}>{p.sehir} / {p.ilce}</div>
                                    {p.notes && <div style={{ fontSize: "0.8rem", color: "#999", marginTop: "4px", fontStyle: "italic" }}>"{p.notes}"</div>}
                                    {isAssigned && (
                                        <div style={{ fontSize: "0.75rem", color: "#3b82f6", marginTop: "4px", fontWeight: 500 }}>
                                            📅 {assignerName} tarafından {new Date(p.createdAt).toLocaleDateString("tr-TR")} tarihinde atandı.
                                        </div>
                                    )}

                                    <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexDirection: "column" }}>
                                        {/* Status / Request Info for Managers */}
                                        {(session?.role === "region_manager" || session?.role === "admin") && p.proposedDate && (
                                            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", padding: "8px", borderRadius: "8px", fontSize: "0.8rem" }}>
                                                <div style={{ fontWeight: 700, color: "#b45309", marginBottom: "4px" }}>⚠️ DEĞİŞİKLİK TALEBİ</div>
                                                <div><strong>Yeni Tarih:</strong> {new Date(p.proposedDate).toLocaleDateString("tr-TR")}</div>
                                                <div><strong>Sebep:</strong> {p.proposedNote}</div>
                                                <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
                                                    <button onClick={() => handleResolveChange(p, "APPROVED")} style={{ flex: 1, background: "#10b981", color: "white", border: "none", borderRadius: "4px", padding: "4px", cursor: "pointer" }}>Onayla ve Değiştir</button>
                                                    <button onClick={() => handleResolveChange(p, "REJECTED")} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: "4px", padding: "4px", cursor: "pointer" }}>Reddet</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Pending Request Indicator for Reps */}
                                        {p.proposedDate && session?.role !== "region_manager" && session?.role !== "admin" && (
                                            <div style={{ background: "#eff6ff", color: "#1e40af", padding: "6px", borderRadius: "6px", fontSize: "0.8rem", textAlign: "center", border: "1px solid #dbeafe" }}>
                                                ⏳ Tarih değişikliği onayı bekleniyor ({new Date(p.proposedDate).toLocaleDateString("tr-TR")})
                                            </div>
                                        )}

                                        <div style={{ display: "flex", gap: "8px" }}>
                                            {(!p.assignedTo || p.assignedTo === session?.email) ? (
                                                <button
                                                    onClick={() => completePlan(p)}
                                                    style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "none", background: "var(--tibcon-red)", color: "white", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                                                >
                                                    Giriş Yap
                                                </button>
                                            ) : (
                                                <div style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #ddd", background: "#f1f3f5", color: "#999", fontSize: "0.8rem", textAlign: "center" }}>
                                                    🔒 {p.assignedTo} bekliyor
                                                </div>
                                            )}

                                            {/* Delete or Request Change */}
                                            {(!isAssigned && p.status === "PENDING") ? (
                                                <button
                                                    onClick={() => deletePlan(p.id)}
                                                    style={{ padding: "6px", borderRadius: "6px", border: "1px solid #eee", background: "white", color: "#999", cursor: "pointer" }}
                                                    title="Planı Sil"
                                                >
                                                    🗑️
                                                </button>
                                            ) : (p.status === "PENDING" && !p.proposedDate && session?.role !== "region_manager" && session?.role !== "admin") ? (
                                                <>
                                                    {/* Allow Delete IF Enabled in Settings */}
                                                    {(settings.allowRepDeletePlan === true || settings.allowRepDeletePlan === "true") && (
                                                        <button
                                                            onClick={() => deletePlan(p.id)}
                                                            style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ef4444", background: "white", color: "#ef4444", cursor: "pointer", marginRight: "5px" }}
                                                            title="Planı Sil (Admin İzni)"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            setChangeTxId(p.id);
                                                            setChangeDate("");
                                                            setChangeNote("");
                                                            setShowChangeModal(true);
                                                        }}
                                                        style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #3b82f6", background: "white", color: "#3b82f6", cursor: "pointer", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                                                        title="Tarih Değişikliği Talep Et"
                                                    >
                                                        📅 Değişiklik Talep Et
                                                    </button>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* CHANGE REQUEST MODAL */}
            {showChangeModal && (
                <div className="modal-overlay" onClick={() => setShowChangeModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 className="outfit" style={{ marginTop: 0 }}>Plan Değişiklik Talebi</h3>

                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Talep Edilen Yeni Tarih</label>
                            <input
                                type="date"
                                value={changeDate}
                                onChange={e => setChangeDate(e.target.value)}
                                className="premium-input"
                            />
                        </div>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Değişiklik Sebebi</label>
                            <textarea
                                value={changeNote}
                                onChange={e => setChangeNote(e.target.value)}
                                className="premium-input"
                                rows={3}
                                placeholder="Neden tarih değiştirmek istiyorsunuz?"
                            />
                        </div>

                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button onClick={() => setShowChangeModal(false)} className="tibcon-btn tibcon-btn-outline" style={{ flex: 1 }}>İptal</button>
                            <button onClick={handleRequestChange} className="tibcon-btn tibcon-btn-primary" style={{ flex: 1 }}>Talebi Gönder</button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW PLAN MODAL */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 className="outfit" style={{ marginTop: 0 }}>Yeni Ziyaret Planla</h2>

                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Ziyaret Tarihi</label>
                            <input
                                type="date"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                                className="premium-input"
                            />
                        </div>

                        {/* Manager Selection */}
                        {(session?.role === "region_manager" || session?.role === "admin") && (
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                                    Atanacak Personel <span style={{ color: "var(--tibcon-red)", fontSize: "0.8rem" }}>(Yönetici)</span>
                                </label>
                                <select
                                    className="premium-input"
                                    value={selectedRep}
                                    onChange={e => setSelectedRep(e.target.value)}
                                >
                                    <option value={session?.email}>{session?.displayName} (Kendim)</option>
                                    {users.filter(u => {
                                        if (session.role === "admin") return true;
                                        const repRegion = (u.region || "").trim().toLowerCase();
                                        const managerRegions = (session.region || "").split(",").map((r: string) => r.trim().toLowerCase());
                                        // If user has mult regions (unlikely for rep but possible), check overlap
                                        // Usually rep has 1 region.
                                        return managerRegions.includes(repRegion) || managerRegions.some((mr: string) => repRegion.includes(mr));
                                    }).filter(u => u.email !== session?.email).map(u => (
                                        <option key={u.id || u.email} value={u.email}>
                                            {u.displayName || u.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ marginBottom: "1rem", position: "relative" }}>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Firma Seçimi</label>
                            {selectedPoint ? (
                                <div style={{
                                    padding: "10px", background: "rgba(227, 6, 19, 0.1)", borderRadius: "8px",
                                    display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--tibcon-red)", fontWeight: 700
                                }}>
                                    {selectedPoint.FirmaAdi || selectedPoint["Firma Adı"]}
                                    <button onClick={() => { setSelectedPoint(null); setSearchFirm(""); }} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--tibcon-red)" }}>×</button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        placeholder="Firma adı ara..."
                                        value={searchFirm}
                                        onChange={e => { setSearchFirm(e.target.value); setShowDropdown(true); }}
                                        onFocus={() => setShowDropdown(true)}
                                        className="premium-input"
                                    />
                                    {showDropdown && searchFirm && (
                                        <div style={{
                                            position: "absolute", top: "100%", left: 0, right: 0, background: "white",
                                            border: "1px solid #eee", borderRadius: "8px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
                                            maxHeight: "200px", overflowY: "auto", zIndex: 10
                                        }}>
                                            {filteredPoints.length > 0 ? filteredPoints.map((p, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => { setSelectedPoint(p); setShowDropdown(false); }}
                                                    style={{ padding: "10px", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "white"}
                                                >
                                                    <div style={{ fontWeight: 700 }}>{p.FirmaAdi || p["Firma Adı"]}</div>
                                                    <div style={{ fontSize: "0.8rem", color: "#666" }}>{p.Sehir || p["Şehir"]} / {p.ilce || p["İlçe"]}</div>
                                                </div>
                                            )) : (
                                                <div style={{ padding: "1rem", fontSize: "0.9rem", color: "#6c757d", textAlign: "center" }}>
                                                    Sonuç bulunamadı.<br />
                                                    <a href="/visits/points/new" style={{ color: "var(--tibcon-red)", fontWeight: 700, textDecoration: "underline" }}>
                                                        + Yeni Firma Ekle
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Plan Notları</label>
                            <textarea
                                value={formNote}
                                onChange={e => setFormNote(e.target.value)}
                                className="premium-input"
                                rows={3}
                                placeholder="Ziyaret sebebi, hedefler vb..."
                            />
                        </div>

                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button onClick={() => setShowModal(false)} className="tibcon-btn tibcon-btn-outline" style={{ flex: 1 }}>İptal</button>
                            <button onClick={savePlan} className="tibcon-btn tibcon-btn-primary" style={{ flex: 1 }}>Planı Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .premium-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    border: 1px solid var(--tibcon-border);
                    font-size: 1rem;
                    outline: none;
                }
                .premium-input:focus {
                    border-color: var(--tibcon-red);
                }
                .add-btn-overlay {
                    position: absolute;
                    bottom: 4px;
                    right: 4px;
                    width: 24px;
                    height: 24px;
                    background: #eee;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #999;
                    font-size: 1.2rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                div:hover > .add-btn-overlay {
                    opacity: 1;
                }

                /* GRID LAYOUTS */
                .planning-grid {
                    display: grid;
                    gridTemplateColumns: 3fr 1fr;
                    gap: 2rem;
                    alignItems: start;
                }
                
                .calendar-header-row {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    background: #eee;
                    gap: 1px;
                    border-bottom: 1px solid #eee;
                }
                .calendar-day-name {
                    padding: 12px;
                    text-align: center;
                    font-weight: 700;
                    font-size: 0.8rem;
                    color: #666;
                    background: #f8f9fa;
                }
                
                .calendar-body-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    background: #eee;
                    gap: 1px;
                }

                .sidebar-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    max-height: 500px;
                    overflow-y: auto;
                }

                .plan-item {
                    padding: 1rem;
                    border-radius: 12px;
                    border: 1px solid #eee;
                    background: #fcfcfc;
                }

                /* MODAL */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    padding: 1rem;
                }
                .modal-content {
                    background: white;
                    width: 100%;
                    max-width: 500px;
                    border-radius: 20px;
                    padding: 2rem;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.2);
                    max-height: 90vh;
                    overflow-y: auto;
                }

                /* CALENDAR GRID ITEMS */
                .calendar-cell {
                    min-height: 120px;
                    background: white;
                    border: 1px solid #eee;
                    padding: 8px;
                    position: relative;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .calendar-date-header {
                    font-weight: 700;
                    margin-bottom: 4px;
                    display: flex;
                    justify-content: space-between;
                    color: #495057;
                }
                .today-badge {
                    font-size: 0.6rem;
                    background: var(--tibcon-red);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                
                .plan-pill {
                    font-size: 0.7rem;
                    padding: 2px 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    border-left-width: 2px;
                    border-left-style: solid;
                }
                .plan-pill.completed {
                    background: #d1fae5; color: #065f46; border-left-color: #10b981;
                }
                .plan-pill.assigned {
                    background: rgba(37, 99, 235, 0.1); color: #1e40af; border-left-color: #3b82f6;
                }
                .plan-pill.pending {
                    background: rgba(227, 6, 19, 0.1); color: var(--tibcon-red); border-left-color: var(--tibcon-red);
                }

                /* MOBILE RESPONSIVE */
                @media (max-width: 768px) {
                    .planning-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                    .calendar-day-name {
                        padding: 2px;
                        font-size: 0.65rem;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .calendar-cell {
                        min-height: 70px; /* Reduced specific height for mobile */
                        padding: 2px;
                    }
                    .calendar-date-header {
                        font-size: 0.8rem;
                        margin-bottom: 2px;
                    }
                    .today-badge {
                        padding: 1px 3px;
                        font-size: 0.55rem;
                    }
                    .plan-pill {
                        font-size: 0.6rem;
                        padding: 1px 2px;
                    }
                    /* Calendar Cell Styles Override via global or targeted class would be ideal, 
                       but since inline styles are used above, we might rely on the viewport changes 
                       and some shrinking here if possible, or just accept the grid squeezes. 
                       Actually, let's fix the inline styles in renderCalendar to be classes effectively? 
                       No, I'll just rely on the general shrinking 
                       and Ensure the container doesn't overflow */
                    
                    .premium-card {
                        border-radius: 8px; /* Smaller radius */
                    }
                }
            `}</style>
        </div>
    );
}
