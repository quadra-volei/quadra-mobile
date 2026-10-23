import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverPicker } from '@/components/domain/CoverPicker';
import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { confirmArenaAt } from '@/features/matches/lib/confirmArena';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchField } from '@/components/ui/SearchField';
import { StepperField } from '@/components/ui/StepperField';
import { TextField } from '@/components/ui/TextField';
import { useCancelMatch, useEditMatch, useMatchEditDefaults } from '@/features/matches/api/editMatch';
import {
  newPlaceSessionToken,
  placeLabel,
  resolvePlace,
  usePlaceSuggestions,
  type PlaceSuggestion,
} from '@/features/matches/api/searchPlaces';
import { useDeviceCoords } from '@/features/matches/lib/useDeviceCoords';
import { GAME_POINTS, MATCH_DURATIONS } from '@/features/matches/schema/createMatch';
import { editMatchSchema, type EditMatchInput } from '@/features/matches/schema/editMatch';
import type { MatchLevel } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';

const FORMATS = ['2X2', '4X4', '6X6'] as const;
const LEVEL_LABEL: Record<MatchLevel, string> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="mb-2 font-body-extrabold text-body-bold text-text-primary">{title}</Text>
      {children}
    </View>
  );
}

/**
 * Organizer edit of a match (API `PUT /matches/{id}`). Type and privacy stay as created;
 * the slots cannot go below the players already in.
 */
export default function EditMatchScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const defaults = useMatchEditDefaults(id);

  if (defaults.isPending) {
    return (
      <View className="flex-1 bg-bg-light px-4 pt-16 gap-4" testID="edit-skeleton">
        <SkeletonBlock className="h-8 w-48" />
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-14" />
        ))}
      </View>
    );
  }
  if (defaults.isError || !defaults.data) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-light px-6">
        <Text className="mb-4 font-body text-body text-text-primary">
          Não foi possível carregar a partida.
        </Text>
        <Button variant="primary" onPress={() => void defaults.refetch()}>
          Tentar de novo
        </Button>
      </View>
    );
  }

  return <EditMatchForm id={id} {...defaults.data} />;
}

