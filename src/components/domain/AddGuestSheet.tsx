import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { TextField } from '@/components/ui/TextField';
import {
  addGuestSchema,
  PLAYER_POSITIONS,
  type AddGuestInput,
} from '@/features/matches/schema/addGuest';
import type { PlayerPosition } from '@/features/matches/types/matchDetail';
import { colors } from '@/theme/colors';

// Presentational label map (token-free copy) — mirrors S12's POSITION_LABEL.
const POSITION_LABEL: Record<PlayerPosition, string> = {
  LEV: 'Levantador',
  PON: 'Ponteiro',
  OPO: 'Oposto',
  CEN: 'Central',
  LIB: 'Líbero',
  COR: 'Corredor',
};

export type AddGuestSheetProps = {
  visible: boolean;
  /** Dismiss without adding (backdrop / close / cancel). */
  onClose: () => void;
  /** Submit a validated guest; the parent runs the mutation. */
  onSubmit: (values: AddGuestInput) => void;
  /** Mutation in flight — drives the CTA spinner and blocks re-submits. */
  submitting?: boolean;
  testID?: string;
};

/**
 * Bottom-sheet form to add a guest player to an open match slot (S12 organizer
 * flow). Name is required; court position is optional (chips) so the S13 draw
 * can place the guest. Controlled by the parent via `visible`; the form resets
 * each time it opens. RHF + Zod per the forms rule.
 */
export function AddGuestSheet({
  visible,
  onClose,
  onSubmit,
  submitting = false,
  testID,
}: AddGuestSheetProps) {
  const insets = useSafeAreaInsets();
  const { control, handleSubmit, watch, setValue, reset } =
    useForm<AddGuestInput>({
      resolver: zodResolver(addGuestSchema),
      defaultValues: { name: '', position: undefined },
    });

  // Reset to a clean form every time the sheet opens.
  useEffect(() => {
    if (visible) {
      reset({ name: '', position: undefined });
    }
  }, [visible, reset]);

  const position = watch('position');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop — tap to dismiss. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        className="flex-1 justify-end bg-black/40"
      >
        {/* Sheet card — stopPropagation so taps inside don't dismiss. */}
        <Pressable
          testID={testID}
          onPress={() => {}}
          className="rounded-t-card bg-bg-light px-4 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-h2 text-text-primary uppercase">
              Adicionar convidado
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-chip bg-white shadow-card"
            >
              <X size={20} color={colors.surfaceDark} />
            </Pressable>
          </View>

          <Text className="mt-1 font-body text-caption text-text-muted">
            Preencha uma vaga com alguém que não usa o app.
          </Text>

          {/* ── Nome ── */}
          <View className="mt-4">
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange }, fieldState }) => (
                <TextField
                  label="Nome"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ex: Amigo do Caio"
                  autoCapitalize="words"
                  error={fieldState.error?.message}
                  testID="guest-name"
                />
              )}
            />
          </View>

          {/* ── Posição (opcional) ── */}
          <Text className="mt-4 font-body text-eyebrow text-text-primary uppercase">
            Posição (opcional)
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {PLAYER_POSITIONS.map((pos) => (
              <FilterChip
                key={pos}
                label={POSITION_LABEL[pos]}
                selected={position === pos}
                // Tap again to clear the optional selection.
                onPress={() =>
                  setValue('position', position === pos ? undefined : pos)
                }
                testID={`guest-position-${pos}`}
              />
            ))}
          </View>

          <View className="mt-6">
            <Button
              variant="grad"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              testID="guest-submit"
            >
              Adicionar à partida
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
