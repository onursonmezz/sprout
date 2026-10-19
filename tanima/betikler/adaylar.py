"""Yeni tür adaylarını iNaturalist'ten sıralar.

Saksıda/bahçede yetiştirilen (captive) ve ticari kullanıma izinli (CC0, CC BY)
fotoğrafı olan bitki türleri, gözlem sayısına göre sıralanır; veritabanında
zaten olanlar çıkarılır. Her aday için araştırma düzeyi + saksı gözlem sayısı
da yazılır (bir türü tanıyabilmek için en az ~100 uygun fotoğraf gerekir).

    .venv/Scripts/python.exe adaylar.py [kaç sayfa]
"""
import json
import sys
from pathlib import Path

from indir import iste

KLASOR = Path(__file__).parent
LISANS = "cc0,cc-by"
BITKILER = 47126  # iNaturalist: Plantae

mevcut = json.loads((KLASOR / "turler.json").read_text(encoding="utf-8"))
mevcut_takson = {t["takson"] for t in mevcut.values()}
mevcut_ad = {t["ad"].lower() for t in mevcut.values()}

sayfa_sayisi = int(sys.argv[1]) if len(sys.argv) > 1 else 3
adaylar = {}
for sayfa in range(1, sayfa_sayisi + 1):
    sonuc = iste("observations/species_counts", taxon_id=BITKILER, captive="true", photos="true",
                 photo_license=LISANS, per_page=500, page=sayfa)["results"]
    for r in sonuc:
        t = r["taxon"]
        if t["id"] in mevcut_takson or t["name"].lower() in mevcut_ad:
            continue
        adaylar[t["id"]] = {"ad": t["name"], "takson": t["id"], "rank": t["rank"], "saksi": r["count"],
                            "ingilizce": t.get("preferred_common_name", "")}
    print("sayfa", sayfa, len(adaylar), flush=True)

# Araştırma düzeyindeki (doğada, onaylı) uygun gözlem sayısını da ekle.
for i, a in enumerate(sorted(adaylar.values(), key=lambda a: -a["saksi"])[:900]):
    a["arastirma"] = iste("observations", taxon_id=a["takson"], photos="true", photo_license=LISANS,
                          quality_grade="research", per_page=0)["total_results"]
    if i % 50 == 0:
        print(i, a["ad"], a["saksi"], a["arastirma"], flush=True)

liste = sorted((a for a in adaylar.values() if "arastirma" in a), key=lambda a: -(a["saksi"] + a["arastirma"]))
(KLASOR / "adaylar.json").write_text(json.dumps(liste, indent=1, ensure_ascii=False), encoding="utf-8")
print("BİTTİ", len(liste), "aday;", sum(a["saksi"] + a["arastirma"] >= 100 for a in liste), "tanesi 100+ gözlemli")
