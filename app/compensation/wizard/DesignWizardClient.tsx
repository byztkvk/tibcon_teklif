"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    DesignState,
    WizardStep,
    ComponentSlotType,
    ComponentSelection,
    createEmptySteps
} from "@/lib/compensation/wizard-types";
import { getIndexedProducts, normalizeNumberTR } from "@/lib/compensation/products";
import { ProductIndex, CompProduct } from "@/lib/compensation/types";
import { convertBomToQuote } from "@/lib/compensation/toQuote";
import LoadingOverlay from "@/components/LoadingOverlay";

// --- Sub-components (Inline for now, can extract later) ---
import { TopBar } from "./components/TopBar";
import { SystemParamsPanel } from "./components/SystemParamsPanel";
import { DiagramContainer } from "./components/DiagramContainer";
import { ProductSelectionDrawer } from "./components/ProductSelectionDrawer";
import { BomModal } from "./components/BomModal";
import { StepDetailModal } from "./components/StepDetailModal";

// Extended type to handle RELAY and SVC slots
type ExtendedSlotType = ComponentSlotType | "RELAY" | "SVC_DRIVER" | "SVC_FUSE" | "SVC_SHUNT_1" | "SVC_SHUNT_2" | "SVC_SHUNT_3" | "CURRENT_TRANSFORMER";

