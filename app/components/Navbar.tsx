"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
            localStorage.removeItem("tibcon_session");
            window.location.href = "/login";
        }
    };

    if (pathname === "/login") return null;

    return (
        <nav style={navStyle}>
            <div style={containerStyle}>
                <div
                    style={brandStyle}
                    onClick={() => router.push("/")}
                >
                    <img
                        src="/logo.png"
                        alt="TIBCON"
                        style={{ height: "45px" }}
                    />
                    <span className="outfit hide-text-mobile" style={{ fontSize: "1.1rem", fontWeight: 800 }}>TİBCON TEKLİF MODÜLÜ</span>
                </div>

                <div style={menuStyle}>
                    <button
                        onClick={() => router.push("/")}
                        className="tibcon-btn tibcon-btn-outline nav-btn-mobile"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                        <span>🏠</span> <span className="hide-text-mobile">Ana Sayfa</span>
                    </button>

                    <button
                        onClick={() => router.push("/dashboard")}
                        className="tibcon-btn tibcon-btn-outline nav-btn-mobile"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                        <span>📉</span> <span className="hide-text-mobile">Dashboard</span>
                    </button>

                    <button
                        onClick={() => router.push("/map")}
                        className="tibcon-btn tibcon-btn-outline nav-btn-mobile"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                        <span>🗺️</span> <span className="hide-text-mobile">Bölgem</span>
                    </button>

                    <button
                        onClick={() => router.push("/agenda")}
                        className="tibcon-btn tibcon-btn-outline nav-btn-mobile"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                        <span>📅</span> <span className="hide-text-mobile">Ajanda</span>
                    </button>

                    <button
                        onClick={() => router.push("/compensation")}
                        className="tibcon-btn tibcon-btn-outline nav-btn-mobile"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                        <span>⚡</span> <span className="hide-text-mobile">Kompanzasyon</span>
                    </button>

                    {/* MANAGER REPORTS LINK */}
                    {["region_manager", "admin"].includes(JSON.parse(localStorage.getItem("tibcon_session") || "{}")?.role) && (
                        <button
                            onClick={() => router.push("/reports")}
                            className="tibcon-btn tibcon-btn-outline nav-btn-mobile"
                            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                        >
                            <span>📊</span> <span className="hide-text-mobile">Raporlar</span>
                        </button>
                    )}

                    {/* ADMIN LINK */}
                    {JSON.parse(localStorage.getItem("tibcon_session") || "{}")?.role === "admin" && (
                        <button
                            onClick={() => router.push("/admin")}
                            className="tibcon-btn tibcon-btn-outline nav-btn-mobile"
                            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", color: "var(--tibcon-black)", borderColor: "var(--tibcon-black)" }}
                        >
                            <span>⚙️</span> <span className="hide-text-mobile">Yönetim / Admin</span>
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        className="tibcon-btn nav-btn-mobile"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", color: "var(--tibcon-red)", borderColor: "var(--tibcon-red)", background: "transparent" }}
                    >
                        <span>🚪</span> <span className="hide-text-mobile">Çıkış Yap</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}

const navStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--tibcon-border)",
    color: "var(--tibcon-black)",
    height: "72px",
    display: "flex",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 1000,
};

const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0 1rem", // Reduced padding for mobile
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden" // Prevent container expansion
};

const brandStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    userSelect: "none",
    flexShrink: 0 // Prevent logo shrinking
};

const menuStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
    overflowX: "auto", // Allow scrolling for buttons
    paddingBottom: "4px", // Space for scrollbar
    marginLeft: "1rem",
    scrollbarWidth: "none", // Hide scrollbar specifically
    msOverflowStyle: "none"
};
