import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  Check,
  ChevronLeft,
  Clock,
  Copy,
  Heart,
  Lock,
  MapPin,
  Search,
  Share2,
  Users,
  Zap,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverPicker } from '@/components/domain/CoverPicker';
import { Button } from '@/components/ui/Button';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchField } from '@/components/ui/SearchField';
import { StepperField } from '@/components/ui/StepperField';
import { TextField } from '@/components/ui/TextField';
import { useCreateMatch } from '@/features/matches/api/createMatch';
import {
  formatPriceLabel,
  resolveMatchStartsAt,
  type CreatedMatch,
} from '@/features/matches/lib/buildMatchDetail';
import {
  createMatchSchema,
  isCreateMatchComplete,
  isValidBrDate,
  MATCH_DURATIONS,
  SUGGESTED_PLAYERS,
  TIME_PRESETS,
  type CreateMatchInput,
} from '@/features/matches/schema/createMatch';
import type { MatchFormat, MatchLevel } from '@/features/matches/types/match';
import { colors } from '@/theme/colors';
import { useAuthStore } from '@/stores/auth';
import { useCreatedMatchesStore } from '@/stores/createdMatchesStore';

// ════════════════════════════════════════════════════════════
// Conversational primitives (inlined — single-use to this flow, mirroring the
// prototype's screens-create.jsx module-level Question/Reveal/OptionCard).
// ════════════════════════════════════════════════════════════

/** Reveal wrapper — fades + slides the next block in once `show` flips true. */
function Reveal({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <Animated.View entering={FadeInDown.duration(260)} className="mt-6">
      {children}
    </Animated.View>
  );
}

