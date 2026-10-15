# PCB Guard - Detaylı Kullanım Kılavuzu ve Teknik Referans

PCB Guard, elektronik devre tasarımcıları için kritik PCB parametrelerini hesaplayan ve doğrulayan gelişmiş bir Chrome eklentisidir. Bu kılavuz, her bir hesaplama modülünün nasıl çalıştığını, hangi endüstriyel standartları temel aldığını ve her bir parametrenin tasarımınız için neden önemli olduğunu detaylıca açıklar.

---

## 🏗️ 1. Trace Width (İz Genişliği) Hesaplayıcı

Bu modül, bir PCB üzerindeki bakır yolun (trace) belirli bir akımı, güvenli bir sıcaklık artışı sınırları içinde kalara taşıyabilmesi için gereken minimum genişliği hesaplar.

### 📚 Kullanılan Standartlar
*   **IPC-2152 (2009):** "Standard for Determining Current-Carrying Capacity in Printed Board Design". Bu, endüstrinin en güncel ve bilimsel olarak doğrulanmış standardıdır. Fizik tabanlı termal modelleme kullanır.
*   **IPC-2221B (Eski Standart):** Basit bir formüle dayanan eski standarttır. Yeni tasarımlarda IPC-2152 önerilir ancak karşılaştırma için buraya eklenmiştir.

### 🎛️ Parametreler ve Önemleri

| Parametre | Açıklama | Neden Önemli? |
| :--- | :--- | :--- |
| **Akım (Current)** | Yol üzerinden geçecek maksimum sürekli akım (Amper). | Akım arttıkça, dirençten dolayı oluşan ısı ($I^2R$) artar. Yolun bu ısıyı dağıtabilecek kadar geniş olması gerekir. |
| **Sıcaklık Artışı (Temp Rise)** | İzin verilen maksimum ısınma miktarı (°C). Örneğin, ortam 25°C ise ve +10°C artışa izin veriyorsanız, yol 35°C'ye ulaşabilir. | Yüksek sıcaklıklar PCB malzemesine (FR4) zarar verebilir, lehimleri zayıflatabilir veya çevredeki hassas bileşenleri (MCU, sensörler) etkileyebilir. Genellikle 10°C - 20°C güvenli bir aralıktır. |
| **Bakır Kalınlığı (Thickness)** | PCB üzerindeki bakır katmanının kalınlığı. Genellikle "oz" (ons) veya "µm" (mikron) cinsinden ifade edilir. Standart 1oz = 35µm. | Kalın bakır, aynı genişlikte daha fazla akım taşıyabilir çünkü kesit alanı (Cross-Section Area) daha büyüktür. Güç kartlarında 2oz veya 3oz tercih edilir. |
| **Katman (Layer)** | Yolun nerede olduğu: **Internal** (İç katman) veya **External** (Dış katman). | **Dış katmanlar** havayla temas ettiği için ısıyı daha iyi atar ve daha yüksek akım taşır. **İç katmanlar** cam elyafı içinde hapsolduğu için ısıyı daha zor atar, bu yüzden aynı akım için daha geniş yol gerekir. |

### 🔍 Nasıl Hesaplanır?
IPC-2152, karmaşık bir termal simülasyon veri setine dayanır, ancak basitleştirilmiş formülü şöyledir:
$$ I = k \cdot \Delta T^{b} \cdot A^{c} $$
Burada $A$, yolun kesit alanıdır. Yazılımımız, önce gerekli kesit alanını hesaplar, sonra bakır kalınlığına bölerek gereken genişliği ($W$) bulur.

---

## 🕳️ 2. Via (Geçiş### 2. Via Akım Kapasitesi
Via'ların akım taşıma kapasitesi ve güvenli kullanım sınırlarını hesaplar.

**Öne Çıkan Özellik: Hibrit Güvenlik Modeli**
Bu modül, basit bir IPC hesaplayıcısı değildir. İki farklı limiti aynı anda kontrol eder:
1.  **IPC Limiti (Estimate):** Via'nın kesit alanına göre taşıyabileceği teorik akım. (Standartlara uygunluk)
2.  **Termal Güç Limiti (Power Limit):** Bağlantı tipine göre izin verilen maksimum ısı yayılımı. (Fiziksel güvenlik)

