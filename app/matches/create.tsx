import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Check, ChevronLeft, Lock, MapPin, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoverPicker } from '@/components/domain/CoverPicker';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchField } from '@/components/ui/SearchField';
import { StepperField } from '@/components/ui/StepperField';
import { TextField } from '@/components/ui/TextField';
import { ToggleField } from '@/components/ui/ToggleField';
import { useCreateMatch } from '@/features/matches/api/createMatch';
import {
  formatPriceLabel,
  resolveMatchStartsAt,
  type CreatedMatch,
} from '@/features/matches/lib/buildMatchDetail';
import {
  createMatchSchema,
  type CreateMatchInput,
} from '@/features/matches/schema/createMatch';
import type { MatchLevel } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';
import { useAuthStore } from '@/stores/auth';
import { useCreatedMatchesStore } from '@/stores/createdMatchesStore';

// ── Eyebrow section label ──
function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mt-6 font-body text-eyebrow text-text-primary uppercase">
      {children}
    </Text>
  );
}

// ── Presentational label maps (token-free copy) for the success recap ──
const LEVEL_LABEL: Record<MatchLevel, string> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
};

const TYPE_LABEL: Record<CreateMatchInput['type'], string> = {
  OneOff: 'Avulso',
  Recurring: 'Recorrente',
};

/** "Hoje · 19h00" / "Sáb · 19h00" — resolved start of the created match. */
function formatCreatedWhen(startsAt: string): string {
  const date = new Date(startsAt);
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
  const dayLabel = sameDate(date, today)
    ? 'Hoje'
    : sameDate(date, tomorrow)
      ? 'Amanhã'
      : (WEEKDAYS[date.getDay()] ?? '');
  return `${dayLabel} · ${hh}h${mm}`;
}

// ── One recap pill on the navy success screen ──
function RecapPill({ children }: { children: string }) {
  return (
    <View className="rounded-pill bg-white/15 px-3 py-1">
      <Text className="font-mono text-mono text-text-on-dark uppercase">
        {children}
      </Text>
    </View>
  );
}

// ── Success state (partida-criada.png): navy full screen + lime check + real
// entered-data recap + CTAs. Reads the persisted `CreatedMatch` so the recap
// reflects exactly what the organizer typed (not a fixture). ──
function CreatedView({ match }: { match: CreatedMatch }) {
  const { id, startsAt, input } = match;
  const goToMatch = () =>
    router.replace({ pathname: '/matches/[id]', params: { id } });
  // SCOPE: no inline invite / invite route in MVP — route to the S12 organizer
  // "Convidar" entry with the new id. Definitive, not disabled/conditional.
  const goToInvite = () =>
    router.replace({ pathname: '/matches/[id]', params: { id } });
  const goHome = () => router.replace('/(tabs)');

  return (
    <View className="flex-1 items-center justify-center bg-surface-dark px-6">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
        <Check size={36} color={colors.surfaceDark} />
      </View>
      <Text className="mt-6 text-center font-display text-display text-text-on-dark uppercase">
        Partida criada!
      </Text>
      <Text className="mt-2 text-center font-body text-body text-text-on-dark/80">
        Sua partida está no ar. Convide a galera e bora jogar!
      </Text>

      {/* ── Recap of the real entered data ── */}
      <View
        className="mt-6 w-full rounded-card bg-white/10 p-4"
        testID="created-recap"
      >
        <Text
          className="font-body text-h3 text-text-on-dark"
          testID="created-recap-name"
        >
          {input.name}
        </Text>
        <View className="mt-1 flex-row items-center gap-1">
          <MapPin size={16} color={colors.textOnDark} />
          <Text
            className="flex-1 font-body text-body text-text-on-dark/80"
            testID="created-recap-location"
          >
            {input.location}
          </Text>
        </View>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <RecapPill>{input.format}</RecapPill>
          <RecapPill>{LEVEL_LABEL[input.level]}</RecapPill>
          <RecapPill>{TYPE_LABEL[input.type]}</RecapPill>
        </View>

        <View className="mt-3 flex-row justify-between">
          <View>
            <Text className="font-body text-eyebrow text-text-on-dark/60 uppercase">
              Quando
            </Text>
            <Text
              className="mt-1 font-body text-body-bold text-text-on-dark"
              testID="created-recap-when"
            >
              {formatCreatedWhen(startsAt)}
            </Text>
          </View>
          <View>
            <Text className="font-body text-eyebrow text-text-on-dark/60 uppercase">
              Vagas
            </Text>
            <Text className="mt-1 font-body text-body-bold text-text-on-dark">
              {input.players} jogadores
            </Text>
          </View>
          <View>
            <Text className="font-body text-eyebrow text-text-on-dark/60 uppercase">
              Valor
            </Text>
            <Text
              className="mt-1 font-num text-body-bold text-text-on-dark"
              testID="created-recap-price"
            >
              {formatPriceLabel(input.price)}
            </Text>
          </View>
        </View>

        <Text className="mt-3 font-body text-caption text-text-on-dark/70">
          {input.isOpen
            ? 'Partida aberta · qualquer um pode entrar'
            : 'Partida privada · só convidados'}
        </Text>
      </View>

      <View className="mt-8 w-full">
        <Button variant="grad" onPress={goToMatch} testID="created-view-match">
          Ver a partida criada
        </Button>
      </View>
      <View className="mt-3 w-full">
        <Button
          variant="outlineW"
          onPress={goToInvite}
          leftIcon={<Share2 size={18} color={colors.textOnDark} />}
          testID="created-invite"
        >
          Convidar jogadores
        </Button>
      </View>
      <View className="mt-3 w-full">
        <Button variant="outlineW" onPress={goHome} testID="created-home">
          Voltar ao início
        </Button>
      </View>
    </View>
  );
}

