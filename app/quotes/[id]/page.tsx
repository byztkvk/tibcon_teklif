"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { listQuotes, updateQuoteStatus, saveQuote as apiSaveQuote, getQuoteDetail, normalizeEmail } from "@/lib/sheets";
import LoadingOverlay from "@/components/LoadingOverlay";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

type Role = "sales" | "region_manager" | "quote_manager" | "admin";

type User = {
    id: string;
    email: string; // normalized
    displayName: string;
    password: string;
    role: Role;
    region?: string; // sales
    regions?: string[]; // managers/admin
    managerEmail?: string; // sales -> region_manager
};

type Session = {
    email: string;
    role: Role;
    region?: string;
    regions?: string[];
};

type QuoteStatus = "DRAFT" | "SUBMITTED" | "RM_APPROVED" | "QM_APPROVED";

type QuoteRow = {
    code: string;
    name: string;
    currency: "TRY" | "USD";
    listPrice: number; // locked
    qty: number;
    discountPct: number; // editable by permitted users
    termin: string; // editable by permitted users
};

type Quote = {
    id: string;
    createdAt: string; // ISO
    validUntil?: string; // ISO
    cari: string;
    createdBy: string; // email
    ownerEmail: string; // email (sales)
    region: string; // "1. Bölge" etc
    status: QuoteStatus;
    teklifDurumu?: "BEKLEMEDE" | "SIPARISE_DONUSTU" | "IPTAL";
    siparisNo?: string;
    siparisTarihi?: string;
    rows: QuoteRow[];
    terms?: string;
    yetkili?: string;
    cityId?: string;
};

// ====== Storage keys (change here if your project uses different ones) ======
const USERS_KEY = "tibcon_users";
const SESSION_KEY = "tibcon_session";
const SETTINGS_KEY = "tibcon_settings";
const QUOTES_KEY = "tibcon_quotes";

// ====== Helpers ======
function safeJsonParse<T>(s: string | null, fallback: T): T {
    if (!s) return fallback;
    try {
        return JSON.parse(s) as T;
    } catch {
        return fallback;
    }
}

function fmtMoney(n: number, currency: "TRY" | "USD") {
    const val = Number.isFinite(n) ? n : 0;
    const symbol = currency === "TRY" ? "₺" : "$";
    return `${val.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${symbol}`;
}

function calcRowNet(row: QuoteRow) {
    const qty = Number(row.qty) || 0;
    const price = Number(row.listPrice) || 0;
    const disc = Number(row.discountPct) || 0;
    const netUnit = price * (1 - disc / 100);
    return netUnit * qty;
}

function nowISODate() {
    const d = new Date();
    // YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function getTeamSalesEmails(users: User[], managerEmail: string) {
    const m = normalizeEmail(managerEmail);
    return users
        .filter((u) => u.role === "sales" && normalizeEmail(u.managerEmail || "") === m)
        .map((u) => normalizeEmail(u.email));
}

function canViewQuote(session: Session, quote: Quote, users: User[]) {
    if (!session?.email) return false;
    const sessEmail = normalizeEmail(session.email);
    const ownerEmail = normalizeEmail(quote.ownerEmail || quote.createdBy);

    if (session.role === "admin") return true;
    if (session.role === "quote_manager") return quote.status !== "DRAFT";

    if (session.role === "sales") {
        return ownerEmail === sessEmail;
    }

    // region_manager
    const team = new Set(getTeamSalesEmails(users, sessEmail));
    const sessRegions = (session.region || "").split(",").map(r => r.trim()).filter(Boolean);
    const isInRegion = sessRegions.includes(quote.region);

    return (
        (team.has(ownerEmail) ||
            normalizeEmail(quote.createdBy) === sessEmail ||
            ownerEmail === sessEmail ||
            isInRegion) &&
        quote.status !== "DRAFT"
    );
}

