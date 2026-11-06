import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { Tag } from '@/components/ui/Tag';
import {
  PHASE_LABELS,
  PLACEMENTS,
  adError,
  formatPrice,
  lastDay,
  shortDate,
  useCancelAd,
  useMyAds,
  type Ad,
  type AdPhase,
} from '@/features/ads/api/ads';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { colors } from '@/theme/colors';

/*
 * "Meus anúncios" (DECISIONS #200): each ad with where it is (awaiting payment, in review, on the
 * air…), its period and price, and how many players saw it and tapped it. An ad not paid yet can
 * be cancelled here.
 */

const PHASE_TAG: Record<AdPhase, { bg: string; color: string }> = {
  AwaitingPayment: { bg: colors.warning, color: colors.surfaceDark },
  InReview: { bg: colors.bgLightAlt, color: colors.surfaceDark },
  Scheduled: { bg: colors.primary, color: colors.textOnDark },
  Live: { bg: colors.accent, color: colors.surfaceDark },
  Ended: { bg: colors.bgLightAlt, color: colors.textMuted },
  Rejected: { bg: colors.danger, color: colors.textOnDark },
  Cancelled: { bg: colors.bgLightAlt, color: colors.textMuted },
};

const PHASE_HELP: Partial<Record<AdPhase, string>> = {
  AwaitingPayment: 'Reservado. A equipe do Quadra fala com você para confirmar o pagamento.',
  InReview: 'Pago. A equipe confere o anúncio antes de colocar no ar.',
  Scheduled: 'Aprovado. Entra no ar na data marcada.',
};

function AdRow({ ad, onCancel }: { ad: Ad; onCancel: (ad: Ad) => void }) {
  const placement = PLACEMENTS.find((p) => p.placement === ad.placement)?.label ?? ad.placement;
  const help = ad.phase === 'Rejected' && ad.rejectionReason ? `Motivo: ${ad.rejectionReason}` : PHASE_HELP[ad.phase];
  return (
    <View className="rounded-card bg-white p-4 shadow-card" testID={`my-ad-${ad.id}`}>
      <View className="flex-row items-center justify-between gap-3">
        <Text numberOfLines={1} className="flex-1 font-body-extrabold text-h3 text-text-primary">
          {ad.title}
        </Text>
        <Tag bg={PHASE_TAG[ad.phase].bg} color={PHASE_TAG[ad.phase].color}>
          {PHASE_LABELS[ad.phase]}
        </Tag>
      </View>
      <Text className="mt-1 font-body text-caption text-text-muted">
        {placement} · {ad.radiusKm} km · {shortDate(ad.startsOn)} a {shortDate(lastDay(ad))} · {formatPrice(ad.priceCents)}
      </Text>
      {help ? <Text className="mt-2 font-body text-caption text-text-primary">{help}</Text> : null}
      <View className="mt-3 flex-row gap-6">
        <View>
          <Text className="font-num text-h3 text-primary">{ad.impressions}</Text>
          <Text className="font-body text-caption text-text-muted">viram</Text>
        </View>
        <View>
          <Text className="font-num text-h3 text-primary">{ad.clicks}</Text>
          <Text className="font-body text-caption text-text-muted">tocaram</Text>
        </View>
      </View>
      {ad.phase === 'AwaitingPayment' ? (
        <View className="mt-2 items-start">
          <Button variant="ghost" onPress={() => onCancel(ad)} testID={`my-ad-cancel-${ad.id}`}>
            Cancelar anúncio
          </Button>
        </View>
      ) : null}
    </View>
  );
}

export default function MyAdsScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const ads = useMyAds();
  const cancel = useCancelAd();
  useRefreshOnFocus(() => ads.refetch());

  const onCancel = (ad: Ad) =>
    dialog.alert('Cancelar anúncio?', `"${ad.title}" sai da lista de reservas.`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar anúncio',
        style: 'destructive',
        onPress: () => cancel.mutate(ad.id, { onError: (error) => dialog.alert('Não deu certo', adError(error)) }),
      },
    ]);

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView contentContainerClassName="pb-24" contentContainerStyle={{ paddingTop: headerHeight + 16 }}>
        <View className="mx-4">
          <Button variant="grad" onPress={() => router.push('/ads/new')} testID="my-ads-new">
            Criar anúncio
          </Button>
        </View>
        {ads.isPending ? (
          <View className="mx-4 mt-4 gap-3">
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-32" />
          </View>
        ) : ads.isError ? (
          <StateMessage message="Não foi possível carregar" actionLabel="Tentar novamente" onAction={() => ads.refetch()} />
        ) : ads.data.length === 0 ? (
          <StateMessage message="Você ainda não anunciou. Mostre sua arena, aula ou loja para quem joga perto de você." />
        ) : (
          <View className="mx-4 mt-4 gap-3">
            {ads.data.map((ad) => (
              <AdRow key={ad.id} ad={ad} onCancel={onCancel} />
            ))}
          </View>
        )}
      </ScrollView>
      <BackHeader title="MEUS ANÚNCIOS" onHeight={setHeaderHeight} />
    </View>
  );
}
