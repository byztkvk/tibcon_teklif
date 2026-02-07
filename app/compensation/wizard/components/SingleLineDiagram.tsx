import React from "react";
import { DesignState, WizardStep, ComponentSlotType, ComponentSelection } from "@/lib/compensation/wizard-types";
import { CompProduct } from "@/lib/compensation/types";

// Extended type to handle RELAY and SVC slots
type ExtendedSlotType = ComponentSlotType | "RELAY" | "SVC_DRIVER" | "SVC_FUSE" | "SVC_SHUNT_1" | "SVC_SHUNT_2" | "SVC_SHUNT_3" | "CURRENT_TRANSFORMER";

interface Props {
    design: DesignState;
    onSlotClick: (stepId: number, type: ExtendedSlotType) => void;
    onToggleStep: (stepId: number) => void;
    onStepCopy: (stepId: number) => void;
    onRemoveComponent: (stepId: number, type: ExtendedSlotType) => void;
}

export function SingleLineDiagram({ design, onSlotClick, onRemoveComponent, onStepCopy }: Props) {
    const activeSteps = Object.values(design.steps)
        .filter(s => design.relay.activeSteps[s.id - 1])
        .sort((a, b) => a.id - b.id);

    const [scale, setScale] = React.useState(1);

    return (
        <div style={{
            position: "relative",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "8px",
            overflow: "hidden", // Hide overflow for the container, inner scroll handles it
            height: "100%", // Fill parent
            display: "flex",
            flexDirection: "column"
        }}>
            {/* TOOLBAR */}
            <div style={{
                padding: "8px",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                background: "#f8f9fa"
            }}>
                <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="zoom-btn">-</button>
                <span style={{ fontSize: "0.9rem", fontWeight: "bold", padding: "4px 8px", minWidth: "50px", textAlign: "center" }}>{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="zoom-btn">+</button>
                <button onClick={() => setScale(1)} className="zoom-btn" style={{ marginLeft: "8px" }}>Sıfırla</button>
            </div>

            {/* SCROLLABLE AREA */}
            <div style={{
                overflow: "auto",
                flex: 1,
                padding: "20px",
                position: "relative"
            }}>
                <div style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    minWidth: "100%", // Ensure it takes full width initially
                    width: "max-content", // Allow it to shrink/grow based on content
                    minHeight: "850px"
                }}>
                    {/* --- SVG LAYER FOR CONNECTIONS --- */}
                    <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
                        {/* BUSBARS (Top Horizontal) */}
                        <text x="5" y="44" fill="#c0392b" fontSize="12" fontWeight="bold" fontFamily="sans-serif">R - L1</text>
                        <text x="5" y="54" fill="#f1c40f" fontSize="12" fontWeight="bold" fontFamily="sans-serif">S - L2</text>
                        <text x="5" y="64" fill="#2980b9" fontSize="12" fontWeight="bold" fontFamily="sans-serif">T - L3</text>
                        <text x="5" y="74" fill="#ff00ff" fontSize="12" fontWeight="bold" fontFamily="sans-serif">Mp - N</text>

                        <line x1="60" y1="40" x2="2500" y2="40" stroke="#c0392b" strokeWidth="4" /> {/* R */}
                        <line x1="60" y1="50" x2="2500" y2="50" stroke="#f1c40f" strokeWidth="4" /> {/* S */}
                        <line x1="60" y1="60" x2="2500" y2="60" stroke="#2980b9" strokeWidth="4" /> {/* T */}
                        <line x1="60" y1="70" x2="2500" y2="70" stroke="#ff00ff" strokeWidth="4" /> {/* N */}
                    </svg>

                    <div style={{ display: "flex", gap: "60px", marginTop: "100px", zIndex: 2, position: "relative", alignItems: "flex-start" }}>

                        {/* 1. SVC SECTION (Vertical Stack) */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>

                            {/* CONNECTION: Busbar -> Fuse */}
                            <div style={{ position: "absolute", top: "-60px", zIndex: 0 }}>
                                <ThreePhaseDrop height={60} />
                            </div>

                            {/* A. FUSE BOX */}
                            <div style={{ marginBottom: "10px", textAlign: "center" }}>
                                <div style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "2px" }}>NH SİGORTA</div>
                                <ComponentBox
                                    label="NH"
                                    items={design.svc.fuse ? [design.svc.fuse] : []}
                                    onClick={() => onSlotClick(0, "SVC_FUSE")}
                                    onRemove={() => onRemoveComponent(0, "SVC_FUSE")}
                                    width="100px"
                                    height="60px"
                                    symbol="FUSE"
                                />
                            </div>

                            {/* CONNECTION: Fuse -> Driver */}
                            <ThreePhaseDrop height={20} />

                            {/* B. SVC DRIVER BOX */}
                            <div style={{ marginBottom: "10px", textAlign: "center" }}>
                                <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#e67e22", marginBottom: "2px" }}>SVC SÜRÜCÜ</div>
                                <ComponentBox
                                    label="SÜRÜCÜ"
                                    items={design.svc.driver || []}
                                    onClick={() => onSlotClick(0, "SVC_DRIVER")}
                                    onRemove={() => onRemoveComponent(0, "SVC_DRIVER")}
                                    variant="SVC"
                                    width="140px"
                                    height="100px"
                                />
                            </div>

                            {/* CONNECTION: Driver -> Shunts */}
                            {/* Drawing a branching line logic is complex in pure CSS/SVG mix, simplifying to vertical drops */}
                            <ThreePhaseDrop height={20} />

                            {/* Distribution Bar for Shunts */}
                            <div style={{ display: "flex", justifyContent: "center", gap: "10px", borderTop: "2px solid #333", paddingTop: "10px", width: "100%" }}>
                                {/* C. SHUNT REACTORS (Side-by-Side) */}
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <ComponentBox
                                            label={`Şönt ${i}`}
                                            items={design.svc.shunts[i - 1] || []}
                                            onClick={() => onSlotClick(0, `SVC_SHUNT_${i}` as ExtendedSlotType)}
                                            onRemove={() => onRemoveComponent(0, `SVC_SHUNT_${i}` as ExtendedSlotType)}
                                            variant="SHUNT"
                                            width="70px"
                                            height="80px"
                                            symbol="INDUCTOR"
                                        />
                                        <span style={{ fontSize: "0.7rem", fontWeight: "bold", marginTop: "4px" }}>L{i}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CONNECTION LINES: SVC <-> RELAY */}
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "300px", paddingTop: "120px", marginLeft: "-100px", marginRight: "-100px", zIndex: 20 }}>
                            <svg width="260" height="100" style={{ overflow: "visible" }}>
                                {/* 4 Control Lines */}
                                {[0, 1, 2, 3].map((i) => (
                                    <g key={i} transform={`translate(0, ${i * 15})`}>
                                        <line x1="60" y1="0" x2="200" y2="0" stroke="black" strokeWidth="2" />
                                        <circle cx="60" cy="0" r="3" fill="white" stroke="black" strokeWidth="2" />
                                        <circle cx="200" cy="0" r="3" fill="white" stroke="black" strokeWidth="2" />

                                        {/* Labels - Moved ONTO lines (Outside boxes) */}
                                        <text x="75" y="-5" fontSize="10" fontWeight="bold" textAnchor="start">{i === 3 ? "5V" : `T${i + 1}`}</text>
                                        <text x="185" y="-5" fontSize="10" fontWeight="bold" textAnchor="end">{i === 3 ? "5V" : `T${i + 1}`}</text>
                                    </g>
                                ))}
                            </svg>
                        </div>

                        {/* 2. RELAY BOX (CENTER) */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                            {/* Connection Lines + CT */}
                            <div style={{ position: "absolute", top: "-60px", zIndex: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <ThreePhaseDrop height={30} />

                                {/* CT SYMBOL */}
                                <div
                                    onClick={() => onSlotClick(0, "CURRENT_TRANSFORMER")}
                                    style={{
                                        width: "36px", height: "36px", borderRadius: "50%", border: "2px solid #333", background: "white",
                                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 20,
                                        fontWeight: "bold", fontSize: "0.8rem", color: "#333", boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                                    }}
                                    title="Akım Trafosu Seç"
                                >
                                    {design.currentTransformer ? "CT" : "O"}
                                </div>
                                <div style={{ fontSize: "0.6rem", fontWeight: "bold", marginTop: "2px", whiteSpace: "nowrap" }}>Akım Trafosu</div>
                                {design.currentTransformer && (
                                    <div style={{
                                        position: "absolute", left: "45px", top: "25px",
                                        fontSize: "0.75rem", background: "white", padding: "4px 8px",
                                        border: "1px solid #ccc", borderRadius: "4px", whiteSpace: "nowrap",
                                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)", zIndex: 30
                                    }}>
                                        <strong>{design.currentTransformer.product.name}</strong>
                                        <div style={{ fontSize: "0.7rem", color: "#666" }}>{design.currentTransformer.product.productCode}</div>
                                        <button onClick={(e) => { e.stopPropagation(); onRemoveComponent(0, "CURRENT_TRANSFORMER"); }} style={{ position: "absolute", top: "-5px", right: "-5px", background: "red", color: "white", borderRadius: "50%", width: "16px", height: "16px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>x</button>
                                    </div>
                                )}
                                <ThreePhaseDrop height={25} />
                            </div>

                            <div
                                onClick={() => onSlotClick(0, "RELAY")}
                                style={{
                                    width: "160px",
                                    border: "3px solid #2e7d32", // Green border as per image
                                    background: "white",
                                    borderRadius: "4px",
                                    padding: "10px",
                                    display: "flex",
                                    flexDirection: "column",
                                    height: "250px",
                                    zIndex: 10,
                                    cursor: "pointer",
                                    position: "relative",
                                    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                                    marginTop: "30px"
                                }}
                            >
                                <h3 style={{ margin: "0 0 10px 0", textAlign: "center", fontSize: "1rem", color: "#2e7d32" }}>REAKTİF GÜÇ KONTROL RÖLESİ</h3>
                                {design.relay.selectedProduct ? (
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: "0.9rem", fontWeight: 700, margin: "10px 0" }}>{design.relay.selectedProduct.product.productCode}</div>
                                        <div style={{ fontSize: "0.8rem", color: "#666" }}>{design.relay.selectedProduct.product.name}</div>
                                    </div>
                                ) : <div style={{ textAlign: "center", color: "#999", marginTop: "20px" }}>Seçim Yapılmadı</div>}
                            </div>
                        </div>

                        {/* 3. STEPS (RIGHT) */}
                        <div style={{ flex: 1, display: "flex", justifyContent: "space-evenly", alignItems: "flex-start", minWidth: "50%" }}>
                            {activeSteps.map((step, idx) => (
                                <StepColumn
                                    key={step.id}
                                    step={step}
                                    system={design.system}
                                    onSlotClick={onSlotClick}
                                    onRemoveComponent={onRemoveComponent}
                                    onCopy={onStepCopy}
                                    idx={idx}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .zoom-btn {
                    width: 30px;
                    height: 30px;
                    border-radius: 4px;
                    border: 1px solid #ddd;
                    background: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: #555;
                }
                .zoom-btn:hover {
                    background: #eee;
                }
            `}</style>
        </div>
    );
}

function StepColumn({ step, system, onSlotClick, onRemoveComponent, onCopy, idx }: any) {
    const isShunt = step.components.SHUNT?.length > 0;
    const isEmpty = !step.components.CAP?.length && !step.components.SHUNT?.length;
    const hasFilter = system.harmonicFilter;

    // Calculate Step Total Power
    let stepPower = 0;
    let powerUnit = "kVAr";

    if (isShunt && step.components.SHUNT) {
        stepPower = step.components.SHUNT.reduce((acc: number, item: any) => acc + (item.product.kvar || 0) * item.qty, 0);
    } else if (step.components.CAP) {
        stepPower = step.components.CAP.reduce((acc: number, item: any) => acc + (item.product.kvar || 0) * item.qty, 0);
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "110px", position: "relative", marginTop: "40px" }}>

            {/* Step ID (Offset to avoid cutting line) */}
            <div style={{
                position: "absolute", top: "-30px", left: "-10px",
                width: "24px", height: "24px", borderRadius: "50%", background: "#333", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold", zIndex: 10,
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }}>
                {step.id}
            </div>

            {/* Connection Line to Busbar (Long drop) */}
            <div style={{ position: "absolute", top: "-100px", zIndex: 0 }}>
                <ThreePhaseDrop height={100} />
            </div>

            {/* FUSE */}
            <ComponentBox
                label="Sigorta"
                items={step.components.NH}
                onClick={() => onSlotClick(step.id, "NH")}
                onRemove={() => onRemoveComponent(step.id, "NH")}
                height="50px"
                symbol="FUSE"
            />
            {/* Direct Connection */}
            <ThreePhaseDrop height={30} width={10} />

            {/* CONTACTOR */}
            <ComponentBox
                label="Kontaktör"
                items={step.components.SWITCH}
                onClick={() => onSlotClick(step.id, "SWITCH")}
                onRemove={() => onRemoveComponent(step.id, "SWITCH")}
                height="50px"
                symbol="SWITCH"
            />

            {/* HARMONIC FILTER (If Enabled) */}
            {hasFilter ? (
                <>
                    <ThreePhaseDrop height={30} width={10} />
                    <ComponentBox
                        label="H. Filtre"
                        items={step.components.HARMONIC_FILTER}
                        onClick={() => onSlotClick(step.id, "HARMONIC_FILTER")}
                        onRemove={() => onRemoveComponent(step.id, "HARMONIC_FILTER")}
                        height="50px"
                        symbol="H_FILTER"
                    />
                </>
            ) : null}

            <ThreePhaseDrop height={30} width={10} />

            {/* MAIN UNIT */}
            {isShunt ? (
                <ComponentBox
                    label="Şönt"
                    items={step.components.SHUNT}
                    onClick={() => onSlotClick(step.id, "SHUNT")}
                    onRemove={() => onRemoveComponent(step.id, "SHUNT")}
                    variant="SHUNT"
                    symbol="INDUCTOR"
                />
            ) : (
                <ComponentBox
                    label="Kond."
                    items={step.components.CAP}
                    onClick={() => onSlotClick(step.id, "CAP")}
                    onRemove={() => onRemoveComponent(step.id, "CAP")}
                    variant="CAP"
                    symbol="CAPACITOR"
                />
            )}

        </div>
    );
}

function ComponentBox({ label, items, onClick, onRemove, variant, width = "100px", height = "60px", symbol }: any) {
    const hasItems = items && items.length > 0;

    let bg = "white";
    let border = "1px solid #7f8c8d";

    if (variant === "SVC") { bg = "white"; border = "3px solid #e67e22"; } // Orange border for Driver
    if (variant === "SHUNT" && hasItems) { bg = "#e8f8f5"; }
    if (variant === "CAP" && hasItems) { bg = "#e3f2fd"; }

    return (
        <div
            onClick={onClick}
            style={{
                width: width,
                minHeight: height,
                height: "auto",
                border: border,
                background: bg,
                borderRadius: "4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "2px",
                position: "relative",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                zIndex: 2,
            }}
        >
            {/* SYMBOL RENDERING */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                {symbol === "FUSE" && (
                    <svg width="40" height="20" viewBox="0 0 40 20">
                        <line x1="0" y1="10" x2="40" y2="10" stroke="black" strokeWidth="2" />
                        <rect x="10" y="2" width="20" height="16" fill="white" stroke="black" strokeWidth="2" />
                    </svg>
                )}
                {symbol === "SWITCH" && (
                    <svg width="30" height="30" viewBox="0 0 30 30">
                        <path d="M5 25 L10 25 L18 5 L23 5" fill="none" stroke="black" strokeWidth="2" />
                    </svg>
                )}
                {symbol === "H_FILTER" && (
                    <svg width="30" height="30" viewBox="0 0 30 30">
                        {/* Sine Wave */}
                        <path d="M2 15 Q 8 5, 15 15 T 28 15" fill="none" stroke="black" strokeWidth="2" />
                        <rect x="0" y="0" width="30" height="30" fill="none" stroke="#ddd" strokeWidth="1" />
                    </svg>
                )}
                {symbol === "CAPACITOR" && (
                    <svg width="30" height="30" viewBox="0 0 30 30">
                        <line x1="15" y1="0" x2="15" y2="10" stroke="black" strokeWidth="2" />
                        <line x1="5" y1="10" x2="25" y2="10" stroke="black" strokeWidth="2" />
                        <line x1="5" y1="16" x2="25" y2="16" stroke="black" strokeWidth="2" />
                        <line x1="15" y1="16" x2="15" y2="26" stroke="black" strokeWidth="2" />
                    </svg>
                )}
                {symbol === "INDUCTOR" && (
                    <svg width="30" height="30" viewBox="0 0 30 30">
                        <path d="M15 0 V5 Q25 5 25 10 Q25 15 15 15 Q5 15 5 20 Q5 25 15 25 V30" fill="none" stroke="black" strokeWidth="2" />
                    </svg>
                )}
                <div style={{ fontSize: "0.65rem", fontWeight: "bold", marginTop: "2px", textAlign: "center", lineHeight: "1" }}>{label}</div>
            </div>

            {hasItems && (
                <div style={{ width: "100%", background: "rgba(255,255,255,0.95)", borderTop: "1px solid #333", fontSize: "0.6rem", textAlign: "center", padding: "2px 0", color: "#000", display: "flex", flexDirection: "column", gap: "1px" }}>
                    {items.map((item: any, idx: number) => (
                        <div key={idx} style={{
                            borderBottom: idx < items.length - 1 ? "1px solid #eee" : "none",
                            padding: "2px 8px", // Added side padding
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between", // Push apart
                            width: "100%"
                        }}>
                            <span style={{ fontWeight: 700, whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.1", textAlign: "left" }}>
                                {item.product.productCode}
                            </span>
                            {item.qty > 1 && (
                                <span style={{ fontSize: "0.7rem", color: "#e74c3c", fontWeight: "bold", marginLeft: "4px" }}>x{item.qty}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Info Icon to indicate clickable */}
            <div style={{ position: "absolute", top: "2px", right: "2px", color: hasItems ? "#2980b9" : "#ccc", fontSize: "10px" }}>
                ℹ
            </div>
        </div>
    );
}

function ThreePhaseDrop({ height = 50, width = 30 }: { height?: number, width?: number }) {
    return (
        <div style={{ display: "flex", gap: "4px", height: height, justifyContent: "center" }}>
            <div style={{ width: "2px", height: "100%", background: "#c0392b" }}></div> {/* R */}
            <div style={{ width: "2px", height: "100%", background: "#f1c40f" }}></div> {/* S */}
            <div style={{ width: "2px", height: "100%", background: "#2980b9" }}></div> {/* T */}
        </div>
    );
}
