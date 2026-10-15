import { ArrowUp, Check, Star, Volleyball } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { type Activity, type ActivityLine, describeActivity } from '@/features/activity/api/activityApi';
import { colors } from '@/theme/colors';

export type ActivityRowProps = {
  activity: Activity;
  onPress: (target: ActivityLine['target']) => void;
  /** Clock for "há 18 min" (tests pin it). */
  now?: number;
  testID?: string;
};

const ICONS = { levelUp: ArrowUp, finished: Check, live: Volleyball, mvp: Star };

const PART_CLASS = {
  name: 'font-body-bold text-text-primary',
  plain: 'font-body text-text-primary',
  object: 'font-body-bold text-primary',
} as const;

/**
 * One line of "Atividade dos amigos": the friend's avatar with their level
 * number, "**Caio** subiu para o **nível 16**" with a grey caption below, and a
 * lilac tile with the kind's icon. Tapping opens the match, or the friend's
 * profile for a level up. Plain data in, no fetching; the parent draws the card
 * and the dividers.
 */
export function ActivityRow({ activity, onPress, now, testID }: ActivityRowProps) {
  const line = describeActivity(activity, now);
  const Icon = ICONS[line.icon];
  const sentence = line.parts.map((p) => p.text).join('');

  return (
    <PressableScale
      testID={testID}
      onPress={() => onPress(line.target)}
      accessibilityRole="button"
      accessibilityLabel={`${sentence}. ${line.caption}`}
      className="flex-row items-center px-4 py-3"
    >
      <Avatar
        uri={activity.actor.photoUrl ?? undefined}
        name={activity.actor.displayName}
        size="md"
        level={activity.actor.level}
      />
      <View className="ml-3 mr-3 flex-1">
        <Text className="text-body" numberOfLines={2}>
          {line.parts.map((part, i) => (
            <Text key={i} className={PART_CLASS[part.kind]}>
              {part.text}
            </Text>
          ))}
        </Text>
        <Text className="mt-0.5 font-body text-caption text-text-muted" numberOfLines={1}>
          {line.caption}
        </Text>
      </View>
      <View className="h-9 w-9 items-center justify-center rounded-chip bg-quaternary/10">
        <Icon size={18} color={colors.primary} strokeWidth={2.4} />
      </View>
    </PressableScale>
  );
}
