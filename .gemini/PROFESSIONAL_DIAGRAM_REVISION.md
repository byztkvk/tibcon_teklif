# PROFESYONEL TEK HAT ŞEMASI - REFERANS PANO REVİZYONU

## 🎯 REVİZYON ÖZETİ

Tek hat şeması tamamen **SIFIRDAN YENİDEN OLUŞTURULDU**.
Hedef: **Referans elektrik panosu şemasına uygun, okunaklı, eksiksiz bloklu profesyonel çizim**

## ✅ A) OKUNABİLİRLİK (UYGULANMIŞ)

### Canvas Boyutları
- **Genişlik**: 1600px ✅
- **Yükseklik**: 900px ✅
- **Sabit boyut**: Responsive değil, sabit profesyonel çizim

### Yazı Boyutları
| Eleman | Font Size | Durum |
|--------|-----------|-------|
| Ana başlık | 26px | ✅ |
| Bölüm başlıkları | 20px | ✅ |
| RGKR başlığı | 20px | ✅ |
| Kademe numaraları | 20px (beyaz/siyah daire) | ✅ |
| Etiketler | 14-18px | ✅ |
| Ürün kodları | 14px | ✅ |
| Kontrol hatları | 11-12px | ✅ |

### Çizgi Kalınlıkları
- **Ana baralar**: 4px ✅
- **Faz hatları**: 2-3px ✅
- **Kontrol hatları**: 1.5px kesikli ✅
- **Sembol çizgileri**: 2.5-3px ✅

### Sembol Boyutları
- **CT**: 38px çap ✅
- **Sigorta**: 36px ✅
- **Kontaktör**: 40px ✅
- **Kondansatör**: 40px ✅
- **Reaktör**: 36px ✅
- **Kademe numaraları**: 22px çap daire ✅

## ✅ B) ZORUNLU BLOKLAR (EKSİKSİZ)

### 1. Ana Baralar (Üst) ✅
```
R (L1) ━━━━━━━━━━━━━━━━━━━━ (Kırmızı #c0392b)
S (L2) ━━━━━━━━━━━━━━━━━━━━ (Sarı #f39c12)
T (L3) ━━━━━━━━━━━━━━━━━━━━ (Mavi #2980b9)
N (Mp) ━━━━━━━━━━━━━━━━━━━━ (Pembe #e91e63)
```

### 2. Bölge Etiketleri ✅
```
SAYAÇ PANOSU  |  AKIM TRAFOSU  |  YÜK
```

### 3. Akım Trafosu (CT) ✅
- Ana hat üzerinde gösterildi
- RGKR'ye ölçüm hattı (kesikli) bağlandı
- Ürün kodu etiketi altında
- Tıklanabilir ✅

### 4. RGKR Bloğu (Detaylı) ✅
**Üst Etiket**: "REAKTİF GÜÇ KONTROL RÖLESİ (RGKR)"

**Ana Blok**:
- 280x140px yeşil çerçeveli dikdörtgen
- İçinde: "RGKR" başlığı + ürün kodu
- Tıklanabilir ✅

**Besleme**:
- Sol tarafta BESLEME SİGORTASI ✅
- R-S-T-N faz bağlantısı ✅
- "Besleme Fazı" görsel olarak gösterildi

**Kontrol Çıkışları**:
- Alt kısımda C1, C2, C3, ..., Cn klemensleri ✅
- Her klemens: Kırmızı dolu daire + etiket
- Kademe sayısı kadar (max 12 görünür)

**CT Bağlantısı**:
- Yukarıdan CT'den gelen ölçüm hattı (kesikli) ✅
- "Ölçüm" etiketi ✅

### 5. SVC SÜRÜCÜ Bloğu (SOL TARAFTA) ✅
**Konum**: Sol tarafta ayrı panel (120, 400)

