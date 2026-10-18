# Sprout: proje devir notları

Bu dosya, projeyi devralan Claude için yazıldı (son güncelleme: 14 Ekim 2026). `CLAUDE.md` bunu her oturumda otomatik yükler. Proje sahibi de okuyabilsin diye Türkçe yazıldı.

## 1. Proje sahibiyle çalışma şekli

- **Programcı değil.** Her şeyi sade Türkçe, teknik terim kullanmadan anlat ("hook", "state", "context" gibi kelimeler yok). Değişikliği uygulamada ne göreceği üzerinden anlat: neye basacak, ne değişecek.
- **Planı sohbette yaz.** Büyük bir değişiklikten önce ne yapacağını düz Türkçe anlat. Plan modunun kendi onay ekranı ona yetmiyor, içeriği görmeden onaylamak zorunda kaldığını söyledi.
- **Onay sorma.** "Her şeyi otomatik onaylıyorum, devam et" dedi. Bitmiş her özelliği kaydet, GitHub'a gönder ve telefona güncelleme olarak yayınla (bkz. bölüm 3), sonra kısa bir rapor ver.
- **Raporda dürüst ol.** Neyi denediğini, neyi denemediğini (özellikle telefonda denenemeyenleri) ayrı ayrı söyle.
- **Uygulamadaki bakım tavsiyeleri emir kipinde olmasın.** Her ev ve bitki farklı olduğu için öneri diliyle yaz: "içeri almayı düşünebilirsin", "nem vermek gerekebilir", "yardımcı olabilir". İngilizcede de aynısı ("you may want to…"). Kullanıcının kendi bastığı düğmeler ("Sula", "Kaydet") olduğu gibi kalır.
- **Emoji kullanma.** Uygulamayı ucuz gösterdiğini düşünüyor; tüm emojiler çizgi ikonlarla (Ionicons) değiştirildi. "✓" işaretleri bilerek bırakıldı.
- **Tasarım taslağı isterse:** Önce HTML taslak hazırla (`Documents\SPROUT\taslak\` klasöründe örnekler var), seçtiği seçeneği uygula. Beğendiği bir taslağı sormadan değiştirme.
- Ekran görüntüsü ya da video gönderip hata bildirebilir; videoyu kare kare inceleyip hatayı bul.

## 2. Proje, hesaplar ve yerler

- **Uygulama:** Sprout, ev bitkisi bakım uygulaması. Android, Expo SDK 57, React Native 0.86 (yeni mimari), TypeScript, Expo Router. Paket adı `com.organizma.sproutapp`, sürüm 1.0.0.
- **Kod:** `C:\Users\osonm\Documents\SPROUT\sprout-app`. GitHub: https://github.com/onursonmezz/sprout (`main` dalı).
- **Expo / EAS hesabı:** `organizma`. Güncelleme adresi `https://u.expo.dev/3c8144d1-1573-4fd9-820f-70f8caa71969`. Kanal `preview`, runtimeVersion politikası `appVersion` (1.0.0).
- **Marka kiti:** `Documents\SPROUT\marka-kiti\`: ikon ve logo, Play Store görselleri, sosyal medya, 15 saniyelik Reels videosu, metinler. Ekran görüntüleri ve Reels, tur, albüm, çoğaltma, takvim ve teşhis eklenmeden önce hazırlandı; güncellenmesi gerekebilir.
- **Logo:** İki yaprağın S harfi oluşturduğu tasarım, koyu yeşil zemin. Kaynağı `assets/images/icon.png`. Uygulamadaki karşılama ekranında ve ana sayfa başlığında da bu kullanılıyor (tıklanmıyor, öyle kalması istendi).
- **Tasarım taslakları:** `Documents\SPROUT\taslak\`.

## 3. Telefona gönderme

- **Kod değişikliği (JS):** Yeni kurulum gerekmez, havadan güncelleme yeterli.
  ```
  git add -A && git commit -m "..." && git push
  npx eas-cli update --branch preview --environment preview --message "..." --non-interactive
  ```
  Commit mesajının sonuna `Co-Authored-By` satırı eklenir. Kullanıcı güncellemeyi almak için uygulamayı tamamen kapatıp yeniden açar.
- **Yerel değişiklik (ikon, uygulama adı, yeni yerel modül, widget vb.):** Yeni APK gerekir: `npx eas-cli build --platform android --profile preview`. Kullanıcı APK'yı telefona yeniden kurar.
- **Kontrol:** `npx tsc --noEmit` temiz olmalı. Önizleme: `Documents\SPROUT\.claude\launch.json` içindeki `sprout-web` (port 8081). Yeni bir sayfa dosyası eklenince sayfa adresi tipleri ancak bu sunucu yeniden başlatılınca güncellenir; o zamana kadar tsc yeni rota için hata verir.
- **Önizlemede test verisi:** Tarayıcının localStorage'ında durur: `sprout:plants-state-v2`, `sprout:settings`, `sprout:language`, `sprout:theme-mode`, `sprout:propagations`. Sayfalar 10–20 saniyede yüklenir; bir şeyi doğrulamadan önce yazının çıkmasını bekle. Basılı tutma, `pointerdown`/`mousedown` ile 700 ms bekleyip bırakarak taklit edilir.

## 4. Kod haritası (önemli dosyalar)

- `src/app/(tabs)/`: Bugün (`index.tsx`), Bitkilerim (`plants.tsx`), Takvim (`calendar.tsx`), Rehber (`guide.tsx`), Ayarlar (`settings.tsx`). Alt menü özel ve yüzen tasarımda (`components/floating-tab-bar.tsx`).
- `src/app/plant/[id].tsx`: bitki sayfası (sulama kartı, "Neden N günde bir?", albüm, çoğaltma, tür kartı, sorun şeridi, Bakım/Günlük/Geçmiş sekmeleri, paylaşım kartı).
- Diğer ekranlar: `add-plant.tsx`, `light-meter.tsx`, `tour.tsx` (haftalık tur), `diagnose.tsx` (teşhis), `finder.tsx` (bitki bulucu ve köşe danışmanı), `howto/[key].tsx` (nasıl yapılır), `propagation/[id].tsx` (çelik takibi), `guide/...`, `onboarding.tsx`.
- **Tasarım sistemi:** `components/glass.tsx` (cam kartlar, gradyanlar) ve `constants/theme.ts` (koyu zemin `#0F1813`, yeşil vurgu).
- **Metinler:** `constants/translations.ts` (EN + TR). Yeni metin eklerken iki dili de ekle.
- **Veriler:**
  - Bitki ve ayar kayıtları: `context/plants-context.tsx` ve `settings-context.tsx`.
  - Çoğaltma projeleri: `propagation-context.tsx`.
- **Tür veritabanı:** `veri/plants.json` (267 tür), `veri/VERITABANI.md`. Toplu tür eklemek için: `node veri/tur-ekle.js veri/turler-ek-2.js [--kontrol]`. Bu komut isim çakışmalarını yakalar.
  - Kullanıcı doğruluğa çok önem veriyor. Yeni türler iki kaynakla doğrulanarak eklenir: zehirlilik için ASPCA listesi (sayfası indirilip ayrıştırılabiliyor), bakım için NC State Extension Plant Toolbox (`plants.ces.ncsu.edu/plants/<cins-tür>/`). Kaynakların çeliştiği türler alınmaz. Ayrıntı `veri/VERITABANI.md`'de.
- **Sulama hesabı:**
  - Temel hesap `veri/watering.js`'de. Saksı malzemesi, boyutu, ışık, pencere uzaklığı, mevsim (enleme göre), kalorifer, dış mekân sıcağı ve drenaj hesaba katılır; toplam etki sınırlıdır.
  - `utils/watering-algorithm.ts` buna toprak geri bildiriminden öğrenmeyi, yağmuru ve hesabın dökümünü ekler.
- **Teşhis:** `utils/diagnosis.ts`. Belirti × neden puan tablosu, sorular ve bitkinin kendi verisinden gelen ipuçları; puanlar elle belirlendi.
- **Diğer yardımcılar:** `utils/plant-finder.ts`, `utils/care.ts` (bakım görevleri), `utils/care-instructions.ts` (bakıcı kartı PDF'i), `utils/seasonal-tasks.ts` (aylık işler, don/sıcak uyarıları).

## 5. Verilmiş kararlar

- Kartlara basılı tutunca hızlı menü açılır:
  - **Bitki kartı:** Yerini değiştir, Saksısını değiştir, Fotoğrafını değiştir, Günlük kaydı ekle, Bitkiyi sil. "Sula" ve "Tüm ayrıntıları düzenle" bilerek yok; üç nokta düğmesi de kullanıcı testinden sonra düşünülecek.
  - **Çelik kartı:** Tutmadı, Projeyi sil.
- Hiç çoğaltma projesi yoksa Bitkilerim'de çoğaltma bölümü görünmez.
- Yağmur sorusu türe göre değil odaya göre sorulur (balkon, teras, bahçe).
- Takvimde geçmiş günlerde yalnızca gerçekten işaretlenen işler görünür. Görev sayaçlarının başlangıç günü "yapıldı" sayılmaz.
- Harita veya yakındaki dükkânlar özelliği yapılmayacak (kullanıcı vazgeçti).
- Paylaşım kartı takvim değil istatistik gösterir: birlikte geçen süre, sulama sayısı, yeni yaprak.

## 6. Yapılacaklar ve açık konular

- **Yayından önce mutlaka (kullanıcı istedi):** Fotoğraftan bitki tanıma, kendi cihaz üstü modelimizle.
  - Önce kullanıcının bilgisayarında (NVIDIA ekran kartı var) en yaygın ~20 türle deneme eğitimi yapılır: açık lisanslı fotoğraflar (ör. iNaturalist) ve küçük bir model.
  - Sonuç iyiyse tüm türlere genişletilir; uygulamada fotoğraflı ilk 3 öneri gösterilir, kullanıcı onaylar.
  - Sonuç kötüyse Pl@ntNet ücretsiz katmanına geçilir; ticari kullanıma izin verdiği kontrol edilmeli.
  - Yerel modül gerektirir, yeni kurulum ister. Yayın, Play Store ya da "çıkış" konuşulduğunda bunu hatırlat.
  - **Deneme yapıldı (19 Ekim 2026):** `Documents\SPROUT\bitki-tanima\` (git dışında). Python `.venv` içinde (uv ile kuruldu, uv yolu `AppData\Local\Microsoft\WinGet\Packages\astral-sh.uv_...\uv.exe`). `indir.py` iNaturalist'ten yalnızca CC0/CC BY/CC BY-SA fotoğraf indirir, sahip ve lisansı `veri/kaynaklar.csv`'ye yazar (yayında atıf gerekir). `egit.py` gözleme göre ayırıp MobileNetV3 eğitir (~5 dk), `dene.py` `kendi-fotolarim/` klasöründeki fotoğrafları sınar.
  - İlk sonuç (20 tür, 5.920 fotoğraf, görülmemiş 906 fotoğraf): ilk tahmin %89, ilk 3 içinde %97. En zayıf: Barış çiçeği ve Yılbaşı kaktüsü (%71), Benjamin (%78). Az fotoğraf çıkan türler: Çin para bitkisi 11, Aglonema 57, Peperomya 66, Keman yapraklı ficus 88, ZZ 99. Fotoğrafların çoğu doğada çekilmiş.
  - Kullanıcının 6 saksı fotoğrafıyla sınandı: denemedeki 3 türü (kauçuk %81, ZZ %82, kalanşo %72) doğru bildi. Denemede olmayan 3 türe (Ficus microcarpa bonsai, şeflera, starliçe) yine de %46-67 güvenle yanlış cevap verdi. Tam sürümde bu türler de öğretilecek; ayrıca güven düşükse "emin değilim" deyip kullanıcıya seçtirmek gerekir. Sonuç iyi sayıldı, sıradaki adım tüm türlere genişletmek (267 × 400 fotoğraf, indirme ~1 gün).
- **Ana ekran widget'ı:** İstendi ama "şimdi değil" dendi. Kendiliğinden başlama; yapılacaklar sorulunca listele. Yeni kurulum gerektirir; fotoğraftan tanımayla aynı kuruluma koymak mantıklı.
- **Zehirlilik bilgisi:** Ekim 2026'da tüm türler ASPCA ve NC State ile karşılaştırıldı. 267 türün 226'sı doğrulandı (her kaydın `source` alanında kaynağı yazıyor). Kedi/köpek için çelişki yalnızca Fatsia ve Araucaria'da çıktı (düzeltildi). 41 tür iki kaynakta da bulunamadı ve hâlâ `needsVerification: true`; listesi `veri/VERITABANI.md`'de. Bitki bulucu bu bilgiyi kullanıyor; yayından önce bu 41'i başka bir güvenilir kaynakla (ör. Pet Poison Helpline, Cornell) tamamlamak iyi olur.
- **Kılavuzlar:** Yazılı adımlar var, fotoğraf ya da çizim yok.
- **Yedekleme:** Fotoğrafları, ayarları ve çoğaltma projelerini kapsamıyor; Firebase kuralları doğrulanmadı.
- **Diğer fikirler (sırası gelince):** Alışveriş listesi, rozetler / yıllık özet, arka planda hava uyarısı, kişisel veri politikası metni, Play Store yayın adımları.

## 7. Teknik tuzaklar (Windows ortamı)

- **Uzun düzenlemeler:** Bash heredoc'ları ters tırnak ve tırnak içeren metinlerde bozuluyor. Uzun düzenlemeleri geçici klasöre bir `.js` betiği olarak yazıp `node` ile çalıştırmak daha güvenli.
- **Betik yazarken dikkat:**
  - Aynı dosyaya tek betikte iki ayrı yazma yapma; ikincisi birincinin üstüne yazıp onu kaybettirdi.
  - Değiştirilecek metnin dosyada tam bir kez geçtiğini kontrol et.
  - CRLF satır sonlarını koru.
- **Biçimlendirici:** Projede yapılandırması yok; `npx prettier --write` dosyayı yanlış biçime sokuyor, kullanma.
- **Telefonda yazı kaybolması:** Takvim gün yuvarlağında yaşandı. Bir kapsayıcının kenarlığı ve `overflow: hidden` durumu değişince Android'de içerik çizilmeyebiliyor; kenarlığı sabit tutmak ve kırpmayı kaldırmak çözüm oldu.
- **`git revert`:** `-q` seçeneğini kabul etmiyor.
