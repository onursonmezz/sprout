"""İndirilen fotoğraflarla küçük bir tanıma modeli eğitir ve sınar.

Fotoğraflar gözleme (aynı bitkiye) göre ayrılır: bir bitkinin bütün
fotoğrafları ya eğitimde ya doğrulamada ya da sınavda olur. Böylece sınav
sonucu, modelin hiç görmediği bitkiler üzerindeki başarıyı gösterir.

    .venv/Scripts/python.exe egit.py [dönem sayısı] [model adı] [çıktı klasörü]
"""
import csv
import json
import random
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import timm
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms

KLASOR = Path(__file__).parent
VERI = KLASOR / "veri"
CIKTI = KLASOR / (sys.argv[3] if len(sys.argv) > 3 else "sonuc")
MODEL_ADI = sys.argv[2] if len(sys.argv) > 2 else "mobilenetv3_large_100.miil_in21k_ft_in1k"
DONEM = int(sys.argv[1]) if len(sys.argv) > 1 else 20
BOYUT = 224
TOHUM = 7
EN_AZ_FOTO = 30


def lisans_sa(lisans):
    """CC BY-SA (iNaturalist: "cc-by-sa", Commons: "CC BY-SA 4.0") eğitime alınmaz:
    "aynı lisansla paylaş" şartının bir model için anlamı hukuken belirsiz."""
    return "-sa" in lisans.lower().replace(" ", "-")


def ayir():
    """Gözlemleri %70 eğitim, %15 doğrulama, %15 sınav olarak böler."""
    gozlem = defaultdict(lambda: defaultdict(list))
    with open(VERI / "kaynaklar.csv", encoding="utf-8") as f:
        for satir in csv.DictReader(f):
            if lisans_sa(satir["lisans"]):
                continue
            yol = VERI / satir["dosya"]
            if yol.exists():
                gozlem[satir["tur"]][satir["gozlem"]].append(yol)
    # Çok az fotoğrafı olan türler güvenilir öğrenilemez; modele alınmaz.
    az = {t: sum(map(len, gozlem[t].values())) for t in gozlem if sum(map(len, gozlem[t].values())) < EN_AZ_FOTO}
    if az:
        print("az fotoğraf yüzünden alınmayanlar:", az)
    turler = sorted(t for t in gozlem if t not in az)
    parcalar = {"egitim": [], "dogrulama": [], "sinav": []}
    rnd = random.Random(TOHUM)
    for i, tur in enumerate(turler):
        anahtarlar = sorted(gozlem[tur])
        rnd.shuffle(anahtarlar)
        n = len(anahtarlar)
        sinirlar = {"egitim": anahtarlar[: int(n * 0.7)], "dogrulama": anahtarlar[int(n * 0.7): int(n * 0.85)],
                    "sinav": anahtarlar[int(n * 0.85):]}
        for parca, liste in sinirlar.items():
            for g in liste:
                parcalar[parca] += [(yol, i) for yol in gozlem[tur][g]]
    return turler, parcalar, az


class Fotolar(Dataset):
    def __init__(self, ornekler, donusum):
        self.ornekler, self.donusum = ornekler, donusum

    def __len__(self):
        return len(self.ornekler)

    def __getitem__(self, i):
        yol, etiket = self.ornekler[i]
        try:
            resim = Image.open(yol).convert("RGB")
        except Exception:
            resim = Image.new("RGB", (BOYUT, BOYUT))
        return self.donusum(resim), etiket


def degerlendir(model, yukleyici, aygit):
    model.eval()
    tahmin, gercek, ilk3 = [], [], []
    with torch.no_grad(), torch.autocast("cuda", dtype=torch.float16):
        for x, y in yukleyici:
            cikis = model(x.to(aygit))
            ilk = cikis.topk(min(3, cikis.shape[1]), dim=1).indices.cpu()
            tahmin += ilk[:, 0].tolist()
            gercek += y.tolist()
            ilk3 += [int(yy in row) for yy, row in zip(y.tolist(), ilk.tolist())]
    dogru = sum(int(a == b) for a, b in zip(tahmin, gercek))
    return dogru / len(gercek), sum(ilk3) / len(gercek), tahmin, gercek