export default function CreateMatchScreen() {
  // ── Global store for created matches (session source of truth) ──
  const addCreatedMatch = useCreatedMatchesStore((s) => s.addCreatedMatch);
  const organizerId = useAuthStore((s) => s.userId);

  const createMatch = useCreateMatch();

  // Local state per spec; holds the full created record for the success recap.
  const [created, setCreated] = useState<CreatedMatch | null>(null);
  // LOCAL free-text mirror (bridged into RHF); SearchField is not RHF-native.
  const [location, setLocation] = useState('');
  // Picked cover image local URI (carried into the submit payload).
  const [coverUri, setCoverUri] = useState<string | undefined>(undefined);
  // Polite message when media-library permission is denied.
  const [permissionDenied, setPermissionDenied] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMatchInput>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      name: '',
      location: '',
      day: 'today',
      format: '6X6',
      level: 'INTERMEDIARIO',
      type: 'OneOff',
      players: 12,
      price: 0,
      confirmationOpensHoursBefore: 24,
      isOpen: false,
    },
  });

  const day = watch('day');
  const format = watch('format');
  const level = watch('level');
  const type = watch('type');
  const confirmOpens = watch('confirmationOpensHoursBefore');

  const pickCover = async () => {
    setPermissionDenied(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    const picked = result.canceled ? undefined : result.assets[0];
    if (picked) {
      setCoverUri(picked.uri);
    }
  };

  const onSubmit = (values: CreateMatchInput) => {
    createMatch.mutate(
      { ...values, coverUri },
      {
        onSuccess: (data) => {
          // Persist the FULL entered record so the success recap, S12 detail and
          // the home list all read the real data the organizer typed. Kept in
          // memory for the current session (no backend yet).
          const record: CreatedMatch = {
            id: data.match.id,
            organizerId: organizerId ?? 'me',
            startsAt: resolveMatchStartsAt(values.day),
            createdAt: new Date().toISOString(),
            coverUri,
            input: values,
          };

          addCreatedMatch(record);
          setCreated(record);
        },
      },
    );
  };

  if (created) {
    return <CreatedView match={created} />;
  }

  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* ── Header (inline; back + title — no Header/IconButton primitive) ── */}
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-chip bg-white shadow-card"
          >
            <ChevronLeft size={24} color={colors.surfaceDark} />
          </Pressable>
          <Text className="font-display text-h1 text-text-primary uppercase">
            Criar partida
          </Text>
        </View>

        <ScrollView
          contentContainerClassName="px-4 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Cover picker ── */}
          <CoverPicker uri={coverUri} onPress={pickCover} testID="cover-picker" />
          {permissionDenied ? (
            <Text
              className="mt-2 font-body text-caption text-danger"
              accessibilityLiveRegion="polite"
            >
              Permissão de fotos negada. Ative em &quot;Permissões do app&quot;.
            </Text>
          ) : null}

          {/* ── NOME DA PARTIDA ── */}
          <SectionLabel>Nome da partida</SectionLabel>
          <View className="mt-2">
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange }, fieldState }) => (
                <TextField
                  label=""
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ex: Racha de Quinta"
                  error={fieldState.error?.message}
                  testID="match-name"
                />
              )}
            />
          </View>

          {/* ── LOCAL (free text; SearchField bridged into RHF) ── */}
          <SectionLabel>Local</SectionLabel>
          <View className="mt-2">
            <SearchField
              value={location}
              placeholder="Buscar quadra ou endereço"
              onChangeText={(t) => {
                setLocation(t);
                setValue('location', t, { shouldValidate: true });
              }}
              testID="match-location"
            />
            {errors.location ? (
              <Text
                className="mt-2 font-body text-caption text-danger"
                accessibilityLiveRegion="polite"
              >
                {errors.location.message}
              </Text>
            ) : null}
          </View>

          {/* ── QUANDO (quick-date chips only — no "+" / no time) ── */}
          <SectionLabel>Quando</SectionLabel>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <FilterChip
              label="Hoje"
              selected={day === 'today'}
              onPress={() => setValue('day', 'today')}
              testID="day-today"
            />
            <FilterChip
              label="Amanhã"
              selected={day === 'tomorrow'}
              onPress={() => setValue('day', 'tomorrow')}
              testID="day-tomorrow"
            />
            <FilterChip
              label="Sex"
              selected={day === 'fri'}
              onPress={() => setValue('day', 'fri')}
              testID="day-fri"
            />
            <FilterChip
              label="Sáb"
              selected={day === 'sat'}
              onPress={() => setValue('day', 'sat')}
              testID="day-sat"
            />
          </View>

          {/* ── FORMATO (default 6x6) ── */}
          <SectionLabel>Formato</SectionLabel>
          <View className="mt-2 flex-row gap-2">
            <FilterChip
              label="2x2"
              selected={format === '2X2'}
              onPress={() => setValue('format', '2X2')}
              testID="format-2X2"
            />
            <FilterChip
              label="4x4"
              selected={format === '4X4'}
              onPress={() => setValue('format', '4X4')}
              testID="format-4X4"
            />
            <FilterChip
              label="6x6"
              selected={format === '6X6'}
              onPress={() => setValue('format', '6X6')}
              testID="format-6X6"
            />
          </View>

          {/* ── NÍVEL (default Intermediário) ── */}
          <SectionLabel>Nível</SectionLabel>
          <View className="mt-2 flex-row gap-2">
            <FilterChip
              label="Iniciante"
              selected={level === 'INICIANTE'}
              onPress={() => setValue('level', 'INICIANTE')}
              testID="level-INICIANTE"
            />
            <FilterChip
              label="Intermediário"
              selected={level === 'INTERMEDIARIO'}
              onPress={() => setValue('level', 'INTERMEDIARIO')}
              testID="level-INTERMEDIARIO"
            />
            <FilterChip
              label="Avançado"
              selected={level === 'AVANCADO'}
              onPress={() => setValue('level', 'AVANCADO')}
              testID="level-AVANCADO"
            />
          </View>

          {/* ── TIPO (default Avulso/OneOff) ── */}
          <SectionLabel>Tipo</SectionLabel>
          <View className="mt-2 flex-row gap-2">
            <FilterChip
              label="Avulso"
              selected={type === 'OneOff'}
              onPress={() => setValue('type', 'OneOff')}
              testID="type-OneOff"
            />
            <FilterChip
              label="Recorrente"
              selected={type === 'Recurring'}
              onPress={() => setValue('type', 'Recurring')}
              testID="type-Recurring"
            />
          </View>

          {/* ── VAGAS & VALOR ── */}
          <SectionLabel>Vagas & valor</SectionLabel>
          <View className="mt-2 flex-row gap-4">
            <Controller
              control={control}
              name="players"
              render={({ field: { value, onChange } }) => (
                <StepperField
                  label="Jogadores"
                  value={value}
                  onChange={onChange}
                  min={2}
                  testID="players-stepper"
                />
              )}
            />
            <Controller
              control={control}
              name="price"
              render={({ field: { value, onChange } }) => (
                <StepperField
                  label="Valor / pessoa"
                  value={value}
                  onChange={onChange}
                  min={0}
                  prefix="R$ "
                  testID="price-stepper"
                />
              )}
            />
          </View>

          {/* ── CONFIRMAÇÕES ABREM (preset window; default 24h) ── */}
          <SectionLabel>Confirmações abrem</SectionLabel>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <FilterChip
              label="48h antes"
              selected={confirmOpens === 48}
              onPress={() => setValue('confirmationOpensHoursBefore', 48)}
              testID="confirm-48"
            />
            <FilterChip
              label="24h antes"
              selected={confirmOpens === 24}
              onPress={() => setValue('confirmationOpensHoursBefore', 24)}
              testID="confirm-24"
            />
            <FilterChip
              label="12h antes"
              selected={confirmOpens === 12}
              onPress={() => setValue('confirmationOpensHoursBefore', 12)}
              testID="confirm-12"
            />
            <FilterChip
              label="6h antes"
              selected={confirmOpens === 6}
              onPress={() => setValue('confirmationOpensHoursBefore', 6)}
              testID="confirm-6"
            />
          </View>

          {/* ── PRIVACIDADE ── */}
          <SectionLabel>Privacidade</SectionLabel>
          <Controller
            control={control}
            name="isOpen"
            render={({ field: { value, onChange } }) => (
              <ToggleField
                icon={<Lock size={20} color={colors.primary} />}
                title="Partida aberta"
                caption="Qualquer um pode entrar nas vagas"
                value={value}
                onValueChange={onChange}
                testID="open-toggle"
              />
            )}
          />

          {createMatch.isError ? (
            <Text
              className="mt-4 font-body text-caption text-danger"
              accessibilityLiveRegion="polite"
            >
              Não foi possível criar a partida. Tente novamente.
            </Text>
          ) : null}

          <View className="mt-8">
            <Button
              variant="grad"
              onPress={handleSubmit(onSubmit)}
              loading={createMatch.isPending}
              testID="create-submit"
            >
              Criar partida
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
