"""Ev sınavı: saksıda, ev içinde çekilmiş fotoğraflarla modeli ölçer.

  indir: .venv/Scripts/python.exe evsinavi.py indir [tür başına adet]
  ölç:   .venv/Scripts/python.exe evsinavi.py olc [model klasörü]

Fotoğraflar iNaturalist'te "saksıda" (captive) işaretli ve en az bir kişinin
daha türünü onayladığı gözlemlerden gelir. Çoğu CC BY-NC lisanslıdır; bu
yüzden YALNIZCA SINAMADA kullanılır: eğitime girmez, uygulamaya konmaz.
Klasörü veri-ev/ ve eğitim klasöründen tamamen ayrıdır.
"""
import csv
import json
import sys
from collections import Counter
from pathlib import Path

KLASOR = Path(__file__).parent
EV = KLASOR / "veri-ev"


def indir(hedef):
    import requests

    from indir import OTURUM, iste

    turler = json.loads((KLASOR / "turler.json").read_text(encoding="utf-8"))
    egitimde = set()
    with open(KLASOR / "veri" / "kaynaklar.csv", encoding="utf-8") as f:
        egitimde = {r["gozlem"] for r in csv.DictReader(f)}
    EV.mkdir(exist_ok=True)
    yol = EV / "kaynaklar.csv"
    yeni = not yol.exists()
    kayit = open(yol, "a", newline="", encoding="utf-8")
    yazar = csv.writer(kayit)
    if yeni:
        yazar.writerow(["dosya", "tur", "gozlem", "foto", "sahip", "lisans"])
    for sira, (tur, t) in enumerate(turler.items(), 1):
        klasor = EV / tur
        klasor.mkdir(exist_ok=True)
        sayi = len(list(klasor.glob("*.jpg")))
        if sayi >= hedef:
            continue
        p = dict(taxon_id=t["takson"], photos="true", captive="true", per_page=200, order_by="votes")
        if t.get("haric"):
            p["without_taxon_id"] = ",".join(map(str, t["haric"]))
        for g in iste("observations", **p)["results"]:
            if sayi >= hedef:
                break
            # Eğitimde kullanılan bir bitki sınavda olmasın; kimse itiraz etmemiş
            # ve en az bir kişi daha onaylamış olsun.
            if str(g["id"]) in egitimde or g.get("num_identification_agreements", 0) < 1 \
                    or g.get("num_identification_disagreements", 0) > 0:
                continue
            foto = g["photos"][0]  # gözlem başına tek fotoğraf: her biri farklı bir bitki
            url = foto["url"].replace("square", "medium")
            try:
                r = OTURUM.get(url, timeout=30)
                r.raise_for_status()
            except requests.RequestException:
                continue
            dosya = klasor / f"{foto['id']}.jpg"
            dosya.write_bytes(r.content)
            yazar.writerow([dosya.relative_to(EV).as_posix(), tur, g["id"], foto["id"], g["user"]["login"],
                            foto.get("license_code") or "tum-haklari-sakli"])
            sayi += 1
        kayit.flush()
        print(f"[{sira}/{len(turler)}] {tur}: {sayi}", flush=True)
    kayit.close()


def olc(model_klasoru):
    import timm
    import torch
    from PIL import Image, ImageOps
    from torchvision import transforms

    k = torch.load(KLASOR / model_klasoru / "model.pt")
    turler = k["turler"]
    model = timm.create_model(k["model_adi"], pretrained=False, num_classes=len(turler)).cuda().eval()
    model.load_state_dict(k["model"])
    boyut = k.get("boyut", 224)
    donusum = transforms.Compose([transforms.Resize(int(boyut * 1.14)), transforms.CenterCrop(boyut), transforms.ToTensor(),
                                  transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))])
    dogru1 = dogru3 = toplam = 0
    tur_sonuc, karisan, guven_dogru, guven_yanlis = {}, Counter(), [], []
    for i, tur in enumerate(turler):
        fotolar = sorted((EV / tur).glob("*.jpg"))
        d = 0
        for f in fotolar:
            try:
                x = donusum(ImageOps.exif_transpose(Image.open(f)).convert("RGB")).unsqueeze(0).cuda()
            except Exception:
                continue
            with torch.no_grad():
                p = model(x).softmax(1)[0]
            ilk = p.topk(3).indices.tolist()
            toplam += 1
            dogru1 += ilk[0] == i
            dogru3 += i in ilk
            d += ilk[0] == i
            (guven_dogru if ilk[0] == i else guven_yanlis).append(p.max().item())
            if ilk[0] != i:
                karisan[(tur, turler[ilk[0]])] += 1
        if fotolar:
            tur_sonuc[tur] = (d, len(fotolar))
    # "Emin değilim" eşiği: güven bu değerin altındaysa uygulama seçenek sunar.
    esikler = {}
    for e in (0.3, 0.5, 0.7):
        emin = [c for c in guven_dogru if c >= e], [c for c in guven_yanlis if c >= e]
        n = len(emin[0]) + len(emin[1])
        esikler[e] = {"emin_oldugu_oran": round(n / max(1, toplam), 3), "emin_olunca_dogru": round(len(emin[0]) / max(1, n), 3)}
    sonuc = {"model": model_klasoru, "foto": toplam, "ilk1": round(dogru1 / toplam, 3), "ilk3": round(dogru3 / toplam, 3),
             "esikler": esikler, "en_cok_karisan": [f"{a} -> {b} ({n})" for (a, b), n in karisan.most_common(20)],
             "tur": {t: f"{d}/{n}" for t, (d, n) in sorted(tur_sonuc.items())}}
    (KLASOR / model_klasoru / "ev-sinavi.json").write_text(json.dumps(sonuc, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: v for k, v in sonuc.items() if k != "tur"}, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    if sys.argv[1] == "indir":
        indir(int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    else:
        olc(sys.argv[2] if len(sys.argv) > 2 else "sonuc")
