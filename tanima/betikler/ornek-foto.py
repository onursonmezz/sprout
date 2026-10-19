"""Her tür için uygulamada gösterilecek bir örnek fotoğraf seçer.

Türün eğitim fotoğrafları arasından modelin o türe en çok güvendiği (yani türü
en tipik gösteren) araştırma düzeyindeki fotoğraf seçilir, 192 px'e küçültülüp
sprout-app/assets/species/ altına yazılır. Sahip ve lisans bilgisi
sprout-app/src/data/species-photos.ts dosyasına (teşekkür sayfası için) yazılır.

    .venv/Scripts/python.exe ornek-foto.py [model klasörü]
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

import timm
import torch
from PIL import Image, ImageOps
from torchvision import transforms

KLASOR = Path(__file__).parent
UYGULAMA = KLASOR.parent / "sprout-app"
HEDEF = UYGULAMA / "assets" / "species"
HEDEF.mkdir(parents=True, exist_ok=True)
k = torch.load(KLASOR / (sys.argv[1] if len(sys.argv) > 1 else "sonuc-convnext") / "model.pt")
turler = k["turler"]
model = timm.create_model(k["model_adi"], pretrained=False, num_classes=len(turler)).cuda().eval()
model.load_state_dict(k["model"])
donusum = transforms.Compose([transforms.Resize(255), transforms.CenterCrop(224), transforms.ToTensor(),
                              transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))])

adaylar = defaultdict(list)
with open(KLASOR / "veri" / "kaynaklar.csv", encoding="utf-8") as f:
    for s in csv.DictReader(f):
        if s["kalite"] in ("research", "commons") and (KLASOR / "veri" / s["dosya"]).exists():
            adaylar[s["tur"]].append(s)

kayitlar = {}
for i, tur in enumerate(turler):
    liste = adaylar[tur][:120] or []
    en_iyi, en_iyi_p = None, -1.0
    for s in liste:
        try:
            x = donusum(ImageOps.exif_transpose(Image.open(KLASOR / "veri" / s["dosya"])).convert("RGB"))
        except Exception:
            continue
        with torch.no_grad():
            p = model(x[None].cuda()).softmax(1)[0, i].item()
        if p > en_iyi_p:
            en_iyi, en_iyi_p = s, p
    if not en_iyi:
        print("örnek bulunamadı:", tur)
        continue
    im = ImageOps.exif_transpose(Image.open(KLASOR / "veri" / en_iyi["dosya"])).convert("RGB")
    k_ = min(im.size)
    im = im.crop(((im.width - k_) // 2, (im.height - k_) // 2, (im.width + k_) // 2, (im.height + k_) // 2)).resize((192, 192), Image.LANCZOS)
    im.save(HEDEF / f"{tur}.jpg", quality=82)
    kaynak = "Wikimedia Commons" if en_iyi["kalite"] == "commons" else "iNaturalist"
    adres = en_iyi["url"] if kaynak == "Wikimedia Commons" else f"https://www.inaturalist.org/photos/{en_iyi['foto']}"
    kayitlar[tur] = {"author": en_iyi["sahip"] or "?", "license": en_iyi["lisans"].upper().replace("CC-BY", "CC BY").replace("-SA", "-SA"),
                     "source": kaynak, "url": adres}
    print(f"{tur}: %{en_iyi_p * 100:.0f} {kaynak} {en_iyi['sahip']}", flush=True)

satirlar = ["// Bu dosya bitki-tanima/ornek-foto.py tarafından üretilir; elle düzenlemeyin.",
            "// Bitki tanıma önerilerinde gösterilen örnek fotoğraflar ve sahipleri.",
            "",
            "export type SpeciesPhotoCredit = { author: string; license: string; source: string; url: string };",
            "",
            "export const SPECIES_PHOTOS: Record<string, number> = {"]
satirlar += [f"  '{t}': require('../../assets/species/{t}.jpg')," for t in kayitlar]
satirlar += ["};", "", "export const SPECIES_PHOTO_CREDITS: Record<string, SpeciesPhotoCredit> = {"]
satirlar += [f"  '{t}': {json.dumps(v, ensure_ascii=False)}," for t, v in kayitlar.items()]
satirlar += ["};", ""]
(UYGULAMA / "src" / "data" / "species-photos.ts").write_text("\n".join(satirlar), encoding="utf-8")
print("yazıldı:", len(kayitlar))
