import { BlurTargetView } from 'expo-blur';
import { useRef, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { GlassBackHeader } from '@/components/ui/GlassBackHeader';
import { useNotificationPrefsStore } from '@/stores/notificationPrefs';
import { colors } from '@/theme/colors';

// Switch tinting (RN core Switch needs raw colors, not className).
const TRACK = { false: '#E8EEF8', true: colors.primary }; // bg-light-alt / primary
const THUMB = colors.textOnDark; // white thumb

// ── Hairline divider between grouped rows ──
function Divider() {
  return <View className="h-px bg-line mx-4" />;
}

// ── One-off toggle row (title + subtitle + RN core Switch) ──
// Inline per COMPONENTS.md decision log — used only on this screen.
function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center px-4 py-4">
      <View className="flex-1 pr-4">
        <Text className="font-body text-h3 text-text-primary">{title}</Text>
        <Text className="mt-0.5 font-body text-caption text-text-muted">
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={TRACK}
        thumbColor={THUMB}
        accessibilityLabel={title}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const invites = useNotificationPrefsStore((s) => s.invites);
  const reminders = useNotificationPrefsStore((s) => s.reminders);
  const ranking = useNotificationPrefsStore((s) => s.ranking);
  const setInvites = useNotificationPrefsStore((s) => s.setInvites);
  const setReminders = useNotificationPrefsStore((s) => s.setReminders);
  const setRanking = useNotificationPrefsStore((s) => s.setRanking);

  const [headerHeight, setHeaderHeight] = useState(0);
  const blurTarget = useRef<View>(null);

  return (
    <View className="flex-1 bg-bg-light">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName="pb-24"
          contentContainerStyle={{ paddingTop: headerHeight }}
        >
          <Text className="font-body text-eyebrow text-text-muted uppercase px-4 mt-4 mb-2">
            Notificações push
          </Text>
          <View className="mx-4 bg-white rounded-card shadow-card overflow-hidden">
            <ToggleRow
              title="Convites"
              subtitle="Quando te convidam para uma partida"
              value={invites}
              onValueChange={setInvites}
            />
            <Divider />
            <ToggleRow
              title="Lembretes"
              subtitle="Antes das partidas confirmadas"
              value={reminders}
              onValueChange={setReminders}
            />
            <Divider />
            <ToggleRow
              title="Ranking"
              subtitle="Mudanças na sua posição do ranking"
              value={ranking}
              onValueChange={setRanking}
            />
          </View>
        </ScrollView>
      </BlurTargetView>

      <GlassBackHeader
        title="Notificações"
        blurTarget={blurTarget}
        onHeight={setHeaderHeight}
      />
    </View>
  );
}
