import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AdBanner } from '@/components/domain/AdBanner';
import { CoverPicker } from '@/components/domain/CoverPicker';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { dialog } from '@/components/ui/Dialog';
import { FilterChip } from '@/components/ui/FilterChip';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { TextField } from '@/components/ui/TextField';
import {
  PLACEMENTS,
  adError,
  formatPrice,
  totalPriceCents,
  useAdOffer,
  useCreateAd,
  type AdOffer,
} from '@/features/ads/api/ads';
import {
  AD_BODY_MAX,
  AD_TITLE_MAX,
  brasiliaToday,
  newAdSchema,
  toIsoDay,
  toMasked,
  whatsAppDigits,
  type NewAdInput,
} from '@/features/ads/schema/newAd';
import { useDeviceLocation } from '@/features/matches/lib/useDeviceCoords';
import { colors } from '@/theme/colors';

/*
 * "Anunciar" (DECISIONS #200, API DECISIONS #102): where the ad shows, around the player's
 * position, from which day and for how many weeks, and what it says. The price and the area's
 * numbers come from the server. Saving reserves the ad; it goes on the air only once it is paid and
 * the team approved it.
 */

const DEFAULT_CENTER = { latitude: -23.5605, longitude: -46.6433 };
// Card shadow and selected colors inline, never a toggled className (DECISIONS #87).
const SHADOW_CARD = '0 2px 12px rgba(10,10,60,0.06)';

function SectionLabel({ children }: { children: string }) {
  return <Text className="font-body-bold text-eyebrow text-text-muted uppercase px-4 mt-6 mb-2">{children}</Text>;
}