function canEditQuote(session: Session, quote: Quote, users: User[]) {
    if (!session?.email) return false;
    const sessEmail = normalizeEmail(session.email);
    const ownerEmail = normalizeEmail(quote.ownerEmail || quote.createdBy);

    if (quote.status === "QM_APPROVED") return false; // locked for everyone

    if (session.role === "admin") return true;

    if (session.role === "sales") {
        return ownerEmail === sessEmail;
    }

    if (session.role === "region_manager") {
        const team = new Set(getTeamSalesEmails(users, sessEmail));
        const sessRegions = (session.region || "").split(",").map(r => r.trim()).filter(Boolean);
        const isInRegion = sessRegions.includes(quote.region);
        return quote.status === "SUBMITTED" && (team.has(ownerEmail) || isInRegion);
    }

    if (session.role === "quote_manager") {
        return quote.status === "RM_APPROVED";
    }

    return false;
}

function canSubmit(session: Session, quote: Quote) {
    if (!session?.email) return false;
    const sessEmail = normalizeEmail(session.email);
    const ownerEmail = normalizeEmail(quote.ownerEmail || quote.createdBy);

    return (
        session.role === "sales" &&
        quote.status === "DRAFT" &&
        normalizeEmail(quote.createdBy) === sessEmail &&
        ownerEmail === sessEmail
    );
}

function canRMApprove(session: Session, quote: Quote, users: User[]) {
    if (session.role !== "region_manager") return false;
    if (quote.status !== "SUBMITTED") return false;
    const sessEmail = normalizeEmail(session.email);
    const ownerEmail = normalizeEmail(quote.ownerEmail || quote.createdBy);
    const team = new Set(getTeamSalesEmails(users, sessEmail));
    const sessRegions = (session.region || "").split(",").map(r => r.trim()).filter(Boolean);
    const isInRegion = sessRegions.includes(quote.region);
    return team.has(ownerEmail) || isInRegion;
}

function canQMApprove(session: Session, quote: Quote) {
    return session.role === "quote_manager" && quote.status === "RM_APPROVED";
}

function canRevertToDraft(session: Session, quote: Quote, users: User[]) {
    if (quote.status === "QM_APPROVED") return false;
    if (!session?.email) return false;
    const sessEmail = normalizeEmail(session.email);
    const ownerEmail = normalizeEmail(quote.ownerEmail || quote.createdBy);

    if (session.role === "admin") return true;

    if (session.role === "region_manager") {
        const team = new Set(getTeamSalesEmails(users, sessEmail));
        const sessRegions = (session.region || "").split(",").map(r => r.trim()).filter(Boolean);
        const isInRegion = sessRegions.includes(quote.region);
        return (quote.status === "SUBMITTED" || quote.status === "RM_APPROVED") && (team.has(ownerEmail) || isInRegion);
    }

    if (session.role === "quote_manager") {
        return quote.status === "RM_APPROVED";
    }

    if (session.role === "sales") {
        return quote.status === "DRAFT" && ownerEmail === sessEmail;
    }

    return false;
}

