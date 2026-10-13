import { useLocalSearchParams } from 'expo-router';
import { Send, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { IconButton } from '@/components/ui/IconButton';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import {
  COMMENT_TEXT_MAX,
  type PostComment,
  timeAgo,
  useAddComment,
  useDeleteComment,
  usePostComments,
} from '@/features/network/api/postsApi';
import { colors } from '@/theme/colors';
import { ICON_HIT_SLOP, ICON_RIPPLE } from '@/theme/layout';

function CommentRow({ comment, onDelete }: { comment: PostComment; onDelete: () => void }) {
  return (
    <View className="flex-row gap-3 px-4 py-3" testID="comment">
      <Avatar uri={comment.author.photoUrl ?? undefined} name={comment.author.displayName} size="sm" />
      <View className="flex-1">
        <Text className="font-body text-caption text-text-muted" numberOfLines={1}>
          <Text className="font-body-semibold text-text-primary">{comment.author.displayName}</Text>
          {` · ${timeAgo(comment.createdAt)}`}
        </Text>
        <Text className="font-body text-body text-text-primary mt-1">{comment.text}</Text>
      </View>
      {comment.canDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apagar comentário"
          hitSlop={ICON_HIT_SLOP}
          android_ripple={ICON_RIPPLE}
          onPress={onDelete}
        >
          <Trash2 size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** The conversation of one post: comments oldest first and the field to write one. */
export default function PostCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [text, setText] = useState('');
  const comments = usePostComments(id);
  const addComment = useAddComment(id);
  const deleteComment = useDeleteComment(id);
  const canSend = text.trim().length > 0 && !addComment.isPending;

  const send = () => {
    if (!canSend) return;
    addComment.mutate(text.trim(), { onSuccess: () => setText('') });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-light"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        testID="comments"
        data={comments.data ?? []}
        keyExtractor={(comment) => comment.id}
        renderItem={({ item }) => (
          <CommentRow comment={item} onDelete={() => deleteComment.mutate(item.id)} />
        )}
        contentContainerStyle={{ paddingTop: headerHeight + 8, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          comments.isPending ? (
            <View className="px-4 gap-3">
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
            </View>
          ) : comments.isError ? (
            <StateMessage
              message="Não foi possível carregar os comentários"
              actionLabel="Tentar novamente"
              onAction={() => comments.refetch()}
            />
          ) : (
            <StateMessage message="Ninguém comentou ainda. Seja a primeira pessoa." />
          )
        }
      />

      {addComment.isError ? (
        <Text
          className="px-4 pb-2 font-body text-caption text-danger"
          accessibilityLiveRegion="polite"
        >
          {addComment.error.message}
        </Text>
      ) : null}
      <View
        className="flex-row items-end gap-3 px-4 pt-3 bg-white border-t border-line"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <TextInput
          testID="comment-text"
          value={text}
          onChangeText={setText}
          placeholder="Escreva um comentário…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={COMMENT_TEXT_MAX}
          accessibilityLabel="Seu comentário"
          className="flex-1 max-h-28 rounded-card border border-line bg-bg-light px-4 py-2 font-body text-body text-text-primary"
        />
        {/* Always the same solid button: a colour that changed with the text made it vanish on
            the phone. An empty comment is simply not sent. */}
        <IconButton label="Enviar comentário" onPress={send} testID="comment-send">
          <Send size={20} color={colors.surfaceDark} />
        </IconButton>
      </View>

      <BackHeader title="Comentários" onHeight={setHeaderHeight} />
    </KeyboardAvoidingView>
  );
}
