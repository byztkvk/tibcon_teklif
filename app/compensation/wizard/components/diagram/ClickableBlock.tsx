"use client";
/**
 * ClickableBlock.tsx
 * Ürün görseli + etiket + hover glow içeren tıklanabilir şema bloğu.
 * SVG içinde foreignObject kullanarak Next/Image render eder.
 */
import React, { useState } from "react";
import Image from "next/image";
import { BlockType, resolveIcon } from "./iconResolver";

// ─── Renk haritası (border + glow rengi) ─────────────────────────────────────
const BLOCK_COLORS: Record<BlockType, string> = {
    nh_sigorta: "#c62828",
    kontaktor: "#1a237e",
    tristor: "#6a1b9a",
    reaktor: "#1b5e20",
    harmonik_filtre: "#e65100",  // turuncu — filtre reaktörü
    kondansator: "#006064",
    svc: "#e65100",
    ct: "#37474f",
    relay: "#1b5e20",
    desarj_direnci: "#4e342e",
    placeholder: "#607d8b",
};

const BLOCK_LABELS: Record<BlockType, string> = {
    nh_sigorta: "NH Sigorta",
    kontaktor: "Kontaktör",
    tristor: "Tristör",
    reaktor: "Reaktör",
    harmonik_filtre: "H. Filtre",
    kondansator: "Kondansatör",
    svc: "SVC",
    ct: "Akım Trafosu",
    relay: "RGKR",
    desarj_direnci: "Deşarj Direnci",
    placeholder: "Bileşen",
};

interface ClickableBlockProps {
    /** SVG koordinatları - bloğun sol üst köşesi */
    x: number;
    y: number;
    /** Blok boyutu */
    w?: number;
    h?: number;
    /** Blok tipi → görsel + renk */
    blockType: BlockType;
    /** Ürün kodu (kutunun altında küçük yazı) */
    productCode?: string;
    /** Tıklanınca çağrılır */
    onClick: () => void;
    /** Özel etiket (yoksa BLOCK_LABELS'dan alınır) */
    label?: string;
}

export function ClickableBlock({
    x, y, w = 72, h = 72,
    blockType, productCode, onClick, label,
}: ClickableBlockProps) {
    const [hovered, setHovered] = useState(false);
    const color = BLOCK_COLORS[blockType] ?? "#607d8b";
    const displayLabel = label ?? BLOCK_LABELS[blockType];
    const imgSrc = resolveIcon(blockType);

    // Hover scale (SVG transform)
    const cx = x + w / 2;
    const cy = y + h / 2;
    const scale = hovered ? 1.05 : 1;

    // Toplam yükseklik: blok + etiket + kod
    const labelH = 14;
    const codeH = productCode ? 12 : 0;
    const totalH = h + labelH + codeH + 4;

    return (
        <g
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: "pointer" }}
            transform={`translate(${cx},${cy}) scale(${scale}) translate(${-cx},${-cy})`}
        >
            {/* Glow efekti (hover) */}
            {hovered && (
                <rect
                    x={x - 4} y={y - 4} width={w + 8} height={h + 8}
                    rx={8}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    opacity={0.35}
                    filter="url(#glow-block)"
                />
            )}

            {/* Dış çerçeve */}
            <rect
                x={x} y={y} width={w} height={h}
                rx={6}
                fill="white"
                stroke={color}
                strokeWidth={hovered ? 2.5 : 1.8}
            />

            {/* Üst renk şeridi */}
            <rect x={x} y={y} width={w} height={6} rx={6} fill={color} />
            <rect x={x} y={y + 2} width={w} height={4} fill={color} />

            {/* Ürün görseli — foreignObject ile Next/Image */}
            <foreignObject x={x + 4} y={y + 8} width={w - 8} height={h - 12}>
                <div
                    style={{
                        width: "100%", height: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "hidden",
                    }}
                >
                    <Image
                        src={imgSrc}
                        alt={displayLabel}
                        width={w - 8}
                        height={h - 12}
                        style={{
                            objectFit: "contain",
                            width: "100%",
                            height: "100%",
                            display: "block",
                        }}
                        unoptimized
                    />
                </div>
            </foreignObject>

            {/* Etiket */}
            <text
                x={cx} y={y + h + labelH}
                fontSize={9} fontWeight="700"
                textAnchor="middle"
                fill={color}
                fontFamily="'Outfit',sans-serif"
            >
                {displayLabel}
            </text>

            {/* Ürün kodu */}
            {productCode && (
                <text
                    x={cx} y={y + h + labelH + codeH}
                    fontSize={7.5} textAnchor="middle"
                    fill="#607d8b"
                    fontFamily="'Courier New',monospace"
                >
                    {productCode.length > 14 ? productCode.slice(0, 13) + "…" : productCode}
                </text>
            )}

            {/* Tıklanabilir alan (tam blok + etiket) */}
            <rect
                x={x - 2} y={y - 2} width={w + 4} height={totalH + 6}
                fill="transparent" stroke="none"
            />
        </g>
    );
}

/**
 * SVG defs'e eklenecek glow filtresi
 */
export function GlowDef() {
    return (
        <filter id="glow-block" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    );
}
