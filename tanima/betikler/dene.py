"""Kendi fotoğraflarımızla modeli sınar.

kendi-fotolarim/ klasörüne fotoğraf koyun. Dosya adı bitkinin türünü
söyleyebilir (ör. "deve-tabani-1.jpg"), ama gerekmez; betik her fotoğraf
için ilk 3 tahmini ve güven oranını yazar.

    .venv/Scripts/python.exe dene.py [model klasörü, varsayılan sonuc]
"""
import json
import sys
from pathlib import Path

import timm
import torch
from PIL import Image, ImageOps
from torchvision import transforms

KLASOR = Path(__file__).parent
DB = KLASOR.parent / "sprout-app" / "veri" / "plants.json"
ADLAR = {b["id"]: b["commonNamesTr"][0] for b in json.loads(DB.read_text(encoding="utf-8"))["plants"]}


def main():
    kayit = torch.load(KLASOR / (sys.argv[1] if len(sys.argv) > 1 else "sonuc") / "model.pt")
    turler = kayit["turler"]
    model = timm.create_model(kayit["model_adi"], pretrained=False, num_classes=len(turler))
    model.load_state_dict(kayit["model"])
    model.eval()
    donusum = transforms.Compose([transforms.Resize(255), transforms.CenterCrop(224), transforms.ToTensor(),
                                  transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))])
    fotolar = sorted(p for p in (KLASOR / "kendi-fotolarim").glob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if not fotolar:
        print("kendi-fotolarim klasöründe fotoğraf yok.")
    for yol in fotolar:
        resim = ImageOps.exif_transpose(Image.open(yol)).convert("RGB")
        with torch.no_grad():
            olasilik = model(donusum(resim).unsqueeze(0)).softmax(1)[0]
        ilk = olasilik.topk(3)
        satir = ", ".join(f"{ADLAR[turler[i]]} %{p * 100:.0f}" for p, i in zip(ilk.values.tolist(), ilk.indices.tolist()))
        print(f"{yol.name}: {satir}")


if __name__ == "__main__":
    main()
