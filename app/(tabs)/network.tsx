import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Clock,
  Heart,
  MessageCircle,
  Plus,
  Settings,
  Trash2,
  Trophy,
} from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { CourtImage } from '@/components/ui/CourtImage';
import { dialog } from '@/components/ui/Dialog';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { TabIndicator, TabLabel } from '@/components/ui/UnderlineTab';
import {
  type FeedScope,
  type Post,
  timeAgo,
  useDeletePost,
  usePostFeed,
  useSetPostLike,
} from '@/features/network/api/postsApi';
import { formatWhen } from '@/features/matches/lib/formatWhen';
import { colors } from '@/theme/colors';
import { ICON_HIT_SLOP, TAB_BAR_CLEARANCE } from '@/theme/layout';
import { MOTION } from '@/theme/motion';

function goSettings() {
  router.push('/profile/settings');
}
function goNewPost() {
  router.push('/network/new');
}
function goMatch(id: string) {
  router.push({ pathname: '/matches/[id]', params: { id } });
}
function goPlayer(id: string) {
  router.push({ pathname: '/players/[id]', params: { id } });
}
function goComments(id: string) {
  router.push({ pathname: '/network/[id]', params: { id } });
}

// What the automatic cards say after the player's name.
const ACTIVITY_VERB: Record<Exclude<Post['kind'], 'Post'>, string> = {
  MatchCreated: 'criou a partida',
  PresenceConfirmed: 'confirmou presença em',
};

