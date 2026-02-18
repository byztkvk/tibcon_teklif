"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
// Callback arg types are typed as any for cross-version compatibility
import {
    listSalesPoints,
    listVisitPlans,
    listUsers,
    addVisitPlan,
    updateVisitPlanStatus,
    updateVisitPlanDate,
    requestPlanChange,
    resolvePlanChange,
    getSettings,
} from "@/lib/sheets";

// ─── Types ────────────────────────────────────────────────────────────────────
type VisitStatus = "PENDING" | "COMPLETED" | "CANCELLED" | "OFFERED";

type VisitPlan = {
    id: string;
    salesPointId?: string;
    firmaAdi: string;
    sehir: string;
    ilce: string;
    plannedDate: string;
    notes: string;
    status: VisitStatus;
    createdAt: string;
    assignedTo?: string;
    assignedByName?: string;
    creatorId?: string;
    proposedDate?: string;
    proposedNote?: string;
};

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
    VisitStatus,
    { label: string; bg: string; text: string; border: string; dot: string }
> = {
    PENDING: {
        label: "Planlandı",
        bg: "#dbeafe",
        text: "#1e40af",
        border: "#3b82f6",
        dot: "#3b82f6",
    },
    COMPLETED: {
        label: "Yapıldı",
        bg: "#d1fae5",
        text: "#065f46",
        border: "#10b981",
        dot: "#10b981",
    },
    CANCELLED: {
        label: "İptal",
        bg: "#fee2e2",
        text: "#991b1b",
        border: "#ef4444",
        dot: "#ef4444",
    },
    OFFERED: {
        label: "Teklif",
        bg: "#fef3c7",
        text: "#92400e",
        border: "#f59e0b",
        dot: "#f59e0b",
    },
};

function statusToFCColor(status: VisitStatus): string {
    const map: Record<VisitStatus, string> = {
        PENDING: "#3b82f6",
        COMPLETED: "#10b981",
        CANCELLED: "#ef4444",
        OFFERED: "#f59e0b",
    };
    return map[status] ?? "#6b7280";
}

