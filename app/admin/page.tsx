"use client";

import Link from "next/link";
import React from "react";

export default function AdminDashboard() {
    return (
        <div className="page-container" style={{ animation: "fadeIn 0.5s ease" }}>
            <h1 className="title-xl outfit" style={{ marginBottom: "2.5rem", color: "var(--tibcon-anth)", letterSpacing: "-1px" }}>
                Yönetim Paneli
            </h1>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "4rem" }}>
                <Link href="/admin/regions" style={{ textDecoration: "none" }}>
                    <div className="premium-card" style={cardHoverStyle}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>🗺️</div>
                        <h3 className="title-lg outfit" style={{ marginBottom: "0.5rem", color: "var(--tibcon-black)" }}>Bölgeler ve Şehirler</h3>
                        <p className="text-muted" style={{ lineHeight: "1.6", fontSize: "0.95rem" }}>Satış bölgelerini tanımlayın ve illere göre atamalarını detaylı olarak gerçekleştirin.</p>
                    </div>
                </Link>

                <Link href="/admin/users" style={{ textDecoration: "none" }}>
                    <div className="premium-card" style={cardHoverStyle}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>👥</div>
                        <h3 className="title-lg outfit" style={{ marginBottom: "0.5rem", color: "var(--tibcon-black)" }}>Kullanıcılar</h3>
                        <p className="text-muted" style={{ lineHeight: "1.6", fontSize: "0.95rem" }}>Satış temsilcileri, yöneticiler, sisteme giriş izinleri ve bölgesel personel yetkilendirmesi.</p>
                    </div>
                </Link>

                <Link href="/admin/salesPoints" style={{ textDecoration: "none" }}>
                    <div className="premium-card" style={cardHoverStyle}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>🏢</div>
                        <h3 className="title-lg outfit" style={{ marginBottom: "0.5rem", color: "var(--tibcon-black)" }}>Satış Noktaları</h3>
                        <p className="text-muted" style={{ lineHeight: "1.6", fontSize: "0.95rem" }}>Sahadaki tüm satış noktalarının, yöneticilerin ve bayilerin toplu sistem yönetimi.</p>
                    </div>
                </Link>

                <Link href="/admin/salesPointGroups" style={{ textDecoration: "none" }}>
                    <div className="premium-card" style={cardHoverStyle}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>🏷️</div>
                        <h3 className="title-lg outfit" style={{ marginBottom: "0.5rem", color: "var(--tibcon-black)" }}>Satış Noktası Grupları</h3>
                        <p className="text-muted" style={{ lineHeight: "1.6", fontSize: "0.95rem" }}>Satış noktaları için kullanılacak olan zorunlu grupları tanımlayın.</p>
                    </div>
                </Link>

                <Link href="/admin/visits" style={{ textDecoration: "none" }}>
                    <div className="premium-card" style={cardHoverStyle}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>🚗</div>
                        <h3 className="title-lg outfit" style={{ marginBottom: "0.5rem", color: "var(--tibcon-black)" }}>Ziyaret Kayıtları</h3>
                        <p className="text-muted" style={{ lineHeight: "1.6", fontSize: "0.95rem" }}>Geçmiş ziyaret kayıtlarını toplu olarak içeri aktarın ve yönetin.</p>
                    </div>
                </Link>

                <Link href="/admin/settings" style={{ textDecoration: "none" }}>
                    <div className="premium-card" style={cardHoverStyle}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>⚙️</div>
                        <h3 className="title-lg outfit" style={{ marginBottom: "0.5rem", color: "var(--tibcon-black)" }}>Sistem Ayarları</h3>
                        <p className="text-muted" style={{ lineHeight: "1.6", fontSize: "0.95rem" }}>Aylık ziyaret hedefleri ve genel sistem parametrelerini yapılandırın.</p>
                    </div>
                </Link>
            </div>

            <div style={{
                padding: "2rem",
                backgroundColor: "rgba(0,0,0,0.02)",
                border: "1px dashed rgba(0,0,0,0.1)",
                borderRadius: "16px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                    <h4 className="title-lg outfit" style={{ fontSize: "1.25rem", color: "var(--tibcon-anth)", margin: 0 }}>Sistem ve Kurulum Araçları</h4>
                    <span style={{ fontSize: "0.75rem", background: "rgba(227, 6, 19, 0.1)", color: "var(--tibcon-red)", padding: "4px 10px", borderRadius: "100px", fontWeight: "700" }}>Sadece Uzmanlar İçin</span>
                </div>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                        onClick={() => {
                            if (confirm("Tüm 81 il ve 3 bölge baştan oluşturulacaktır. Emin misiniz?")) {
                                fetch("/api/admin/seed?force=true", { method: "POST" })
                                    .then(r => r.json()).then(res => alert(res.message || res.error));
                            }
                        }}
                        className="tibcon-btn tibcon-btn-outline"
                        style={{ fontSize: "0.85rem", padding: "0.6rem 1.25rem", borderRadius: "8px", background: "white" }}
                    >
                        ⚡ 1. Adım: İl / Bölge Tohumlamasını Başlat
                    </button>

                    <button
                        onClick={() => {
                            if (confirm("Eski teklif verilerindeki sehirler eşleştirilecektir. Emin misiniz?")) {
                                fetch("/api/admin/migrate-data", { method: "POST" })
                                    .then(r => r.json()).then(res => alert(res.message || res.error));
                            }
                        }}
                        className="tibcon-btn tibcon-btn-outline"
                        style={{ fontSize: "0.85rem", padding: "0.6rem 1.25rem", borderRadius: "8px", background: "white" }}
                    >
                        🔄 2. Adım: Eski Verileri Sisteme Uyarla
                    </button>

                    <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0, marginLeft: "auto" }}>Bu araçları yalnızca ilk sistem kurulumunda kullanın.</p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
}

const cardHoverStyle: React.CSSProperties = {
    height: "100%",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
};
