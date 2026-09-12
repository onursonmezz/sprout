/**
 * Sprout - sulama aralığı hesabı
 *
 * plants.json içindeki baseIntervalDays, şu REFERANS KOŞULLAR için geçerlidir:
 *   15 cm plastik saksı, part_sun ışık, pencereye 1 m, iç mekan, yaz, kalorifer kapalı.
 * Bu fonksiyon gerçek koşullara göre o değeri düzeltir.
 *
 * Kullanım:
 *   import db from "./plants.json";
 *   const plant = db.plants.find(p => p.id === "zamioculcas-zamiifolia");
 *   const r = wateringInterval(plant, {
 *     potMaterial: "terracotta", potDiameterCm: 12,
 *     light: "shade", windowDistanceCm: 250, indoor: true, heatingOn: true,
 *   }, db.wateringAlgorithm, new Date());
 *   // r.intervalDays -> kaç günde bir sulanacak
 *   // r.breakdown    -> hangi çarpanın ne kadar etki ettiği (UI'da göstermek için)
 */

function pickFromRanges(ranges, value) {
  for (const [limit, factor] of ranges) {
    if (value <= limit) return factor;
  }
  return ranges[ranges.length - 1][1];
}

export function wateringInterval(plant, site, algo, date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  const base = plant.water.baseIntervalDays;

  // 1. Saksı malzemesi - gözenekli malzeme daha hızlı kurur
  const fMaterial = algo.potMaterial[site.potMaterial] ?? 1.0;

  // 2. Saksı boyutu - büyük saksı suyu daha uzun tutar
  const fSize = pickFromRanges(algo.potSize, site.potDiameterCm ?? 15);

  // 3. Işık - çok ışık = çok terleme
  const fLight = algo.lightFactor[site.light] ?? 1.0;

  // 4. Pencereye uzaklık
  const fWindow = pickFromRanges(algo.windowDistance, site.windowDistanceCm ?? 100);

  // 5. Mevsim - kışın büyüme yavaşlar, aralık uzar
  const fSeason = algo.season[String(month)] ?? 1.0;

  // 6. TÜRKİYE'YE ÖZGÜ: kalorifer havayı kurutur, toprak daha hızlı kurur.
  //    Kış yavaşlamasını kısmen dengeler. Bitkinin nem hassasiyetine göre değişir.
  let fHeating = 1.0;
  const heatingSeason = algo.heatingMonths.includes(month);
  if (site.indoor !== false && site.heatingOn && heatingSeason) {
    fHeating = algo.heatingFactor[plant.heatingSensitivity] ?? 1.0;
  }

  // 7. Dışarıdaysa yaz sıcağı ek yük bindirir
  let fOutdoor = 1.0;
  if (site.indoor === false) {
    fOutdoor = algo.outdoorSummer[String(month)] ?? 1.0;
  }

  const raw = base * fMaterial * fSize * fLight * fWindow * fSeason * fHeating * fOutdoor;
  const intervalDays = Math.max(
    algo.minIntervalDays,
    Math.min(algo.maxIntervalDays, Math.round(raw))
  );

  return {
    intervalDays,
    rawDays: Number(raw.toFixed(1)),
    breakdown: [
      { key: "base",     label: "Tür için temel aralık", value: base, unit: "gün" },
      { key: "material", label: "Saksı malzemesi",       factor: fMaterial },
      { key: "size",     label: "Saksı boyutu",          factor: fSize },
      { key: "light",    label: "Işık",                  factor: fLight },
      { key: "window",   label: "Pencereye uzaklık",     factor: fWindow },
      { key: "season",   label: "Mevsim",                factor: fSeason },
      { key: "heating",  label: "Kalorifer",             factor: fHeating },
      { key: "outdoor",  label: "Dış mekan sıcaklığı",   factor: fOutdoor },
    ].filter((x) => x.factor === undefined || x.factor !== 1.0),
  };
}

/** Bir sonraki sulama tarihi. lastWatered verilmezse bugünden sayar. */
export function nextWateringDate(plant, site, algo, lastWatered, today = new Date()) {
  const { intervalDays } = wateringInterval(plant, site, algo, today);
  const from = lastWatered ? new Date(lastWatered) : today;
  const next = new Date(from);
  next.setDate(next.getDate() + intervalDays);
  return { next, intervalDays, overdueDays: Math.max(0, Math.floor((today - next) / 86400000)) };
}

/** Ölçülen lux değerinin bitki için uygunluğu - ışık ölçer ekranı için. */
export function evaluateLight(plant, measuredLux) {
  const { luxMin, luxIdeal, luxMax } = plant.light;
  if (measuredLux < luxMin * 0.5) return { status: "too_dark",  tr: "Çok karanlık" };
  if (measuredLux < luxMin)        return { status: "dim",       tr: "Yetersiz ışık" };
  if (measuredLux <= luxMax)       return { status: "ok",        tr: "Uygun" };
  return { status: "too_bright", tr: "Fazla parlak, yaprak yanığı riski" };
}

/** Saksı değişimi gerekiyor mu? */
export function repotDue(plant, lastRepotted, today = new Date()) {
  if (!lastRepotted) return { due: true, monthsSince: null };
  const months =
    (today.getFullYear() - new Date(lastRepotted).getFullYear()) * 12 +
    (today.getMonth() - new Date(lastRepotted).getMonth());
  return { due: months >= plant.repotEveryMonths, monthsSince: months };
}

/** Gübreleme bu ay yapılmalı mı? */
export function shouldFertilize(plant, today = new Date()) {
  return plant.fertilize.months.includes(today.getMonth() + 1);
}
