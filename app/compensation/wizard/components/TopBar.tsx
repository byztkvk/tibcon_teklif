export function TopBar({ metrics, onViewBom, onToQuote }: any) {
    return (
        <div style={{ height: "70px", background: "white", borderBottom: "1px solid #dee2e6", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2rem", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <h2 className="outfit" style={{ margin: 0, fontSize: "1.2rem", color: "#333" }}>Tek Hat Tasarımcısı</h2>
                <span style={{ fontSize: "0.8rem", background: "#e9ecef", padding: "4px 8px", borderRadius: "4px", color: "#555" }}>BETA</span>
            </div>

            <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
                <div style={metricItem}>
                    <span style={metricLabel}>AKTİF KADEME</span>
                    <span style={metricVal}>{metrics.activeStepsCount}</span>
                </div>
                <div style={metricItem}>
                    <span style={metricLabel}>BOM TUTARI</span>
                    <span style={{ ...metricVal, color: "var(--tibcon-red)" }}>{metrics.totalPrice.toLocaleString()} $</span>
                </div>

                <div style={{ height: "40px", width: "1px", background: "#dee2e6", margin: "0 10px" }}></div>

                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="tibcon-btn tibcon-btn-outline" onClick={onViewBom}>BOM Listesi</button>
                    <button className="tibcon-btn tibcon-btn-primary" onClick={onToQuote}>Teklife Dönüştür</button>
                </div>
            </div>
        </div>
    );
}

const metricItem = { display: "flex", flexDirection: "column" as const, alignItems: "flex-end" };
const metricLabel = { fontSize: "0.7rem", fontWeight: 700, color: "#999", letterSpacing: "0.5px" };
const metricVal = { fontSize: "1.2rem", fontWeight: 800, fontFamily: "var(--font-outfit)", color: "#333" };
