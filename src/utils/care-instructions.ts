import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { roomDisplayName } from '@/constants/rooms';
import { Translations } from '@/constants/translations';
import { Plant } from '@/data/plants';
import { SPECIES_PHOTOS } from '@/data/species-photos';
import { fallsOn, speciesOf } from '@/utils/care';
import { pdfPhoto } from '@/utils/pdf-photo';

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Without away dates the card covers the next two weeks; with them, the
 * whole absence up to this many days. */
const DEFAULT_DAYS = 14;
const MAX_DAYS = 60;

const dayOffset = (date: Date, today: Date) =>
  Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000
  );

/** Which plants are due on each day of the period, skipping days with nothing. */
export function sitterSchedule(plants: Plant[], start: Date | null, end: Date | null, today: Date = new Date()) {
  const from = Math.max(0, start ? dayOffset(start, today) : 0);
  const to = Math.min(from + MAX_DAYS, end ? Math.max(from, dayOffset(end, today)) : from + DEFAULT_DAYS - 1);
  const days: { date: Date; plants: Plant[] }[] = [];
  for (let offset = from; offset <= to; offset++) {
    // A plant already due before the period starts is watered on its first day.
    const due = plants.filter((p) => {
      const interval = p.customIntervalDays ?? p.wateringIntervalDays;
      return fallsOn(offset, Math.max(from, p.daysUntilWatering), interval);
    });
    if (due.length > 0) days.push({ date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset), plants: due });
  }
  return days;
}

/** What the user can add to the card in settings; empty fields print as blanks to fill in by hand. */
export type SitterExtras = { contact: string; note: string };

/** Line icons drawn inline, so the PDF needs nothing from outside. */
const ICON = {
  pin: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></g></svg>',
  drop: '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></g></svg>',
  leaf: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l7-7"/></g></svg>',
  hand: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6 7s-5-2-6.5-4.5L3 13a1.5 1.5 0 0 1 2.5-1.5L8 14"/></g></svg>',
};

/**
 * The sitter card: a printable page for whoever looks after the plants while
 * the user is away. It needs no app. A short day list comes first, then one
 * card per plant (photo, place, amount, its own watering days to tick) that
 * can be cut out and left next to the plant, then a few rules of thumb.
 * `photos` are data: URIs by plant id (see pdfPhoto); a missing one prints a
 * leaf instead.
 */
