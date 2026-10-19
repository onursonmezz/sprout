"""Adayların Türkçe adlarını Wikidata'dan bulur.

Her tür için Wikidata'da bilimsel adı (P225) eşleşen kaydın Türkçe etiketi,
Türkçe eş adları ve Türkçe Wikipedia madde başlığı alınır. Latince adın
kopyası olan etiketler Türkçe ad sayılmaz. Uydurma ad üretilmez: Türkçe adı
bulunamayan tür için alan boş kalır.

    .venv/Scripts/python.exe ad-bul.py
"""
import json
import time
from pathlib import Path

import requests

KLASOR = Path(__file__).parent
URL = "https://query.wikidata.org/sparql"
OTURUM = requests.Session()
OTURUM.headers["User-Agent"] = "Sprout-bitki-veritabani/0.1 (Turkce bitki adlari)"


def sorgu(adlar):
    degerler = " ".join(json.dumps(a) for a in adlar)
    q = f"""SELECT ?ad ?etiket ?esad ?madde WHERE {{
      VALUES ?ad {{ {degerler} }}
      ?oge wdt:P225 ?ad .
      OPTIONAL {{ ?oge rdfs:label ?etiket FILTER(lang(?etiket) = "tr") }}
      OPTIONAL {{ ?oge skos:altLabel ?esad FILTER(lang(?esad) = "tr") }}
      OPTIONAL {{ ?m schema:about ?oge ; schema:isPartOf <https://tr.wikipedia.org/> ; schema:name ?madde }}
    }}"""
    for deneme in range(4):
        try:
            r = OTURUM.get(URL, params={"query": q, "format": "json"}, timeout=90)
            r.raise_for_status()
            return r.json()["results"]["bindings"]
        except requests.RequestException:
            time.sleep(10 * (deneme + 1))
    return []


def main():
    adaylar = json.loads((KLASOR / "nc-adaylar.json").read_text(encoding="utf-8"))
    adlar = sorted({a["ad"] for a in adaylar})
    bulunan = {}
    for i in range(0, len(adlar), 40):
        for b in sorgu(adlar[i:i + 40]):
            ad = b["ad"]["value"]
            k = bulunan.setdefault(ad, {"etiket": set(), "esad": set(), "madde": set()})
            for alan in ("etiket", "esad", "madde"):
                if alan in b:
                    k[alan].add(b[alan]["value"])
        time.sleep(1)
    for a in adaylar:
        k = bulunan.get(a["ad"], {"etiket": set(), "esad": set(), "madde": set()})
        latince = a["ad"].lower()
        turkce = [x for x in sorted(k["etiket"] | k["madde"] | k["esad"])
                  if x.lower() != latince and not x.lower().startswith(latince.split()[0] + " ")]
        a["turkce"] = turkce
        a["trwiki"] = sorted(k["madde"])
    (KLASOR / "nc-adaylar.json").write_text(json.dumps(adaylar, indent=1, ensure_ascii=False), encoding="utf-8")
    print("Türkçe adı olan:", sum(bool(a["turkce"]) for a in adaylar), "/", len(adaylar))


if __name__ == "__main__":
    main()
