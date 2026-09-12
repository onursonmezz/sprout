import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Translations } from '@/constants/translations';
import { roomDisplayName } from '@/constants/rooms';
import { Plant } from '@/data/plants';

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * A printable one-pager listing every plant's watering schedule and care
 * tasks, meant for whoever waters your plants while you're away. Emoji
 * stand in for photos deliberately — local file:// photo URIs don't reliably
 * load inside the WebView expo-print uses to render HTML (a known
 * limitation, worst on iOS), so this sidesteps that entirely rather than
 * risking a broken-image PDF.
 */
export function buildCareInstructionsHtml(plants: Plant[], t: Translations, dateRangeLabel: string | null) {
  const rows = plants
    .map((plant) => {
      const careRows = plant.care
        .map(
          (task) =>
            `<li>${escapeHtml(t.plantDetail.care.taskNames[task.type])} — ${t.careInstructions.everyDays(task.intervalDays)}</li>`
        )
        .join('');
      return `
        <section class="plant">
          <h2>${escapeHtml(plant.emoji)} ${escapeHtml(plant.name)}</h2>
          <p class="meta">${escapeHtml(plant.species !== '—' ? plant.species : '')} · ${escapeHtml(roomDisplayName(plant, t))}</p>
          <p class="watering">💧 ${escapeHtml(t.careInstructions.everyDays(plant.wateringIntervalDays))} · ${plant.wateringAmountMl}ml</p>
          ${careRows ? `<ul>${careRows}</ul>` : ''}
        </section>
      `;
    })
    .join('<hr/>');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Roboto, sans-serif; color: #1E2A22; padding: 24px; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .subtitle { color: #6B7A6E; font-size: 13px; margin-bottom: 24px; }
          h2 { font-size: 17px; margin-bottom: 2px; }
          .meta { color: #6B7A6E; font-size: 13px; margin: 0 0 6px; }
          .watering { font-size: 14px; font-weight: 600; margin: 0 0 6px; }
          ul { margin: 0; padding-left: 18px; font-size: 13px; }
          hr { border: none; border-top: 1px solid #E7E3D4; margin: 16px 0; }
          .footer { margin-top: 32px; color: #8B9A8E; font-size: 11px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>🌱 ${escapeHtml(t.careInstructions.title)}</h1>
        <p class="subtitle">${escapeHtml(dateRangeLabel ?? '')}</p>
        ${rows}
        <p class="footer">${escapeHtml(t.careInstructions.footer)}</p>
      </body>
    </html>
  `;
}

export async function shareCareInstructions(plants: Plant[], t: Translations, dateRangeLabel: string | null) {
  const html = buildCareInstructionsHtml(plants, t, dateRangeLabel);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t.careInstructions.title });
  }
}
