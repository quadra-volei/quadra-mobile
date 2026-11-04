import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import type { Coords } from '@/features/matches/api/matchesApi';
import { uploadProfilePhoto } from '@/features/profile/api/profileApi';
import { ApiError } from '@/lib/api/client';
import { authorizedApiClient } from '@/lib/api/authorizedClient';

/**
 * Self-service ads (DECISIONS #200, API DECISIONS #102). A player builds an ad (where it shows,
 * around which point, for how many weeks) at the server's price; it only goes on the air once it
 * is paid and the team approved it. Store payment is not wired yet: the ad is reserved and the
 * team confirms the payment.
 */

export type AdPlacement = 'Home' | 'Map' | 'Opening';
export type AdLinkKind = 'None' | 'Arena' | 'WhatsApp' | 'Url';
export type AdPhase = 'AwaitingPayment' | 'InReview' | 'Scheduled' | 'Live' | 'Ended' | 'Rejected' | 'Cancelled';

export const PLACEMENTS: { placement: AdPlacement; label: string; caption: string }[] = [
  { placement: 'Home', label: 'Início', caption: 'Banner na tela inicial' },
  { placement: 'Map', label: 'Mapa', caption: 'Cartão no canto do mapa' },
  { placement: 'Opening', label: 'Abertura', caption: 'Cartão ao abrir o app, uma vez por semana' },
];

export const PHASE_LABELS: Record<AdPhase, string> = {
  AwaitingPayment: 'Aguardando pagamento',
  InReview: 'Em análise',
  Scheduled: 'Agendado',
  Live: 'No ar',
  Ended: 'Encerrado',
  Rejected: 'Recusado',
  Cancelled: 'Cancelado',
};

export type AdOffer = {
  placements: { placement: AdPlacement; pricePerWeekCents: number }[];
  radiusOptions: number[];
  weekOptions: number[];
  /** Counted by the server from the public games of the last 30 days: never estimated here. */
  audience: { publicGames: number; playerPresences: number; arenas: number };
  /** False while store payment is not wired: the team confirms the payment by hand. */
  paymentAvailable: boolean;
};

export type Ad = {
  id: string;
  placement: AdPlacement;
  title: string;
  body: string | null;
  photoUrl: string | null;
  linkKind: AdLinkKind;
  linkValue: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number;
  /** `YYYY-MM-DD`, Brasília. */
  startsOn: string;
  /** The day after the last one on the air. */
  endsOn: string;
  weeks: number;
  priceCents: number;
  phase: AdPhase;
  rejectionReason: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
};

/** An ad as the players around it see it. */
export type ServedAd = Pick<Ad, 'id' | 'placement' | 'title' | 'body' | 'photoUrl' | 'linkKind' | 'linkValue'>;

export type AdminAd = { advertiserId: string | null; paymentReference: string | null; ad: Ad };

export type NewAd = {
  placement: AdPlacement;
  lat: number;
  lon: number;
  radiusKm: number;
  startsOn: string;
  weeks: number;
  title: string;
  body: string | null;
  photoUri: string | null;
  linkKind: AdLinkKind;
  linkValue: string | null;
};

