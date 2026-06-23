import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ChevronLeft, Pencil } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { FilterChip } from "@/components/ui/FilterChip";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { TextField } from "@/components/ui/TextField";
import { useMyProfile } from "@/features/profile/api/getMyProfile";
import { useUpdateProfile } from "@/features/profile/api/updateProfile";
import {
  editProfileSchema,
  type EditProfileInput,
} from "@/features/profile/schema/editProfile";
import { POSITION_OPTIONS } from "@/features/profile/schema/onboarding";
import type { MyProfile } from "@/features/profile/types/profile";
import { colors } from "@/theme/colors";

// ── Header (inline; back + title — mirrors RankingHeader / settings) ──
function EditHeader() {
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
        Editar perfil
      </Text>
    </View>
  );
}

function EditSkeleton() {
  return (
    <View className="px-4 mt-6 gap-4">
      <View className="self-center h-16 w-16 rounded-full bg-bg-light-alt" />
      <View className="h-12 rounded-chip bg-bg-light-alt" />
      <View className="h-12 rounded-chip bg-bg-light-alt" />
      <View className="h-12 rounded-chip bg-bg-light-alt" />
    </View>
  );
}

function EditError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="px-4 mt-10 items-center" accessibilityLiveRegion="polite">
      <Text className="font-body text-body text-text-muted text-center">
        Não foi possível carregar seu perfil
      </Text>
      <Button variant="ghost" onPress={onRetry}>
        Tentar novamente
      </Button>
    </View>
  );
}

export default function EditProfileScreen() {
  const { data, isPending, isError, refetch } = useMyProfile();

  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={["top"]} className="flex-1">
        <EditHeader />
        {isPending ? (
          <EditSkeleton />
        ) : isError ? (
          <EditError onRetry={() => refetch()} />
        ) : (
          <EditProfileForm profile={data} />
        )}
      </SafeAreaView>
    </View>
  );
}

function EditProfileForm({ profile }: { profile: MyProfile }) {
  const updateProfile = useUpdateProfile();
  // Local UI state: a polite message when media-library permission is denied.
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Lift the scroll content with the keyboard so focused fields stay visible
  // (mirrors the onboarding keyboard-aware approach).
  const keyboard = useAnimatedKeyboard();
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
  }));

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName ?? "",
      handle: profile.handle ?? "",
      birthDate: profile.birthDate ?? "",
      phone: profile.phone ?? "",
      position: profile.position,
      avatarUri: undefined,
    },
  });

  const avatarUri = watch("avatarUri");

  const onChangePhoto = async () => {
    setPermissionDenied(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const picked = result.canceled ? undefined : result.assets[0];
    if (picked) {
      setValue("avatarUri", picked.uri, { shouldDirty: true });
    }
  };

  const onSave = (values: EditProfileInput) => {
    updateProfile.mutate(values, {
      onSuccess: () => router.back(),
    });
  };

  return (
    <>
      <Animated.ScrollView
        style={contentStyle}
        contentContainerClassName="px-4 pb-32"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Trocar foto */}
        <View className="items-center mt-2">
          <View>
            <Avatar
              uri={avatarUri ?? profile.avatarUrl}
              name={profile.firstName}
              size="lg"
            />
            <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full bg-primary border-2 border-bg-light">
              <Pencil size={14} color={colors.textOnDark} />
            </View>
          </View>
          <Button variant="ghost" onPress={onChangePhoto}>
            Trocar foto
          </Button>
          {permissionDenied ? (
            <Text
              className="font-body text-caption text-danger text-center"
              accessibilityLiveRegion="polite"
            >
              Permissão de fotos negada. Ative em &quot;Permissões do app&quot;.
            </Text>
          ) : null}
        </View>

        {/* NOME + SOBRENOME */}
        <View className="flex-row gap-4 mt-6">
          <View className="flex-1">
            <Controller
              control={control}
              name="firstName"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="NOME"
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                  error={errors.firstName?.message}
                  testID="edit-first-name"
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
                  autoCapitalize="words"
                  error={errors.lastName?.message}
                  testID="edit-last-name"
                />
              )}
            />
          </View>
        </View>

        {/* APELIDO */}
        <View className="mt-4">
          <Controller
            control={control}
            name="handle"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="APELIDO"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                maxLength={20}
                error={errors.handle?.message}
                testID="edit-handle"
                leftAdornment={
                  <Text className="font-num text-body text-primary">@</Text>
                }
              />
            )}
          />
        </View>

        {/* DATA DE NASCIMENTO */}
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
                testID="edit-birth-date"
              />
            )}
          />
        </View>

        {/* NÚMERO DE TELEFONE */}
        <View className="mt-4">
          <Text className="font-body text-eyebrow text-text-primary uppercase mb-2">
            Número de telefone
          </Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { value, onChange } }) => (
              <PhoneInput
                value={value}
                onChangeText={onChange}
                country="BR"
                error={errors.phone?.message}
                testID="edit-phone"
              />
            )}
          />
        </View>

        {/* POSIÇÃO EM QUADRA — single-select chips */}
        <Text className="font-body text-eyebrow text-text-primary uppercase mt-6 mb-2">
          Posição em quadra
        </Text>
        <Controller
          control={control}
          name="position"
          render={({ field: { value, onChange } }) => (
            <View className="flex-row flex-wrap gap-2">
              {POSITION_OPTIONS.map((option) => (
                <FilterChip
                  key={option.code}
                  label={option.name}
                  selected={value === option.code}
                  onPress={() => onChange(option.code)}
                  testID={`edit-position-${option.code}`}
                />
              ))}
            </View>
          )}
        />
        {errors.position ? (
          <Text
            className="mt-2 font-body text-caption text-danger"
            accessibilityLiveRegion="polite"
          >
            Selecione sua posição
          </Text>
        ) : null}
      </Animated.ScrollView>

      {/* Pinned CTA */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-bg-light">
        {updateProfile.isError ? (
          <Text
            className="mb-3 text-center font-body text-caption text-danger"
            accessibilityLiveRegion="polite"
          >
            Não foi possível salvar. Tente novamente.
          </Text>
        ) : null}
        <Button
          variant="primary"
          onPress={handleSubmit(onSave)}
          loading={updateProfile.isPending}
          testID="edit-save"
        >
          Salvar alterações
        </Button>
      </View>
    </>
  );
}
