import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { ChevronLeft, Flame, Heart, Share2, Zap } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { DEFAULT_AVATAR } from '@/theme/defaultAvatars';
import { Button } from '@/components/ui/Button';
import { useSendFeedback } from '@/features/profile/api/sendFeedback';
import { useMyProfile } from '@/features/profile/api/getMyProfile';
import {
  FEEDBACK_MESSAGE_MAX,
  feedbackSchema,
  type FeedbackInput,
  type FeedbackType,
} from '@/features/profile/schema/feedback';
import { colors } from '@/theme/colors';

const TEXT_MUTED = '#7A7A9A'; // text-muted token — textarea placeholder color

// shadow-card token (DESIGN_SYSTEM). Applied via inline style — NOT a toggled
// className — so flipping a tile's selected state never adds/removes a boxShadow
// class after the initial render (which makes react-native-css-interop remount
// the node and crash while reading navigation context). Mirrors Button.tsx.
const SHADOW_CARD = '0 2px 12px rgba(10,10,60,0.06)';

// ── Header (inline; back + title — mirrors settings / edit / notifications) ──
function FeedbackHeader() {
  return (
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
        Feedback
      </Text>
    </View>
  );
}

// ── Eyebrow section label (TIPO / SUA MENSAGEM) ──
function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-body text-eyebrow text-text-muted uppercase px-4 mt-6 mb-2">
      {children}
    </Text>
  );
}

// Feedback-type tiles (icon + label). Order + copy mirror the reference screen.
const TYPE_OPTIONS: {
  value: FeedbackType;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
}[] = [
  { value: 'suggestion', label: 'Sugestão', Icon: Flame },
  { value: 'problem', label: 'Problema', Icon: Zap },
  { value: 'praise', label: 'Elogio', Icon: Heart },
];

// ── One feedback-type tile — selected = blue fill + white icon/label ──
function TypeTile({
  label,
  Icon,
  selected,
  onPress,
  testID,
}: {
  label: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      className={`flex-1 h-24 items-center justify-center rounded-card ${
        selected ? 'bg-primary' : 'bg-white'
      }`}
      // Card shadow via inline style (stable across the selected flip) — see
      // SHADOW_CARD note above.
      style={selected ? undefined : { boxShadow: SHADOW_CARD }}
    >
      <Icon size={24} color={selected ? colors.textOnDark : colors.primary} />
      <Text
        className={`mt-2 font-body text-caption ${
          selected ? 'text-text-on-dark' : 'text-text-primary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── "Enviando como" identity card — async (skeleton / loaded); errors are
//    non-blocking (feedback can still be sent without the identity chip). ──
function SendingAsCard() {
  const { data, isPending } = useMyProfile();

  if (isPending || !data) {
    return (
      <View className="mx-4 mt-6 bg-white rounded-card shadow-card p-4 flex-row items-center gap-3">
        <View className="h-10 w-10 rounded-full bg-bg-light-alt" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-24 rounded-chip bg-bg-light-alt" />
          <View className="h-4 w-40 rounded-chip bg-bg-light-alt" />
        </View>
      </View>
    );
  }

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
  const identity = [fullName, data.handle ? `@${data.handle}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="mx-4 mt-6 bg-white rounded-card shadow-card p-4 flex-row items-center gap-3">
      <Avatar
        uri={data.avatarUrl}
        name={data.firstName}
        size="sm"
        defaultSource={DEFAULT_AVATAR}
      />
      <View className="flex-1">
        <Text className="font-body text-caption text-text-muted">
          Enviando como
        </Text>
        <Text className="font-body text-body-bold text-text-primary">
          {identity}
        </Text>
      </View>
    </View>
  );
}

export default function FeedbackScreen() {
  const sendFeedback = useSendFeedback();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { type: 'suggestion', message: '' },
  });

  const message = watch('message');
  const canSubmit = message.trim().length > 0;

  const onSubmit = (values: FeedbackInput) => {
    sendFeedback.mutate(values, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top']} className="flex-1">
        <FeedbackHeader />

        <ScrollView
          contentContainerClassName="pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TIPO — single-select tiles */}
          <SectionLabel>Tipo</SectionLabel>
          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <View className="flex-row gap-3 px-4">
                {TYPE_OPTIONS.map((option) => (
                  <TypeTile
                    key={option.value}
                    label={option.label}
                    Icon={option.Icon}
                    selected={value === option.value}
                    onPress={() => onChange(option.value)}
                    testID={`feedback-type-${option.value}`}
                  />
                ))}
              </View>
            )}
          />

          {/* SUA MENSAGEM — multiline free text */}
          <SectionLabel>Sua mensagem</SectionLabel>
          <View className="px-4">
            <Controller
              control={control}
              name="message"
              render={({ field: { value, onChange } }) => (
                <View
                  className={`rounded-card border bg-white px-4 py-3 ${
                    errors.message ? 'border-danger' : 'border-line'
                  }`}
                >
                  <TextInput
                    testID="feedback-message"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Conta pra gente o que você achou, o que faltou ou o que deu errado…"
                    placeholderTextColor={TEXT_MUTED}
                    multiline
                    textAlignVertical="top"
                    maxLength={FEEDBACK_MESSAGE_MAX}
                    accessibilityLabel="Sua mensagem"
                    className="h-40 font-body text-body text-text-primary"
                  />
                </View>
              )}
            />
            {errors.message ? (
              <Text
                className="mt-2 font-body text-caption text-danger"
                accessibilityLiveRegion="polite"
              >
                {errors.message.message}
              </Text>
            ) : null}
          </View>

          {/* Enviando como */}
          <SendingAsCard />

          {/* CTA */}
          <View className="px-4 mt-6">
            {sendFeedback.isError ? (
              <Text
                className="mb-3 text-center font-body text-caption text-danger"
                accessibilityLiveRegion="polite"
              >
                Não foi possível enviar. Tente novamente.
              </Text>
            ) : null}
            <Button
              variant="grad"
              onPress={handleSubmit(onSubmit)}
              disabled={!canSubmit}
              loading={sendFeedback.isPending}
              leftIcon={
                <Share2
                  size={18}
                  color={canSubmit ? colors.textOnDark : colors.textMuted}
                />
              }
              testID="feedback-submit"
            >
              Enviar feedback
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
