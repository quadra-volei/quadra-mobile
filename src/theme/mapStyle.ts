import { colors } from '@/theme/colors';

// Google Maps style for every map in the app: no shops, bus stops or other
// places (our own match and arena pins are the only points), and the ground,
// water and parks in the app's palette. Street names stay, to find the court.
export const MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#DCEFB3' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: colors.bgLight }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#D6DDF5' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#B9CCF4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.textMuted }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
];
