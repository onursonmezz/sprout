# Sprout bitki veritabanı v1.0.0

100 bitki · metrik birimler · Türkçe · Türkiye'de gerçekten satılan türlere göre seçilmiş.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `plants.json` | Uygulamanın okuduğu veri. Tek kaynak budur. |
| `watering.js` | Sulama aralığı, ışık değerlendirme, saksı/gübre zamanı fonksiyonları. |
| `sprout-bitki-veritabani.xlsx` | Verinin okunabilir kopyası, doğrulama için. |

## Sulama neden sabit bir sayı değil

`baseIntervalDays` tek başına kullanılmaz. Şu **referans koşullar** için geçerlidir:

> 15 cm plastik saksı · yarı gölge · pencereye 1 m · iç mekan · yaz · kalorifer kapalı

Gerçek aralık şu çarpanlarla hesaplanır:

```
aralık = temel × saksı_malzemesi × saksı_boyutu × ışık × pencere_uzaklığı
              × mevsim × kalorifer × dış_mekan_sıcaklığı
```

Örnek, ZZ bitkisi (temel 21 gün):

| Koşul | Sonuç |
|---|---|
| Referans, Temmuz | 20 gün |
| 12 cm terracotta, güney pencere kenarı, Temmuz | 8 gün |
| 30 cm sırlı saksı, karanlık köşe, Ocak, kalorifer açık | 75 gün |

Aynı bitki için 8 ile 75 gün arası. Planta'nın "23 günde bir sula" demesinin arkasında bu tür bir hesap var.

## Kalorifer katsayısı

Türkiye'ye özgü olan kısım bu. Kışın iki zıt etki çalışır: büyüme yavaşlar (aralık uzar), ama kalorifer havayı kurutup buharlaşmayı artırır (aralık kısalır). Net etki bitkinin nem hassasiyetine bağlıdır.

| Bitki | Yaz | Kış, ısıtma yok | Kış, ısıtma var |
|---|---|---|---|
| Paşa kılıcı (hassasiyet: düşük) | 20 gün | 30 gün | 28 gün |
| Barış çiçeği (orta) | 7 gün | 10 gün | 8 gün |
| Kalatea (yüksek) | 6 gün | 9 gün | 7 gün |

Kalorifer sezonu Ekim-Nisan varsayılmıştır. Kullanıcıya "kaloriferin yanıyor mu?" diye sormak, tahmin etmekten daha doğru sonuç verir.

## Veri sınırları — okumadan yayına almayın

1. **Toksisite verisi doğrulanmalı.** Kaynak ASPCA zehirli/zehirsiz bitki listesi ve botanik literatürdür. Her kayıt `needsVerification: true` işaretlidir. Bu alanın yanlış olması doğrudan zarara yol açar; `Toksisite Kontrol` sayfasından ikinci bir kaynakla teyit edin. 8 bitki "ciddi" düzeyde, zakkum bunların en tehlikelisi.
2. **Lux değerleri tür bazında ölçülmedi.** Işık kategorisinden türetilen standart bahçecilik aralıklarıdır. Işık ölçer için yeterli, bilimsel iddia değil.
3. **`survivalMinC` kısa süreli maruziyet içindir**, sürekli yaşam sıcaklığı değil.
4. **Türkçe isimler bölgeye göre değişir.** "Deve tabanı" bazı yerlerde Monstera, bazı yerlerde başka bir bitki için kullanılıyor. Her bitkide birden fazla isim tutuluyor, arama bunların hepsini taramalı.
5. **`baseIntervalDays` değerleri kalibrasyon ister.** Yayından sonra "toprağı hâlâ ıslak" / "çok kurumuş" gibi kullanıcı geri bildirimleri toplanırsa bu sayılar gerçek veriyle düzeltilebilir. Asıl rekabet avantajı burada birikir.

## Yeni bitki eklemek

`data_0X_*.py` dosyalarındaki biçimi kopyalayıp `build.py` çalıştırmak yeterli. Doğrulayıcı şunları kendi yakalar: tekrar eden id, eksik alan, geçersiz sözlük değeri, ters sıcaklık aralığı, dayanma sıcaklığının ideal minimumdan yüksek olması, sukulent için fazla kısa sulama aralığı, yüksek nem isteyip kalorifer hassasiyeti düşük işaretlenmiş kayıtlar.

Yani 100'den 300'e çıkarmak artık veri girme işi, tasarım işi değil.

## Sıradaki 50 için aday listesi

Aeschynanthus (ruj çiçeği), Impatiens (cam güzeli), Fuchsia (küpe çiçeği), Plumbago (mavi yasemin), Laurus nobilis (defne), Camellia japonica (kamelya), Hyacinthus (sümbül), Narcissus (nergis), Tulipa (lale), Dionaea (sinekkapan), Petroselinum (maydanoz), Origanum onites (İzmir kekiği), Salvia officinalis (adaçayı), Aloe aristata, Kalanchoe tomentosa (panda bitkisi), Crassula perforata, Aeonium arboreum, Lithops, Epiphyllum, Hatiora, Dracaena reflexa, Philodendron erubescens, Monstera obliqua, Anthurium clarinervium, Aglaonema 'Red Siam', Ficus microcarpa (bonsai), Chamaerops humilis, Washingtonia filifera, Cycas revoluta (sagu palmiyesi), Zamia furfuracea, Musa acuminata (cüce muz), Punica granatum (nar), Ficus carica (incir), Vitis (asma), Rosa (saksı gülü), Hydrangea (ortanca), Azalea, Primula, Viola (hercai menekşe), Petunia, Surfinia, Verbena, Dianthus (karanfil), Tagetes (kadife çiçeği), Salvia splendens (ateş çiçeği), Coleus (kösemen), Helichrysum, Dichondra, Lobelia, Nemesia.
