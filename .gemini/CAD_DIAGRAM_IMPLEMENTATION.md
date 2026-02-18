# Tek Hat Tasarımcısı - CAD Stili Şema Entegrasyonu

## Özet
Mevcut Tek Hat Tasarımcısı uygulaması, klasik elektrik pano tek hat şeması (CAD stili) görünümüne dönüştürüldü ve bu şema "Şema + BOM PDF İndir" butonu ile PDF çıktısına dahil edildi.

## Yapılan Değişiklikler

### 1. Yeni CAD Stili Tek Hat Şeması Komponenti
**Dosya:** `app/compensation/wizard/components/SingleLineDiagramCAD.tsx`

#### Özellikler:
- **Beyaz zemin**, ince çizgili teknik şema stili (CAD hissi)
- **Faz renkleri**: R=Kırmızı, S=Sarı, T=Mavi, N=Pembe
- **Ana baralar**: Üstte yatay R-S-T-N baraları

#### Ana Bölümler:
- **Üst Bölüm**: Sayaç Panosu, Akım Trafosu, Yük etiketleri
- **Orta Sol**: SVC Sürücü (opsiyonel)
- **Orta Orta**: Reaktif Güç Kontrol Rölesi
- **Alt Sol**: Şönt Reaktörler (SVC varsa)
- **Sağ Taraf**: Kondansatör Kademeleri
- **Nötr Baras**: Sağda etiketli

#### Röle
- Klasik dikdörtgen şeklinde röle sembolü
- Girişler: R, S, T, N ve Akım Trafosu bağlantısı
- Çıkışlar: C1–C12 her kademenin kontaktör bobinine bağlı

#### Kademe Yapısı
Her kademe için yatay sıralama:
```
[Sigorta] → [Kontaktör] → [Kondansatör/Şönt]
```

Harmonik filtreli sistemde:
```
[Sigorta] → [Kontaktör] → [Reaktör] → [Kondansatör]
```

#### Tıklanabilir Semboller
- **Sigorta**: Sigorta ürün listesi açılır
- **Kontaktör**: Kontaktör ürün listesi açılır
- **Kondansatör**: Kondansatör ürün listesi açılır
- **Reaktör**: Reaktör ürün listesi açılır (harmonik filtreli sistemde)
- **Şönt**: Şönt reaktör ürün listesi açılır (SVC sisteminde)

#### Monofaze / Trifaze
- Kullanıcı seçimine göre trifaze veya monofaze kondansatör sembolü gösterilir
- Etiketlerde "3Ф" veya "1Ф" ayrımı yapılır

### 2. Diagram Container Komponenti
**Dosya:** `app/compensation/wizard/components/DiagramContainer.tsx`

#### Özellikler:
- Zoom kontrolleri (yakınlaştır/uzaklaştır/sıfırla)
- Şemayı PNG olarak indirme özelliği
- `captureDiagramImage()` fonksiyonu ile şema yakalama (PDF için)

### 3. PDF Export Button Komponenti
**Dosya:** `app/compensation/wizard/components/ExportDiagramPDFButton.tsx`

#### İşlevsellik:
"Şema + BOM PDF İndir" butonu:
1. Tek hat şemasını görsel olarak yakalar
2. BOM (malzeme listesi) verilerini toplar
3. Profesyonel bir PDF oluşturur

#### PDF İçeriği (Üstten Alta):

**A) ÜST BÖLÜM - TEK HAT ŞEMASI**
- "TEK HAT ŞEMASI" başlığı
- Şema görseli (PNG formatında embed edilmiş)
- Sayfa genişliğine sığacak şekilde ölçeklenmiş
- Net ve okunaklı çıktı

**B) HEADER BÖLÜMÜ**
- TIBCON logosu
- Şirket bilgileri
- Hazırlayan ve tarih bilgisi

**C) BOM TABLOSU**
- Malzeme Listesi başlığı
- Tablo sütunları:
  - S.No
  - Ürün Kodu
  - Açıklama
  - Adet
  - Birim Fiyat
  - Toplam

**D) TOPLAM HESAPLAMALAR**
- Ara Toplam (TRY/USD)
- KDV %20
- Genel Toplam (TRY/USD)

### 4. Güncellenmiş Bileşenler

#### TopBar Komponenti
**Dosya:** `app/compensation/wizard/components/TopBar.tsx`
- Yeni "Şema + BOM PDF İndir" butonu eklendi
- Mevcut "BOM Listesi" ve "Teklife Dönüştür" butonlarının yanında