/** `5900` → `R$ 59`, `1990` → `R$ 19,90`. */
export function formatPrice(cents: number): string {
  const reais = cents / 100;
  return Number.isInteger(reais)
    ? `R$ ${reais.toLocaleString('pt-BR')}`
    : `R$ ${reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The price the server will charge, from the offer's weekly price; the server's figure wins. */
export function totalPriceCents(offer: AdOffer, placement: AdPlacement, weeks: number): number | null {
  const perWeek = offer.placements.find((p) => p.placement === placement)?.pricePerWeekCents;
  return perWeek == null ? null : perWeek * weeks;
}

/** `2026-11-04` → `04/11`. */
export function shortDate(isoDay: string): string {
  const [, month, day] = isoDay.split('-');
  return `${day}/${month}`;
}

/** The last day on the air (`endsOn` is the day after). */
export function lastDay(ad: Pick<Ad, 'endsOn'>): string {
  const date = new Date(`${ad.endsOn}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

const myAdsKey = ['ads', 'mine'] as const;

export function useAdOffer(coords: Coords | null, radiusKm: number) {
  return useQuery({
    queryKey: ['ads', 'offer', coords?.latitude, coords?.longitude, radiusKm] as const,
    enabled: coords != null,
    queryFn: () =>
      authorizedApiClient<AdOffer>(
        `/api/v1/ads/offer?lat=${coords!.latitude}&lon=${coords!.longitude}&radiusKm=${radiusKm}`,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useMyAds() {
  return useQuery({ queryKey: myAdsKey, queryFn: () => authorizedApiClient<Ad[]>('/api/v1/ads/mine') });
}

/** A failed ad request as a sentence the advertiser can read. */
export function adError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'Você já tem 5 anúncios esperando. Cancele um que não foi pago ou aguarde a análise.';
  }
  if (error instanceof ApiError && error.status === 400) {
    return 'Confira os dados do anúncio: a data precisa ser de hoje em diante e a foto precisa ter sido enviada.';
  }
  if (error instanceof Error && !(error instanceof ApiError)) return error.message;
  return 'Não deu certo. Tente de novo em instantes.';
}

export function useCreateAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewAd) => {
      const photoObjectKey = input.photoUri ? await uploadProfilePhoto(input.photoUri) : null;
      return authorizedApiClient<Ad>('/api/v1/ads', {
        method: 'POST',
        body: JSON.stringify({
          placement: input.placement,
          lat: input.lat,
          lon: input.lon,
          radiusKm: input.radiusKm,
          startsOn: input.startsOn,
          weeks: input.weeks,
          title: input.title,
          body: input.body,
          photoObjectKey,
          linkKind: input.linkKind,
          linkValue: input.linkKind === 'None' ? null : input.linkValue,
        }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myAdsKey }),
  });
}

export function useCancelAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authorizedApiClient<void>(`/api/v1/ads/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myAdsKey }),
  });
}

/** One ad on the air around the player for a placement; null when there is none. */
export function useServedAd(placement: AdPlacement, coords: Coords | null) {
  return useQuery({
    queryKey: ['ads', 'serve', placement, coords?.latitude, coords?.longitude] as const,
    enabled: coords != null,
    queryFn: async () =>
      (await authorizedApiClient<ServedAd | undefined>(
        `/api/v1/ads/serve?placement=${placement}&lat=${coords!.latitude}&lon=${coords!.longitude}`,
      )) ?? null,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

/** Counts a view or a tap (once per player and day on the server). Best effort: never throws. */
export async function recordAdView(id: string, kind: 'Impression' | 'Click'): Promise<void> {
  try {
    await authorizedApiClient<void>(`/api/v1/ads/${id}/views`, { method: 'POST', body: JSON.stringify({ kind }) });
  } catch {
    // A lost count is not worth bothering the player with.
  }
}

/** Where a tap on the ad leads: the advertiser's WhatsApp, site, or the map. */
export function adLinkUrl(ad: Pick<ServedAd, 'linkKind' | 'linkValue'>): string | null {
  if (ad.linkKind === 'WhatsApp' && ad.linkValue) return `https://wa.me/${ad.linkValue}`;
  if (ad.linkKind === 'Url' && ad.linkValue?.startsWith('https://')) return ad.linkValue;
  return null;
}

export function openAd(ad: ServedAd): void {
  void recordAdView(ad.id, 'Click');
  const url = adLinkUrl(ad);
  if (url) {
    void Linking.openURL(url);
  } else if (ad.linkKind === 'Arena') {
    router.push('/explore/map');
  }
}

// ── Team ──

const teamAdsKey = ['admin', 'ads'] as const;

export function useTeamAds() {
  return useQuery({ queryKey: teamAdsKey, queryFn: () => authorizedApiClient<AdminAd[]>('/api/v1/admin/ads') });
}

export function useMarkAdPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      authorizedApiClient<Ad>(`/api/v1/admin/ads/${id}/paid`, { method: 'POST', body: JSON.stringify({ note: null }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamAdsKey }),
  });
}

export function useReviewAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) =>
      authorizedApiClient<Ad>(`/api/v1/admin/ads/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ approve, reason: reason ?? null }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamAdsKey }),
  });
}