**İçerik**:
- "SVC SÜRÜCÜ" başlığı (turuncu #e67e22)
- FAZ SİGORTALARI başlığı ve sembolü
- Faz sigorta ürün kodu
- SÜRÜCÜ bloğu (tıklanabilir)
- RGKR ile haberleşme hattı (kesikli "Kontrol")

### 6. ŞÖNT REAKTÖRLER (SOL ALTTA) ✅
**Konum**: SVC sürücünün altında

**İçerik**:
- "ŞÖNT REAKTÖRLER" başlığı
- 3 adet reaktör sembolü
- Etiketler: L1, L2, L3
- Her biri tıklanabilir
- Ürün kodu (varsa) altında

### 7. NÖTR BARASI (SAĞ TARAFTA) ✅
**Konum**: Sağ tarafta (dimensions.width - 180, RELAY_Y)

**İçerik**:
- **Büyük blok**: 140x180px pembe çerçeveli
- **Başlık**: "NÖTR BARASI" (20px, pembe)
- **Alt etiket**: "(N - Mp)"
- **Bara çizgisi**: 5px kalın pembe

## ✅ C) KADEMELER (DİNAMİK)

### Yerleşim Sistemi
- **Başlangıç X**: 800px (sağ bölge)
- **Başlangıç Y**: 580px
- **Kolon genişliği**: 90px
- **Kolon aralığı**: 100px

### Sıralama Mantığı
```javascript
stagesPerRow = stepCount <= 8 ? stepCount : Math.ceil(stepCount / 2)

Örnekler:
- 4 kademe → Tek sıra: 4 kolon
- 8 kademe → Tek sıra: 8 kolon
- 12 kademe → İki sıra: 6+6 kolon
- 16 kademe → İki sıra: 8+8 kolon
```

### Her Kademe Yapısı (Normal)
```
       ①
       │ (3 faz çizgi)
    SİGORTA
       │
   KONTAKTÖR ←─ C1 (RGKR'den kesikli)
       │
  KONDANSATÖR
       │
       ⏚
```

### Harmonik Filtreli Kademe Yapısı
```
       ①
       │
    SİGORTA
       │
   KONTAKTÖR ←─ Cx
       │
    REAKTÖR
       │
  KONDANSATÖR
       │
       ⏚
```

### Kademe Elemanları
1. **Numarası**: 22px çap siyah daire, içinde beyaz 20px rakam
2. **Sigorta**: 36px, tıklanabilir, ürün kodu altında
3. **Kontaktör**: 40px, tıklanabilir, ürün kodu altında
4. **Reaktör** (opsiyonel): 36px, harmonik filtrede
5. **Kondansatör**: 40px, 1Ф veya 3Ф sembolü
6. **Topraklama**: Standart 3 çizgili sembol

## ✅ D) BAĞLANTILAR

### Güç Hatları (Renkli)
- **R**: #c0392b (kırmızı) - 2px
- **S**: #f39c12 (sarı) - 2px
- **T**: #2980b9 (mavi) - 2px
- **N**: Gerektiğinde gösterilir

### Kontrol Hatları (Temiz)
- **RGKR Cx → Kontaktör**: Koyu gri (#555), 1.5px, kesikli
- **CT → RGKR**: Gri (#666), 2px, kesikli (ölçüm hattı)
- **SVC → RGKR**: Gri (#666), 1.5px, kesikli (haberleşme)

### Bağlantı Etiketleri
- "C1", "C2", ... kontrol hatlarında
- "Ölçüm", "Kontrol" açıklayıcı etiketler

## ✅ E) ETKİLEŞİM

### Tıklanabilir Semboller
| Sembol | Slot Type | Sonuç |
|--------|-----------|-------|
| CT | CURRENT_TRANSFORMER | CT ürün listesi |
| RGKR | RELAY | Röle ürün listesi |
| Kademe Sigorta | NH | Sigorta listesi |
| Kademe Kontaktör | SWITCH | Kontaktör listesi |
| Kademe Kondansatör | CAP | Kondansatör listesi |
| Kademe Reaktör | HARMONIC_FILTER | Reaktör listesi |
| SVC Fuse | SVC_FUSE | SVC sigorta listesi |
| SVC Driver | SVC_DRIVER | SVC sürücü listesi |
| Şönt Reaktör 1-3 | SVC_SHUNT_1/2/3 | Şönt reaktör listesi |

### Ürün Seçimi Akışı
1. Sembol tıklanır
2. `onSlotClick(stepId, type)` tetiklenir
3. Ürün listesi modalı açılır
4. Kullanıcı ürün seçer
5. Ürün kodu sembol altında güncellenir
6. BOM'a eklenir
7. Fiyat hesaplanır

## ✅ F) ÇIKTI (PNG/PDF)

### PNG Export
- **Fonksiyon**: `captureDiagramImage(design)`
- **Boyut**: 2000px × 1125px ✅
- **Scale**: 2.5x (yüksek çözünürlük) ✅
- **Kalite**: 1.0 (maksimum) ✅
- **Format**: PNG

### PDF Export
**Sıralama**:
1. **Şema** (üstte, tam sayfa genişliği)
2. **Şirket bilgileri** (header)
3. **BOM Tablosu** (şemanın altında)
4. **Toplam hesaplamalar**
5. **İkinci sayfa** (BOM uzarsa)

**Şema Yerleşimi PDF'de**:
```
┌─────────────────────────┐
│   TIBCON LOGO + Header  │
│─────────────────────────│
│                         │
│   TEK HAT ŞEMASI        │
│   (2000px genişlik)     │
│                         │
│─────────────────────────│
│   BOM TABLOSU           │
│   ├─ S.No               │
│   ├─ Ürün Kodu          │
│   ├─ Açıklama           │
│   ├─ Adet               │
│   ├─ Fiyat              │
│   └─ Toplam             │
│─────────────────────────│
│   TOPLAM (TRY/USD)      │
└─────────────────────────┘
```

## 📐 LAYOUT SABİTLERİ

```javascript
MARGIN = 60             // Kenar boşluğu
BUSBAR_Y = 100          // Ana baralar Y pozisyonu
LABEL_Y = 160           // Bölge etiketleri
CT_Y = 220              // Akım trafosu
RELAY_Y = 380           // RGKR
STAGE_START_Y = 580     // Kademeler başlangıç

stagesStartX = 800      // Kademeler sol başlangıç
stageWidth = 90         // Her kademe genişliği
stageSpacing = 100      // Kolonlar arası boşluk
```

## 🎨 RENK PALETİ

| Faz/Eleman | Renk | Hex |
|-----------|------|-----|
| R Faz | Kırmızı | #c0392b |
| S Faz | Sarı | #f39c12 |
| T Faz | Mavi | #2980b9 |
| N Nötr | Pembe | #e91e63 |
| RGKR | Yeşil | #2e7d32 |
| SVC | Turuncu | #e67e22 |
| Kontrol hatları | Koyu gri | #555, #666 |

## 📊 KARŞILAŞTIRMA: ESKİ vs YENİ

| Özellik | Eski Şema | Yeni Şema |
|---------|-----------|-----------|
| Canvas | 1200x800 | **1600x900** ✅ |
| Başlık | 18px | **26px** ✅ |
| Kademe no | 11px | **20px** ✅ |
| Semboller | 20-32px | **32-44px** ✅ |
| RGKR detayı | Basit | **Eksiksiz (besleme, Cx)** ✅ |
| SVC bloğu | Yok/Eksik | **Tam panel** ✅ |
| Şönt reaktörler | Yok | **3 adet sembollü** ✅ |
| Nötr barası | Etiket | **Büyük blok** ✅ |
| CT bağlantısı | Basit | **Ölçüm hattı etiketli** ✅ |
| Kontrol çıkışları | Yok | **C1..Cn klemensleri** ✅ |
| Export çözünürlük | 1400px | **2000px** ✅ |

## 🎯 BAŞARILI UYGULAMALAR

✅ Canvas 1600x900px  
✅ Yazılar 14-26px  
✅ Çizgiler 2-4px  
✅ Semboller 32-44px  
✅ Ana baralar üstte  
✅ Sayaç-CT-Yük etiketleri  
✅ CT sembolü + RGKR bağlantısı  
✅ RGKR eksiksiz blok (besleme, Cx)  
✅ SVC sürücü sol panel  
✅ Şönt reaktörler 3 adet  
✅ Nötr barası sağ blok  
✅ Kademeler dinamik (N≤8: 1 sıra, N>8: 2 sıra)  
✅ Harmonik filtre desteği  
✅ Kontrol hatları temiz ve etiketli  
✅ Tıklanabilir semboller  
✅ PNG 2000px çözünürlük  
✅ PDF'de şema üstte  

## 🧪 TEST KONTROL LİSTESİ

### Görsel Kontrol
- [ ] Tüm yazılar okunaklı mı?
- [ ] Semboller yeterince büyük mü?
- [ ] Çizgiler net mi?
- [ ] Faz renkleri doğru mu?
- [ ] Kademe numaraları belirgin mi?

### Blok Kontrolü
- [ ] Ana baralar var mı?
- [ ] CT görünüyor mu?
- [ ] RGKR eksiksiz mi? (besleme + Cx)
- [ ] SVC bloğu sol tarafta mı?
- [ ] Şönt reaktörler var mı?
- [ ] Nötr barası sağda mı?

### Kademe Kontrolü
- [ ] 4 kademe → 1 sıra 4 kolon?
- [ ] 8 kademe → 1 sıra 8 kolon?
- [ ] 12 kademe → 2 sıra 6+6 kolon?
- [ ] 16 kademe → 2 sıra 8+8 kolon?
- [ ] Harmonik filtreli modda reaktör var mı?

### Etkileşim Kontrolü
- [ ] CT tıklanabilir mi?
- [ ] RGKR tıklanabilir mi?
- [ ] Sigorta tıklanabilir mi?
- [ ] Kontaktör tıklanabilir mi?
- [ ] Kondansatör tıklanabilir mi?

### Export Kontrolü
- [ ] PNG indirme çalışıyor mu?
- [ ] PNG 2000px genişlikte mi?
- [ ] PDF'de şema görünüyor mu?
- [ ] PDF'de BOM şemanın altında mı?

## 🚀 KULLANIM

1. **Wizard'ı Aç**: `/compensation/wizard`
2. **Sistem Ayarları**: Voltaj, faz tipi
3. **Kademe Sayısı**: 4-16 arası seç
4. **Ürün Seç**: Sembollere tıkla → Ürün seç
5. **Şemayı Gör**: Otomatik güncellenir
6. **Export Et**:
   - "Şemayı İndir (PNG)" → 2000px PNG
   - "Şema + BOM PDF İndir" → Eksiksiz PDF

## ✨ SONUÇ

**Profesyonel, okunaklı, eksiksiz bloklu, referans panoya uygun tek hat şeması başarıyla oluşturuldu! 🎉**

Tüm gereksinimler (A-F) **TAMAMEN UYGULANMIŞTIR**.
