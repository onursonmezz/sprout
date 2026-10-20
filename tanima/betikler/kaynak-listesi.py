"""Modelin eğitiminde kullanılan fotoğrafların sahip ve lisans listesini yazar.

Uygulamadaki teşekkür sayfası GitHub'daki sprout-app/tanima/fotograf-kaynaklari.csv
dosyasına bağlanır. Yalnızca modelde bulunan türlerin, eğitime giren (CC BY-SA
olmayan) fotoğrafları listelenir.

    .venv/Scripts/python.exe kaynak-listesi.py [model klasörü]
"""
import csv
import sys
from pathlib import Path

import torch

KLASOR = Path(__file__).parent
k = torch.load(KLASOR / (sys.argv[1] if len(sys.argv) > 1 else "sonuc-convnext") / "model.pt", weights_only=False)
modelde = set(k["turler"])
hedef = KLASOR.parent / "sprout-app" / "tanima" / "fotograf-kaynaklari.csv"
sayi = 0
with open(KLASOR / "veri" / "kaynaklar.csv", encoding="utf-8") as f, open(hedef, "w", newline="", encoding="utf-8") as cikti:
    yazar = csv.writer(cikti)
    yazar.writerow(["tur", "kaynak", "sahip", "lisans", "adres"])
    for s in csv.DictReader(f):
        if s["tur"] not in modelde or "-sa" in s["lisans"].lower().replace(" ", "-"):
            continue
        if not (KLASOR / "veri" / s["dosya"]).exists():
            continue
        commons = s["kalite"] == "commons"
        adres = s["url"] if commons else f"https://www.inaturalist.org/photos/{s['foto']}"
        lisans = s["lisans"] if commons else s["lisans"].upper()
        yazar.writerow([s["tur"], "Wikimedia Commons" if commons else "iNaturalist", s["sahip"], lisans, adres])
        sayi += 1
print("yazıldı:", sayi, "fotoğraf,", len(modelde), "tür ->", hedef)