function EditMatchForm({
  id,
  values: initial,
  confirmedCount,
  isRecurring,
  coverUrl,
}: {
  id: string;
  values: EditMatchInput;
  confirmedCount: number;
  isRecurring: boolean;
  coverUrl?: string;
}) {
  const insets = useSafeAreaInsets();
  const editMatch = useEditMatch(id);
  const cancelMatch = useCancelMatch(id);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [coverUri, setCoverUri] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState(initial.location);
  // The current address keeps its coordinates until the text is changed.
  const [placePicked, setPlacePicked] = useState(true);
  const [placeSession] = useState(newPlaceSessionToken);
  const places = usePlaceSuggestions(location, {
    near: useDeviceCoords(),
    sessionToken: placeSession,
    enabled: !placePicked,
  });

  const { control, handleSubmit, setValue, watch, formState } = useForm<EditMatchInput>({
    resolver: zodResolver(editMatchSchema),
    defaultValues: initial,
  });
  const format = watch('format');
  const level = watch('level');
  const duration = watch('duration');
  const gamePoints = watch('gamePoints');
  const freeTeams = watch('freeTeams');

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setCoverUri(result.assets[0].uri);
  };

  const pickPlace = async (place: PlaceSuggestion) => {
    const label = placeLabel(place);
    setPlacePicked(true);
    setLocation(label);
    setValue('location', label, { shouldValidate: true });
    setValue('placeId', place.id);
    setValue('arenaId', undefined);
    const coords = await resolvePlace(place, placeSession);
    if (coords) {
      setValue('latitude', coords.latitude, { shouldValidate: true });
      setValue('longitude', coords.longitude, { shouldValidate: true });
      await confirmArenaAt(coords, place.id, (arenaId) => setValue('arenaId', arenaId));
    }
  };

  const onSubmit = (values: EditMatchInput) =>
    editMatch.mutate({ ...values, coverUri }, { onSuccess: () => router.back() });

  const onEndGroup = () =>
    dialog.alert(
      'Encerrar a pelada fixa?',
      'Este jogo é cancelado e nenhum outro é marcado. O ranking do grupo fica como está.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Encerrar pelada',
          style: 'destructive',
          onPress: () =>
            cancelMatch.mutate(
              { endGroup: true },
              {
                onSuccess: () => router.back(),
                onError: (error) => dialog.alert('Não deu para encerrar', error.message),
              },
            ),
        },
      ],
    );

  const locationError =
    formState.errors.location?.message ?? formState.errors.latitude?.message;

  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-chip bg-white shadow-card"
          >
            <ChevronLeft size={24} color={colors.surfaceDark} />
          </Pressable>
          <Text className="font-display text-h1 text-text-primary uppercase">Editar partida</Text>
        </View>

        <ScrollView
          contentContainerClassName="px-4 pt-2"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <CoverPicker uri={coverUri ?? coverUrl} onPress={pickCover} testID="edit-cover" />

          <Section title="Nome">
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange }, fieldState }) => (
                <TextField
                  label=""
                  value={value}
                  onChangeText={onChange}
                  error={fieldState.error?.message}
                  testID="edit-name"
                />
              )}
            />
          </Section>

          <Section title="Descrição">
            <Controller
              control={control}
              name="description"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label=""
                  value={value}
                  onChangeText={onChange}
                  placeholder="Opcional"
                  maxLength={2000}
                  testID="edit-description"
                />
              )}
            />
          </Section>

          <Section title="Local">
            <SearchField
              value={location}
              placeholder="Buscar quadra ou endereço"
              onChangeText={(t) => {
                setLocation(t);
                setValue('location', t);
                setPlacePicked(false);
              }}
              testID="edit-location"
            />
            {!placePicked && places.data && places.data.length > 0 ? (
              <View className="mt-2 rounded-card bg-white shadow-card">
                {places.data.map((place) => (
                  <Pressable
                    key={place.id}
                    accessibilityRole="button"
                    accessibilityLabel={placeLabel(place)}
                    onPress={() => void pickPlace(place)}
                    className="border-b border-line px-4 py-3"
                  >
                    <Text className="font-body text-body text-text-primary">{place.title}</Text>
                    {place.subtitle ? (
                      <Text className="font-body text-caption text-text-muted">{place.subtitle}</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
            {!placePicked ? (
              <Text className="mt-2 font-body text-caption text-text-muted">
                Escolha um endereço da lista para salvar o novo local.
              </Text>
            ) : null}
            {locationError ? (
              <Text className="mt-2 font-body text-caption text-danger">{locationError}</Text>
            ) : null}
          </Section>

          <Section title="Quando">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="date"
                  render={({ field: { value, onChange }, fieldState }) => (
                    <DateTimePickerField
                      mode="date"
                      label="Data"
                      value={value}
                      onChange={onChange}
                      minimumDate={today}
                      error={fieldState.error?.message}
                      testID="edit-date"
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="time"
                  render={({ field: { value, onChange }, fieldState }) => (
                    <DateTimePickerField
                      mode="time"
                      label="Horário"
                      value={value}
                      onChange={onChange}
                      error={fieldState.error?.message}
                      testID="edit-time"
                    />
                  )}
                />
              </View>
            </View>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {MATCH_DURATIONS.map((d) => (
                <FilterChip
                  key={d}
                  label={d}
                  selected={duration === d}
                  onPress={() => setValue('duration', d)}
                />
              ))}
            </View>
          </Section>

          <Section title="Formato e jogadores">
            <View className="mb-3 flex-row gap-2">
              {FORMATS.map((f) => (
                <FilterChip
                  key={f}
                  label={f}
                  selected={format === f}
                  onPress={() => setValue('format', f)}
                />
              ))}
            </View>
            <View className="mb-3 flex-row gap-2">
              <FilterChip label="Times fixos" selected={!freeTeams} onPress={() => setValue('freeTeams', false)} testID="edit-teams-fixed" />
              <FilterChip label="Sem times fixos" selected={freeTeams} onPress={() => setValue('freeTeams', true)} testID="edit-teams-free" />
            </View>
            {/* With no fixed teams there is no score to play to. */}
            {freeTeams ? null : (
              <View className="mb-3 flex-row flex-wrap gap-2">
                {GAME_POINTS.map((p) => (
                  <FilterChip
                    key={p}
                    label={`Até ${p} pontos`}
                    selected={gamePoints === p}
                    onPress={() => setValue('gamePoints', p)}
                    testID={`edit-game-points-${p}`}
                  />
                ))}
              </View>
            )}
            <Controller
              control={control}
              name="players"
              render={({ field: { value, onChange } }) => (
                <StepperField
                  label="Jogadores"
                  value={value}
                  onChange={onChange}
                  min={Math.max(2, confirmedCount)}
                  max={100}
                  testID="edit-players"
                />
              )}
            />
            {confirmedCount > 0 ? (
              <Text className="mt-2 font-body text-caption text-text-muted">
                {`${confirmedCount} já confirmados; as vagas não podem ficar abaixo disso.`}
              </Text>
            ) : null}
          </Section>

          <Section title="Nível">
            <View className="flex-row flex-wrap gap-2">
              {(Object.keys(LEVEL_LABEL) as MatchLevel[]).map((l) => (
                <FilterChip
                  key={l}
                  label={LEVEL_LABEL[l]}
                  selected={level === l}
                  onPress={() => setValue('level', l)}
                />
              ))}
            </View>
          </Section>

          <Section title="Valor">
            <View className="flex-row gap-4">
              <Controller
                control={control}
                name="price"
                render={({ field: { value, onChange } }) => (
                  <StepperField
                    label="Valor avulso"
                    value={value}
                    onChange={onChange}
                    min={0}
                    step={5}
                    prefix="R$ "
                    testID="edit-price"
                  />
                )}
              />
              {isRecurring ? (
                <Controller
                  control={control}
                  name="priceMonthly"
                  render={({ field: { value, onChange } }) => (
                    <StepperField
                      label="Valor recorrente"
                      value={value}
                      onChange={onChange}
                      min={0}
                      step={10}
                      prefix="R$ "
                      testID="edit-price-monthly"
                    />
                  )}
                />
              ) : null}
            </View>
          </Section>

          {editMatch.error ? (
            <Text className="mt-6 font-body text-caption text-danger" accessibilityLiveRegion="polite">
              {editMatch.error.message}
            </Text>
          ) : null}
          <View className="mt-6">
            <Button
              variant="grad"
              onPress={handleSubmit(onSubmit)}
              loading={editMatch.isPending}
              disabled={!placePicked}
              testID="edit-save"
            >
              Salvar alterações
            </Button>
          </View>

          {/* Cancelling one game keeps the group going; only this ends it (API DECISIONS #89). */}
          {isRecurring ? (
            <View className="mt-3">
              <Button
                variant="outline"
                onPress={onEndGroup}
                loading={cancelMatch.isPending}
                testID="end-group"
              >
                Encerrar pelada fixa
              </Button>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
