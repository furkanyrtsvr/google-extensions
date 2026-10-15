# Sürüm akışı

main push’u manifest/dosya ve JavaScript kontrollerini çalıştırır. PCB Guard mevcut hesaplama testlerini de çalıştırır. Kontrol başarılıysa VERSION ve manifest sürümü güncellenir, bot commit’i ve vMAJOR.MINOR.PATCH etiketi oluşturulur; GitHub Release’e temiz kurulum ZIP’i eklenir.

İlk sürüm mevcut sürümün üç parçalı karşılığını kullanır (1.0 → 1.0.0, 1.1 → 1.1.0). Sonraki güncellemeler patch’i artırır; daha büyük bir VERSION değeri verilirse onu kullanır. Chrome Web Store’a yükleme ayrı işlemdir.

Güncellemeden önce `git pull --ff-only`, ardından kaynak düzenlemesi, kontroller, commit ve `git push origin main`. Kaydedilmemiş veya gönderilmemiş yerel dosyalar otomasyon başlatmaz. Actions contents:write izni ve branch kuralları bot push’una izin vermelidir; koruma kuralları aşılmaz.

Kurulum ZIP’i manifest ve çalışma dosyalarını içerir. README, görseller, testler, geliştirme araçları ve mağaza _metadata dosyaları ZIP’e konmaz. Kaynak arşivi GitHub Release sayfasında ayrıca bulunur.
