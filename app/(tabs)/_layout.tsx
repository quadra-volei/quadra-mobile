import { router, Tabs } from 'expo-router';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JogarMenu } from '@/components/domain/JogarMenu';
import { JogarIcon } from '@/components/icons/JogarIcon';
import { TabExploreIcon } from '@/components/icons/TabExploreIcon';
import { TabHomeIcon } from '@/components/icons/TabHomeIcon';
import { TabNetworkIcon } from '@/components/icons/TabNetworkIcon';
import { TabProfileIcon } from '@/components/icons/TabProfileIcon';
import type { TabIconProps } from '@/components/icons/tabIcon';
import { HARD_SHADOW, colors } from '@/theme/colors';
import { ICON_RIPPLE } from '@/theme/layout';

// Routes shown as labeled tabs, in bar order: two to the left of the FAB, two to
// the right. The central "Jogar" FAB sits between them (it is not a tab route —
// it opens the "BORA JOGAR?" action menu with the Criar/Buscar entry points).
const TABS: {
  name: string;
  label: string;
  Icon: ComponentType<TabIconProps>;
}[] = [
  { name: 'index', label: 'Início', Icon: TabHomeIcon },
  { name: 'explore', label: 'Explorar', Icon: TabExploreIcon },
  { name: 'network', label: 'Rede', Icon: TabNetworkIcon },
  { name: 'profile', label: 'Perfil', Icon: TabProfileIcon },
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
  // The central FAB opens the "BORA JOGAR?" action menu instead of jumping
  // straight to create-match.
  const [menuOpen, setMenuOpen] = useState(false);
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
    <>
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        if (keyboardOpen) return null;
        const leftTabs = TABS.slice(0, 2);
        const rightTabs = TABS.slice(2);

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
                behind it (DECISIONS #46). The FAB is a sibling overlay so the
                pill's rounded clip doesn't cut off its poke. The tabs share the
                width left by the FAB reserve equally. */}
            <View
              className="flex-row items-center h-16 px-2 bg-white border border-line overflow-hidden"
              style={{ borderRadius: PILL_RADIUS }}
            >
              {leftTabs.map(renderTab)}

              {/* Center column reserves the FAB's horizontal footprint. */}
              <View style={{ width: 80 }} />

              {rightTabs.map(renderTab)}
            </View>

            {/* Central "Jogar" FAB — poking overlay, outside the clipped pill. */}
            <View
              pointerEvents="box-none"
              className="absolute inset-x-0 items-center"
              style={{ top: -18 }}
            >
              <Pressable
                onPress={() => setMenuOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Jogar"
                className="h-16 w-16 items-center justify-center rounded-full border-2 border-surface-dark bg-accent"
                style={HARD_SHADOW}
              >
                <JogarIcon size={30} color={colors.surfaceDark} />
              </Pressable>
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

    <JogarMenu
      visible={menuOpen}
      onClose={() => setMenuOpen(false)}
      onCreate={() => {
        setMenuOpen(false);
        router.push('/matches/create');
      }}
      onSearch={() => {
        setMenuOpen(false);
        router.push('/explore');
      }}
    />
    </>
  );
}
