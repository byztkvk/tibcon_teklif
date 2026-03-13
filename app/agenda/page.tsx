"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listAgenda, saveAgendaItem, deleteAgendaItem, listSalesPoints, AgendaItem } from "@/lib/sheets";
import LoadingOverlay from "@/components/LoadingOverlay";

type ViewMode = "GRID" | "FOLDER";

export default function AgendaPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [session, setSession] = useState<any>(null);
    const [items, setItems] = useState<AgendaItem[]>([]);
    const [salesPoints, setSalesPoints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

    // Navigation State
    const [viewMode, setViewMode] = useState<ViewMode>("GRID");
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // SalesPointId or "GENERAL"

    // Form state (Generic)
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderPointId, setNewFolderPointId] = useState("");

    // Form State (Inside Folder)
    const [formData, setFormData] = useState<Partial<AgendaItem>>({
        type: "NOTE",
        date: new Date().toISOString().split("T")[0],
        content: "",
        status: "OPEN",
    });

    useEffect(() => {
        const s = JSON.parse(localStorage.getItem("tibcon_session") || "null");
        if (!s) {
            router.push("/login");
            return;
        }
        setSession(s);

        const pointId = searchParams.get("salesPointId");
        if (pointId) {
            setActiveFolderId(pointId);
            setViewMode("FOLDER");
        }

        fetchData(s.email, s);
    }, [router, searchParams]);

    async function fetchData(email: string, session: any) {
        setLoading(true);
        setLoadingMessage("Notlar ve görevler yükleniyor...");
        try {
            // Determine user profile for cityIds if needed
            let cityIds = "";
            let regionIdsArr = "";

            const userRes = await fetch("/api/users").then(r => r.json());
            const me = userRes.data?.find((u: any) => u.email === session.email);

            if (me) {
                if (me.cityIds) cityIds = me.cityIds.join(",");
                if (me.regionIds) regionIdsArr = JSON.stringify(me.regionIds);
            }

            const pointsUrl = `/api/salesPoints?role=${session.role}&regionId=${session.region || ""}&regionIds=${regionIdsArr}&cityIds=${cityIds}&ownerEmail=${session.email}`;

            const [agendaRes, pointsResNative] = await Promise.all([
                listAgenda(email),
                fetch(pointsUrl).then(r => r.json())
            ]);

            if (agendaRes) setItems(agendaRes.items);
            if (pointsResNative.success) setSalesPoints(pointsResNative.data);
        } catch (e) {
            setError("Veriler yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
            setLoadingMessage(null);
        }
    }

    // --- FOLDER LOGIC ---

    const folders = useMemo(() => {
        const map = new Map<string, {
            id: string,
            title: string,
            subtitle?: string,
            count: number,
            latestDate?: string,
            type: "CUSTOMER" | "GENERAL"
        }>();

        // 1. Initialize with items
        items.forEach(item => {
            if (item.salesPointId) {
                if (!map.has(item.salesPointId)) {
                    const point = salesPoints.find(p => p.id === item.salesPointId);
                    map.set(item.salesPointId, {
                        id: item.salesPointId,
                        title: point?.name || point?.FirmaAdi || "Bilinmeyen Cari",
                        subtitle: point ? `${point.cityName || point.Sehir || ""} / ${point.district || point.ilce || ""}` : undefined,
                        count: 0,
                        type: "CUSTOMER"
                    });
                }
                const folder = map.get(item.salesPointId)!;
                folder.count++;
                if (!folder.latestDate || item.date > folder.latestDate) {
                    folder.latestDate = item.date;
                }
            } else {
                // General Notes
                if (!map.has("GENERAL")) {
                    map.set("GENERAL", {
                        id: "GENERAL",
                        title: "Genel Notlar",
                        count: 0,
                        type: "GENERAL"
                    });
                }
                const folder = map.get("GENERAL")!;
                folder.count++;
                if (!folder.latestDate || item.date > folder.latestDate) {
                    folder.latestDate = item.date;
                }
            }
        });

        return Array.from(map.values()).sort((a, b) => {
            // General always first, then by date desc
            if (a.type === "GENERAL") return -1;
            if (b.type === "GENERAL") return 1;
            return (b.latestDate || "").localeCompare(a.latestDate || "");
        });
    }, [items, salesPoints]);

    const activeFolderItems = useMemo(() => {
        if (!activeFolderId) return [];
        return items.filter(item => {
            if (activeFolderId === "GENERAL") return !item.salesPointId;
            return item.salesPointId === activeFolderId;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [items, activeFolderId]);

    const activeFolderInfo = useMemo(() => {
        if (!activeFolderId) return null;
        if (activeFolderId === "GENERAL") return { title: "Genel Notlar", subtitle: "Kategorisiz notlar ve görevler." };
        const point = salesPoints.find(p => p.id === activeFolderId);
        if (!point) return { title: "Bilinmeyen Cari", subtitle: "" };

        return {
            title: point.name || point.FirmaAdi || "Bilinmeyen Cari",
            subtitle: `${point.cityName || point.Sehir || ""} / ${point.district || point.ilce || ""} - ${point.authorizedPerson || point.Yetkili || ""}`
        };
    }, [activeFolderId, salesPoints]);

    // --- ACTIONS ---

    async function handleCreateFolder() {
        if (!newFolderPointId) return;

        // Check if exists
        const exists = folders.find(f => f.id === newFolderPointId);
        if (exists) {
            openFolder(newFolderPointId);
            setShowNewFolderModal(false);
            setNewFolderPointId("");
            return;
        }

        // Create initial "Folder Created" note
        setLoadingMessage("Klasör oluşturuluyor...");
        try {
            const point = salesPoints.find(p => p.id === newFolderPointId);
            await saveAgendaItem({
                type: "NOTE",
                date: new Date().toISOString().split("T")[0],
                content: `📁 ${point?.name || point?.FirmaAdi} için klasör oluşturuldu.`,
                status: "OPEN",
                salesPointId: newFolderPointId,
                createdBy: session.email,
                createdAt: new Date().toISOString()
            });
            fetchData(session.email, session);
            openFolder(newFolderPointId);
            setShowNewFolderModal(false);
            setNewFolderPointId("");

        } catch (e) {
            setError("Klasör oluşturulurken hata oluştu.");
        } finally {
            setLoadingMessage(null);
        }
    }

    async function handleSaveNote() {
        if (!formData.content) return;
        setSaving(true);
        try {
            const payload = {
                ...formData,
                salesPointId: activeFolderId === "GENERAL" ? undefined : activeFolderId,
                createdBy: session.email,
                createdAt: new Date().toISOString()
            };
            await saveAgendaItem(payload as any);

            // Reset form but keep date
            setFormData({
                type: "NOTE",
                date: formData.date,
                content: "",
                status: "OPEN"
            });

            fetchData(session.email, session);
        } catch (e) {
            setError("Not kaydedilemedi.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Silmek istediğinize emin misiniz?")) return;
        try {
            await deleteAgendaItem(id);
            fetchData(session.email, session); // Don't await strictly to keep UI snappy, or await if needed
        } catch (e) {
            alert("Silinemedi.");
        }
    }

    async function toggleStatus(item: AgendaItem) {
        try {
            const nextStatus = item.status === "OPEN" ? "DONE" : "OPEN";
            await saveAgendaItem({ ...item, status: nextStatus });
            fetchData(session.email, session);
        } catch (e) {
            setError("Durum güncellenirken hata oluştu.");
        }
    }

    function openFolder(id: string) {
        setActiveFolderId(id);
        setViewMode("FOLDER");
        // Reset form for new entry in this folder
        setFormData(prev => ({ ...prev, content: "", status: "OPEN" }));
    }

    function renderContentWithLinks(content: string) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return content.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "var(--tibcon-blue)", textDecoration: "underline" }}>{part}</a>;
            }
            return part;
        });
    }

    if (loading) return <div className="page-container">Yükleniyor...</div>;

    return (
        <div className="page-container">
            {/* --- HEADER --- */}
            <div style={headerStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {viewMode === "FOLDER" && (
                        <button
                            onClick={() => setViewMode("GRID")}
                            className="tibcon-btn"
                            style={{ background: "#f1f5f9", color: "#475569", padding: "0.5rem" }}
                        >
                            🔙 Geri
                        </button>
                    )}
                    <h1 className="title-lg outfit">
                        {viewMode === "GRID" ? "📅 Ajanda & Müşteri Notları" : (activeFolderInfo?.title || "Klasör")}
                    </h1>
                </div>

                {viewMode === "GRID" && (
                    <button
                        onClick={() => setShowNewFolderModal(true)}
                        className="tibcon-btn tibcon-btn-primary"
                    >
                        ➕ Yeni Klasör / Cari Ekle
                    </button>
                )}
            </div>

            {error && <div className="error-banner">{error}</div>}

            {/* --- GRID VIEW --- */}
            {viewMode === "GRID" && (
                <div style={gridStyle}>
                    {/* General Folder */}
                    {!folders.find(f => f.type === "GENERAL") && (
                        <div style={folderCardStyle} onClick={() => openFolder("GENERAL")}>
                            <div style={folderIconStyle}>📂</div>
                            <div style={folderTitleStyle}>Genel Notlar</div>
                            <div style={folderSubtitleStyle}>Kişisel notlar ve görevler</div>
                            <div style={folderCountStyle}>0 Öğe</div>
                        </div>
                    )}

                    {folders.map(folder => (
                        <div key={folder.id} style={folderCardStyle} onClick={() => openFolder(folder.id)}>
                            <div style={folderIconStyle}>{folder.type === "GENERAL" ? "📂" : "🏢"}</div>
                            <div style={folderTitleStyle}>{folder.title}</div>
                            {folder.subtitle && <div style={folderSubtitleStyle}>{folder.subtitle}</div>}
                            <div style={folderCountStyle}>{folder.count} Not/Görev</div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- FOLDER VIEW --- */}
            {viewMode === "FOLDER" && activeFolderInfo && (
                <div className="premium-card" style={{ animation: "fadeIn 0.3s ease" }}>
                    {/* Header Info */}
                    <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                        <h2 className="text-xl font-bold text-gray-800">{activeFolderInfo.title}</h2>
                        {activeFolderInfo.subtitle && <p className="text-sm text-gray-500 mt-1">{activeFolderInfo.subtitle}</p>}
                    </div>

                    <div style={listLayout} className="folder-layout">
                        {/* LEFT: New Note Form */}
                        <div style={sidebarFormStyle}>
                            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>✍️ Yeni Not Ekle</h3>
                            <div style={formField}>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    style={inputStyle}
                                >
                                    <option value="NOTE">📝 Not</option>
                                    <option value="TASK">✅ Görev</option>
                                </select>
                            </div>
                            <div style={formField}>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                            <div style={formField}>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    style={{ ...inputStyle, height: "120px", resize: "vertical" }}
                                    placeholder="Notunuzu buraya yazın..."
                                />
                            </div>
                            <button
                                onClick={handleSaveNote}
                                disabled={saving || !formData.content}
                                className="tibcon-btn tibcon-btn-primary"
                                style={{ width: "100%" }}
                            >
                                {saving ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                        </div>

                        {/* RIGHT: List */}
                        <div style={listAreaStyle}>
                            {activeFolderItems.length === 0 ? (
                                <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                                    Bu klasörde henüz not yok.
                                </div>
                            ) : (
                                activeFolderItems.map(item => (
                                    <div key={item.id} style={noteItemStyle(item.type === "TASK", item.status === "DONE")}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                            <span style={dateBadgeStyle}>{new Date(item.date).toLocaleDateString("tr-TR")}</span>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                {item.type === "TASK" && (
                                                    <button
                                                        onClick={() => toggleStatus(item)}
                                                        style={{ ...actionBtnStyle, color: item.status === "DONE" ? "#22c55e" : "#eab308" }}
                                                        title={item.status === "DONE" ? "Tamamlandı" : "Bekliyor"}
                                                    >
                                                        {item.status === "DONE" ? "✔️ Tamamlandı" : "⏳ Bekliyor"}
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(item.id)} style={{ ...actionBtnStyle, color: "#ef4444" }}>🗑️</button>
                                            </div>
                                        </div>
                                        <div style={{
                                            whiteSpace: "pre-wrap",
                                            lineHeight: "1.5",
                                            textDecoration: item.status === "DONE" ? "line-through" : "none",
                                            color: item.status === "DONE" ? "#94a3b8" : "#334155"
                                        }}>
                                            {renderContentWithLinks(item.content)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW FOLDER MODAL --- */}
            {showNewFolderModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 className="text-lg font-bold mb-4">Yeni Cari Klasörü Oluştur</h3>
                        <p className="text-sm text-gray-500 mb-4">Listeden bir cari seçin. Seçtiğiniz cari için bir klasör oluşturulacak.</p>

                        <select
                            value={newFolderPointId}
                            onChange={e => setNewFolderPointId(e.target.value)}
                            style={inputStyle}
                            className="mb-4"
                        >
                            <option value="">Seçiniz...</option>
                            {salesPoints
                                .filter(p => !folders.find(f => f.id === p.id)) // Hide already created
                                .sort((a, b) => (a.name || a.FirmaAdi || "").localeCompare(b.name || b.FirmaAdi || ""))
                                .map(p => (
                                    <option key={p.id} value={p.id}>{p.name || p.FirmaAdi}</option>
                                ))}
                        </select>

                        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setShowNewFolderModal(false)}
                                className="tibcon-btn"
                                style={{ background: "#f1f5f9", color: "#334155" }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                disabled={!newFolderPointId}
                                className="tibcon-btn tibcon-btn-primary"
                            >
                                Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .error-banner {
                    background: #fee2e2; color: #dc2626; padding: 1rem;
                    border-radius: 8px; margin-bottom: 1rem; border: 1px solid #fecaca;
                }
                .folder-layout {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    min-height: 500px;
                }
                @media (max-width: 768px) {
                    .folder-layout { grid-template-columns: 1fr; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {loadingMessage && <LoadingOverlay message={loadingMessage} />}
        </div>
    );
}

// --- STYLES ---

const headerStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "2rem", flexWrap: "wrap", gap: "1rem"
};

const gridStyle: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem"
};

const folderCardStyle: React.CSSProperties = {
    background: "white", padding: "1.5rem", borderRadius: "16px",
    border: "1px solid #e2e8f0", cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
};

const folderIconStyle: React.CSSProperties = { fontSize: "3rem", marginBottom: "0.5rem" };
const folderTitleStyle: React.CSSProperties = { fontWeight: 700, fontSize: "1.1rem", color: "#1e293b", marginBottom: "0.25rem" };
const folderSubtitleStyle: React.CSSProperties = { fontSize: "0.85rem", color: "#64748b", marginBottom: "0.5rem" };
const folderCountStyle: React.CSSProperties = {
    fontSize: "0.75rem", background: "#f1f5f9", padding: "4px 8px",
    borderRadius: "99px", color: "#475569", fontWeight: 600
};

// Detail View Styles
const listLayout: React.CSSProperties = {
    display: "flex", flexDirection: "column" // Overwritten by CSS class .folder-layout grid for desktop
};

const sidebarFormStyle: React.CSSProperties = {
    padding: "1.5rem", borderRight: "1px solid #e2e8f0", background: "#fff"
};

const listAreaStyle: React.CSSProperties = {
    padding: "1.5rem", background: "#f8fafc"
};

const formField: React.CSSProperties = { marginBottom: "1rem" };
const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem", borderRadius: "8px",
    border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none"
};

const noteItemStyle = (isTask: boolean, isDone: boolean): React.CSSProperties => ({
    background: isDone ? "#f1f5f9" : "white",
    padding: "1rem", borderRadius: "12px",
    marginBottom: "1rem",
    border: "1px solid",
    borderColor: isDone ? "#e2e8f0" : (isTask ? "#bfdbfe" : "#e2e8f0"),
    boxShadow: isDone ? "none" : "0 2px 4px rgba(0,0,0,0.05)",
    transition: "all 0.2s"
});

const dateBadgeStyle: React.CSSProperties = {
    fontSize: "0.75rem", color: "#64748b", background: "#f1f5f9",
    padding: "2px 6px", borderRadius: "4px"
};

const actionBtnStyle: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px",
    fontWeight: 600
};

const modalOverlayStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
};

const modalContentStyle: React.CSSProperties = {
    background: "white", padding: "2rem", borderRadius: "16px",
    width: "100%", maxWidth: "500px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
};
