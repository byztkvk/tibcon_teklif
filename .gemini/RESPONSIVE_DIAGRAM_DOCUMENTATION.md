# YENI TEK HAT ŞEMASI - RESPONSIVE GRID SİSTEMİ

## Özet
Elektrik kompanzasyon panosu tek hat şeması tamamen sıfırdan yeniden tasarlandı.
**KOLONLAR YAN YANA** dizilmiş, **responsive** ve **grid tabanlı** bir yapı oluşturuldu.

## ✅ UYGULANAN KURALLAR

### 1. Ana Baralar (Üst Kısım)
```
R (L1) ━━━━━━━━━━━━━━━ (Kırmızı)
S (L2) ━━━━━━━━━━━━━━━ (Sarı)
T (L3) ━━━━━━━━━━━━━━━ (Mavi)
N (Mp) ━━━━━━━━━━━━━━━ (Pembe)
```

### 2. Yatay Etiketler (2. Satır)
```
SAYAÇ PANOSU    AKIM TRAFOSU    YÜK
```

### 3. Ortada Röle (3. Satır)
```
        REAKTİF GÜÇ KONTROL RÖLESİ
                 [RÖLE]
```

### 4. Kolonlar Yan Yana (Alt Kısım)

Kademe sayısı: **8 → 8 kolon**, **12 → 12 kolon**, **16 → 16 kolon**

Her kolon yapısı:
```
     [①]        [②]        [③]   ...
      │          │          │
   SİGORTA    SİGORTA    SİGORTA
      │          │          │
  KONTAKTÖR  KONTAKTÖR  KONTAKTÖR
      │          │          │
 KONDANSATÖR KONDANSATÖR KONDANSATÖR
      │          │          │
     ⏚          ⏚          ⏚
```

### 5. Kontrol Bağlantıları
Röle çıkışları (C1, C2, C3, ...) her kademenin kontaktör bobinine bağlanır:
```
RÖLE ─┬─ C1 ──→ Kademe 1 Kontaktör
      ├─ C2 ──→ Kademe 2 Kontaktör
      ├─ C3 ──→ Kademe 3 Kontaktör
      └─ ...
```

## 📐 RESPONSIVE ÖZELLİKLER

### Ekran Doldurma
- Şema **canvas genişliğinin %95'ini** doldurur
- **Ortalanmış** (centered) yerleşim
- Sağda/solda boş alan kalmaz

### Otomatik Ölçeklendirme
```javascript
// Responsive boyutlandırma
width = containerWidth * 0.95
height = width * 0.6 (orantılı)

// Kolon genişliği otomatik hesaplanır
columnWidth = usableWidth / stepCount
```

### Grid Tabanlı Yerleşim
```
Satır 1: Ana Baralar (R-S-T-N)
Satır 2: Etiketler (Sayaç - CT - Yük)
Satır 3: Reaktif Güç Kontrol Rölesi
Satır 4+: Kademe kolonları (yan yana)
```

### Tarayıcı Boyutu Değişimi
- **Küçülünce**: Şema orantılı küçülür
- **Büyüyünce**: Şema orantılı büyür
- `window.resize` eventi dinlenir
- SVG `viewBox` ve `preserveAspectRatio` kullanılır

## 🎛️ ZOOM KONTROL

### Varsayılan Zoom
- **%100** (scale = 1.0)
- Sayfa açıldığında otomatik fit-to-screen

### Kullanıcı Kontrolleri
- **[−] Butonu**: Uzaklaştır (min %50)
- **[+] Butonu**: Yakınlaştır (max %200)
- **[100%] Butonu**: Varsayılana dön
- Zoom değeri toolbar'da gösterilir: "85%", "100%", "150%" vb.

### Zoom Davranışı
```javascript
// Zoom kontrolü
scale = 1.0 (varsayılan)
min = 0.5 (%50)
max = 2.0 (%200)
step = 0.1 (%10)

// Transform uygulama
transform: scale(${scale})
transformOrigin: center center
transition: 0.2s ease
```

## 🎨 GÖRSEL ÖZELLİKLER

### Faz Renkleri
- **R (L1)**: #c0392b (Kırmızı)
- **S (L2)**: #f39c12 (Sarı)
- **T (L3)**: #2980b9 (Mavi)
- **N (Mp)**: #e91e63 (Pembe)

