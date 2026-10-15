# Geliştirme ve bağımsız sürüm akışı

Node.js 24 ve Python 3.13 önerilir; ek npm/Python paketi gerekmez. Önce `git pull --ff-only`, ardından ilgili eklentinin dosyalarını düzenleyin.

## Yerel doğrulama

Örneğin PCB Guard klasöründe:

```sh
cd 04-pcb-guard
node scripts/check-extension.mjs
node scripts/run-tests.mjs
cd ..
python -m unittest discover -s maintenance/tests -v
python maintenance/scripts/extensions.py package pcb-guard
```

Diğer üç eklentinin kendi klasöründe `node scripts/check-extension.mjs` çalışır. PCB Guard ayrıca mevcut 38 hesaplama testini çalıştırır. Bu kontroller gerçek Chrome extension API’lerinin ve harici sitelerin tümünü kapsamaz.

Paketleyici commit edilmiş dosyaları kullanır; düzenlemelerinizi önce commit edin. Çıktı `.release/<eklenti>-<sürüm>.zip` olur. Manifest ZIP kökündedir; kardeş eklentiler, README, dokümanlar/görseller, testler, betikler, anahtarlar ve `_metadata` pakete girmez.

## Otomatik yayın

Main push’ları ve PR’lar dört eklentiyi doğrular ve ayrı deneme ZIP’leri üretir. PR’lar sürüm yayımlamaz. Main’de tüm kontroller geçerse sürüm işi en son etiketin kaynak ağacıyla her eklentinin çalışma dosyalarını ayrı karşılaştırır. Yalnızca değişen eklentilerin `VERSION` ve `manifest.json` değerleri güncellenir. README, docs, test ve geliştirme betiği değişiklikleri tek başına sürüm çıkarmaz.

Klasörler görünüm sırası için 01–04 öneki taşır. Komutlarda kullanılan eklenti kimlikleri, ZIP adları ve `<eklenti>-vMAJOR.MINOR.PATCH` etiketleri numarasız kalır. Kimlik/klasör eşlemesi `maintenance/scripts/extensions.py` içindeki `FOLDERS` sabitindedir. Önceki numarasız klasörleri kullanan etiketler de okunabilir; yalnızca klasörün adını değiştirmek yeni sürüm çıkarmaz.

Her eklenti kendi etiketlerine göre ilerler; başka eklentinin etiketi sürüm hesabını etkilemez. Daha büyük bir VERSION değeri verilirse onu kullanır; aksi halde kendi son sürümünün patch değerini artırır. Metadata tek bot commit’iyle, ilgili etiketlerle birlikte atomik olarak push edilir. Bot commit’i `[skip ci]` taşır. Başka main commit’i gelmişse eski iş yayın yapmaz; yeni iş tüm yayımlanmamış çalışma değişikliklerini görür.

Actions → **Verify and release extensions** → **Run workflow** altında `auto` normal değişiklik tespitidir. Belirli eklentiyi seçmek, çalışma farkı olmasa bile yalnızca onun bir sonraki sürümünü zorla çıkarır. Yarıda kalan Release/ZIP yayını `auto` yeniden çalıştırıldığında aynı etiketten tamamlanır. ZIP indirilerek SHA-256 karşılaştırmasıyla yükleme doğrulanır.

Actions sürüm işinin `contents: write` izni vardır. Depo koruma kuralları bot push’una izin vermelidir; kurallar aşılmaz. Eşzamanlı yayın işleri sıraya alınır. Ortak sürüm betiğini değiştirdiğinizde `maintenance/tests/` altındaki testleri de çalıştırın. Çalışma kodunu etkileyen bir ortak değişiklikte ilgili eklentilerin çalışma dosyalarını güncelleyin veya gerekli eklentiler için elle yayın başlatın.

## Geçmiş yayınlar

Önceki dört deponun commit geçmişleri birleştirilmeden/squash edilmeden içeri alındı. Mevcut etiketler eklenti adıyla öneklendi ve aynı commit’lere işaret eder. Eski kurulum ZIP’leri birebir korundu. Tarihsel etiketlerin otomatik kaynak arşivinde eski kök düzeni vardır; yeni sürümlerde koleksiyon düzeni bulunur. Her iki durumda Release’in hazır kurulum ZIP’i ilgili eklentiyi doğrudan yüklemek içindir. Eklentiye özel yayın bağlantıları koleksiyonun genel latest bağlantısını kullanmaz.
