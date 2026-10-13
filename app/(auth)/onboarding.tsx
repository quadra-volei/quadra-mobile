import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ArrowUp,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Share2,
  ShieldCheck,
  Shuffle,
  Zap,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  HANDLE_TAKEN_MESSAGE,
  useHandleTaken,
} from "@/features/profile/api/handleAvailability";
import { BackHandler, Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { TextField } from "@/components/ui/TextField";
import { useCreateProfile } from "@/features/profile/api/createProfile";
import {
  onboardingSchema,
  POSITION_OPTIONS,
  type Level,
  type Modality,
  type OnboardingProfileInput,
  type Position,
} from "@/features/profile/schema/onboarding";
import { useRiseIn } from "@/hooks/useRiseIn";
import { useAuthStore } from "@/stores/auth";
import {
  colors,
  CTA_GRADIENT,
  HARD_SHADOW,
  HERO_GRADIENT,
} from "@/theme/colors";

// 0 = personal data (step 0, no progress bar), 1 = position, 2 = level,
// 3 = modality, 4 = completion. Ephemeral UI — not separate routes.
type Step = 0 | 1 | 2 | 3 | 4;

// POSITION_OPTIONS is shared with S10 (edit profile) — imported from the schema
// module so both screens reference one source of truth.

const LEVEL_OPTIONS: { code: Level; name: string; hint: string }[] = [
  {
    code: "INICIANTE",
    name: "Iniciante",
    hint: "Ainda aprendendo as regras e fundamentos",
  },
  {
    code: "INTERMEDIARIO",
    name: "Intermediário",
    hint: "Joga bem, tem experiência em partidas",
  },
  {
    code: "AVANCADO",
    name: "Avançado",
    hint: "Alta performance, leva a sério",
  },
];

const MODALITY_OPTIONS: {
  code: Modality;
  name: string;
  hint: string;
  tag: string;
  gradient: readonly [string, string];
}[] = [
  {
    code: "INDOOR",
    name: "Vôlei de quadra",
    hint: "Clássico 6x6, na quadra coberta",
    tag: "QUADRA",
    gradient: ["#1A1AFF", "#0A0A3C"], // navy → blue court art
  },
  {
    code: "BEACH",
    name: "Vôlei de praia",
    hint: "Dupla 2x2, no calor da areia",
    tag: "PRAIA",
    gradient: ["#00B4D8", "#1A1AFF"], // cyan → blue beach art
  },
];

// Per-step header copy (steps 1–3 only).
const STEP_META: Record<1 | 2 | 3, { title: string; subtitle: string }> = {
  1: {
    title: "QUAL SUA POSIÇÃO?",
    subtitle:
      "Escolha onde você joga melhor. Isso equilibra os times nas partidas.",
  },
  2: {
    title: "SEU NÍVEL DE JOGO",
    subtitle: "Seja sincero — é o que garante partidas justas e equilibradas.",
  },
  3: {
    title: "MODALIDADE FAVORITA",
    subtitle: "Onde você curte mais entrar em quadra?",
  },
};

// Which form fields each step must validate before advancing.
const STEP_FIELDS: Record<Step, (keyof OnboardingProfileInput)[]> = {
  0: ["firstName", "lastName", "birthDate", "handle"],
  1: ["position"],
  2: ["level"],
  3: ["modality"],
  4: [],
};

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>(0);
  const createProfile = useCreateProfile();
  const setHasProfile = useAuthStore((s) => s.setHasProfile);

  const {
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<OnboardingProfileInput>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    // Onboarding always starts blank — this is the user's first run.
    defaultValues: {
      firstName: "",
      lastName: "",
      birthDate: "",
      handle: "",
    },
  });

  // Live values driving per-step CTA enablement and the completion summary.
  const values = watch();

  // Step 0 enabled only when all four personal fields have content (Zod still
  // validates on advance). Steps 1–3 enabled when their single-select is set.
  const stepValid = ((): boolean => {
    switch (step) {
      case 0:
        return Boolean(
          values.firstName?.trim() &&
          values.lastName?.trim() &&
          values.birthDate?.length === 10 &&
          values.handle?.trim(),
        );
      case 1:
        return Boolean(values.position);
      case 2:
        return Boolean(values.level);
      case 3:
        return Boolean(values.modality);
      default:
        return true;
    }
  })();

  // Steps 1–4 have no back chevron (designer's layout), so the Android back
  // gesture walks one step back instead of leaving the wizard with the answers.
  useEffect(() => {
    if (step === 0) {
      return;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setStep((step - 1) as Step);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  };

  const advance = async () => {
    const ok = await trigger(STEP_FIELDS[step]);
    if (!ok) {
      return; // surface inline errors; never advance on invalid
    }
    setStep((step + 1) as Step);
  };

  const onValid = (data: OnboardingProfileInput) => {
    createProfile.mutate(data, {
      onSuccess: () => {
        setHasProfile(true);
        router.replace("/(tabs)");
      },
    });
  };

  if (step === 0) {
    return (
      <PersonalDataStep
        control={control}
        errors={errors}
        canContinue={stepValid}
        onBack={goBack}
        onContinue={advance}
      />
    );
  }

  if (step === 4) {
    return (
      <CompletionStep
        position={values.position}
        level={values.level}
        modality={values.modality}
        loading={createProfile.isPending}
        error={createProfile.isError}
        errorMessage={createProfile.error?.message}
        onEnter={handleSubmit(onValid)}
      />
    );
  }

  // Steps 1–3 share the progress-bar wizard chrome.
  return (
    <WizardStep step={step} canContinue={stepValid} onContinue={advance}>
      {step === 1 ? (
        <Controller
          control={control}
          name="position"
          render={({ field: { value, onChange } }) => (
            <PositionGrid value={value} onChange={onChange} />
          )}
        />
      ) : null}
      {step === 2 ? (
        <Controller
          control={control}
          name="level"
          render={({ field: { value, onChange } }) => (
            <LevelList value={value} onChange={onChange} />
          )}
        />
      ) : null}
      {step === 3 ? (
        <Controller
          control={control}
          name="modality"
          render={({ field: { value, onChange } }) => (
            <ModalityList value={value} onChange={onChange} />
          )}
        />
      ) : null}
    </WizardStep>
  );
}

/* ---------------------------------------------------------------- Step 0 -- */

type PersonalDataStepProps = {
  control: ReturnType<typeof useForm<OnboardingProfileInput>>["control"];
  errors: ReturnType<
    typeof useForm<OnboardingProfileInput>
  >["formState"]["errors"];
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
};

function PersonalDataStep({
  control,
  errors,
  canContinue,
  onBack,
  onContinue,
}: PersonalDataStepProps) {
  // Live hint: the typed @ already belongs to someone else.
  const handleTaken = useHandleTaken(useWatch({ control, name: "handle" }));
  // Lift the white card with the keyboard so focused fields and the CTA stay
  // visible (native resize is disabled app-wide by useAnimatedKeyboard).
  const keyboard = useAnimatedKeyboard();
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
  }));

  return (
    <View className="flex-1 bg-surface-dark">
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1">
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            className="ml-4 mt-2 h-10 w-10 items-center justify-center rounded-full bg-surface-dark/40"
            testID="onboarding-back"
          >
            <ChevronLeft size={24} color={colors.textOnDark} />
          </Pressable>
        </SafeAreaView>
      </LinearGradient>

      <Animated.ScrollView
        className="absolute inset-x-0 bottom-0 bg-white"
        style={[
          {
            // top-only radius (card token = 20px); bottom stays square against
            // the screen edge so the blue background never shows through.
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          cardStyle,
        ]}
        contentContainerStyle={{
          paddingHorizontal: 24, // px-6 — breathing room from the white card edges
          paddingTop: 24,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start gap-4">
          <View className="flex-1">
            <Controller
              control={control}
              name="firstName"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="NOME"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Renan"
                  autoCapitalize="words"
                  error={errors.firstName?.message}
                  testID="onboarding-first-name"
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="lastName"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="SOBRENOME"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Dias"
                  autoCapitalize="words"
                  error={errors.lastName?.message}
                  testID="onboarding-last-name"
                />
              )}
            />
          </View>
        </View>

        <View className="mt-4">
          <Controller
            control={control}
            name="birthDate"
            render={({ field: { value, onChange } }) => (
              <DateField
                label="DATA DE NASCIMENTO"
                value={value}
                onChangeText={onChange}
                error={errors.birthDate?.message}
                testID="onboarding-birth-date"
              />
            )}
          />
        </View>

        {/* APELIDO group block */}
        <View className="mt-4 rounded-card bg-bg-light-alt p-4">
          <Controller
            control={control}
            name="handle"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="APELIDO"
                value={value}
                onChangeText={onChange}
                placeholder="renan"
                autoCapitalize="none"
                maxLength={20}
                error={
                  errors.handle?.message ??
                  (handleTaken ? HANDLE_TAKEN_MESSAGE : undefined)
                }
                testID="onboarding-handle"
                leftAdornment={
                  <Text className="font-num text-body text-primary">@</Text>
                }
                rightSlot={
                  <View className="shrink-0 rounded-pill bg-accent px-3 py-1">
                    <Text
                      numberOfLines={1}
                      className="font-mono text-mono text-text-primary uppercase"
                    >
                      SEU @ NA QUADRA
                    </Text>
                  </View>
                }
              />
            )}
          />
          <Text className="mt-2 font-body text-caption text-text-muted">
            É assim que a galera vai te encontrar e marcar nas partidas.
          </Text>
        </View>

        <View className="mt-6">
          <Button
            variant="grad"
            onPress={onContinue}
            disabled={!canContinue}
            testID="onboarding-continue"
          >
            Continuar
          </Button>
        </View>

        <Text className="mt-4 text-center font-body text-caption text-text-muted">
          Você poderá editar essas informações depois no seu perfil.
        </Text>
      </Animated.ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------ Steps 1–3 -- */

