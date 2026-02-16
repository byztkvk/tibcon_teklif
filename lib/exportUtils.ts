import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function exportToExcel(quote: any) {
    const rows = (quote.rows || []).map((r: any, idx: number) => ({
        "S.No": idx + 1,
        "URUN KODU": r.code,
        "ACIKLAMA": r.name,
        "PARA": r.currency,
        "LISTE FIYATI": r.listPrice,
        "ADET": r.qty,
        "ISKONTO %": r.discountPct,
        "NET BIRIM": r.listPrice * (1 - r.discountPct / 100),
        "TOPLAM": (r.listPrice * (1 - r.discountPct / 100)) * r.qty,
        "TERMIN": r.termin || "STOK"
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teklif");

    worksheet["!cols"] = [{ wch: 5 }, { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];

    XLSX.writeFile(workbook, `TIBCON_Teklif_${quote.id}.xlsx`);
}

function cleanForPDF(str: any) {
    if (!str) return "";
    return str
        .toString()
        .replace(/İ/g, "I").replace(/ı/g, "i")
        .replace(/Ş/g, "S").replace(/ş/g, "s")
        .replace(/Ğ/g, "G").replace(/ğ/g, "g")
        .replace(/Ü/g, "U").replace(/ü/g, "u")
        .replace(/Ö/g, "O").replace(/ö/g, "o")
        .replace(/Ç/g, "C").replace(/ç/g, "c")
        .replace(/₺/g, "TL") // Fallback to TL to avoid encoding issues on various devices
        .replace(/[^a-zA-Z0-9\s\-\.\,\:\(\)\/\$\%]/g, "");
}

function fmtPDF(num: number, currency: string) {
    const sym = currency === "TRY" ? "TL" : "$";
    return `${num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
}

export async function exportToPDF(quote: any, ownerDetails: any) {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // 0. Modern Accent: Top Red Bar
    doc.setFillColor(227, 6, 19);
    doc.rect(0, 0, pageWidth, 2, "F");

    // 1. Logo (Enlarged and perfectly aligned)
    const logoY = 5;
    const logoWidth = 90;
    try {
        const logoUrl = "/tibcon-logo-orjinal.png";
        // Width increased to 90, Y=5
        doc.addImage(logoUrl, "PNG", 15, logoY, logoWidth, 0);
    } catch (e) {
        console.warn("Logo error", e);
    }

    // Company Header Info (Centered vertically relative to a typical logo height)
    doc.setFontSize(7);
    doc.setTextColor(110);
    // Move address down to roughly center it next to the logo
    const addressStartY = 11;
    doc.text("TIBCON ENERJI TEKNOLOJILERI A.S.", pageWidth - 15, addressStartY, { align: "right" });
    doc.text("GULALIBEY MH. YENIDOGAN 4. SK, NO: 4/A CORUM / TURKIYE", pageWidth - 15, addressStartY + 3, { align: "right" });
    doc.text("TEL: +90 (364) 225 57 69  FAKS: +90 (364) 225 56 57", pageWidth - 15, addressStartY + 6, { align: "right" });

    // 2. Info Grid (Pushed down to 60mm to ensure no logo overlap)
    const infoYStart = 60;

    // Subtle background for info section
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(12, infoYStart - 4, pageWidth - 24, 18, 2, 2, "F");
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(12, infoYStart - 4, pageWidth - 24, 18, 2, 2, "S");

    doc.setTextColor(50);
    doc.setFontSize(7.5);

    // Left: Firm Info
    doc.setFont("helvetica", "bold").text("FIRMA ADI:", 16, infoYStart);
    doc.setFont("helvetica", "normal").text(cleanForPDF(quote.cari || "-"), 38, infoYStart);

    doc.setFont("helvetica", "bold").text("YETKILI:", 16, infoYStart + 5);
    doc.setFont("helvetica", "normal").text(cleanForPDF(quote.yetkili || "-"), 38, infoYStart + 5);

    doc.setFont("helvetica", "bold").text("TARIH:", 16, infoYStart + 10);
    doc.setFont("helvetica", "normal").text(quote.createdAt?.slice(0, 10) || "", 38, infoYStart + 10);

    // Right: Sender Info
    doc.setFont("helvetica", "bold").text("GONDEREN:", pageWidth - 95, infoYStart);
    doc.setFont("helvetica", "normal").text(cleanForPDF(ownerDetails?.displayName || quote.ownerEmail), pageWidth - 50, infoYStart);

    doc.setFont("helvetica", "bold").text("E-MAIL:", pageWidth - 95, infoYStart + 5);
    doc.setFont("helvetica", "normal").text(quote.ownerEmail || "-", pageWidth - 50, infoYStart + 5);

    doc.setFont("helvetica", "bold").text("GECERLILIK TARIHI:", pageWidth - 95, infoYStart + 10);
    doc.setFont("helvetica", "normal").text(quote.validUntil?.slice(0, 10) || "-", pageWidth - 50, infoYStart + 10);

    // 3. Proforma Title Box (Positioned after Grid)
    doc.setFillColor(227, 6, 19);
    doc.rect(12, infoYStart + 18, pageWidth - 24, 7, "F");
    doc.setTextColor(255);
    doc.setFontSize(9).setFont("helvetica", "bold");
    doc.text("PROFORMA INVOICE", pageWidth / 2, infoYStart + 22.5, { align: "center" });

    // 4. Products Table
    const tableData = (quote.rows || []).map((r: any, idx: number) => {
        const netUnit = r.listPrice * (1 - r.discountPct / 100);
        const lineTotal = netUnit * r.qty;

        return [
            idx + 1,
            cleanForPDF(r.code),
            cleanForPDF(r.name || "-"),
            r.qty,
            fmtPDF(r.listPrice, r.currency),
            `%${r.discountPct}`,
            fmtPDF(netUnit, r.currency),
            fmtPDF(lineTotal, r.currency),
            cleanForPDF(r.termin || "STOK")
        ];
    });

    autoTable(doc, {
        startY: infoYStart + 25,
        margin: { left: 12, right: 12 },
        head: [["S.No", "Urun Kodu", "Aciklamasi", "Adet", "Birim Fiyat", "Iskonto", "Net Fiyat", "Tutar", "Teslim"]],
        body: tableData,
        theme: "grid",
        headStyles: {
            fillColor: [45, 45, 45],
            textColor: [255, 255, 255],
            fontSize: 6.5,
            fontStyle: "bold",
            halign: "center",
            cellPadding: 2
        },
        styles: {
            fontSize: 6.2,
            cellPadding: 1.2,
            lineColor: [220, 220, 220],
            valign: "middle",
            overflow: "linebreak"
        },
        columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 30 },
            2: { cellWidth: "auto" },
            3: { cellWidth: 8, halign: "center" },
            4: { cellWidth: 26, halign: "right" },
            5: { cellWidth: 12, halign: "center" },
            6: { cellWidth: 26, halign: "right" },
            7: { cellWidth: 26, halign: "right" },
            8: { cellWidth: 15, halign: "center" }
        }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;

    // 5. Footer Layout
    const midPage = pageWidth / 2;

    // Terms Box
    doc.setFillColor(250, 250, 250);
    doc.rect(12, finalY + 8, midPage - 20, 30, "F");
    doc.setDrawColor(220, 220, 220);
    doc.rect(12, finalY + 8, midPage - 20, 30, "S");

    doc.setTextColor(227, 6, 19);
    doc.setFontSize(8).setFont("helvetica", "bold");
    doc.text("SATIS SARTLARI:", 15, finalY + 13);

    doc.setTextColor(80);
    doc.setFont("helvetica", "normal").setFontSize(6.5);
    const splitTerms = doc.splitTextToSize(cleanForPDF(quote.terms || "-"), midPage - 25);
    doc.text(splitTerms, 15, finalY + 18);

    // Modern Totals Section (Styled as a block)
    const rows = quote.rows || [];
    let trySub = 0, usdSub = 0;
    rows.forEach((r: any) => {
        const net = (r.listPrice * (1 - r.discountPct / 100)) * r.qty;
        if (r.currency === "TRY") trySub += net;
        else if (r.currency === "USD") usdSub += net;
    });

    const totalsX = pageWidth - 85;
    const valX = pageWidth - 15;
    let currentY = finalY + 13;

    const drawTotals = (val: number, label: string) => {
        if (val <= 0) return;

        // Block container
        doc.setFillColor(248, 248, 248);
        doc.rect(totalsX - 2, currentY - 4.2, pageWidth - totalsX - 10, 20, "F");
        doc.setDrawColor(230, 230, 230);
        doc.rect(totalsX - 2, currentY - 4.2, pageWidth - totalsX - 10, 20, "S");

        doc.setFontSize(7).setTextColor(100).setFont("helvetica", "normal");
        doc.text(`ARA TOPLAM (${label}):`, totalsX, currentY);
        doc.text(fmtPDF(val, label), valX, currentY, { align: "right" });
        currentY += 5;

        doc.text(`KDV %20 (${label}):`, totalsX, currentY);
        doc.text(fmtPDF(val * 0.2, label), valX, currentY, { align: "right" });
        currentY += 7;

        // Final total line
        doc.setFillColor(45, 45, 45);
        doc.rect(totalsX - 2, currentY - 4, pageWidth - totalsX - 10, 8, "F");
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold").setFontSize(8);
        doc.text(`GENEL TOPLAM (${label}):`, totalsX, currentY + 1.2);
        doc.text(fmtPDF(val * 1.2, label), valX, currentY + 1.2, { align: "right" });

        currentY += 15; // Gap for next currency
    };

    drawTotals(trySub, "TRY");
    drawTotals(usdSub, "USD");

    doc.save(`TIBCON_Teklif_${quote.id}.pdf`);
}
