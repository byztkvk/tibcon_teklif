"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "sales" | "region_manager" | "quote_manager" | "admin" | "";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ email: string; fullName: string; role: Role; region: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tibcon_session");
      const s = raw ? JSON.parse(raw) : null;
      setSession(s);
    } catch (e) {
      console.error("Session parse error:", e);
      localStorage.removeItem("tibcon_session");
      setSession(null);
    }
    setLoading(false);
  }, []);

  if (loading || !session) return null;

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("tr-TR");
    } catch {
      return iso;
    }
  };

  const isAdmin = session.role === "admin";

  const menuItems = [
    { title: "Teklifler", desc: "Tüm teklifleri görüntüle ve yönet.", icon: "📄", path: "/quotes", color: "white" },
    { title: "Yeni Teklif", desc: "Hızlıca yeni bir teklif oluştur.", icon: "➕", path: "/quotes/new", color: "red" },
    { title: "Ziyaret Girişi", desc: "Yeni bir ziyaret kaydı oluştur.", icon: "🚗", path: "/visits/new", color: "red" },
    { title: "Ziyaretlerim", desc: "Geçmiş ziyaretlerinizi inceleyin.", icon: "📋", path: "/visits", color: "white" },
    { title: "Ziyaret Planlama", desc: "Gelecek ziyaretleri planlayın.", icon: "📅", path: "/visits/planning", color: "white" },
    { title: "Satış Noktaları", desc: "Müşteri ve şubeleri görüntüle.", icon: "🏠", path: "/visits/points", color: "white" },
    { title: "Kompanzasyon", desc: "Otomatik ürün seçimi ve hesaplama.", icon: "⚡", path: "/compensation", color: "white" },
    { title: "Tek Hat Tasarımcısı", desc: "Manuel pano tasarımı ve BOM.", icon: "✏️", path: "/compensation/wizard", color: "white" },
  ];

  if (isAdmin) {
    menuItems.push(
      { title: "Kullanıcılar", desc: "Personel ve yetki yönetimi.", icon: "👥", path: "/users", color: "white" },
      { title: "Ayarlar", desc: "Sistem iskontoları ve bölgeler.", icon: "⚙️", path: "/settings", color: "white" }
    );
  }

  return (
    <div className="page-container">
      <div style={headerSectionStyle}>
        <div style={welcomeBoxStyle}>
          <h1 className="title-xl outfit" style={{ marginBottom: "0.5rem" }}>
            Hoş Geldiniz, <span style={{ color: "var(--tibcon-red)" }}>{session.fullName.split(' ')[0]}</span>
          </h1>
          <p className="text-muted" style={{ fontSize: "1.1rem" }}>
            Tibcon Enerji Teknolojileri Teklif Yönetim Paneli
          </p>
          <div style={badgeContainerStyle}>
            <span className="badge" style={{ background: "var(--tibcon-black)", color: "white" }}>
              {session.role === "admin" ? "YÖNETİCİ" :
                session.role === "region_manager" ? "BÖLGE MÜDÜRÜ" :
                  session.role === "quote_manager" ? "TEKLİF MÜDÜRÜ" :
                    session.role === "sales" ? "SATIŞ SORUMLUSU" : "KULLANICI"}
            </span>
            {session.region && (
              <span className="badge" style={{ background: "var(--tibcon-red)", color: "white" }}>
                Bölge: {session.region}
              </span>
            )}
            <span className="badge" style={{ background: "#f1f3f5", color: "#495057" }}>
              📅 {formatDate(new Date().toISOString())}
            </span>
          </div>
        </div>
      </div>

      <div style={gridStyle}>
        {menuItems.map((item) => (
          <div
            key={item.path}
            className="premium-card"
            style={{
              ...cardBaseStyle,
              background: item.color === "red" ? "var(--tibcon-red)" : "white",
              color: item.color === "red" ? "white" : "inherit"
            }}
            onClick={() => router.push(item.path)}
          >
            <div style={iconBoxStyle}>
              <span style={{ fontSize: "2.5rem" }}>{item.icon}</span>
            </div>
            <h3 className="outfit" style={{ fontSize: "1.5rem", fontWeight: 700, margin: "1rem 0 0.5rem" }}>
              {item.title}
            </h3>
            <p style={{
              fontSize: "0.95rem",
              opacity: item.color === "red" ? 0.9 : 0.7,
              lineHeight: 1.5
            }}>
              {item.desc}
            </p>
            <div style={{ marginTop: "auto", paddingTop: "1.5rem", alignSelf: "flex-end" }}>
              <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Modern Dashboard Styles
const headerSectionStyle: React.CSSProperties = {
  marginBottom: "4rem",
  marginTop: "2rem",
};

const welcomeBoxStyle: React.CSSProperties = {
  textAlign: "left" as const,
};

const badgeContainerStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "1.25rem",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "2rem",
};

const cardBaseStyle: React.CSSProperties = {
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  minHeight: "240px",
  padding: "2.5rem",
};

const iconBoxStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.03)",
  width: "60px",
  height: "60px",
  borderRadius: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "1rem",
};
