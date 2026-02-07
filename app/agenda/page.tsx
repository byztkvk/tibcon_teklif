"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listAgenda, saveAgendaItem, deleteAgendaItem, listSalesPoints, AgendaItem } from "@/lib/sheets";
import LoadingOverlay from "@/components/LoadingOverlay";

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

    // Form state
    const [showNewForm, setShowNewForm] = useState(false);
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
            setFormData(prev => ({ ...prev, salesPointId: pointId }));
            setShowNewForm(true);
        }

        fetchData(s.email);
    }, [router, searchParams]);

    async function fetchData(email: string) {
        setLoading(true);
        setLoadingMessage("Notlar ve görevler yükleniyor...");
        try {
            const [agendaRes, pointsRes] = await Promise.all([
                listAgenda(email),
                listSalesPoints()
            ]);

            if (agendaRes) setItems(agendaRes.items);
            if (pointsRes) setSalesPoints(pointsRes.points);
        } catch (e) {
            setError("Veriler yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
            setLoadingMessage(null);
        }
    }

    async function handleSave() {
        if (!formData.content) return;
        setSaving(true);
        setLoadingMessage("Not kaydediliyor...");
        try {
            const payload = {
                ...formData,
                createdBy: session.email,
                createdAt: new Date().toISOString()
            };
            const res = await saveAgendaItem(payload);
            if (res && res.ok) {
                setShowNewForm(false);
                setFormData({
                    type: "NOTE",
                    date: new Date().toISOString().split("T")[0],
                    content: "",
                    status: "OPEN",
                });
                fetchData(session.email);
            }
        } catch (e) {
            setError("Kaydedilirken bir hata oluştu.");
        } finally {
            setSaving(false);
            setLoadingMessage(null);
        }
    }

    async function toggleStatus(item: AgendaItem) {
        try {
            const nextStatus = item.status === "OPEN" ? "DONE" : "OPEN";
            await saveAgendaItem({ ...item, status: nextStatus });
            fetchData(session.email);
        } catch (e) {
            setError("Durum güncellenirken hata oluştu.");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Bu notu silmek istediğinize emin misiniz?")) return;
        try {
            await deleteAgendaItem(id);
            fetchData(session.email);
        } catch (e) {
            setError("Silinirken hata oluştu.");
        }
    }

    const groupedDisplay = useMemo(() => {
        const groups: Record<string, { title: string, subtitle?: string, items: AgendaItem[], isGeneral: boolean, icon: string }> = {};

        items.forEach(item => {
            if (item.salesPointId) {
                const point = salesPoints.find(p => p.id === item.salesPointId);
                const key = `CARI:${item.salesPointId}`;
                if (!groups[key]) {
                    groups[key] = {
                        title: point?.FirmaAdi || "Bilinmeyen Cari",
                        subtitle: point ? `📍 ${point.Sehir} / ${point.ilce}` : undefined,
                        items: [],
                        isGeneral: false,
                        icon: "🏢"
                    };
                }
                groups[key].items.push(item);
            } else {
                const cat = item.category || "Genel Notlar";
                const key = `CAT:${cat}`;
                if (!groups[key]) {
                    groups[key] = {
                        title: cat,
                        items: [],
                        isGeneral: true,
                        icon: "📌"
                    };
                }
                groups[key].items.push(item);
            }
        });

        // Sort items within each group by date (newest first)
        Object.keys(groups).forEach(key => {
            groups[key].items.sort((a, b) => b.date.localeCompare(a.date));
        });

        return groups;
    }, [items, salesPoints]);

    // Extract unique categories for the dropdown
    const existingCategories = useMemo(() => {
        const cats = new Set<string>();
        items.forEach(item => { if (item.category) cats.add(item.category); });
        return Array.from(cats).sort();
    }, [items]);

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
            <div className="premium-card">
                <div style={headerStyle}>
                    <h1 className="title-lg outfit">📅 Ajandalarım</h1>
                    <button
                        onClick={() => setShowNewForm(!showNewForm)}
                        className="tibcon-btn tibcon-btn-primary"
                    >
                        {showNewForm ? "Vazgeç" : "➕ Yeni Not/Klasör"}
                    </button>
                </div>

                {error && <div className="error-banner">{error}</div>}

                {showNewForm && (
                    <div style={formStyle} className="premium-card">
                        <div className="form-grid">
                            <div style={formField}>
                                <label style={labelStyle}>Tip</label>
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
                                <label style={labelStyle}>Tarih</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                        </div>



                        <div style={formField}>
                            <label style={labelStyle}>Bağlantılı Müşteri (Opsiyonel)</label>
                            <select
                                value={formData.salesPointId}
                                onChange={(e) => setFormData({ ...formData, salesPointId: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">Bir müşteri seçin...</option>
                                {salesPoints.map(p => (
                                    <option key={p.id} value={p.id}>{p.FirmaAdi}</option>
                                ))}
                            </select>
                        </div>

                        {!formData.salesPointId && (
                            <div style={formField}>
                                <label style={labelStyle}>Klasör / Kategori (örn: Fiyat Listesi, Dosyalar)</label>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <input
                                        list="categories"
                                        placeholder="Yeni veya mevcut kategori..."
                                        value={formData.category || ""}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        style={inputStyle}
                                    />
                                    <datalist id="categories">
                                        {existingCategories.map(c => <option key={c} value={c} />)}
                                        <option value="Fiyat Listesi" />
                                        <option value="Excel Dosyaları" />
                                        <option value="Web Bağlantıları" />
                                    </datalist>
                                </div>
                            </div>
                        )}

                        <div style={formField}>
                            <label style={labelStyle}>İçerik (Link veya Not)</label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                style={{ ...inputStyle, height: "100px", resize: "vertical" }}
                                placeholder="Notun içeriği veya URL adresi..."
                            />
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="tibcon-btn tibcon-btn-primary"
                            style={{ width: "100%" }}
                        >
                            {saving ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                    </div>
                )}

                <div style={{ marginTop: "2rem" }}>
                    {Object.keys(groupedDisplay).length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
                            Henüz bir not veya kategoriniz bulunmuyor.
                        </div>
                    ) : (
                        <div style={cardsContainer}>
                            {Object.entries(groupedDisplay).map(([key, group]) => (
                                <div key={key} style={cariCardStyle} className="premium-card">
                                    <div style={cariCardHeader}>
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            <h3 className="outfit" style={{ margin: 0, fontSize: "1.1rem" }}>
                                                {group.icon} {group.title}
                                            </h3>
                                            {group.subtitle && (
                                                <span style={{ fontSize: "0.75rem", color: "#666" }}>
                                                    {group.subtitle}
                                                </span>
                                            )}
                                        </div>
                                        <div style={noteCountBadge}>
                                            {group.items.length} Öğe
                                        </div>
                                    </div>

                                    <div style={notesListStyle}>
                                        {group.items.map(item => (
                                            <div key={item.id} style={noteItemStyle(item.status === "DONE")}>
                                                <div style={noteMetaStyle}>
                                                    <span style={{ fontSize: "0.7rem", color: "#666" }}>
                                                        {new Date(item.date).toLocaleDateString("tr-TR")}
                                                    </span>
                                                    <span style={typeBadgeStyle(item.type)}>
                                                        {item.type === "NOTE" ? "Not" : "Görev"}
                                                    </span>
                                                </div>

                                                <div style={noteContentWrapper}>
                                                    <div style={{
                                                        fontSize: "0.9rem",
                                                        whiteSpace: "pre-wrap",
                                                        textDecoration: item.status === "DONE" ? "line-through" : "none",
                                                        color: item.status === "DONE" ? "#999" : "#333",
                                                        flex: 1,
                                                        wordBreak: "break-all"
                                                    }}>
                                                        {renderContentWithLinks(item.content)}
                                                    </div>
                                                    <div style={{ display: "flex", gap: "8px", alignItems: "start" }}>
                                                        {item.type === "TASK" && (
                                                            <button
                                                                onClick={() => toggleStatus(item)}
                                                                style={actionButtonStyle}
                                                                title={item.status === "DONE" ? "Aç" : "Tamamla"}
                                                            >
                                                                {item.status === "DONE" ? "↩️" : "✔️"}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            style={{ ...actionButtonStyle, color: "var(--tibcon-red)" }}
                                                            title="Sil"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .error-banner {
                    background: #fee2e2;
                    color: #dc2626;
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    border: 1px solid #fecaca;
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                @media (max-width: 768px) {
                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
            {loadingMessage && <LoadingOverlay message={loadingMessage} />}
        </div>
    );
}

const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem"
};

const formStyle: React.CSSProperties = {
    padding: "1.5rem",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    marginBottom: "2rem"
};

const formField: React.CSSProperties = {
    marginBottom: "1rem"
};

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: "0.4rem",
    color: "#475569"
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.9rem",
    outline: "none"
};

// --- NEW CARD STYLES ---
const cardsContainer: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "1.5rem",
    alignItems: "start"
};

const cariCardStyle: React.CSSProperties = {
    padding: "0",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
};

const cariCardHeader: React.CSSProperties = {
    padding: "1.25rem",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
};

const noteCountBadge: React.CSSProperties = {
    background: "var(--tibcon-red)",
    color: "white",
    fontSize: "0.75rem",
    padding: "4px 10px",
    borderRadius: "99px",
    fontWeight: 700
};

const notesListStyle: React.CSSProperties = {
    maxHeight: "400px",
    overflowY: "auto",
    padding: "1rem"
};

const noteMetaStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem"
};

const noteContentWrapper: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px"
};

function noteItemStyle(isDone: boolean): React.CSSProperties {
    return {
        padding: "1rem",
        borderBottom: "1px solid #f1f5f9",
        background: isDone ? "#f8fafc" : "transparent",
        transition: "background 0.2s"
    };
}

function typeBadgeStyle(type: string): React.CSSProperties {
    return {
        fontSize: "0.65rem",
        fontWeight: 800,
        textTransform: "uppercase",
        padding: "2px 6px",
        borderRadius: "4px",
        background: type === "NOTE" ? "#dcfce7" : "#dbeafe",
        color: type === "NOTE" ? "#166534" : "#1e40af"
    };
}

const actionButtonStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #e2e8f0",
    fontSize: "0.85rem",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s"
};
