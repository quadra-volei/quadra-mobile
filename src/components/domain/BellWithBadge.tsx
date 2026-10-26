import { Bell } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useUnreadCount } from '@/features/notifications/api/notificationsApi';
import { colors } from '@/theme/colors';

/**
 * The header bell with the unread notifications count (API DECISIONS #77), drawn inside the
 * boxed `IconButton`. The badge sits on the box's top-right corner, over its border, in the
 * button language: lime fill, navy border, navy number (DESIGN_SYSTEM "Buttons", badges are
 * lime; red stays for errors).
 */
export function BellWithBadge() {
  const { data: count = 0 } = useUnreadCount();
  return (
    <View>
      <Bell size={20} color={colors.surfaceDark} />
      {count > 0 ? (
        <View
          className="absolute -right-3 -top-3 h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-surface-dark bg-accent px-1"
          accessibilityLabel={`${count} não lidas`}
          testID="bell-badge"
        >
          <Text className="font-num text-[10px] leading-[12px] text-surface-dark">{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </View>
  );
}
