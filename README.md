# 🎯 Non invasive screening of transplantation health (NISTH) - README

**Organ nakli sonrası kimerizm takibi için zaman serisi analizi, anomali tespiti ve birleşik risk skorlama platformu. Frontend grafikleri ile model çıktıları bilimsel olarak hizalanmıştır.**

---

## 📋 İÇERİK TABLOSU
- Genel Bakış
- Özellikler ve Bileşenler
- Veri Yapısı ve Standartlar
- Modellerin Bilimsel Açıklaması
- Birleşik Risk Skoru ve Kategoriler
- Frontend: Grafiklerin Model ile Eşleşmesi ve Anlamı
- Kurulum ve Çalıştırma
- Çıktılar ve Raporlama
- Notlar ve Sınırlılıklar

---

## 🧬 Genel Bakış
Bu sistem, organ nakli sonrası kimerizm oranlarının zaman içindeki davranışını çok yönlü olarak değerlendirir: (1) kural tabanlı klasik zaman serisi analizi, (2) hasta-bazlı LSTM tahmin ve autoencoder ile anomali tespiti, (3) tablosal özelliklerle autoencoder (VAE-benzeri) anomali. Bu üç yaklaşım, klinik karar desteği için tek bir birleşik risk skorunda toplanır.

---

## 🚀 Özellikler ve Bileşenler
- Klasik analiz: Referans kohort (popülasyon normu) + kişisel eşikler (robust MAD) + trend ve volatilite.
- LSTM: Hasta-bazlı kısa sekans penceresi ile (3 nokta) tahmin ve LSTM-autoencoder ile rekonstrüksiyon hatası tabanlı anomali.
- Autoencoder (tablosal): Özet istatistikler, faz bazlı değerler ve trend özelliklerinden anomali skoru.
- Birleşik risk: Ağırlıklı birleşim ve “model uyumu” metriği.
- Dashboard: Risk dağılımı, hasta radar grafiği, zaman serisi ve model karşılaştırmaları.

---

## 📊 Veri Yapısı ve Standartlar
- Dar form girdi: `IM17_birlesik_veri.csv` → `patient_code, date_code∈{0,1,2,3}, chr`.
- Geniş form (opsiyonel): `IM17_birlesik_veri_genis.csv` → heterojen `chr*` kolonları outer birleşim ile; eksikler NaN.
- 0: 48s sonrası, 1: günlük, 2: haftalık, 3: aylık.
- Ölçümler 0–100 aralığında, NaN ve aralık dışı değerler temizlenir (işleme sırasında filtrelenir).

---

## 🤖 Modellerin Bilimsel Açıklaması
### 1) Klasik Zaman Serisi Analizi (Kural Tabanlı)
- Referans kohort: HX/GX hariç popülasyon; her faz için median ve P2.5–P97.5 bandı.
- Kişisel eşik: Post-48s median + k·MAD (k=2 uyarı, k=3 kritik). MAD, outlier’lara dayanıklıdır.
- Trend: Faz ortalamaları ile lineer eğim; pozitif eğim artış riskini işaret eder.
- Volatilite: Post-48s varyasyon katsayısı (CV). Yüksek CV, dengesiz süreci gösterir.

### 2) LSTM (Tahmin + Autoencoder)
- Tahmin: Son 3 nokta ile kısa-pencere sekans tahmini; yön bilgisi (increasing/decreasing) çıkarılır.
- Autoencoder: Sekansın kendisini yeniden üretme hatası (MSE). Q3+1.5·IQR ile robust eşik; skor= MSE/threshold.

### 3) Autoencoder (Tablosal Özellikler)
- Özellikler: Temel istatistikler (mean, std, cv, min, max, skew, kurtosis), faz bazlı ortalama ve sayılar, trend göstergeleri (slope, first-last, diff istatistikleri).
- Skor: Rekonstrüksiyon hatası/threshold (>1 anomali). En çok katkı veren özellikler raporlanır (feature importance).

---

## 🎯 Birleşik Risk Skoru ve Kategoriler
- Ağırlıklar: Klasik 0.30, LSTM 0.35, Autoencoder 0.35 (0–1 aralığında normalize edilmiş skorların toplamı).
- 0–100 ölçeği: 0–20 Çok Düşük, 20–40 Düşük, 40–60 Orta, 60–80 Yüksek, 80–100 Çok Yüksek.
- Model uyumu: Üç skorun varyansı normalize edilerek 0–100 “güven” skoru üretilir (düşük varyans = yüksek uyum).

---

