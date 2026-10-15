# Taşıma kaydı

Dört özel eklenti deposu `google-extensions` özel deposunda toplandı. Kaynak geçmişleri, mevcut sürümler ve 16 README görseli korundu. Her eklenti kendi klasöründeki manifest ile yüklenir.

Commit/etiket eşlemesi ve eski kurulum ZIP’lerinin SHA-256 değerleri [migration.json](migration.json) dosyasındadır. Aktarım sonrası yeni depo, CI, tarihsel etiketler ve indirilen Release varlıkları doğrulanır; ardından eski ayrı depolar kullanıcı onayıyla kaldırılır.
