import { useState, useMemo } from "react";
import { ProductIndex, CompProduct } from "@/lib/compensation/types";
import { ComponentSlotType } from "@/lib/compensation/wizard-types";

// Allow string as "virtual" slot type for RELAY/SVC
type SlotTypeExt = ComponentSlotType | "RELAY" | "SVC_DRIVER" | "SVC_FUSE" | "SVC_SHUNT_1" | "SVC_SHUNT_2" | "SVC_SHUNT_3" | "CURRENT_TRANSFORMER";

interface Props {
    slot: { stepId: number; type: string }; // relaxed type
    systemVoltage: number;
    index: ProductIndex;
    onSelect: (product: CompProduct, qty: number) => void;
    onClose: () => void;
}

const CAP_VOLTAGES = [230, 400, 415, 440, 480, 525, 690, 830];
const TABS = [
    { label: "Tümü", val: "ALL" },
    ...CAP_VOLTAGES.map(v => ({ label: `${v}V`, val: v })),
    { label: "Vermikülit", val: "VERM" },
    { label: "OG", val: "OG" }
];

export function ProductSelectionDrawer({ slot, systemVoltage, index, onSelect, onClose }: Props) {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<string | number>("ALL");
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // --- MAPPING SLOT TYPE TO CATEGORY ---
    const targetCategory = useMemo(() => {
        const type = slot.type;
        if (type === "NH") return ["SİGORTA", "NH BUŞON"];
        if (type === "SVC_FUSE") return ["SİGORTA", "NH BUŞON"]; // Added SVC Fuse
        if (type === "SWITCH") return ["KOMPANZASYON KONTAKTÖRÜ", "KONTAKTÖR"];
        if (type === "HARMONIC_FILTER") return ["HARMONİK", "FİLTRE", "FILTER"]; // Broader keywords
        if (type === "CAP") return ["AG KONDANSATÖR", "ALÇAK GERİLİM GÜÇ KONDANSATÖRÜ", "OG KONDANSATÖR"];
        if (type === "SHUNT" || type.startsWith("SVC_SHUNT")) return ["ŞÖNT REAKTÖR"];
        if (type === "SVC_DRIVER") return ["ENDÜKTİF YÜK SÜRÜCÜ", "SÜRÜCÜ", "SVC"];
        if (type === "RELAY") return ["REAKTİF GÜÇ KONTROL RÖLESİ", "RÖLE"];
        if (type === "CURRENT_TRANSFORMER") return ["AKIM TRAFOSU", "TOROİDAL", "OG AKIM"];

        return [];
    }, [slot.type]);

    // 1. Base Products (Filtered by Slot Type only)
    const baseProducts = useMemo(() => {
        let all: CompProduct[] = [];
        Object.values(index.byType).forEach(list => all.push(...list));

        const filtered = all.filter(p => {
            const mainCat = (p.mainCategory || "").toUpperCase();
            const typeCat = (p.type || "").toUpperCase();
            const name = (p.name || "").toUpperCase();
            const isTBE = p.orderCode === "TBE2800" || p.productCode.includes("TBE2800");

            if (slot.type === "SVC_DRIVER") {
                if (!mainCat.includes("SÜRÜCÜ") && !typeCat.includes("SÜRÜCÜ") && !name.includes("SÜRÜCÜ")) return false;
            }
            else if (slot.type === "HARMONIC_FILTER") {
                const isFilter = (mainCat.includes("HARMONİK") || typeCat.includes("HARMONİK") || name.includes("HARMONİK")) ||
                    (mainCat.includes("HARMONIK") || typeCat.includes("HARMONIK") || name.includes("HARMONIK")) ||
                    (mainCat.includes("REAKTÖR") || typeCat.includes("REAKTÖR") || name.includes("REAKTÖR"));
                const isShunt = mainCat.includes("ŞÖNT") || typeCat.includes("ŞÖNT") || name.includes("ŞÖNT");
                if (!isFilter || isShunt) return false;
            }
            else if (slot.type === "RELAY") {
                if (!mainCat.includes("RÖLE") && !typeCat.includes("RÖLE") && !name.includes("RÖLE")) return false;
            }
            else if (slot.type === "CURRENT_TRANSFORMER") {
                const s = (mainCat + " " + typeCat + " " + name + " " + p.productCode).toUpperCase();

                // Kapsayıcı CT kontrolü
                const isCt =
                    s.includes("AKIM") ||
                    s.includes("TRAFO") ||
                    s.includes("CURRENT") ||
                    s.includes("TRANSFORMER") ||
                    s.includes("TOROID") ||
                    s.includes("OAT") ||     // OG Akım Trafosu kodu
                    s.includes("ACT") ||     // AG Akım Trafosu kodu
                    s.includes("/5") ||      // 50/5 A
                    s.includes("/1") ||      // 100/1 A
                    s.includes("CT ");       // CT boşluk

                // Hariç tutulacaklar
                const isExcluded =
                    s.includes("KONDANSATOR") ||
                    s.includes("KONDANSATÖR") ||
                    s.includes("GKR") ||     // Röle
                    s.includes("RÖLE") ||
                    s.includes("ANALİZÖR");

                if (!isCt || isExcluded) return false;
            }
            else if (slot.type === "SHUNT" || slot.type.startsWith("SVC_SHUNT")) {
                if (!mainCat.includes("ŞÖNT") && !typeCat.includes("ŞÖNT") && !name.includes("ŞÖNT")) return false;
            }
            else if (targetCategory.length > 0) {
                const match = targetCategory.some(t => mainCat.includes(t) || typeCat.includes(t));
                if (!match) return false;
            }
            // CAP filtering implicitly handled by targetCategory or just fall through
            return true;
        });

        // DEBUG: Inspect what we have
        if (all.length > 0) {
            console.log("[Drawer] First Base Product:", all[0]);
            console.log("[Drawer] Unique Groups found:", Array.from(new Set(all.map(p => p.groupCode))));
        }

        return filtered;
    }, [index, slot.type, targetCategory]);

    // 2. Available Groups
    const availableGroups = useMemo(() => {
        return Array.from(new Set(baseProducts.map(p => p.groupCode).filter(Boolean))).sort();
    }, [baseProducts]);

    // 3. Final Filtered Products (Group + Search)
    const filteredProducts = useMemo(() => {
        return baseProducts.filter(p => {
            // Group Filter
            if (activeTab !== "ALL") {
                if (p.groupCode !== activeTab) return false;
            }

            // Search
            if (search) {
                const s = search.toLowerCase();
                return (
                    p.productCode.toLowerCase().includes(s) ||
                    p.name.toLowerCase().includes(s) ||
                    (p.kvar && p.kvar.toString().includes(s))
                );
            }
            return true;
        }).sort((a, b) => {
            if (slot.type === "CAP" || slot.type.includes("SHUNT")) return (a.kvar || 0) - (b.kvar || 0);
            return (a.ampA || 0) - (b.ampA || 0);
        });
    }, [baseProducts, activeTab, search, slot.type]);

    const handleAdd = (p: CompProduct) => {
        const qty = quantities[p.orderCode] || 1;
        onSelect(p, qty);
        // Reset qty
        setQuantities(prev => ({ ...prev, [p.orderCode]: 1 }));
    };

    return (
        <div style={{
            position: "fixed", top: 0, right: 0, width: "500px", height: "100%", background: "white",
            boxShadow: "-5px 0 20px rgba(0,0,0,0.1)", zIndex: 1000, display: "flex", flexDirection: "column",
            borderLeft: "1px solid #ddd"
        }}>
            {/* Header */}
            <div style={{ padding: "20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa" }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Ürün Ekle</h3>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>
                        {slot.type === "RELAY" ? "Reaktif Güç Kontrol Rölesi" :
                            slot.type === "SVC_DRIVER" ? "Endüktif Yük Sürücüsü" :
                                slot.type === "CURRENT_TRANSFORMER" ? "Akım Trafosu" :
                                    `Kademe ${slot.stepId} - ${slot.type}`}
                    </div>
                </div>
                <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>

            {/* Controls */}
            <div style={{ padding: "15px", borderBottom: "1px solid #eee" }}>
                <input
                    type="text"
                    placeholder="Ürün Ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd", marginBottom: "10px" }}
                    autoFocus
                />

                {/* GROUP FILTER (Dropdown) - Only for CAP */}
                {slot.type === "CAP" && (
                    <div style={{ marginBottom: "10px" }}>
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                            style={{
                                width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd",
                                background: "white", fontSize: "0.9rem", color: "#333"
                            }}
                        >
                            <option value="ALL">Tüm Gruplar</option>
                            {availableGroups.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Product List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                {filteredProducts.map(p => (
                    <div
                        key={p.orderCode}
                        style={{
                            padding: "10px", borderBottom: "1px solid #f0f0f0", display: "flex",
                            alignItems: "center", gap: "10px", transition: "background 0.2s"
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.productCode}</div>
                            <div style={{ fontSize: "0.85rem", color: "#444" }}>{p.name}</div>
                            <div style={{ display: "flex", gap: "10px", fontSize: "0.8rem", color: "#666", marginTop: "4px" }}>
                                {p.voltage && <span>{p.voltage}V</span>}
                                <span style={{ marginLeft: "auto", fontWeight: 700, color: "#27ae60" }}>{p.listPrice} {p.currency}</span>
                            </div>
                        </div>

                        {/* Qty & Add */}
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <input
                                type="number"
                                min="1"
                                value={quantities[p.orderCode] || 1}
                                onChange={e => setQuantities({ ...quantities, [p.orderCode]: parseInt(e.target.value) || 1 })}
                                style={{ width: "50px", padding: "5px", borderRadius: "4px", border: "1px solid #ddd", textAlign: "center" }}
                            />
                            <button
                                onClick={() => handleAdd(p)}
                                style={{ background: "#2ecc71", color: "white", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem" }}
                            >
                                Ekle
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