## 📈 Frontend: Grafiklerin Model ile Eşleşmesi ve Anlamı
Frontend (Streamlit) grafikleri doğrudan model çıktılarıyla hizalanır. Grafikler, model eğitilmediğinde dahi klinik olarak anlamlı yorum verecek şekilde tasarlanmıştır.

- Risk dağılımı pastası: `birlesik_risk_kategori` (birleşik skorun kategorik karşılığı). Model kısmen yoksa mevcut skor bileşenleriyle hesaplanır; dağılım yine anlamlıdır.
- Risk histogramı: `birlesik_risk_score_0_100`. Model eksikse histogramın kuyruğu ve yayılımı değişebilir; genel profil izlenir.
- En riskli hastalar tablosu: Birleşik skor + alt skorlar (Klasik/LSTM/VAE) ve `model_uyum_skoru`. LSTM veya VAE yoksa ilgili hücreler NaN/0’a yakın olur; yorum ağırlıkla klasik analize kayar.
- Hasta radar grafiği: Üç model skorunun yüzdeleri. Eksik model varsa radar dilimi küçülür; bu, bilgi eksikliği olarak yorumlanmalıdır, risk artışı olarak değil.
- Zaman serisi çizimi (hasta ham verisi): `IM17_birlesik_veri.csv` değerleri fazlara göre. Model üretilmese dahi referans bandı ve kişisel eşikler üzerinden klinik yorum yapılabilir (örn. P97.5 üstü sapmalar).
- Risk vs Model Uyumu (scatter): X=birleşik risk (0–100), Y=model uyumu (0–100). Y düşükse modeller arası tutarsızlık veya eksik model olabilir; yüksek X+düşük Y “inceleme gerekli” sinyali üretir.
- Korelasyon matrisi: Üç model skoru arası ilişki. Eksik model/NaN durumunda korelasyon güvenilirliği düşer; örneklem sayısı düşük uyarısı dikkate alınmalıdır.

Model değerlendirilmediğinde (ör. yetersiz veri nedeniyle LSTM eğitilemedi):
- Klasik analiz tek başına referans bandı, kişisel eşikler ve trend ile klinik olarak yorumlanabilir.
- Birleşik skor hâlâ üretilebilir; eksik bileşenin ağırlığı faktik olarak sıfır katkı verir. Bu, skorun “ihtiyatlı” yorumlanması gerektiğini (düşük model uyumu) gösterir.

Detaylı grafik semantiği için: `GRAFIK_ACIKLAMA_DOKÜMANTASYON.md`.

---

## 🛠️ Kurulum ve Çalıştırma
```bash
# Sanal ortam (önerilir)
python -m venv venv && source venv/bin/activate

# Bağımlılıklar
pip install -r requirements.txt

# CSV hazırlama (opsiyonel, mevcutsa gerekmez)
python KMR-HAM/import-ham.py        # dar form oluşturur: IM17_birlesik_veri.csv
python KMR/import.py                # geniş form oluşturur: IM17_birlesik_veri_genis.csv

# Tüm analizler
python ana_calistir.py

# Dashboard
streamlit run interaktif_dashboard.py
```

---

## 📦 Çıktılar ve Raporlama
- CSV: `referans_kohort_istatistikleri.csv`, `hasta_profilleri.csv`, `anomali_sonuclari_satir_bazli.csv`, `hasta_risk_skorlari.csv`, `lstm_model_performans_raporu.csv`, `vae_anomaly_results.csv`, `birlesik_risk_skorlari.csv`
- Görseller: `referans_egrisi.png`, `autoencoder_latent_space.png`, `vae_feature_importance.png`, `birlesik_risk_dashboard.png`, `model_uyum_analizi.png`
- JSON: `birlesik_analiz_ozet.json`, `detayli_hasta_raporlari.json`

---

## ⚠️ Notlar ve Sınırlılıklar
- LSTM ve autoencoder için hasta başına yeterli veri yoksa modeller eğitilmez; bu durumda birleşik skorda belirsizlik artar (düşük model uyumu).
- Kişisel eşikler robust olmakla birlikte çok kısa serilerde güven aralıklarının geniş olabileceği unutulmamalıdır.
- Klinik karar tek başına model skoru ile verilmemeli; grafikler ve hastanın bağlamsal bilgileriyle birlikte değerlendirilmelidir.

---

**Son güncelleme**: 2025-08-13  
**Versiyon**: v1.1  
**İlgili dosyalar**: `SISTEM_MIMARISI.md`, `GRAFIK_ACIKLAMA_DOKÜMANTASYON.md`, `birlesik_risk_skorlama.py`, `interaktif_dashboard.py`
