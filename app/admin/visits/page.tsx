"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminVisitsPage() {
    const router = useRouter();
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        const raw = localStorage.getItem("tibcon_session");
        if (raw) {
            const s = JSON.parse(raw);
            if (s.role !== "admin") {
                router.push("/");
                return;
            }
            setSession(s);
        } else {
            router.push("/login");
        }

        fetchRecentVisits();
    }, []);

    const fetchRecentVisits = async () => {
        try {
            const raw = localStorage.getItem("tibcon_session");
            const s = raw ? JSON.parse(raw) : null;
            if (!s) return;

            const url = `/api/visits?role=${s.role}&email=${s.email}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.ok) {
                setVisits(data.visits || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import("xlsx");
            const ws = XLSX.utils.json_to_sheet([
                {
                    "Firma Adı (Zorunlu)": "Örnek Firma Ltd.",
                    "Şehir (Zorunlu)": "İSTANBUL",
                    "Ziyaret Tarihi (Zorunlu)": "2024-03-20",
                    "Personel Adı (Zorunlu)": "Mehmet Kaya",
                    "Ziyaret Notu (Zorunlu)": "Müşteri ile yeni ürünler üzerine görüşüldü.",
                    "Personel Email": "mehmet@tibcon.com",
                    "Ziyaret Tipi": "Ziyaret",
                    "İlçe": "Kadıköy",
                    "Yetkili Kişi": "Mehmet Bey"
                }
            ]);

            ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 50 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ziyaret Şablonu");
            XLSX.writeFile(wb, "Ziyaret_Yukleme_Sablonu.xlsx");
        } catch (e) {
            alert("Şablon oluşturulamadı.");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const XLSX = await import("xlsx");
            const reader = new FileReader();

            reader.onload = async (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                const errors: string[] = [];
                const validVisits: any[] = [];

                data.forEach((row: any, idx) => {
                    const rowNum = idx + 2;
                    const firma = (row["Firma Adı (Zorunlu)"] || row["Firma Adı"] || "").toString().trim();
                    const sehir = (row["Şehir (Zorunlu)"] || row["Şehir"] || "").toString().trim();
                    const tarih = (row["Ziyaret Tarihi (Zorunlu)"] || row["Ziyaret Tarihi"] || "").toString().trim();
                    const personelAdi = (row["Personel Adı (Zorunlu)"] || row["Personel Adı"] || "").toString().trim();
                    const not = (row["Ziyaret Notu (Zorunlu)"] || row["Ziyaret Notu"] || "").toString().trim();
                    const email = (row["Personel Email"] || "").toString().trim();

                    if (!firma || !sehir || !tarih || !personelAdi || !not) {
                        errors.push(`Satır ${rowNum}: Zorunlu alanlar (Firma, Şehir, Tarih, Personel Adı, Not) eksik.`);
                        return;
                    }

                    // Basic date validation support for DD.MM.YYYY or YYYY-MM-DD
                    let formattedDate = tarih;
                    if (tarih.includes(".")) {
                        const parts = tarih.split(".");
                        if (parts.length === 3) {
                            formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        }
                    }

                    validVisits.push({
                        firmaAdi: firma,
                        sehir: sehir,
                        ziyaretTarihi: formattedDate,
                        personelAdi: personelAdi,
                        personelEmail: email.toLowerCase(),
                        ziyaretNotu: not,
                        ziyaretTipi: row["Ziyaret Tipi"] || "Ziyaret",
                        ilce: row["İlçe"] || "",
                        yetkiliKisi: row["Yetkili Kişi"] || ""
                    });
                });

                if (errors.length > 0) {
                    alert(`Hatalar bulundu, yükleme durduruldu:\n\n${errors.join('\n')}`);
                    setLoading(false);
                    e.target.value = '';
                    return;
                }

                if (validVisits.length === 0) {
                    alert("Yüklenecek veri bulunamadı.");
                    setLoading(false);
                    e.target.value = '';
                    return;
                }

                if (confirm(`${validVisits.length} adet ziyaret kaydı Firebase'e yüklenecek. Onaylıyor musunuz?`)) {
                    const res = await fetch("/api/visits/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ visits: validVisits })
                    });
                    const resData = await res.json();
                    if (resData.success) {
                        alert(`Başarıyla eklendi: ${resData.imported} ziyaret.`);
                        fetchRecentVisits();
                    } else {
                        alert("Hata: " + resData.error);
                    }
                }

                setLoading(false);
                e.target.value = '';
            };

            reader.readAsBinaryString(file);
        } catch (e) {
            console.error(e);
            alert("Dosya işlenirken hata oluştu.");
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <h1 className="title-lg outfit mb-4">🚗 Toplu Ziyaret Kaydı Yönetimi</h1>

            <div className="premium-card" style={{ marginBottom: "2rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Toplu Ziyaret Aktarımı</h3>
                <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                    Geçmiş veya dış kaynaklı ziyaret verilerini toplu olarak sisteme yükleyebilirsiniz.<br />
                    Ziyaretlerin doğru personelle eşleşebilmesi için <b>Personel Email</b> alanının sistemdeki kullanıcı mailleriyle aynı olması gerekir.
                </p>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <button onClick={handleDownloadTemplate} className="tibcon-btn tibcon-btn-outline">
                        📥 Şablon Excel İndir
                    </button>

                    <div style={{ position: "relative" }}>
                        <input
                            type="file"
                            id="visit-upload"
                            accept=".xlsx, .xls"
                            style={{ display: "none" }}
                            onChange={handleFileUpload}
                            disabled={loading}
                        />
                        <label
                            htmlFor="visit-upload"
                            className="tibcon-btn tibcon-btn-primary"
                            style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
                        >
                            {loading ? "Yükleniyor..." : "📤 Excel Yükle"}
                        </label>
                    </div>
                </div>
            </div>

            <div className="premium-card">
                <h3 style={{ marginBottom: "1rem" }}>Son Ziyaretler (Firebase)</h3>
                <div style={{ overflowX: "auto" }}>
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Firma</th>
                                <th>Şehir</th>
                                <th>Personel</th>
                                <th>Not</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visits.map((v, i) => (
                                <tr key={v.id || i}>
                                    <td style={{ fontWeight: 600 }}>{v.plannedDate}</td>
                                    <td>{v.firmaAdi}</td>
                                    <td>{v.sehir}</td>
                                    <td>{v.satisPersoneli || v.ownerEmail}</td>
                                    <td style={{ fontSize: "0.85rem", maxWidth: "300px" }}>{v.notes}</td>
                                </tr>
                            ))}
                            {visits.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>Henüz veri bulunamadı.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
