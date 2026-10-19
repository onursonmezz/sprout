"""Adayları NC State Extension Plant Toolbox'a göre eler.

Her aday için NC State sayfası indirilir (ncsu/ klasörüne) ve öznitelikleri
okunur. Kalan adaylar: sayfası olan VE NC State'in "Houseplant" (ev bitkisi)
ya da "Container" (saksıda yetiştirilir) diye etiketlediği türler. İstilacı
türler çıkarılır. Sonuç nc-adaylar.json'a yazılır.

    .venv/Scripts/python.exe nc-ele.py
"""
import html
import json
import re
import time
from pathlib import Path

import requests

KLASOR = Path(__file__).parent
NCSU = KLASOR / "ncsu"
NCSU.mkdir(exist_ok=True)
OTURUM = requests.Session()
OTURUM.headers["User-Agent"] = "Mozilla/5.0 (Sprout bitki veritabani)"
ALANLAR = ["Genus:", "Species:", "Family:", "Life Cycle:", "Recommended Propagation Strategy:", "Dimensions:",
           "Plant Type:", "Growth Rate:", "Light:", "Soil Texture:", "Soil Drainage:", "Soil pH:",
           "USDA Plant Hardiness Zone:", "Flower Bloom Time:", "Problems:", "Poison Severity:", "Poison Symptoms:",
           "Poison Toxic Principle:", "Causes Contact Dermatitis:", "Poison Part:", "Landscape Location:"]
DUR = re.compile(r"^[A-Z][A-Za-z /'()-]+:$")


def oku(metin):
    satirlar = [s.strip() for s in html.unescape(re.sub(r"<[^>]+>", "\n", re.sub(r"<(script|style)[\s\S]*?</\1>", "", metin))).split("\n")]
    satirlar = [s for s in satirlar if s]
    sonuc = {}
    if "Description" in satirlar:
        i = satirlar.index("Description") + 1
        d = []
        while i < len(satirlar) and not re.match(r"^(Attributes:|Quick ID|See this plant|Profile Video)", satirlar[i]):
            d.append(satirlar[i])
            i += 1
        sonuc["aciklama"] = " ".join(d)[:2500]
    for i, s in enumerate(satirlar):
        if s in ALANLAR and s[:-1] not in sonuc:
            v = []
            for j in range(i + 1, min(i + 15, len(satirlar))):
                if DUR.match(satirlar[j]) or satirlar[j].startswith("Download"):
                    break
                v.append(satirlar[j])
            sonuc[s[:-1]] = v
    return sonuc


def main():
    adaylar = json.loads((KLASOR / "adaylar.json").read_text(encoding="utf-8"))
    kalan = []
    for n, a in enumerate(adaylar):
        if a["rank"] != "species":
            continue
        slug = a["ad"].lower().replace(" ", "-").replace("×-", "x-")
        dosya = NCSU / f"{slug}.html"
        if not dosya.exists():
            try:
                r = OTURUM.get(f"https://plants.ces.ncsu.edu/plants/{slug}/", timeout=30)
                dosya.write_text(r.text if r.ok else "", encoding="utf-8")
            except requests.RequestException:
                continue
            time.sleep(0.5)
        metin = dosya.read_text(encoding="utf-8")
        if "Attributes:" not in metin:
            continue
        o = oku(metin)
        etiket = set(o.get("Plant Type", [])) | set(o.get("Landscape Location", []))
        if not ({"Houseplant", "Container", "Houseplants"} & etiket):
            continue
        if "Invasive Species" in o.get("Problems", []):
            continue
        kalan.append({**a, "nc": o, "nc_slug": slug})
        if n % 50 == 0:
            print(n, len(kalan), flush=True)
    (KLASOR / "nc-adaylar.json").write_text(json.dumps(kalan, indent=1, ensure_ascii=False), encoding="utf-8")
    print("BİTTİ", len(kalan), "aday kaldı")


if __name__ == "__main__":
    main()
