"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    CompensationInputs,
    CompensationMode,
    CalculationResults,
    BomLine,
    CompProduct,
    CompMappings,
    StepPlan,
    ProductIndex,
    SelectionStepTrace
} from "@/lib/compensation/types";
import { calculateCompensation } from "@/lib/compensation/calc";
import { getIndexedProducts } from "@/lib/compensation/products";
import { autoSelectProducts } from "@/lib/compensation/autoSelect";
import { generateStepPlans } from "@/lib/compensation/stepPlans";
import { convertBomToQuote } from "@/lib/compensation/toQuote";
import { listMappings } from "@/lib/sheets";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function CompensationClient() {
    const router = useRouter();

    // --- State ---
    const [inputs, setInputs] = useState<CompensationInputs>({
        trafoKva: 400,
        loadRatio: 0.8,
        currentCos: 0.85,
        targetCos: 0.99,
        gridVoltage: 400,
        gridFrequency: 50,
        phaseType: "TRIFAZE",
        harmonicSuspicion: false,
        pPct: 7,
        targetCapVoltage: 525,
        filterType: "FILTER",
        stepCount: 12,
        mode: "UNFILTERED",
        minFirstStepKvar: 10
    });

    const [bom, setBom] = useState<BomLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
    const [productIndex, setProductIndex] = useState<ProductIndex | null>(null);
    const [mappings, setMappings] = useState<CompMappings | null>(null);
    const [session, setSession] = useState<any>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectionTrace, setSelectionTrace] = useState<SelectionStepTrace[]>([]);
    const [actualCapV, setActualCapV] = useState<number | null>(null);

    // Filter Suggestion State
    const [showSuggestion, setShowSuggestion] = useState(false);

    // Filter Sales Points
    const [salesPoints, setSalesPoints] = useState<any[]>([]);
    const [selectedPointId, setSelectedPointId] = useState("");
    const [showPointModal, setShowPointModal] = useState(false);
    // --- Data Load ---
    useEffect(() => {
        const load = async () => {
            try {
                setLoadingMsg("Veriler yükleniyor...");
                const sessStored = localStorage.getItem("tibcon_session");
                if (!sessStored) return router.push("/login");
                const sess = JSON.parse(sessStored);
                setSession(sess);

                const [idx, maps, userRes] = await Promise.all([
                    getIndexedProducts(),
                    listMappings(),
                    fetch("/api/users").then(r => r.json())
                ]);

                if (!idx) throw new Error("Ürün listesi alınamadı.");
                setProductIndex(idx);
                setMappings(maps || { harmonicMap: [], protectionMap: [] });

                // Load Points
                const me = userRes.data?.find((u: any) => u.email === sess.email);
                let cityIds = "";
                let rIds = "";
                if (me) {
                    if (me.cityIds) cityIds = me.cityIds.join(",");
                    if (me.regionIds) rIds = JSON.stringify(me.regionIds);
                }
                const pUrl = `/api/salesPoints?role=${sess.role}&regionId=${sess.region || ""}&regionIds=${rIds}&cityIds=${cityIds}&ownerEmail=${sess.email}`;
                const pRes = await fetch(pUrl).then(r => r.json());
                if (pRes.success) setSalesPoints(pRes.data);
            } catch (e: any) {
                console.error("[Compensation] Load Error:", e);
                alert("Veri yüklenirken hata oluştu: " + e.message);
            } finally {
                setLoading(false);
                setLoadingMsg(null);
            }
        };
        load();
    }, [router]);

    // --- Calculations ---
    const results = useMemo(() => calculateCompensation(inputs), [inputs]);

    const plans = useMemo(() => {
        if (!productIndex) return [];
        return generateStepPlans(inputs, results.q_need_kvar, productIndex);
    }, [inputs, results.q_need_kvar, productIndex]);

    const selectedPlan = useMemo(() => {
        return plans.find(p => p.id === selectedPlanId) || plans.find(p => p.isRecommended) || null;
    }, [plans, selectedPlanId]);

    useEffect(() => {
        if (inputs.mode === "UNFILTERED" && results.suggestFilter) {
            setShowSuggestion(true);
        } else {
            setShowSuggestion(false);
        }
    }, [results.suggestFilter, inputs.mode]);

    // --- Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

        const numericFields = [
            "trafoKva", "loadRatio", "currentCos", "targetCos",
            "gridVoltage", "gridFrequency", "pPct", "targetCapVoltage", "stepCount", "minFirstStepKvar"
        ];

        let finalValue: any = val;
        if (numericFields.includes(name) && typeof value === "string") {
            const normalized = value.replace(/,/g, ".");
            finalValue = parseFloat(normalized);
            if (isNaN(finalValue)) finalValue = 0;
        }

        setInputs(prev => ({ ...prev, [name]: finalValue }));
    };

    const runAutoSelect = () => {
        if (!productIndex || !selectedPlan) return alert("Hata: Ürün verisi veya plan seçilmedi.");
        setLoadingMsg("Ürünler seçiliyor...");
        try {
            const res = autoSelectProducts(inputs, results, productIndex, mappings || { harmonicMap: [], protectionMap: [] }, selectedPlan);
            setBom(res.bom);
            setSelectionTrace(res.trace);
            setActualCapV(res.capV_selected);

            const errors = res.trace.filter(t => t.error).map(t => `${t.stepKvar}kVAr: ${t.error}`);
            if (errors.length > 0) {
                alert("Bazı kademelerde ürün bulunamadı:\n\n" + errors.join("\n"));
            }
        } catch (error: any) {
            alert("Hata: " + error.message);
        } finally {
            setLoadingMsg(null);
        }
    };

    const handleToQuote = async () => {
        if (bom.length === 0) return alert("BOM Listesi Boş.");
        setShowPointModal(true);
    };

    const confirmToQuote = async () => {
        if (!selectedPointId) return alert("Lütfen bir cari seçin.");
        const point = salesPoints.find(p => p.id === selectedPointId);
        if (!point) return;

        setShowPointModal(false);
        setLoadingMsg("Teklife dönüştürülüyor...");
        try {
            const res = await convertBomToQuote(bom, session, {
                name: point.name,
                city: point.cityName || "",
                district: point.district || ""
            });
            if (res?.ok) {
                alert("Teklif başarıyla oluşturuldu.");
                router.push(`/quotes/${res.id}`);
            } else {
                alert("Hata: " + (res?.message || "Bilinmeyen hata"));
            }
        } catch (e: any) {
            alert("Hata: " + e.message);
        } finally {
            setLoadingMsg(null);
        }
    };

    const totalBom = useMemo(() => bom.reduce((acc, curr) => acc + (curr.price * curr.qty), 0), [bom]);
    const totalKvar = useMemo(() => bom.reduce((acc, curr) => curr.type === "CAP" ? acc + (curr.unitKvar * curr.qty) : acc, 0), [bom]);

    if (loading && !loadingMsg) return null;

    return (
        <div className="page-container" style={{ maxWidth: "1400px", margin: "0 auto", paddingBottom: "5rem" }}>
            <LoadingOverlay message={loadingMsg} />

            {/* HEADER & METRICS */}
            <div style={headerStyle}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <h1 className="title-lg outfit" style={{ margin: 0 }}>Kompanzasyon Sihirbazı</h1>
                        <button
                            className="tibcon-btn tibcon-btn-outline"
                            onClick={() => router.push("/compensation/wizard")}
                            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                        >
                            ✏️ Tek Hat Tasarımcısı (Manuel)
                        </button>
                    </div>
                    <div style={modeSegmented}>
                        <button
                            style={inputs.mode === "UNFILTERED" ? activeSeg : inactiveSeg}
                            onClick={() => { setInputs(p => ({ ...p, mode: "UNFILTERED" })); setBom([]); setSelectionTrace([]); setActualCapV(null); }}
                        >Klasik (Filtresiz)</button>
                        <button
                            style={inputs.mode === "FILTERED" ? activeSeg : inactiveSeg}
                            onClick={() => { setInputs(p => ({ ...p, mode: "FILTERED" })); setBom([]); setSelectionTrace([]); setActualCapV(null); }}
                        >Harmonik Filtreli</button>
                    </div>
                </div>

                <div style={metricsBar}>
                    <div style={metricItem}>
                        <span style={metLabel}>GEREKLİ GÜÇ</span>
                        <span style={metVal}>{results.q_need_kvar.toFixed(1)} kVAr</span>
                    </div>
                    <div style={metricItem}>
                        <span style={metLabel}>SEÇİLEN GÜÇ</span>
                        <span style={metVal}>{totalKvar.toFixed(1)} kVAr</span>
                    </div>
                    <div style={metricItem}>
                        <span style={metLabel}>TOPLAM BOM</span>
                        <span style={{ ...metVal, color: "var(--tibcon-red)" }}>{totalBom.toLocaleString()} $</span>
                    </div>
                </div>
            </div>

            {/* SUGGESTION BANNER */}
            {showSuggestion && (
                <div style={bannerStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "1.5rem" }}>🚨</span>
                        <span>Filtresiz seçim yapıldı. Harmonik yük ihtimali varsa filtreli kompanzasyon önerilir.</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button style={bannerBtn} onClick={() => { setInputs(p => ({ ...p, mode: "FILTERED" })); setBom([]); }}>Filtreli Moda Geç</button>
                        <button style={bannerClose} onClick={() => setShowSuggestion(false)}>Yoksay</button>
                    </div>
                </div>
            )}

            <div style={topGrid}>
                {/* 1. SYSTEM PARAMETERS */}
                <div className="premium-card" style={{ padding: "1.5rem" }}>
                    <h3 className="outfit" style={{ marginTop: 0 }}>Sistem Parametreleri</h3>

                    <div style={formGrid}>
                        <div style={inputGroup}>
                            <label style={labelStyle}>Trafo Gücü (kVA)</label>
                            <input type="number" name="trafoKva" value={inputs.trafoKva} onChange={handleInputChange} style={inputStyle} />
                        </div>
                        <div style={inputGroup}>
                            <label style={labelStyle}>Yük Oranı (0.0-1.0)</label>
                            <input type="number" step="0.1" name="loadRatio" value={inputs.loadRatio} onChange={handleInputChange} style={inputStyle} />
                        </div>
                        <div style={inputGroup}>
                            <label style={labelStyle}>Mevcut Cosφ</label>
                            <input type="number" step="0.01" name="currentCos" value={inputs.currentCos} onChange={handleInputChange} style={inputStyle} />
                        </div>
                        <div style={inputGroup}>
                            <label style={labelStyle}>Hedef Cosφ</label>
                            <input type="number" step="0.01" name="targetCos" value={inputs.targetCos} onChange={handleInputChange} style={inputStyle} />
                        </div>
                        <div style={inputGroup}>
                            <label style={labelStyle}>Faz Tipi</label>
                            <select name="phaseType" value={inputs.phaseType} onChange={handleInputChange} style={inputStyle}>
                                <option value="TRIFAZE">Trifaze</option>
                                <option value="MONOFAZE">Monofaze</option>
                            </select>
                        </div>
                        <div style={inputGroup}>
                            <label style={labelStyle}>Şebeke Gerilimi (V)</label>
                            <input type="number" name="gridVoltage" value={inputs.gridVoltage} onChange={handleInputChange} style={inputStyle} />
                        </div>
                        <div style={inputGroup}>
                            <label style={labelStyle}>İlk Kademe Min (kVAr)</label>
                            <select name="minFirstStepKvar" value={inputs.minFirstStepKvar} onChange={handleInputChange} style={inputStyle}>
                                <option value={5}>5 kVAr</option>
                                <option value={7.5}>7.5 kVAr</option>
                                <option value={10}>10 kVAr</option>
                            </select>
                        </div>

                        {inputs.mode === "FILTERED" && (
                            <>
                                <div style={inputGroup}>
                                    <label style={labelStyle}>Filtre Faktörü (p%)</label>
                                    <select name="pPct" value={inputs.pPct} onChange={handleInputChange} style={inputStyle}>
                                        <option value={7}>7% (189 Hz)</option>
                                        <option value={5.67}>5.67% (210 Hz)</option>
                                        <option value={14}>14% (134 Hz)</option>
                                    </select>
                                </div>
                                <div style={inputGroup}>
                                    <label style={labelStyle}>Kondansatör Sınıfı (V)</label>
                                    <select name="targetCapVoltage" value={inputs.targetCapVoltage} onChange={handleInputChange} style={inputStyle}>
                                        <option value={440}>440 V</option>
                                        <option value={480}>480 V</option>
                                        <option value={525}>525 V</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                            <input type="checkbox" name="harmonicSuspicion" checked={inputs.harmonicSuspicion} onChange={handleInputChange} id="hs-check" />
                            <label htmlFor="hs-check" style={{ fontSize: "0.85rem", cursor: "pointer" }}>Harmonik/Rezonans Şüphesi Var</label>
                        </div>
                    </div>
                </div>

                {/* 2. SUMMARY & ANALYSIS */}
                <div style={{ width: "400px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div className="premium-card" style={{ background: "var(--tibcon-black)", color: "white", padding: "1.5rem" }}>
                        <h4 className="outfit" style={{ marginTop: 0, opacity: 0.8 }}>Analiz Özeti</h4>
                        <div style={row}><span>Aktif Güç (P)</span><strong>{results.p_kw} kW</strong></div>
                        <div style={row}><span>Gerekli Güç (Q)</span><strong>{results.q_need_kvar.toFixed(1)} kVAr</strong></div>
                        <div style={borderTop}></div>
                        {actualCapV && (
                            <div style={row}>
                                <span>Kond. Voltaj Sınıfı</span>
                                <strong style={{ color: "#2ecc71" }}>{actualCapV} V</strong>
                            </div>
                        )}
                        {inputs.mode === "FILTERED" && (
                            <>
                                <div style={row}><span>Min. Kapasitör V (Vmin)</span><strong>{results.vmin} V</strong></div>
                                <div style={row}><span>Rezonans Frek.</span><strong>{results.fr_hz} Hz</strong></div>
                                <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "10px" }}>
                                    Ürünler standart sınıflarda olduğu için {inputs.targetCapVoltage}V hedeflenmiştir.
                                </div>
                            </>
                        )}
                    </div>
                    <div className="premium-card" style={{ padding: "1.5rem", flex: 1 }}>
                        <h4 className="outfit" style={{ marginTop: 0 }}>Seçim Parametreleri</h4>
                        <ul style={paramList}>
                            <li>Mod: <strong>{inputs.mode}</strong></li>
                            <li>Faz: <strong>{inputs.phaseType}</strong></li>
                            <li>Tolerans: <strong>±5%</strong></li>
                            {inputs.mode === "FILTERED" && <li>Filtre: <strong>p={inputs.pPct}%</strong></li>}
                        </ul>
                    </div>
                </div>
            </div>

            {/* KADEME PLANLARI */}
            <div style={{ marginTop: "2rem" }}>
                <h3 className="outfit">Kademe Planları</h3>
                <div style={planGrid}>
                    {plans.map(p => (
                        <div
                            key={p.id}
                            onClick={() => { setSelectedPlanId(p.id); setBom([]); setSelectionTrace([]); }}
                            style={selectedPlan?.id === p.id ? activePlanCard : planCard}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <strong style={{ fontSize: "1.1rem" }}>{p.steps.length} Kademe</strong>
                                {p.isRecommended && <span className="badge" style={{ background: "#27ae60", color: "white" }}>ÖNERİLEN</span>}
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, margin: "10px 0" }}>{p.totalKvar.toFixed(1)} kVAr</div>
                            <div style={{ fontSize: "0.85rem", color: "#666" }}>Hata: <span style={{ color: Math.abs(p.errorPct) > 5 ? "red" : "green" }}>%{p.errorPct}</span></div>
                            <div style={{ fontSize: "0.75rem", background: "#f8f9fa", padding: "8px", borderRadius: "8px", marginTop: "12px", fontFamily: "monospace" }}>
                                {p.sequence}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* BOM TABLE */}
            <div className="premium-card" style={{ marginTop: "2rem", padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h3 className="outfit" style={{ margin: 0 }}>Seçilen Ürünler (BOM)</h3>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button className="tibcon-btn tibcon-btn-outline" onClick={runAutoSelect} disabled={!selectedPlan}>
                            🪄 Ürünleri Otomatik Seç
                        </button>
                        <button className="tibcon-btn tibcon-btn-primary" onClick={handleToQuote} disabled={bom.length === 0}>
                            📄 Teklife Dönüştür
                        </button>
                    </div>
                </div>

                <table className="premium-table">
                    <thead>
                        <tr>
                            <th>Tip</th>
                            <th>Ürün Kodu</th>
                            <th>Adet</th>
                            <th>kVAr/V</th>
                            <th>Birim Fiyat</th>
                            <th style={{ textAlign: "right" }}>Toplam</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {bom.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#999" }}>Plan seçip "Otomatik Seç"e basın.</td></tr>
                        ) : (
                            bom.map(item => (
                                <tr key={item.id}>
                                    <td><span style={badgeStyle(item.type)}>{item.type}</span></td>
                                    <td><strong>{item.productCode}</strong><br /><small style={{ opacity: 0.6 }}>{item.name}</small></td>
                                    <td>{item.qty}</td>
                                    <td>{item.unitKvar} kVAr / {item.voltage}V</td>
                                    <td>{item.price.toLocaleString()} {item.currency}</td>
                                    <td style={{ textAlign: "right", fontWeight: 700 }}>{(item.price * item.qty).toLocaleString()} {item.currency}</td>
                                    <td><button style={{ color: "red", border: "none", background: "none", cursor: "pointer" }} onClick={() => setBom(p => p.filter(x => x.id !== item.id))}>🗑️</button></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* DEBUG PANEL */}
            {selectionTrace.length > 0 && (
                <div className="premium-card" style={{ marginTop: "2rem", padding: "1rem", background: "#fdfefe", border: "1px solid #dcdfe3" }}>
                    <h4 className="outfit" style={{ marginTop: 0, color: "#7f8c8d" }}>Seçim İzleme (Debug Panel)</h4>
                    <div style={{ fontSize: "0.8rem", color: "#7f8c8d", marginBottom: "10px" }}>
                        Mod: {inputs.mode} | Şebeke: {inputs.gridVoltage}V | Kond. Voltajı: {actualCapV}V
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #eee", textAlign: "left" }}>
                                    <th style={{ padding: "5px" }}>Kademe</th>
                                    <th style={{ padding: "5px" }}>Çözüm</th>
                                    <th style={{ padding: "5px" }}>Toplam</th>
                                    <th style={{ padding: "5px" }}>Filtre</th>
                                    <th style={{ padding: "5px" }}>NH / Cont.</th>
                                    <th style={{ padding: "5px" }}>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectionTrace.map((t, idx) => (
                                    <tr key={idx} style={{ borderBottom: "1px solid #fafafa" }}>
                                        <td style={{ padding: "5px", fontWeight: 700 }}>{t.stepKvar} kVAr</td>
                                        <td style={{ padding: "5px" }}>{t.solution || "-"}</td>
                                        <td style={{ padding: "5px" }}>{t.totalReached ? `${t.totalReached} kVAr` : "-"}</td>
                                        <td style={{ padding: "5px" }}>{t.filter ? `${t.filter.code} (${t.filter.pPct}%)` : "-"}</td>
                                        <td style={{ padding: "5px" }}>{t.nh?.code} / {t.contactor?.code}</td>
                                        <td style={{ padding: "5px", color: t.error ? "red" : "green" }}>
                                            {t.error ? `⚠️ ${t.error}` : "✅ OK"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showPointModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="premium-card" style={{ width: "100%", maxWidth: "500px", padding: "2rem" }}>
                        <h3 className="outfit">Cari Seçimi</h3>
                        <p className="text-muted" style={{ fontSize: "0.85rem" }}>Teklifin hangi cari için oluşturulacağını seçin.</p>
                        <select
                            value={selectedPointId}
                            onChange={e => setSelectedPointId(e.target.value)}
                            style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", border: "1px solid #ddd", marginBottom: "1.5rem" }}
                        >
                            <option value="">Seçiniz...</option>
                            {salesPoints.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.cityName})</option>
                            ))}
                        </select>
                        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button className="tibcon-btn tibcon-btn-outline" onClick={() => setShowPointModal(false)}>İptal</button>
                            <button className="tibcon-btn tibcon-btn-primary" onClick={confirmToQuote} disabled={!selectedPointId}>Teklif Oluştur</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Styles ---
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", marginBottom: "2.5rem" };
const modeSegmented: React.CSSProperties = { display: "flex", background: "#f1f3f5", borderRadius: "12px", padding: "4px", width: "fit-content", marginTop: "10px", border: "1px solid #dee2e6" };
const inactiveSeg: React.CSSProperties = { padding: "8px 16px", borderRadius: "10px", border: "none", background: "transparent", cursor: "pointer", fontSize: "0.9rem", color: "#666" };
const activeSeg: React.CSSProperties = { ...inactiveSeg, background: "white", color: "black", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", fontWeight: 700 };

const metricsBar: React.CSSProperties = { display: "flex", gap: "2rem" };
const metricItem: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "flex-end" };
const metLabel: React.CSSProperties = { fontSize: "0.7rem", fontWeight: 700, opacity: 0.5 };
const metVal: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 800, fontFamily: "var(--font-outfit)" };

const bannerStyle: React.CSSProperties = { background: "#fff9db", border: "1px solid #ffe066", padding: "1rem", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" };
const bannerBtn: React.CSSProperties = { background: "var(--tibcon-red)", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" };
const bannerClose: React.CSSProperties = { background: "transparent", border: "none", textDecoration: "underline", color: "#666", cursor: "pointer" };

const topGrid: React.CSSProperties = { display: "flex", gap: "1.5rem" };
const formGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" };
const inputGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "5px" };
const labelStyle: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, opacity: 0.7 };
const inputStyle: React.CSSProperties = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd" };

const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", padding: "8px 0" };
const borderTop: React.CSSProperties = { borderTop: "1px solid rgba(255,255,255,0.1)", margin: "10px 0" };
const paramList: React.CSSProperties = { paddingLeft: "1.25rem", fontSize: "0.85rem", lineHeight: 2 };

const planGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" };
const planCard: React.CSSProperties = { padding: "1.5rem", borderRadius: "16px", border: "2px solid #eee", cursor: "pointer", transition: "all 0.2s" };
const activePlanCard: React.CSSProperties = { ...planCard, borderColor: "var(--tibcon-red)", background: "#fff5f5" };

const badgeStyle = (type: string): React.CSSProperties => {
    let color = "#666";
    const t = type.toUpperCase();
    if (t === "CAP") color = "#0d6efd";
    if (t === "FILTER") color = "#fd7e14";
    if (t === "NH") color = "#198754";
    if (t === "CONTACTOR") color = "#6f42c1";
    return { background: `${color}15`, color, padding: "4px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700 };
};
