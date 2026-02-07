import React from "react";
import { CompProduct } from "@/lib/compensation/types";

interface Props {
    title: string;
    items: { product: CompProduct; qty: number }[];
    onRemove: (idx: number) => void;
    onAdd: () => void;
    onClose: () => void;
}

export function StepDetailModal({ title, items, onRemove, onAdd, onClose }: Props) {
    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex",
            alignItems: "center", justifyContent: "center"
        }} onClick={onClose}>
            <div style={{
                background: "white", borderRadius: "8px", width: "500px", maxWidth: "90%",
                maxHeight: "80vh", display: "flex", flexDirection: "column",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: "15px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{title}</h3>
                    <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
                </div>

                {/* List */}
                <div style={{ padding: "15px", overflowY: "auto", flex: 1 }}>
                    {items.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#999", padding: "20px" }}>
                            Henüz ürün eklenmemiş.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {items.map((item, idx) => (
                                <div key={idx} style={{
                                    border: "1px solid #eee", borderRadius: "6px", padding: "10px",
                                    display: "flex", alignItems: "center", justifyContent: "space-between"
                                }}>
                                    <div>
                                        <div style={{ fontWeight: "bold", color: "#333" }}>{item.product.productCode}</div>
                                        <div style={{ fontSize: "0.85rem", color: "#666" }}>{item.product.name}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ fontWeight: "bold", background: "#f0f0f0", padding: "2px 8px", borderRadius: "4px" }}>
                                            x{item.qty}
                                        </div>
                                        <button
                                            onClick={() => onRemove(idx)}
                                            style={{ color: "red", border: "1px solid red", background: "white", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "0.8rem" }}
                                        >
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "15px", borderTop: "1px solid #eee", background: "#f9f9f9", borderRadius: "0 0 8px 8px", textAlign: "right" }}>
                    <button
                        onClick={() => { onClose(); onAdd(); }}
                        style={{
                            background: "#27ae60", color: "white", border: "none",
                            padding: "10px 20px", borderRadius: "6px", fontWeight: "bold",
                            cursor: "pointer"
                        }}
                    >
                        + Ürün Ekle
                    </button>
                </div>
            </div>
        </div>
    );
}
