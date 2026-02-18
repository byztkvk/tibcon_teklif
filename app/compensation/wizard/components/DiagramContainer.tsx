import React, { useRef, useState } from "react";
import { SingleLineDiagramCAD } from "./SingleLineDiagramCAD";
import { DesignState } from "@/lib/compensation/wizard-types";

type ExtendedSlotType =
    | "NH" | "SWITCH" | "CAP" | "SHUNT" | "HARMONIC_FILTER"
    | "RELAY" | "SVC_DRIVER" | "SVC_FUSE" | "SVC_SHUNT_1" | "SVC_SHUNT_2"
    | "SVC_SHUNT_3" | "CURRENT_TRANSFORMER";

interface Props {
    design: DesignState;
    onSlotClick: (stepId: number, type: ExtendedSlotType) => void;
}

export function DiagramContainer({ design, onSlotClick }: Props) {
    const diagramRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1.0);
    const [isExporting, setIsExporting] = useState(false);

    // ── SVG Vektörel Export ──────────────────────────────────────────────────
    const exportSVG = () => {
        const svgEl = diagramRef.current?.querySelector("svg");
        if (!svgEl) { alert("SVG bulunamadı."); return; }
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        // viewBox'ı sıfırla (pan olmadan)
        const vb = svgEl.getAttribute("viewBox");
        if (vb) clone.setAttribute("viewBox", vb);
        const str = new XMLSerializer().serializeToString(clone);
        const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `tek-hat-${Date.now()}.svg`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    // ── PNG Export (SVG → Canvas → PNG) ─────────────────────────────────────
    const exportPNG = async () => {
        const svgEl = diagramRef.current?.querySelector("svg");
        if (!svgEl) { alert("SVG bulunamadı."); return; }
        setIsExporting(true);
        try {
            const str = new XMLSerializer().serializeToString(svgEl);
            const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                const SCALE = 3;
                const W = svgEl.clientWidth || 1600;
                const H = svgEl.clientHeight || 900;
                const canvas = document.createElement("canvas");
                canvas.width = W * SCALE; canvas.height = H * SCALE;
                const ctx = canvas.getContext("2d")!;
                ctx.scale(SCALE, SCALE);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, W, H);
                ctx.drawImage(img, 0, 0, W, H);
                URL.revokeObjectURL(url);
                canvas.toBlob(b => {
                    if (!b) return;
                    const pu = URL.createObjectURL(b);
                    const a = document.createElement("a");
                    a.href = pu; a.download = `tek-hat-${Date.now()}.png`;
                    document.body.appendChild(a); a.click();
                    document.body.removeChild(a); URL.revokeObjectURL(pu);
                    setIsExporting(false);
                }, "image/png", 1.0);
            };
            img.onerror = () => { setIsExporting(false); alert("PNG oluşturulamadı."); };
            img.src = url;
        } catch (e) {
            console.error(e); setIsExporting(false);
        }
    };

    return (
        <div style={{
            position: "relative", background: "#f0f2f5",
            border: "1px solid #ddd", borderRadius: 8,
            overflow: "hidden", height: "100%",
            display: "flex", flexDirection: "column",
        }}>
            {/* ── TOOLBAR ── */}
            <div style={{
                padding: "8px 14px", borderBottom: "1px solid #e0e0e0",
                display: "flex", justifyContent: "space-between",
                alignItems: "center", background: "white",
                gap: 10, flexWrap: "wrap",
            }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} className="d-btn" title="Uzaklaştır">−</button>
                    <span style={{
                        fontSize: 12, fontWeight: 600, padding: "4px 10px",
                        minWidth: 56, textAlign: "center",
                        background: "#f8f9fa", borderRadius: 4, border: "1px solid #e0e0e0",
                    }}>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(4, z + 0.1))} className="d-btn" title="Yakınlaştır">+</button>
                    <button onClick={() => setZoom(1)} className="d-btn" style={{ marginLeft: 4 }}>↺</button>
                    <span style={{ fontSize: 10, color: "#999", marginLeft: 6 }}>
                        🖱 Sürükle: Pan · Tekerlek: Zoom
                    </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={exportSVG} className="d-btn d-btn-dark" title="SVG (vektörel)">
                        📐 SVG
                    </button>
                    <button onClick={exportPNG} disabled={isExporting} className="d-btn d-btn-primary">
                        {isExporting ? "⏳..." : "📥 PNG"}
                    </button>
                </div>
            </div>

            {/* ── DIAGRAM ── */}
            <div style={{ flex: 1, overflow: "hidden", background: "#f0f2f5", position: "relative" }}>
                <div
                    ref={diagramRef}
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                        width: `${100 / zoom}%`,
                        height: `${100 / zoom}%`,
                        transition: "transform 0.15s ease",
                    }}
                >
                    <SingleLineDiagramCAD design={design} onSlotClick={onSlotClick} />
                </div>
            </div>

            {/* ── EXPORT OVERLAY ── */}
            {isExporting && (
                <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(255,255,255,0.9)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
                }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Dışa aktarılıyor...</div>
                        <div style={{ fontSize: 12, color: "#666" }}>Lütfen bekleyin</div>
                    </div>
                </div>
            )}

            <style jsx>{`
        .d-btn {
          padding: 6px 12px; border-radius: 5px; border: 1px solid #d0d5dd;
          background: white; cursor: pointer; font-size: 13px; font-weight: 500;
          color: #344054; display: flex; align-items: center; gap: 4px;
          transition: all 0.15s; white-space: nowrap;
        }
        .d-btn:hover:not(:disabled) { background: #f9fafb; border-color: #b8bfc7; }
        .d-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .d-btn-primary {
          background: linear-gradient(135deg,#1976d2,#1565c0);
          color: white; border-color: #1565c0;
        }
        .d-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg,#1565c0,#0d47a1); }
        .d-btn-dark {
          background: linear-gradient(135deg,#37474f,#263238);
          color: white; border-color: #263238;
        }
        .d-btn-dark:hover:not(:disabled) { background: linear-gradient(135deg,#263238,#1c2a30); }
      `}</style>
        </div>
    );
}