// ====== Component ======
export default function QuoteDetailPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const [session, setSession] = useState<Session | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [quote, setQuote] = useState<Quote | null>(null);

    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

    // Load base
    useEffect(() => {
        const load = async () => {
            setLoadingMessage("Teklif detayları yükleniyor...");
            const s = safeJsonParse<Session | null>(localStorage.getItem(SESSION_KEY), null);
            if (!s?.email) { router.push("/login"); return; }
            setSession(s);

            const u = safeJsonParse<User[]>(localStorage.getItem(USERS_KEY), []);
            setUsers(u);

            // Fetch from API
            try {
                const res = await getQuoteDetail(id);
                const found = res?.quote || null;

                if (!found) {
                    setErr("Teklif bulunamadı.");
                    return;
                }

                const normalized: Quote = {
                    ...found,
                    ownerEmail: found.ownerEmail || found.createdBy,
                    validUntil: found.validUntil || "",
                    rows: Array.isArray(found.rows) ? found.rows : [],
                };

                setQuote(normalized);
            } catch (e) {
                // Fallback to local
                const quotes = safeJsonParse<Quote[]>(localStorage.getItem(QUOTES_KEY), []);
                const localFound = quotes.find((q) => q.id === id) || null;
                if (localFound) setQuote(localFound);
                else setErr("Teklif yüklenemedi.");
            } finally {
                setLoadingMessage(null);
            }
        };
        load();
    }, [id, router]);

    const canView = useMemo(() => {
        if (!session || !quote) return false;
        return canViewQuote(session, quote, users);
    }, [session, quote, users]);

    const canEdit = useMemo(() => {
        if (!session || !quote) return false;
        return canEditQuote(session, quote, users);
    }, [session, quote, users]);

    const totals = useMemo(() => {
        if (!quote) return { TRY: 0, USD: 0 };
        let tTry = 0;
        let tUsd = 0;
        for (const r of quote.rows) {
            const net = calcRowNet(r);
            if (r.currency === "TRY") tTry += net;
            else tUsd += net;
        }
        return { TRY: tTry, USD: tUsd };
    }, [quote]);

    function persistQuote(updated: Quote) {
        const quotes = safeJsonParse<Quote[]>(localStorage.getItem(QUOTES_KEY), []);
        const idx = quotes.findIndex((q) => q.id === updated.id);
        if (idx >= 0) quotes[idx] = updated;
        else quotes.unshift(updated);
        localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
    }

    async function saveChanges() {
        if (!quote) return;
        if (!session) return;
        if (!canEdit) {
            setErr("Bu teklifte düzenleme yetkiniz yok.");
            return;
        }

        setSaving(true);
        setLoadingMessage("Değişiklikler kaydediliyor...");
        setErr(null);
        setMsg(null);
        try {
            const cleaned: Quote = {
                ...quote,
                cari: (quote.cari || "").trim(),
                validUntil: quote.validUntil || "",
                rows: quote.rows.map((r) => ({
                    ...r,
                    qty: Math.max(0, Number(r.qty) || 0),
                    discountPct: Math.min(100, Math.max(0, Number(r.discountPct) || 0)),
                    termin: (r.termin || "STOK").trim() || "STOK",
                })),
            };

            // API Save
            await apiSaveQuote({
                quote: {
                    ...cleaned,
                    totalTRY: totals.TRY,
                    totalUSD: totals.USD
                },
                rows: cleaned.rows
            });

            persistQuote(cleaned);
            setQuote(cleaned);
            setMsg("Kaydedildi.");
        } catch (e: any) {
            setErr(e?.message || "Kaydetme sırasında hata oluştu.");
        } finally {
            setSaving(false);
            setLoadingMessage(null);
        }
    }

    async function setStatus(next: QuoteStatus) {
        if (!quote || !session) return;

        // permission gates ... (kept same)
        if (next === "SUBMITTED" && !canSubmit(session, quote)) { setErr("Gönderim yetkiniz yok."); return; }
        if (next === "RM_APPROVED" && !canRMApprove(session, quote, users)) { setErr("Bölge müdürü onayı yetkiniz yok."); return; }
        if (next === "QM_APPROVED" && !canQMApprove(session, quote)) { setErr("Teklif müdürü onayı yetkiniz yok."); return; }
        if (next === "DRAFT" && !canRevertToDraft(session, quote, users)) { setErr("Taslağa çekme yetkiniz yok."); return; }

        setSaving(true);
        setLoadingMessage("Durum güncelleniyor...");
        try {
            await updateQuoteStatus(quote.id, next);

            const updated: Quote = { ...quote, status: next };
            persistQuote(updated);
            setQuote(updated);
            setMsg(`Durum güncellendi: ${next}`);
        } catch (e: any) {
            setErr("Hata: " + e.message);
        } finally {
            setSaving(false);
            setLoadingMessage(null);
        }
    }

    function updateRow(i: number, patch: Partial<QuoteRow>) {
        if (!quote) return;
        const rows = quote.rows.slice();
        rows[i] = { ...rows[i], ...patch };
        setQuote({ ...quote, rows });
    }

    if (!session) return null;

    if (err && !quote) {
        return (
            <div style={{ padding: 24 }}>
                <h2>Hata</h2>
                <p>{err}</p>
                <button
                    onClick={() => router.push("/quotes")}
                    style={{
                        height: 40,
                        padding: "0 14px",
                        borderRadius: 10,
                        border: "1px solid var(--tibcon-border)",
                        background: "white",
                        cursor: "pointer",
                    }}
                >
                    Tekliflerime Dön
                </button>
            </div>
        );
    }

    if (!quote) return null;

    if (!canView) {
        return (
            <div style={{ padding: 24 }}>
                <h2>Yetkiniz yok</h2>
                <p>Bu teklifi görüntüleme yetkiniz bulunmuyor.</p>
                <button
                    onClick={() => router.push("/quotes")}
                    style={{
                        height: 40,
                        padding: "0 14px",
                        borderRadius: 10,
                        border: "1px solid var(--tibcon-border)",
                        background: "white",
                        cursor: "pointer",
                    }}
                >
                    Tekliflerime Dön
                </button>
            </div>
        );
    }

    const ownerUser = users.find((u) => u.email === quote.ownerEmail);
    const ownerName = ownerUser?.displayName || quote.ownerEmail;

    function statusBadgeStyle(status: QuoteStatus): React.CSSProperties {
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

    const statusLabel = (s: QuoteStatus) => {
        switch (s) {
            case "DRAFT": return "Taslak";
            case "SUBMITTED": return "Onay Bekliyor";
            case "RM_APPROVED": return "Bölge Onaylı";
            case "QM_APPROVED": return "Kesin Onaylı";
            default: return s;
        }
    };

    return (
        <div className="page-container">
            <div className="premium-card">
                {/* Header Section */}
                <div className="stack-mobile" style={headerContainerStyle}>
                    <div>
                        <h1 className="title-lg outfit" style={{ margin: 0 }}>Teklif Detay Bilgileri</h1>
                        <div style={{ marginTop: "8px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                            <span className="badge" style={{ background: "rgba(0,0,0,0.05)", color: "var(--tibcon-black)" }}>
                                <b>NO:</b> {quote.id}
                            </span>
                            <span className="badge" style={statusBadgeStyle(quote.status)}>
                                <b>DURUM:</b> {statusLabel(quote.status)}
                            </span>
                            <span className="badge" style={{ background: "#f1f3f5", color: "#495057" }}>
                                <b>TARİH:</b> {quote.createdAt?.slice(0, 10) || nowISODate()}
                            </span>
                        </div>
                    </div>

                    <div className="stack-mobile" style={{ ...ownerInfoStyle, textAlign: "left" }}>
                        <div style={{ fontWeight: 700, color: "var(--tibcon-black)" }}>👤 {ownerName}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--tibcon-gray-dark)" }}>Bölge: <b>{quote.region}</b></div>
                        <div style={{ fontSize: "0.7rem", color: "#aaa" }}>Yetki: <b>{
                            session.role === "admin" ? "Yönetici" :
                                session.role === "region_manager" ? "Bölge Müdürü" :
                                    session.role === "quote_manager" ? "Teklif Müdürü" : "Satış Sorumlusu"
                        }</b></div>
                        <div style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "flex-start", flexWrap: "wrap" }}>
                            <button
                                onClick={() => exportToPDF(quote, ownerUser)}
                                className="tibcon-btn"
                                style={{ padding: "8px 16px", fontSize: "0.8rem", background: "#dc3545", color: "white", borderRadius: "8px", flex: "1" }}
                            >
                                📄 PDF
                            </button>
                            <button
                                onClick={() => exportToExcel(quote)}
                                className="tibcon-btn"
                                style={{ padding: "8px 16px", fontSize: "0.8rem", background: "#198754", color: "white", borderRadius: "8px", flex: "1" }}
                            >
                                📊 Excel
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ margin: "2rem 0", borderTop: "1px solid var(--tibcon-border)" }} />

                {err && <div style={errorBannerStyle}>{err}</div>}
                {msg && <div style={successBannerStyle}>{msg}</div>}

                {/* STATUS TRACKING SECTION */}
                <div className="premium-card" style={{ background: "rgba(0, 51, 102, 0.02)", border: "1px solid rgba(0, 51, 102, 0.1)", marginBottom: "2rem" }}>
                    <h3 className="outfit mb-4" style={{ fontSize: "1.1rem", color: "var(--tibcon-blue)" }}>🛒 Teklif Statü ve Sipariş Takibi</h3>
                    <div className="stack-mobile" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                            <label style={labelStyle}>Teklif Sonuç Durumu</label>
                            <select
                                className="premium-input"
                                value={quote.teklifDurumu || "BEKLEMEDE"}
                                onChange={(e) => setQuote({ ...quote, teklifDurumu: e.target.value as any })}
                                disabled={!canEdit}
                                style={{ ...inputStyle, padding: "0.75rem" }}
                            >
                                <option value="BEKLEMEDE">⏳ BEKLEMEDE</option>
                                <option value="SIPARISE_DONUSTU">✅ SİPARİŞE DÖNÜŞTÜ</option>
                                <option value="IPTAL">❌ İPTAL EDİLDİ</option>
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                            <label style={labelStyle}>Sipariş No (Varsa)</label>
                            <input
                                placeholder="Örn: S12345"
                                value={quote.siparisNo || ""}
                                onChange={(e) => setQuote({ ...quote, siparisNo: e.target.value })}
                                disabled={!canEdit || quote.teklifDurumu !== "SIPARISE_DONUSTU"}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                            <label style={labelStyle}>Sipariş Tarihi</label>
                            <input
                                type="date"
                                value={quote.siparisTarihi || ""}
                                onChange={(e) => setQuote({ ...quote, siparisTarihi: e.target.value })}
                                disabled={!canEdit || quote.teklifDurumu !== "SIPARISE_DONUSTU"}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="stack-mobile" style={mainGridStyle}>
                    <div style={{ flex: 1.5 }}>
                        <label style={labelStyle}>Müşteri / Cari Ünvanı</label>
                        <input
                            value={quote.cari || ""}
                            onChange={(e) => setQuote({ ...quote, cari: e.target.value })}
                            disabled={!canEdit}
                            placeholder="Cari ünvan..."
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Teklif Geçerlilik Sonu</label>
                        <input
                            type="date"
                            value={(quote.validUntil || "").slice(0, 10)}
                            onChange={(e) => setQuote({ ...quote, validUntil: e.target.value })}
                            disabled={!canEdit}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Müşteri Yetkilisi</label>
                        <input
                            value={quote.yetkili || ""}
                            onChange={(e) => setQuote({ ...quote, yetkili: e.target.value })}
                            disabled={!canEdit}
                            placeholder="İsim / Soyisim"
                            style={inputStyle}
                        />
                    </div>
                </div>

                {/* TERMS SECTION */}
                <div style={{ marginBottom: "2rem" }}>
                    <label style={labelStyle}>Teklif Şartları</label>
                    <textarea
                        value={quote.terms || ""}
                        onChange={(e) => setQuote({ ...quote, terms: e.target.value })}
                        disabled={!canEdit}
                        placeholder="Ödeme vadesi, sevkiyat şartları vb..."
                        style={{
                            width: "100%",
                            height: "100px",
                            borderRadius: "12px",
                            border: "1px solid var(--tibcon-border)",
                            padding: "1rem",
                            fontSize: "0.9rem",
                            outline: "none",
                            resize: "vertical",
                            background: canEdit ? "white" : "#f8fafc",
                            fontFamily: "inherit"
                        }}
                    />
                </div>

                {/* Products Table Wrapper */}
                <div style={tableWrapperStyle}>
                    <div className="stack-mobile" style={tableHeaderStyle}>
                        <h3 className="outfit" style={{ margin: 0, fontSize: "1.1rem" }}>Kalem Satırları</h3>
                        <div style={{ ...totalsSummaryStyle, flexDirection: "column", gap: "4px" }}>
                            {totals.TRY > 0 && <span>TRY Toplam: <b>{fmtMoney(totals.TRY, "TRY")}</b></span>}
                            {totals.USD > 0 && <span>USD Toplam: <b>{fmtMoney(totals.USD, "USD")}</b></span>}
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table className="premium-table responsive-table">
                            <thead>
                                <tr>
                                    <th>Ürün Kodu</th>
                                    <th>Açıklama</th>
                                    <th>Para</th>
                                    <th>Liste Fiyatı</th>
                                    <th style={{ width: "100px" }}>Adet</th>
                                    <th style={{ width: "100px" }}>İsk. %</th>
                                    <th>Net Tutar</th>
                                    <th>Termin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quote.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--tibcon-gray-dark)" }}>
                                            Henüz ürün satırı bulunmuyor.
                                        </td>
                                    </tr>
                                ) : (
                                    quote.rows.map((r, i) => {
                                        const net = calcRowNet(r);
                                        return (
                                            <tr key={`${r.code}-${i}`}>
                                                <td data-label="Ürün Kodu"><div style={{ fontWeight: 800 }}>{r.code}</div></td>
                                                <td data-label="Açıklama" style={{ fontSize: "0.75rem", color: "var(--tibcon-gray-dark)", maxWidth: "200px" }}>{r.name}</td>
                                                <td data-label="Para"><span style={{ fontWeight: 600 }}>{r.currency}</span></td>
                                                <td data-label="Liste Fiyatı">{fmtMoney(r.listPrice, r.currency)}</td>
                                                <td data-label="Adet">
                                                    <input
                                                        type="number"
                                                        value={r.qty}
                                                        disabled={!canEdit}
                                                        onChange={(e) => updateRow(i, { qty: Number(e.target.value) })}
                                                        style={compactInputStyle}
                                                    />
                                                </td>
                                                <td data-label="İsk. %">
                                                    <input
                                                        type="number"
                                                        value={r.discountPct}
                                                        disabled={!canEdit}
                                                        onChange={(e) => updateRow(i, { discountPct: Number(e.target.value) })}
                                                        style={compactInputStyle}
                                                    />
                                                </td>
                                                <td data-label="Net Tutar"><div style={{ fontWeight: 800, color: "var(--tibcon-black)" }}>{fmtMoney(net, r.currency)}</div></td>
                                                <td data-label="Termin">
                                                    <input
                                                        value={r.termin || "STOK"}
                                                        disabled={!canEdit}
                                                        onChange={(e) => updateRow(i, { termin: e.target.value })}
                                                        style={{ ...compactInputStyle, width: "100%", textAlign: "left" }}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="stack-mobile" style={{ ...footerContainerStyle, alignItems: "stretch" }}>
                    <div className="stack-mobile" style={mainActionsStyle}>
                        <button onClick={() => router.push("/quotes")} className="tibcon-btn tibcon-btn-outline" style={{ padding: "0.8rem 1.5rem" }}>
                            &larr; Geri
                        </button>
                        <button
                            onClick={saveChanges}
                            disabled={!canEdit || saving}
                            className="tibcon-btn tibcon-btn-primary"
                            style={{ padding: "0.8rem 2.5rem", flex: 1 }}
                        >
                            {saving ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                    </div>

                    <div className="stack-mobile" style={approvalActionsStyle}>
                        {canEdit && (
                            <button
                                onClick={() => router.push(`/quotes/new?edit=${encodeURIComponent(quote.id)}`)}
                                className="tibcon-btn"
                                style={{ background: "#2563eb", color: "white", flex: 1, fontWeight: 700 }}
                            >
                                📂 Düzenle
                            </button>
                        )}
                        <button
                            onClick={() => router.push(`/quotes/new?duplicate=${encodeURIComponent(quote.id)}`)}
                            className="tibcon-btn"
                            style={{ background: "#f59e0b", color: "white", flex: 1, fontWeight: 700 }}
                        >
                            📋 Aynı Ürünlerle Yeni Teklif
                        </button>

                        {canSubmit(session, quote) && (
                            <button onClick={() => setStatus("SUBMITTED")} className="tibcon-btn" style={{ background: "#2563eb", color: "white", flex: 1 }}>
                                🚀 Onaya Gönder
                            </button>
                        )}
                        {canRMApprove(session, quote, users) && (
                            <button onClick={() => setStatus("RM_APPROVED")} className="tibcon-btn" style={{ background: "#059669", color: "white", flex: 1 }}>
                                ✅ Bölge Onayla
                            </button>
                        )}
                        {canQMApprove(session, quote) && (
                            <button onClick={() => setStatus("QM_APPROVED")} className="tibcon-btn" style={{ background: "var(--tibcon-black)", color: "white", flex: 1 }}>
                                🏁 Kesin Onay
                            </button>
                        )}
                        {canRevertToDraft(session, quote, users) && (
                            <button onClick={() => setStatus("DRAFT")} className="tibcon-btn" style={{ background: "#f1f3f5", color: "#4b5563", border: "1px solid #d1d5db", flex: 1 }}>
                                ↩️ Taslağa Çek
                            </button>
                        )}
                    </div>
                </div>

                <div style={lockNotificationStyle}>
                    Onaylandı (QM_APPROVED) durumundaki teklifler otomatik olarak kilitlenir.
                </div>
            </div >
            {loadingMessage && <LoadingOverlay message={loadingMessage} />}
        </div >
    );
}

// Quote Detail Styles
const headerContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1.5rem",
    flexWrap: "wrap",
};

const ownerInfoStyle: React.CSSProperties = {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
};

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
    color: "var(--tibcon-anth)",
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.875rem 1rem",
    borderRadius: "12px",
    border: "1px solid var(--tibcon-border)",
    fontSize: "1rem",
    outline: "none",
    background: "#fcfcfc",
    transition: "border-color 0.2s",
};

const mainGridStyle: React.CSSProperties = {
    display: "flex",
    gap: "1.5rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
};

const tableWrapperStyle: React.CSSProperties = {
    marginTop: "2.5rem",
    border: "1px solid var(--tibcon-border)",
    borderRadius: "16px",
    overflow: "hidden",
};

const tableHeaderStyle: React.CSSProperties = {
    padding: "1rem 1.25rem",
    background: "rgba(0,0,0,0.01)",
    borderBottom: "1px solid var(--tibcon-border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
};

const totalsSummaryStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    color: "var(--tibcon-anth)",
    display: "flex",
    gap: "16px",
};