function planToEvent(p: VisitPlan): EventInput {
    return {
        id: p.id,
        title: p.firmaAdi,
        start: p.plannedDate,
        backgroundColor: statusToFCColor(p.status),
        borderColor: statusToFCColor(p.status),
        textColor: "#fff",
        extendedProps: { plan: p },
    };
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VisitPlanningPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<VisitPlan[]>([]);
    const [salesPoints, setSalesPoints] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [session, setSession] = useState<any>(null);
    const [settings, setSettings] = useState<any>({});

    // Agenda / filter state
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilters, setActiveFilters] = useState<Set<VisitStatus>>(
        new Set(["PENDING", "COMPLETED", "CANCELLED", "OFFERED"])
    );

    // Drawer state
    const [drawerPlan, setDrawerPlan] = useState<VisitPlan | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // New Plan Modal state
    const [showModal, setShowModal] = useState(false);
    const [searchFirm, setSearchFirm] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [formDate, setFormDate] = useState("");
    const [formNote, setFormNote] = useState("");
    const [selectedPoint, setSelectedPoint] = useState<any>(null);
    const [selectedRep, setSelectedRep] = useState<string>("");
    const [saving, setSaving] = useState(false);

    // Change Request Modal
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [changeTxId, setChangeTxId] = useState<string | null>(null);
    const [changeDate, setChangeDate] = useState("");
    const [changeNote, setChangeNote] = useState("");

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const [sRes, pRes, spRes, uRes, setRes]: any[] = await Promise.all([
                    Promise.resolve(localStorage.getItem("tibcon_session")),
                    listVisitPlans(),
                    listSalesPoints(),
                    listUsers(),
                    getSettings(),
                ]);
                if (sRes) {
                    const s = JSON.parse(sRes);
                    setSession(s);
                    setSelectedRep(s.email);
                }
                if (pRes?.plans) setPlans(pRes.plans);
                if (spRes?.points) setSalesPoints(spRes.points);
                else if (Array.isArray(spRes)) setSalesPoints(spRes);
                if (uRes?.users) setUsers(uRes.users);
                if (setRes?.settings) setSettings(setRes.settings);
            } catch (e) {
                console.error("Load Error", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────────
    const filteredEvents: EventInput[] = plans
        .filter((p) => activeFilters.has(p.status))
        .filter((p) =>
            searchQuery
                ? p.firmaAdi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sehir.toLowerCase().includes(searchQuery.toLowerCase())
                : true
        )
        .map(planToEvent);

    const agendaPlans = plans
        .filter((p) => p.plannedDate === selectedDate && activeFilters.has(p.status))
        .filter((p) =>
            searchQuery
                ? p.firmaAdi.toLowerCase().includes(searchQuery.toLowerCase())
                : true
        )
        .sort((a, b) => a.firmaAdi.localeCompare(b.firmaAdi));

    const filteredSalesPoints = searchFirm
        ? salesPoints
            .filter((p) => {
                const name = (p.FirmaAdi || p["Firma Adı"] || "").toLowerCase();
                return name.includes(searchFirm.toLowerCase());
            })
            .slice(0, 10)
        : [];

    // ── Handlers ──────────────────────────────────────────────────────────────
    const toggleFilter = (status: VisitStatus) => {
        setActiveFilters((prev) => {
            const next = new Set(prev);
            if (next.has(status)) next.delete(status);
            else next.add(status);
            return next;
        });
    };

    const openDrawer = (plan: VisitPlan) => {
        setDrawerPlan(plan);
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        setTimeout(() => setDrawerPlan(null), 300);
    };

    const handleEventClick = useCallback((info: any) => {
        const plan = info.event.extendedProps.plan as VisitPlan;
        openDrawer(plan);
    }, []);

    const handleDateClick = useCallback((info: any) => {
        setSelectedDate(info.dateStr);
        setFormDate(info.dateStr);
    }, []);

    const handleEventDrop = useCallback(
        async (info: any) => {
            const plan = info.event.extendedProps.plan as VisitPlan;
            const newDate = info.event.startStr.slice(0, 10);

            // Optimistic update
            setPlans((prev) =>
                prev.map((p) => (p.id === plan.id ? { ...p, plannedDate: newDate } : p))
            );

            try {
                const res: any = await updateVisitPlanDate({ id: plan.id, plannedDate: newDate });
                if (!res?.ok) throw new Error(res?.message || "Güncelleme başarısız");
            } catch (e) {
                console.error("EventDrop error", e);
                // Revert optimistic update
                setPlans((prev) =>
                    prev.map((p) => (p.id === plan.id ? { ...p, plannedDate: plan.plannedDate } : p))
                );
                info.revert();
                alert("Tarih güncellenemedi, lütfen tekrar deneyin.");
            }
        },
        []
    );

    const savePlan = async () => {
        if (!selectedPoint || !formDate) {
            alert("Lütfen bir firma ve tarih seçin.");
            return;
        }
        setSaving(true);
        const isManager =
            session?.role === "region_manager" || session?.role === "admin";

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
            assignedByName: isManager
                ? users.find((u) => u.email === selectedRep)?.displayName || selectedRep
                : undefined,
            creatorId: session?.email,
        };

        setPlans((prev) => [...prev, newPlan]);

        try {
            const res: any = await addVisitPlan(newPlan);
            if (!res?.ok) throw new Error(res?.message || "Kayıt başarısız");
            setShowModal(false);
            setSearchFirm("");
            setFormNote("");
            setSelectedPoint(null);
        } catch (e) {
            console.error("Save Error", e);
            alert("Plan kaydedilemedi! Lütfen tekrar deneyin.");
            setPlans((prev) => prev.filter((p) => p.id !== newPlan.id));
        } finally {
            setSaving(false);
        }
    };

    const deletePlan = async (id: string) => {
        if (!confirm("Planı silmek istediğinize emin misiniz?")) return;
        setPlans((prev) => prev.filter((p) => p.id !== id));
        closeDrawer();
        try {
            await updateVisitPlanStatus({ id, status: "CANCELLED" });
        } catch (e) {
            console.error(e);
        }
    };

    const completePlan = (plan: VisitPlan) => {
        if (plan.assignedTo && plan.assignedTo !== session?.email) {
            alert(`Bu planı sadece atanan kişi (${plan.assignedTo}) tamamlayabilir.`);
            return;
        }
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
            const res: any = await requestPlanChange({
                id: changeTxId,
                newDate: changeDate,
                note: changeNote,
            });
            if (!res?.ok) throw new Error(res?.message);
            setPlans((prev) =>
                prev.map((p) =>
                    p.id === changeTxId
                        ? { ...p, proposedDate: changeDate, proposedNote: changeNote }
                        : p
                )
            );
            setShowChangeModal(false);
            setChangeDate("");
            setChangeNote("");
            setChangeTxId(null);
            alert("Talebiniz yöneticiye iletildi.");
        } catch (e: any) {
            alert("Talep hatası: " + e.message);
        }
    };

    const handleResolveChange = async (
        plan: VisitPlan,
        decision: "APPROVED" | "REJECTED"
    ) => {
        if (
            !confirm(
                `Bu talebi ${decision === "APPROVED" ? "ONAYLAMAK" : "REDDETMEK"} istediğinize emin misiniz?`
            )
        )
            return;
        try {
            const res: any = await resolvePlanChange({ id: plan.id, decision });
            if (!res?.ok) throw new Error(res?.message);
            setPlans((prev) =>
                prev.map((p) => {
                    if (p.id !== plan.id) return p;
                    if (decision === "APPROVED") {
                        return {
                            ...p,
                            plannedDate: p.proposedDate!,
                            notes: p.notes + ` [Değişiklik: ${p.proposedNote}]`,
                            proposedDate: undefined,
                            proposedNote: undefined,
                        };
                    }
                    return { ...p, proposedDate: undefined, proposedNote: undefined };
                })
            );
        } catch (e: any) {
            alert("İşlem hatası: " + e.message);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <div style={{ textAlign: "center" }}>
                    <div className="fc-spinner" />
                    <p style={{ marginTop: "1rem", color: "#6b7280" }}>Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container vp-root">
            {/* ── Header ── */}
            <div className="vp-header">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="tibcon-btn tibcon-btn-outline"
                        style={{ marginBottom: "0.5rem", fontSize: "0.8rem", padding: "4px 10px" }}
                    >
                        ← Geri Dön
                    </button>
                    <h1 className="title-xl outfit">
                        Ziyaret <span style={{ color: "var(--tibcon-red)" }}>Planlama</span>
                    </h1>
                    <p className="text-muted" style={{ marginTop: "0.25rem" }}>
                        Müşteri ziyaretlerinizi planlayın ve takip edin.
                    </p>
                </div>
                <button
                    className="tibcon-btn tibcon-btn-primary"
                    onClick={() => {
                        setFormDate(selectedDate);
                        setShowModal(true);
                    }}
                    style={{ alignSelf: "flex-end", gap: "0.5rem" }}
                >
                    <span style={{ fontSize: "1.2rem", fontWeight: 700 }}>+</span> Ziyaret Ekle
                </button>
            </div>

            {/* ── Main Grid ── */}
            <div className="vp-grid">
                {/* ── Calendar ── */}
                <div className="vp-calendar-card">
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        locale="tr"
                        firstDay={1}
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,listWeek",
                        }}
                        buttonText={{
                            today: "Bugün",
                            month: "Ay",
                            week: "Hafta",
                            list: "Liste",
                        }}
                        events={filteredEvents}
                        editable={true}
                        droppable={true}
                        dayMaxEvents={3}
                        moreLinkText={(n) => `+${n} daha`}
                        eventClick={handleEventClick}
                        dateClick={handleDateClick}
                        eventDrop={handleEventDrop}
                        height="auto"
                        eventDisplay="block"
                        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                        dayHeaderFormat={{ weekday: "short" }}
                        titleFormat={{ year: "numeric", month: "long" }}
                        eventContent={(arg) => {
                            const plan = arg.event.extendedProps.plan as VisitPlan;
                            const cfg = STATUS_CONFIG[plan?.status] || STATUS_CONFIG.PENDING;
                            return (
                                <div
                                    style={{
                                        background: cfg.bg,
                                        color: cfg.text,
                                        borderLeft: `3px solid ${cfg.border}`,
                                        padding: "2px 5px",
                                        borderRadius: "4px",
                                        fontSize: "0.72rem",
                                        fontWeight: 600,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        cursor: "pointer",
                                        width: "100%",
                                    }}
                                    title={arg.event.title}
                                >
                                    {arg.event.title}
                                </div>
                            );
                        }}
                    />
                </div>

                {/* ── Agenda Sidebar ── */}
                <div className="vp-sidebar">
                    {/* Search */}
                    <div className="vp-search-wrap">
                        <span className="vp-search-icon">🔍</span>
                        <input
                            className="vp-search-input"
                            placeholder="Firma veya şehir ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Status Filters */}
                    <div className="vp-filters">
                        {(Object.keys(STATUS_CONFIG) as VisitStatus[]).map((s) => {
                            const cfg = STATUS_CONFIG[s];
                            const active = activeFilters.has(s);
                            return (
                                <button
                                    key={s}
                                    onClick={() => toggleFilter(s)}
                                    style={{
                                        background: active ? cfg.bg : "#f3f4f6",
                                        color: active ? cfg.text : "#9ca3af",
                                        border: `1px solid ${active ? cfg.border : "transparent"}`,
                                        borderRadius: "20px",
                                        padding: "4px 10px",
                                        fontSize: "0.72rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            background: active ? cfg.dot : "#d1d5db",
                                            display: "inline-block",
                                        }}
                                    />
                                    {cfg.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Date Header */}
                    <div className="vp-agenda-date">
                        <span className="vp-agenda-date-label">
                            {new Date(selectedDate + "T00:00:00").toLocaleDateString("tr-TR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </span>
                        <span className="vp-agenda-count">{agendaPlans.length} ziyaret</span>
                    </div>

                    {/* Agenda List */}
                    <div className="vp-agenda-list">
                        {agendaPlans.length === 0 ? (
                            <div className="vp-empty">
                                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📅</div>
                                <div>Bu tarihte ziyaret yok</div>
                                <button
                                    className="tibcon-btn tibcon-btn-primary"
                                    style={{ marginTop: "1rem", fontSize: "0.85rem", padding: "8px 16px" }}
                                    onClick={() => {
                                        setFormDate(selectedDate);
                                        setShowModal(true);
                                    }}
                                >
                                    + Ziyaret Ekle
                                </button>
                            </div>
                        ) : (
                            agendaPlans.map((p) => {
                                const cfg = STATUS_CONFIG[p.status];
                                return (
                                    <div
                                        key={p.id}
                                        className="vp-agenda-card"
                                        onClick={() => openDrawer(p)}
                                        style={{ borderLeft: `4px solid ${cfg.border}` }}
                                    >
                                        <div className="vp-agenda-card-top">
                                            <div className="vp-agenda-firma">{p.firmaAdi}</div>
                                            <span
                                                style={{
                                                    background: cfg.bg,
                                                    color: cfg.text,
                                                    borderRadius: "12px",
                                                    padding: "2px 8px",
                                                    fontSize: "0.68rem",
                                                    fontWeight: 700,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <div className="vp-agenda-meta">
                                            📍 {p.sehir}{p.ilce ? ` / ${p.ilce}` : ""}
                                        </div>
                                        {p.notes && (
                                            <div className="vp-agenda-notes">{p.notes}</div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Drawer ── */}
            {drawerPlan && (
                <>
                    <div
                        className={`vp-drawer-overlay ${drawerOpen ? "open" : ""}`}
                        onClick={closeDrawer}
                    />
                    <div className={`vp-drawer ${drawerOpen ? "open" : ""}`}>
                        <div className="vp-drawer-header">
                            <div>
                                <div
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        background: STATUS_CONFIG[drawerPlan.status].bg,
                                        color: STATUS_CONFIG[drawerPlan.status].text,
                                        borderRadius: "20px",
                                        padding: "3px 10px",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: STATUS_CONFIG[drawerPlan.status].dot,
                                        }}
                                    />
                                    {STATUS_CONFIG[drawerPlan.status].label}
                                </div>
                                <h2 className="outfit" style={{ margin: 0, fontSize: "1.3rem" }}>
                                    {drawerPlan.firmaAdi}
                                </h2>
                            </div>
                            <button className="vp-drawer-close" onClick={closeDrawer}>
                                ✕
                            </button>
                        </div>

                        <div className="vp-drawer-body">
                            <div className="vp-detail-row">
                                <span className="vp-detail-label">📅 Tarih</span>
                                <span className="vp-detail-value">
                                    {new Date(drawerPlan.plannedDate + "T00:00:00").toLocaleDateString("tr-TR", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </span>
                            </div>
                            <div className="vp-detail-row">
                                <span className="vp-detail-label">📍 Konum</span>
                                <span className="vp-detail-value">
                                    {drawerPlan.sehir}
                                    {drawerPlan.ilce ? ` / ${drawerPlan.ilce}` : ""}
                                </span>
                            </div>
                            {drawerPlan.assignedTo && (
                                <div className="vp-detail-row">
                                    <span className="vp-detail-label">👤 Atanan</span>
                                    <span className="vp-detail-value">
                                        {users.find((u) => u.email === drawerPlan.assignedTo)?.displayName ||
                                            drawerPlan.assignedTo}
                                    </span>
                                </div>
                            )}
                            {drawerPlan.assignedByName && (
                                <div className="vp-detail-row">
                                    <span className="vp-detail-label">🏷️ Atayan</span>
                                    <span className="vp-detail-value">{drawerPlan.assignedByName}</span>
                                </div>
                            )}
                            {drawerPlan.notes && (
                                <div className="vp-detail-notes">
                                    <div className="vp-detail-label" style={{ marginBottom: "0.5rem" }}>
                                        📝 Notlar
                                    </div>
                                    <div className="vp-detail-notes-text">{drawerPlan.notes}</div>
                                </div>
                            )}

                            {/* Pending Change Request */}
                            {drawerPlan.proposedDate && (
                                <div className="vp-change-request">
                                    <div style={{ fontWeight: 700, color: "#b45309", marginBottom: "6px" }}>
                                        ⚠️ Değişiklik Talebi
                                    </div>
                                    <div style={{ fontSize: "0.85rem" }}>
                                        <strong>Yeni Tarih:</strong>{" "}
                                        {new Date(drawerPlan.proposedDate + "T00:00:00").toLocaleDateString("tr-TR")}
                                    </div>
                                    <div style={{ fontSize: "0.85rem" }}>
                                        <strong>Sebep:</strong> {drawerPlan.proposedNote}
                                    </div>
                                    {(session?.role === "region_manager" || session?.role === "admin") && (
                                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                                            <button
                                                onClick={() => handleResolveChange(drawerPlan, "APPROVED")}
                                                style={{
                                                    flex: 1,
                                                    background: "#10b981",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    padding: "8px",
                                                    cursor: "pointer",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                ✓ Onayla
                                            </button>
                                            <button
                                                onClick={() => handleResolveChange(drawerPlan, "REJECTED")}
                                                style={{
                                                    flex: 1,
                                                    background: "#ef4444",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    padding: "8px",
                                                    cursor: "pointer",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                ✗ Reddet
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Drawer Actions */}
                        <div className="vp-drawer-actions">
                            {drawerPlan.status === "PENDING" &&
                                (!drawerPlan.assignedTo || drawerPlan.assignedTo === session?.email) && (
                                    <button
                                        className="tibcon-btn tibcon-btn-primary"
                                        style={{ flex: 1 }}
                                        onClick={() => {
                                            closeDrawer();
                                            completePlan(drawerPlan);
                                        }}
                                    >
                                        ✓ Ziyaret Giriş Yap
                                    </button>
                                )}

                            {drawerPlan.status === "PENDING" &&
                                drawerPlan.assignedTo &&
                                drawerPlan.assignedTo !== session?.email &&
                                !drawerPlan.proposedDate &&
                                session?.role !== "region_manager" &&
                                session?.role !== "admin" && (
                                    <button
                                        className="tibcon-btn tibcon-btn-outline"
                                        style={{ flex: 1 }}
                                        onClick={() => {
                                            setChangeTxId(drawerPlan.id);
                                            setChangeDate("");
                                            setChangeNote("");
                                            setShowChangeModal(true);
                                        }}
                                    >
                                        📅 Değişiklik Talep Et
                                    </button>
                                )}

                            {(session?.role === "region_manager" ||
                                session?.role === "admin" ||
                                (settings.allowRepDeletePlan === true ||
                                    settings.allowRepDeletePlan === "true")) && (
                                    <button
                                        className="tibcon-btn tibcon-btn-outline"
                                        style={{ color: "#ef4444", borderColor: "#ef4444" }}
                                        onClick={() => deletePlan(drawerPlan.id)}
                                    >
                                        🗑️
                                    </button>
                                )}
                        </div>
                    </div>
                </>
            )}

            {/* ── Change Request Modal ── */}
            {showChangeModal && (
                <div className="modal-overlay" onClick={() => setShowChangeModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="outfit" style={{ marginTop: 0 }}>
                            Plan Değişiklik Talebi
                        </h3>
                        <div style={{ marginBottom: "1rem" }}>
                            <label className="vp-label">Talep Edilen Yeni Tarih</label>
                            <input
                                type="date"
                                value={changeDate}
                                onChange={(e) => setChangeDate(e.target.value)}
                                className="vp-input"
                            />
                        </div>
                        <div style={{ marginBottom: "1.5rem" }}>
                            <label className="vp-label">Değişiklik Sebebi</label>
                            <textarea
                                value={changeNote}
                                onChange={(e) => setChangeNote(e.target.value)}
                                className="vp-input"
                                rows={3}
                                placeholder="Neden tarih değiştirmek istiyorsunuz?"
                            />
                        </div>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button
                                onClick={() => setShowChangeModal(false)}
                                className="tibcon-btn tibcon-btn-outline"
                                style={{ flex: 1 }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleRequestChange}
                                className="tibcon-btn tibcon-btn-primary"
                                style={{ flex: 1 }}
                            >
                                Talebi Gönder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── New Plan Modal ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="outfit" style={{ marginTop: 0 }}>
                            Yeni Ziyaret Planla
                        </h2>

                        <div style={{ marginBottom: "1rem" }}>
                            <label className="vp-label">Ziyaret Tarihi</label>
                            <input
                                type="date"
                                value={formDate}
                                onChange={(e) => setFormDate(e.target.value)}
                                className="vp-input"
                            />
                        </div>

                        {(session?.role === "region_manager" || session?.role === "admin") && (
                            <div style={{ marginBottom: "1rem" }}>
                                <label className="vp-label">
                                    Atanacak Personel{" "}
                                    <span style={{ color: "var(--tibcon-red)", fontSize: "0.8rem" }}>
                                        (Yönetici)
                                    </span>
                                </label>
                                <select
                                    className="vp-input"
                                    value={selectedRep}
                                    onChange={(e) => setSelectedRep(e.target.value)}
                                >
                                    <option value={session?.email}>
                                        {session?.displayName} (Kendim)
                                    </option>
                                    {users
                                        .filter((u) => {
                                            if (session.role === "admin") return true;
                                            const repRegion = (u.region || "").trim().toLowerCase();
                                            const managerRegions = (session.region || "")
                                                .split(",")
                                                .map((r: string) => r.trim().toLowerCase());
                                            return (
                                                managerRegions.includes(repRegion) ||
                                                managerRegions.some((mr: string) => repRegion.includes(mr))
                                            );
                                        })
                                        .filter((u) => u.email !== session?.email)
                                        .map((u) => (
                                            <option key={u.id || u.email} value={u.email}>
                                                {u.displayName || u.email}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        <div style={{ marginBottom: "1rem", position: "relative" }}>
                            <label className="vp-label">Firma Seçimi</label>
                            {selectedPoint ? (
                                <div
                                    style={{
                                        padding: "10px",
                                        background: "rgba(227,6,19,0.08)",
                                        borderRadius: "10px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        color: "var(--tibcon-red)",
                                        fontWeight: 700,
                                        border: "1px solid rgba(227,6,19,0.2)",
                                    }}
                                >
                                    {selectedPoint.FirmaAdi || selectedPoint["Firma Adı"]}
                                    <button
                                        onClick={() => {
                                            setSelectedPoint(null);
                                            setSearchFirm("");
                                        }}
                                        style={{
                                            border: "none",
                                            background: "none",
                                            fontSize: "1.2rem",
                                            cursor: "pointer",
                                            color: "var(--tibcon-red)",
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        placeholder="Firma adı ara..."
                                        value={searchFirm}
                                        onChange={(e) => {
                                            setSearchFirm(e.target.value);
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        className="vp-input"
                                    />
                                    {showDropdown && searchFirm && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: "100%",
                                                left: 0,
                                                right: 0,
                                                background: "white",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "10px",
                                                boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                                                maxHeight: "200px",
                                                overflowY: "auto",
                                                zIndex: 10,
                                            }}
                                        >
                                            {filteredSalesPoints.length > 0 ? (
                                                filteredSalesPoints.map((p, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => {
                                                            setSelectedPoint(p);
                                                            setShowDropdown(false);
                                                        }}
                                                        style={{
                                                            padding: "10px 14px",
                                                            borderBottom: "1px solid #f3f4f6",
                                                            cursor: "pointer",
                                                        }}
                                                        onMouseEnter={(e) =>
                                                            (e.currentTarget.style.background = "#f9fafb")
                                                        }
                                                        onMouseLeave={(e) =>
                                                            (e.currentTarget.style.background = "white")
                                                        }
                                                    >
                                                        <div style={{ fontWeight: 700 }}>
                                                            {p.FirmaAdi || p["Firma Adı"]}
                                                        </div>
                                                        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                                                            {p.Sehir || p["Şehir"]} / {p.ilce || p["İlçe"]}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div
                                                    style={{
                                                        padding: "1rem",
                                                        fontSize: "0.9rem",
                                                        color: "#6c757d",
                                                        textAlign: "center",
                                                    }}
                                                >
                                                    Sonuç bulunamadı.
                                                    <br />
                                                    <a
                                                        href="/visits/points/new"
                                                        style={{
                                                            color: "var(--tibcon-red)",
                                                            fontWeight: 700,
                                                            textDecoration: "underline",
                                                        }}
                                                    >
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
                            <label className="vp-label">Plan Notları</label>
                            <textarea
                                value={formNote}
                                onChange={(e) => setFormNote(e.target.value)}
                                className="vp-input"
                                rows={3}
                                placeholder="Ziyaret sebebi, hedefler vb..."
                            />
                        </div>

                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button
                                onClick={() => setShowModal(false)}
                                className="tibcon-btn tibcon-btn-outline"
                                style={{ flex: 1 }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={savePlan}
                                className="tibcon-btn tibcon-btn-primary"
                                style={{ flex: 1 }}
                                disabled={saving}
                            >
                                {saving ? "Kaydediliyor..." : "Planı Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Scoped Styles ── */}
            <style jsx global>{`
        /* FullCalendar overrides */
        .fc .fc-toolbar-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e2124;
        }
        .fc .fc-button {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          color: #374151 !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          font-size: 0.8rem !important;
          padding: 5px 12px !important;
          box-shadow: none !important;
          transition: all 0.2s !important;
        }
        .fc .fc-button:hover {
          background: #f3f4f6 !important;
          border-color: #d1d5db !important;
        }
        .fc .fc-button-active,
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background: var(--tibcon-red) !important;
          border-color: var(--tibcon-red) !important;
          color: white !important;
        }
        .fc .fc-daygrid-day-number {
          font-weight: 700;
          color: #374151;
          font-size: 0.85rem;
        }
        .fc .fc-day-today {
          background: rgba(227, 6, 19, 0.04) !important;
        }
        .fc .fc-day-today .fc-daygrid-day-number {
          background: var(--tibcon-red);
          color: white;
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fc .fc-col-header-cell-cushion {
          font-weight: 700;
          font-size: 0.8rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .fc .fc-daygrid-more-link {
          font-size: 0.7rem;
          font-weight: 600;
          color: #6b7280;
        }
        .fc .fc-event {
          border: none !important;
          border-radius: 4px !important;
          cursor: pointer !important;
        }
        .fc .fc-list-event:hover td {
          background: #f9fafb;
        }
        .fc .fc-list-day-cushion {
          background: #f3f4f6 !important;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #f0f0f0 !important;
        }
        .fc-theme-standard .fc-scrollgrid {
          border-color: #e5e7eb !important;
        }

        /* Spinner */
        .fc-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f4f6;
          border-top-color: var(--tibcon-red);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Layout */
        .vp-root { }
        .vp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .vp-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
          align-items: start;
        }
        .vp-calendar-card {
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.07);
          padding: 1.25rem;
          overflow: hidden;
        }
        .vp-sidebar {
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.07);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: sticky;
          top: 1rem;
          max-height: calc(100vh - 2rem);
          overflow: hidden;
        }

        /* Search */
        .vp-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .vp-search-icon {
          position: absolute;
          left: 12px;
          font-size: 0.9rem;
          pointer-events: none;
        }
        .vp-search-input {
          width: 100%;
          padding: 9px 12px 9px 36px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
          background: #f9fafb;
        }
        .vp-search-input:focus {
          border-color: var(--tibcon-red);
          background: white;
        }

        /* Filters */
        .vp-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        /* Agenda */
        .vp-agenda-date {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #f0f0f0;
        }
        .vp-agenda-date-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #374151;
          font-family: 'Outfit', sans-serif;
        }
        .vp-agenda-count {
          font-size: 0.72rem;
          background: #f3f4f6;
          color: #6b7280;
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 600;
        }
        .vp-agenda-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-right: 2px;
        }
        .vp-agenda-list::-webkit-scrollbar { width: 4px; }
        .vp-agenda-list::-webkit-scrollbar-track { background: transparent; }
        .vp-agenda-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }

        .vp-agenda-card {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #f0f0f0;
          background: #fafafa;
          cursor: pointer;
          transition: all 0.2s;
          border-left-width: 4px;
        }
        .vp-agenda-card:hover {
          background: white;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          transform: translateX(2px);
        }
        .vp-agenda-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 4px;
        }
        .vp-agenda-firma {
          font-weight: 700;
          font-size: 0.875rem;
          color: #1e2124;
          line-height: 1.3;
        }
        .vp-agenda-meta {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 2px;
        }
        .vp-agenda-notes {
          font-size: 0.75rem;
          color: #9ca3af;
          font-style: italic;
          margin-top: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .vp-empty {
          text-align: center;
          color: #9ca3af;
          font-size: 0.875rem;
          padding: 2rem 1rem;
        }

        /* Drawer */
        .vp-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0);
          z-index: 200;
          pointer-events: none;
          transition: background 0.3s;
        }
        .vp-drawer-overlay.open {
          background: rgba(0,0,0,0.4);
          pointer-events: all;
        }
        .vp-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 420px;
          max-width: 95vw;
          background: white;
          box-shadow: -8px 0 40px rgba(0,0,0,0.15);
          z-index: 201;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }
        .vp-drawer.open {
          transform: translateX(0);
        }
        .vp-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.5rem;
          border-bottom: 1px solid #f0f0f0;
        }
        .vp-drawer-close {
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          font-size: 0.9rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .vp-drawer-close:hover {
          background: #e5e7eb;
          color: #374151;
        }
        .vp-drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .vp-drawer-actions {
          padding: 1rem 1.5rem;
          border-top: 1px solid #f0f0f0;
          display: flex;
          gap: 0.75rem;
        }
        .vp-detail-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .vp-detail-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .vp-detail-value {
          font-size: 0.95rem;
          color: #1e2124;
          font-weight: 500;
        }
        .vp-detail-notes {
          background: #f9fafb;
          border-radius: 10px;
          padding: 12px;
          border: 1px solid #f0f0f0;
        }
        .vp-detail-notes-text {
          font-size: 0.875rem;
          color: #374151;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .vp-change-request {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 10px;
          padding: 12px;
        }

        /* Form */
        .vp-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
          color: #374151;
        }
        .vp-input {
          width: 100%;
          padding: 0.7rem 1rem;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
          resize: vertical;
        }
        .vp-input:focus {
          border-color: var(--tibcon-red);
          box-shadow: 0 0 0 3px rgba(227,6,19,0.08);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 300;
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

        /* Responsive */
        @media (max-width: 1024px) {
          .vp-grid {
            grid-template-columns: 1fr;
          }
          .vp-sidebar {
            position: static;
            max-height: none;
          }
        }
        @media (max-width: 640px) {
          .vp-header {
            flex-direction: column;
          }
          .vp-drawer {
            width: 100%;
          }
          .modal-content {
            padding: 1.5rem;
          }
        }
      `}</style>
        </div>
    );
}
