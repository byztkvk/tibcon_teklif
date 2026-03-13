"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getNextQuoteNo, saveQuote, getQuoteDetail, normalizeEmail } from "@/lib/sheets";
import LoadingOverlay from "@/components/LoadingOverlay";

type Role = "sales" | "region_manager" | "quote_manager" | "admin";

type Session = {
    email: string;
    role: Role;
    region?: string;
    regions?: string[];
};

type User = {
    id: string;
    displayName: string;
    email: string;
    password: string;
    role: Role;
    region?: string;
    regions?: string[];
    managerEmail?: string;
};

type Settings = {
    defaultDiscountPct: number;
    regions: string[];
    companyName?: string;
};

type Product = {
    mainCategory: string;
    subCategory: string; // ALT KATEGORİ (Col B)
    orderCode: string;   // SİPARİŞ KODU (Col C)
    productCode: string; // ÜRÜN KODU (Col D) / code
    name: string;        // ÜRÜN ADI (Col E)
    currency: "TRY" | "USD";
    listPrice: number;
    code?: string; // Backwards compatibility for code access
};

type QuoteStatus = "DRAFT" | "SUBMITTED" | "RM_APPROVED" | "QM_APPROVED";

type QuoteRow = {
    code: string;
    name: string;
    currency: "TRY" | "USD";
    listPrice: number;
    qty: number;
    discountPct: number;
    termin: string;
};

type Quote = {
    id: string;
    createdAt: string;
    validUntil?: string;
    cari: string;
    createdBy: string;
    ownerEmail: string;
    region: string;
    status: QuoteStatus;
    rows: QuoteRow[];
    terms?: string;
    yetkili?: string;
};

const USERS_KEY = "tibcon_users";
const SESSION_KEY = "tibcon_session";
const SETTINGS_KEY = "tibcon_settings";
const PRODUCTS_KEY = "tibcon_products";
const QUOTES_KEY = "tibcon_quotes";

function safeJsonParse<T>(s: string | null, fallback: T): T {
    if (!s) return fallback;
    try {
        return JSON.parse(s) as T;
    } catch {
        return fallback;
    }
}



function nowISO() {
    return new Date().toISOString();
}

function money(n: number, c: "TRY" | "USD") {
    const val = Number.isFinite(n) ? n : 0;
    const sym = c === "TRY" ? "₺" : "$";
    return `${val.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${sym}`;
}

function rowNet(row: QuoteRow) {
    const qty = Number(row.qty) || 0;
    const p = Number(row.listPrice) || 0;
    const d = Number(row.discountPct) || 0;
    const netUnit = p * (1 - d / 100);
    return netUnit * qty;
}

export default function NewQuotePage() {
    return (
        <Suspense fallback={<div>Loading quote page...</div>}>
            <NewQuoteContent />
        </Suspense>
    );
}

function NewQuoteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");
    const duplicateId = searchParams.get("duplicate");

    const [session, setSession] = useState<Session | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [settings, setSettings] = useState<Settings>({
        defaultDiscountPct: 61,
        regions: ["1. Bölge", "2. Bölge", "3. Bölge"],
        companyName: "TIBCON",
    });
    const [products, setProducts] = useState<Product[]>([]);

    const [quoteNo, setQuoteNo] = useState<string>("YENİ");
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentId, setCurrentId] = useState<string>("NEW");

    const [cari, setCari] = useState("");
    const [sehir, setSehir] = useState("");
    const [ilce, setIlce] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [validUntil, setValidUntil] = useState<string>("");
    const [ownerEmail, setOwnerEmail] = useState<string>("");
    const [rows, setRows] = useState<QuoteRow[]>([]);
    const [terms, setTerms] = useState<string>("");
    const [yetkili, setYetkili] = useState<string>("");
    const [availableTerms, setAvailableTerms] = useState<string[]>([]);
    const [originalCreatedAt, setOriginalCreatedAt] = useState<string | undefined>();

    const [pasteText, setPasteText] = useState("");
    const [warn, setWarn] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Product Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [showProductList, setShowProductList] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(true);

    // NEW: Product Selector State
    const [activeTab, setActiveTab] = useState<"selector" | "search" | "paste">("selector");
    const [selectedMainCat, setSelectedMainCat] = useState("");
    const [selectedSubCat, setSelectedSubCat] = useState("");
    const [selectionDraft, setSelectionDraft] = useState<Record<string, number>>({}); // code -> qty

    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

    // Sales Point Search State
    const [salesPoints, setSalesPoints] = useState<any[]>([]);
    const [searchFirm, setSearchFirm] = useState("");
    const [showFirmDropdown, setShowFirmDropdown] = useState(false);
    const [manualYetkili, setManualYetkili] = useState(false);
    const [loadingPoints, setLoadingPoints] = useState(true);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            setLoadingMessage("Veriler hazırlanıyor...");
            const s = safeJsonParse<Session | null>(localStorage.getItem(SESSION_KEY), null);
            if (!s?.email) {
                router.push("/login");
                return;
            }
            setSession(s);

            const u = safeJsonParse<User[]>(localStorage.getItem(USERS_KEY), []);
            setUsers(u);
            const st = safeJsonParse<Settings>(localStorage.getItem(SETTINGS_KEY), settings);
            setSettings(st);

            if (s.role === "sales") setOwnerEmail(s.email);

            // Fetch terms, Sales Points, and Products
            try {
                const { listTerms, listProducts } = await import("@/lib/sheets");

                const termsRes = await listTerms();
                if (termsRes?.terms) setAvailableTerms(termsRes.terms);

                const productsRes = await listProducts();
                let prods = [];
                if ((productsRes as any).products) prods = (productsRes as any).products;
                else if ((productsRes as any).data?.products) prods = (productsRes as any).data.products;
                setProducts(prods);
                setLoadingProducts(false);

                // Filter for Sales Points / Region Managers via API
                let cityIds = "";
                let regionIdsArr = "";

                const userRes = await fetch("/api/users").then(r => r.json());
                const me = userRes.data?.find((u: any) => u.email === s.email);

                if (me) {
                    if (me.cityIds) cityIds = me.cityIds.join(",");
                    if (me.regionIds) regionIdsArr = JSON.stringify(me.regionIds);
                }

                const pointsUrl = `/api/salesPoints?role=${s.role}&regionId=${s.region || ""}&regionIds=${regionIdsArr}&cityIds=${cityIds}&ownerEmail=${s.email}`;
                const pointsResNative = await fetch(pointsUrl).then(r => r.json());

                let points = [];
                if (pointsResNative.success) {
                    points = pointsResNative.data;
                }
                setSalesPoints(points);

                // HANDLE EDIT / DUPLICATE
                const targetId = editId || duplicateId;
                if (targetId) {
                    const res = await getQuoteDetail(targetId) as any;
                    if (res?.ok && res.quote) {
                        const q = res.quote;
                        setCari(q.cari || "");
                        setSearchFirm(q.cari || "");
                        setSehir(q.sehir || "");
                        setIlce(q.ilce || "");
                        setPhone(q.phone || "");
                        setEmail(q.email || "");
                        setValidUntil(q.validUntil ? q.validUntil.split("T")[0] : "");
                        setYetkili(q.yetkili || "");
                        setTerms(q.terms || "");
                        setRows(q.rows || []);
                        setOwnerEmail(q.ownerEmail || q.createdBy);
                        setOriginalCreatedAt(q.createdAt);

                        if (editId) {
                            setIsEditMode(true);
                            setCurrentId(q.id);
                            setQuoteNo(q.id);
                        }
                        // If duplicateId, currentId and quoteNo remain "NEW"
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingPoints(false);
                setLoadingMessage(null);
            }
        };
        load();
    }, [router, editId, duplicateId]);


    // Validation Helper
    const getVal = (obj: any, keys: string[]) => {
        if (!obj) return "";
        for (const k of keys) {
            if (k in obj && obj[k] !== null && obj[k] !== undefined) return String(obj[k]).trim();
        }
        return "";
    };

    // 1. Normalize Keys to PascalCase (Generic helper)
    const normalizePoint = (p: any) => {
        if (!p) return {};
        // Basic normalization for valid records (if any exist)
        return {
            ...p,
            FirmaAdi: p.FirmaAdi || p["Firma Adı"] || p.firmaAdi || p.name || p.Name,
            Sehir: p.Sehir || p["Şehir"] || p.sehir || p.Il || p.City,
            ilce: p.ilce || p["İlçe"] || p.District,
            Yetkili: p.Yetkili || p["Yetkili Kişi"] || p.yetkili || p.Contact,
            FirmaStatu: p.FirmaStatu || p["Firma Statüsü"] || p.statu || p.Status,
            FirmaEmail: p.FirmaEmail || p["Mail Adresi"] || p.email || p.Email,
            Telefon: p.Telefon || p.İletisim || p.tel || p.Phone,
            Adres: p.Adres || p.adres || p.Address,
            Bolge: p.Bolge || p.bolge,
            id: p.id
        };
    };

    // 2. Data Adapter for Firestore based search
    const adaptPoint = (rawP: any) => {
        if (!rawP) return {};

        return {
            ...rawP,
            FirmaAdi: rawP.name || rawP.FirmaAdi,
            Sehir: rawP.cityName || rawP.Sehir,
            ilce: rawP.district || rawP.ilce,
            Yetkili: rawP.authorizedPerson || rawP.Yetkili,
            FirmaStatu: rawP.groupName || rawP.FirmaStatu || rawP.statu,
            FirmaEmail: rawP.email || rawP.FirmaEmail || rawP.YetkiliEmail,
            Telefon: rawP.phone || rawP.Telefon,
            Adres: rawP.address || rawP.Adres,
            id: rawP.id
        };
    };

    // Filter Sales Points
    const filteredPoints = useMemo(() => {
        if (searchFirm.length < 3) return [];

        const normalize = (s: string) => {
            if (!s) return "";
            const map: any = { 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c', 'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c' };
            return String(s).toLowerCase().trim().replace(/[ğüşıöçİĞÜŞÖÇ]/g, char => map[char] || char);
        };

        const term = normalize(searchFirm);

        // Apply Adapter to ALL points
        return salesPoints.map(adaptPoint).filter(p => {
            const allValues = [
                p.FirmaAdi,
                p.Sehir,
                p.ilce,
                p.Yetkili,
                p.FirmaEmail,
                p.Telefon,
                p.FirmaStatu,
                p.SatisPersoneli
            ].map(v => normalize(String(v || ""))).join(" ");

            return allValues.includes(term);
        }).slice(0, 50);
    }, [salesPoints, searchFirm]);

    const handleSelectPoint = (point: any) => {
        // Use adapted point
        const p = adaptPoint(point);

        const name = getVal(p, ["FirmaAdi", "Firma Adı", "Firma", "name", "Name"]);
        const contact = getVal(p, ["Yetkili", "Yetkili Kişi", "Contact", "yetkili"]);
        const s = getVal(p, ["Sehir", "Şehir", "İl", "Il", "City"]);
        const i = getVal(p, ["ilce", "İlçe", "District"]);
        const tel = getVal(p, ["Telefon", "İletisim", "Tel", "Phone"]);
        const mail = getVal(p, ["FirmaEmail", "Email", "Mail"]);

        setCari(name);
        setSehir(s);
        setIlce(i);
        setPhone(tel);
        setEmail(mail);
        setSearchFirm(name);
        setYetkili(contact);
        setManualYetkili(false); // Reset manual override
        setShowFirmDropdown(false);
    };

    // Derived Sales Users
    const salesUsers = useMemo(() => users.filter((u) => u.role === "sales"), [users]);
    const selectableSales = useMemo(() => {
        if (!session) return [];
        const sessEmail = normalizeEmail(session.email);
        if (session.role === "sales") return salesUsers.filter((s) => normalizeEmail(s.email) === sessEmail);
        if (session.role === "region_manager") {
            const sessRegions = (session.region || "").split(",").map(r => r.trim()).filter(Boolean);
            return salesUsers.filter((s) =>
                normalizeEmail(s.managerEmail || "") === sessEmail ||
                sessRegions.includes(s.region || "")
            );
        }
        return salesUsers;
    }, [session, salesUsers]);

    // Owner Email Defaulting
    useEffect(() => {
        if (!session) return;
        if (session.role === "sales") {
            setOwnerEmail(session.email);
            return;
        }
        if (!ownerEmail && selectableSales.length > 0) {
            setOwnerEmail(selectableSales[0].email);
            return;
        }
    }, [session, selectableSales, ownerEmail]);

    const ownerUser = useMemo(() => salesUsers.find((u) => u.email === ownerEmail), [salesUsers, ownerEmail]);

    const totals = useMemo(() => {
        let tTry = 0, tUsd = 0;
        for (const r of rows) {
            const net = rowNet(r);
            if (r.currency === "TRY") tTry += net; else tUsd += net;
        }
        return { TRY: tTry, USD: tUsd };
    }, [rows]);

    const filteredProducts = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        // If no search, show top 50
        const list = !searchTerm
            ? products
            : products.filter(p => {
                const code = p.productCode || p.code || p.orderCode || "";
                return code.toLowerCase().includes(lower) || (p.name && p.name.toLowerCase().includes(lower));
            });
        return list.slice(0, 50);
    }, [products, searchTerm]);

    // Derived Categories
    const categories = useMemo(() => {
        const mains = Array.from(new Set(products.map(p => p.mainCategory).filter(Boolean))).sort();
        return mains;
    }, [products]);

    const subCategories = useMemo(() => {
        if (!selectedMainCat) return [];
        const subs = Array.from(new Set(products
            .filter(p => p.mainCategory === selectedMainCat)
            .map(p => p.subCategory)
            .filter(Boolean)
        )).sort();
        return subs;
    }, [products, selectedMainCat]);

    const filteredSelectorProducts = useMemo(() => {
        if (!selectedMainCat) return [];
        return products.filter(p =>
            p.mainCategory === selectedMainCat &&
            (!selectedSubCat || p.subCategory === selectedSubCat)
        );
    }, [products, selectedMainCat, selectedSubCat]);

    const handleSelectProduct = (p: Product) => {
        // Fallback for code if missing
        const code = p.productCode || p.code || p.orderCode;

        setRows(prev => [...prev, {
            code: code,
            name: p.name,
            currency: p.currency || "USD", // Default
            listPrice: p.listPrice,
            qty: 1,
            discountPct: settings.defaultDiscountPct,
            termin: "STOK"
        }]);
        setShowProductList(false);
        setSearchTerm("");
    };

    const handleAddSelection = () => {
        const newRows: QuoteRow[] = [];
        Object.entries(selectionDraft).forEach(([pCode, qty]) => {
            if (qty > 0) {
                const p = products.find(prod => (prod.productCode || prod.code) === pCode);
                if (p) {
                    newRows.push({
                        code: p.productCode || p.code || p.orderCode,
                        name: p.name,
                        currency: p.currency || "USD",
                        listPrice: p.listPrice,
                        qty: qty,
                        discountPct: settings.defaultDiscountPct,
                        termin: "STOK"
                    });
                }
            }
        });
        setRows(prev => [...prev, ...newRows]);
        setSelectionDraft({});
        setErr(null);
    };

    const toggleSelection = (pCode: string) => {
        setSelectionDraft(prev => {
            const next = { ...prev };
            if (next[pCode]) {
                delete next[pCode];
            } else {
                next[pCode] = 1;
            }
            return next;
        });
    };

    const updateSelectionQty = (pCode: string, qty: number) => {
        setSelectionDraft(prev => ({ ...prev, [pCode]: Math.max(0, qty) }));
    };

    function addRowsFromPaste() {
        setErr(null);
        setWarn(null);
        const lines = (pasteText || "").split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) { setWarn("Yapıştırılan veri boş."); return; }

        const byCode = new Map(products.map((p) => {
            const code = p.productCode || p.code || p.orderCode || "";
            return [code.toUpperCase(), p];
        }));
        const notFound: string[] = [];
        const nextRows: QuoteRow[] = [...rows];

        lines.forEach(line => {
            let code = "", qty = 1;
            const parts = line.trim().split(/\s+/);
            if (parts.length > 1) {
                const last = parts[parts.length - 1];
                if (!isNaN(Number(last))) {
                    qty = Number(last);
                    code = parts.slice(0, parts.length - 1).join(" ");
                } else {
                    code = line.trim();
                }
            } else {
                code = parts[0];
            }

            const lookupCode = (code || "").trim().toUpperCase();
            const prod = byCode.get(lookupCode);
            if (!prod) { notFound.push(code); return; }

            const pCode = prod.productCode || prod.code || prod.orderCode || "";
            const existingIndex = nextRows.findIndex((r) => r.code === pCode);
            if (existingIndex >= 0) {
                nextRows[existingIndex] = { ...nextRows[existingIndex], qty: (Number(nextRows[existingIndex].qty) || 0) + qty };
            } else {
                nextRows.push({
                    code: pCode,
                    name: prod.name,
                    currency: prod.currency || "USD",
                    listPrice: prod.listPrice,
                    qty: qty,
                    discountPct: Number(settings.defaultDiscountPct) || 0,
                    termin: "STOK",
                });
            }
        });
        setRows(nextRows);
        setPasteText("");
        if (notFound.length) setWarn(`Bulunamayan ürünler: ${notFound.slice(0, 5).join(", ")}${notFound.length > 5 ? "..." : ""}`);
    }

    function updateRow(i: number, patch: Partial<QuoteRow>) {
        const copy = rows.slice();
        copy[i] = { ...copy[i], ...patch };
        setRows(copy);
    }
    function removeRow(i: number) {
        const copy = rows.slice();
        copy.splice(i, 1);
        setRows(copy);
    }

    async function saveDraft() {
        setErr(null);
        if (!session) return;
        // if (!quoteNo) return setErr("Teklif No boş."); // Removed: Server generates ID
        if (!ownerEmail) return setErr("Teklif sahibi seçiniz.");
        if (!cari.trim()) return setErr("Cari bilgisi zorunlu.");
        if (rows.length === 0) return setErr("En az 1 ürün ekleyin.");

        setSaving(true);
        setLoadingMessage(isEditMode ? "Teklif güncelleniyor..." : "Yeni teklif oluşturuluyor...");
        try {
            const q: any = {
                id: currentId, // preserved if editing, "NEW" if creating/duplicating
                createdAt: isEditMode ? originalCreatedAt : nowISO(),
                validUntil: validUntil || "",
                cari: cari.trim(),
                sehir: sehir,
                ilce: ilce,
                phone: phone,
                email: email,
                createdBy: session.email,
                ownerEmail: ownerEmail,
                region: ownerUser?.region || "",
                status: "DRAFT",
                rows: rows.map((r) => ({
                    ...r,
                    qty: Math.max(0, Number(r.qty) || 0),
                    discountPct: Math.min(100, Math.max(0, Number(r.discountPct) || 0)),
                    termin: (r.termin || "STOK").trim() || "STOK",
                    listPrice: Number(r.listPrice) || 0,
                })),
                terms: terms.trim(),
                yetkili: yetkili.trim()
            };

            // API Save
            const result = await saveQuote({
                quote: {
                    ...q,
                    totalTRY: rows.reduce((acc, r) => acc + (r.currency === "TRY" ? rowNet(r) : 0), 0),
                    totalUSD: rows.reduce((acc, r) => acc + (r.currency === "USD" ? rowNet(r) : 0), 0)
                },
                rows: rows
            });

            if (!result?.ok) {
                throw new Error(result?.message || "Sunucu tarafında kaydedilemedi.");
            }

            const finalId = result.id || q.id;

            // Update LocalStorage (Optional, for redundancy)
            const all = safeJsonParse<Quote[]>(localStorage.getItem(QUOTES_KEY), []);
            const next = [{ ...q, id: finalId }, ...all];
            localStorage.setItem(QUOTES_KEY, JSON.stringify(next));

            // Save new term to library if it doesn't exist
            if (terms.trim() && !availableTerms.includes(terms.trim())) {
                import("@/lib/sheets").then(({ saveTerm }) => {
                    saveTerm(terms.trim()).catch(console.error);
                });
            }

            router.push(`/quotes/${encodeURIComponent(finalId)}`);
        } catch (e: any) {
            setErr(e?.message || "Kaydetme hatası.");
        } finally {
            setSaving(false);
            setLoadingMessage(null);
        }
    }

    if (!session) return null;
    const canPickOwner = session.role !== "sales";

    return (
        <div className="page-container">
            {/* ... (header) ... */}

            {/* Main Inputs */}
            <div className="stack-mobile" style={mainGridStyle}>
                <div style={{ flex: 2, position: "relative" }}>
                    <label style={labelStyle}>Cari Bilgisi (Müşteri) <span style={{ color: "red" }}>*</span></label>
                    {!cari ? (
                        // Search Mode
                        <>
                            <input
                                value={searchFirm}
                                onChange={e => {
                                    setSearchFirm(e.target.value);
                                    setShowFirmDropdown(true);
                                }}
                                onFocus={() => setShowFirmDropdown(true)}
                                placeholder={loadingPoints ? "Firma listesi yükleniyor..." : `Satış Noktası Ara (En az 3 harf)...`}
                                style={{ ...inputStyle, border: "2px solid var(--tibcon-blue)" }}
                                autoFocus
                            />
                            {showFirmDropdown && searchFirm.length >= 3 && (
                                <div style={searchDropdownStyle}>
                                    {filteredPoints.length > 0 ? (
                                        filteredPoints.map((p, i) => (
                                            <div
                                                key={i}
                                                onClick={() => handleSelectPoint(p)}
                                                style={searchItemStyle}
                                                onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                                                onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                                            >
                                                <div style={{ fontWeight: 600 }}>{p.FirmaAdi}</div>
                                                <div style={{ fontSize: "0.8rem", color: "#666" }}>{p.Sehir} / {p.ilce}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: "1rem" }}>
                                            <div style={{ color: "#666", fontSize: "0.9rem", marginBottom: "8px" }}>
                                                Sonuç bulunamadı.
                                            </div>
                                            <button
                                                onClick={() => window.open("/visits/points/new", "_blank")}
                                                style={{
                                                    width: "100%", padding: "8px",
                                                    background: "var(--tibcon-red)", color: "white",
                                                    borderRadius: "6px", border: "none", cursor: "pointer"
                                                }}
                                            >
                                                + Yeni Satış Noktası Ekle
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        // Selected Mode
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{
                                flex: 1, padding: "0.875rem 1rem", borderRadius: "12px",
                                background: "#eefbf0", border: "1px solid #22c55e",
                                color: "#15803d", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between"
                            }}>
                                <span>{cari}</span>
                                <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>Seçildi ✅</span>
                            </div>
                            <button
                                onClick={() => {
                                    setCari("");
                                    setSehir("");
                                    setIlce("");
                                    setPhone("");
                                    setEmail("");
                                    setSearchFirm("");
                                    setYetkili("");
                                    setManualYetkili(false);
                                }}
                                title="Seçimi Kaldır"
                                style={{
                                    padding: "0.875rem", borderRadius: "12px", border: "1px solid #ef4444",
                                    background: "#fef2f2", color: "#ef4444", cursor: "pointer"
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Teklif Geçerlilik Sonu</label>
                    <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, display: "flex", justifyContent: "space-between" }}>
                        <span>Müşteri Yetkilisi</span>
                        <button
                            onClick={() => setManualYetkili(!manualYetkili)}
                            style={{ border: "none", background: "none", color: "var(--tibcon-red)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                        >
                            {manualYetkili ? "Otomatik" : "Manuel Düzenle"}
                        </button>
                    </label>
                    <input
                        value={yetkili}
                        onChange={e => setYetkili(e.target.value)}
                        placeholder="İsim / Soyisim"
                        style={{ ...inputStyle, background: manualYetkili ? "white" : "#f0f0f0" }}
                        readOnly={!manualYetkili}
                    />
                </div>
            </div>

            {cari && (
                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1.5rem", marginBottom: "1.5rem", padding: "1rem",
                    background: "#f8f9fa", borderRadius: "12px", border: "1px solid var(--tibcon-border)"
                }}>
                    <div>
                        <label style={{ fontSize: "0.75rem", color: "#888" }}>Şehir / İlçe</label>
                        <div style={{ fontWeight: 600 }}>{sehir || "-"} / {ilce || "-"}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: "0.75rem", color: "#888" }}>Telefon</label>
                        <div style={{ fontWeight: 600 }}>{phone || "-"}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: "0.75rem", color: "#888" }}>Email</label>
                        <div style={{ fontWeight: 600 }}>{email || "-"}</div>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: "2rem" }}>
                <label style={labelStyle}>Teklif Sahibi (Satış Sorumlusu)</label>
                <select value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} disabled={!canPickOwner} style={inputStyle}>
                    {selectableSales.map(s => <option key={s.email} value={s.email}>{s.displayName} ({s.region})</option>)}
                </select>
            </div>

            <div style={{ margin: "2.5rem 0", borderTop: "1px solid var(--tibcon-border)" }} />

            {/* PRODUCT SELECTION TABS */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #dee2e6", marginBottom: "1.5rem", overflowX: "auto", whiteSpace: "nowrap", WebkitOverflowScrolling: "touch", paddingBottom: "4px" }}>
                    <button
                        onClick={() => setActiveTab("selector")}
                        style={{
                            padding: "0.75rem 1rem",
                            borderBottom: activeTab === "selector" ? "3px solid var(--tibcon-blue)" : "3px solid transparent",
                            fontWeight: activeTab === "selector" ? 700 : 500,
                            color: activeTab === "selector" ? "var(--tibcon-blue)" : "#6c757d",
                            background: "none", border: "none", cursor: "pointer", flexShrink: 0
                        }}
                    >
                        📂 Kategori
                    </button>
                    <button
                        onClick={() => setActiveTab("search")}
                        style={{
                            padding: "0.75rem 1rem",
                            borderBottom: activeTab === "search" ? "3px solid var(--tibcon-blue)" : "3px solid transparent",
                            fontWeight: activeTab === "search" ? 700 : 500,
                            color: activeTab === "search" ? "var(--tibcon-blue)" : "#6c757d",
                            background: "none", border: "none", cursor: "pointer", flexShrink: 0
                        }}
                    >
                        🔍 Arama
                    </button>
                    <button
                        onClick={() => setActiveTab("paste")}
                        style={{
                            padding: "0.75rem 1rem",
                            borderBottom: activeTab === "paste" ? "3px solid var(--tibcon-blue)" : "3px solid transparent",
                            fontWeight: activeTab === "paste" ? 700 : 500,
                            color: activeTab === "paste" ? "var(--tibcon-blue)" : "#6c757d",
                            background: "none", border: "none", cursor: "pointer", flexShrink: 0
                        }}
                    >
                        ⚡ Yapıştır
                    </button>
                </div>

                {/* 1. CATEGORY SELECTOR UI */}
                {activeTab === "selector" && (
                    <div style={{ background: "#f8f9fa", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--tibcon-border)" }}>
                        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Ana Kategori</label>
                                <select
                                    style={inputStyle}
                                    value={selectedMainCat}
                                    onChange={e => { setSelectedMainCat(e.target.value); setSelectedSubCat(""); }}
                                >
                                    <option value="">Seçiniz...</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Alt Kategori</label>
                                <select
                                    style={inputStyle}
                                    value={selectedSubCat}
                                    onChange={e => setSelectedSubCat(e.target.value)}
                                    disabled={!selectedMainCat}
                                >
                                    <option value="">Tümü</option>
                                    {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedMainCat && (
                            <div>
                                <div style={{ maxHeight: "400px", overflowY: "auto", background: "white", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead style={{ position: "sticky", top: 0, background: "#f1f3f5", zIndex: 1 }}>
                                            <tr style={{ textAlign: "left" }}>
                                                <th style={{ padding: "10px", width: "40px" }}></th>
                                                <th style={{ padding: "10px" }}>Ürün Kodu</th>
                                                <th style={{ padding: "10px" }}>Ürün Adı</th>
                                                <th style={{ padding: "10px" }}>Sipariş Kodu</th>
                                                <th style={{ padding: "10px" }}>Fiyat</th>
                                                <th style={{ padding: "10px", width: "100px" }}>Adet</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSelectorProducts.map(p => {
                                                const pID = p.productCode || p.code || p.orderCode;
                                                const isSelected = !!selectionDraft[pID];
                                                const qty = selectionDraft[pID] || 0;

                                                return (
                                                    <tr key={pID} style={{ borderBottom: "1px solid #f0f0f0", background: isSelected ? "#e6fffa" : "white" }}>
                                                        <td style={{ padding: "10px", textAlign: "center" }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelection(pID)}
                                                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: "10px", fontWeight: 600 }}>{p.productCode}</td>
                                                        <td style={{ padding: "10px", color: "#555", fontSize: "0.9rem" }}>{p.name}</td>
                                                        <td style={{ padding: "10px", color: "#888", fontSize: "0.85rem" }}>{p.orderCode}</td>
                                                        <td style={{ padding: "10px", fontWeight: 600, color: "var(--tibcon-red)" }}>{money(p.listPrice, p.currency || "USD")}</td>
                                                        <td style={{ padding: "10px" }}>
                                                            {isSelected && (
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={qty}
                                                                    onChange={(e) => updateSelectionQty(pID, Number(e.target.value))}
                                                                    style={{ ...compactInputStyle, width: "80px" }}
                                                                />
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: "1rem", textAlign: "right" }}>
                                    <button
                                        onClick={handleAddSelection}
                                        className="tibcon-btn tibcon-btn-primary"
                                        style={{ padding: "0.8rem 2rem" }}
                                        disabled={Object.keys(selectionDraft).length === 0}
                                    >
                                        Seçilenleri Ekle ({Object.keys(selectionDraft).length})
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. CATALOG SEARCH UI */}
                {activeTab === "search" && (
                    <div style={{ position: "relative" }}>
                        <div style={searchHeaderStyle}>
                            <h3 className="outfit" style={{ margin: 0, fontSize: "1.1rem" }}>Ürün Katalog Araması</h3>
                            <span style={{ fontSize: "0.75rem", color: loadingProducts ? "var(--tibcon-red)" : "#16a34a", fontWeight: 700 }}>
                                {loadingProducts ? "KATALOG SENKRONİZASYONU..." : `${products.length} ÜRÜN AKTİF`}
                            </span>
                        </div>
                        <input
                            placeholder="Ürün kodu veya açıklama ile ara..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowProductList(true);
                            }}
                            onFocus={() => setShowProductList(true)}
                            style={searchInputStyle}
                        />

                        {showProductList && (searchTerm.length > 0 || filteredProducts.length > 0) && (
                            <div style={searchDropdownStyle}>
                                {loadingProducts && <div style={{ padding: "2rem", textAlign: "center", color: "var(--tibcon-gray-dark)" }}>Ürünler yükleniyor...</div>}

                                {!loadingProducts && filteredProducts.length === 0 && (
                                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--tibcon-gray-dark)" }}>Sonuç bulunamadı.</div>
                                )}

                                {!loadingProducts && filteredProducts.map(p => (
                                    <div
                                        key={p.code || p.productCode}
                                        onClick={() => handleSelectProduct(p)}
                                        style={searchItemStyle}
                                        className="search-item-hover"
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 800, color: "var(--tibcon-black)", fontSize: "0.95rem" }}>{p.productCode || p.code}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--tibcon-gray-dark)", marginTop: "2px" }}>{p.name}</div>
                                        </div>
                                        <div style={{ fontWeight: 800, color: "var(--tibcon-red)", fontSize: "1rem" }}>
                                            {money(p.listPrice, p.currency || "USD")}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. PASTE UI */}
                {activeTab === "paste" && (
                    <div style={fastAddContainerStyle}>
                        <div style={fastAddHeaderStyle}>
                            ⚡ Hızlı Satır Ekleme (Kod ve Adet yapıştırın)
                        </div>
                        <div style={{ padding: "1.25rem" }}>
                            <textarea
                                value={pasteText}
                                onChange={e => setPasteText(e.target.value)}
                                placeholder="Örn: CP-12-34 50&#10;KB-90-11 100"
                                style={textareaStyle}
                            />
                            <div style={{ display: "flex", gap: "12px", marginTop: "1rem" }}>
                                <button onClick={addRowsFromPaste} className="tibcon-btn tibcon-btn-primary" style={{ padding: "0.6rem 1.5rem" }}>Listeye Ekle</button>
                                <button onClick={() => setPasteText("")} className="tibcon-btn tibcon-btn-outline" style={{ padding: "0.6rem 1.5rem" }}>İçeriği Temizle</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* TABLE */}
            <div style={{ overflowX: "auto", marginTop: "2rem" }}>
                <table className="premium-table responsive-table">
                    <thead>
                        <tr>
                            <th>Ürün Kodu</th>
                            <th>Açıklama</th>
                            <th>Liste Fiyatı</th>
                            <th style={{ width: "100px" }}>Adet</th>
                            <th style={{ width: "100px" }}>İskonto %</th>
                            <th>Net Toplam</th>
                            <th>Termin</th>
                            <th style={{ textAlign: "right" }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i}>
                                <td data-label="Ürün Kodu"><div style={{ fontWeight: 800 }}>{r.code}</div></td>
                                <td data-label="Açıklama" style={{ fontSize: "0.75rem", color: "var(--tibcon-gray-dark)", maxWidth: "200px" }}>{r.name}</td>
                                <td data-label="Liste Fiyatı" style={{ fontWeight: 600 }}>{money(r.listPrice, r.currency)}</td>
                                <td data-label="Adet">
                                    <input type="number" value={r.qty} onChange={e => updateRow(i, { qty: Number(e.target.value) })} style={compactInputStyle} />
                                </td>
                                <td data-label="İskonto %">
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                                        <input type="number" value={r.discountPct} onChange={e => updateRow(i, { discountPct: Number(e.target.value) })} style={compactInputStyle} />
                                        <span style={{ fontSize: "0.8rem", color: "#888" }}>%</span>
                                    </div>
                                </td>
                                <td data-label="Net Toplam"><div style={{ fontWeight: 800, color: "var(--tibcon-black)" }}>{money(rowNet(r), r.currency)}</div></td>
                                <td data-label="Termin">
                                    <input value={r.termin} onChange={e => updateRow(i, { termin: e.target.value })} style={{ ...compactInputStyle, width: "100%", textAlign: "left" }} />
                                </td>
                                <td style={{ textAlign: "right" }}>
                                    <button onClick={() => removeRow(i)} style={{ color: "var(--tibcon-red)", border: "none", background: "none", cursor: "pointer", fontSize: "1.2rem", padding: "4px" }}>&times;</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 && (
                    <div style={{ padding: "4rem", textAlign: "center", color: "var(--tibcon-gray-dark)", background: "rgba(0,0,0,0.01)", border: "1px dashed var(--tibcon-border)", borderRadius: "0 0 12px 12px" }}>
                        Henüz ürün eklenmedi. Arama yaparak veya toplu yapıştırarak ürün ekleyebilirsiniz.
                    </div>
                )}
            </div>

            {/* TERMS SECTION */}
            <div style={{ marginTop: "2.5rem", borderTop: "1px solid var(--tibcon-border)", paddingTop: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 className="outfit" style={{ margin: 0, fontSize: "1.1rem" }}>Teklif Şartları</h3>
                    {availableTerms.length > 0 && (
                        <select
                            style={{ padding: "4px 8px", borderRadius: "8px", border: "1px solid var(--tibcon-border)", fontSize: "0.80rem", background: "white" }}
                            onChange={(e) => setTerms(e.target.value)}
                            value=""
                        >
                            <option value="" disabled>Kayıtlı Şartlardan Seç...</option>
                            {availableTerms.map((t, idx) => (
                                <option key={idx} value={t}>{t.substring(0, 60)}{t.length > 60 ? "..." : ""}</option>
                            ))}
                        </select>
                    )}
                </div>
                <textarea
                    value={terms}
                    onChange={e => setTerms(e.target.value)}
                    placeholder="Ödeme vadesi, sevkiyat şartları vb. özel notlar..."
                    style={{ ...textareaStyle, height: "120px", fontFamily: "inherit", background: "white" }}
                />
            </div>

            {/* Footer / Summary */}
            <div className="stack-mobile" style={{ ...footerContainerStyle, alignItems: "stretch" }}>
                <div style={totalsBoxStyle}>
                    {totals.TRY > 0 && (
                        <div style={totalRowStyle}>
                            <span style={{ color: "var(--tibcon-gray-dark)" }}>TOPLAM (TRY):</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800 }}>{money(totals.TRY, "TRY")}</span>
                        </div>
                    )}
                    {totals.USD > 0 && (
                        <div style={totalRowStyle}>
                            <span style={{ color: "var(--tibcon-gray-dark)" }}>TOPLAM (USD):</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800 }}>{money(totals.USD, "USD")}</span>
                        </div>
                    )}
                </div>

                <div className="stack-mobile" style={{ display: "flex", gap: "12px" }}>
                    <button onClick={() => router.push("/quotes")} className="tibcon-btn tibcon-btn-outline" style={{ padding: "1rem 2.5rem" }}>
                        Vazgeç
                    </button>
                    <button onClick={saveDraft} disabled={saving} className="tibcon-btn tibcon-btn-primary" style={{ padding: "1rem 3rem", flex: 1 }}>
                        {saving ? "İşleniyor..." : "Taslağı Kaydet"}
                    </button>
                </div>
            </div >
            {loadingMessage && <LoadingOverlay message={loadingMessage} />}
        </div >

    );
}

// New Quote Styles
const headerContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
    gap: "1.5rem",
    flexWrap: "wrap",
};

const sessionInfoStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
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
    marginBottom: "1.5rem",
    flexWrap: "wrap",
};

const searchHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem"
};

const searchInputStyle: React.CSSProperties = {
    ...inputStyle,
    height: "56px",
    fontSize: "1.1rem",
    border: "2px solid var(--tibcon-border)",
    background: "white",
    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
    paddingLeft: "1.5rem",
};

const searchDropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "white",
    border: "1px solid var(--tibcon-border)",
    borderRadius: "0 0 16px 16px",
    boxShadow: "0 15px 35px rgba(0,0,0,0.12)",
    zIndex: 100,
    maxHeight: "450px",
    overflowY: "auto",
    marginTop: "4px",
};

const searchItemStyle: React.CSSProperties = {
    padding: "1rem 1.5rem",
    borderBottom: "1px solid rgba(0,0,0,0.04)",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "all 0.15s",
};

const fastAddContainerStyle: React.CSSProperties = {
    background: "var(--tibcon-gray)",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid var(--tibcon-border)",
};

const fastAddHeaderStyle: React.CSSProperties = {
    padding: "0.875rem 1.25rem",
    background: "rgba(0,0,0,0.02)",
    borderBottom: "1px solid var(--tibcon-border)",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--tibcon-anth)",
};

const textareaStyle: React.CSSProperties = {
    width: "100%",
    height: "100px",
    borderRadius: "12px",
    border: "1px solid var(--tibcon-border)",
    padding: "1rem",
    fontSize: "0.9rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "monospace",
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
    alignItems: "flex-end",
    gap: "2rem",
    flexWrap: "wrap",
};

const totalsBoxStyle: React.CSSProperties = {
    background: "var(--tibcon-black)",
    color: "white",
    padding: "1.5rem 2rem",
    borderRadius: "20px",
    minWidth: "300px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
};

const totalRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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

const warningBannerStyle: React.CSSProperties = {
    background: "rgba(245, 158, 11, 0.05)",
    color: "#d97706",
    padding: "1rem 1.5rem",
    borderRadius: "12px",
    marginBottom: "1.5rem",
    border: "1px solid rgba(245, 158, 11, 0.1)",
    fontWeight: 600,
};
