"use no memo";
// The widget library turns these components into home-screen layouts by
// calling them as plain functions, so the React Compiler must leave them alone.

import { FlexWidget, IconWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget';

import { Translations } from '@/constants/translations';
import { Plant } from '@/data/plants';
import { SPECIES_PHOTOS } from '@/data/species-photos';
import { daysSinceAcquired, speciesOf, wateringOn } from '@/utils/care';

/** The widgets use the app's dark look whatever the phone's theme, as in the
 * approved draft (taslak/widget2.html). */
const C = {
  bg: 'rgba(15, 24, 19, 0.94)',
  border: 'rgba(255, 255, 255, 0.08)',
  divider: 'rgba(255, 255, 255, 0.07)',
  text: '#E6ECE7',
  sub: '#C9D4CC',
  muted: '#9FB0A4',
  green: '#8FE3A1',
  tint: '#6FBF7F',
  tintSoft: 'rgba(143, 227, 161, 0.13)',
  late: '#F2A377',
  photoBg: '#1B2C21',
  leaf: '#5E8C68',
  onTint: '#06120A',
} satisfies Record<string, ColorProp>;

/** Ionicons glyphs (assets/fonts/Ionicons.ttf), by codepoint. */
const ICON = {
  water: String.fromCodePoint(63022),
  leaf: String.fromCodePoint(62386),
  heart: String.fromCodePoint(62327),
  scan: String.fromCodePoint(62810),
  sun: String.fromCodePoint(62894),
  add: String.fromCodePoint(61699),
  check: String.fromCodePoint(61983),
  alert: String.fromCodePoint(61716),
};

const LOGO = require('../../assets/images/icon.png');

export const LINK = {
  today: 'sproutapp://',
  calendar: 'sproutapp://calendar',
  addPlant: 'sproutapp://add-plant',
  lightMeter: 'sproutapp://light-meter',
  quickScan: 'sproutapp://quick-scan',
  plant: (id: string) => `sproutapp://plant/${encodeURIComponent(id)}`,
};

const open = (uri: string) => ({ clickAction: 'OPEN_URI', clickActionData: { uri } });

/** Plants whose watering day is today or already past, most overdue first. */
export function duePlants(plants: Plant[]) {
  return plants.filter((p) => p.daysUntilWatering <= 0).sort((a, b) => a.daysUntilWatering - b.daysUntilWatering);
}

function nextUpcoming(plants: Plant[]) {
  return plants.filter((p) => p.daysUntilWatering > 0).sort((a, b) => a.daysUntilWatering - b.daysUntilWatering)[0];
}

function whenText(p: Plant, t: Translations) {
  if (p.daysUntilWatering < 0) return t.widget.late(Math.abs(p.daysUntilWatering));
  if (p.daysUntilWatering === 0) return t.widget.dueToday;
  if (p.daysUntilWatering === 1) return t.widget.tomorrow;
  return t.widget.inDays(p.daysUntilWatering);
}

function Card({ children, uri, padding = 14 }: { children: any; uri: string; padding?: number }) {
  return (
    <FlexWidget
      {...open(uri)}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundColor: C.bg,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.border,
        padding,
      }}>
      {children}
    </FlexWidget>
  );
}

function Header({ text, right }: { text: string; right?: string }) {
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
      <ImageWidget image={LOGO} imageWidth={16} imageHeight={16} radius={5} />
      <TextWidget text={text} maxLines={1} truncate="END" style={{ marginLeft: 6, fontSize: 11, color: C.muted, fontWeight: '500' }} />
      {right ? <FlexWidget style={{ flex: 1 }} /> : null}
      {right ? <TextWidget text={right} style={{ fontSize: 11, color: C.muted }} /> : null}
    </FlexWidget>
  );
}

function Thumb({ plant, size, radius }: { plant: Plant; size: number; radius: number }) {
  const photo = SPECIES_PHOTOS[speciesOf(plant)?.id ?? ''];
  if (photo) return <ImageWidget image={photo} imageWidth={size} imageHeight={size} radius={radius} resizeMode="cover" />;
  return (
    <FlexWidget
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: C.photoBg, alignItems: 'center', justifyContent: 'center' }}>
      <IconWidget icon={ICON.leaf} font="Ionicons" size={Math.round(size * 0.5)} style={{ color: C.leaf }} />
    </FlexWidget>
  );
}

function NoPlants({ t }: { t: Translations }) {
  return (
    <Card uri={LINK.addPlant}>
      <Header text="Sprout" />
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <IconWidget icon={ICON.leaf} font="Ionicons" size={26} style={{ color: C.green }} />
        <TextWidget text={t.widget.noPlants} style={{ marginTop: 6, fontSize: 14, fontWeight: '700', color: C.text }} />
        <TextWidget text={t.widget.addHint} maxLines={2} style={{ marginTop: 2, fontSize: 11, color: C.muted }} />
      </FlexWidget>
    </Card>
  );
}

