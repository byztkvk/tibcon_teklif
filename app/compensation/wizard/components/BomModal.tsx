import { useMemo } from "react";
import { DesignState } from "@/lib/compensation/wizard-types";

interface Props {
    design: DesignState;
    onClose: () => void;
}

export function BomModal({ design, onClose }: Props) {
    const bom = useMemo(() => {
        const map = new Map<string, any>();

        Object.values(design.steps).forEach(step => {
            if (!design.relay.activeSteps[step.id - 1]) return;

            Object.values(step.components).forEach((compList: any) => {
                if (!Array.isArray(compList)) return;

                compList.forEach(c => {
                    if (!c || !c.product) return;

                    const key = c.product.orderCode;
                    if (map.has(key)) {
                        const exist = map.get(key);
                        exist.qty += c.qty;
                        exist.steps.push(step.id);
                    } else {
                        map.set(key, {
                            productCode: c.product.productCode,
                            name: c.product.name,
                            type: c.product.type,
                            qty: c.qty,
                            price: c.product.listPrice,
                            currency: c.product.currency || "USD",
                            steps: [step.id]
                        });
                    }
                });
            });
        });

        return Array.from(map.values()).sort((a, b) => a.type.localeCompare(b.type));
    }, [design]);

    const total = bom.reduce((acc, item) => acc + (item.price * item.qty), 0);

    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
            <div style={{ background: "white", borderRadius: "16px", width: "800px", maxWidth: "90%", maxHeight: "90%", display: "flex", flexDirection: "column", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
                <div style={{ padding: "1.5rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 className="outfit" style={{ margin: 0 }}>Malzeme Listesi (BOM)</h3>
                    <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                        <thead>
                            <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                                <th style={{ padding: "10px", borderBottom: "2px solid #eee" }}>Tip</th>
                                <th style={{ padding: "10px", borderBottom: "2px solid #eee" }}>Kod</th>
                                <th style={{ padding: "10px", borderBottom: "2px solid #eee" }}>Ürün Adı</th>
                                <th style={{ padding: "10px", borderBottom: "2px solid #eee" }}>Miktar</th>
                                <th style={{ padding: "10px", borderBottom: "2px solid #eee" }}>Birim Fiyat</th>
                                <th style={{ padding: "10px", borderBottom: "2px solid #eee", textAlign: "right" }}>Toplam</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bom.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#999" }}>Henüz ürün seçilmedi.</td></tr>
                            ) : (
                                bom.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "10px" }}><span style={{ fontSize: "0.75rem", background: "#eee", padding: "2px 6px", borderRadius: "4px" }}>{item.type}</span></td>
                                        <td style={{ padding: "10px", fontWeight: 600 }}>{item.productCode}</td>
                                        <td style={{ padding: "10px" }}>{item.name}</td>
                                        <td style={{ padding: "10px" }}>{item.qty}</td>
                                        <td style={{ padding: "10px" }}>{item.price.toLocaleString()} {item.currency}</td>
                                        <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>{(item.price * item.qty).toLocaleString()} {item.currency}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: "1.5rem", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1rem", background: "#f8f9fa", borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
                    <div style={{ fontSize: "1.1rem" }}>
                        Genel Toplam: <strong style={{ color: "var(--tibcon-red)", fontSize: "1.4rem" }}>{total.toLocaleString()} $</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}
