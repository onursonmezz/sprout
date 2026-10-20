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

1. **Toksisite verisi doğrulanmalı.** Kaynak ASPCA zehirli/zehirsiz bitki listesi ve botanik literatürdür. Ekim 2026'da tüm kayıtlar ASPCA kedi/köpek listeleri ve NC State Extension Plant Toolbox ile karşılaştırıldı; doğrulananlarda `needsVerification: false` ve `source` alanında kaynak (tür düzeyi, eş anlamlı ad ya da cins düzeyi) yazılıdır. Hiçbir kaynakta bulunamayan 41 tür hâlâ `needsVerification: true`: Codiaeum variegatum, Adiantum raddianum, Asplenium nidus, Ctenanthe burle-marxii, Selaginella martensii, Gasteria bicolor, Sempervivum tectorum, Portulacaria afra, Ceropegia woodii, Agave americana, Echinocactus grusonii, Cereus repandus, Hibiscus rosa-sinensis, Bougainvillea glabra, Mandevilla sanderi, Olea europaea, Radermachera sinica, Coleus scutellarioides, Peperomia polybotrya, Saxifraga stolonifera, Mimosa pudica, Chamaerops humilis, Phlebodium aureum, Aeonium arboreum, Sedum rubrotinctum, Pachypodium lamerei, Aristaloe aristata, Gymnocalycium mihanovichii, Echinopsis chamaecereus, Epiphyllum oxypetalum, Vriesea splendens, Tillandsia ionantha, Dendrobium nobile, Cymbidium, Fuchsia hybrida, Tagetes patula, Viola wittrockiana, Plumbago auriculata, Punica granatum, Cupressus macrocarpa, Capsicum annuum. (Codiaeum, Agave, Coleus, Tagetes ve Plumbago için NC State yalnızca insanda cilt tahrişi bilgisi veriyor; evcil hayvan bilgisi yok.) Bu alanın yanlış olması doğrudan zarara yol açar; `Toksisite Kontrol` sayfasından ikinci bir kaynakla teyit edin. 8 bitki "ciddi" düzeyde, zakkum bunların en tehlikelisi.
2. **Lux değerleri tür bazında ölçülmedi.** Işık kategorisinden türetilen standart bahçecilik aralıklarıdır. Işık ölçer için yeterli, bilimsel iddia değil.
3. **`survivalMinC` kısa süreli maruziyet içindir**, sürekli yaşam sıcaklığı değil.
4. **Türkçe isimler bölgeye göre değişir.** "Deve tabanı" bazı yerlerde Monstera, bazı yerlerde başka bir bitki için kullanılıyor. Her bitkide birden fazla isim tutuluyor, arama bunların hepsini taramalı.
5. **`baseIntervalDays` değerleri kalibrasyon ister.** Yayından sonra "toprağı hâlâ ıslak" / "çok kurumuş" gibi kullanıcı geri bildirimleri toplanırsa bu sayılar gerçek veriyle düzeltilebilir. Asıl rekabet avantajı burada birikir.

## Zehirliliği bilinmeyen türler: üçüncü kaynak denetimi (21 Ekim 2026)

`severity: "unknown"` olan 71 tür için ASPCA ve NC State dışında üçüncü bir güvenilir kaynak arandı. Taranan kaynaklar:

- Pet Poison Helpline zehir listesi (bitki kategorisi, 328 kayıt) ve tek tek sayfaları.
- Cornell Üniversitesi hayvanlar için zehirli bitkiler veritabanı.
- Merck Veteriner El Kitabı, "Houseplants and Ornamentals Toxic to Animals" bölümü.
- Purdue Extension, "Indiana Plants Poisonous to Livestock and Pets".
- VIN Veterinary Partner, "Poisonous Plants for Dogs and Cats".
- UC ANR "Plant Safely" sitesi.
- ASPCA listelerinin ham hâli; yazım hatalı Latin adlar da tarandı.

Blog, mağaza ve yapay zekâ özet siteleri kaynak sayılmadı.