/** 1, small: how many plants want water today, and which one is next. */
export function TodaySmallWidget({ plants, t }: { plants: Plant[]; t: Translations }) {
  if (plants.length === 0) return <NoPlants t={t} />;
  const due = duePlants(plants);
  const upcoming = nextUpcoming(plants);
  return (
    <Card uri={LINK.today}>
      <Header text={t.widget.today} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        {due.length > 0 ? (
          <TextWidget text={String(due.length)} style={{ fontSize: 34, fontWeight: '700', color: C.green }} />
        ) : (
          <IconWidget icon={ICON.check} font="Ionicons" size={28} style={{ color: C.green }} />
        )}
        {due.length > 0 ? (
          <TextWidget text={t.widget.dueLabel(due.length)} maxLines={2} style={{ fontSize: 12, color: C.sub }} />
        ) : (
          <TextWidget text={t.widget.allGood} maxLines={2} style={{ marginTop: 4, fontSize: 13, fontWeight: '500', color: C.text }} />
        )}
      </FlexWidget>
      {due.length > 0 ? (
        <TextWidget text={t.widget.next(due[0].name)} maxLines={1} truncate="END" style={{ fontSize: 11, color: C.muted }} />
      ) : upcoming ? (
        <TextWidget
          text={t.widget.nextLater(upcoming.name, whenText(upcoming, t).toLocaleLowerCase())}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 11, color: C.muted }}
        />
      ) : null}
    </Card>
  );
}