**Parametreler:**
*   **Taşınacak Akım:** Hedeflenen toplam akım.
*   **Delik Çapı (Bitmiş/Finished):** Kaplamadan sonraki net delik çapıdır. (Matkap çapı değildir).
*   **Soğutma / Bağlantı Tipi:**
    *   **Solid Plane (0.2W):** Via doğrudan geniş bir bakır alana/katmana bağlıdır. Isıyı çok iyi yayar.
    *   **Thermal Relief (0.1W):** Via, termal yollar (bacaklar) ile bağlanmıştır. Isı yayılımı ortadır.
    *   **Isolated (0.05W):** Via herhangi bir geniş alana bağlı değildir. Isı yayılımı zayıftır.
*   **Kart Kalınlığı:** Kalın kartlar = Uzun via = Yüksek direnç. Bu parametre artık **doğrudan kapasiteyi düşürür.**

**Sonuç Ekranı:**
Eğer "Limit Sebebi: Termal" uyarısı görürseniz, kart kalınlığınız veya bağlantı tipiniz nedeniyle akım sınırlandırılmış demektir. Bu, via'nızın aşırı ısınmasını önleyen bir güvenlik mekanizmasıdır.eri ve detaylı termal simülasyonlarla doğrulama önerilir.
*   Endüstride yaygın olan yaklaşım; bu pratik modeli kullanmak, ancak üzerine güvenlik marjı (Safety Factor) eklemektir.

### 🎛️ Parametreler ve Önemleri

| Parametre | Açıklama | Neden Önemli? |
| :--- | :--- | :--- |
| **Matkap Çapı (Drill)** | Via deliğinin çapı (mm). | Daha geniş çap, daha fazla yüzey alanı ve daha düşük direnç demektir. |
| **Kaplama Kalınlığı** | Delik içindeki bakır kaplamanın kalınlığı (µm). Standart 20-25µm. | Akım delik içindeki bu ince duvardan akar. Üretim toleranslarına göre değişebilir. |
| **Kart Kalınlığı** | PCB kalınlığı (mm). | Via uzadıkça direnç ve ısı artar. |

### 🛠️ Çoklu Via Kullanımı
Tek bir via yüksek akımlar için yetersiz kalabilir. Hesaplayıcı, akımı paylaştırmak için gerekli **tahmini** paralel via sayısını önerir.

---

## ⚡ 3. Clearance (Mesafe) Hesaplayıcı

Yüksek voltajlı hatların birbirine veya düşük voltajlı kısımlara atlama yapmasını (ark) önlemek için gereken güvenlik mesafelerini hesaplar.

### 📚 Kullanılan Standartlar
*   **IEC 60664-1:** İzolasyon koordinasyonu için temel standart.
*   **UL 60950 / IEC 62368-1:** Bilgi teknolojisi cihazları için güvenlik standartları.

### 📏 İki Temel Kavram
1.  **Clearance (Hava Aralığı):** İki iletken arasındaki havadan giden en kısa mesafe. (Kıvılcım atlaması riskine karşı).
2.  **Creepage (Yüzeysel Kaçak):** İki iletken arasındaki PCB yüzeyi boyunca giden en kısa mesafe. (Zamanla yüzeyde biriken toz ve nemden dolayı oluşabilecek kaçaklara karşı).

### 🎛️ Parametreler ve Önemleri

