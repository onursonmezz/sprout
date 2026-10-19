"""Wikimedia Commons'tan ek eğitim fotoğrafları indirir.

Fotoğrafı az olan türler için (varsayılan: 300'den az) türün Commons
kategorisindeki ve bir alt düzeydeki fotoğraflar alınır. Yalnızca ticari
kullanıma izin veren lisanslar (CC0, kamu malı, CC BY, CC BY-SA); çizimler,
herbaryum örnekleri ve haritalar atlanır. Kaynak veri/kaynaklar.csv'ye
"commons" kalitesiyle yazılır (gözlem sütunu: dosya adı).

    .venv/Scripts/python.exe commons.py [eşik]
"""
import csv
import json
import re
import sys
import time
from pathlib import Path

import requests

KLASOR = Path(__file__).parent
VERI = KLASOR / "veri"
API = "https://commons.wikimedia.org/w/api.php"
OTURUM = requests.Session()
OTURUM.headers["User-Agent"] = "Sprout-bitki-tanima/0.2 (egitim verisi)"
DB = KLASOR.parent / "sprout-app" / "veri" / "plants.json"
UYGUN = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? ?\d|cc-by(-sa)?-\d)", re.I)
ATLA = re.compile(r"herbari|illustrat|drawing|botanical|plate|map|distribution|\.svg|\.tif|\.pdf|seed|pollen|microscop|stamp", re.I)


def iste(**p):
    for deneme in range(5):
        time.sleep(0.5)
        try:
            r = OTURUM.get(API, params=dict(format="json", **p), timeout=30)
            r.raise_for_status()
            return r.json()
        except (requests.RequestException, ValueError):
            time.sleep(10 * (deneme + 1))
    return {}


def kategori_dosyalari(kategori, derinlik=1):
    dosyalar = []
    for tip in ("file", "subcat") if derinlik else ("file",):
        devam = {}
        while True:
            j = iste(action="query", list="categorymembers", cmtitle=kategori, cmtype=tip, cmlimit=500, **devam)
            for m in j.get("query", {}).get("categorymembers", []):
                if tip == "file":
                    dosyalar.append(m["title"])
                elif not ATLA.search(m["title"]):
                    dosyalar += kategori_dosyalari(m["title"], derinlik - 1)
            if "continue" not in j:
                break
            devam = {"cmcontinue": j["continue"]["cmcontinue"]}
    return dosyalar


def main():
    esik = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    turler = json.loads((KLASOR / "turler.json").read_text(encoding="utf-8"))
    db_ad = {p["id"]: p["scientificName"] for p in json.loads(DB.read_text(encoding="utf-8"))["plants"]}
    ozet = json.loads((VERI / "ozet.json").read_text(encoding="utf-8"))
    yazar = csv.writer(open(VERI / "kaynaklar.csv", "a", newline="", encoding="utf-8"))
    for tur, t in turler.items():
        klasor = VERI / "foto" / tur
        once = len(list(klasor.glob("*.jpg")))
        if once >= esik:
            continue
        adlar = {t["ad"], db_ad.get(tur, t["ad"])}
        basliklar = sorted({d for ad in adlar for d in kategori_dosyalari("Category:" + ad)})
        basliklar = [b for b in basliklar if b.lower().endswith((".jpg", ".jpeg")) and not ATLA.search(b)]
        eklenen = 0
        for i in range(0, len(basliklar), 50):
            j = iste(action="query", titles="|".join(basliklar[i:i + 50]), prop="imageinfo",
                     iiprop="url|extmetadata", iiurlwidth=500)
            for sayfa in j.get("query", {}).get("pages", {}).values():
                bilgi = (sayfa.get("imageinfo") or [{}])[0]
                meta = bilgi.get("extmetadata", {})
                lisans = meta.get("LicenseShortName", {}).get("value", "")
                if not UYGUN.match(lisans.strip()) or "nc" in lisans.lower() or "nd" in lisans.lower():
                    continue
                dosya = klasor / f"commons-{sayfa['pageid']}.jpg"
                if dosya.exists():
                    continue
                try:
                    r = OTURUM.get(bilgi["thumburl"], timeout=30)
                    r.raise_for_status()
                except (requests.RequestException, KeyError):
                    continue
                dosya.write_bytes(r.content)
                sahip = re.sub("<[^>]+>", "", meta.get("Artist", {}).get("value", "")).strip()[:120]
                yazar.writerow([dosya.relative_to(VERI).as_posix(), tur, "commons:" + sayfa["title"], sayfa["pageid"],
                                sahip, lisans, "commons", bilgi.get("descriptionurl", "")])
                eklenen += 1
                time.sleep(0.3)
        ozet[tur] = once + eklenen
        print(f"{tur}: {once} + {eklenen} commons", flush=True)
    (VERI / "ozet.json").write_text(json.dumps(ozet, indent=1, ensure_ascii=False), encoding="utf-8")
    print("BİTTİ")


if __name__ == "__main__":
    main()
