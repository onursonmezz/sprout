"""Sprout veritabanındaki türleri iNaturalist taksonlarıyla eşleştirir.

Sonuç turler.json'a yazılır: {tür kimliği: {ad, takson, rank, gozlem}}.
Ad tam eşleşmezse iNaturalist'in önerdiği eşanlamlı (ör. eski ad) kullanılır;
bunlar ve hiç bulunamayanlar ekrana ayrıca yazılır ki elle kontrol edilsin.

    .venv/Scripts/python.exe esle.py
"""
import json
from pathlib import Path

from indir import iste

KLASOR = Path(__file__).parent
DB = KLASOR.parent / "sprout-app" / "veri" / "plants.json"
# Veritabanındaki adın iNaturalist'te doğrudan bulunmadığı durumlar.
ELLE = {
    "phalaenopsis-hybrid": "Phalaenopsis",
    "philodendron-birkin": None,  # bir çeşit; iNaturalist'te ayrı takson yok
    "spathiphyllum-wallisii": "Spathiphyllum",
    "schlumbergera-truncata": "Schlumbergera",
    "dracaena-trifasciata": "Sansevieria trifasciata",
    "alocasia-amazonica": "Alocasia × mortfontanensis",  # "Polly"/"Amazonica" melezi
    "fuchsia-hybrida": "Fuchsia",
}


def main():
    db = json.loads(DB.read_text(encoding="utf-8"))
    sonuc, uyari = {}, []
    for p in db["plants"]:
        kimlik, ad = p["id"], p["scientificName"]
        aranacak = ELLE.get(kimlik, ad)
        if aranacak is None:
            uyari.append(f"ATLANDI  {kimlik}: iNaturalist'te karşılığı yok")
            continue
        if aranacak.endswith(" hybrid"):
            aranacak = aranacak[: -len(" hybrid")]
        bulunan = iste("taxa", q=aranacak, per_page=10)["results"]
        tam = [t for t in bulunan if t["name"].lower().replace("× ", "") == aranacak.lower().replace("× ", "")]
        t = tam[0] if tam else (bulunan[0] if bulunan else None)
        if not t:
            uyari.append(f"YOK      {kimlik}: '{aranacak}' bulunamadı")
            continue
        if not tam:
            uyari.append(f"FARKLI   {kimlik}: '{aranacak}' -> '{t['name']}' ({t['rank']}, {t.get('matched_term')})")
        sonuc[kimlik] = {"ad": t["name"], "takson": t["id"], "rank": t["rank"], "gozlem": t.get("observations_count", 0)}
        print(f"{kimlik}: {t['name']} [{t['rank']}] {t.get('observations_count')}", flush=True)
    # Bir sınıf, kendi altında kalan ve ayrı sınıf olan taksonları içermesin
    # (ör. Streptocarpus cinsi Afrika menekşesini, Dracaena reflexa marginata'yı kapsar).
    for kimlik, t in sonuc.items():
        haric = [d["takson"] for k, d in sonuc.items() if k != kimlik and d["ad"].startswith(t["ad"] + " ")]
        if haric:
            t["haric"] = haric
            uyari.append(f"HARİÇ    {kimlik}: {len(haric)} tür çıkarıldı")
    (KLASOR / "turler.json").write_text(json.dumps(sonuc, indent=1, ensure_ascii=False), encoding="utf-8")
    print("\n".join(uyari))
    print(f"EŞLEŞEN {len(sonuc)} / {len(db['plants'])}")


if __name__ == "__main__":
    main()
