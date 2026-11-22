import { PALETTES } from '@/theme/palette';

// Google Maps style for every map in the app: no shops, bus stops or other
// places (our own match and arena pins are the only points), and the ground,
// water and parks in the app's palette. Street names stay, to find the court.
// One style per theme (DECISIONS #203): the dark one is the night navy of the
// app, with the parks in a dim lime and the streets a step lighter than the ground.
const HIDDEN = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
];

export const MAP_STYLE = [
  ...HIDDEN,
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#DCEFB3' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: PALETTES.light.bg }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#D6DDF5' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#B9CCF4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: PALETTES.light.muted }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
];

export const MAP_STYLE_DARK = [
  ...HIDDEN,
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#1E2E1A' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#101036' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#23235E' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2E2E78' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A1440' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: PALETTES.dark.muted }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: PALETTES.dark.bg }] },
];
