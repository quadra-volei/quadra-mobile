/**
 * A match address is stored as "<place name> · <address>" when the organizer
 * picked a place (`placeLabel`), or as typed. Splits it so screens show the
 * arena's name first and the address under it.
 */
export function splitVenue(venue: string): { name: string; address: string | null } {
  const at = venue.indexOf(' · ');
  if (at < 0) return { name: venue, address: null };
  return { name: venue.slice(0, at), address: venue.slice(at + 3) || null };
}
