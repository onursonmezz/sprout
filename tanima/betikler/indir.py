"""iNaturalist'ten eğitim fotoğrafları indirir.

Tür listesi turler.json'dan gelir (esle.py üretir). Yalnızca ticari kullanıma
izin veren lisanslar (CC0, CC BY, CC BY-SA) alınır; her fotoğrafın sahibi ve
lisansı veri/kaynaklar.csv dosyasına yazılır. Yarıda kalırsa yeniden
çalıştırmak güvenlidir; inmiş dosyalar atlanır.

iNaturalist'in sınırları: API'ye dakikada ~60 istek, fotoğraflarda saatte
5 GB / günde 24 GB. Fotoğraflar saniyede en fazla 8 tane (~4 GB/saat) iner.

    .venv/Scripts/python.exe indir.py [tür başına en fazla fotoğraf]
"""
import csv
import json
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

LISANSLAR = {"cc0", "cc-by", "cc-by-sa"}
API = "https://api.inaturalist.org/v1"
KLASOR = Path(__file__).parent / "veri"
OTURUM = requests.Session()
OTURUM.headers["User-Agent"] = "Sprout-bitki-tanima/0.2 (egitim verisi)"
OTURUM.mount("https://", requests.adapters.HTTPAdapter(pool_maxsize=16))
SANIYEDE_FOTO = 8


def iste(yol, **parametre):
    for deneme in range(6):
        time.sleep(1.1)  # iNaturalist dakikada en fazla ~60 istek istiyor
        try:
            yanit = OTURUM.get(f"{API}/{yol}", params=parametre, timeout=30)
            if yanit.status_code == 429:
                time.sleep(60)
                continue
            yanit.raise_for_status()
            return yanit.json()
        except requests.RequestException as hata:
            print("  istek hatası, yeniden deneniyor:", hata, flush=True)
            time.sleep(10 * (deneme + 1))
    raise RuntimeError(f"{yol} alınamadı")


class Hiz:
    """Saniyede en fazla n işe izin verir (iş parçacıkları arasında ortak)."""

    def __init__(self, n):
        self.aralik, self.sonraki, self.kilit = 1.0 / n, time.monotonic(), threading.Lock()

    def bekle(self):
        with self.kilit:
            simdi = time.monotonic()
            self.sonraki = max(self.sonraki, simdi) + self.aralik
            bekleme = self.sonraki - self.aralik - simdi
        if bekleme > 0:
            time.sleep(bekleme)


def gozlemler(takson, **ek):
    """Fotoğraflı gözlemleri sayfa sayfa verir (en yeniden eskiye)."""
    son_id = None
    while True:
        p = dict(taxon_id=takson["takson"], photos="true", photo_license=",".join(LISANSLAR),
                 per_page=200, order_by="id", order="desc", **ek)
        if takson.get("haric"):
            p["without_taxon_id"] = ",".join(map(str, takson["haric"]))
        if son_id:
            p["id_below"] = son_id
        sonuc = iste("observations", **p)["results"]
        if not sonuc:
            return
        yield from sonuc
        son_id = sonuc[-1]["id"]


def main():
    hedef = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    turler = json.loads((KLASOR.parent / "turler.json").read_text(encoding="utf-8"))
    KLASOR.mkdir(exist_ok=True)
    kaynak_yolu = KLASOR / "kaynaklar.csv"
    yeni = not kaynak_yolu.exists()
    kaynak = open(kaynak_yolu, "a", newline="", encoding="utf-8")
    yazar = csv.writer(kaynak)
    if yeni:
        yazar.writerow(["dosya", "tur", "gozlem", "foto", "sahip", "lisans", "kalite", "url"])
    sinavda = set()
    ev = KLASOR.parent / "veri-ev" / "kaynaklar.csv"
    if ev.exists():
        with open(ev, encoding="utf-8") as f:
            sinavda = {r["gozlem"] for r in csv.DictReader(f)}
    yazim_kilidi, hiz = threading.Lock(), Hiz(SANIYEDE_FOTO)
    ozet_yolu = KLASOR / "ozet.json"
    ozet = json.loads(ozet_yolu.read_text(encoding="utf-8")) if ozet_yolu.exists() else {}

    def indir_bir(is_):
        dosya, satir, url = is_
        hiz.bekle()
        try:
            r = OTURUM.get(url, timeout=30)
            r.raise_for_status()
        except requests.RequestException:
            return False
        dosya.write_bytes(r.content)
        with yazim_kilidi:
            yazar.writerow(satir)
        return True

    with ThreadPoolExecutor(6) as havuz:
        for sira, (tur, takson) in enumerate(turler.items(), 1):
            klasor = KLASOR / "foto" / tur
            klasor.mkdir(parents=True, exist_ok=True)
            sayi = len(list(klasor.glob("*.jpg")))
            if ozet.get(tur, -1) == sayi and (sayi >= hedef or ozet.get(tur + ":bitti")):
                continue  # önceki çalıştırmada tamamlanmış
            print(f"[{sira}/{len(turler)}] {tur}: '{takson['ad']}', {sayi} fotoğraf zaten var", flush=True)
            # Önce uzmanlarca onaylanmış (araştırma düzeyi) gözlemler; yetmezse
            # saksıdaki bitkilerin en az bir kişinin daha onayladığı gözlemleri.
            isler = []

            def bosalt():
                nonlocal sayi
                sayi += sum(havuz.map(indir_bir, isler))
                isler.clear()
                kaynak.flush()

            for ek in ({"quality_grade": "research"}, {"quality_grade": "casual", "captive": "true"}):
                if sayi >= hedef:
                    break
                for g in gozlemler(takson, **ek):
                    if sayi + len(isler) >= hedef:
                        bosalt()  # bazıları inemediyse eksik kalanı sonraki gözlemler tamamlar
                        if sayi >= hedef:
                            break
                    # Araştırma düzeyi zaten onaylı. Saksıdaki bitkilerde kimsenin
                    # itiraz etmemesi yeterli (ev bitkilerinde yükleyenin verdiği ad
                    # çoğu zaman doğru). Ev sınavındaki bitkiler eğitime girmez.
                    if g.get("num_identification_disagreements", 0) > 0 or str(g["id"]) in sinavda:
                        continue
                    for foto in g["photos"][:2]:  # aynı gözlemden en fazla 2 fotoğraf
                        if sayi + len(isler) >= hedef or foto.get("license_code") not in LISANSLAR:
                            continue
                        dosya = klasor / f"{foto['id']}.jpg"
                        if dosya.exists():
                            continue
                        url = foto["url"].replace("square", "medium")
                        isler.append((dosya, [dosya.relative_to(KLASOR).as_posix(), tur, g["id"], foto["id"],
                                              g["user"]["login"], foto["license_code"], g["quality_grade"], url], url))
                    if len(isler) >= 60:
                        bosalt()
                bosalt()
            ozet[tur] = sayi
            ozet[tur + ":bitti"] = True
            ozet_yolu.write_text(json.dumps(ozet, indent=1, ensure_ascii=False), encoding="utf-8")
            print(f"  -> {sayi} fotoğraf", flush=True)
    kaynak.close()
    print("BİTTİ", flush=True)


if __name__ == "__main__":
    main()
