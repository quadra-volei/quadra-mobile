import { LinearGradient } from 'expo-linear-gradient';
import { router, Tabs } from 'expo-router';
import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JogarIcon } from '@/components/icons/JogarIcon';
import { TabExploreIcon } from '@/components/icons/TabExploreIcon';
import { TabHomeIcon } from '@/components/icons/TabHomeIcon';
import { TabNetworkIcon } from '@/components/icons/TabNetworkIcon';
import { TabProfileIcon } from '@/components/icons/TabProfileIcon';
import type { TabIconProps } from '@/components/icons/tabIcon';
import { CTA_GRADIENT } from '@/theme/colors';

// Routes shown as labeled tabs, in bar order: two to the left of the FAB, two to
// the right. The central "Jogar" FAB sits between them (it is not a tab route —
// it pushes /matches/create, the same action as the S5 card CTA).
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
      className="flex-1 items-center justify-center py-2"
    >
      <Icon focused={focused} size={24} />
      <Text
        className={`font-body text-[10px] mt-1 ${focused ? 'text-primary' : 'text-text-muted'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
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
            className="flex-row items-end bg-white border-t border-line"
            style={{ paddingBottom: insets.bottom }}
          >
            {leftTabs.map(renderTab)}

            {/* Central "Jogar" FAB — overlaps the bar; pushes /matches/create. */}
            <View className="w-20 items-center">
              <Pressable
                onPress={() => router.push('/matches/create')}
                accessibilityRole="button"
                accessibilityLabel="Jogar"
                className="rounded-full overflow-hidden -mt-6"
                style={{ boxShadow: '0 4px 16px rgba(26,26,255,0.28)' }}
              >
                <LinearGradient
                  colors={CTA_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 9999,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <JogarIcon size={30} />
                </LinearGradient>
              </Pressable>
              <Text className="font-body text-[10px] mt-1 text-text-muted">
                Jogar
              </Text>
            </View>

            {rightTabs.map(renderTab)}
          </View>
        );
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="network" options={{ title: 'Rede' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
