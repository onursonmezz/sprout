/**
 * Sprout tür veritabanına yeni türler ekler.
 *
 *   node veri/tur-ekle.js veri/turler-ek-1.js           -> doğrular ve plants.json'a yazar
 *   node veri/tur-ekle.js veri/turler-ek-1.js --kontrol -> yalnızca doğrular, yazmaz
 *
 * Satır biçimi için turler-ek-1.js dosyasının başındaki açıklamaya bakın.
 * Bir satır hatalıysa hiçbir şey yazılmaz. Zaten veritabanında olan türler
 * (aynı id) atlanır; böylece komutu yeniden çalıştırmak zararsızdır.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(here, 'plants.json');
const [, , sourceArg, flag] = process.argv;
if (!sourceArg) {
  console.error('Kullanım: node veri/tur-ekle.js <veri dosyası> [--kontrol]');
  process.exit(1);
}

const raw = readFileSync(dbPath, 'utf8');
const db = JSON.parse(raw);
const L = db.lookups;
const rows = (await import(pathToFileURL(resolve(sourceArg)).href)).default;

const CATEGORIES = Object.keys(L.categoryTr);
const LIGHTS = Object.keys(L.lightLux);
const DRY = Object.keys(L.dryLabelTr);
const HUMIDITY = Object.keys(L.humidityLabelTr);
const SOILS = Object.keys(L.soilTr);
const SEVERITY = Object.keys(L.toxSeverityTr);
const LEVELS = ['low', 'med', 'high'];
const GROWTH = ['slow', 'med', 'fast'];
const DEFAULT_FERTILIZE_MONTHS = [4, 5, 6, 7, 8, 9];
const TOX_SOURCE = 'ASPCA zehirli/zehirsiz bitki listesi ve yayınlanmış botanik kaynaklar';
const AFFECTS = { c: 'cat', d: 'dog', h: 'human' };

const idOf = (scientific) =>
  scientific
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ×]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const errors = [];
const existingIds = new Set(db.plants.map((p) => p.id));
// Adı başka bir türle çakışan kayıt, kullanıcı adı yazınca yanlış türe eşleşir.
const nameOwner = new Map();
for (const p of db.plants) for (const n of [p.commonNameEn, ...p.commonNamesTr]) nameOwner.set(n.toLocaleLowerCase('tr-TR'), p.id);

const records = [];
let skipped = 0;
for (const row of rows) {
  const [sci, tr, en, family, category, difficulty, light, tolerated, waterDays, dry, humidity, temp, soil, repot, fert, tox, toxNote, size, growth, propagation, heating, note] = row;
  const id = idOf(sci);
  const fail = (msg) => errors.push(`${sci}: ${msg}`);
  if (row.length !== 22) fail(`22 sütun bekleniyordu, ${row.length} var`);
  if (existingIds.has(id)) {
    skipped++;
    continue;
  }
  if (records.some((r) => r.id === id)) fail('aynı tür iki kez yazılmış');
  for (const n of [en, ...tr]) {
    const key = n.toLocaleLowerCase('tr-TR');
    if (nameOwner.has(key) && nameOwner.get(key) !== id) fail(`"${n}" adı zaten ${nameOwner.get(key)} için kullanılıyor`);
    nameOwner.set(key, id);
  }
  if (!CATEGORIES.includes(category)) fail(`geçersiz kategori ${category}`);
  if (!(difficulty >= 1 && difficulty <= 5)) fail('zorluk 1-5 olmalı');
  for (const l of [light, ...tolerated]) if (!LIGHTS.includes(l)) fail(`geçersiz ışık ${l}`);
  if (!DRY.includes(dry)) fail(`geçersiz kuruma düzeyi ${dry}`);
  if (!HUMIDITY.includes(humidity)) fail(`geçersiz nem ${humidity}`);
  for (const s of soil) if (!SOILS.includes(s)) fail(`geçersiz toprak ${s}`);
  if (!GROWTH.includes(growth)) fail(`geçersiz büyüme hızı ${growth}`);
  if (!LEVELS.includes(heating)) fail(`geçersiz kalorifer hassasiyeti ${heating}`);
  const [idealMin, idealMax, survival] = temp;
  if (!(idealMin < idealMax)) fail('ideal sıcaklık aralığı ters');
  if (!(survival <= idealMin)) fail('dayanma sıcaklığı ideal minimumdan yüksek');
  if (!(waterDays >= 2 && waterDays <= 30)) fail('sulama aralığı 2-30 gün olmalı');
  if ((category === 'succulent' || category === 'cactus') && dry === 'full' && waterDays < 10) fail('tam kuruma isteyen sukulent için sulama aralığı çok kısa');
  if (humidity === 'high' && heating === 'low') fail('yüksek nem isteyen tür kalorifere duyarsız işaretlenmiş');
  const [hMin, hMax, sMin, sMax] = size;
  if (!(hMin <= hMax && sMin <= sMax)) fail('boyut aralığı ters');
  const [severity, letters = ''] = tox.split(':');
  if (!SEVERITY.includes(severity)) fail(`geçersiz toksisite ${severity}`);
  if ((severity === 'none') !== (letters === '')) fail('toksisite düzeyi ile etkilenenler uyuşmuyor');
  for (const ch of letters) if (!AFFECTS[ch]) fail(`geçersiz etkilenen ${ch}`);
  const fertilize = Array.isArray(fert) ? { months: fert[0], intervalDays: fert[1] } : { months: DEFAULT_FERTILIZE_MONTHS, intervalDays: fert };
  if (!note || !toxNote) fail('not ya da toksisite notu boş');

  const lux = L.lightLux[light] ?? {};
  records.push({
    id,
    scientificName: sci,
    commonNamesTr: tr,
    commonNameEn: en,
    family,
    category,
    categoryTr: L.categoryTr[category],
    difficulty,
    light: { preferred: light, preferredTr: L.lightLabelTr[light], tolerated, luxMin: lux.min, luxIdeal: lux.ideal, luxMax: lux.max },
    water: { baseIntervalDays: waterDays, dryLevel: dry, dryLevelTr: L.dryLabelTr[dry] },
    humidity: { level: humidity, levelTr: L.humidityLabelTr[humidity] },
    temperature: { idealMinC: idealMin, idealMaxC: idealMax, survivalMinC: survival },
    soil: { types: soil, typesTr: soil.map((s) => L.soilTr[s]) },
    repotEveryMonths: repot,
    fertilize,
    toxicity: {
      affects: [...letters].map((ch) => AFFECTS[ch]),
      toxicToCats: letters.includes('c'),
      toxicToDogs: letters.includes('d'),
      toxicToHumans: letters.includes('h'),
      severity,
      severityTr: L.toxSeverityTr[severity],
      note: toxNote,
      source: TOX_SOURCE,
      needsVerification: true,
    },
    size: { heightMinCm: hMin, heightMaxCm: hMax, spreadMinCm: sMin, spreadMaxCm: sMax },
    growthRate: growth,
    propagation,
    heatingSensitivity: heating,
    turkeyNote: note,
  });
}

if (errors.length > 0) {
  console.error(`${errors.length} hata bulundu, hiçbir şey yazılmadı:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`${records.length} yeni tür geçerli, ${skipped} tür zaten vardı.`);
if (flag === '--kontrol' || records.length === 0) process.exit(0);

// Dosyanın geri kalanına dokunmadan, yeni kayıtları bitki listesinin sonuna ekler.
const closing = raw.lastIndexOf('\n  ]');
if (closing < 0) throw new Error('plants.json içinde bitki listesinin sonu bulunamadı');
const block = records.map((r) => JSON.stringify(r, null, 2).replace(/^/gm, '    ')).join(',\n');
let next = `${raw.slice(0, closing)},\n${block}${raw.slice(closing)}`;
const total = db.plants.length + records.length;
next = next.replace(/"plantCount": \d+/, `"plantCount": ${total}`);
JSON.parse(next); // bozuk dosya yazmamak için
writeFileSync(dbPath, next);
console.log(`plants.json güncellendi: toplam ${total} tür.`);
