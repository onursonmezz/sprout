"""Eğitilmiş modeli telefona uygun biçime hazırlar (1. adım: ONNX).

Modelin önüne renk normalleştirmesini, arkasına olasılık hesabını ekler; böylece
uygulama 0-255 aralığındaki RGB pikselleri doğrudan verir ve olasılıkları
doğrudan alır. Giriş: [1, 224, 224, 3] (piksel sırası satır satır RGB),
çıkış: [1, tür sayısı] olasılık.

    .venv/Scripts/python.exe disa-aktar.py [model klasörü]
"""
import json
import sys
from pathlib import Path

import timm
import torch

KLASOR = Path(__file__).parent
kaynak = KLASOR / (sys.argv[1] if len(sys.argv) > 1 else "sonuc-convnext")
cikti = KLASOR / "telefon"
cikti.mkdir(exist_ok=True)


class Telefon(torch.nn.Module):
    def __init__(self, govde):
        super().__init__()
        self.govde = govde
        self.register_buffer("ort", torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1) * 255)
        self.register_buffer("sap", torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1) * 255)

    def forward(self, x):  # x: [1, 224, 224, 3], 0-255
        x = x.permute(0, 3, 1, 2)
        return self.govde((x - self.ort) / self.sap).softmax(1)


k = torch.load(kaynak / "model.pt")
govde = timm.create_model(k["model_adi"], pretrained=False, num_classes=len(k["turler"]))
govde.load_state_dict(k["model"])
# Telefondaki TensorFlow Lite "Erf" işlemini desteklemiyor; GELU'nun tanh
# yaklaşımı onsuz hesaplanır ve sonucu neredeyse aynıdır (tflite-sina.py ile ölçülür).
# (timm kendi GELU sınıfını kullanır; adına bakarak hepsini değiştiriyoruz.)
degisen = 0
for ad, modul in list(govde.named_modules()):
    for alt_ad, alt in list(modul.named_children()):
        if "GELU" in type(alt).__name__:
            setattr(modul, alt_ad, torch.nn.GELU(approximate="tanh"))
            degisen += 1
print("değiştirilen GELU:", degisen)
model = Telefon(govde).eval()
ornek = torch.rand(1, 224, 224, 3) * 255
torch.onnx.export(model, (ornek,), cikti / "model.onnx", input_names=["foto"], output_names=["olasilik"],
                  opset_version=17, dynamo=False)
(cikti / "turler.json").write_text(json.dumps(k["turler"], ensure_ascii=False), encoding="utf-8")
print("tamam:", cikti / "model.onnx", len(k["turler"]), "tür")