/** 1, medium: the first plants waiting for water, late ones in orange. */
export function TodayMediumWidget({ plants, t, height }: { plants: Plant[]; t: Translations; height: number }) {
  if (plants.length === 0) return <NoPlants t={t} />;
  const due = duePlants(plants);
  // About 36dp per row under a 20dp header, inside 14dp padding.
  const fits = Math.max(1, Math.min(4, Math.floor((height - 28 - 20) / 36)));
  const shown = due.slice(0, fits);
  const upcoming = nextUpcoming(plants);
  return (
    <Card uri={LINK.today}>
      <Header text={due.length > 0 ? t.widget.todayTitle(due.length) : t.widget.today} right={due.length > shown.length ? t.widget.more(due.length - shown.length) : undefined} />
      {due.length === 0 ? (
        <FlexWidget style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <IconWidget icon={ICON.check} font="Ionicons" size={26} style={{ color: C.green }} />
          <FlexWidget style={{ marginLeft: 10, flexDirection: 'column' }}>
            <TextWidget text={t.widget.allGood} style={{ fontSize: 14, fontWeight: '500', color: C.text }} />
            {upcoming ? (
              <TextWidget
                text={t.widget.nextLater(upcoming.name, whenText(upcoming, t).toLocaleLowerCase())}
                maxLines={1}
                truncate="END"
                style={{ marginTop: 2, fontSize: 11, color: C.muted }}
              />
            ) : null}
          </FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget style={{ width: 'match_parent', marginTop: 4, flexDirection: 'column' }}>
          {shown.map((p, i) => (
            <FlexWidget
              key={p.id}
              {...open(LINK.plant(p.id))}
              style={{
                width: 'match_parent',
                height: 36,
                flexDirection: 'row',
                alignItems: 'center',
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: C.divider,
              }}>
              <Thumb plant={p} size={30} radius={9} />
              <FlexWidget style={{ flex: 1, marginLeft: 9, flexDirection: 'column' }}>
                <TextWidget text={p.name} maxLines={1} truncate="END" style={{ fontSize: 13, fontWeight: '500', color: C.text }} />
                <TextWidget text={p.species} maxLines={1} truncate="END" style={{ fontSize: 10.5, color: C.muted }} />
              </FlexWidget>
              <TextWidget
                text={whenText(p, t)}
                style={{ marginLeft: 8, fontSize: 11, color: p.daysUntilWatering < 0 ? C.late : C.green }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </Card>
  );
}

/** 2: one chosen plant — photo, name, next watering, days together. */
export function PlantWidget({ plant, t, width }: { plant: Plant | undefined; t: Translations; width: number }) {
  if (!plant) {
    return (
      <Card uri={LINK.today}>
        <Header text="Sprout" />
        <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
          <IconWidget icon={ICON.alert} font="Ionicons" size={24} style={{ color: C.muted }} />
          <TextWidget text={t.widget.plantNotFound} style={{ marginTop: 6, fontSize: 13, fontWeight: '700', color: C.text }} />
          <TextWidget text={t.widget.plantNotFoundSub} maxLines={3} style={{ marginTop: 2, fontSize: 11, color: C.muted }} />
        </FlexWidget>
      </Card>
    );
  }
  const photo = SPECIES_PHOTOS[speciesOf(plant)?.id ?? ''];
  const together = daysSinceAcquired(plant);
  const photoWidth = Math.max(60, Math.round(width - 24));
  return (
    <Card uri={LINK.plant(plant.id)} padding={12}>
      {photo ? (
        <ImageWidget image={photo} imageWidth={photoWidth} imageHeight={58} radius={12} resizeMode="cover" />
      ) : (
        <FlexWidget
          style={{ width: 'match_parent', height: 58, borderRadius: 12, backgroundColor: C.photoBg, alignItems: 'center', justifyContent: 'center' }}>
          <IconWidget icon={ICON.leaf} font="Ionicons" size={26} style={{ color: C.leaf }} />
        </FlexWidget>
      )}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end' }}>
        <TextWidget text={plant.name} maxLines={1} truncate="END" style={{ fontSize: 14, fontWeight: '700', color: C.text }} />
        <FlexWidget style={{ marginTop: 3, flexDirection: 'row', alignItems: 'center' }}>
          <IconWidget icon={ICON.water} font="Ionicons" size={11} style={{ color: plant.daysUntilWatering < 0 ? C.late : C.green }} />
          <TextWidget
            text={whenText(plant, t)}
            maxLines={1}
            style={{ marginLeft: 4, fontSize: 11, color: plant.daysUntilWatering < 0 ? C.late : C.muted }}
          />
        </FlexWidget>
        {together != null ? (
          <FlexWidget style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center' }}>
            <IconWidget icon={ICON.heart} font="Ionicons" size={11} style={{ color: C.green }} />
            <TextWidget text={t.widget.together(together)} maxLines={1} style={{ marginLeft: 4, fontSize: 11, color: C.muted }} />
          </FlexWidget>
        ) : null}
      </FlexWidget>
    </Card>
  );
}

/** 3: the next seven days, starting today, with a dot per watering. */
export function WeekWidget({ plants, t, width }: { plants: Plant[]; t: Translations; width: number }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const watering = plants.filter((p) => wateringOn(p, offset));
    const late = offset === 0 ? watering.filter((p) => p.daysUntilWatering < 0).length : 0;
    return { offset, date, count: watering.length, late };
  });
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const colWidth = Math.max(28, Math.floor((width - 28) / 7));
  return (
    <Card uri={LINK.calendar}>
      <Header text={t.widget.weekTitle(total)} />
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {days.map((d) => (
          <FlexWidget key={d.offset} style={{ width: colWidth, flexDirection: 'column', alignItems: 'center' }}>
            <TextWidget text={t.calendar.weekdays[(d.date.getDay() + 6) % 7]} style={{ fontSize: 11, color: C.muted }} />
            <FlexWidget
              style={{
                marginTop: 4,
                width: 26,
                height: 26,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: d.offset === 0 ? C.tint : 'rgba(0, 0, 0, 0)',
              }}>
              <TextWidget text={String(d.date.getDate())} style={{ fontSize: 13, fontWeight: '700', color: d.offset === 0 ? C.onTint : C.text }} />
            </FlexWidget>
            <FlexWidget style={{ marginTop: 5, height: 6, flexDirection: 'row' }}>
              {Array.from({ length: Math.min(3, d.count) }, (_, i) => (
                <FlexWidget
                  key={i}
                  style={{ width: 6, height: 6, borderRadius: 3, marginLeft: i === 0 ? 0 : 2, backgroundColor: i < d.late ? C.late : C.tint }}
                />
              ))}
            </FlexWidget>
            <TextWidget text={d.count > 0 ? String(d.count) : '–'} style={{ marginTop: 4, fontSize: 10.5, color: C.sub }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    </Card>
  );
}

/** 4: three quick ways into the app. */
export function ShortcutsWidget({ t }: { t: Translations }) {
  const items = [
    { icon: ICON.scan, label: t.widget.scan, uri: LINK.quickScan, main: true },
    { icon: ICON.sun, label: t.widget.lightMeter, uri: LINK.lightMeter, main: false },
    { icon: ICON.add, label: t.widget.addPlant, uri: LINK.addPlant, main: false },
  ];
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: C.bg,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 6,
      }}>
      {items.map((item) => (
        <FlexWidget key={item.uri} {...open(item.uri)} style={{ flexDirection: 'column', alignItems: 'center', paddingHorizontal: 8 }}>
          <FlexWidget
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              ...(item.main
                ? { backgroundGradient: { from: C.green, to: '#3F9A58', orientation: 'TL_BR' as const } }
                : { backgroundColor: C.tintSoft }),
            }}>
            <IconWidget icon={item.icon} font="Ionicons" size={21} style={{ color: item.main ? C.onTint : C.green }} />
          </FlexWidget>
          <TextWidget text={item.label} maxLines={1} style={{ marginTop: 4, fontSize: 11, color: C.sub }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
