import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AdBanner } from '@/components/domain/AdBanner';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { FilterChip } from '@/components/ui/FilterChip';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import {
  PHASE_LABELS,
  PLACEMENTS,
  formatPrice,
  lastDay,
  shortDate,
  useReviewAd,
  useTeamAds,
  type AdminAd,
  type AdPhase,
} from '@/features/ads/api/ads';
import { ApiError } from '@/lib/api/client';

/*
 * Ads for the team (DECISIONS #200, #201; API DECISIONS #102, #103): approve or refuse an ad before
 * it goes on the air. Until store payment exists, approving also confirms the payment received by
 * hand, in one step. Only the team's accounts reach these routes; the API checks it on every call.
 */

const FILTERS: { label: string; phases: AdPhase[] }[] = [
  { label: 'Para aprovar', phases: ['AwaitingPayment', 'InReview'] },
  { label: 'Aprovados', phases: ['Scheduled', 'Live'] },
  { label: 'Todos', phases: [] },
];

const REFUSE_REASONS = ['Imagem fora das regras', 'Texto fora das regras', 'Assunto não permitido'];

function failure(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return 'Esse anúncio já mudou de situação. Atualize a lista.';
  if (error instanceof ApiError && error.status === 403) return 'Sua conta não faz parte da equipe.';
  return 'Não deu certo. Tente de novo.';
}

function TeamAdRow({ item }: { item: AdminAd }) {
  const { ad } = item;
  const review = useReviewAd();
  const busy = review.isPending;
  const onError = (error: Error) => dialog.alert('Anúncios', failure(error));
  const placement = PLACEMENTS.find((p) => p.placement === ad.placement)?.label ?? ad.placement;

  const awaitingPayment = ad.phase === 'AwaitingPayment';
  const approve = () =>
    awaitingPayment
      ? dialog.alert(
          'Aprovar anúncio?',
          `Confirme que recebeu ${formatPrice(ad.priceCents)} de "${ad.title}". Ele entra no ar na data marcada.`,
          [
            { text: 'Voltar', style: 'cancel' },
            { text: 'Aprovar', onPress: () => review.mutate({ id: ad.id, approve: true }, { onError }) },
          ],
        )
      : review.mutate({ id: ad.id, approve: true }, { onError });
  const refuse = () =>
    dialog.alert('Recusar anúncio', 'Qual o motivo? Ele aparece para o anunciante.', [
      ...REFUSE_REASONS.map((reason) => ({
        text: reason,
        onPress: () => review.mutate({ id: ad.id, approve: false, reason }, { onError }),
      })),
      { text: 'Voltar', style: 'cancel' as const },
    ]);

  return (
    <View className="gap-2 rounded-card bg-white p-4 shadow-card" testID={`team-ad-${ad.id}`}>
      <AdBanner ad={ad} preview />
      <Text className="font-body text-caption text-text-muted">
        {PHASE_LABELS[ad.phase]} · {placement} · {ad.radiusKm} km · {shortDate(ad.startsOn)} a {shortDate(lastDay(ad))} ·{' '}
        {formatPrice(ad.priceCents)}
      </Text>
      {ad.linkValue ? (
        <Text selectable className="font-body text-caption text-text-primary">
          Link: {ad.linkKind === 'WhatsApp' ? `WhatsApp ${ad.linkValue}` : ad.linkValue}
        </Text>
      ) : null}
      {item.advertiserId ? (
        <Text selectable className="font-mono text-mono text-text-muted">
          Anunciante: {item.advertiserId}
        </Text>
      ) : null}
      {awaitingPayment || ad.phase === 'InReview' ? (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="grad"
              onPress={approve}
              disabled={busy}
              testID={`team-ad-approve-${ad.id}`}
            >
              Aprovar
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="outline" onPress={refuse} disabled={busy} testID={`team-ad-refuse-${ad.id}`}>
              Recusar
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function AdsReviewScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [filter, setFilter] = useState(0);
  const ads = useTeamAds();
  const phases = FILTERS[filter]!.phases;
  const shown = (ads.data ?? []).filter((item) => phases.length === 0 || phases.includes(item.ad.phase));

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView contentContainerClassName="pb-24" contentContainerStyle={{ paddingTop: headerHeight + 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 gap-2 pb-2">
          {FILTERS.map((f, index) => (
            <FilterChip key={f.label} label={f.label} selected={filter === index} onPress={() => setFilter(index)} />
          ))}
        </ScrollView>
        {ads.isPending ? (
          <View className="mx-4 mt-2 gap-3">
            <SkeletonBlock className="h-40" />
          </View>
        ) : ads.isError ? (
          <StateMessage message="Não foi possível carregar" actionLabel="Tentar novamente" onAction={() => ads.refetch()} />
        ) : shown.length === 0 ? (
          <StateMessage message="Nenhum anúncio aqui." />
        ) : (
          <View className="mx-4 mt-2 gap-3">
            {shown.map((item) => (
              <TeamAdRow key={item.ad.id} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
      <BackHeader title="ANÚNCIOS" onHeight={setHeaderHeight} />
    </View>
  );
}
