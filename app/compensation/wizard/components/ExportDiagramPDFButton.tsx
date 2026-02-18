"use client";

import React from "react";
import { DesignState } from "@/lib/compensation/wizard-types";
import { CompProduct } from "@/lib/compensation/types";
import { captureDiagramImage } from "./DiagramContainer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
    design: DesignState;
    session: any;
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
        .replace(/₺/g, "TL")
        .replace(/[^a-zA-Z0-9\s\-\.\,\:\(\)\/\$\%]/g, "");
}

function fmtPDF(num: number, currency: string) {
    const sym = currency === "TRY" ? "TL" : "$";
    return `${num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
}

function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function ExportDiagramPDFButton({ design, session }: Props) {
    const [isExporting, setIsExporting] = React.useState(false);

    const exportPDF = async () => {
        try {
            setIsExporting(true);

            // 1. Capture diagram
            const diagramBlob = await captureDiagramImage(design);
            if (!diagramBlob) {
                alert("Şema yakaalanamadı. Lütfen tekrar deneyin.");
                return;
            }

            // 2. Prepare BOM data
            const bomMap = new Map<string, any>();

            const addToBom = (prod: CompProduct, qty: number) => {
                const key = prod.orderCode;
                if (bomMap.has(key)) {
                    bomMap.get(key).qty += qty;
                } else {
                    bomMap.set(key, {
                        productCode: prod.productCode,
                        name: prod.name,
                        qty: qty,
                        price: prod.listPrice,
                        currency: prod.currency || "USD"
                    });
                }
            };

            // Collect all components
            if (design.currentTransformer) addToBom(design.currentTransformer.product, design.currentTransformer.qty);
            if (design.relay.selectedProduct) addToBom(design.relay.selectedProduct.product, design.relay.selectedProduct.qty);
            design.svc.driver.forEach(d => addToBom(d.product, d.qty));
            design.svc.fuse.forEach(f => addToBom(f.product, f.qty));
            design.svc.shunts.forEach(phaseList => {
                phaseList.forEach(s => addToBom(s.product, s.qty));
            });
            Object.values(design.steps).forEach(step => {
                if (!design.relay.activeSteps[step.id - 1]) return;
                Object.values(step.components).forEach(list => {
                    if (Array.isArray(list)) list.forEach(c => addToBom(c.product, c.qty));
                });
            });

            const bomList = Array.from(bomMap.values());

            // 3. Generate PDF
            const doc = new jsPDF("p", "mm", "a4");
            const pageWidth = doc.internal.pageSize.getWidth();
            let startY = 2;

            // Top Red Bar
            doc.setFillColor(227, 6, 19);
            doc.rect(0, 0, pageWidth, 2, "F");

            // === DIAGRAM SECTION ===
            const diagramDataUrl = await blobToDataURL(diagramBlob);
            const imgProps = doc.getImageProperties(diagramDataUrl);

            const maxWidth = pageWidth - 24;
            const scaleFactor = maxWidth / imgProps.width;
            const imgWidth = maxWidth;
            const imgHeight = imgProps.height * scaleFactor;

            startY = 8;
            doc.setFontSize(11);
            doc.setTextColor(50);
            doc.setFont("helvetica", "bold");
            doc.text("TEK HAT SEMASI", pageWidth / 2, startY, { align: "center" });
            startY += 8;

            doc.addImage(diagramDataUrl, "PNG", 12, startY, imgWidth, imgHeight);
            startY += imgHeight + 10;

            // New page if needed
            if (startY > 200) {
                doc.addPage();
                startY = 5;
            }

            // === HEADER SECTION ===
            doc.setFillColor(227, 6, 19);
            doc.rect(0, startY, pageWidth, 2, "F");
            startY += 5;

            // Logo
            try {
                doc.addImage("/tibcon-logo-orjinal.png", "PNG", 15, startY, 90, 0);
            } catch (e) {
                console.warn("Logo error", e);
            }

            doc.setFontSize(7);
            doc.setTextColor(110);
            doc.text("TIBCON ENERJI TEKNOLOJILERI A.S.", pageWidth - 15, startY + 6, { align: "right" });
            doc.text("GULALIBEY MH. YENIDOGAN 4. SK, NO: 4/A CORUM / TURKIYE", pageWidth - 15, startY + 9, { align: "right" });
            doc.text("TEL: +90 (364) 225 57 69", pageWidth - 15, startY + 12, { align: "right" });

            startY += 40;

            // Info Box
            doc.setFillColor(245, 247, 250);
            doc.roundedRect(12, startY, pageWidth - 24, 18, 2, 2, "F");
            doc.setDrawColor(230, 230, 230);
            doc.roundedRect(12, startY, pageWidth - 24, 18, 2, 2, "S");

            doc.setTextColor(50);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold").text("HAZIRLAYAN:", 16, startY + 6);
            doc.setFont("helvetica", "normal").text(cleanForPDF(session?.email || "-"), 45, startY + 6);

            doc.setFont("helvetica", "bold").text("TARIH:", 16, startY + 12);
            doc.setFont("helvetica", "normal").text(new Date().toISOString().slice(0, 10), 45, startY + 12);

            startY += 22;

            // Title Box
            doc.setFillColor(227, 6, 19);
            doc.rect(12, startY, pageWidth - 24, 7, "F");
            doc.setTextColor(255);
            doc.setFontSize(9).setFont("helvetica", "bold");
            doc.text("MALZEME LISTESI (BOM)", pageWidth / 2, startY + 4.5, { align: "center" });

            startY += 10;

            // === BOM TABLE ===
            const tableData = bomList.map((item: any, idx: number) => {
                const netUnit = item.price;
                const lineTotal = netUnit * item.qty;

                return [
                    idx + 1,
                    cleanForPDF(item.productCode),
                    cleanForPDF(item.name || "-"),
                    item.qty,
                    fmtPDF(item.price, item.currency),
                    fmtPDF(lineTotal, item.currency)
                ];
            });

            autoTable(doc, {
                startY: startY,
                margin: { left: 12, right: 12 },
                head: [["S.No", "Urun Kodu", "Aciklama", "Adet", "Birim Fiyat", "Toplam"]],
                body: tableData,
                theme: "grid",
                headStyles: {
                    fillColor: [45, 45, 45],
                    textColor: [255, 255, 255],
                    fontSize: 7,
                    fontStyle: "bold",
                    halign: "center",
                    cellPadding: 2
                },
                styles: {
                    fontSize: 6.5,
                    cellPadding: 1.5,
                    lineColor: [220, 220, 220],
                    valign: "middle",
                    overflow: "linebreak"
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: "center" },
                    1: { cellWidth: 35 },
                    2: { cellWidth: "auto" },
                    3: { cellWidth: 15, halign: "center" },
                    4: { cellWidth: 30, halign: "right" },
                    5: { cellWidth: 30, halign: "right" }
                }
            });

            const finalY = (doc as any).lastAutoTable?.finalY || startY + 50;

            // === TOTALS ===
            let trySub = 0, usdSub = 0;
            bomList.forEach((item: any) => {
                const total = item.price * item.qty;
                if (item.currency === "TRY") trySub += total;
                else if (item.currency === "USD") usdSub += total;
            });

            const totalsX = pageWidth - 70;
            const valX = pageWidth - 15;
            let currentY = finalY + 10;

            const drawTotals = (val: number, label: string) => {
                if (val <= 0) return;

                doc.setFillColor(248, 248, 248);
                doc.rect(totalsX - 2, currentY - 4, pageWidth - totalsX - 10, 15, "F");
                doc.setDrawColor(230, 230, 230);
                doc.rect(totalsX - 2, currentY - 4, pageWidth - totalsX - 10, 15, "S");

                doc.setFontSize(7).setTextColor(100).setFont("helvetica", "normal");
                doc.text(`ARA TOPLAM (${label}):`, totalsX, currentY);
                doc.text(fmtPDF(val, label), valX, currentY, { align: "right" });
                currentY += 5;

                doc.text(`KDV %20:`, totalsX, currentY);
                doc.text(fmtPDF(val * 0.2, label), valX, currentY, { align: "right" });
                currentY += 7;

                doc.setFillColor(45, 45, 45);
                doc.rect(totalsX - 2, currentY - 4, pageWidth - totalsX - 10, 7, "F");
                doc.setTextColor(255);
                doc.setFont("helvetica", "bold").setFontSize(7.5);
                doc.text(`TOPLAM (${label}):`, totalsX, currentY);
                doc.text(fmtPDF(val * 1.2, label), valX, currentY, { align: "right" });

                currentY += 12;
            };

            drawTotals(trySub, "TRY");
            drawTotals(usdSub, "USD");

            // Save PDF
            doc.save(`Kompanzasyon_Tasarimi_${Date.now()}.pdf`);

        } catch (error: any) {
            console.error("PDF export error:", error);
            alert("PDF oluşturulamadı: " + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={exportPDF}
            disabled={isExporting}
            style={{
                padding: "10px 20px",
                background: isExporting ? "#ccc" : "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: isExporting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 8px rgba(231, 76, 60, 0.3)",
                transition: "all 0.2s"
            }}
        >
            {isExporting ? (
                <>
                    <span>⏳</span>
                    <span>PDF Oluşturuluyor...</span>
                </>
            ) : (
                <>
                    <span>📄</span>
                    <span>Şema + BOM PDF İndir</span>
                </>
            )}
        </button>
    );
}
