import { dialog } from '@/components/ui/Dialog';
import { findArenaToConfirm } from '@/features/explore/api/venues';

/**
 * After a place is picked in the create or edit form: when an approved arena is within 100 m and
 * the place is not one of its own entries, asks "É no …?" and hands the arena to `onConfirm` on
 * "Sim" (API DECISIONS #92). The address the organizer picked stays as it is; distance alone never
 * links the game.
 */
export async function confirmArenaAt(
  coords: { latitude: number; longitude: number },
  placeId: string,
  onConfirm: (arenaId: string) => void,
): Promise<void> {
  const arena = await findArenaToConfirm(coords, placeId);
  if (!arena) return;
  dialog.alert(`É no ${arena.name}?`, 'Assim a partida aparece nessa arena no mapa.', [
    { text: 'Não', style: 'cancel' },
    { text: 'Sim', onPress: () => onConfirm(arena.id) },
  ]);
}