#### Design Wizard Client
**Dosya:** `app/compensation/wizard/DesignWizardClient.tsx`
- Eski `SingleLineDiagram` komponenti yerine `DiagramContainer` kullanımı
- TopBar'a `design` ve `session` prop'ları aktarımı

#### Export Utils
**Dosya:** `lib/exportUtils.ts`
- `exportToPDF()` fonksiyonu güncellendi
- Opsiyonel `diagramBlob` parametresi eklendi
- Şema varsa PDF'in en üstüne yerleştirilir
- `blobToDataURL()` yardımcı fonksiyonu eklendi

## Teknik Detaylar

### Kullanılan Kütüphaneler
- `html2canvas`: Şemayı görsel olarak yakalamak için
- `jsPDF`: PDF oluşturmak için
- `jspdf-autotable`: PDF'de tablo oluşturmak için

### Tasarım Kalitesi
- ✅ Kart yapısı kullanılmadı; tamamen çizgisel, sembol tabanlı CAD stili
- ✅ Profesyonel pano çizimi görünümü
- ✅ Tüm etiketler ve başlıklar hizalı, temiz, okunaklı
- ✅ Faz renkleri standartlara uygun
- ✅ Semboller klasik elektrik şema standartlarına uygun

### Kademe Sayısı Yönetimi
- Kullanıcı seçimine göre aktif kademe sayısı otomatik artar/azalır
- Her kademe kendi ürünlerini gösterir
- Röle çıkışları (C1-C12) ilgili kademe kontaktörlerine bağlıdır

### SVC Sürücü ve Şönt Reaktörler
- SVC sürücü bloğu ayrı çizilir
- Röle ile bağlantı kablosu gösterilir
- 3 adet şönt reaktör klasik sembolle çizilir
- Her biri tıklanabilir ve ürün listesi açılır

## Kullanım Akışı

1. Kullanıcı Tek Hat Tasarımcısı'nda tasarımını yapar
2. Ürünleri seçer (Röle, CT, Sigorta, Kontaktör, Kondansatör, vb.)
3. Harmonik filtre ve/veya SVC seçeneklerini ayarlar
4. "Şema + BOM PDF İndir" butonuna basar
5. Sistem:
   - Şemayı PNG olarak yakalar
   - BOM'u hesaplar
   - PDF oluşturur (Şema en üstte, BOM altında)
6. PDF otomatik olarak indirilir

## Alternatif Kullanım

Kullanıcı isterse:
- "BOM Listesi" butonu ile sadece BOM'u görüntüleyebilir
- "Teklife Dönüştür" butonu ile sisteme teklif olarak kaydedebilir
- Şemayı ayrıca PNG olarak indirebilir (Diagram Container'daki "Şemayı İndir" butonu ile)

## Önemli Notlar

- PDF'deki şema yüksek çözünürlükte (scale: 2) yakalanır
- Şema sayfa genişliğine otomatik ölçeklenir
- Şema çok uzunsa otomatik olarak yeni sayfaya geçilir
- Tüm metin Türkçe karakterler temizlenerek PDF'e yazılır (jsPDF font desteği için)
- Logo yüklemesi başarısız olursa sadece uyarı verilir ve devam edilir

## Test Edilmesi Gerekenler

1. ✅ Farklı kademe sayılarında şema doğru çiziliyor mu?
2. ✅ Harmonik filtreli ve filtresiz modlar doğru çalışıyor mu?
3. ✅ SVC sürücü opsiyonu doğru gösteriliyor mu?
4. ✅ Monofaze ve trifaze kondansatör sembolleri doğru mu?
5. ✅ PDF'de şema net ve okunaklı mı?
6. ✅ BOM tablosu doğru hesaplanıyor mu?
7. ✅ Toplam hesaplamalar (TRY/USD) doğru mu?
8. ✅ Zoom kontrolleri çalışıyor mu?
9. ✅ Ürün seçme modal'ları açılıyor mu?
10. ✅ Seçilen ürünler şemada görünüyor mu?

## Gelecek İyileştirmeler (Opsiyonel)

- [ ] PDF'e özel notlar ekleme alanı
- [ ] Şema üzerinde ölçüm noktaları gösterme
- [ ] Güç faktörü ve kVAr hesaplamalarını şemaya ekleme
- [ ] Şema üzerinde kablo kalınlıkları gösterme
- [ ] Farklı şema stilleri (IEC, ANSI, vs.)
- [ ] SVG formatında export desteği
- [ ] Şema üzerinde notlar ekleyebilme
