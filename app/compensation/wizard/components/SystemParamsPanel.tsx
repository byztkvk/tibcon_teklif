import { WizardSystemParams } from "@/lib/compensation/wizard-types";

// Types
interface Props {
    system: WizardSystemParams;
    relay: { maxSteps: number; activeSteps: boolean[] };
    onUpdateSystem: (params: Partial<WizardSystemParams>) => void;
    onUpdateRelaySize: (size: number) => void;
    onUpdateUsedSteps: (count: number) => void;
}

export function SystemParamsPanel({ system, relay, onUpdateSystem, onUpdateRelaySize, onUpdateUsedSteps }: Props) {
    const usedCount = relay.activeSteps.filter(Boolean).length;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 className="outfit" style={{ margin: 0 }}>Sistem Ayarları</h3>

            <div style={inputGroup}>
                <label style={labelStyle}>Faz Tipi</label>
                <select
                    value={system.phaseType}
                    onChange={e => onUpdateSystem({ phaseType: e.target.value as any })}
                    style={inputStyle}
                >
                    <option value="TRIFAZE">Trifaze</option>
                    <option value="MONOFAZE">Monofaze</option>
                </select>
            </div>

            <div style={inputGroup}>
                <label style={labelStyle}>Şebeke Voltajı (V)</label>
                <select
                    value={system.gridVoltage}
                    onChange={e => onUpdateSystem({ gridVoltage: Number(e.target.value) })}
                    style={inputStyle}
                >
                    {[230, 400, 415, 440, 480, 525, 690].map(v => (
                        <option key={v} value={v}>{v} V</option>
                    ))}
                </select>
            </div>

            {/* Relay Size */}
            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#34495e" }}>Röle Kademe Sayısı</label>
                <select
                    value={relay.maxSteps}
                    onChange={e => onUpdateRelaySize(parseInt(e.target.value))}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                >
                    <option value={12}>12 Kademe</option>
                    <option value={18}>18 Kademe</option>
                    <option value={24}>24 Kademe</option>
                </select>
            </div>

            {/* HARMONIC FILTER TOGGLE */}
            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "#e8f6f3", borderRadius: "6px", border: "1px solid #a2d9ce" }}>
                <input
                    type="checkbox"
                    checked={system.harmonicFilter}
                    onChange={(e) => onUpdateSystem({ harmonicFilter: e.target.checked })}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600, color: "#16a085" }}>Harmonik Filtreli</span>
                    <span style={{ fontSize: "0.75rem", color: "#666" }}>Aktif edilirse filtre yuvaları açılır.</span>
                </div>
            </div>

            {/* Used Steps (Quick Set) */}
            <div style={inputGroup}>
                <label style={labelStyle}>Kullanılacak Kademe Sayısı</label>
                <select
                    value={usedCount}
                    onChange={e => onUpdateUsedSteps(Number(e.target.value))}
                    style={inputStyle}
                >
                    {Array.from({ length: relay.maxSteps }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n} Kademe</option>
                    ))}
                </select>
            </div>

            <div style={{ fontSize: "0.8rem", color: "#666", lineHeight: 1.5 }}>
                <strong style={{ color: "#333" }}>Not:</strong> "Kullanılacak Kademe" sayısını seçtiğinizde, sistem otomatik olarak ilk N kademeyi aktif eder, diğerlerini kapatır. Daha sonra manuel olarak da açıp kapatabilirsiniz.
            </div>
        </div>
    );
}

const inputGroup = { display: "flex", flexDirection: "column" as const, gap: "6px" };
const labelStyle = { fontSize: "0.85rem", fontWeight: 600, color: "#444" };
const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", fontSize: "0.95rem" };