const compactInputStyle: React.CSSProperties = {
    width: "70px",
    padding: "0.5rem",
    borderRadius: "8px",
    border: "1px solid var(--tibcon-border)",
    textAlign: "center",
    fontWeight: 700,
    outline: "none",
};

const footerContainerStyle: React.CSSProperties = {
    marginTop: "3rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "2rem",
    flexWrap: "wrap",
};

const mainActionsStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
};

const approvalActionsStyle: React.CSSProperties = {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
};

const lockNotificationStyle: React.CSSProperties = {
    marginTop: "2rem",
    fontSize: "0.75rem",
    color: "var(--tibcon-gray-dark)",
    textAlign: "center",
    fontStyle: "italic",
};

const errorBannerStyle: React.CSSProperties = {
    background: "rgba(227, 6, 19, 0.05)",
    color: "var(--tibcon-red)",
    padding: "1rem 1.5rem",
    borderRadius: "12px",
    marginBottom: "1.5rem",
    border: "1px solid rgba(227, 6, 19, 0.1)",
    fontWeight: 700,
};

const successBannerStyle: React.CSSProperties = {
    background: "rgba(5, 150, 105, 0.05)",
    color: "#059669",
    padding: "1rem 1.5rem",
    borderRadius: "12px",
    marginBottom: "1.5rem",
    border: "1px solid rgba(5, 150, 105, 0.1)",
    fontWeight: 700,
};
