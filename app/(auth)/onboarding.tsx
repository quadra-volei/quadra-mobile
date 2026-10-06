import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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
import { useAuthStore } from "@/stores/auth";
import { colors, CTA_GRADIENT, HERO_GRADIENT } from "@/theme/colors";

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

  const goBack = () => {
    if (step === 0) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/login");
      }
      return;
    }
    setStep((step - 1) as Step);
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
        onEnter={handleSubmit(onValid)}
      />
    );
  }

  // Steps 1–3 share the progress-bar wizard chrome.
  return (
    <WizardStep
      step={step}
      canContinue={stepValid}
      onBack={goBack}
      onContinue={advance}
    >
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
                error={errors.handle?.message}
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

type WizardStepProps = {
  step: 1 | 2 | 3;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
  children: React.ReactNode;
};

function WizardStep({
  step,
  canContinue,
  onBack,
  onContinue,
  children,
}: WizardStepProps) {
  const meta = STEP_META[step];
  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView
        className="flex-1"
        edges={["top", "left", "right", "bottom"]}
      >
        <View className="flex-1 px-4">
          {/* Header row + progress bar */}
          <View className="mt-2 flex-row items-center justify-between">
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              className="h-8 w-8 items-center justify-center rounded-full"
              testID="onboarding-back"
            >
              <ChevronLeft size={20} color={colors.primary} />
            </Pressable>
            <Text className="font-mono text-mono text-text-muted uppercase">
              MONTE SEU PERFIL
            </Text>
            <Text className="font-mono text-mono text-text-muted uppercase">
              Passo {step} de 3
            </Text>
          </View>

          <View className="mt-2 flex-row gap-2">
            {[1, 2, 3].map((segment) => (
              <View
                key={segment}
                className={`h-1.5 flex-1 rounded-pill ${
                  segment <= step ? "bg-primary" : "bg-line"
                }`}
              />
            ))}
          </View>

          <Text
            className="mt-6 font-display text-display text-text-primary uppercase"
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {meta.title}
          </Text>
          <Text className="mt-2 font-body text-body text-text-muted">
            {meta.subtitle}
          </Text>

          <ScrollView
            className="mt-6"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-4"
          >
            {children}
          </ScrollView>
        </View>

        {/* Pinned footer CTA */}
        <View className="px-4 pb-8 pt-2">
          <Button
            variant="grad"
            onPress={onContinue}
            disabled={!canContinue}
            leftIcon={<ChevronRight size={20} color={colors.textOnDark} />}
            testID="onboarding-continue"
          >
            Continuar
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------- Step 1 — position grid -- */

function PositionGrid({
  value,
  onChange,
}: {
  value: Position | undefined;
  onChange: (v: Position) => void;
}) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {POSITION_OPTIONS.map((option) => {
        const selected = value === option.code;
        return (
          <Pressable
            key={option.code}
            onPress={() => onChange(option.code)}
            accessibilityRole="button"
            accessibilityLabel={option.name}
            accessibilityState={{ selected }}
            testID={`position-${option.code}`}
            className={`w-[48%] rounded-card p-4 shadow-card ${
              selected ? "bg-accent" : "bg-white"
            }`}
          >
            <View className="flex-row items-center">
              <Text className="font-display text-h1 text-primary uppercase">
                {option.code}
              </Text>
              {option.star ? (
                <Text className="ml-1 font-body text-body text-text-primary">
                  ★
                </Text>
              ) : null}
            </View>
            <Text className="mt-2 font-body text-h3 text-text-primary">
              {option.name}
            </Text>
            <Text className="mt-1 font-body text-caption text-text-muted">
              {option.hint}
            </Text>
          </Pressable>
        );
      })}
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
            className="mt-3 flex-row items-center rounded-card bg-white p-4 shadow-card"
          >
            <View className="h-12 w-12 items-center justify-center rounded-chip bg-bg-light-alt">
              <BarChart3 size={24} color={colors.primary} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-body text-h3 text-text-primary">
                {option.name}
              </Text>
              <Text className="mt-1 font-body text-caption text-text-muted">
                {option.hint}
              </Text>
            </View>
            <View
              className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                selected ? "border-primary bg-primary" : "border-line"
              }`}
            >
              {selected ? <Check size={14} color={colors.textOnDark} /> : null}
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
              <Text className="font-body text-h3 text-text-primary">
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
                className="absolute inset-0 rounded-card border-2 border-primary"
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
  onEnter,
}: {
  position: Position | undefined;
  level: Level | undefined;
  modality: Modality | undefined;
  loading: boolean;
  error: boolean;
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
              Não foi possível criar seu perfil. Tente novamente.
            </Text>
          ) : null}

          <View className="pb-8">
            <Button
              variant="grad"
              onPress={onEnter}
              loading={loading}
              leftIcon={<Globe size={20} color={colors.textOnDark} />}
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
        <Text className="mt-1 font-body text-h3 text-text-on-dark">
          {value}
        </Text>
      </View>
    </View>
  );
}