function Audience({ offer }: { offer: AdOffer }) {
  const { publicGames, playerPresences, arenas } = offer.audience;
  return (
    <View className="mx-4 mt-3 rounded-card bg-surface-dark p-4" testID="ad-audience">
      <Text className="font-body-bold text-eyebrow text-white/70 uppercase">Nesta área, últimos 30 dias</Text>
      <View className="mt-2 flex-row">
        {[
          { value: publicGames, label: 'partidas públicas' },
          { value: playerPresences, label: 'presenças' },
          { value: arenas, label: 'arenas no mapa' },
        ].map((item) => (
          <View key={item.label} className="flex-1">
            <Text className="font-num text-h2 text-accent">{item.value}</Text>
            <Text className="font-body text-caption text-white/70">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function NewAdScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const location = useDeviceLocation();
  const center = location.coords ?? DEFAULT_CENTER;
  const create = useCreateAd();

  const { control, handleSubmit, setValue } = useForm<NewAdInput>({
    resolver: zodResolver(newAdSchema),
    defaultValues: {
      placement: 'Home',
      radiusKm: 10,
      weeks: 1,
      startsOn: toMasked(brasiliaToday()),
      title: '',
      body: '',
      linkKind: 'WhatsApp',
      linkValue: '',
    },
  });
  const [placement, radiusKm, weeks, title, body, linkKind] = useWatch({
    control,
    name: ['placement', 'radiusKm', 'weeks', 'title', 'body', 'linkKind'],
  });
  const offer = useAdOffer(location.resolved ? center : null, radiusKm);
  const total = offer.data ? totalPriceCents(offer.data, placement, weeks) : null;

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      dialog.alert('Sem acesso às fotos', 'Libere o acesso às fotos nas configurações do celular.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const submit = handleSubmit((input) => {
    create.mutate(
      {
        placement: input.placement,
        lat: center.latitude,
        lon: center.longitude,
        radiusKm: input.radiusKm,
        startsOn: toIsoDay(input.startsOn)!,
        weeks: input.weeks,
        title: input.title,
        body: input.body || null,
        photoUri,
        linkKind: input.linkKind,
        linkValue: input.linkKind === 'WhatsApp' ? whatsAppDigits(input.linkValue) : input.linkValue,
      },
      {
        onSuccess: () => {
          dialog.alert(
            'Anúncio reservado',
            'O pagamento pela loja chega em breve. Enquanto isso, a equipe do Quadra fala com você para confirmar o pagamento. O anúncio só vai ao ar depois de pago e aprovado.',
            [{ text: 'Ver meus anúncios', onPress: () => router.replace('/ads') }],
          );
        },
        onError: (error) => dialog.alert('Não foi possível reservar', adError(error)),
      },
    );
  });

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView
        contentContainerClassName="pb-24"
        contentContainerStyle={{ paddingTop: headerHeight }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mx-4 mt-2 font-body text-body text-text-muted">
          Mostre sua arena, aula, loja ou torneio para quem joga vôlei perto de você.
        </Text>

        <SectionLabel>Onde aparece</SectionLabel>
        <View className="mx-4 gap-2">
          {PLACEMENTS.map((option) => {
            const selected = option.placement === placement;
            const price = offer.data?.placements.find((p) => p.placement === option.placement)?.pricePerWeekCents;
            return (
              <Pressable
                key={option.placement}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option.label}. ${option.caption}`}
                onPress={() => setValue('placement', option.placement)}
                testID={`ad-placement-${option.placement}`}
                className="flex-row items-center rounded-card bg-white px-4 py-3"
                style={selected ? { backgroundColor: colors.primary } : { boxShadow: SHADOW_CARD }}
              >
                <View className="flex-1">
                  <Text className="font-body-extrabold text-h3" style={{ color: selected ? colors.textOnDark : colors.surfaceDark }}>
                    {option.label}
                  </Text>
                  <Text className="font-body text-caption" style={{ color: selected ? colors.textOnDark : colors.textMuted }}>
                    {option.caption}
                  </Text>
                </View>
                {price != null ? (
                  <Text className="font-num text-body" style={{ color: selected ? colors.accent : colors.primary }}>
                    {formatPrice(price)}/sem
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>Área</SectionLabel>
        <Text className="mx-4 font-body text-caption text-text-muted">
          {location.coords
            ? 'Em volta de onde você está agora.'
            : 'Sem sua localização: em volta do centro de São Paulo.'}
        </Text>
        <View className="mx-4 mt-2 flex-row gap-2">
          {(offer.data?.radiusOptions ?? [5, 10, 20]).map((km) => (
            <FilterChip
              key={km}
              label={`${km} km`}
              selected={radiusKm === km}
              onPress={() => setValue('radiusKm', km)}
              testID={`ad-radius-${km}`}
            />
          ))}
        </View>
        {offer.isPending ? (
          <SkeletonBlock className="mx-4 mt-3 h-24" />
        ) : offer.isError ? (
          <StateMessage message="Não foi possível carregar os preços" actionLabel="Tentar novamente" onAction={() => offer.refetch()} />
        ) : (
          <Audience offer={offer.data} />
        )}

        <SectionLabel>Quando</SectionLabel>
        <View className="mx-4">
          <Controller
            control={control}
            name="startsOn"
            render={({ field, fieldState }) => (
              <DateField label="Começa em" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} testID="ad-starts-on" />
            )}
          />
        </View>
        <View className="mx-4 mt-3 flex-row gap-2">
          {(offer.data?.weekOptions ?? [1, 2, 4]).map((w) => (
            <FilterChip
              key={w}
              label={w === 1 ? '1 semana' : `${w} semanas`}
              selected={weeks === w}
              onPress={() => setValue('weeks', w)}
              testID={`ad-weeks-${w}`}
            />
          ))}
        </View>

        <SectionLabel>Seu anúncio</SectionLabel>
        <View className="mx-4 gap-3">
          <CoverPicker
            uri={photoUri ?? undefined}
            onPress={pickPhoto}
            subject={{ add: 'Adicionar foto (opcional)', a11y: 'foto do anúncio' }}
            testID="ad-photo"
          />
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <TextField
                label="Título"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Ex.: Arena Sol, day use R$ 30"
                maxLength={AD_TITLE_MAX}
                error={fieldState.error?.message}
                testID="ad-title"
              />
            )}
          />
          <Controller
            control={control}
            name="body"
            render={({ field, fieldState }) => (
              <TextField
                label="Texto (opcional)"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Ex.: Quadras de areia abertas até 23h"
                maxLength={AD_BODY_MAX}
                error={fieldState.error?.message}
                testID="ad-body"
              />
            )}
          />
          <Text className="font-body-bold text-eyebrow text-text-muted uppercase mt-1">Ao tocar no anúncio</Text>
          <View className="flex-row gap-2">
            {(
              [
                { kind: 'WhatsApp', label: 'Abre seu WhatsApp' },
                { kind: 'Url', label: 'Abre seu site' },
                { kind: 'None', label: 'Nada' },
              ] as const
            ).map((option) => (
              <FilterChip
                key={option.kind}
                label={option.label}
                selected={linkKind === option.kind}
                onPress={() => setValue('linkKind', option.kind)}
                testID={`ad-link-${option.kind}`}
              />
            ))}
          </View>
          {linkKind !== 'None' ? (
            <Controller
              control={control}
              name="linkValue"
              render={({ field, fieldState }) => (
                <TextField
                  label={linkKind === 'WhatsApp' ? 'WhatsApp com DDD' : 'Endereço do site'}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={linkKind === 'WhatsApp' ? '11 99999-8888' : 'https://'}
                  autoCapitalize="none"
                  error={fieldState.error?.message}
                  testID="ad-link-value"
                />
              )}
            />
          ) : null}
        </View>

        <SectionLabel>Prévia</SectionLabel>
        <View className="mx-4">
          <AdBanner
            preview
            ad={{
              id: 'preview',
              placement,
              title: title.trim() || 'Seu título aqui',
              body: body.trim() || null,
              photoUrl: photoUri,
              linkKind,
              linkValue: null,
            }}
            testID="ad-preview"
          />
        </View>

        <View className="mx-4 mt-6 rounded-card bg-white p-4" style={{ boxShadow: SHADOW_CARD }}>
          <View className="flex-row items-center justify-between">
            <Text className="font-body-extrabold text-h3 text-text-primary">Total</Text>
            <Text className="font-num text-h2 text-primary" testID="ad-total">
              {total != null ? formatPrice(total) : '—'}
            </Text>
          </View>
          <Text className="mt-1 font-body text-caption text-text-muted">
            O anúncio só vai ao ar depois de pago e aprovado pela equipe do Quadra. Ele aparece marcado como
            &quot;Patrocinado&quot;.
          </Text>
          <View className="mt-4">
            <Button variant="grad" onPress={submit} loading={create.isPending} disabled={create.isPending || !offer.data} testID="ad-submit">
              Reservar anúncio
            </Button>
          </View>
        </View>
      </ScrollView>

      <BackHeader title="ANUNCIAR" onHeight={setHeaderHeight} />
    </View>
  );
}
