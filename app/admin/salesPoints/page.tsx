"use client";

import React, { useEffect, useState } from "react";

export default function AdminSalesPointsPage() {
    const [salesPoints, setSalesPoints] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAll = async () => {
        try {
            const res = await fetch("/api/salesPoints");
            const data = await res.json();
            setSalesPoints(data.data || []);
        } catch (e: any) {
            console.error(e);
        }
    };

    const fetchCities = async () => {
        try {
            const res = await fetch("/api/cities");
            const data = await res.json();
            setCities(data.data || []);
        } catch (e: any) {
            console.error(e);
        }
    }

    const fetchGroups = async () => {
        try {
            const res = await fetch("/api/salesPointGroups");
            const data = await res.json();
            setGroups(data.data || []);
        } catch (e: any) {
            console.error(e);
        }
    }

    useEffect(() => {
        fetchAll();
        fetchCities();
        fetchGroups();
    }, []);

    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import("xlsx");
            const ws = XLSX.utils.json_to_sheet([
                {
                    "Firma Adı (Zorunlu)": "Örnek Firma Ltd. Şti.",
                    "Satış Grubu (Zorunlu)": "1.GRUP-BAYİ",
                    "Şehir Adı (Zorunlu)": "İSTANBUL",
                    "İlçe (İsteğe Bağlı)": "Kadıköy",
                    "Yetkili İsmi (İsteğe Bağlı)": "Ahmet Yılmaz",
                    "Yetkili Telefon (İsteğe Bağlı)": "05554443322",
                    "Mail Adresi (İsteğe Bağlı)": "ahmet@ornek.com",
                    "Açık Adres (İsteğe Bağlı)": "Merkez Mah. Sanayi Cad."
                }
            ]);

            // Auto size columns slightly
            ws['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 40 }];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Satış Noktaları Şablonu");
            XLSX.writeFile(wb, "SatisNoktalari_Sablon.xlsx");
        } catch (e) {
            console.error("Şablon indirilemedi", e);
            alert("Şablon indirilirken bir hata oluştu.");
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
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Get data as array of arrays to handle column order or names freely, or json
                const data = XLSX.utils.sheet_to_json(ws);

                const errors: string[] = [];
                const validPoints: any[] = [];

                data.forEach((row: any, index) => {
                    const rowIndex = index + 2; // Data starts at row 2 usually in Excel

                    // Flexible mapping based on likely keys
                    const fName = (row["Firma Adı"] || row["Firma Adı (Zorunlu)"] || "")?.toString().trim();
                    const gName = (row["Satış Grubu"] || row["Satış Noktası Grubu"] || row["Satış Grubu (Zorunlu)"] || "")?.toString().trim();
                    const cName = (row["Şehir Adı"] || row["Şehir Adı (Zorunlu)"] || "")?.toString().trim();
                    const dName = (row["İlçe"] || row["İlçe (İsteğe Bağlı)"] || "")?.toString().trim();
                    const yName = (row["Yetkili İsmi"] || row["Yetkili İsmi (İsteğe Bağlı)"] || "")?.toString().trim();
                    const yPhone = (row["Yetkili Telefon"] || row["Yetkili Telefon (İsteğe Bağlı)"] || "")?.toString().trim();
                    const yMail = (row["Mail Adresi"] || row["Mail Adresi (İsteğe Bağlı)"] || "")?.toString().trim();
                    const yAddress = (row["Açık Adres"] || row["Açık Adres (İsteğe Bağlı)"] || "")?.toString().trim();

                    if (!fName || !cName || !gName) {
                        errors.push(`Satır ${rowIndex}: Firma Adı, Satış Grubu ve Şehir Adı zorunludur.`);
                        return;
                    }

                    // Group matching
                    const group = groups.find((g: any) => g.name.toLowerCase() === gName.toLowerCase());
                    if (!group) {
                        errors.push(`Satır ${rowIndex} Eşleşme Hatası: "${gName}" isimli satış grubu sistemde bulunamadı. Lütfen "Satış Noktası Grupları" ekranındaki gruplarla harfi harfine aynı olacak şekilde düzeltin.`);
                        return;
                    }

                    // City matching
                    const city = cities.find((c: any) => c.name.toLowerCase() === cName.toLowerCase());
                    if (!city) {
                        errors.push(`Satır ${rowIndex} Eşleşme Hatası: "${cName}" isimli şehir sistemde bulunamadı. Lütfen veritabanındaki şehir adıyla (örn: "İSTANBUL - AVRUPA") birebir aynı olacak şekilde düzeltin.`);
                        return;
                    }

                    validPoints.push({
                        name: fName,
                        cityId: city.id,
                        cityName: city.name,
                        groupId: group.id,
                        groupName: group.name,
                        regionId: city.assignedRegionId || "",
                        district: dName,
                        authorizedPerson: yName,
                        phone: yPhone,
                        email: yMail,
                        address: yAddress
                    });
                });

                if (errors.length > 0) {
                    alert(`Yükleme iptal edildi. Aşağıdaki hatalar bulundu:\n\n${errors.join('\n')}`);
                    setLoading(false);
                    // Reset input
                    e.target.value = '';
                    return;
                }

                if (validPoints.length === 0) {
                    alert("Yüklenecek geçerli veri bulunamadı.");
                    setLoading(false);
                    e.target.value = '';
                    return;
                }

                if (window.confirm(`${validPoints.length} adet, şehirleriyle eşleştirilmiş firma içeri aktarılacak. Onaylıyor musunuz?`)) {
                    try {
                        const res = await fetch("/api/salesPoints/import", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ salesPoints: validPoints })
                        });
                        const resData = await res.json();

                        if (resData.success) {
                            alert(`Başarıyla eklendi: ${resData.imported} adet satış noktası.`);
                            fetchAll();
                        } else {
                            alert("Hata: " + resData.error);
                        }
                    } catch (err: any) {
                        alert("İçe aktarım hatası: " + err.message);
                    }
                }

                setLoading(false);
                e.target.value = ''; // Reset
            };

            reader.readAsBinaryString(file);
        } catch (e: any) {
            console.error(e);
            alert("Dosya okuma hatası.");
            setLoading(false);
            e.target.value = '';
        }
    }

    return (
        <div className="page-container">
            <h1 className="title-lg outfit mb-4">🏢 Satış Noktaları Yönetimi</h1>

            <div className="premium-card" style={{ marginBottom: "2rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Toplu İçe Aktarım (Excel)</h3>
                <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                    Öncelikle Örnek Excel şablonunu indirin ve firmanızın bilgilerini doldurun.<br />
                    Müşterilerinizin/bayilerinizin doğru bölge ve sorumlulara atanabilmesi için <b>Şehir Adı</b> alanındaki isimlerin veritabanındaki isimlerle birebir aynı olmasına dikkat edin.
                </p>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginTop: "1rem" }}>
                    <button
                        onClick={handleDownloadTemplate}
                        className="tibcon-btn tibcon-btn-outline"
                    >
                        📥 Örnek Excel İndir
                    </button>

                    <div style={{ position: "relative" }}>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            style={{ display: "none" }}
                            id="excel-upload"
                            disabled={loading || cities.length === 0}
                        />
                        <label
                            htmlFor="excel-upload"
                            className="tibcon-btn tibcon-btn-primary"
                            style={{
                                cursor: (loading || cities.length === 0) ? "not-allowed" : "pointer",
                                opacity: Math.max(0.5, (loading ? 0.5 : 1)),
                                display: "inline-block",
                                margin: 0
                            }}
                        >
                            {loading ? "Dosya İşleniyor..." : "📤 Doldurulan Excel'i Yükle"}
                        </label>
                    </div>
                </div>
            </div>

            <table className="premium-table">
                <thead>
                    <tr>
                        <th>Firma / Satış Noktası Adı</th>
                        <th>Grup</th>
                        <th>Şehir / İlçe</th>
                        <th>Yetkili</th>
                        <th>Telefon</th>
                    </tr>
                </thead>
                <tbody>
                    {salesPoints.map(sp => (
                        <tr key={sp.id}>
                            <td><strong>{sp.name}</strong></td>
                            <td><span style={{ fontSize: "0.85rem", padding: "4px 8px", background: "var(--tibcon-light-gray)", borderRadius: "6px" }}>{sp.groupName || sp.groupId || "-"}</span></td>
                            <td>{sp.cityName || sp.cityId || "-"}{sp.district ? ` / ${sp.district}` : ""}</td>
                            <td>{sp.authorizedPerson || "-"}</td>
                            <td>{sp.phone || "-"}</td>
                        </tr>
                    ))}
                    {salesPoints.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center" }}>Henüz kayıtlı nokta yok.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
