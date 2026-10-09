import { Translations } from './translations';

/** Canonical room keys — stored on Plant instead of a translated display
 * string so a plant added in one language still shows the right room after
 * the app language changes (same reasoning as light/pot-material keys). */
export type RoomKey = 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'entrance' | 'office' | 'balcony' | 'terrace' | 'garden' | 'dining_room' | 'kids_room' | 'other';

export const ROOM_KEYS: RoomKey[] = [
  'living_room',
  'bedroom',
  'kitchen',
  'bathroom',
  'entrance',
  'office',
  'balcony',
  'terrace',
  'garden',
  'dining_room',
  'kids_room',
  'other',
];

/** Rooms that are outside. Where a plant lives — not what species it is —
 * decides whether it counts as an outdoor plant: no indoor heating, summer
 * heat applies, and rain may reach it. */
const OUTDOOR_ROOMS: RoomKey[] = ['balcony', 'terrace', 'garden'];

export function isOutdoorRoom(roomKey: RoomKey): boolean {
  return OUTDOOR_ROOMS.includes(roomKey);
}

/** "Other" carries genuinely custom user text (no translation makes sense
 * for it); every other room resolves through the current language's labels. */
export function roomDisplayName(plant: { roomKey: RoomKey; customRoom: string | null }, t: Translations): string {
  if (plant.roomKey === 'other' && plant.customRoom) return plant.customRoom;
  return t.addPlant.rooms[plant.roomKey];
}
