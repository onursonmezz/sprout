export type WateringStatus = 'overdue' | 'dueToday' | 'upcoming';

export type CareTaskType = 'fertilize' | 'rotate' | 'mist' | 'prune';

export type CareTask = {
  type: CareTaskType;
  intervalDays: number;
  lastDoneDaysAgo: number;
};

export type JournalEntryType = 'watered' | 'newLeaf' | 'fertilized' | 'repotted' | 'note';

export type JournalEntry = {
  id: string;
  type: JournalEntryType;
  title: string;
  description: string;
  daysAgo: number;
  hasPhoto?: boolean;
};

export type Plant = {
  id: string;
  name: string;
  species: string;
  latinName: string;
  room: string;
  emoji: string;
  avatarColor: string;
  wateringAmountMl: number;
  status: WateringStatus;
  daysUntilWatering: number;
  lastWateredDaysAgo: number;
  environment: {
    light: string;
    window: string;
    hoursLight: string;
    humidity: string;
    tempC: string;
  };
  pot: {
    size: string;
    material: string;
    drainage: string;
    soil: string;
  };
  acquiredDate: string;
  care: CareTask[];
  journalNotes: JournalEntry[];
};

export const plants: Plant[] = [
  {
    id: 'fern',
    name: 'Fern',
    species: 'Boston Fern',
    latinName: 'Nephrolepis exaltata',
    room: 'Bathroom',
    emoji: '🌿',
    avatarColor: '#DDE7D2',
    wateringAmountMl: 200,
    status: 'overdue',
    daysUntilWatering: -1,
    lastWateredDaysAgo: 8,
    environment: { light: 'Medium', window: 'E-Facing', hoursLight: '3h Light', humidity: 'High', tempC: '21°C' },
    pot: { size: '18x16cm', material: 'Ceramic', drainage: 'Yes', soil: 'Peat-Based Mix' },
    acquiredDate: '02 May 2023',
    care: [
      { type: 'fertilize', intervalDays: 21, lastDoneDaysAgo: 15 },
      { type: 'rotate', intervalDays: 7, lastDoneDaysAgo: 4 },
    ],
    journalNotes: [
      {
        id: 'fern-note-1',
        type: 'newLeaf',
        title: 'New fronds',
        description: 'Several new fronds unfurling after the humidity tray helped.',
        daysAgo: 18,
      },
    ],
  },
  {
    id: 'leo',
    name: 'Leo',
    species: 'Fiddle Leaf Fig',
    latinName: 'Ficus lyrata',
    room: 'Living Room',
    emoji: '🌳',
    avatarColor: '#E4E9DA',
    wateringAmountMl: 500,
    status: 'overdue',
    daysUntilWatering: -1,
    lastWateredDaysAgo: 9,
    environment: { light: 'High', window: 'S-Facing', hoursLight: '5h Light', humidity: 'Medium', tempC: '22°C' },
    pot: { size: '25x22cm', material: 'Terracotta', drainage: 'Yes', soil: 'Standard Potting Mix' },
    acquiredDate: '14 Feb 2022',
    care: [
      { type: 'fertilize', intervalDays: 30, lastDoneDaysAgo: 22 },
      { type: 'rotate', intervalDays: 10, lastDoneDaysAgo: 11 },
    ],
    journalNotes: [
      {
        id: 'leo-note-1',
        type: 'newLeaf',
        title: 'New leaf',
        description: 'Third new leaf this year! Growing fast with the summer sun.',
        daysAgo: 30,
        hasPhoto: true,
      },
    ],
  },
  {
    id: 'ivy',
    name: 'Ivy',
    species: 'Pothos',
    latinName: 'Epipremnum aureum',
    room: 'Bedroom',
    emoji: '🍃',
    avatarColor: '#DCE9D9',
    wateringAmountMl: 250,
    status: 'dueToday',
    daysUntilWatering: 0,
    lastWateredDaysAgo: 7,
    environment: { light: 'Low', window: 'N-Facing', hoursLight: '2h Light', humidity: 'Medium', tempC: '20°C' },
    pot: { size: '15x14cm', material: 'Plastic', drainage: 'Yes', soil: 'Standard Potting Mix' },
    acquiredDate: '10 Aug 2023',
    care: [
      { type: 'fertilize', intervalDays: 21, lastDoneDaysAgo: 19 },
      { type: 'rotate', intervalDays: 14, lastDoneDaysAgo: 5 },
    ],
    journalNotes: [
      {
        id: 'ivy-note-1',
        type: 'newLeaf',
        title: 'Trailing longer',
        description: 'Vines have grown past the shelf edge, time for a trim soon.',
        daysAgo: 14,
      },
    ],
  },
  {
    id: 'pearl',
    name: 'Pearl',
    species: 'Peace Lily',
    latinName: 'Spathiphyllum wallisii',
    room: 'Bedroom',
    emoji: '🌸',
    avatarColor: '#E8F0E2',
    wateringAmountMl: 300,
    status: 'upcoming',
    daysUntilWatering: 1,
    lastWateredDaysAgo: 6,
    environment: { light: 'Low', window: 'N-Facing', hoursLight: '2h Light', humidity: 'High', tempC: '21°C' },
    pot: { size: '17x15cm', material: 'Ceramic', drainage: 'Yes', soil: 'Standard Potting Mix' },
    acquiredDate: '22 Nov 2023',
    care: [
      { type: 'fertilize', intervalDays: 21, lastDoneDaysAgo: 10 },
      { type: 'rotate', intervalDays: 7, lastDoneDaysAgo: 2 },
    ],
    journalNotes: [
      {
        id: 'pearl-note-1',
        type: 'note',
        title: 'First bloom',
        description: 'First white flower spike appeared this week.',
        daysAgo: 25,
      },
    ],
  },
  {
    id: 'bella',
    name: 'Bella',
    species: 'Swiss Cheese Plant',
    latinName: 'Monstera adansonii',
    room: 'Living Room',
    emoji: '🌱',
    avatarColor: '#DFE9D6',
    wateringAmountMl: 400,
    status: 'upcoming',
    daysUntilWatering: 2,
    lastWateredDaysAgo: 5,
    environment: { light: 'Medium', window: 'E-Facing', hoursLight: '4h Light', humidity: 'Medium', tempC: '22°C' },
    pot: { size: '20x18cm', material: 'Plastic', drainage: 'Yes', soil: 'Standard Potting Mix' },
    acquiredDate: '30 Mar 2024',
    care: [
      { type: 'fertilize', intervalDays: 30, lastDoneDaysAgo: 28 },
      { type: 'rotate', intervalDays: 10, lastDoneDaysAgo: 9 },
    ],
    journalNotes: [
      {
        id: 'bella-note-1',
        type: 'newLeaf',
        title: 'More fenestration',
        description: 'Newest leaf split into more holes than the last one.',
        daysAgo: 20,
      },
    ],
  },
  {
    id: 'ziggy',
    name: 'Ziggy',
    species: 'Zebra Plant',
    latinName: 'Aphelandra squarrosa',
    room: 'Office',
    emoji: '🪴',
    avatarColor: '#E6E2D2',
    wateringAmountMl: 250,
    status: 'upcoming',
    daysUntilWatering: 2,
    lastWateredDaysAgo: 4,
    environment: { light: 'Medium', window: 'E-Facing', hoursLight: '3h Light', humidity: 'Medium', tempC: '21°C' },
    pot: { size: '16x14cm', material: 'Ceramic', drainage: 'Yes', soil: 'Standard Potting Mix' },
    acquiredDate: '18 Jan 2024',
    care: [
      { type: 'fertilize', intervalDays: 21, lastDoneDaysAgo: 5 },
      { type: 'rotate', intervalDays: 7, lastDoneDaysAgo: 1 },
    ],
    journalNotes: [
      {
        id: 'ziggy-note-1',
        type: 'note',
        title: 'Leaf tips browning',
        description: 'A couple of leaf tips turned brown, watching the humidity.',
        daysAgo: 10,
      },
    ],
  },
  {
    id: 'sage',
    name: 'Sage',
    species: 'Snake Plant',
    latinName: 'Sansevieria trifasciata',
    room: 'Kitchen',
    emoji: '🌵',
    avatarColor: '#DEE7D8',
    wateringAmountMl: 150,
    status: 'upcoming',
    daysUntilWatering: 6,
    lastWateredDaysAgo: 12,
    environment: { light: 'Low', window: 'N-Facing', hoursLight: '1h Light', humidity: 'Low', tempC: '21°C' },
    pot: { size: '14x13cm', material: 'Terracotta', drainage: 'Yes', soil: 'Cactus Mix' },
    acquiredDate: '05 Jun 2023',
    care: [
      { type: 'fertilize', intervalDays: 60, lastDoneDaysAgo: 40 },
      { type: 'rotate', intervalDays: 21, lastDoneDaysAgo: 10 },
    ],
    journalNotes: [
      {
        id: 'sage-note-1',
        type: 'newLeaf',
        title: 'New shoot',
        description: 'A new upright leaf pushing through the soil.',
        daysAgo: 35,
      },
    ],
  },
  {
    id: 'rosie',
    name: 'Rosie',
    species: 'Succulent Mix',
    latinName: 'Echeveria spp.',
    room: 'Balcony',
    emoji: '🌻',
    avatarColor: '#EDE6D6',
    wateringAmountMl: 100,
    status: 'upcoming',
    daysUntilWatering: 4,
    lastWateredDaysAgo: 10,
    environment: { light: 'High', window: 'S-Facing', hoursLight: '6h Light', humidity: 'Low', tempC: '23°C' },
    pot: { size: '12x10cm', material: 'Terracotta', drainage: 'Yes', soil: 'Cactus Mix' },
    acquiredDate: '01 Jul 2024',
    care: [
      { type: 'fertilize', intervalDays: 45, lastDoneDaysAgo: 30 },
      { type: 'rotate', intervalDays: 14, lastDoneDaysAgo: 3 },
    ],
    journalNotes: [
      {
        id: 'rosie-note-1',
        type: 'note',
        title: 'Repositioned',
        description: 'Moved closer to the window for more direct light.',
        daysAgo: 15,
      },
    ],
  },
];

export function getPlant(id: string) {
  return plants.find((p) => p.id === id);
}