// ── The match a post invites to: cover with name and time, and the way in ──
function MatchInvite({
  match,
}: {
  match: { id: string; name: string; startsAt: string; coverUrl?: string | null };
}) {
  return (
    <View className="px-4 pb-4" testID="post-invite">
      <CourtImage
        tint={colors.primary}
        imageUri={match.coverUrl ?? undefined}
        height={112}
        radius={16}
      >
        {/* bottom scrim: the name stays legible over a photo cover */}
        <LinearGradient
          colors={['rgba(10,10,60,0)', 'rgba(10,10,60,0.8)']}
          locations={[0.3, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <View className="absolute left-4 right-4 bottom-3">
          <Text className="font-body-extrabold text-h3 text-text-on-dark" numberOfLines={1}>
            {match.name}
          </Text>
          <View className="flex-row items-center gap-1 mt-1">
            <Clock size={14} color={colors.textOnDark} />
            <Text className="font-body text-caption text-text-on-dark">
              {formatWhen(match.startsAt)}
            </Text>
          </View>
        </View>
      </CourtImage>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Participar de ${match.name}`}
        onPress={() => goMatch(match.id)}
        className="self-end mt-3 h-10 px-6 rounded-pill bg-accent items-center justify-center overflow-hidden"
      >
        <Text className="font-body-semibold text-body-bold text-text-primary">Participar</Text>
      </PressableScale>
    </View>
  );
}

// ── One post: author row, text, photo, the match it is tied to, likes and comments ──
function PostCard({
  post,
  onDelete,
  onToggleLike,
}: {
  post: Post;
  onDelete: () => void;
  onToggleLike: () => void;
}) {
  const match = post.match;
  // A match still to come makes the post an invite; a played one is a label.
  const invitesTo =
    match?.startsAt && new Date(match.startsAt).getTime() > Date.now()
      ? { ...match, startsAt: match.startsAt }
      : null;
  // An automatic card reads "Érica criou a partida Vôlei de Quinta".
  const activity = post.kind !== 'Post' && match ? ACTIVITY_VERB[post.kind] : null;
  const when = timeAgo(post.createdAt);

  return (
    <View className="mx-4 mb-4 bg-white rounded-card shadow-card overflow-hidden" testID="post">
      <View className="flex-row items-center gap-3 p-4">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Ver perfil de ${post.author.displayName}`}
          onPress={() => goPlayer(post.author.userId)}
          className="flex-1 flex-row items-center gap-3"
        >
          <Avatar uri={post.author.photoUrl ?? undefined} name={post.author.displayName} size="sm" />
          <View className="flex-1">
            {activity && match ? (
              <Text className="font-body text-body text-text-primary">
                <Text className="font-body-semibold text-body-bold">{post.author.displayName}</Text>
                {` ${activity} `}
                <Text className="font-body-semibold text-body-bold text-primary">{match.name}</Text>
              </Text>
            ) : (
              <Text className="font-body-semibold text-body-bold text-text-primary" numberOfLines={1}>
                {post.author.displayName}
              </Text>
            )}
            <Text className="font-body text-caption text-text-muted" numberOfLines={1}>
              {activity || !post.author.handle ? when : `@${post.author.handle} · ${when}`}
            </Text>
          </View>
        </PressableScale>
        {post.mine ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Apagar post"
            hitSlop={ICON_HIT_SLOP}
            onPress={onDelete}
          >
            <Trash2 size={20} color={colors.textMuted} />
          </PressableScale>
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

      {invitesTo ? (
        <MatchInvite match={invitesTo} />
      ) : match && !activity ? (
        <View className="flex-row items-center gap-2 px-4 py-3 border-t border-line">
          <Trophy size={16} color={colors.primary} />
          <Text className="flex-1 font-body-semibold text-caption text-primary" numberOfLines={1}>
            {match.name}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center gap-6 px-4 py-3 border-t border-line">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={post.likedByMe ? 'Descurtir' : 'Curtir'}
          accessibilityState={{ selected: post.likedByMe }}
          hitSlop={ICON_HIT_SLOP}
          onPress={onToggleLike}
          className="flex-row items-center gap-2"
        >
          <Heart
            size={20}
            color={post.likedByMe ? colors.danger : colors.textMuted}
            fill={post.likedByMe ? colors.danger : 'none'}
          />
          <Text className="font-body-semibold text-caption text-text-muted">{post.likeCount}</Text>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Comentários"
          hitSlop={ICON_HIT_SLOP}
          onPress={() => goComments(post.id)}
          className="flex-row items-center gap-2"
        >
          <MessageCircle size={20} color={colors.textMuted} />
          <Text className="font-body-semibold text-caption text-text-muted">{post.commentCount}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

export default function NetworkScreen() {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [scope, setScope] = useState<FeedScope>('all');
  const feed = usePostFeed(scope);
  const deletePost = useDeletePost();
  const setLike = useSetPostLike();
  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];

  const confirmDelete = (post: Post) => {
    dialog.alert('Apagar este post?', 'Ele some do feed para todo mundo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => deletePost.mutate(post.id) },
    ]);
  };

  return (
    <View className="flex-1 bg-bg-light">
      {/* Each scope's feed fades in (and starts at its top) on a switch. */}
      <Animated.View key={scope} entering={FadeIn.duration(MOTION.fadeIn)} className="flex-1">
      <FlatList
        testID="feed"
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onDelete={() => confirmDelete(item)}
            onToggleLike={() => setLike.mutate({ post: item, liked: !item.likedByMe })}
          />
        )}
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
          ) : scope === 'following' ? (
            <StateMessage
              message="Aqui aparecem os posts de quem você segue. Toque em um jogador no Para você para seguir."
              actionLabel="Ver Para você"
              onAction={() => setScope('all')}
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
      </Animated.View>

      <ScreenHeader onHeight={setHeaderHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
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
        <View className="flex-row">
          <FeedTab
            label="Para você"
            selected={scope === 'all'}
            onPress={() => setScope('all')}
            testID="feed-scope-all"
          />
          <FeedTab
            label="Seguindo"
            selected={scope === 'following'}
            onPress={() => setScope('following')}
            testID="feed-scope-following"
          />
          <TabIndicator index={scope === 'all' ? 0 : 1} count={2} thickness={3} widthRatio={0.6} />
        </View>
      </ScreenHeader>
    </View>
  );
}

/**
 * One half of the feed scope switch: an underline tab, not a chip. No press
 * background: the underline sliding under it (TabIndicator, in the row) is the
 * feedback, and the label color follows it (DECISIONS #109).
 */
function FeedTab({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      className="flex-1 items-center pt-2 pb-[3px]"
    >
      <TabLabel
        selected={selected}
        activeColor={colors.surfaceDark}
        className="font-body-bold text-body text-text-muted pb-3"
      >
        {label}
      </TabLabel>
    </Pressable>
  );
}
