"""Telefon modelini (.tflite) ev sınavının bir bölümüyle sınar.

Fotoğraf, uygulamanın yapacağı gibi hazırlanır: ortadan kısa kenarın %88'i
kadar bir kare kesilir, 224x224'e küçültülür, 0-255 RGB olarak verilir.

    .venv-tf/Scripts/python.exe tflite-sina.py <model.tflite> [fotoğraf sayısı]
"""
import json
import random
import sys
from pathlib import Path

import numpy as np
from ai_edge_litert.interpreter import Interpreter
from PIL import Image, ImageOps

KLASOR = Path(__file__).parent
turler = json.loads((KLASOR / "telefon" / "turler.json").read_text(encoding="utf-8"))
yorumlayici = Interpreter(model_path=sys.argv[1], num_threads=8)
yorumlayici.allocate_tensors()
giris, cikis = yorumlayici.get_input_details()[0], yorumlayici.get_output_details()[0]
print("giriş", giris["shape"], giris["dtype"], "çıkış", cikis["shape"])


def hazirla(yol):
    im = ImageOps.exif_transpose(Image.open(yol)).convert("RGB")
    w, h = im.size
    k = min(w, h) * 224 / 255
    sol, ust = (w - k) / 2, (h - k) / 2
    im = im.resize((224, 224), Image.BILINEAR, box=(sol, ust, sol + k, ust + k))
    return np.asarray(im, dtype=np.float32)[None]


ornekler = [(f, i) for i, t in enumerate(turler) for f in sorted((KLASOR / "veri-ev" / t).glob("*.jpg"))]
random.Random(1).shuffle(ornekler)
ornekler = ornekler[: int(sys.argv[2]) if len(sys.argv) > 2 else 800]
d1 = d3 = 0
for f, i in ornekler:
    yorumlayici.set_tensor(giris["index"], hazirla(f))
    yorumlayici.invoke()
    p = yorumlayici.get_tensor(cikis["index"])[0]
    ilk = np.argsort(-p)[:3]
    d1 += ilk[0] == i
    d3 += i in ilk
print(f"{Path(sys.argv[1]).name}: {len(ornekler)} fotoğraf, ilk tahmin %{100 * d1 / len(ornekler):.1f}, ilk 3 %{100 * d3 / len(ornekler):.1f}, olasılık toplamı {p.sum():.3f}")