### Semboller
- **Akım Trafosu**: Çift çemberli CT simgesi
- **Röle**: Yeşil çerçeveli dikdörtgen
- **Sigorta**: Dikdörtgen kutu + bağlantılar
- **Kontaktör**: Anahtarlama sembolü
- **Kondansatör**: 1 veya 3 paralel plaka (fase bağlı)
- **Topraklama**: Üç çizgili standart sembol

### Yazı Boyutları
- Başlık: 16px (bold)
- Bölüm etiketleri: 12px (bold)
- Röle etiketi: 11px (bold)
- Kademe numaraları: 11px (bold, beyaz)
- Ürün kodları: 8-9px
- Lejant: 8-9px
- Sistem bilgisi: 9px

## 💾 PDF EXPORT

### Diagram Capture
```javascript
captureDiagramImage(design)
// Sabit boyut: 1400x900px
// Scale: 2 (yüksek çözünürlük)
// Format: PNG
```

### PDF İçeriği
1. Tek hat şeması (embedded PNG)
2. Şirket bilgileri
3. BOM tablosu
4. Toplam hesaplamalar

## 📊 TEKNİK DETAYLAR

### SVG Yapısı
```xml
<svg 
  width="100%" 
  height="100%"
  viewBox="0 0 {width} {height}"
  preserveAspectRatio="xMidYMid meet"
>
  <!-- Responsive SVG -->
</svg>
```

### Container Yapısı
```
DiagramContainer
  └─ Toolbar (zoom controls)
  └─ Diagram Area (flex center)
      └─ Scale Wrapper
          └─ SingleLineDiagramCAD
              └─ Responsive SVG
```

### Responsive Hook
```javascript
useEffect(() => {
  const updateDimensions = () => {
    const width = containerWidth * 0.95;
    const height = width * 0.6;
    setDimensions({ width, height });
  };
  
  updateDimensions();
  window.addEventListener('resize', updateDimensions);
  return () => removeEventListener('resize', updateDimensions);
}, []);
```

## ✨ YENİ ÖZELLİKLER

### 1. Tam Ekran Kullanımı
✅ Şema artık çalışma alanının %95'ini doldurur
✅ Boş alanlar minimize edildi

### 2. Grid Tabanlı Hizalama
✅ Tüm bileşenler grid sistemine göre yerleştirildi
✅ Üst üste binme sorunu yok

### 3. Otomatik Fit-to-Screen
✅ Sayfa açıldığında şema otomatik ekrana sığar
✅ Responsive boyutlandırma

### 4. Kolonlar Yan Yana
✅ Alt alta dizilim YOK
✅ Tüm kademe kolonları yatay olarak yan yana

### 5. Okunaklı Yazılar
✅ Tüm yazı boyutları optimize edildi
✅ Kademe sayısı artınca bile okunabilir

### 6. Responsive Kolon Genişliği
✅ Kolon genişliği otomatik hesaplanır
✅ columnWidth = totalWidth / stepCount

## 🧪 TEST SENARYOLARI

### Farklı Kademe Sayıları
- ✅ 4 kademe → 4 kolon yan yana
- ✅ 8 kademe → 8 kolon yan yana
- ✅ 12 kademe → 12 kolon yan yana
- ✅ 16 kademe → 16 kolon yan yana

### Responsive Davranış
- ✅ Tarayıcı küçülünce → Şema küçülür
- ✅ Tarayıcı büyüyünce → Şema büyür
- ✅ Zoom %50 → Tüm şema görünür
- ✅ Zoom %200 → Detaylar net görünür

### Görsel Kalite
- ✅ Çizgiler net ve hizalı
- ✅ Yazılar okunaklı
- ✅ Semboller standartlara uygun
- ✅ Renkler doğru

## 📝 KULLANIM

1. Wizard sayfasını aç: `/compensation/wizard`
2. Kademe sayısını seç (ör: 8)
3. Şema otomatik olarak 8 kolon oluşturur
4. Zoom ile yakınlaştır/uzaklaştır
5. "Şema + BOM PDF İndir" ile export et

## 🎯 SONUÇ

✅ Şema TAMAMEN yeniden tasarlandı
✅ Kolonlar artık YAN YANA diziliyor
✅ Responsive ve grid tabanlı
✅ Ekranı %95 dolduruyor
✅ Otomatik fit-to-screen
✅ Zoom kontrolleri çalışıyor
✅ Tüm kurallar uygulandı

**Başarıyla tamamlandı! 🎉**