def main():
    torch.manual_seed(TOHUM)
    turler, parcalar, alinmayan = ayir()
    print("türler:", len(turler), {k: len(v) for k, v in parcalar.items()})
    ort, sap = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)
    egitim_d = transforms.Compose([
        transforms.RandomResizedCrop(BOYUT, scale=(0.2, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(0.3, 0.3, 0.3, 0.03),
        transforms.RandomGrayscale(0.05),
        transforms.ToTensor(), transforms.Normalize(ort, sap),
        # Fotoğrafın bir kısmını kapatmak, modelin tek bir ipucuna (ör. arka plana) dayanmasını zorlaştırır.
        transforms.RandomErasing(p=0.25)])
    sinav_d = transforms.Compose([
        transforms.Resize(int(BOYUT * 1.14)), transforms.CenterCrop(BOYUT),
        transforms.ToTensor(), transforms.Normalize(ort, sap)])
    yuk = lambda parca, d, **ek: DataLoader(Fotolar(parcalar[parca], d), batch_size=64, num_workers=6,
                                             persistent_workers=True, pin_memory=True, **ek)
    # Dengeli örnekleme: çok fotoğrafı olan türler eğitime baskın çıkmasın
    # (ağırlık, türün fotoğraf sayısının karekökü ile ters orantılı).
    sayilar = Counter(e for _, e in parcalar["egitim"])
    agirlik = [sayilar[e] ** -0.5 for _, e in parcalar["egitim"]]
    ornekleyici = WeightedRandomSampler(agirlik, num_samples=len(agirlik), replacement=True)
    egitim = yuk("egitim", egitim_d, sampler=ornekleyici)
    dogrulama, sinav = yuk("dogrulama", sinav_d), yuk("sinav", sinav_d)
    lr = 2e-4 if "convnext" in MODEL_ADI or "vit" in MODEL_ADI else 6e-4

    aygit = "cuda"
    model = timm.create_model(MODEL_ADI, pretrained=True, num_classes=len(turler)).to(aygit)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.05)
    zamanlayici = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=lr, total_steps=DONEM * len(egitim), pct_start=0.15)
    kayip_f = nn.CrossEntropyLoss(label_smoothing=0.1)
    olcek = torch.amp.GradScaler()
    CIKTI.mkdir(exist_ok=True)
    eniyi, ilk_donem = 0.0, 0
    # Elektrik ya da bilgisayar kapanırsa: aynı komut kaldığı turdan devam eder.
    devam_yolu = CIKTI / "devam.pt"
    if devam_yolu.exists():
        d = torch.load(devam_yolu, weights_only=False)
        if d["model_adi"] == MODEL_ADI and d["turler"] == turler and d["donem_sayisi"] == DONEM:
            model.load_state_dict(d["model"])
            optimizer.load_state_dict(d["optimizer"])
            zamanlayici.load_state_dict(d["zamanlayici"])
            olcek.load_state_dict(d["olcek"])
            eniyi, ilk_donem = d["eniyi"], d["donem"]
            print(f"{ilk_donem}. turdan devam ediliyor", flush=True)
    baslangic = time.time()
    for donem in range(ilk_donem, DONEM):
        model.train()
        toplam = 0.0
        for x, y in egitim:
            x, y = x.to(aygit, non_blocking=True), y.to(aygit, non_blocking=True)
            with torch.autocast("cuda", dtype=torch.float16):
                kayip = kayip_f(model(x), y)
            optimizer.zero_grad(set_to_none=True)
            olcek.scale(kayip).backward()
            olcek.step(optimizer)
            olcek.update()
            zamanlayici.step()
            toplam += kayip.item()
        d1, d3, _, _ = degerlendir(model, dogrulama, aygit)
        print(f"dönem {donem + 1}/{DONEM}  kayıp {toplam / len(egitim):.3f}  doğrulama ilk-1 %{d1 * 100:.1f}  ilk-3 %{d3 * 100:.1f}  ({time.time() - baslangic:.0f} sn)", flush=True)
        if d1 > eniyi:
            eniyi = d1
            torch.save({"model": model.state_dict(), "turler": turler, "model_adi": MODEL_ADI, "boyut": BOYUT}, CIKTI / "model.pt")
        torch.save({"model": model.state_dict(), "optimizer": optimizer.state_dict(), "zamanlayici": zamanlayici.state_dict(),
                    "olcek": olcek.state_dict(), "eniyi": eniyi, "donem": donem + 1, "donem_sayisi": DONEM,
                    "turler": turler, "model_adi": MODEL_ADI}, devam_yolu.with_suffix(".tmp"))
        devam_yolu.with_suffix(".tmp").replace(devam_yolu)  # yarım yazılmış dosya kalmasın

    model.load_state_dict(torch.load(CIKTI / "model.pt")["model"])
    s1, s3, tahmin, gercek = degerlendir(model, sinav, aygit)
    tur_basari = {}
    for i, tur in enumerate(turler):
        idx = [k for k, g in enumerate(gercek) if g == i]
        tur_basari[tur] = round(sum(tahmin[k] == i for k in idx) / max(1, len(idx)), 3)
    karisan = Counter((turler[g], turler[t]) for g, t in zip(gercek, tahmin) if g != t).most_common(30)
    sonuc = {"model": MODEL_ADI, "donem": DONEM, "sinav_foto": len(gercek), "sinav_ilk1": round(s1, 3),
             "sinav_ilk3": round(s3, 3), "alinmayan": alinmayan, "tur_basari": tur_basari,
             "en_cok_karisan": [{"gercek": a, "tahmin": b, "kez": n} for (a, b), n in karisan]}
    (CIKTI / "sonuc.json").write_text(json.dumps(sonuc, indent=1, ensure_ascii=False), encoding="utf-8")
    print("SINAV", json.dumps(sonuc, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
