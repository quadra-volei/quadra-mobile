import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Plus, Settings, Trash2, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { dialog } from '@/components/ui/Dialog';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import {
  type Post,
  timeAgo,
  useDeletePost,
  usePostFeed,
} from '@/features/network/api/postsApi';
import { colors } from '@/theme/colors';
import { ICON_HIT_SLOP, ICON_RIPPLE, TAB_BAR_CLEARANCE } from '@/theme/layout';

function goSettings() {
  router.push('/profile/settings');
}
function goNewPost() {
  router.push('/network/new');
}

// ── One post: author row, text, photo, the match it is tied to ──
function PostCard({ post, onDelete }: { post: Post; onDelete: () => void }) {
  return (
    <View className="mx-4 mb-4 bg-white rounded-card shadow-card overflow-hidden" testID="post">
      <View className="flex-row items-center gap-3 p-4">
        <Avatar uri={post.author.photoUrl ?? undefined} name={post.author.displayName} size="sm" />
        <View className="flex-1">
          <Text className="font-body-semibold text-body-bold text-text-primary" numberOfLines={1}>
            {post.author.displayName}
          </Text>
          <Text className="font-body text-caption text-text-muted" numberOfLines={1}>
            {[post.author.handle ? `@${post.author.handle}` : null, timeAgo(post.createdAt)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        {post.mine ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apagar post"
            hitSlop={ICON_HIT_SLOP}
            android_ripple={ICON_RIPPLE}
            onPress={onDelete}
          >
            <Trash2 size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {post.text ? (
        <Text className="font-body text-body text-text-primary px-4 pb-4">{post.text}</Text>
      ) : null}

      {post.photoUrl ? (
        <Image
          source={{ uri: post.photoUrl }}
          contentFit="cover"
          style={{ width: '100%', aspectRatio: 1 }}
          accessibilityLabel={`Foto de ${post.author.displayName}`}
        />
      ) : null}

      {post.match ? (
        <View className="flex-row items-center gap-2 px-4 py-3 border-t border-line">
          <Trophy size={16} color={colors.primary} />
          <Text className="flex-1 font-body-semibold text-caption text-primary" numberOfLines={1}>
            {post.match.name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function NetworkScreen() {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const feed = usePostFeed();
  const deletePost = useDeletePost();
  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];

  const confirmDelete = (post: Post) => {
    dialog.alert('Apagar este post?', 'Ele some do feed para todo mundo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => deletePost.mutate(post.id) },
    ]);
  };

  return (
    <View className="flex-1 bg-bg-light">
      <FlatList
        testID="feed"
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <PostCard post={item} onDelete={() => confirmDelete(item)} />}
        contentContainerStyle={{
          paddingTop: headerHeight + 16,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
        showsVerticalScrollIndicator={false}
        onRefresh={() => feed.refetch()}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        progressViewOffset={headerHeight}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          feed.isPending ? (
            <View className="px-4 gap-4">
              <SkeletonBlock className="h-[120px]" />
              <SkeletonBlock className="h-[320px]" />
            </View>
          ) : feed.isError ? (
            <StateMessage
              message="Não foi possível carregar o feed"
              actionLabel="Tentar novamente"
              onAction={() => feed.refetch()}
            />
          ) : (
            <StateMessage
              message="Ninguém postou ainda. Conta como foi seu último jogo."
              actionLabel="Criar o primeiro post"
              onAction={goNewPost}
            />
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? <SkeletonBlock className="mx-4 h-[120px]" /> : null
        }
      />

      <ScreenHeader onHeight={setHeaderHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
          <Text className="font-display text-h1 text-text-primary uppercase">
            REDE
          </Text>
          <View className="flex-row items-center gap-3">
            <IconButton label="Novo post" onPress={goNewPost}>
              <Plus size={20} color={colors.surfaceDark} />
            </IconButton>
            <IconButton label="Configurações" onPress={goSettings}>
              <Settings size={20} color={colors.surfaceDark} />
            </IconButton>
          </View>
        </View>
      </ScreenHeader>
    </View>
  );
}