/** Conversational question header — optional step number + title + subtitle. */
function Question({
  step,
  sub,
  children,
}: {
  step?: number;
  sub?: string;
  children: string;
}) {
  return (
    <View className="mb-3">
      <View className="flex-row items-center gap-2">
        {step ? (
          <Text className="font-num text-primary" style={{ fontSize: 16 }}>
            {step}
          </Text>
        ) : null}
        <Text
          className="flex-1 font-body-extrabold text-text-primary"
          style={{ fontSize: 19, lineHeight: 23 }}
        >
          {children}
        </Text>
      </View>
      {sub ? (
        <Text className="mt-1 font-body text-caption text-text-muted">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Big selectable option card (tipo / privacidade / invite mode). */
function OptionCard({
  selected,
  onPress,
  icon,
  title,
  desc,
  testID,
}: {
  selected: boolean;
  onPress: () => void;
  icon?: ReactNode;
  title: string;
  desc?: string;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`flex-1 rounded-card border p-4 ${
        selected ? 'border-primary bg-primary/5' : 'border-line bg-white'
      }`}
    >
      {icon ? (
        <View
          className={`mb-2 h-10 w-10 items-center justify-center rounded-chip ${
            selected ? 'bg-primary' : 'bg-primary/10'
          }`}
        >
          {icon}
        </View>
      ) : null}
      <Text className="font-body-bold text-body-bold text-text-primary">
        {title}
      </Text>
      {desc ? (
        <Text className="mt-1 font-body text-caption text-text-muted">
          {desc}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Small inline eyebrow above a sub-control inside a revealed block. */
function MiniLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 font-body-bold text-eyebrow text-text-primary uppercase">
      {children}
    </Text>
  );
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;
const LEVEL_DESC: Record<MatchLevel, string> = {
  INICIANTE: 'Pra quem está começando e quer aprender jogando, sem pressão.',
  INTERMEDIARIO: 'Para jogadores que já possuem boa experiência de quadra.',
  AVANCADO: 'Ritmo forte e competitivo — pra quem manda bem e quer nível alto.',
};

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
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
  const dayLabel = sameDate(date, today)
    ? 'Hoje'
    : sameDate(date, tomorrow)
      ? 'Amanhã'
      : (DAYS[date.getDay()] ?? '');
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

// ════════════════════════════════════════════════════════════
// Success state — navy full screen + lime check + real entered-data recap.
// ════════════════════════════════════════════════════════════
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
        {input.name} está no ar. Convide a galera e bora jogar!
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
          {input.privacy === 'open'
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

// ════════════════════════════════════════════════════════════
// CRIAR PARTIDA — formulário vivo (progressive disclosure)
// ════════════════════════════════════════════════════════════
export default function CreateMatchScreen() {
  const addCreatedMatch = useCreatedMatchesStore((s) => s.addCreatedMatch);
  const organizerId = useAuthStore((s) => s.userId);

  const createMatch = useCreateMatch();
  const insets = useSafeAreaInsets();

  // Start of today — floor for the date pickers (no partida in the past).
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [created, setCreated] = useState<CreatedMatch | null>(null);
  // LOCAL free-text mirror (bridged into RHF); SearchField is not RHF-native.
  const [location, setLocation] = useState('');
  const [coverUri, setCoverUri] = useState<string | undefined>(undefined);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // "Outro horário" toggles a masked time input inside the schedule block.
  const [otherTime, setOtherTime] = useState(false);

  const { control, handleSubmit, setValue, watch } = useForm<CreateMatchInput>({
    resolver: zodResolver(createMatchSchema),
    // Only pre-fill what the prototype pre-selects; every other field stays
    // undefined so its block reveals only after the user answers.
    defaultValues: {
      name: '',
      location: '',
      recDays: [],
      recFreq: 'weekly',
      customDate: '',
      recStart: '',
      time: '',
      duration: '1h30',
      players: 0,
      price: 25,
      priceMonthly: 80,
    },
  });

  const values = watch();
  const {
    name = '',
    type,
    whenType,
    customDate,
    recDays = [],
    recStart,
    time,
    duration,
    format,
    level,
    confirmationOpensHoursBefore: confirmWin,
    privacy,
    inviteMode,
  } = values;

  // ── Progressive-disclosure reveal conditions (mirror the prototype) ──
  const locationReady = location.trim().length >= 2;
  const showLocal = name.trim().length >= 2;
  const showTipo = showLocal && locationReady;
  const dateReady =
    type === 'OneOff'
      ? !!whenType && (whenType !== 'date' || isValidBrDate(customDate))
      : type === 'Recurring'
        ? recDays.length > 0 && isValidBrDate(recStart)
        : false;
  const showTime = showTipo && !!type && dateReady;
  const showDuration = showTime && !!time;
  const showFormato = showDuration && !!duration;
  const showNivel = showFormato && !!format;
  const showValor = showNivel && !!level;
  const showConfirm = showValor;
  const showPrivacidade = showConfirm && !!confirmWin;
  const showInvite = showPrivacidade && privacy === 'private';

  const complete = isCreateMatchComplete(values);

  // Top progress bar — fraction of the 8 conversational steps answered.
  const steps = [
    !!name.trim(),
    locationReady,
    !!type && dateReady,
    !!time,
    !!format,
    !!level,
    !!confirmWin,
    !!privacy,
  ];
  const progress = steps.filter(Boolean).length / steps.length;

  // ── Auto-scroll to the freshly revealed block (soft, best-effort) ──
  const scrollRef = useRef<ScrollView>(null);
  const blockY = useRef<Record<string, number>>({});
  const focusKey = showPrivacidade
    ? 'privacidade'
    : showConfirm
      ? 'confirm'
      : showValor
        ? 'valor'
        : showNivel
          ? 'nivel'
          : showFormato
            ? 'formato'
            : showTime
              ? 'time'
              : showTipo
                ? 'tipo'
                : showLocal
                  ? 'local'
                  : '';

  useEffect(() => {
    if (!focusKey) return;
    const y = blockY.current[focusKey];
    if (y == null) return;
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
    }, 140);
    return () => clearTimeout(id);
  }, [focusKey]);

  const onBlockLayout = (key: string) => (e: LayoutChangeEvent) => {
    blockY.current[key] = e.nativeEvent.layout.y;
  };

  // Picking a format pre-fills the suggested player count.
  const pickFormat = (f: MatchFormat) => {
    setValue('format', f, { shouldValidate: true });
    setValue('players', SUGGESTED_PLAYERS[f], { shouldValidate: true });
  };

  const toggleDay = (i: number) => {
    const next = recDays.includes(i)
      ? recDays.filter((d) => d !== i)
      : [...recDays, i].sort((a, b) => a - b);
    setValue('recDays', next, { shouldValidate: true });
  };

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

  const onSubmit = (formValues: CreateMatchInput) => {
    createMatch.mutate(
      { ...formValues, coverUri },
      {
        onSuccess: (data) => {
          const record: CreatedMatch = {
            id: data.match.id,
            organizerId: organizerId ?? 'me',
            startsAt: resolveMatchStartsAt(formValues),
            createdAt: new Date().toISOString(),
            coverUri,
            input: formValues,
          };
          addCreatedMatch(record);
          setCreated(record);
        },
      },
    );
  };

  // Level description card content (only after a level is chosen).
  const levelDesc = useMemo(
    () => (level ? LEVEL_DESC[level] : ''),
    [level],
  );

  if (created) {
    return <CreatedView match={created} />;
  }

  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* ── Header (inline; back + title) ── */}
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
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

        {/* ── Progress bar ── */}
        <View className="mx-4 h-[3px] overflow-hidden rounded-full bg-primary/10">
          <View
            testID="create-progress"
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerClassName="px-4 pt-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─────────── BLOCO 1 · Capa + nome ─────────── */}
          <Question sub="Dê um nome e uma cara pra sua partida.">
            Bora criar um jogo?
          </Question>
          <CoverPicker uri={coverUri} onPress={pickCover} testID="cover-picker" />
          {permissionDenied ? (
            <Text
              className="mt-2 font-body text-caption text-danger"
              accessibilityLiveRegion="polite"
            >
              Permissão de fotos negada. Ative em &quot;Permissões do app&quot;.
            </Text>
          ) : null}
          <View className="mt-3">
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange }, fieldState }) => (
                <TextField
                  label=""
                  value={value}
                  onChangeText={onChange}
                  placeholder="Como vai chamar essa partida?"
                  error={fieldState.error?.message}
                  testID="match-name"
                />
              )}
            />
          </View>

          {/* ─────────── BLOCO 2 · Local ─────────── */}
          <View onLayout={onBlockLayout('local')}>
            <Reveal show={showLocal}>
              <Question step={2} sub="Busque uma quadra ou informe o endereço.">
                Onde vocês vão jogar?
              </Question>
              <SearchField
                value={location}
                placeholder="Buscar quadra ou endereço"
                onChangeText={(t) => {
                  setLocation(t);
                  setValue('location', t, { shouldValidate: true });
                }}
                testID="match-location"
              />
            </Reveal>
          </View>

          {/* ─────────── BLOCO 3 · Avulso ou Recorrente ─────────── */}
          <View onLayout={onBlockLayout('tipo')}>
            <Reveal show={showTipo}>
              <Question step={3} sub="Um jogo único ou toda semana?">
                Vai se repetir?
              </Question>
              <View className="flex-row gap-3">
                <OptionCard
                  selected={type === 'OneOff'}
                  onPress={() => setValue('type', 'OneOff', { shouldValidate: true })}
                  icon={
                    <Zap
                      size={20}
                      color={type === 'OneOff' ? colors.textOnDark : colors.primary}
                    />
                  }
                  title="Avulso"
                  desc="Só dessa vez"
                  testID="type-OneOff"
                />
                <OptionCard
                  selected={type === 'Recurring'}
                  onPress={() =>
                    setValue('type', 'Recurring', { shouldValidate: true })
                  }
                  icon={
                    <Clock
                      size={20}
                      color={
                        type === 'Recurring' ? colors.textOnDark : colors.primary
                      }
                    />
                  }
                  title="Recorrente"
                  desc="Toda semana"
                  testID="type-Recurring"
                />
              </View>

              {/* AVULSO → escolher a data */}
              <Reveal show={type === 'OneOff'}>
                <MiniLabel>Quando essa partida vai rolar?</MiniLabel>
                <View className="flex-row gap-2">
                  <FilterChip
                    label="Hoje"
                    selected={whenType === 'today'}
                    onPress={() => setValue('whenType', 'today', { shouldValidate: true })}
                    testID="when-today"
                  />
                  <FilterChip
                    label="Amanhã"
                    selected={whenType === 'tomorrow'}
                    onPress={() =>
                      setValue('whenType', 'tomorrow', { shouldValidate: true })
                    }
                    testID="when-tomorrow"
                  />
                  <FilterChip
                    label="Outra data"
                    selected={whenType === 'date'}
                    onPress={() => setValue('whenType', 'date', { shouldValidate: true })}
                    testID="when-date"
                  />
                </View>
                <Reveal show={whenType === 'date'}>
                  <Controller
                    control={control}
                    name="customDate"
                    render={({ field: { value, onChange } }) => (
                      <DateTimePickerField
                        mode="date"
                        label="Data da partida"
                        value={value ?? ''}
                        onChange={onChange}
                        placeholder="Escolha a data"
                        minimumDate={today}
                        testID="custom-date"
                      />
                    )}
                  />
                </Reveal>
              </Reveal>

              {/* RECORRENTE → dias, frequência, início */}
              <Reveal show={type === 'Recurring'}>
                <View className="rounded-card border border-line bg-white p-4">
                  <MiniLabel>Dias da semana</MiniLabel>
                  <View className="flex-row justify-between gap-1.5">
                    {WEEKDAYS.map((d, i) => {
                      const on = recDays.includes(i);
                      return (
                        <Pressable
                          key={i}
                          onPress={() => toggleDay(i)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={`Dia ${i}`}
                          testID={`rec-day-${i}`}
                          className={`h-10 flex-1 items-center justify-center rounded-chip ${
                            on ? 'bg-primary' : 'bg-primary/5'
                          }`}
                        >
                          <Text
                            className={`font-body-bold text-body-bold ${
                              on ? 'text-text-on-dark' : 'text-text-muted'
                            }`}
                          >
                            {d}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View className="mt-4">
                    <MiniLabel>Frequência</MiniLabel>
                    <View className="flex-row gap-2">
                      <FilterChip
                        label="Semanal"
                        selected={values.recFreq === 'weekly'}
                        onPress={() => setValue('recFreq', 'weekly')}
                        testID="rec-freq-weekly"
                      />
                      <FilterChip
                        label="Quinzenal"
                        selected={values.recFreq === 'biweekly'}
                        onPress={() => setValue('recFreq', 'biweekly')}
                        testID="rec-freq-biweekly"
                      />
                      <FilterChip
                        label="Mensal"
                        selected={values.recFreq === 'monthly'}
                        onPress={() => setValue('recFreq', 'monthly')}
                        testID="rec-freq-monthly"
                      />
                    </View>
                  </View>

                  <View className="mt-4">
                    <Controller
                      control={control}
                      name="recStart"
                      render={({ field: { value, onChange } }) => (
                        <DateTimePickerField
                          mode="date"
                          label="Início"
                          value={value ?? ''}
                          onChange={onChange}
                          placeholder="Escolha a data"
                          minimumDate={today}
                          testID="rec-start"
                        />
                      )}
                    />
                  </View>
                </View>
              </Reveal>

              {/* Horário — 2 sugestões + escolher exata */}
              <Reveal show={showTime}>
                <MiniLabel>Que horas?</MiniLabel>
                <View className="flex-row gap-2">
                  {TIME_PRESETS.map((t) => (
                    <FilterChip
                      key={t}
                      label={t}
                      selected={!otherTime && time === t}
                      onPress={() => {
                        setOtherTime(false);
                        setValue('time', t, { shouldValidate: true });
                      }}
                      testID={`time-${t}`}
                    />
                  ))}
                  <FilterChip
                    label="Outro horário"
                    selected={otherTime}
                    onPress={() => {
                      setOtherTime(true);
                      setValue('time', '', { shouldValidate: true });
                    }}
                    testID="time-other"
                  />
                </View>
                <Reveal show={otherTime}>
                  <DateTimePickerField
                    mode="time"
                    value={time ?? ''}
                    onChange={(t) =>
                      setValue('time', t, { shouldValidate: true })
                    }
                    placeholder="Escolha o horário"
                    testID="time-input"
                  />
                </Reveal>
              </Reveal>

              {/* Duração */}
              <Reveal show={showDuration}>
                <MiniLabel>Quanto tempo de jogo?</MiniLabel>
                <View className="flex-row flex-wrap gap-2">
                  {MATCH_DURATIONS.map((d) => (
                    <FilterChip
                      key={d}
                      label={d}
                      selected={duration === d}
                      onPress={() => setValue('duration', d, { shouldValidate: true })}
                      testID={`duration-${d}`}
                    />
                  ))}
                </View>
              </Reveal>
            </Reveal>
          </View>

          {/* ─────────── BLOCO 4 · Formato ─────────── */}
          <View onLayout={onBlockLayout('formato')}>
            <Reveal show={showFormato}>
              <Question step={4} sub="Quantos jogam de cada lado?">
                Como vai ser a partida?
              </Question>
              <View className="flex-row gap-3">
                {(['2X2', '4X4', '6X6'] as const).map((f) => (
                  <OptionCard
                    key={f}
                    selected={format === f}
                    onPress={() => pickFormat(f)}
                    title={f.toLowerCase()}
                    desc={f === '2X2' ? 'Dupla' : f === '4X4' ? 'Quatro' : 'Time cheio'}
                    testID={`format-${f}`}
                  />
                ))}
              </View>
            </Reveal>
          </View>

          {/* ─────────── BLOCO 5 · Nível ─────────── */}
          <View onLayout={onBlockLayout('nivel')}>
            <Reveal show={showNivel}>
              <Question step={5} sub="Ajuda a juntar gente do mesmo ritmo.">
                Qual o nível?
              </Question>
              <View className="flex-row gap-2">
                <FilterChip
                  label="Iniciante"
                  selected={level === 'INICIANTE'}
                  onPress={() => setValue('level', 'INICIANTE', { shouldValidate: true })}
                  testID="level-INICIANTE"
                />
                <FilterChip
                  label="Intermediário"
                  selected={level === 'INTERMEDIARIO'}
                  onPress={() =>
                    setValue('level', 'INTERMEDIARIO', { shouldValidate: true })
                  }
                  testID="level-INTERMEDIARIO"
                />
                <FilterChip
                  label="Avançado"
                  selected={level === 'AVANCADO'}
                  onPress={() => setValue('level', 'AVANCADO', { shouldValidate: true })}
                  testID="level-AVANCADO"
                />
              </View>
              <Reveal show={!!level}>
                <View className="flex-row items-start gap-2 rounded-chip bg-primary/5 p-3">
                  <Zap size={16} color={colors.primary} />
                  <Text className="flex-1 font-body text-caption text-text-primary">
                    {levelDesc}
                  </Text>
                </View>
              </Reveal>
            </Reveal>
          </View>

          {/* ─────────── BLOCO 6 · Valor ─────────── */}
          <View onLayout={onBlockLayout('valor')}>
            <Reveal show={showValor}>
              <Question
                step={6}
                sub={
                  type === 'Recurring'
                    ? 'Valor pra quem joga uma vez e pra quem joga sempre.'
                    : 'Deixe em zero se for de graça.'
                }
              >
                {type === 'Recurring'
                  ? 'Quanto custa pra jogar?'
                  : 'Quanto custa por pessoa?'}
              </Question>
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
                      testID="price-stepper"
                    />
                  )}
                />
                {type === 'Recurring' ? (
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
                        testID="price-monthly-stepper"
                      />
                    )}
                  />
                ) : null}
              </View>
              <View
                className={`mt-3 flex-row items-start gap-2 rounded-chip p-3 ${
                  values.price === 0 ? 'bg-accent/20' : 'bg-primary/5'
                }`}
              >
                {values.price === 0 ? (
                  <Heart size={16} color={colors.primary} />
                ) : (
                  <Users size={16} color={colors.primary} />
                )}
                <Text className="flex-1 font-body-bold text-caption text-text-primary">
                  {values.price === 0
                    ? 'Partida gratuita — todo mundo joga de graça!'
                    : `Cada jogador paga R$ ${values.price}`}
                </Text>
              </View>
            </Reveal>
          </View>

          {/* ─────────── BLOCO 7 · Confirmações ─────────── */}
          <View onLayout={onBlockLayout('confirm')}>
            <Reveal show={showConfirm}>
              <Question step={7} sub="Quando as vagas abrem pra confirmação.">
                Abrir confirmações quando?
              </Question>
              <View className="flex-row flex-wrap gap-2">
                {([48, 24, 12, 6] as const).map((h) => (
                  <FilterChip
                    key={h}
                    label={`${h}h`}
                    selected={confirmWin === h}
                    onPress={() =>
                      setValue('confirmationOpensHoursBefore', h, {
                        shouldValidate: true,
                      })
                    }
                    testID={`confirm-${h}`}
                  />
                ))}
              </View>
              <Reveal show={!!confirmWin}>
                <Text className="font-body text-caption text-text-muted">
                  A galera confirma presença a partir de {confirmWin}h antes do
                  jogo.
                </Text>
              </Reveal>
            </Reveal>
          </View>

          {/* ─────────── BLOCO 8 · Privacidade ─────────── */}
          <View onLayout={onBlockLayout('privacidade')}>
            <Reveal show={showPrivacidade}>
              <Question step={8} sub="Quem pode entrar nessa partida?">
                Quem pode participar?
              </Question>
              <View className="flex-row gap-3">
                <OptionCard
                  selected={privacy === 'open'}
                  onPress={() => setValue('privacy', 'open', { shouldValidate: true })}
                  icon={
                    <Users
                      size={20}
                      color={privacy === 'open' ? colors.textOnDark : colors.primary}
                    />
                  }
                  title="Aberta"
                  desc="Qualquer um entra nas vagas"
                  testID="privacy-open"
                />
                <OptionCard
                  selected={privacy === 'private'}
                  onPress={() => setValue('privacy', 'private', { shouldValidate: true })}
                  icon={
                    <Lock
                      size={20}
                      color={privacy === 'private' ? colors.textOnDark : colors.primary}
                    />
                  }
                  title="Privada"
                  desc="Só quem você deixar"
                  testID="privacy-private"
                />
              </View>
              <Reveal show={showInvite}>
                <View className="gap-2">
                  <OptionCard
                    selected={inviteMode === 'code'}
                    onPress={() =>
                      setValue('inviteMode', 'code', { shouldValidate: true })
                    }
                    title="Código de convite"
                    desc="Quem tiver o código pode entrar"
                    testID="invite-code"
                  />
                  <OptionCard
                    selected={inviteMode === 'guests'}
                    onPress={() =>
                      setValue('inviteMode', 'guests', { shouldValidate: true })
                    }
                    title="Somente convidados"
                    desc="Só quem você chamar direto"
                    testID="invite-guests"
                  />
                </View>
                <Reveal show={inviteMode === 'code'}>
                  <View className="flex-row items-center justify-between rounded-chip bg-surface-dark px-4 py-3">
                    <Text className="font-num text-text-on-dark" style={{ fontSize: 18, letterSpacing: 3 }}>
                      QDR-7K2P
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <Copy size={15} color={colors.accentLight} />
                      <Text className="font-body-bold text-caption text-accent-light">
                        Copiar
                      </Text>
                    </View>
                  </View>
                </Reveal>
              </Reveal>
            </Reveal>
          </View>

          {createMatch.isError ? (
            <Text
              className="mt-4 font-body text-caption text-danger"
              accessibilityLiveRegion="polite"
            >
              Não foi possível criar a partida. Tente novamente.
            </Text>
          ) : null}
        </ScrollView>

        {/* ── Sticky footer CTA ── */}
        <View
          className="border-t border-line bg-white px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Button
            variant="grad"
            onPress={handleSubmit(onSubmit)}
            disabled={!complete}
            loading={createMatch.isPending}
            testID="create-submit"
          >
            {complete ? 'Criar partida' : 'Responda pra continuar'}
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}