| Tür | Yeni durum | Kaynak | Not |
|---|---|---|---|
| Nephrolepis cordifolia | zehirsiz | ASPCA + NC State | ASPCA türün 'Duffii' ve 'Plumosa' çeşitlerini zehirsiz sayar (Latin adı ASPCA'da "Nephrolepsis" diye yanlış yazılı, ilk taramada bu yüzden kaçmış). NC State de kedi ve köpek için zehirsiz der. |
| Persea americana (avokado) | zehirsiz | Pet Poison Helpline | Kedi ve köpek için zehirsiz; çekirdek bağırsak tıkanması yapabilir. Persin kuş, tavşan, at ve geviş getirenler için zehirli (NC State ve Merck ile tutarlı). |
| Allamanda cathartica | hafif zehirli (kedi, köpek, insan) | Merck Veterinary Manual + NC State | Merck'in evcil hayvanlar için zehirli ev/süs bitkileri tablosunda yer alır (plumerisin, mide-bağırsak tahrişi). |
| Coffea arabica (kahve) | orta zehirli (kedi, köpek) | Pet Poison Helpline (kafein) | Bitkinin ayrı kaydı yok; PPH kahve çekirdeğinin kedi ve köpekte ciddi kafein zehirlenmesi yapabileceğini söyler. |
| Camellia sinensis (çay) | orta zehirli (kedi, köpek) | Pet Poison Helpline (kafein) | Bitkinin ayrı kaydı yok; PPH çay poşetinin (çay yaprağı) kedi ve köpekte ciddi kafein zehirlenmesi yapabileceğini söyler. |

Bakılıp kanıt sayılmayanlar:

- **Tropaeolum majus:** ASPCA zehirsiz, NC State kedi ve köpek için sorunlu diyor. Kaynaklar çeliştiği için "bilinmiyor" kaldı.
- **UC ANR "Plant Safely":** Bougainvillea, Cotoneaster, Eschscholzia, Lobelia ve Viola için genel bir uyarı veriyor ("çocukları ve evcil hayvanları gözetin"). Kedi ve köpek için ayrı bilgi yok. Ayrıca Sedum'u zehirli sayıyor, ASPCA ise zehirsiz; kaynak alınmadı.
- **Cornell:** Lobelia spp. için yalnızca insan ve keçiden söz ediyor. Bougainvillea için "bilinen vaka yok, ama kesin söylenemez" diyor.
- **Pet Poison Helpline'ın "Ferns", "Poppy" ve "Flax" sayfaları:** Sırasıyla eğreltilerin geneli, Papaver ve Linum içindir; bizim türlerimiz için kanıt değildir.

Hâlâ "bilinmiyor" olan 66 tür: Adiantum raddianum, Asplenium nidus, Ctenanthe burle-marxii, Selaginella martensii, Gasteria bicolor, Sempervivum tectorum, Portulacaria afra, Ceropegia woodii, Echinocactus grusonii, Cereus repandus, Bougainvillea glabra, Olea europaea, Radermachera sinica, Peperomia polybotrya, Saxifraga stolonifera, Chamaerops humilis, Phlebodium aureum, Aeonium arboreum, Gymnocalycium mihanovichii, Echinopsis chamaecereus, Epiphyllum oxypetalum, Vriesea splendens, Tillandsia ionantha, Dendrobium nobile, Cymbidium, Fuchsia hybrida, Viola wittrockiana, Punica granatum, Tropaeolum majus, Pentas lanceolata, Gazania rigens, Portulaca grandiflora, Lobularia maritima, Salvia splendens, Cosmos bipinnatus, Lavandula stoechas, Bellis perennis, Cyperus alternifolius, Delosperma cooperi, Ageratum houstonianum, Torenia fournieri, Ananas comosus, Feijoa sellowiana, Actinidia chinensis, Pisum sativum, Phaseolus vulgaris, Lactuca sativa, Abelmoschus esculentus, Eriobotrya japonica, Fritillaria imperialis, Eschscholzia californica, Kerria japonica, Chaenomeles speciosa, Ajuga reptans, Stachys byzantina, Acanthus mollis, Phormium tenax, Tecoma stans, Erica carnea, Platycodon grandiflorus, Cotoneaster horizontalis, Ulmus parvifolia, Cyperus papyrus, Thunbergia alata, Gaillardia pulchella, Lobelia erinus.

Bu türlerin çoğu için güvenilir kaynaklarda yalnızca mağaza ve blog bilgisi var. ASPCA'nın sitesi listede olmayan bitki adlarında "sonuç bulunamadı" sayfası döndürüyor. ASPCA Animal Poison Control'e doğrudan yazılı soru sormak bir sonraki adım olabilir.

## Yeni bitki eklemek

Yeni türler `veri/turler-ek-N.js` biçiminde bir dosyaya, tür başına tek satır olarak yazılır (sütunların açıklaması `turler-ek-1.js` dosyasının başında). Ardından:

    node veri/tur-ekle.js veri/turler-ek-1.js --kontrol   # yalnızca doğrular
    node veri/tur-ekle.js veri/turler-ek-1.js             # doğrular ve plants.json'a ekler

Doğrulayıcı şunları yakalar: tekrar eden tür, başka türle çakışan Türkçe/İngilizce ad, geçersiz sözlük değeri, ters sıcaklık ya da boyut aralığı, dayanma sıcaklığının ideal minimumdan yüksek olması, tam kuruma isteyen sukulent için fazla kısa sulama aralığı, yüksek nem isteyip kalorifer hassasiyeti düşük işaretlenmiş kayıtlar. Bir satır hatalıysa hiçbir şey yazılmaz; zaten ekli türler atlanır.

Mevsim davranışı olağandışı olan türler (kışın çiçek açan, yazın dinlenen, orman kaktüsü gibi) için `src/data/species-guide.ts` içindeki `SEASON_PROFILE_OVERRIDES` listesine de bir satır eklemek gerekir.

Ek paket 1 (`turler-ek-1.js`) ile tür sayısı 100'den 216'ya çıktı.

Ek paket 2 (`turler-ek-2.js`, Ekim 2026) ile 267'ye çıktı. Bu paketteki her tür iki kaynakla karşılaştırıldı: zehirlilik için ASPCA'nın kedi ve köpek listeleri, bakım için NC State Extension Plant Toolbox (frenk incirinde RHS). Satırların 23. sütunu doğrulama kaynağıdır; bu sütun verilen türler `needsVerification: false` ve kaynak adıyla yazılır. Kaynakların çeliştiği ya da yalnızca cins düzeyinde genel bilgi veren adaylar alınmadı.

Aynı kontrolde mevcut iki kaydın ASPCA ile çeliştiği görüldü ve düzeltildi: Fatsia japonica ve Araucaria heterophylla (ikisi de ASPCA'da kedi ve köpek için zehirsiz).

## Sıradaki adaylar

Kaynak bulunamadığı ya da kaynaklar çeliştiği için ek paket 2'ye alınmayanlar: Tropaeolum majus (latin çiçeği; ASPCA zehirsiz, NC State sorunlu diyor), Begonia × hiemalis (kış begonyası; yalnızca blog kaynakları), Ficus binnendijkii 'Alii', Kalanchoe thyrsiflora, Echeveria agavoides ve pulvinata, Philodendron gloriosum (yalnızca cins sayfası), Passiflora caerulea (çarkıfelek), Myrtus communis (mersin), Aptenia cordifolia ve Delosperma (buz çiçekleri), Gazania, Verbena, Salvia splendens, Lobelia, Calibrachoa, Nephrolepis cordifolia, Ludisia discolor, Paphiopedilum, Vanda (ASPCA listesinde yoklar).

Eski listeden henüz eklenmeyenler: Origanum onites (İzmir kekiği), Monstera obliqua, Anthurium clarinervium, Aglaonema 'Red Siam', Washingtonia filifera, Vitis (asma), Surfinia, Helichrysum, Dichondra, Nemesia.
