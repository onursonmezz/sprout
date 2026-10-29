# Sprout: proje devir notları

Bu dosya, projeyi devralan Claude için yazıldı (son güncelleme: 21 Ekim 2026). `CLAUDE.md` bunu her oturumda otomatik yükler. Proje sahibi de okuyabilsin diye Türkçe yazıldı.

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

- **Uygulama:** Sprout, ev bitkisi bakım uygulaması. Android, Expo SDK 57, React Native 0.86 (yeni mimari), TypeScript, Expo Router. Paket adı `com.organizma.sproutapp`, sürüm 1.2.0 (bitki tanıma ile 1.1.0, ana ekran widget'larıyla 1.2.0 oldu).
- **Kod:** `C:\Users\osonm\Documents\SPROUT\sprout-app`. GitHub: https://github.com/onursonmezz/sprout (`main` dalı).
- **Expo / EAS hesabı:** `organizma`. Güncelleme adresi `https://u.expo.dev/3c8144d1-1573-4fd9-820f-70f8caa71969`. Kanal `preview`, runtimeVersion politikası `appVersion` (1.1.0). Yeni bir yerel modül eklenince sürüm de yükseltilmeli; yoksa havadan güncelleme eski APK'ya gidip uygulamayı çökertebilir.
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

- `src/app/(tabs)/`: Bugün (`index.tsx`), Bitkilerim (`plants.tsx`), Takvim (`calendar.tsx`), Rehber (`guide.tsx`). Alt menü özel ve yüzen tasarımda (`components/floating-tab-bar.tsx`); ortasında büyük tarama düğmesi var, basınca `components/scan-sheet.tsx` paneli açılır (Kamera, Galeri, Hastalık teşhisi "Yakında"). Ayarlar artık sekme değil: `src/app/settings.tsx`, Bugün ekranının sağ üstündeki dişliyle açılır.
- `src/app/plant/[id].tsx`: bitki sayfası (sulama kartı, "Neden N günde bir?", albüm, çoğaltma, tür kartı, sorun şeridi, Bakım/Günlük/Geçmiş sekmeleri, paylaşım kartı).
- Diğer ekranlar: `add-plant.tsx`, `light-meter.tsx`, `tour.tsx` (haftalık tur), `diagnose.tsx` (teşhis), `finder.tsx` (bitki bulucu ve köşe danışmanı), `howto/[key].tsx` (nasıl yapılır), `credits.tsx` (fotoğraf teşekkürleri, Ayarlar > Hakkında), `scan.tsx` (tarama sonucu: tür, bakım özeti, Bitkilerime ekle, İstek listesine ekle), `propagation/[id].tsx` (çelik takibi), `guide/...`, `onboarding.tsx`.
- **Tasarım sistemi:** `components/glass.tsx` (cam kartlar, gradyanlar) ve `constants/theme.ts` (koyu zemin `#0F1813`, yeşil vurgu).
- **Metinler:** `constants/translations.ts` (EN + TR). Yeni metin eklerken iki dili de ekle.
- **Veriler:**
  - Bitki ve ayar kayıtları: `context/plants-context.tsx` ve `settings-context.tsx`.
  - Çoğaltma projeleri: `propagation-context.tsx`.
- **Tür veritabanı:** `veri/plants.json` (338 tür), `veri/VERITABANI.md`. Toplu tür eklemek için: `node veri/tur-ekle.js veri/turler-ek-3.js [--kontrol]`. Bu komut isim çakışmalarını yakalar.
  - Kullanıcı doğruluğa çok önem veriyor. Yeni türler iki kaynakla doğrulanarak eklenir: zehirlilik için ASPCA listesi (sayfası indirilip ayrıştırılabiliyor), bakım için NC State Extension Plant Toolbox (`plants.ces.ncsu.edu/plants/<cins-tür>/`). Kaynakların çeliştiği türler alınmaz. Ayrıntı `veri/VERITABANI.md`'de.
- **Sulama hesabı:**
  - Temel hesap `veri/watering.js`'de. Saksı malzemesi, boyutu, ışık, pencere uzaklığı, mevsim (enleme göre), kalorifer, dış mekân sıcağı ve drenaj hesaba katılır; toplam etki sınırlıdır.
  - `utils/watering-algorithm.ts` buna toprak geri bildiriminden öğrenmeyi, yağmuru ve hesabın dökümünü ekler.
- **Teşhis:** `utils/diagnosis.ts`. Belirti × neden puan tablosu, sorular ve bitkinin kendi verisinden gelen ipuçları; puanlar elle belirlendi.
- **Ana ekran widget'ları (Android):** `src/widgets/`. Kütüphane `react-native-android-widget` (0.23.0); tanımlar `app.json` eklentisinde, simgeler `assets/fonts/Ionicons.ttf` ile çiziliyor. Giriş dosyası artık `index.ts` (widget kayıtları için). `widgets.tsx` beş widget'ı çizer (Bugün küçük/orta, Tek bitki, Bu hafta, Kısayollar), `render.tsx` hepsini yeniler, `data.ts` uygulama kapalıyken kayıtları okur, `config-screen.tsx` tek bitki widget'ında bitki seçtirir. Uygulama içinde bitkiler değişince `use-widget-refresh.ts` widget'ları yeniler. Dokununca `sproutapp://...` adresleriyle ilgili sayfa açılır; "Bitki tanı" kısayolu `quick-scan.tsx` ile kamerayı doğrudan açar. Widget dosyalarının başındaki `"use no memo"` kalmalı (React Compiler bozuyor).
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
- Alt menü: ortada tarama düğmesi, iki yanında ikişer sekme (taslak `taslak/tarama.html`, kullanıcı B seçeneğini seçti). Hastalık teşhisi ileride aynı panele eklenecek; şimdilik soluk "Yakında" olarak görünüyor (kullanıcı istedi).
- Bakıcı kartı (PDF, Ayarlar > Tatil modu): kullanıcı taslak `taslak/bakici-karti.html`ın C seçeneğini seçti. Kısa gün özeti, her bitki için kesilebilir kart (fotoğraf, yer, miktar, o bitkinin sulama günleri), ipuçları. Fotoğraflar `utils/pdf-photo.ts` ile küçültülüp PDF'e gömülür (bitkinin kendi fotoğrafı, yoksa tür örneği). "Sorun olursa ara" ve "Not" alanları ayarlarda saklanır, yedeğe girmez.
- Tohumdan filize (taslak `taslak/tohum.html`, kullanıcı A seçeneğini seçti): çoğaltma projelerinin `seed` türü. Aşamalar Ekildi → Çimlendi → Gerçek yapraklar → Saksıya alındı. Başlatma `src/app/seed.tsx` (Bitkilerim başlığındaki yaprak düğmesi ve çoğaltma şeridi), sayfa `components/seed-project.tsx`. Bugün ekranında günde bir "Fidelerin nemine bak" satırı. Çimlenme süresi/sıcaklığı `data/germination.ts`: yalnızca NDSU ve Iowa State tablolarının ikisinde de olan 8 tür (domates, biber, patlıcan, fesleğen, maydanoz, marul, petunya, aslanağzı); farklı sayılarda iki kaynağı kapsayan aralık yazıldı. Tek kaynakta olan 13 tür (kadife çiçeği, zinya, dereotu, salatalık, ateş çiçeği, sardunya, cam güzeli, kolyoz, yedi veren begonya, latin çiçeği, kozmos, rozet, mercanköşk) üçüncü kaynak bulunursa eklenebilir.
- İstek listesi (`context/wishlist-context.tsx`, `sprout:wishlist`): taramadan eklenir, Bitkilerim'de boşsa gizlenen bir bölümdür (`components/wishlist-strip.tsx`). "Aldım" bitki ekleme ekranını tür dolu açar; türü listede olan bir bitki kaydedilince listeden kendiliğinden düşer.

## 6. Yapılacaklar ve açık konular

- **Yayından önce mutlaka (kullanıcı istedi):** Fotoğraftan bitki tanıma, kendi cihaz üstü modelimizle.
  - Önce kullanıcının bilgisayarında (NVIDIA ekran kartı var) en yaygın ~20 türle deneme eğitimi yapılır: açık lisanslı fotoğraflar (ör. iNaturalist) ve küçük bir model.
  - Sonuç iyiyse tüm türlere genişletilir; uygulamada fotoğraflı ilk 3 öneri gösterilir, kullanıcı onaylar.
  - Sonuç kötüyse Pl@ntNet ücretsiz katmanına geçilir; ticari kullanıma izin verdiği kontrol edilmeli.
  - Yerel modül gerektirir, yeni kurulum ister. Yayın, Play Store ya da "çıkış" konuşulduğunda bunu hatırlat.
  - **Deneme yapıldı (19 Ekim 2026):** `Documents\SPROUT\bitki-tanima\` (git dışında). Python `.venv` içinde (uv ile kuruldu, uv yolu `AppData\Local\Microsoft\WinGet\Packages\astral-sh.uv_...\uv.exe`). `indir.py` iNaturalist'ten yalnızca CC0/CC BY/CC BY-SA fotoğraf indirir, sahip ve lisansı `veri/kaynaklar.csv`'ye yazar (yayında atıf gerekir). `egit.py` gözleme göre ayırıp MobileNetV3 eğitir (~5 dk), `dene.py` `kendi-fotolarim/` klasöründeki fotoğrafları sınar.
  - İlk sonuç (20 tür, 5.920 fotoğraf, görülmemiş 906 fotoğraf): ilk tahmin %89, ilk 3 içinde %97. En zayıf: Barış çiçeği ve Yılbaşı kaktüsü (%71), Benjamin (%78). Az fotoğraf çıkan türler: Çin para bitkisi 11, Aglonema 57, Peperomya 66, Keman yapraklı ficus 88, ZZ 99. Fotoğrafların çoğu doğada çekilmiş.
  - Kullanıcının 6 saksı fotoğrafıyla sınandı: denemedeki 3 türü (kauçuk %81, ZZ %82, kalanşo %72) doğru bildi. Denemede olmayan 3 türe (Ficus microcarpa bonsai, şeflera, starliçe) yine de %46-67 güvenle yanlış cevap verdi. Tam sürümde bu türler de öğretilecek; ayrıca güven düşükse "emin değilim" deyip kullanıcıya seçtirmek gerekir. Sonuç iyi sayıldı, tüm türlere genişletildi.
  - **Tam eğitim (19 Ekim 2026):** `esle.py` 266 türü iNaturalist'le eşleştirdi (Philodendron Birkin yok; cins sınıfları kendi altındaki ayrı türleri `haric` ile dışlar). 65.912 fotoğraf indi (~4 saat). 42 türde 30'dan az fotoğraf çıktı (kalatealar, peperomyalar, inci dizisi, kral begonya, Çin para bitkisi vb.); sebep lisans: bu türlerin iNaturalist fotoğraflarının çoğu CC BY-NC. Bunlar modele alınmadı. 224 türlük model (`sonuc/`, ~30 dk eğitim): sınavda ilk tahmin %85, ilk 3 içinde %93. Deneme modeli `sonuc-deneme20/`.
  - **Asıl sorun:** Kullanıcının 6 ev fotoğrafında yalnızca 3'ü doğru (ZZ %94, şeflera %42, kalanşo %20); kauçuk, bonsai ve starliçe yanlış (starliçe sınavda %95'ti). Eğitim fotoğrafları çoğunlukla dış mekân; ev içi fotoğrafı bol birkaç türü (çöl gülü, kalanşo, para ağacı) ev arka planı gördüğünde öneriyor. Kırpma yöntemini değiştirmek düzeltmedi. Kullanıcıya üç yol sunuldu; **kullanıcı "yalnızca kendi modelimiz" dedi** (Pl@ntNet kullanılmayacak).
  - **İyileştirme (19-20 Ekim 2026):**
    - **Ev sınavı:** `evsinavi.py` her türden 20 saksı fotoğrafı (iNaturalist captive, en az bir onay) indirir (`veri-ev/`). Çoğu CC BY-NC, bu yüzden YALNIZCA sınamada kullanılır. Bu bitkiler eğitime girmez (`indir.py` dışlar).
    - **Ek veri:** `commons.py` Wikimedia Commons'tan ticari lisanslı fotoğraf ekledi (~10.400). Saksı fotoğraflarında kural "itiraz yok"a yumuşatıldı. Toplam 84.000 fotoğraf; 30'dan az kalan 7 tür modelde yok (peperomya polybotrya/prostrata, safran kalatea, orbifolia, alokasya amazonika/zebrina, mini monstera) + Philodendron Birkin.
    - **Eğitim:** `egit.py` artık dengeli örnekleme, RandomErasing, kaldığı turdan devam (`devam.pt`) içeriyor.
  - **Sonuç (`sonuc-convnext/`, ConvNeXt-Tiny, 259 tür, ~55 dk):**
    - İnternet sınavı: %90 ilk tahmin.
    - Ev sınavı (5.094 fotoğraf): ilk tahmin %84, ilk 3 içinde %92. Eski MobileNet modeli %74 / %86 almıştı.
    - Güven %70 üstündeyken (fotoğrafların %80'i) %94 doğru.
    - Kullanıcının 6 fotoğrafının 6'sı doğru.
    - Kalan karışıklıklar benzer çiftler: havortiyalar, streptokarpus/Afrika menekşesi, naneler, ekeveryalar.
  - **Uygulamaya eklendi (19 Ekim 2026, sürüm 1.1.0, yeni APK):**
    - **Telefon modeli:** `disa-aktar.py` modelin önüne renk normalleştirmesini, arkasına olasılık hesabını ekleyip ONNX'e aktarır. GELU, tanh yaklaşımıyla değiştirilir; telefondaki TFLite "Erf"i desteklemiyor. Ayrı `.venv-tf` ortamında `onnx2tf -kat foto -tb tf_converter -odrqt` ile 29 MB'lık `assets/models/plant-id.tflite` üretilir. `tflite-sina.py` ile ölçüldü: 800 ev fotoğrafında %82,8 / %91,6 (orijinal %82,9 / %92,0).
    - **Telefonda çalıştırma:** `react-native-fast-tflite` (Nitro, yeni mimari). `src/utils/plant-id.ts` fotoğrafı expo-image-manipulator ile ortadan kırpar (kısa kenarın 224/255'i), 224'e küçültür, jpeg-js ile piksele çevirir. Web'de `plant-id.web.ts` özelliği gizler.
    - **Ekran:** Etiket sırası `src/data/plant-id-labels.ts`'de; model değişince bu dosya da birlikte değişmeli. Bitki eklerken fotoğrafın altında `components/plant-id-suggestions.tsx` ilk 3 öneriyi örnek fotoğraflarla gösterir. Güven %70 altındaysa "emin olamadım" der; dokununca tür dolar.
    - **Örnek fotoğraflar:** `assets/species/`. Bunları ve teşekkür listesini `bitki-tanima/ornek-foto.py` üretir (`src/data/species-photos.ts`). Tam fotoğraf listesi `tanima/fotograf-kaynaklari.csv`; teşekkür sayfası GitHub'daki bu dosyaya bağlanır.
    - **Telefonda henüz denenmedi.** Önizlemede yalnızca kartın görünümü sahte önerilerle ve teşekkür sayfası denendi.
  - **338 türe genişletme (20 Ekim 2026, `sonuc-338/`):**
    - **Lisans kararı:** Kullanıcı CC BY-SA fotoğrafların eğitimde kullanılmamasını seçti (`egit.py` bunları atlıyor).
    - **Kapsam:** Model 313 tür tanıyor, ~94.000 fotoğrafla eğitildi.
    - **Dışarıda kalan 24 tür:** SA çıkınca fotoğrafları 30'un altına düştü. Bunlar eski 7 + Birkin, kral begonya, karpuz peperomya, Cissus, ruj çiçeği, Ctenanthe, Selaginella, Gasteria, kadife kalatea ve ek paket 2'den 9 tür. Liste `egit-338.log`'un başında. Bu türler için ticari lisanslı yeni fotoğraf bulunursa yeniden eğitilebilir.
    - **İnternet sınavı:** %89,8 / %95,4.
    - **Ev sınavı:**
      - Genel: %84,1 / %91,9. Telefon modeli 800 fotoğrafta %87,9 / %95,5.
      - Eski 242 türde %84,5'ten %82,9'a düştü. Benzer yeni türler karışıyor: lale/ters lale, zambak/gün zambağı, nefrolepisler.
      - Yeni 71 türde %88.
    - **Gönderim:** Model değişikliği yalnızca dosya olduğu için havadan güncellemeyle gönderildi; 1.1.0 APK'sı yeterli.
    - **Kaynak listesi:** Fotoğraf listesini `kaynak-listesi.py` yazıyor.
- **Ana ekran widget'ları (21 Ekim 2026, sürüm 1.2.0, yeni APK):** Kullanıcı taslak `taslak/widget2.html`'i onayladı; "Sula" düğmesi istemedi. Beş widget var: Bugün (2×2 ve 4×2), Tek bitki (2×2, eklerken bitki seçilir), Bu hafta (4×2), Kısayollar (4×1: Bitki tanı, Işık ölçer, Bitki ekle). Telefonun widget listesindeki adları İngilizce ("Sprout: Today" vb.); bu yazılar uygulama diline göre değişmiyor. Önizleme görseli yok, listede uygulama ikonu görünür. Bilgisayarda yalnızca geçici bir deneme sayfasında görünümleri ve hesapları denendi; **telefonda henüz denenmedi**.
- **Zehirlilik kuralı (20 Ekim 2026, kullanıcı kararı):** Kaynağı olmayan türler `severity: "unknown"` olur. Uygulama bunları "Evcil hayvanlar için güvenliği doğrulanamadı" diye gösterir, bitki bulucu evcil hayvanlı evlere önermez. Genel denetimde notunda yanlışlıkla "ASPCA listesinde zehirsiz" yazan ama ASPCA'da olmayan 27 eski tür ve begonvil de "unknown" yapıldı. 21 Ekim 2026'da üçüncü kaynak denetimi yapıldı; kaynaklar Pet Poison Helpline, Merck, Cornell, Purdue ve VIN. 5 tür doğrulandı, 66 tür hâlâ "unknown". Tablo `veri/VERITABANI.md`'de.
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
- **APK içindeki dosyalar:** `react-native-fast-tflite` modeli `java.net.URL` ile okur. Kurulu APK'da `require()` ile gelen dosyanın adresi gerçek bir yol değildir. Önizlemede çalışır ama telefonda yüklenmez. Model önce `expo-asset` ile önbelleğe kopyalanır (`utils/plant-id.ts`).
- **Paket sürümleri:** Havadan güncellemede yerel parçaların sürümü APK'dakiyle aynı kalmalı. `npm install` başka paketleri de yükseltebilir; kilit dosyasındaki farkı kontrol et.
- **Önizleme sunucusu açıkken** `npm ci` dosya kilidi yüzünden başarısız olur.
- **`npx expo lint` çalıştırma:** ESLint kurulu değil; komut onu kendiliğinden kurarken kilit dosyasındaki pek çok paketi de yükseltiyor (APK ile uyuşmazlık). Kod kontrolü için `npx tsc --noEmit` yeterli; lint gerekiyorsa yeni APK'dan hemen önce yapılmalı.
- **Widget'tan açılan sayfalar:** Uygulama bir adresle doğrudan bir sayfada açılınca altında başka sayfa olmuyor; `router.back()` hiçbir şey yapmıyor. Bu sayfalarda `hooks/use-go-back.ts` kullanılıyor (geri gidecek yer yoksa Bugün'e döner). Widget'ın açtığı yeni bir sayfa eklenirse ona da uygulanmalı.
- **İngilizce sayılar:** `translations.ts`'de `countEn(n, 'plant')` kullan; "1 plants" hatası bu yüzden düzeltildi.
