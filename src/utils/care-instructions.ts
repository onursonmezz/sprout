import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { roomDisplayName } from '@/constants/rooms';
import { Translations } from '@/constants/translations';
import { Plant } from '@/data/plants';
import { fallsOn } from '@/utils/care';

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

/**
 * The sitter card: a printable page for whoever looks after the plants while
 * the user is away. It needs no app: a day-by-day list of which plant gets
 * how much water, then where each plant is, then a few rules of thumb.
 * Photos are left out deliberately — local file:// photo URIs do not reliably
 * load inside the WebView expo-print renders with.
 */
export function buildCareInstructionsHtml(plants: Plant[], t: Translations, start: Date | null, end: Date | null) {
  const c = t.careInstructions;
  const longDate = (date: Date) => date.toLocaleDateString(t.today.dateLocale, { weekday: 'long', day: 'numeric', month: 'long' });
  const amount = (plant: Plant) => `${plant.wateringAmountMl} ml (${t.water.approx(plant.wateringAmountMl)})`;

  const schedule = sitterSchedule(plants, start, end);
  const scheduleRows = schedule
    .map(
      (day) => `
        <tr>
          <td class="date">${escapeHtml(longDate(day.date))}</td>
          <td>${day.plants
            .map((p) => `<div class="task"><span class="box"></span><b>${escapeHtml(p.name)}</b> — ${escapeHtml(amount(p))} <span class="dim">· ${escapeHtml(roomDisplayName(p, t))}</span></div>`)
            .join('')}</td>
        </tr>`
    )
    .join('');

  const plantRows = plants
    .map(
      (plant) => `
        <div class="plant">
          <b>${escapeHtml(plant.name)}</b>
          <span class="dim">${escapeHtml([plant.species !== '—' ? plant.species : '', roomDisplayName(plant, t)].filter(Boolean).join(' · '))}</span>
          <div>${escapeHtml(c.everyDays(plant.customIntervalDays ?? plant.wateringIntervalDays))}, ${escapeHtml(amount(plant))}</div>
          ${plant.pot.hasDrainage ? '' : `<div class="warn">${escapeHtml(c.noDrainage)}</div>`}
        </div>`
    )
    .join('');

  const period = start && end ? `${longDate(start)} – ${longDate(end)}` : c.nextDays(DEFAULT_DAYS);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Roboto, sans-serif; color: #1E2A22; padding: 24px; font-size: 13px; }
          h1 { font-size: 22px; margin: 0 0 4px; }
          h2 { font-size: 15px; margin: 22px 0 8px; color: #2F6B45; }
          .subtitle { color: #6B7A6E; margin: 0 0 4px; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 8px 6px; border-top: 1px solid #E7E3D4; }
          td.date { width: 34%; font-weight: 600; }
          .task { margin-bottom: 4px; }
          .box { display: inline-block; width: 10px; height: 10px; border: 1.5px solid #6B7A6E; border-radius: 2px; margin-right: 6px; }
          .dim { color: #6B7A6E; }
          .plant { padding: 8px 0; border-top: 1px solid #E7E3D4; }
          .plant span { margin-left: 6px; }
          .warn { color: #B4562B; }
          ul { margin: 0; padding-left: 18px; }
          li { margin-bottom: 4px; }
          .footer { margin-top: 28px; color: #8B9A8E; font-size: 11px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(c.title)}</h1>
        <p class="subtitle">${escapeHtml(period)}</p>
        <p class="subtitle">${escapeHtml(c.intro(plants.length))}</p>

        <h2>${escapeHtml(c.scheduleTitle)}</h2>
        ${schedule.length > 0 ? `<table>${scheduleRows}</table>` : `<p>${escapeHtml(c.nothingDue)}</p>`}

        <h2>${escapeHtml(c.tipsTitle)}</h2>
        <ul>${c.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>

        <h2>${escapeHtml(c.plantsTitle)}</h2>
        ${plantRows}

        <p class="footer">${escapeHtml(c.footer)}</p>
      </body>
    </html>
  `;
}

export async function shareCareInstructions(plants: Plant[], t: Translations, start: Date | null, end: Date | null) {
  const html = buildCareInstructionsHtml(plants, t, start, end);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t.careInstructions.title });
  }
}
