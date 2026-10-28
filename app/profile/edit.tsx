import { zodResolver } from "@hookform/resolvers/zod";
import { Asset } from "expo-asset";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Pencil } from "lucide-react-native";
import { useState } from "react";
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
import { BackHeader } from "@/components/ui/BackHeader";
import { PositionGrid } from "@/components/domain/PositionPicker";
import { formatBR } from "@/components/ui/PhoneInput";
import { TextField } from "@/components/ui/TextField";
import { useMyProfile } from "@/features/profile/api/getMyProfile";
import { useUpdateProfile } from "@/features/profile/api/updateProfile";
import {
  editProfileSchema,
  type EditProfileInput,
} from "@/features/profile/schema/editProfile";
import type { MyProfile } from "@/features/profile/types/profile";
import { colors } from "@/theme/colors";
import { DEFAULT_AVATAR, PRESET_AVATARS } from "@/theme/defaultAvatars";

// In a release APK a bundled image's `localUri` is a bare drawable name
// ("assets_avatars_preset01"), which the photo resizer cannot open: the preset
// avatar never saved. As an `android.resource://` URI any Android loader reads it.
const ANDROID_PACKAGE = "com.quadra.app";
function fileUriOfAsset(localUri: string): string {
  return localUri.includes(":") ? localUri : `android.resource://${ANDROID_PACKAGE}/drawable/${localUri}`;
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
  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <View className="flex-1 bg-bg-light">
      <View style={{ flex: 1 }}>
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
      </View>

      <BackHeader
        title="Editar perfil"
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
  // Which Quadra avatar is picked (null: none, or a photo from the gallery).
  const [preset, setPreset] = useState<number | null>(null);

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
      setPreset(null);
      setValue("avatarUri", picked.uri, { shouldDirty: true });
    }
  };

  // A preset avatar becomes the photo: its bundled file goes up like a pick.
  const onPickPreset = async (index: number) => {
    const [asset] = await Asset.loadAsync(PRESET_AVATARS[index]!);
    if (asset?.localUri) {
      setPreset(index);
      setValue("avatarUri", fileUriOfAsset(asset.localUri), { shouldDirty: true });
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

        {/* Or one of the Quadra avatars */}
        <Text className="font-body-bold text-eyebrow text-text-muted uppercase mt-6">
          Ou escolha um avatar
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4 mt-2"
          contentContainerClassName="px-4 gap-3"
        >
          {PRESET_AVATARS.map((source, index) => (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`Avatar ${index + 1}`}
              accessibilityState={{ selected: preset === index }}
              onPress={() => void onPickPreset(index)}
              testID={`preset-avatar-${index}`}
              className="h-16 w-16 rounded-full border-2 border-transparent"
              style={preset === index ? { borderColor: colors.primary } : undefined}
            >
              <Image source={source} contentFit="cover" style={{ flex: 1, borderRadius: 999 }} />
            </Pressable>
          ))}
        </ScrollView>

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

        {/* NÚMERO DE TELEFONE — the login identity, shown read-only */}
        {profile.phone ? (
          <View className="mt-4">
            <TextField
              label="NÚMERO DE TELEFONE"
              value={formatBR(profile.phone)}
              editable={false}
              onChangeText={() => {}}
              testID="edit-phone"
              leftAdornment={
                <Text className="font-body-semibold text-body-bold text-primary">
                  +55
                </Text>
              }
            />
          </View>
        ) : null}

        {/* POSIÇÃO EM QUADRA — same cards as the onboarding */}
        <Text className="font-body-bold text-eyebrow text-text-primary uppercase mt-6 mb-3">
          Posição em quadra
        </Text>
        <Controller
          control={control}
          name="position"
          render={({ field: { value, onChange } }) => (
            <PositionGrid
              value={value}
              onChange={onChange}
              testIDPrefix="edit-position"
            />
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
