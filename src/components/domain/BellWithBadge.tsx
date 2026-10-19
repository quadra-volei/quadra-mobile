import { Bell } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { useUnreadCount } from '@/features/notifications/api/notificationsApi';
import { colors } from '@/theme/colors';

/** The header bell with the unread notifications count (API DECISIONS #77). */
export function BellWithBadge() {
  const { data: count = 0 } = useUnreadCount();
  return (
    <View>
      <Bell size={20} color={colors.surfaceDark} />
      {count > 0 ? (
        <View
          className="absolute -right-2 -top-2 min-w-[16px] h-4 items-center justify-center rounded-full bg-danger px-1"
          accessibilityLabel={`${count} não lidas`}
          testID="bell-badge"
        >
          <Text className="font-body-bold text-[10px] text-text-on-dark">{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </View>
  );
}