export function buildCareInstructionsHtml(
  plants: Plant[],
  t: Translations,
  start: Date | null,
  end: Date | null,
  photos: Record<string, string | null>,
  logo: string | null,
  extras: SitterExtras
) {
  const c = t.careInstructions;
  const locale = t.today.dateLocale;
  const dayName = (date: Date) => date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = (date: Date) => date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const amount = (plant: Plant) => `${plant.wateringAmountMl} ml (${t.water.approx(plant.wateringAmountMl)})`;

  const schedule = sitterSchedule(plants, start, end);
  const summary = schedule
    .map((day) => `<b>${escapeHtml(shortDate(day.date))}</b> ${escapeHtml(day.plants.map((p) => p.name).join(', '))}`)
    .join(' &middot; ');

  const cards = plants
    .map((plant) => {
      const days = schedule.filter((day) => day.plants.some((p) => p.id === plant.id));
      const photo = photos[plant.id];
      const species = plant.species !== '—' ? plant.species : '';
      return `
        <div class="card">
          ${photo ? `<img class="photo" src="${photo}" />` : `<div class="photo placeholder">${ICON.leaf}</div>`}
          <div class="body">
            <div class="name">${escapeHtml(plant.name)}</div>
            ${species ? `<div class="dim">${escapeHtml(species)}</div>` : ''}
            <div class="pills">
              <span class="pill">${ICON.pin}${escapeHtml(roomDisplayName(plant, t))}</span>
              <span class="pill">${ICON.drop}${escapeHtml(amount(plant))}</span>
            </div>
            ${plant.pot.hasDrainage ? '' : `<div class="warn">${escapeHtml(c.noDrainage)}</div>`}
            <div class="when">
              <div class="label">${escapeHtml(c.wateringDays)}</div>
              ${
                days.length > 0
                  ? days.map((day) => `<div class="task"><span class="box"></span>${escapeHtml(dayName(day.date))}</div>`).join('')
                  : `<div class="dim">${escapeHtml(c.noWateringInPeriod)}</div>`
              }
            </div>
          </div>
        </div>`;
    })
    .join('');

  const period = start && end ? `${shortDate(start)} – ${shortDate(end)}` : c.nextDays(DEFAULT_DAYS);
  const field = (label: string, value: string) =>
    `<div class="field">${escapeHtml(label)}<b>${value.trim() ? escapeHtml(value.trim()) : '&nbsp;'}</b></div>`;

  return `
    <html lang="${escapeHtml(locale)}">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 16mm 14mm; }
          body { font-family: -apple-system, Roboto, sans-serif; color: #1E2A22; font-size: 12.5px; margin: 0; }
          svg { width: 14px; height: 14px; flex-shrink: 0; }
          .head { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 2px solid #2F6B45; }
          .head .logo { width: 42px; height: 42px; border-radius: 11px; }
          .head h1 { font-size: 21px; margin: 0; }
          .head .sub { color: #5E6E62; margin-top: 2px; }
          .head .period { margin-left: auto; text-align: right; color: #5E6E62; font-size: 11px; }
          .head .period b { display: block; font-size: 14px; color: #1E2A22; white-space: nowrap; }
          h2 { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: #2F6B45; text-transform: uppercase; letter-spacing: 0.8px; margin: 18px 0 8px; }
          h2 svg { width: 16px; height: 16px; }
          .fields { display: flex; gap: 10px; margin-top: 12px; }
          .field { flex: 1; border: 1px dashed #C9C3AE; border-radius: 10px; padding: 8px 11px; color: #6B7A6E; font-size: 11px; }
          .field b { display: block; color: #1E2A22; font-size: 12.5px; margin-top: 5px; min-height: 15px; }
          .summary { line-height: 1.7; margin: 0; }
          .cut { text-align: center; color: #A3AE9F; font-size: 10px; letter-spacing: 1px; margin: 0 0 8px; }
          .cards { display: flex; flex-wrap: wrap; gap: 12px; }
          .card { width: calc(50% - 6px); box-sizing: border-box; border: 1.5px dashed #C9C3AE; border-radius: 14px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
          .photo { display: block; width: 100%; height: 150px; object-fit: cover; }
          .placeholder { background: #E3EDE2; color: #5E8C68; display: flex; align-items: center; justify-content: center; }
          .placeholder svg { width: 48px; height: 48px; }
          .body { padding: 10px 12px 12px; }
          .name { font-size: 17px; font-weight: 800; }
          .dim { color: #6B7A6E; }
          .pills { margin: 7px 0 4px; }
          .pill { display: inline-flex; align-items: center; gap: 4px; background: #EEF4EC; color: #2F6B45; border-radius: 7px; padding: 3px 7px; margin: 2px 4px 2px 0; font-weight: 600; font-size: 11.5px; }
          .warn { color: #B4562B; font-weight: 600; font-size: 11.5px; margin-top: 3px; }
          .when { border-top: 1px solid #E7E3D4; margin-top: 7px; padding-top: 7px; }
          .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #6B7A6E; margin-bottom: 5px; }
          .task { display: flex; align-items: center; gap: 8px; font-weight: 600; margin: 3px 0; }
          .box { display: inline-block; width: 13px; height: 13px; border: 1.8px solid #2F6B45; border-radius: 3px; flex-shrink: 0; }
          .tips { display: flex; flex-wrap: wrap; gap: 8px; break-inside: avoid; page-break-inside: avoid; }
          .tip { width: calc(50% - 4px); box-sizing: border-box; display: flex; gap: 8px; background: #EEF4EC; border-radius: 10px; padding: 9px 11px; line-height: 1.4; }
          .tip svg { color: #2F6B45; width: 16px; height: 16px; margin-top: 1px; }
          .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #E7E3D4; display: flex; align-items: center; gap: 7px; color: #8B9A8E; font-size: 10.5px; }
          .footer img { width: 15px; height: 15px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="head">
          ${logo ? `<img class="logo" src="${logo}" />` : ''}
          <div>
            <h1>${escapeHtml(c.title)}</h1>
            <div class="sub">${escapeHtml(c.intro(plants.length))}</div>
          </div>
          <div class="period">${escapeHtml(c.periodLabel)}<b>${escapeHtml(period)}</b></div>
        </div>
        <div class="fields">
          ${field(c.contactLabel, extras.contact)}
          ${field(c.noteLabel, extras.note)}
        </div>

        <h2>${ICON.cal}${escapeHtml(c.summaryTitle)}</h2>
        ${schedule.length > 0 ? `<p class="summary">${summary}</p>` : `<p class="summary">${escapeHtml(c.nothingDue)}</p>`}

        <h2>${ICON.leaf}${escapeHtml(c.plantsTitle)}</h2>
        <p class="cut">- - - - - - - ${escapeHtml(c.cutLine)} - - - - - - -</p>
        <div class="cards">${cards}</div>

        <h2>${ICON.hand}${escapeHtml(c.tipsTitle)}</h2>
        <div class="tips">${c.tips.map((tip) => `<div class="tip">${ICON.hand}<span>${escapeHtml(tip)}</span></div>`).join('')}</div>

        <div class="footer">${logo ? `<img src="${logo}" />` : ''}${escapeHtml(c.footer)}</div>
      </body>
    </html>
  `;
}

/** The plant's own photo if it has one, otherwise its species' example photo. */
function photoSource(plant: Plant): number | string | null {
  if (plant.photoUri) return plant.photoUri;
  return SPECIES_PHOTOS[speciesOf(plant)?.id ?? ''] ?? null;
}

export async function shareCareInstructions(plants: Plant[], t: Translations, start: Date | null, end: Date | null, extras: SitterExtras) {
  const entries = await Promise.all(
    plants.map(async (plant) => {
      const source = photoSource(plant);
      return [plant.id, source == null ? null : await pdfPhoto(source, 480)] as const;
    })
  );
  const logo = await pdfPhoto(require('../../assets/images/icon.png'), 96);
  const html = buildCareInstructionsHtml(plants, t, start, end, Object.fromEntries(entries), logo, extras);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t.careInstructions.title });
  }
}
