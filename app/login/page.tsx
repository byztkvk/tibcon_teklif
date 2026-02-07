"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { listUsers, type SheetUser } from "@/lib/sheets";

// Basit email normalize (lib inside if we want it isolated, but it's in sheets.ts too)
function normalizeEmail(email: string) {
    const map: Record<string, string> = {
        ç: "c", Ç: "c",
        ğ: "g", Ğ: "g",
        ı: "i", İ: "i",
        ö: "o", Ö: "o",
        ş: "s", Ş: "s",
        ü: "u", Ü: "u",
    };
    return (email || "")
        .trim()
        .toLowerCase()
        .split("")
        .map((ch) => map[ch] ?? ch)
        .join("");
}

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    function addLog(msg: string) {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
        console.log(msg);
    }

    async function handleLogin() {
        addLog("Login initialized...");
        const emailN = normalizeEmail(email);
        const passN = String(password ?? "").trim();

        if (!emailN || !passN) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }

        setLoading(true);
        try {
            const res = await listUsers();
            if (!res?.users) {
                alert("Sistem hatası: Kullanıcı listesi alınamadı.");
                setLoading(false);
                return;
            }

            const users = res.users;
            const u = users.find((x: any) => normalizeEmail(x.email) === emailN);

            if (!u || String(u.password ?? "").trim() !== passN) {
                alert("E-posta veya şifre hatalı.");
                setLoading(false);
                return;
            }

            const session = {
                email: u.email,
                fullName: u.displayName,
                role: u.role,
                region: u.region,
                managerEmail: u.managerEmail,
            };

            await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(session),
            });

            localStorage.setItem("tibcon_session", JSON.stringify(session));
            localStorage.setItem("tibcon_users", JSON.stringify(users));
            window.location.href = "/";
        } catch (e: any) {
            alert("Giriş sırasında bir hata oluştu: " + (e.message || e));
            setLoading(false);
        }
    }

    return (
        <div style={containerStyle}>
            <div className="premium-card" style={cardStyle}>
                <div style={logoContainerStyle}>
                    <img
                        src="/logo.png"
                        alt="TIBCON"
                        style={logoStyle}
                    />
                </div>

                <div style={headerStyle}>
                    <h2 className="outfit" style={{ fontSize: "1.5rem", fontWeight: 700, margin: "1rem 0 0.5rem" }}>
                        TİBCON TEKLİF MODÜLÜ
                    </h2>
                    <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                        Devam etmek için giriş yapın
                    </p>
                </div>

                <div style={formStyle}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>E-posta</label>
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={inputStyle}
                            className="tibcon-input"
                            placeholder="admin@tibcon.com.tr"
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Şifre</label>
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={inputStyle}
                            className="tibcon-input"
                            placeholder="••••••"
                            type="password"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleLogin}
                        disabled={loading}
                        className="tibcon-btn tibcon-btn-primary"
                        style={{ width: "100%", marginTop: "1rem" }}
                    >
                        {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                    </button>

                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        style={debugToggleStyle}
                    >
                        {showLogs ? "Logları Gizle" : "Hata mı var?"}
                    </button>

                    {showLogs && (
                        <div style={logContainerStyle}>
                            <div style={{ color: "var(--tibcon-red)", fontWeight: 700, marginBottom: 4 }}>DEBUG LOGS</div>
                            {logs.map((l, i) => <div key={i} style={{ marginBottom: 2 }}>{l}</div>)}
                        </div>
                    )}
                </div>

                <div style={footerStyle}>
                    &copy; {new Date().getFullYear()} TIBCON Energy Technologies
                </div>
            </div>
        </div>
    );
}

// Modern Styles
const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at top right, #1e2124 0%, #000 100%)",
    padding: "1.5rem",
};

const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "440px",
    background: "rgba(255, 255, 255, 0.98)",
    padding: "3rem 2.5rem",
    textAlign: "center" as const,
};

const logoContainerStyle: React.CSSProperties = {
    marginBottom: "1rem",
    display: "flex",
    justifyContent: "center",
};

const logoStyle: React.CSSProperties = {
    height: "80px",
    width: "auto",
};

const headerStyle: React.CSSProperties = {
    marginBottom: "2.5rem",
};

const formStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
};

const inputGroupStyle: React.CSSProperties = {
    textAlign: "left" as const,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
};

const labelStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--tibcon-anth)",
    marginLeft: "4px",
};

const inputStyle: React.CSSProperties = {
    padding: "0.875rem 1rem",
    borderRadius: "12px",
    border: "2px solid var(--tibcon-gray)",
    fontSize: "1rem",
    outline: "none",
    transition: "all 0.2s",
};

const debugToggleStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "var(--tibcon-gray-dark)",
    fontSize: "0.75rem",
    marginTop: "1rem",
    cursor: "pointer",
    textDecoration: "underline",
};

const logContainerStyle: React.CSSProperties = {
    marginTop: "1.5rem",
    padding: "1rem",
    background: "#1a1a1a",
    color: "#00ff00",
    fontSize: "0.7rem",
    borderRadius: "12px",
    textAlign: "left" as const,
    maxHeight: "150px",
    overflowY: "auto",
    fontFamily: "monospace",
};

const footerStyle: React.CSSProperties = {
    marginTop: "2.5rem",
    fontSize: "0.8rem",
    color: "var(--tibcon-gray-dark)",
};