export default function DesignWizardClient() {
    const router = useRouter();

    // --- State ---
    const [loading, setLoading] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
    const [productIndex, setProductIndex] = useState<ProductIndex | null>(null);
    const [session, setSession] = useState<any>(null);

    // Design State
    const [design, setDesign] = useState<DesignState>({
        system: { gridVoltage: 400, phaseType: "TRIFAZE", relaySize: 12, harmonicFilter: false },
        currentTransformer: undefined,
        relay: { maxSteps: 12, activeSteps: Array(12).fill(true) },
        svc: {
            active: false,
            driver: [],
            fuse: [],
            shunts: [[], [], []]
        },
        steps: createEmptySteps(12)
    });

    // UI State
    const [activeTab, setActiveTab] = useState<"design" | "bom">("design");
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Selection Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ stepId: number, type: ExtendedSlotType } | null>(null);

    // Detail Modal State
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailSlot, setDetailSlot] = useState<{ stepId: number, type: ExtendedSlotType } | null>(null);
    const [showBomModal, setShowBomModal] = useState(false);

    // --- Load Data ---
    useEffect(() => {
        const load = async () => {
            try {
                setLoadingMsg("Veriler yükleniyor...");
                const sess = localStorage.getItem("tibcon_session");
                if (!sess) return router.push("/login");
                setSession(JSON.parse(sess));

                const idx = await getIndexedProducts();
                if (!idx) throw new Error("Ürün listesi alınamadı.");
                setProductIndex(idx);
            } catch (e: any) {
                console.error("[Wizard] Load Error:", e);
                alert("Hata: " + e.message);
            } finally {
                setLoading(false);
                setLoadingMsg(null);
            }
        };
        load();
    }, [router]);

    // --- Logic ---
    const updateSystemParams = (params: Partial<DesignState["system"]>) => {
        setDesign(prev => ({
            ...prev,
            system: { ...prev.system, ...params }
        }));
    };

    const updateRelaySize = (size: number) => {
        const newActive = Array(size).fill(true);
        const newSteps = createEmptySteps(size);

        Object.keys(design.steps).forEach(k => {
            const id = parseInt(k);
            if (id <= size) {
                newSteps[id] = design.steps[id];
                if (design.relay.activeSteps[id - 1] !== undefined) {
                    newActive[id - 1] = design.relay.activeSteps[id - 1];
                }
            }
        });

        setDesign(prev => ({
            ...prev,
            relay: { ...prev.relay, maxSteps: size, activeSteps: newActive },
            steps: newSteps
        }));
    };

    const toggleStepActive = (stepId: number) => {
        setDesign(prev => {
            const newActive = [...prev.relay.activeSteps];
            newActive[stepId - 1] = !newActive[stepId - 1];
            return {
                ...prev,
                relay: { ...prev.relay, activeSteps: newActive }
            };
        });
    };

    const openProductDrawer = () => {
        if (detailSlot) {
            setSelectedSlot(detailSlot);
            setDrawerOpen(true);
            setDetailModalOpen(false); // Close detail modal when opening drawer
        }
    };

    const closeDetailModal = () => {
        setDetailModalOpen(false);
        setDetailSlot(null);
    };

    const getItemsForSlot = (stepId: number, type: ExtendedSlotType) => {
        if (type === "CURRENT_TRANSFORMER") {
            return design.currentTransformer ? [{ product: design.currentTransformer.product, qty: design.currentTransformer.qty }] : [];
        }
        if (type === "RELAY") {
            return design.relay.selectedProduct ? [{ product: design.relay.selectedProduct.product, qty: design.relay.selectedProduct.qty }] : [];
        }
        if (type === "SVC_DRIVER") {
            return design.svc.driver;
        }
        if (type === "SVC_FUSE") {
            return design.svc.fuse;   // artık array
        }
        if (type.startsWith("SVC_SHUNT_")) {
            const idx = parseInt(type.split("_")[2]) - 1;
            return design.svc.shunts[idx] || [];
        }

        // Step Components
        const step = design.steps[stepId];
        if (!step) return [];

        // Ensure strictly typed access
        const compType = type as ComponentSlotType;
        return step.components[compType] || [];
    };

    const selectProductForSlot = (stepId: number, type: ExtendedSlotType, product: CompProduct, qty: number = 1) => {
        setDesign(prev => {
            // 0. CT CASE
            if (type === "CURRENT_TRANSFORMER") {
                return {
                    ...prev,
                    currentTransformer: { product, qty }
                };
            }

            // 1. RELAY CASE
            if (type === "RELAY") {
                return {
                    ...prev,
                    relay: { ...prev.relay, selectedProduct: { product, qty } }
                };
            }

            // 2. SVC DRIVER
            if (type === "SVC_DRIVER") {
                return {
                    ...prev,
                    svc: { ...prev.svc, active: true, driver: [...(prev.svc.driver || []), { product, qty }] }
                };
            }
            // 2b. SVC FUSE — array'e ekle
            if (type === "SVC_FUSE") {
                return {
                    ...prev,
                    svc: { ...prev.svc, active: true, fuse: [...prev.svc.fuse, { product, qty }] }
                };
            }

            // 3. SVC SHUNT CAPS
            if (type.startsWith("SVC_SHUNT_")) {
                const idx = parseInt(type.split("_")[2]) - 1; // 0, 1, 2
                const newShunts = [...prev.svc.shunts];
                // Append instead of replace
                newShunts[idx] = [...newShunts[idx], { product, qty }];
                return {
                    ...prev,
                    svc: { ...prev.svc, active: true, shunts: newShunts }
                };
            }

            // 4. REGULAR STEP COMPONENTS
            const step = prev.steps[stepId];
            if (!step) return prev; // Should not happen for special types

            const currentList = step.components[type as ComponentSlotType] || [];
            const newList = [...currentList, { product, qty }];
            const newComponents = { ...step.components, [type]: newList };

            return {
                ...prev,
                steps: {
                    ...prev.steps,
                    [stepId]: { ...step, components: newComponents }
                }
            };
        });
    };

    const removeComponent = (stepId: number, type: ExtendedSlotType) => {
        setDesign(prev => {
            if (type === "CURRENT_TRANSFORMER") {
                return { ...prev, currentTransformer: undefined };
            }
            if (type === "RELAY") {
                return { ...prev, relay: { ...prev.relay, selectedProduct: undefined } };
            }
            if (type === "SVC_DRIVER") {
                return { ...prev, svc: { ...prev.svc, driver: [] } };
            }
            if (type === "SVC_FUSE") {
                return { ...prev, svc: { ...prev.svc, fuse: [] } };  // array'i temizle
            }
            if (type.startsWith("SVC_SHUNT_")) {
                const idx = parseInt(type.split("_")[2]) - 1;
                const newShunts = [...prev.svc.shunts];
                newShunts[idx] = []; // Clear all items for this phase
                return { ...prev, svc: { ...prev.svc, shunts: newShunts } };
            }

            const step = prev.steps[stepId];
            const newComponents = { ...step.components };
            delete newComponents[type as ComponentSlotType];
            return {
                ...prev,
                steps: {
                    ...prev.steps,
                    [stepId]: { ...step, components: newComponents }
                }
            };
        });
    };

    const copyStepToAll = (sourceStepId: number) => {
        if (!confirm(`Kademe ${sourceStepId} içeriği diğer tüm AKTİF kademelere kopyalansın mı?`)) return;

        const sourceComp = design.steps[sourceStepId].components;
        setDesign(prev => {
            const newSteps = { ...prev.steps };
            prev.relay.activeSteps.forEach((isActive, idx) => {
                const id = idx + 1;
                if (isActive && id !== sourceStepId) {
                    newSteps[id] = {
                        ...newSteps[id],
                        components: { ...sourceComp } // Shallow copy serves well here
                    };
                }
            });
            return { ...prev, steps: newSteps };
        });
    };

    const updateProductQty = (stepId: number, type: ExtendedSlotType, idx: number, newQty: number) => {
        if (newQty < 1) return; // Use remove instead
        setDesign(prev => {
            // For singlular items (CT, Relay, One-off SVC), we just update qty if it exists
            if (type === "CURRENT_TRANSFORMER" && prev.currentTransformer) {
                return { ...prev, currentTransformer: { ...prev.currentTransformer, qty: newQty } };
            }
            if (type === "RELAY" && prev.relay.selectedProduct) {
                return { ...prev, relay: { ...prev.relay, selectedProduct: { ...prev.relay.selectedProduct, qty: newQty } } };
            }
            // For lists (Steps)
            const step = prev.steps[stepId];
            if (!step) return prev;

            const compType = type as ComponentSlotType;
            const list = step.components[compType];
            if (!list || !list[idx]) return prev;

            const newList = [...list];
            newList[idx] = { ...newList[idx], qty: newQty };

            return {
                ...prev,
                steps: {
                    ...prev.steps,
                    [stepId]: { ...step, components: { ...step.components, [compType]: newList } }
                }
            };
        });
    };

    const removeProductAtIndex = (stepId: number, type: ExtendedSlotType, idx: number) => {
        setDesign(prev => {
            // Singular items - just remove completely
            if (type === "CURRENT_TRANSFORMER") return { ...prev, currentTransformer: undefined };
            if (type === "RELAY") return { ...prev, relay: { ...prev.relay, selectedProduct: undefined } };
            if (type === "SVC_DRIVER") {
                const newDriver = prev.svc.driver.filter((_, i) => i !== idx);
                return { ...prev, svc: { ...prev.svc, driver: newDriver } };
            }
            if (type === "SVC_FUSE") {
                const newFuse = prev.svc.fuse.filter((_, i) => i !== idx);
                return { ...prev, svc: { ...prev.svc, fuse: newFuse } };
            }
            if (type.startsWith("SVC_SHUNT_")) {
                const sIdx = parseInt(type.split("_")[2]) - 1;
                const newShunts = [...prev.svc.shunts];
                newShunts[sIdx] = newShunts[sIdx].filter((_, i) => i !== idx);
                return { ...prev, svc: { ...prev.svc, shunts: newShunts } };
            }

            // List items
            const step = prev.steps[stepId];
            if (!step) return prev;

            const compType = type as ComponentSlotType;
            const list = step.components[compType];
            if (!list) return prev;

            const newList = list.filter((_, i) => i !== idx);

            return {
                ...prev,
                steps: {
                    ...prev.steps,
                    [stepId]: { ...step, components: { ...step.components, [compType]: newList } }
                }
            };
        });
    };

    const updateUsedSteps = (count: number) => {
        setDesign(prev => {
            const newActive = Array(prev.relay.maxSteps).fill(false);
            for (let i = 0; i < count; i++) {
                newActive[i] = true;
            }
            return {
                ...prev,
                relay: { ...prev.relay, activeSteps: newActive }
            };
        });
    };

    // --- Metrics ---
    const metrics = useMemo(() => {
        let totalKvar = 0;
        let totalPrice = 0;
        let activeStepsCount = 0;

        // Steps
        Object.values(design.steps).forEach(step => {
            if (!design.relay.activeSteps[step.id - 1]) return;
            activeStepsCount++;

            if (step.components.CAP) {
                step.components.CAP.forEach(item => totalKvar += (item.product.kvar || 0) * item.qty);
            } else if (step.components.SHUNT) {
                step.components.SHUNT.forEach(item => totalKvar -= (item.product.kvar || 0) * item.qty);
            }

            Object.values(step.components).forEach(list => {
                if (Array.isArray(list)) list.forEach(c => totalPrice += c.product.listPrice * c.qty);
            });

            // Only count explicit array components (CAP, SHUNT, SWITCH, NH, FILTER)
            // Logic above naturally covers HARMONIC_FILTER if it's in step.components
        });

        // CT
        if (design.currentTransformer) {
            totalPrice += design.currentTransformer.product.listPrice * design.currentTransformer.qty;
        }

        // Relay
        if (design.relay.selectedProduct) {
            totalPrice += design.relay.selectedProduct.product.listPrice * design.relay.selectedProduct.qty;
        }

        // SVC
        design.svc.driver.forEach(d => {
            totalPrice += d.product.listPrice * d.qty;
        });
        design.svc.fuse.forEach(f => {
            totalPrice += f.product.listPrice * f.qty;
        });
        design.svc.shunts.forEach(phaseList => {
            phaseList.forEach(s => {
                totalPrice += s.product.listPrice * s.qty;
                totalKvar -= (s.product.kvar || 0) * s.qty;
            });
        });

        return { totalKvar, totalPrice, activeStepsCount };
    }, [design]);

    // --- Handlers ---
    const handleToQuote = async () => {
        if (metrics.totalPrice === 0) return alert("BOM boş. Lütfen ürün seçiniz.");
        const name = prompt("Teklif Adı:", "TEK HAT TASARIM") || "";
        if (!name) return;

        // Generate BOM List
        const bomMap = new Map<string, any>();

        const addToBom = (prod: CompProduct, qty: number) => {
            const key = prod.orderCode;
            if (bomMap.has(key)) {
                bomMap.get(key).qty += qty;
            } else {
                bomMap.set(key, {
                    productCode: prod.productCode,
                    name: prod.name,
                    qty: qty,
                    price: prod.listPrice,
                    currency: prod.currency || "USD"
                });
            }
        };

        // 0. CT
        if (design.currentTransformer) addToBom(design.currentTransformer.product, design.currentTransformer.qty);

        // 1. Relay
        if (design.relay.selectedProduct) addToBom(design.relay.selectedProduct.product, design.relay.selectedProduct.qty);

        // 2. SVC
        design.svc.driver.forEach(d => addToBom(d.product, d.qty));
        design.svc.fuse.forEach(f => addToBom(f.product, f.qty));
        design.svc.shunts.forEach(phaseList => {
            phaseList.forEach(s => addToBom(s.product, s.qty));
        });

        // 3. Steps
        Object.values(design.steps).forEach(step => {
            if (!design.relay.activeSteps[step.id - 1]) return;
            Object.values(step.components).forEach(list => {
                if (Array.isArray(list)) list.forEach(c => addToBom(c.product, c.qty));
            });
        });

        const bomList = Array.from(bomMap.values());

        setLoadingMsg("Teklife dönüştürülüyor...");
        try {
            const bomLines = bomList.map(item => ({
                id: Math.random().toString().substr(2, 9),
                orderCode: item.productCode,
                productCode: item.productCode,
                name: item.name,
                type: "OTHER",
                qty: item.qty,
                price: item.price,
                currency: item.currency,
                unitKvar: 0,
                voltage: 0
            }));

            const res = await convertBomToQuote(bomLines, session, { name, city: "", district: "" });
            if (res?.ok) {
                alert("Teklif oluşturuldu!");
                router.push(`/quotes/${res.id}`);
            } else {
                alert("Hata: " + res?.message);
            }

        } catch (e: any) {
            alert("Hata: " + e.message);
        } finally {
            setLoadingMsg(null);
        }
    };


    if (loading && !loadingMsg) return null;

    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8f9fa" }}>
            <LoadingOverlay message={loadingMsg} />

            {/* TOP BAR */}
            <TopBar
                metrics={metrics}
                onViewBom={() => setShowBomModal(true)}
                onToQuote={handleToQuote}
                design={design}
                session={session}
            />

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

                {/* MOBILE OVERLAY */}
                {isMobileSidebarOpen && (
                    <div className="mobile-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
                )}

                {/* LEFT: SYSTEM PARAMS (SIDEBAR) */}
                <div className={`sidebar-panel ${isMobileSidebarOpen ? "open" : ""}`}>
                    <div className="sidebar-header-mobile">
                        <h3 className="outfit" style={{ margin: 0 }}>Ayarlar</h3>
                        <button onClick={() => setIsMobileSidebarOpen(false)} style={{ background: "none", border: "none", fontSize: "1.5rem" }}>✕</button>
                    </div>

                    <SystemParamsPanel
                        system={design.system}
                        relay={design.relay}
                        onUpdateSystem={updateSystemParams}
                        onUpdateRelaySize={updateRelaySize}
                        onUpdateUsedSteps={updateUsedSteps}
                    />
                    <div style={{ marginTop: "2rem", padding: "1rem", background: "#eef2f5", borderRadius: "8px", fontSize: "0.85rem" }}>
                        <strong>Nasıl Kullanılır?</strong>
                        <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem", color: "#666" }}>
                            <li>(O) Akım Trafosu, Röle, SVC ve Kademelere tıklayarak ürün ekleyin/çýkarın.</li>
                        </ul>
                    </div>
                </div>

                {/* CENTER: DIAGRAM */}
                <div className="diagram-area">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h2 className="outfit" style={{ margin: 0 }}>Tek Hat Şeması</h2>

                        {/* Mobile Toggle Button */}
                        <button
                            className="mobile-toggle-btn"
                            onClick={() => setIsMobileSidebarOpen(true)}
                        >
                            ⚙️ Ayarlar
                        </button>
                    </div>

                    <DiagramContainer
                        design={design}
                        onSlotClick={(stepId, type) => {
                            const items = getItemsForSlot(stepId, type);
                            if (items.length === 0) {
                                // Empty -> Open Drawer
                                setSelectedSlot({ stepId, type });
                                setDrawerOpen(true);
                            } else {
                                // Full -> Open Detail
                                setDetailSlot({ stepId, type });
                                setDetailModalOpen(true);
                            }
                        }}
                    />
                </div>
            </div>

            {/* PRODUCT SELECTION DRAWER */}
            {drawerOpen && selectedSlot && productIndex && (
                <ProductSelectionDrawer
                    slot={selectedSlot}
                    systemVoltage={design.system.gridVoltage}
                    index={productIndex}
                    onSelect={(p, qty) => selectProductForSlot(selectedSlot.stepId, selectedSlot.type, p, qty)}
                    onClose={() => setDrawerOpen(false)}
                />
            )
            }

            {/* STEP DETAIL MODAL */}
            {
                detailModalOpen && detailSlot && (
                    <StepDetailModal
                        title={`${detailSlot.type === "RELAY" ? "Röle" : detailSlot.type === "SVC_DRIVER" ? "Sürücü" : `Kademe ${detailSlot.stepId} - ${detailSlot.type}`}`}
                        items={getItemsForSlot(detailSlot.stepId, detailSlot.type)}
                        onRemove={(idx) => removeProductAtIndex(detailSlot.stepId, detailSlot.type, idx)}
                        onAdd={openProductDrawer}
                        onClose={closeDetailModal}
                    />
                )
            }

            {/* BOM MODAL */}
            {
                showBomModal && (
                    <BomModal
                        design={design}
                        onClose={() => setShowBomModal(false)}
                    />
                )
            }

            <style jsx>{`
                .sidebar-panel {
                    width: 300px;
                    border-right: 1px solid #dee2e6;
                    background: white;
                    padding: 1.5rem;
                    overflow-y: auto;
                    height: 100%;
                }
                .diagram-area {
                    flex: 1;
                    padding: 2rem;
                    overflow-y: auto;
                    position: relative;
                }
                .mobile-toggle-btn {
                    display: none;
                }
                .sidebar-header-mobile {
                    display: none;
                }

                @media (max-width: 768px) {
                    .sidebar-panel {
                        position: fixed;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        z-index: 100;
                        width: 85%;
                        max-width: 320px;
                        transform: translateX(-100%);
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        box-shadow: 0 0 20px rgba(0,0,0,0.2);
                    }
                    .sidebar-panel.open {
                        transform: translateX(0);
                    }
                    .sidebar-header-mobile {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1.5rem;
                        padding-bottom: 1rem;
                        border-bottom: 1px solid #eee;
                    }
                    
                    .mobile-toggle-btn {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background: white;
                        border: 1px solid #ddd;
                        padding: 8px 12px;
                        border-radius: 8px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        color: #555;
                        cursor: pointer;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    }

                    .diagram-area {
                        padding: 1rem;
                    }
                    
                    .mobile-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.4);
                        z-index: 90;
                        backdrop-filter: blur(2px);
                    }
                }
            `}</style>
        </div >
    );
}