// ── PDF için yüksek çözünürlüklü capture ─────────────────────────────────────
export async function captureDiagramImage(design: DesignState): Promise<Blob | null> {
    const { createRoot } = await import("react-dom/client");
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1800px;height:900px;";
    document.body.appendChild(container);

    return new Promise(resolve => {
        const root = createRoot(container);
        const Wrapper = () => {
            const divRef = React.useRef<HTMLDivElement>(null);
            React.useEffect(() => {
                const run = async () => {
                    await new Promise(r => setTimeout(r, 500));
                    const svgEl = divRef.current?.querySelector("svg");
                    if (!svgEl) { resolve(null); return; }
                    const str = new XMLSerializer().serializeToString(svgEl);
                    const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        const SCALE = 2;
                        const canvas = document.createElement("canvas");
                        canvas.width = 1800 * SCALE; canvas.height = 900 * SCALE;
                        const ctx = canvas.getContext("2d")!;
                        ctx.scale(SCALE, SCALE);
                        ctx.fillStyle = "white"; ctx.fillRect(0, 0, 1800, 900);
                        ctx.drawImage(img, 0, 0, 1800, 900);
                        URL.revokeObjectURL(url);
                        canvas.toBlob(b => {
                            root.unmount(); document.body.removeChild(container);
                            resolve(b);
                        }, "image/png", 1.0);
                    };
                    img.onerror = () => { resolve(null); };
                    img.src = url;
                };
                run();
            }, []);
            return (
                <div ref={divRef} style={{ width: "100%", height: "100%" }}>
                    <SingleLineDiagramCAD design={design} onSlotClick={() => { }} />
                </div>
            );
        };
        root.render(<Wrapper />);
    });
}
