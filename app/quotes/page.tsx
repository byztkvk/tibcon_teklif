"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listQuotes, updateQuoteStatus, normalizeEmail } from "@/lib/sheets";

type Role = "sales" | "region_manager" | "quote_manager" | "admin";

type Session = {
    email: string;
    role: Role;
    region: string;
};

type QuoteDraft = {
    id: string;
    createdAt: string;
    validUntil: string;
    cari: string;
    createdBy: string;
    ownerEmail: string; // Added
    region: string;
    status: "DRAFT" | "SUBMITTED" | "RM_APPROVED" | "QM_APPROVED";
    rows: any[];
};

export default function QuotesPage() {
    const router = useRouter();

    const [session, setSession] = useState<Session | null>(null);
    const [quotes, setQuotes] = useState<QuoteDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [usersMap, setUsersMap] = useState<Record<string, any>>({});

    // ---- session check
    // ---- session & quotes load
    useEffect(() => {
        const loadPage = async () => {
            setLoading(true);
            // 1. Session Check
            const rawSess = localStorage.getItem("tibcon_session");
            if (!rawSess) { router.push("/login"); return; }
            const sess = JSON.parse(rawSess) as Session;
            setSession(sess);

            // 2. Load Users
            const rawUsers = localStorage.getItem("tibcon_users");
            const allUsers = rawUsers ? JSON.parse(rawUsers) : [];
            const uMap: Record<string, any> = {};
            allUsers.forEach((u: any) => { uMap[u.email] = u; });
            setUsersMap(uMap);

            // 3. Load Quotes from API
            try {
                const res = await listQuotes();
                let allQuotes: QuoteDraft[] = (res && res.quotes) ? res.quotes : [];

                // Sort Date Desc
                allQuotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                // 4. Filter by Role & Visibility
                const filtered = allQuotes.filter(q => {
                    const effectiveOwner = q.ownerEmail || q.createdBy;
                    if (sess.role === "admin") return true;
                    if (sess.role === "quote_manager") return q.status !== "DRAFT";
                    if (sess.role === "sales") return effectiveOwner === sess.email;
                    if (sess.role === "region_manager") {
                        const sessEmail = normalizeEmail(sess.email);
                        const ownerEmail = normalizeEmail(effectiveOwner);

                        // 1. Multiple Region Support
                        const sessRegions = (sess.region || "").split(",").map(r => r.trim()).filter(Boolean);
                        const isInRegion = sessRegions.includes(q.region);

                        // 2. Team Member Support (based on managerEmail)
                        const ownerUser = usersMap[ownerEmail];
                        const isTeamMember = ownerUser && normalizeEmail(ownerUser.managerEmail || "") === sessEmail;

                        // 3. Self Check
                        const isSelf = ownerEmail === sessEmail;

                        return (isInRegion || isTeamMember || isSelf) && q.status !== "DRAFT";
                    }
                    return false;
                });
                setQuotes(filtered);
                // Also update local storage for redundancy
                localStorage.setItem("tibcon_quotes", JSON.stringify(allQuotes));
            } catch (err) {
                console.error("Failed to load quotes:", err);
                // Fallback to local
                const localQuotesRaw = localStorage.getItem("tibcon_quotes");
                if (localQuotesRaw) setQuotes(JSON.parse(localQuotesRaw));
            } finally {
                setLoading(true); // wait, should be false
                setLoading(false);
            }
        };
        loadPage();
    }, [router]);

    const statusLabel = (s: QuoteDraft["status"]) => {
        switch (s) {
            case "DRAFT":
                return "Taslak";
            case "SUBMITTED":
                return "Onaya Gönderildi";
            case "RM_APPROVED":
                return "Bölge Onaylı";
            case "QM_APPROVED":
                return "Teklif Onaylı";
            default:
                return s;
        }
    };

    const statusColor = (s: QuoteDraft["status"]) => {
        switch (s) {
            case "DRAFT": return "#6c757d";
            case "SUBMITTED": return "#fd7e14"; // orange
            case "RM_APPROVED": return "#0dcaf0"; // cyan
            case "QM_APPROVED": return "#198754"; // green
            default: return "#000";
        }
    };

    const handleSendToApproval = async (id: string) => {
        if (!confirm("Teklif onaya gönderilsin mi?")) return;

        try {
            await updateQuoteStatus(id, "SUBMITTED");

            // Update local state
            setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: "SUBMITTED" } : q));

            // Sync local storage
            const raw = localStorage.getItem("tibcon_quotes");
            if (raw) {
                let all: QuoteDraft[] = JSON.parse(raw);
                all = all.map(q => q.id === id ? { ...q, status: "SUBMITTED" as const } : q);
                localStorage.setItem("tibcon_quotes", JSON.stringify(all));
            }

            alert("Teklif onaya gönderildi.");
        } catch (err: any) {
            alert("Hata: " + (err.message || "Onay durumuna geçilemedi."));
        }
    };

    const handleUpdateTeklifDurumu = async (id: string, next: string) => {
        try {
            await fetch(`/api/quotes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teklifDurumu: next })
            });
            setQuotes(prev => prev.map(q => q.id === id ? { ...q, teklifDurumu: next as any } : q));
        } catch (err: any) {
            alert("Hata: " + err.message);
        }
    };

    if (!session) return null;

    return (
        <div className="page-container">
            <div className="premium-card">
                {/* Header */}
                <div className="stack-mobile" style={headerContainerStyle}>
                    <div>
                        <h1 className="title-lg outfit" style={{ margin: 0 }}>Teklif Yönetimi</h1>
                        <p className="text-muted" style={{ marginTop: "4px" }}>
                            Yetkiniz dahilindeki tüm teklifler ve güncel durumları.
                        </p>
                    </div>

                    <div className="stack-mobile" style={sessionInfoStyle}>
                        <div className="badge" style={{ background: "rgba(0,0,0,0.05)", color: "var(--tibcon-black)" }}>
                            👤 {session.email}
                        </div>
                        <div className="badge" style={{ background: "rgba(227, 6, 19, 0.05)", color: "var(--tibcon-red)" }}>
                            🛡️ {session.role}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="stack-mobile" style={{ marginTop: "2rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Link
                        href="/quotes/new"
                        className="tibcon-btn tibcon-btn-primary"
                        style={{ textDecoration: "none", width: "100%", maxWidth: "300px" }}
                    >
                        + Yeni Teklif Oluştur
                    </Link>

                    <div style={{ fontSize: "0.85rem", color: "var(--tibcon-gray-dark)", fontWeight: 600 }}>
                        Toplam {quotes.length} Kayıt
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                    <table className="premium-table responsive-table">
                        <thead>
                            <tr>
                                <th>Teklif No</th>
                                <th>Cari Bilgisi</th>
                                <th>Tarih</th>
                                <th>Bölge / Şehir</th>
                                <th>Akış Durumu</th>
                                <th>Teklif Sonucu</th>
                                <th style={{ textAlign: "right" }}>İşlem</th>
                            </tr>
                        </thead>

                        <tbody>
                            {quotes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: "4rem", textAlign: "center", color: "var(--tibcon-gray-dark)" }}>
                                        {loading ? "Veriler senkronize ediliyor..." : "Görüntülenecek teklif bulunamadı."}
                                    </td>
                                </tr>
                            ) : (
                                quotes.map((q: any) => (
                                    <tr key={q.id}>
                                        <td data-label="Teklif No">
                                            <div style={{ fontWeight: 800, color: "var(--tibcon-black)" }}>{q.id}</div>
                                            <div style={{ fontSize: "0.7rem", color: "#888", marginTop: "2px" }}>{(q.createdBy || "").split('@')[0]}</div>
                                        </td>
                                        <td data-label="Cari Bilgisi">
                                            <div style={{ fontWeight: 600 }}>{q.cariUnvan || q.cari}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--tibcon-gray-dark)" }}>{q.ownerEmail}</div>
                                        </td>
                                        <td data-label="Tarih" style={{ fontSize: "0.85rem" }}>{(q.createdAt || "").substring(0, 10)}</td>
                                        <td data-label="Bölge / Şehir">
                                            <span className="badge" style={{ background: "#f1f3f5", color: "#495057", display: "block", marginBottom: "4px" }}>{q.region || q.regionId}</span>
                                            {q.cityId && <span style={{ fontSize: "0.75rem", color: "#666" }}>📍 {q.cityId}</span>}
                                        </td>
                                        <td data-label="Akış Durumu">
                                            <span className="badge" style={statusBadgeStyle(q.status)}>
                                                {statusLabel(q.status)}
                                            </span>
                                        </td>
                                        <td data-label="Teklif Sonucu">
                                            <select
                                                className="premium-input"
                                                style={{ fontSize: "0.8rem", padding: "4px 8px", minWidth: "120px" }}
                                                value={q.teklifDurumu || "BEKLEMEDE"}
                                                onChange={(e) => handleUpdateTeklifDurumu(q.id, e.target.value)}
                                            >
                                                <option value="BEKLEMEDE">⌛ BEKLEMEDE</option>
                                                <option value="SIPARISE_DONUSTU">🛒 SİPARİŞ</option>
                                                <option value="IPTAL">❌ İPTAL</option>
                                            </select>
                                        </td>
                                        <td data-label="İşlem" style={{ textAlign: "right" }}>
                                            <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end", width: "100%" }}>
                                                <Link href={`/quotes/${q.id}`} className="tibcon-btn" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", textDecoration: "none", background: "#f8f9fa", border: "1px solid #ddd", color: "var(--tibcon-black)" }}>
                                                    Detay
                                                </Link>

                                                {session.role === "sales" && q.status === "DRAFT" && q.createdBy === session.email && (
                                                    <button
                                                        className="tibcon-btn tibcon-btn-primary"
                                                        onClick={() => handleSendToApproval(q.id)}
                                                        style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
                                                    >
                                                        Onaya Gönder
                                                    </button>
                                                )}
                                            </div>
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

// Quote Page Styles
const headerContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
    gap: "1.5rem",
    flexWrap: "wrap",
};

const sessionInfoStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
};

function statusBadgeStyle(status: QuoteDraft["status"]): React.CSSProperties {
    switch (status) {
        case "DRAFT":
            return { background: "#e9ecef", color: "#495057" };
        case "SUBMITTED":
            return { background: "rgba(227, 6, 19, 0.05)", color: "var(--tibcon-red)", border: "1px solid rgba(227, 6, 19, 0.1)" };
        case "RM_APPROVED":
            return { background: "rgba(25, 135, 84, 0.05)", color: "#198754", border: "1px solid rgba(25, 135, 84, 0.1)" };
        case "QM_APPROVED":
            return { background: "var(--tibcon-black)", color: "white" };
        default:
            return { background: "#eee", color: "#444" };
    }
}
