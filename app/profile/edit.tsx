import { zodResolver } from "@hookform/resolvers/zod";
import { BlurTargetView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Pencil } from "lucide-react-native";
import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  HANDLE_TAKEN_MESSAGE,
  useHandleTaken,
} from "@/features/profile/api/handleAvailability";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { GlassBackHeader } from "@/components/ui/GlassBackHeader";
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
import { DEFAULT_AVATAR } from "@/theme/defaultAvatars";

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
  const [headerHeight, setHeaderHeight] = useState(0);
  const blurTarget = useRef<View>(null);

  return (
    <View className="flex-1 bg-bg-light">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        {isPending ? (
          <View style={{ paddingTop: headerHeight }}>
            <EditSkeleton />
          </View>
        ) : isError ? (
          <View style={{ paddingTop: headerHeight }}>
            <EditError onRetry={() => refetch()} />
          </View>
        ) : (
          <EditProfileForm profile={data} headerHeight={headerHeight} />
        )}
      </BlurTargetView>

      <GlassBackHeader
        title="Editar perfil"
        blurTarget={blurTarget}
        onHeight={setHeaderHeight}
      />
    </View>
  );
}

function EditProfileForm({
  profile,
  headerHeight,
}: {
  profile: MyProfile;
  headerHeight: number;
}) {
  const updateProfile = useUpdateProfile();
  const insets = useSafeAreaInsets();
  // Local UI state: a polite message when media-library permission is denied.
  const [permissionDenied, setPermissionDenied] = useState(false);

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
  // Live hint: the typed @ already belongs to someone else.
  const handleTaken = useHandleTaken(useWatch({ control, name: "handle" }));

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
      <ScrollView
        contentContainerClassName="px-4"
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: insets.bottom + 128,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Trocar foto */}
        <View className="items-center mt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trocar foto"
            onPress={onChangePhoto}
          >
            <Avatar
              uri={avatarUri ?? profile.avatarUrl}
              name={profile.firstName}
              size="lg"
              defaultSource={DEFAULT_AVATAR}
            />
            <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full bg-primary border-2 border-bg-light">
              <Pencil size={14} color={colors.textOnDark} />
            </View>
          </Pressable>
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
                editable={false}
                error={
                  errors.handle?.message ??
                  (handleTaken ? HANDLE_TAKEN_MESSAGE : undefined)
                }
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
      </ScrollView>

      {/* Pinned CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 pt-3 bg-bg-light"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        {updateProfile.isError ? (
          <Text
            className="mb-3 text-center font-body text-caption text-danger"
            accessibilityLiveRegion="polite"
          >
            {updateProfile.error?.message ??
              "Não foi possível salvar. Tente novamente."}
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