| Parametre | Açıklama | Neden Önemli? |
| :--- | :--- | :--- |
| **Voltaj (Voltage)** | Çalışma gerilimi (V). AC (RMS/Peak) veya DC olabilir. | Voltaj arttıkça havanın iyonize olma ve ark yapma riski artar, dolayısıyla daha fazla mesafe gerekir. |
| **Kirlilik Derecesi (Pollution)** | Ortamın temizliği. <br>1: Temiz/Kuru (Mühürlü kutu)<br>2: Ofis/Ev (Standart)<br>3: Endüstriyel (İletken toz olabilir) | Kirli ortamlarda PCB yüzeyi iletkenleşebilir. Kirlilik derecesi arttıkça Creepage mesafesi ciddi oranda arttırılmalıdır. |
| **Malzeme Grubu (CTI)** | PCB malzemesinin elektriksel dayanımı (Comparative Tracking Index). Standart FR4 genellikle Grup IIIa veya IIIb'dir. | Yüksek CTI değerine sahip malzemeler (Grup I) ark oluşumuna daha dirençlidir ve daha kısa Creepage mesafelerine izin verir. |
| **İzolasyon Tipi** | Basic (Temel), Reinforced (Güçlendirilmiş). | Kullanıcı güvenliği için (şebeke elektriği gibi yerlerde) Reinforced izolasyon gerekir ve mesafeler genellikle 2 katına çıkar. |

---

## 〰️ 4. Differential Pairs (Diferansiyel Çiftler)

USB, HDMI, Ethernet gibi yüksek hızlı sinyaller, gürültüden etkilenmemek için diferansiyel çift olarak yönlendirilir. Bu modül, istenen empedansı (örn. 90Ω, 100Ω) elde etmek için gereken yol genişliğini ve aralığını hesaplar.

### 📚 Kullanılan Formüller
*   **Microstrip (Dış Katman):** Hammerstad & Jensen (1980).
*   **Stripline (İç Katman):** Wadell (1991).

Bu formüller, kapalı-form (closed-form) analitik modellerdir. Field solver (alan çözücü) değildir ancak endüstrideki pek çok araç bu formülleri temel alır.

*   Çoğu tipik PCB geometrisinde iyi bir yaklaşımdır.
*   Sonuçlar üretim toleranslarına ve Stackup doğruluğuna hassastır.
*   **Yüksek frekanslı kritik tasarımlarda**, PCB üreticinizin (Fab House) sağladığı verileri esas almanız önerilir.
| Parametre | Açıklama | Neden Önemli? |
| :--- | :--- | :--- |
| **Hedef Empedans (Zdiff)** | Genellikle USB için 90Ω, Ethernet için 100Ω'dur. | Empedans uyumsuzluğu sinyal yansımasına (reflection) ve veri kaybına yol açar. |
| **Trace Width (w)** | Yolların genişliği. | Genişlik arttıkça empedans düşer. |
| **Trace Spacing (s)** | İki yol arasındaki boşluk. | Yollar birbirine yaklaştıkça (coupling), diferansiyel empedans düşer. |
| **Dielektrik Sabiti (DK / Er)** | PCB malzemesinin özelliği. Standart FR4 için 4.2 - 4.6 arasındadır. | Malzeme değiştikçe (örn. Rogers, Polyimide) empedans tamamen değişir. Üreticinizden bu değeri öğrenin. |
| **Dielektrik Yüksekliği (h)** | Referans düzlemi (GND) ile yol arasındaki mesafe. | Bu mesafe arttıkça empedans artar. PCB Stackup (katman dizilimi) bilgisinden alınmalıdır. |

### 🛠️ Nasıl Kullanılır?
Genellikle "Hedef Empedans" (örn. 90Ω) girilir ve yazılım size uygun `w` (genişlik) ve `s` (aralık) değerlerini bulmak için iteratif hesaplama yapar ("Solve for Target Z" butonu).

---

## 📄 Yasal Uyarı (Disclaimer)
Bu yazılım, tasarımcılara **rehberlik** etmek amacıyla hazırlanmıştır. Hesaplamalar teorik modeller ve standart formüllere dayanır ancak gerçek dünya koşulları (üretim toleransları, malzeme kalitesi, çevresel faktörler) sonuçları etkileyebilir.

*   Kritik güvenlik gerektiren (tıbbi, havacılık, otomotiv) tasarımlarda sonuçları mutlaka sertifikalı başka araçlarla doğrulayın.
*   PCB üreticinizin (Fab House) Stackup ve tasarım kurallarını (Design Rules) her zaman öncelikli tutun.
