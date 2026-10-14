import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { PressableScale } from '@/components/ui/PressableScale';
import {
  type NewPost,
  newPostSchema,
  POST_TEXT_MAX,
  useCreatePost,
  useInvitableMatches,
} from '@/features/network/api/postsApi';
import { useRecentMatches } from '@/features/profile/api/getRecentMatches';
import { colors } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-body-bold text-eyebrow text-text-muted uppercase mt-6 mb-2">
      {children}
    </Text>
  );
}

export default function NewPostScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const createPost = useCreatePost();
  // ponytail: only the last 5 finished matches can be picked. Page the history
  // here when players ask for older ones.
  const recentMatches = useRecentMatches();
  const invitableMatches = useInvitableMatches();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewPost>({
    resolver: zodResolver(newPostSchema),
    defaultValues: { text: '', photoUri: undefined, matchId: undefined },
  });
  const text = watch('text');
  const photoUri = watch('photoUri');
  const matchId = watch('matchId');
  const canSubmit = text.trim().length > 0 || Boolean(photoUri);

  const pickPhoto = async () => {
    setPermissionDenied(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const picked = result.canceled ? undefined : result.assets[0];
    if (picked) {
      setValue('photoUri', picked.uri, { shouldValidate: true });
    }
  };

  const onSubmit = (values: NewPost) => {
    createPost.mutate(values, { onSuccess: () => router.back() });
  };

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView
        contentContainerClassName="px-4 pb-10"
        contentContainerStyle={{ paddingTop: headerHeight }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>O que rolou?</SectionLabel>
        <Controller
          control={control}
          name="text"
          render={({ field: { value, onChange } }) => (
            <View
              className={`rounded-card border bg-white px-4 py-3 ${
                errors.text ? 'border-danger' : 'border-line'
              }`}
            >
              <TextInput
                testID="post-text"
                value={value}
                onChangeText={onChange}
                placeholder="Conta como foi o jogo…"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                maxLength={POST_TEXT_MAX}
                accessibilityLabel="Texto do post"
                className="h-32 font-body text-body text-text-primary"
              />
            </View>
          )}
        />
        {errors.text ? (
          <Text className="mt-2 font-body text-caption text-danger" accessibilityLiveRegion="polite">
            {errors.text.message}
          </Text>
        ) : null}

        <SectionLabel>Foto</SectionLabel>
        {photoUri ? (
          <View className="rounded-card overflow-hidden">
            <Image
              source={{ uri: photoUri }}
              contentFit="cover"
              style={{ width: '100%', aspectRatio: 1 }}
              accessibilityLabel="Foto escolhida"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remover foto"
              hitSlop={ICON_HIT_SLOP}
              onPress={() => setValue('photoUri', undefined, { shouldValidate: true })}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-surface-dark items-center justify-center"
            >
              <X size={18} color={colors.textOnDark} />
            </Pressable>
          </View>
        ) : (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Escolher foto"
            onPress={pickPhoto}
            testID="post-pick-photo"
            className="h-24 rounded-card border border-line bg-white items-center justify-center overflow-hidden"
          >
            <ImagePlus size={24} color={colors.primary} />
            <Text className="mt-2 font-body text-caption text-text-primary">Escolher foto</Text>
          </PressableScale>
        )}
        {permissionDenied ? (
          <Text className="mt-2 font-body text-caption text-danger" accessibilityLiveRegion="polite">
            Libere o acesso às fotos nas configurações do celular.
          </Text>
        ) : null}

        {invitableMatches.data?.length ? (
          <>
            <SectionLabel>Convidar para</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {invitableMatches.data.map((match) => (
                <FilterChip
                  key={match.id}
                  label={match.name}
                  selected={matchId === match.id}
                  onPress={() => setValue('matchId', matchId === match.id ? undefined : match.id)}
                  testID={`post-invite-${match.id}`}
                />
              ))}
            </View>
          </>
        ) : null}

        {recentMatches.data?.length ? (
          <>
            <SectionLabel>Partida jogada</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {recentMatches.data.map((match) => (
                <FilterChip
                  key={match.id}
                  label={match.name}
                  selected={matchId === match.id}
                  onPress={() => setValue('matchId', matchId === match.id ? undefined : match.id)}
                  testID={`post-match-${match.id}`}
                />
              ))}
            </View>
          </>
        ) : null}

        <View className="mt-8">
          {createPost.isError ? (
            <Text
              className="mb-3 text-center font-body text-caption text-danger"
              accessibilityLiveRegion="polite"
            >
              {createPost.error.message}
            </Text>
          ) : null}
          <Button
            variant="grad"
            onPress={handleSubmit(onSubmit)}
            disabled={!canSubmit}
            loading={createPost.isPending}
            testID="post-submit"
          >
            Publicar
          </Button>
        </View>
      </ScrollView>

      <BackHeader title="Novo post" onHeight={setHeaderHeight} />
    </View>
  );
}
