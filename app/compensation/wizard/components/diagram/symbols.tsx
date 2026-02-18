/**
 * symbols.tsx — Endüstriyel IEC Sembol Bileşenleri
 * Kutu tabanlı, hover glow, tıklanabilir
 */
import React, { useState } from "react";

// ─── Renk Paleti ──────────────────────────────────────────────────────────────
export const COLORS = {
    busR: "#e53935",      // R fazı kırmızı
    busS: "#f9a825",      // S fazı sarı
    busT: "#1565c0",      // T fazı mavi
    busN: "#7b1fa2",      // N mor
    wire: "#212121",      // Ana kablo
    fuse: "#c62828",      // NH Sigorta kırmızı
    fuseFill: "#ffebee",
    contactor: "#1a237e", // Kontaktör lacivert
    contactorFill: "#e8eaf6",
    thyristor: "#6a1b9a", // Tristör mor
    thyristorFill: "#f3e5f5",
    reactor: "#1b5e20",   // Reaktör yeşil
    reactorFill: "#e8f5e9",
    cap: "#006064",       // Kondansatör turkuaz
    capFill: "#e0f7fa",
    svc: "#e65100",       // SVC turuncu
    svcFill: "#fff3e0",
    relay: "#1b5e20",
    relayFill: "#f1f8e9",
    ct: "#37474f",
    ctFill: "#eceff1",
    bg: "#fafbff",
    grid: "#e8eaf6",
    shadow: "rgba(0,0,0,0.15)",
    text: "#212121",
    muted: "#546e7a",
    white: "#ffffff",
    titleBg: "#0d1b4b",
};

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
export function trunc(s: string | undefined, n = 13): string {
    if (!s) return "—";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ─── Hover Box Hook ───────────────────────────────────────────────────────────
function useHover() {
    const [hovered, setHovered] = useState(false);
    return {
        hovered,
        handlers: {
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
        },
    };
}

// ─── Glow Filter ID ───────────────────────────────────────────────────────────
export function DiagramDefs() {
    return (
        <defs>
            <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-blue" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-teal" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="drop-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="1" dy="2" stdDeviation="2.5" floodOpacity="0.18" />
            </filter>
            <pattern id="grid-pat" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke={COLORS.grid} strokeWidth="0.6" />
            </pattern>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={COLORS.wire} />
            </marker>
        </defs>
    );
}

// ─── Temel Kutu Bileşeni ──────────────────────────────────────────────────────
interface BoxProps {
    x: number; y: number; w: number; h: number;
    label: string; subLabel?: string; code?: string;
    stroke: string; fill: string; glowFilter?: string;
    onClick: () => void;
    icon?: React.ReactNode;
}

export function ComponentBox({ x, y, w, h, label, subLabel, code, stroke, fill, glowFilter, onClick, icon }: BoxProps) {
    const { hovered, handlers } = useHover();
    const scale = hovered ? 1.04 : 1;
    const cx = x + w / 2;
    const cy = y + h / 2;

    return (
        <g
            onClick={onClick}
            {...handlers}
            style={{ cursor: "pointer" }}
            transform={`translate(${cx},${cy}) scale(${scale}) translate(${-cx},${-cy})`}
        >
            {/* Shadow */}
            <rect x={x + 2} y={y + 3} width={w} height={h} rx={5} fill={COLORS.shadow} />
            {/* Body */}
            <rect
                x={x} y={y} width={w} height={h} rx={5}
                fill={fill}
                stroke={stroke}
                strokeWidth={hovered ? 2.5 : 2}
                filter={hovered && glowFilter ? `url(#${glowFilter})` : undefined}
            />
            {/* Top color bar */}
            <rect x={x} y={y} width={w} height={7} rx={5} fill={stroke} />
            <rect x={x} y={y + 2} width={w} height={5} fill={stroke} />

            {/* Icon */}
            {icon && (
                <g transform={`translate(${x + 8}, ${y + 12})`}>{icon}</g>
            )}

            {/* Label */}
            <text x={cx} y={y + 22} fontSize={10} fontWeight="800"
                textAnchor="middle" fill={stroke} fontFamily="'Outfit',monospace">
                {label}
            </text>

            {/* Sub label */}
            {subLabel && (
                <text x={cx} y={y + 34} fontSize={8} textAnchor="middle" fill={COLORS.muted}>
                    {subLabel}
                </text>
            )}

            {/* Product code */}
            {code && (
                <text x={cx} y={y + h - 7} fontSize={7.5} textAnchor="middle" fill={COLORS.muted}
                    fontFamily="'Courier New',monospace">
                    {trunc(code, 14)}
                </text>
            )}

            {/* Hover indicator */}
            {hovered && (
                <rect x={x} y={y} width={w} height={h} rx={5}
                    fill="none" stroke={stroke} strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
            )}
        </g>
    );
}

// ─── NH Sigorta ───────────────────────────────────────────────────────────────
export function FuseBlock({
    cx, y, w = 70, h = 52, onClick, code
}: { cx: number; y: number; w?: number; h?: number; onClick: () => void; code?: string }) {
    // IEC sigorta sembolü içinde
    const icon = (
        <g>
            {/* Sigorta teli sembolü */}
            <line x1={w / 2 - 8} y1={10} x2={w / 2 + 8} y2={10} stroke={COLORS.fuse} strokeWidth={1.5} />
            <path d={`M ${w / 2 - 8} 10 Q ${w / 2} 16 ${w / 2 + 8} 10`}
                fill="none" stroke={COLORS.fuse} strokeWidth={1.2} />
        </g>
    );
    return (
        <ComponentBox
            x={cx - w / 2} y={y} w={w} h={h}
            label="NH SİGORTA"
            code={code}
            stroke={COLORS.fuse}
            fill={COLORS.fuseFill}
            glowFilter="glow-red"
            onClick={onClick}
        />
    );
}

// ─── Kontaktör ────────────────────────────────────────────────────────────────
export function ContactorBlock({
    cx, y, w = 70, h = 52, onClick, code
}: { cx: number; y: number; w?: number; h?: number; onClick: () => void; code?: string }) {
    return (
        <ComponentBox
            x={cx - w / 2} y={y} w={w} h={h}
            label="KONTAKTÖR"
            code={code}
            stroke={COLORS.contactor}
            fill={COLORS.contactorFill}
            glowFilter="glow-blue"
            onClick={onClick}
        />
    );
}

// ─── Tristör (SCR) ────────────────────────────────────────────────────────────
export function ThyristorBlock({
    cx, y, w = 70, h = 52, onClick, code
}: { cx: number; y: number; w?: number; h?: number; onClick: () => void; code?: string }) {
    return (
        <ComponentBox
            x={cx - w / 2} y={y} w={w} h={h}
            label="TRİSTÖR"
            subLabel="SCR"
            code={code}
            stroke={COLORS.thyristor}
            fill={COLORS.thyristorFill}
            glowFilter="glow-purple"
            onClick={onClick}
        />
    );
}

// ─── Reaktör (Şönt) ───────────────────────────────────────────────────────────
export function ReactorBlock({
    cx, y, w = 70, h = 52, onClick, code
}: { cx: number; y: number; w?: number; h?: number; onClick: () => void; code?: string }) {
    return (
        <ComponentBox
            x={cx - w / 2} y={y} w={w} h={h}
            label="REAKTÖR"
            subLabel="ŞÖNT"
            code={code}
            stroke={COLORS.reactor}
            fill={COLORS.reactorFill}
            glowFilter="glow-green"
            onClick={onClick}
        />
    );
}

// ─── Kondansatör ──────────────────────────────────────────────────────────────
export function CapacitorBlock({
    cx, y, w = 70, h = 52, isTriphase, onClick, code
}: { cx: number; y: number; w?: number; h?: number; isTriphase: boolean; onClick: () => void; code?: string }) {
    return (
        <ComponentBox
            x={cx - w / 2} y={y} w={w} h={h}
            label="KONDANSATÖR"
            subLabel={isTriphase ? "3 FAZLI" : "1 FAZLI"}
            code={code}
            stroke={COLORS.cap}
            fill={COLORS.capFill}
            glowFilter="glow-teal"
            onClick={onClick}
        />
    );
}

// ─── CT Bloğu ─────────────────────────────────────────────────────────────────
export function CTBlock({
    cx, cy, onClick, code
}: { cx: number; cy: number; onClick: () => void; code?: string }) {
    const { hovered, handlers } = useHover();
    const r = 30;
    return (
        <g onClick={onClick} {...handlers} style={{ cursor: "pointer" }}>
            <circle cx={cx} cy={cy} r={r + 2} fill={COLORS.shadow} />
            <circle cx={cx} cy={cy} r={r}
                fill={COLORS.ctFill} stroke={COLORS.ct}
                strokeWidth={hovered ? 3 : 2.5}
                filter={hovered ? "url(#drop-shadow)" : undefined} />
            <circle cx={cx} cy={cy} r={r * 0.6}
                fill="none" stroke={COLORS.ct} strokeWidth={1.5} />
            <text x={cx} y={cy + 5} fontSize={12} fontWeight="800"
                textAnchor="middle" fill={COLORS.ct}>CT</text>
            {code && (
                <text x={cx} y={cy + r + 14} fontSize={7.5} textAnchor="middle" fill={COLORS.muted}
                    fontFamily="monospace">{trunc(code, 14)}</text>
            )}
        </g>
    );
}

// ─── RGKR Rölesi ──────────────────────────────────────────────────────────────
export function RelayBlock({
    x, y, w, h, onClick, code, stepCount
}: { x: number; y: number; w: number; h: number; onClick: () => void; code?: string; stepCount: number }) {
    const { hovered, handlers } = useHover();
    const cx = x + w / 2;

    return (
        <g onClick={onClick} {...handlers} style={{ cursor: "pointer" }}>
            <rect x={x + 2} y={y + 3} width={w} height={h} rx={6} fill={COLORS.shadow} />
            <rect x={x} y={y} width={w} height={h} rx={6}
                fill={COLORS.relayFill} stroke={COLORS.relay}
                strokeWidth={hovered ? 3 : 2.5}
                filter={hovered ? "url(#drop-shadow)" : undefined} />
            {/* Top bar */}
            <rect x={x} y={y} width={w} height={8} rx={6} fill={COLORS.relay} />
            <rect x={x} y={y + 3} width={w} height={5} fill={COLORS.relay} />

            <text x={cx} y={y + 22} fontSize={11} fontWeight="800"
                textAnchor="middle" fill={COLORS.relay}>RGKR</text>
            <text x={cx} y={y + 35} fontSize={8} textAnchor="middle" fill={COLORS.muted}>
                REAKTİF GÜÇ KONTROL RÖLESİ
            </text>
            {code && (
                <text x={cx} y={y + 47} fontSize={7.5} textAnchor="middle" fill={COLORS.muted}
                    fontFamily="monospace">{trunc(code, 20)}</text>
            )}

            {/* Output terminals */}
            <text x={cx} y={y + h - 22} fontSize={7} textAnchor="middle" fill={COLORS.muted}>
                Kontrol Çıkışları
            </text>
            {Array.from({ length: Math.min(stepCount, 12) }, (_, i) => {
                const tx = x + 12 + i * ((w - 24) / Math.max(stepCount - 1, 1));
                return (
                    <g key={i}>
                        <circle cx={tx} cy={y + h - 10} r={4.5} fill={COLORS.relay} />
                        <text x={tx} y={y + h + 2} fontSize={6.5} textAnchor="middle" fill={COLORS.muted}>
                            C{i + 1}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}

// ─── SVC Bloğu ────────────────────────────────────────────────────────────────
export function SVCBlock({
    x, y, w, h, onClick, driverCode, fuseCode
}: { x: number; y: number; w: number; h: number; onClick: () => void; driverCode?: string; fuseCode?: string }) {
    const { hovered, handlers } = useHover();
    const cx = x + w / 2;

    return (
        <g onClick={onClick} {...handlers} style={{ cursor: "pointer" }}>
            <rect x={x + 2} y={y + 3} width={w} height={h} rx={6} fill={COLORS.shadow} />
            <rect x={x} y={y} width={w} height={h} rx={6}
                fill={COLORS.svcFill} stroke={COLORS.svc}
                strokeWidth={hovered ? 3 : 2.5}
                strokeDasharray={hovered ? undefined : "6,3"}
                filter={hovered ? "url(#drop-shadow)" : undefined} />
            {/* Top bar */}
            <rect x={x} y={y} width={w} height={8} rx={6} fill={COLORS.svc} />
            <rect x={x} y={y + 3} width={w} height={5} fill={COLORS.svc} />

            <text x={cx} y={y + 22} fontSize={11} fontWeight="800"
                textAnchor="middle" fill={COLORS.svc}>SVC</text>
            <text x={cx} y={y + 34} fontSize={8} textAnchor="middle" fill={COLORS.muted}>
                STATİK VAR KOMPANZATÖR
            </text>
            {driverCode && (
                <text x={cx} y={y + 46} fontSize={7.5} textAnchor="middle" fill={COLORS.muted}
                    fontFamily="monospace">{trunc(driverCode, 16)}</text>
            )}
            {fuseCode && (
                <text x={cx} y={y + 56} fontSize={7} textAnchor="middle" fill={COLORS.fuse}
                    fontFamily="monospace">Sig: {trunc(fuseCode, 14)}</text>
            )}
        </g>
    );
}

// ─── Topraklama ───────────────────────────────────────────────────────────────
export function GroundSym({ cx, y }: { cx: number; y: number }) {
    return (
        <g>
            <line x1={cx} y1={y} x2={cx} y2={y + 8} stroke={COLORS.wire} strokeWidth={2.5} />
            <line x1={cx - 16} y1={y + 8} x2={cx + 16} y2={y + 8} stroke={COLORS.wire} strokeWidth={3} />
            <line x1={cx - 10} y1={y + 14} x2={cx + 10} y2={y + 14} stroke={COLORS.wire} strokeWidth={2.5} />
            <line x1={cx - 5} y1={y + 20} x2={cx + 5} y2={y + 20} stroke={COLORS.wire} strokeWidth={2} />
        </g>
    );
}

// ─── Bağlantı Noktası ─────────────────────────────────────────────────────────
export function Junction({ cx, cy }: { cx: number; cy: number }) {
    return <circle cx={cx} cy={cy} r={3.5} fill={COLORS.wire} />;
}
