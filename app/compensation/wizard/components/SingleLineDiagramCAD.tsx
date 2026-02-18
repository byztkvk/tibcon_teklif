"use client";
/**
 * SingleLineDiagramCAD.tsx — v8
 * Dinamik eleman yüksekliği: ürün sayısına göre büyür.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { DesignState } from "@/lib/compensation/wizard-types";
import { resolveIcon, guessBlockType, BlockType } from "./diagram/iconResolver";

type ExtendedSlotType =
    | "NH" | "SWITCH" | "CAP" | "SHUNT" | "HARMONIC_FILTER"
    | "RELAY" | "SVC_DRIVER" | "SVC_FUSE" | "SVC_SHUNT_1" | "SVC_SHUNT_2"
    | "SVC_SHUNT_3" | "CURRENT_TRANSFORMER";

interface Props {
    design: DesignState;
    onSlotClick: (stepId: number, type: ExtendedSlotType) => void;
}

// ─── Renkler ──────────────────────────────────────────────────────────────────
const C = {
    R: "#e53935", S: "#f9a825", T: "#1565c0", N: "#7b1fa2",
    pwr: "#1a237e",
    ctrl: "#5c6bc0",
    meas: "#00695c",
    svc: "#e65100",
    bg: "#f8faff",
    grid: "#e8eaf6",
    title: "#0d1b4b",
    muted: "#607d8b",
    node: "#1a237e",
    label: "#263238",
};

// ─── Layout sabitleri ─────────────────────────────────────────────────────────
const TITLE_H = 48;
const BUS_R = TITLE_H + 8;
const BUS_S = BUS_R + 14;
const BUS_T = BUS_R + 28;
const BUS_N = BUS_R + 42;
const EL_START_Y = BUS_N + 34;

const EL_W = 88;          // eleman genişliği
const IMG_H = 52;         // görsel alanı yüksekliği (sabit)
const ROW_H = 16;         // her ürün satırı yüksekliği
const ROW_PAD = 4;        // liste üst/alt padding
const LBL_BELOW = 16;     // etiket yüksekliği (kart altında)
const EL_GAP = 18;        // elemanlar arası dikey boşluk

const PAD = 20;
const SVC_COL_X = PAD;
const SVC_COL_W = 310;
const MID_COL_X = SVC_COL_X + SVC_COL_W + 36;
const MID_COL_W = 150;
const STG_COL_X = MID_COL_X + MID_COL_W + 44;
const STG_STRIDE = EL_W + 24;

const MAIN_X = MID_COL_X + MID_COL_W / 2;
const SVC_CX = SVC_COL_X + SVC_COL_W / 2;

// ─── Dinamik yükseklik hesabı ─────────────────────────────────────────────────
// n = ürün sayısı (min 1 satır göster)
function elH(n: number): number {
    const rows = Math.max(1, n);
    return IMG_H + ROW_PAD + rows * ROW_H + ROW_PAD;
}

// Eleman toplam yüksekliği (kart + etiket)
function elTotal(n: number): number {
    return elH(n) + LBL_BELOW;
}

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function Node({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
    return <circle cx={x} cy={y} r={r} fill={C.node} style={{ pointerEvents: "none" }} />;
}

function Gnd({ cx, y }: { cx: number; y: number }) {
    return (
        <g style={{ pointerEvents: "none" }}>
            <line x1={cx} y1={y} x2={cx} y2={y + 6} stroke={C.pwr} strokeWidth={2.5} />
            <line x1={cx - 13} y1={y + 6} x2={cx + 13} y2={y + 6} stroke={C.pwr} strokeWidth={3} />
            <line x1={cx - 8} y1={y + 11} x2={cx + 8} y2={y + 11} stroke={C.pwr} strokeWidth={2.5} />
            <line x1={cx - 3} y1={y + 16} x2={cx + 3} y2={y + 16} stroke={C.pwr} strokeWidth={2} />
        </g>
    );
}

function Lbl({ x, y, text, color = C.label, size = 8, anchor = "middle", bold = false }: {
    x: number; y: number; text: string;
    color?: string; size?: number; anchor?: string; bold?: boolean;
}) {
    return (
        <text x={x} y={y} fontSize={size} textAnchor={anchor as any}
            fill={color} fontWeight={bold ? 800 : 400}
            fontFamily="'Outfit',sans-serif"
            style={{ pointerEvents: "none" }}>
            {text}
        </text>
    );
}

// ─── Şema Elemanı ─────────────────────────────────────────────────────────────
interface Product { productCode?: string; qty: number; }

interface ElProps {
    cx: number;
    topY: number;           // kartın üst kenarı
    w?: number;
    blockType: BlockType;
    label: string;
    products?: Product[];
    onClick: () => void;
}

function El({ cx, topY, w = EL_W, blockType, label, products = [], onClick }: ElProps) {
    const [hov, setHov] = useState(false);
    const imgSrc = resolveIcon(blockType);
    const x = cx - w / 2;
    const n = products.length;
    const h = elH(n);
    const listY = topY + IMG_H + ROW_PAD;

    return (
        <g onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{ cursor: "pointer" }}>

            {/* Hover ring */}
            {hov && <rect x={x - 3} y={topY - 3} width={w + 6} height={h + 6}
                rx={7} fill="none" stroke={C.ctrl} strokeWidth={2} opacity={0.5} />}

            {/* Kart arka plan */}
            <rect x={x} y={topY} width={w} height={h}
                rx={5} fill="white"
                stroke={hov ? C.ctrl : "#90a4ae"}
                strokeWidth={hov ? 2 : 1.2} />

            {/* Görsel */}
            <foreignObject x={x + 3} y={topY + 3} width={w - 6} height={IMG_H - 6}>
                <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <img src={imgSrc} alt={label}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </div>
            </foreignObject>

            {/* Ayırıcı */}
            <line x1={x + 4} y1={topY + IMG_H} x2={x + w - 4} y2={topY + IMG_H}
                stroke="#e0e0e0" strokeWidth={1} style={{ pointerEvents: "none" }} />

            {/* Liste alanı arka plan */}
            <rect x={x} y={topY + IMG_H} width={w} height={h - IMG_H}
                rx={0} fill="#f0f4ff" style={{ pointerEvents: "none" }} />
            {/* Alt köşe yuvarlama */}
            <rect x={x} y={topY + h - 5} width={w} height={5}
                rx={0} fill="#f0f4ff" style={{ pointerEvents: "none" }} />

            {/* Ürün listesi */}
            <foreignObject x={x + 2} y={listY} width={w - 4} height={n * ROW_H + ROW_PAD}>
                <div style={{
                    width: "100%",
                    display: "flex", flexDirection: "column",
                    alignItems: "stretch",
                    gap: 1,
                }}>
                    {n === 0 ? (
                        <div style={{
                            fontSize: 8, color: "#90a4ae",
                            fontFamily: "'Outfit',sans-serif",
                            fontStyle: "italic", textAlign: "center",
                            lineHeight: `${ROW_H}px`,
                        }}>Seçilmedi</div>
                    ) : products.map((p, i) => (
                        <div key={i} style={{
                            height: ROW_H,
                            display: "flex", alignItems: "center",
                            padding: "0 4px",
                            background: i % 2 === 0 ? "transparent" : "#e8eaf6",
                            borderRadius: 3,
                            gap: 3,
                            overflow: "hidden",
                        }}>
                            {p.qty > 1 && (
                                <span style={{
                                    background: "#e53935", color: "white",
                                    borderRadius: 3, padding: "0 4px",
                                    fontSize: 8, fontWeight: 800,
                                    fontFamily: "'Outfit',sans-serif",
                                    flexShrink: 0,
                                    lineHeight: "14px",
                                }}>×{p.qty}</span>
                            )}
                            <span style={{
                                fontSize: 8.5,
                                fontWeight: 700,
                                color: "#1a237e",
                                fontFamily: "'Outfit',sans-serif",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                flex: 1,
                            }}>
                                {p.productCode
                                    ? (p.productCode.length > 12
                                        ? p.productCode.slice(0, 11) + "…"
                                        : p.productCode)
                                    : "—"}
                            </span>
                        </div>
                    ))}
                </div>
            </foreignObject>

            {/* Etiket (kart altında) */}
            <rect x={x} y={topY + h + 1} width={w} height={14}
                fill="white" opacity={0.95} rx={2} style={{ pointerEvents: "none" }} />
            <text x={cx} y={topY + h + 13} fontSize={9.5} textAnchor="middle"
                fill={C.label} fontWeight={800} fontFamily="'Outfit',sans-serif"
                style={{ pointerEvents: "none" }}>
                {label}
            </text>
        </g>
    );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export const SingleLineDiagramCAD = React.forwardRef<HTMLDivElement, Props>(
    ({ design, onSlotClick }, ref) => {
        const [pan, setPan] = useState({ x: 0, y: 0 });
        const [zoom, setZoom] = useState(0.85);
        const isPanning = useRef(false);
        const lastMouse = useRef({ x: 0, y: 0 });

        const activeSteps = Object.values(design.steps)
            .filter(s => design.relay.activeSteps[s.id - 1])
            .sort((a, b) => a.id - b.id);
        const stepCount = activeSteps.length;
        const hasHF = design.system.harmonicFilter;
        const isTriphase = design.system.phaseType === "TRIFAZE";

        // ── Ürün listelerini hazırla ──────────────────────────────────────────
        const toList = (arr: Array<{ product: { productCode?: string }; qty: number }> | undefined): Product[] =>
            (arr ?? []).map(c => ({ productCode: c.product.productCode, qty: c.qty }));

        // SVC
        const svcFuseProds = toList(design.svc.fuse);
        const svcDrvProds = toList(design.svc.driver);
        const svcShuntProds = [0, 1, 2].map(i => toList(design.svc.shunts?.[i]));

        // Orta
        const ctProds = design.currentTransformer
            ? [{ productCode: design.currentTransformer.product.productCode, qty: design.currentTransformer.qty }]
            : [];
        const rgkrProds = design.relay.selectedProduct
            ? [{ productCode: design.relay.selectedProduct.product.productCode, qty: design.relay.selectedProduct.qty }]
            : [];

        // Kademeler
        const stageProds = activeSteps.map(s => ({
            id: s.id,
            nh: toList(s.components.NH),
            sw: toList(s.components.SWITCH),
            cap: toList(s.components.CAP),
            hf: toList(s.components.HARMONIC_FILTER),
            swType: guessBlockType(s.components.SWITCH?.[0]?.product.productCode),
        }));

        // ── Dinamik Y hesabı: SVC sütunu ─────────────────────────────────────
        let sy = EL_START_Y;
        const svcFuseTop = sy;
        sy += elTotal(svcFuseProds.length);
        sy += EL_GAP;
        const svcDrvTop = sy;
        sy += elTotal(svcDrvProds.length);
        sy += EL_GAP;
        const svcDistY = sy;    // dağıtım barası Y
        sy += 14;
        const svcReactTop = sy;
        const svcReactH = elH(Math.max(...svcShuntProds.map(p => p.length)));
        sy += elTotal(Math.max(...svcShuntProds.map(p => p.length)));
        const svcGndY = sy + 4;

        // 3 reaktör X merkezleri
        const REACT_W = EL_W - 4;
        const reactGap = (SVC_COL_W - REACT_W * 3) / 4;
        const reactCxs = [
            SVC_COL_X + reactGap + REACT_W / 2,
            SVC_COL_X + reactGap * 2 + REACT_W + REACT_W / 2,
            SVC_COL_X + reactGap * 3 + REACT_W * 2 + REACT_W / 2,
        ];

        // ── Dinamik Y hesabı: Orta sütun ─────────────────────────────────────
        let my = EL_START_Y;
        const ctTop = my;
        my += elTotal(ctProds.length);
        my += EL_GAP;
        const rgkrTop = my;
        my += elTotal(rgkrProds.length);
        my += EL_GAP;
        const yukY = my + 10;

        // Kontrol bus Y: RGKR altında
        const ctrlBusY = rgkrTop + elH(rgkrProds.length) + LBL_BELOW + 20;

        // ── Dinamik Y hesabı: Kademeler ───────────────────────────────────────
        // Her kademe için en fazla ürün sayısını bul (tüm kademelerde aynı Y)
        const maxNH = Math.max(1, ...stageProds.map(s => s.nh.length));
        const maxSW = Math.max(1, ...stageProds.map(s => s.sw.length));
        const maxHF = hasHF ? Math.max(1, ...stageProds.map(s => s.hf.length)) : 0;
        const maxCAP = Math.max(1, ...stageProds.map(s => s.cap.length));

        let ky = EL_START_Y;
        const fuseTop = ky;
        ky += elTotal(maxNH) + EL_GAP;
        const swTop = ky;
        ky += elTotal(maxSW) + EL_GAP;
        const hfTop = hasHF ? ky : null;
        if (hasHF) ky += elTotal(maxHF) + EL_GAP;
        const capTop = ky;
        ky += elTotal(maxCAP) + EL_GAP;
        const gndY = ky;

        // Kontrol bus inişi: switch'in üst kenarı
        const swTopForBus = swTop;

        // ── Genel boyutlar ────────────────────────────────────────────────────
        const maxContentH = Math.max(svcGndY + 30, yukY + 30, gndY + 30);
        const totalW = STG_COL_X + Math.max(1, stepCount) * STG_STRIDE + PAD + 40;
        const totalH = maxContentH + 50;
        const busEndX = totalW - PAD;

        // ── Pan/Zoom ──────────────────────────────────────────────────────────
        const containerRef = useRef<HTMLDivElement>(null);
        // forwardRef ile gelen ref'i de containerRef'e bağla
        const setRefs = useCallback((node: HTMLDivElement | null) => {
            (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }, [ref]);

        const onMouseDown = useCallback((e: React.MouseEvent) => {
            if (e.button !== 0) return;
            e.preventDefault();
            isPanning.current = true;
            lastMouse.current = { x: e.clientX, y: e.clientY };
            if (containerRef.current) containerRef.current.style.cursor = "grabbing";
        }, []);

        const onWheel = useCallback((e: React.WheelEvent) => {
            e.preventDefault();
            setZoom(z => Math.max(0.15, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
        }, []);

        // window seviyesinde mousemove/mouseup — mouse hızlı hareket etse bile pan kesilmez
        useEffect(() => {
            const onMove = (e: MouseEvent) => {
                if (!isPanning.current) return;
                const dx = e.clientX - lastMouse.current.x;
                const dy = e.clientY - lastMouse.current.y;
                setPan(p => ({ x: p.x + dx, y: p.y + dy }));
                lastMouse.current = { x: e.clientX, y: e.clientY };
            };
            const onUp = () => {
                if (!isPanning.current) return;
                isPanning.current = false;
                if (containerRef.current) containerRef.current.style.cursor = "grab";
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
            return () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
            };
        }, []);

        // ── Yardımcı: eleman merkez Y ─────────────────────────────────────────
        const midY = (topY: number, n: number) => topY + elH(n) / 2;

        return (
            <div
                ref={setRefs}
                style={{
                    width: "100%", height: "100%",
                    background: C.bg, overflow: "hidden",
                    cursor: "grab", userSelect: "none",
                }}
                onMouseDown={onMouseDown}
                onWheel={onWheel}
            >
                <svg width="100%" height="100%"
                    viewBox={`0 0 ${totalW} ${totalH}`}
                    style={{ display: "block" }}>

                    <defs>
                        <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M20 0L0 0 0 20" fill="none" stroke={C.grid} strokeWidth="0.4" />
                        </pattern>
                        <marker id="ac" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                            <path d="M0,0 L7,3.5 L0,7 Z" fill={C.ctrl} />
                        </marker>
                        <marker id="am" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                            <path d="M0,0 L7,3.5 L0,7 Z" fill={C.meas} />
                        </marker>
                    </defs>

                    {/* Pan+Zoom grubu */}
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

                        {/* Arka plan */}
                        <rect width={totalW} height={totalH} fill="url(#g)" />
                        <rect width={totalW} height={totalH} fill="white" fillOpacity={0.35} />

                        {/* ── BAŞLIK ── */}
                        <rect x={0} y={0} width={totalW} height={TITLE_H} fill={C.title} />
                        <Lbl x={totalW / 2} y={TITLE_H - 18} size={13} bold
                            text="REAKTİF GÜÇ KOMPANZASYON SİSTEMİ — TEK HAT ŞEMASI" color="white" />
                        <Lbl x={totalW / 2} y={TITLE_H - 5} size={8}
                            text={`${stepCount} Kademe · ${design.system.gridVoltage}V · ${design.system.phaseType}${hasHF ? " · H.Filtreli" : ""} · SVC Aktif`}
                            color="#90caf9" />

                        {/* ── FAZ BARALAR ── */}
                        <g style={{ pointerEvents: "none" }}>
                            {[
                                { y: BUS_R, c: C.R, l: "R", w: 4 },
                                { y: BUS_S, c: C.S, l: "S", w: 4 },
                                { y: BUS_T, c: C.T, l: "T", w: 4 },
                                { y: BUS_N, c: C.N, l: "N", w: 2.5, dash: "8,5" },
                            ].map(b => (
                                <g key={b.l}>
                                    <text x={PAD} y={b.y + 4} fontSize={11} fontWeight={800}
                                        fill={b.c} fontFamily="'Outfit',sans-serif">{b.l}</text>
                                    <line x1={PAD + 14} y1={b.y} x2={busEndX} y2={b.y}
                                        stroke={b.c} strokeWidth={b.w}
                                        strokeDasharray={(b as any).dash}
                                        strokeLinecap="round" />
                                </g>
                            ))}
                        </g>

                        {/* ══════════════════════════════════════════════════════
                            KATMAN 1: ÇİZGİLER (en altta)
                        ══════════════════════════════════════════════════════ */}
                        <g style={{ pointerEvents: "none" }}>

                            {/* SVC: R,S,T → NH */}
                            {[BUS_R, BUS_S, BUS_T].map((by, i) => {
                                const fx = SVC_CX - 6 + i * 6;
                                return (
                                    <g key={i}>
                                        <line x1={fx} y1={by} x2={fx} y2={svcFuseTop}
                                            stroke={[C.R, C.S, C.T][i]} strokeWidth={2.5} />
                                        <Node x={fx} y={by} />
                                    </g>
                                );
                            })}
                            <line x1={SVC_CX - 6} y1={svcFuseTop} x2={SVC_CX + 6} y2={svcFuseTop}
                                stroke={C.pwr} strokeWidth={2.5} />

                            {/* SVC: NH → Sürücü */}
                            <line x1={SVC_CX} y1={svcFuseTop + elH(svcFuseProds.length)}
                                x2={SVC_CX} y2={svcDrvTop}
                                stroke={C.pwr} strokeWidth={2.5} />

                            {/* SVC: Sürücü → Dağıtım */}
                            <line x1={SVC_CX} y1={svcDrvTop + elH(svcDrvProds.length)}
                                x2={SVC_CX} y2={svcDistY}
                                stroke={C.pwr} strokeWidth={2.5} />
                            <line x1={reactCxs[0]} y1={svcDistY} x2={reactCxs[2]} y2={svcDistY}
                                stroke={C.pwr} strokeWidth={2.5} />
                            <Node x={SVC_CX} y={svcDistY} />
                            {reactCxs.map((rx, i) => (
                                <g key={i}>
                                    <line x1={rx} y1={svcDistY} x2={rx} y2={svcReactTop}
                                        stroke={C.pwr} strokeWidth={2.5} />
                                    <Node x={rx} y={svcDistY} r={3} />
                                    {/* Reaktör → YÜK */}
                                    <line x1={rx} y1={svcReactTop + svcReactH}
                                        x2={rx} y2={svcGndY}
                                        stroke={C.pwr} strokeWidth={2.5} />
                                </g>
                            ))}

                            {/* ANA HAT: R → CT */}
                            <line x1={MAIN_X} y1={BUS_R} x2={MAIN_X} y2={ctTop}
                                stroke={C.R} strokeWidth={4} />
                            <Node x={MAIN_X} y={BUS_R} />
                            {/* CT → YÜK */}
                            <line x1={MAIN_X} y1={ctTop + elH(ctProds.length)}
                                x2={MAIN_X} y2={yukY}
                                stroke={C.pwr} strokeWidth={4} />

                            {/* CT → RGKR ölçüm */}
                            <polyline
                                points={`${MAIN_X + EL_W / 2},${midY(ctTop, ctProds.length)} ${MAIN_X + EL_W / 2 + 24},${midY(ctTop, ctProds.length)} ${MAIN_X + EL_W / 2 + 24},${midY(rgkrTop, rgkrProds.length)} ${MAIN_X + EL_W / 2},${midY(rgkrTop, rgkrProds.length)}`}
                                fill="none" stroke={C.meas} strokeWidth={2}
                                strokeDasharray="5,4" markerEnd="url(#am)" />

                            {/* RGKR → Kontrol Bus */}
                            <line x1={MAIN_X + EL_W / 2} y1={rgkrTop + elH(rgkrProds.length) + LBL_BELOW}
                                x2={MAIN_X + EL_W / 2} y2={ctrlBusY}
                                stroke={C.ctrl} strokeWidth={1.8} strokeDasharray="5,4" />
                            <line x1={MAIN_X + EL_W / 2} y1={ctrlBusY}
                                x2={busEndX} y2={ctrlBusY}
                                stroke={C.ctrl} strokeWidth={2.5} strokeDasharray="7,4" />

                            {/* RGKR → SVC kontrol */}
                            <polyline
                                points={`${MAIN_X - EL_W / 2},${midY(rgkrTop, rgkrProds.length)} ${SVC_CX + EL_W / 2 + 6},${midY(rgkrTop, rgkrProds.length)} ${SVC_CX + EL_W / 2 + 6},${midY(svcDrvTop, svcDrvProds.length)}`}
                                fill="none" stroke={C.ctrl} strokeWidth={1.8}
                                strokeDasharray="5,4" markerEnd="url(#ac)" />

                            {/* Kademeler: güç hatları + kontrol bus inişleri */}
                            {stageProds.map((sp, idx) => {
                                const cx = STG_COL_X + idx * STG_STRIDE + STG_STRIDE / 2;
                                return (
                                    <g key={sp.id}>
                                        {/* R → NH */}
                                        <line x1={cx} y1={BUS_R} x2={cx} y2={fuseTop}
                                            stroke={C.R} strokeWidth={2.5} />
                                        <Node x={cx} y={BUS_R} />
                                        {/* NH → SW */}
                                        <line x1={cx} y1={fuseTop + elTotal(maxNH) - LBL_BELOW}
                                            x2={cx} y2={swTop}
                                            stroke={C.pwr} strokeWidth={2.5} />
                                        {/* SW → HF veya CAP */}
                                        <line x1={cx} y1={swTop + elTotal(maxSW) - LBL_BELOW}
                                            x2={cx} y2={hasHF ? hfTop! : capTop}
                                            stroke={C.pwr} strokeWidth={2.5} />
                                        {/* HF → CAP */}
                                        {hasHF && hfTop !== null && (
                                            <line x1={cx} y1={hfTop + elTotal(maxHF) - LBL_BELOW}
                                                x2={cx} y2={capTop}
                                                stroke={C.pwr} strokeWidth={2.5} />
                                        )}
                                        {/* CAP → GND */}
                                        <line x1={cx} y1={capTop + elTotal(maxCAP) - LBL_BELOW}
                                            x2={cx} y2={gndY}
                                            stroke={C.pwr} strokeWidth={2.5} />
                                        {/* Kontrol bus iniş */}
                                        <line x1={cx} y1={ctrlBusY} x2={cx} y2={swTop}
                                            stroke={C.ctrl} strokeWidth={1.2} strokeDasharray="4,3"
                                            markerEnd="url(#ac)" />
                                        <Node x={cx} y={ctrlBusY} r={2.5} />
                                    </g>
                                );
                            })}
                        </g>

                        {/* ══════════════════════════════════════════════════════
                            KATMAN 2: ETİKETLER
                        ══════════════════════════════════════════════════════ */}
                        <g style={{ pointerEvents: "none" }}>
                            <Lbl x={SVC_CX} y={EL_START_Y - 16} text="SVC — STATİK VAR KOMPANZATÖR"
                                color={C.svc} size={8.5} bold />
                            <Lbl x={MAIN_X} y={EL_START_Y - 16} text="ÖLÇÜM & KONTROL"
                                color={C.muted} size={8} />
                            <Lbl x={MAIN_X + EL_W / 2 + 6} y={midY(ctTop, ctProds.length) - 4}
                                text="ölçüm" color={C.meas} size={7} anchor="start" />
                            <Lbl x={MAIN_X + EL_W / 2 + 8} y={ctrlBusY - 5}
                                text="KONTROL BUS" color={C.ctrl} size={7.5} anchor="start" bold />
                            <Lbl x={MAIN_X - EL_W / 2 - 5} y={midY(rgkrTop, rgkrProds.length) - 4}
                                text="SVC kontrol" color={C.ctrl} size={7} anchor="end" />
                            {/* YÜK */}
                            <rect x={MAIN_X - 24} y={yukY} width={48} height={15} rx={3} fill={C.pwr} />
                            <Lbl x={MAIN_X} y={yukY + 11} text="YÜK" color="white" size={8.5} bold />
                            {/* SVC YÜK etiketleri */}
                            {reactCxs.map((rx, i) => (
                                <g key={i}>
                                    <rect x={rx - 18} y={svcGndY} width={36} height={14} rx={3} fill={C.pwr} />
                                    <Lbl x={rx} y={svcGndY + 10} text="YÜK" color="white" size={7.5} bold />
                                </g>
                            ))}
                            {/* Kademe etiketleri */}
                            {stageProds.map((sp, idx) => {
                                const cx = STG_COL_X + idx * STG_STRIDE + STG_STRIDE / 2;
                                return <Lbl key={sp.id} x={cx} y={EL_START_Y - 16}
                                    text={`K${sp.id}`} color={C.title} size={9} bold />;
                            })}
                        </g>

                        {/* ══════════════════════════════════════════════════════
                            KATMAN 3: ELEMANLAR (en üstte)
                        ══════════════════════════════════════════════════════ */}
                        <g>
                            {/* SVC */}
                            <El cx={SVC_CX} topY={svcFuseTop}
                                blockType="nh_sigorta" label="NH Yük Ayırıcı"
                                products={svcFuseProds}
                                onClick={() => onSlotClick(0, "SVC_FUSE")} />
                            <El cx={SVC_CX} topY={svcDrvTop}
                                blockType="svc" label="SVC Sürücü"
                                products={svcDrvProds}
                                onClick={() => onSlotClick(0, "SVC_DRIVER")} />
                            {reactCxs.map((rx, i) => (
                                <El key={i} cx={rx} topY={svcReactTop}
                                    w={REACT_W}
                                    blockType="reaktor"
                                    label={`L${i + 1} Şönt`}
                                    products={svcShuntProds[i]}
                                    onClick={() => onSlotClick(0, (["SVC_SHUNT_1", "SVC_SHUNT_2", "SVC_SHUNT_3"] as ExtendedSlotType[])[i])} />
                            ))}

                            {/* Orta */}
                            <El cx={MAIN_X} topY={ctTop}
                                blockType="ct" label="CT"
                                products={ctProds}
                                onClick={() => onSlotClick(0, "CURRENT_TRANSFORMER")} />
                            <El cx={MAIN_X} topY={rgkrTop}
                                blockType="relay" label="RGKR"
                                products={rgkrProds}
                                onClick={() => onSlotClick(0, "RELAY")} />

                            {/* Kademeler */}
                            {stageProds.length === 0 && (
                                <g>
                                    <rect x={STG_COL_X} y={EL_START_Y} width={260} height={100}
                                        rx={8} fill="#fff3e0" stroke="#ffb74d" strokeWidth={1.5} />
                                    <Lbl x={STG_COL_X + 130} y={EL_START_Y + 44}
                                        text="Aktif kademe yok" color={C.svc} size={13} bold />
                                    <Lbl x={STG_COL_X + 130} y={EL_START_Y + 62}
                                        text="Sol panelden kademe ekleyin" color={C.muted} size={9} />
                                </g>
                            )}
                            {stageProds.map((sp, idx) => {
                                const cx = STG_COL_X + idx * STG_STRIDE + STG_STRIDE / 2;
                                return (
                                    <g key={sp.id}>
                                        <El cx={cx} topY={fuseTop} w={EL_W}
                                            blockType="nh_sigorta" label={`NH${sp.id}`}
                                            products={sp.nh}
                                            onClick={() => onSlotClick(sp.id, "NH")} />
                                        <El cx={cx} topY={swTop} w={EL_W}
                                            blockType={sp.swType}
                                            label={sp.swType === "tristor" ? `SCR${sp.id}` : `KT${sp.id}`}
                                            products={sp.sw}
                                            onClick={() => onSlotClick(sp.id, "SWITCH")} />
                                        {hasHF && hfTop !== null && (
                                            <El cx={cx} topY={hfTop} w={EL_W}
                                                blockType="harmonik_filtre" label={`HF${sp.id}`}
                                                products={sp.hf}
                                                onClick={() => onSlotClick(sp.id, "HARMONIC_FILTER")} />
                                        )}
                                        <El cx={cx} topY={capTop} w={EL_W}
                                            blockType="kondansator"
                                            label={isTriphase ? `C${sp.id}·3Ф` : `C${sp.id}`}
                                            products={sp.cap}
                                            onClick={() => onSlotClick(sp.id, "CAP")} />
                                        <Gnd cx={cx} y={gndY} />
                                    </g>
                                );
                            })}
                        </g>

                        {/* ── LEJANT ── */}
                        <g transform={`translate(${PAD}, ${totalH - 36})`} style={{ pointerEvents: "none" }}>
                            <rect width={totalW - PAD * 2} height={30} rx={4}
                                fill="#f5f5f5" stroke="#e0e0e0" strokeWidth={1} />
                            <text x={8} y={13} fontSize={7.5} fontWeight={700} fill={C.pwr}
                                fontFamily="'Outfit',sans-serif">LEJANT:</text>
                            {[
                                { c: C.R, l: "R Fazı" }, { c: C.S, l: "S Fazı" }, { c: C.T, l: "T Fazı" },
                                { c: "#b71c1c", l: "NH Sig." }, { c: "#1a237e", l: "Kontaktör" },
                                { c: "#4a148c", l: "Tristör" }, { c: "#1b5e20", l: "Reaktör" },
                                { c: "#006064", l: "Kondansatör" }, { c: C.svc, l: "SVC" },
                                { c: C.ctrl, l: "Kontrol (kesik)" }, { c: C.meas, l: "Ölçüm (kesik)" },
                            ].map((item, i) => (
                                <g key={i} transform={`translate(${52 + i * 82}, 0)`}>
                                    <rect y={6} width={14} height={5} rx={2} fill={item.c} />
                                    <text x={18} y={14} fontSize={7} fill={C.pwr}
                                        fontFamily="'Outfit',sans-serif">{item.l}</text>
                                </g>
                            ))}
                            <text x={8} y={26} fontSize={7} fill={C.muted} fontFamily="'Outfit',sans-serif">
                                {`${design.system.gridVoltage}V · ${design.system.phaseType} · ${stepCount} Kademe · HF: ${hasHF ? "VAR" : "YOK"} · SVC: AKTİF`}
                            </text>
                        </g>

                    </g>{/* pan+zoom kapanış */}
                </svg>
            </div>
        );
    }
);

SingleLineDiagramCAD.displayName = "SingleLineDiagramCAD";