/** Fades its children up into place on mount (the prototype's `.q-rise`). */
function Rise({
  delay,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Animated.View className={className} style={useRiseIn({ delay })}>
      {children}
    </Animated.View>
  );
}

const PROGRESS_EASING = Easing.bezier(0.4, 0, 0.2, 1);

/** One of the three progress segments; it fills from the left when reached. */
function ProgressSegment({ filled }: { filled: boolean }) {
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(filled ? 1 : 0, {
      duration: 400,
      easing: PROGRESS_EASING,
    });
  }, [fill, filled]);

  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View className="h-1.5 flex-1 overflow-hidden rounded-pill bg-line">
      <Animated.View className="h-full rounded-pill bg-primary" style={style} />
    </View>
  );
}

type WizardStepProps = {
  step: 1 | 2 | 3;
  canContinue: boolean;
  onContinue: () => void;
  children: React.ReactNode;
};

function WizardStep({
  step,
  canContinue,
  onContinue,
  children,
}: WizardStepProps) {
  const meta = STEP_META[step];
  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView className="flex-1 px-6" edges={["top", "left", "right"]}>
        {/* Progress header: no back chevron (Android back walks a step back) */}
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="font-mono text-mono text-text-muted uppercase">
            MONTE SEU PERFIL
          </Text>
          <Text className="font-mono text-mono text-text-muted">
            Passo {step} de 3
          </Text>
        </View>

        <View className="mt-3 flex-row gap-2">
          {[1, 2, 3].map((segment) => (
            <ProgressSegment key={segment} filled={segment <= step} />
          ))}
        </View>

        {/* Keyed by step so each step's content rises in again */}
        <Rise key={step} className="flex-1">
          <Text
            className="mt-6 font-display text-display text-surface-dark uppercase"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {meta.title}
          </Text>
          <Text className="mt-1 font-body text-body text-text-muted">
            {meta.subtitle}
          </Text>

          <ScrollView
            className="mt-4"
            showsVerticalScrollIndicator={false}
            // right/bottom room for the cards' hard shadow
            contentContainerClassName="pb-4 pr-1"
          >
            {children}
          </ScrollView>
        </Rise>
      </SafeAreaView>

      {/* Pinned white footer CTA */}
      <SafeAreaView
        edges={["bottom"]}
        className="border-t border-line bg-white px-6 pb-3 pt-4"
      >
        <Button
          variant="grad"
          onPress={onContinue}
          disabled={!canContinue}
          leftIcon={
            <ChevronRight
              size={20}
              color={canContinue ? colors.surfaceDark : colors.textMuted}
            />
          }
          testID="onboarding-continue"
        >
          Continuar
        </Button>
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------- Step 1 — position grid -- */

const POSITION_ICONS = {
  LEV: Share2,
  PON: ArrowUp,
  OPO: Zap,
  LIB: ShieldCheck,
  COR: Shuffle,
} as const;

function PositionIcon({
  code,
  size,
  color,
}: {
  code: Position;
  size: number;
  color: string;
}) {
  if (code === "CEN") {
    // Net with a ball over it: the prototype's own drawing, lucide has none.
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M4 7.5V20M20 7.5V20M4 9.5h16M4 14h16M8.5 9.5V14M12 9.5V14M15.5 9.5V14" />
        <Circle cx={12} cy={7} r={2} />
      </Svg>
    );
  }
  const Icon = POSITION_ICONS[code];
  return <Icon size={size} color={color} strokeWidth={1.9} />;
}

