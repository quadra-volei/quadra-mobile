import { Tabs } from 'expo-router';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationGate } from '@/components/domain/LocationGate';
import { TabExploreIcon } from '@/components/icons/TabExploreIcon';
import { TabHomeIcon } from '@/components/icons/TabHomeIcon';
import { TabNetworkIcon } from '@/components/icons/TabNetworkIcon';
import { TabProfileIcon } from '@/components/icons/TabProfileIcon';
import type { TabIconProps } from '@/components/icons/tabIcon';
import { Avatar } from '@/components/ui/Avatar';
import { useMyProfile } from '@/features/profile/api/getMyProfile';
import { ICON_RIPPLE } from '@/theme/layout';

// "Perfil" shows the signed-in user's photo, Instagram-style: a small circle
// that gets a primary ring when the tab is active. No photo (or still loading)
// → the regular profile icon.
function ProfileTabIcon({ focused, size }: TabIconProps) {
  const { data } = useMyProfile();
  if (!data?.avatarUrl) return <TabProfileIcon focused={focused} size={size} />;
  return (
    <View
      testID={focused ? 'tab-profile-avatar-active' : 'tab-profile-avatar'}
      className={`h-8 w-8 items-center justify-center rounded-full border-2 ${focused ? 'border-primary' : 'border-transparent'}`}
    >
      <Avatar uri={data.avatarUrl} name={data.firstName} size="xs" />
    </View>
  );
}

// Routes shown as tabs, in bar order. There is no central button: creating and
// searching a match start from the Home hero (DECISIONS #88).
const TABS: {
  name: string;
  label: string;
  Icon: ComponentType<TabIconProps>;
}[] = [
  { name: 'index', label: 'Início', Icon: TabHomeIcon },
  { name: 'explore', label: 'Explorar', Icon: TabExploreIcon },
  { name: 'network', label: 'Rede', Icon: TabNetworkIcon },
  { name: 'profile', label: 'Perfil', Icon: ProfileTabIcon },
];

function TabBarButton({
  label,
  Icon,
  focused,
  onPress,
}: {
  label: string;
  Icon: ComponentType<TabIconProps>;
  focused: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      android_ripple={ICON_RIPPLE}
      className="flex-1 h-full items-center justify-center"
    >
      <Icon focused={focused} size={28} />
    </Pressable>
  );
}

const PILL_RADIUS = 32;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Android resizes the window for the keyboard, which would lift the floating
  // bar on top of it (Explore's search) — hide the bar while typing instead.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    // Asks for the location before any tab mounts (DECISIONS #72).
    <LocationGate>
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        if (keyboardOpen) return null;

        const renderTab = (tab: (typeof TABS)[number]) => {
          const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
          const route = state.routes[routeIndex];
          if (!route) return null;
          const focused = state.index === routeIndex;
          return (
            <TabBarButton
              key={tab.name}
              label={tab.label}
              Icon={tab.Icon}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        };

        return (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 0,
            }}
          >
          {/* Pill spanning the screen minus a 16 side margin, Instagram-style. */}
          <View
            style={{
              borderRadius: PILL_RADIUS,
              marginBottom: insets.bottom + 12,
              boxShadow: '0 6px 20px rgba(10,10,60,0.12)',
            }}
          >
            {/* Solid white pill with a hairline border — no backdrop blur, which
                rendered grey or white on Android depending on the content
                behind it (DECISIONS #46). The four tabs share the width
                equally. */}
            <View
              className="flex-row items-center h-16 px-2 bg-white border border-line overflow-hidden"
              style={{ borderRadius: PILL_RADIUS }}
            >
              {TABS.map(renderTab)}
            </View>
          </View>
          </View>
        );
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="network" options={{ title: 'Rede' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
    </LocationGate>
  );
}