// Position cards carry their own 4px hard shadow: soft navy at rest, blue when
// selected (inline for the reason given at HARD_SHADOW).
const POSITION_CARD_REST = { boxShadow: "4px 4px 0 0 rgba(10,10,60,0.12)" };
const POSITION_CARD_SELECTED = {
  boxShadow: `4px 4px 0 0 ${colors.primary}`,
  transform: [{ translateX: -1 }, { translateY: -1 }],
};

function PositionCard({
  option,
  index,
  selected,
  onPress,
}: {
  option: (typeof POSITION_OPTIONS)[number];
  index: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Rise delay={35 * index} className="w-[48%]">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={option.name}
        accessibilityState={{ selected }}
        testID={`position-${option.code}`}
        className={`min-h-[112px] justify-between rounded-btn border-2 p-3 ${
          selected ? "border-primary bg-bg-light-alt" : "border-line bg-white"
        }`}
        style={selected ? POSITION_CARD_SELECTED : POSITION_CARD_REST}
      >
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${
            selected ? "bg-primary" : "bg-bg-light"
          }`}
        >
          <PositionIcon
            code={option.code}
            size={21}
            color={selected ? colors.textOnDark : colors.surfaceDark}
          />
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-body-bold text-h2 text-surface-dark">
            {option.name}
          </Text>
          <View
            className={`h-5 w-5 items-center justify-center rounded-full border ${
              selected ? "border-accent bg-accent" : "border-line bg-white"
            }`}
          >
            {selected ? (
              <Check size={11} color={colors.surfaceDark} strokeWidth={3} />
            ) : null}
          </View>
        </View>
      </Pressable>
    </Rise>
  );
}

function PositionGrid({
  value,
  onChange,
}: {
  value: Position | undefined;
  onChange: (v: Position) => void;
}) {
  const chosen = POSITION_OPTIONS.find((option) => option.code === value);
  return (
    <View>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {POSITION_OPTIONS.map((option, index) => (
          <PositionCard
            key={option.code}
            option={option}
            index={index}
            selected={value === option.code}
            onPress={() => onChange(option.code)}
          />
        ))}
      </View>

      {/* What the chosen position does, once one is picked */}
      {chosen ? (
        <Rise
          key={chosen.code}
          className="mt-4 flex-row items-center rounded-chip bg-surface-dark p-3"
        >
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <PositionIcon
              code={chosen.code}
              size={17}
              color={colors.surfaceDark}
            />
          </View>
          <Text
            className="ml-3 flex-1 font-body text-caption text-text-on-dark/80"
            accessibilityLiveRegion="polite"
            testID="position-hint"
          >
            <Text className="font-body-bold text-text-on-dark">
              {chosen.name}
            </Text>
            {` · ${chosen.hint}`}
          </Text>
        </Rise>
      ) : null}
    </View>
  );
}

/* --------------------------------------------------- Step 2 — level list -- */

function LevelList({
  value,
  onChange,
}: {
  value: Level | undefined;
  onChange: (v: Level) => void;
}) {
  return (
    <View>
      {LEVEL_OPTIONS.map((option) => {
        const selected = value === option.code;
        return (
          <Pressable
            key={option.code}
            onPress={() => onChange(option.code)}
            accessibilityRole="button"
            accessibilityLabel={option.name}
            accessibilityState={{ selected }}
            testID={`level-${option.code}`}
            className={`mt-3 flex-row items-center rounded-card border-2 p-4 shadow-card ${
              selected
                ? "border-surface-dark bg-accent/20"
                : "border-transparent bg-white"
            }`}
            style={selected ? HARD_SHADOW : undefined}
          >
            <View
              className={`h-12 w-12 items-center justify-center rounded-chip ${
                selected ? "bg-accent" : "bg-bg-light-alt"
              }`}
            >
              <BarChart3 size={24} color={colors.primary} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-body-extrabold text-h3 text-text-primary">
                {option.name}
              </Text>
              <Text className="mt-1 font-body text-caption text-text-muted">
                {option.hint}
              </Text>
            </View>
            <View
              className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                selected ? "border-surface-dark bg-accent" : "border-line"
              }`}
            >
              {selected ? (
                <Check size={14} color={colors.surfaceDark} strokeWidth={3} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ----------------------------------------------- Step 3 — modality cards -- */

function ModalityList({
  value,
  onChange,
}: {
  value: Modality | undefined;
  onChange: (v: Modality) => void;
}) {
  return (
    <View>
      {MODALITY_OPTIONS.map((option) => {
        const selected = value === option.code;
        return (
          <Pressable
            key={option.code}
            onPress={() => onChange(option.code)}
            accessibilityRole="button"
            accessibilityLabel={option.name}
            accessibilityState={{ selected }}
            testID={`modality-${option.code}`}
            className="mt-4 overflow-hidden rounded-card bg-white shadow-card"
            style={selected ? HARD_SHADOW : undefined}
          >
            <LinearGradient
              colors={option.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ height: 120, justifyContent: "flex-start" }}
            >
              <Text className="m-3 self-end font-mono text-mono text-text-on-dark uppercase">
                {option.tag}
              </Text>
            </LinearGradient>
            <View className="p-4">
              <Text className="font-body-extrabold text-h3 text-text-primary">
                {option.name}
              </Text>
              <Text className="mt-1 font-body text-caption text-text-muted">
                {option.hint}
              </Text>
            </View>

            {/* selection ring drawn on top — keeps the card box/layout fixed so
                the sibling card's gradient never repaints to white */}
            {selected ? (
              <View
                pointerEvents="none"
                className="absolute inset-0 rounded-card border-2 border-surface-dark"
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------ Step 4 — done -- */

function CompletionStep({
  position,
  level,
  modality,
  loading,
  error,
  errorMessage,
  onEnter,
}: {
  position: Position | undefined;
  level: Level | undefined;
  modality: Modality | undefined;
  loading: boolean;
  error: boolean;
  /** Why the save failed (e.g. the @ is already taken); a generic text when absent. */
  errorMessage?: string;
  onEnter: () => void;
}) {
  const positionOption = POSITION_OPTIONS.find((o) => o.code === position);
  const levelOption = LEVEL_OPTIONS.find((o) => o.code === level);
  const modalityOption = MODALITY_OPTIONS.find((o) => o.code === modality);

  return (
    <View className="flex-1 bg-surface-dark">
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1 px-6">
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="font-mono text-mono text-text-on-dark uppercase">
              PERFIL COMPLETO
            </Text>
            <Text className="font-mono text-mono text-text-on-dark uppercase">
              ✓ 3/3
            </Text>
          </View>

          <View className="mt-2 flex-row gap-2">
            {[1, 2, 3].map((segment) =>
              segment === 3 ? (
                // Final segment filled with the brand CTA gradient (blue → lime).
                <View
                  key={segment}
                  className="h-1.5 flex-1 overflow-hidden rounded-pill"
                >
                  <LinearGradient
                    colors={CTA_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : (
                <View
                  key={segment}
                  className="h-1.5 flex-1 rounded-pill bg-accent"
                />
              ),
            )}
          </View>

          <View className="mt-10 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
              <Check size={40} color={colors.surfaceDark} />
            </View>
            <Text className="mt-6 text-center font-display text-display text-text-on-dark uppercase">
              PERFIL PRONTO!
            </Text>
            <Text className="mt-2 text-center font-body text-body text-text-on-dark/70">
              Já dá pra montar times equilibrados pra você. Bora encontrar
              partidas perto e entrar em quadra.
            </Text>
          </View>

          {/* Summary rows on a translucent dark card */}
          <View className="mt-8 gap-3">
            <SummaryRow
              label="Posição"
              value={positionOption?.name ?? "—"}
              badge={positionOption?.code}
            />
            <SummaryRow
              label="Nível"
              value={levelOption?.name ?? "—"}
              icon={<BarChart3 size={18} color={colors.textOnDark} />}
            />
            <SummaryRow
              label="Modalidade"
              value={modalityOption?.name ?? "—"}
              icon={<Globe size={18} color={colors.textOnDark} />}
            />
          </View>

          <View className="flex-1" />

          {error ? (
            <Text
              className="mb-3 text-center font-body text-caption text-danger"
              accessibilityLiveRegion="polite"
            >
              {errorMessage || "Não foi possível criar seu perfil. Tente novamente."}
            </Text>
          ) : null}

          <View className="pb-8">
            <Button
              variant="grad"
              onPress={onEnter}
              loading={loading}
              leftIcon={<Globe size={20} color={colors.surfaceDark} />}
              testID="onboarding-enter"
            >
              Entrar na quadra
            </Button>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  badge,
  icon,
}: {
  label: string;
  value: string;
  badge?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center rounded-card bg-white/10 p-4">
      <View className="h-10 w-10 items-center justify-center rounded-chip bg-white/15">
        {badge ? (
          <Text className="font-display text-eyebrow text-text-on-dark uppercase">
            {badge}
          </Text>
        ) : (
          icon
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="font-mono text-mono text-text-on-dark/70 uppercase">
          {label}
        </Text>
        <Text className="mt-1 font-body-extrabold text-h3 text-text-on-dark">
          {value}
        </Text>
      </View>
    </View>
  );
}
