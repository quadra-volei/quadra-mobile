import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Tabs } from 'expo-router';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JogarMenu } from '@/components/domain/JogarMenu';
import { JogarIcon } from '@/components/icons/JogarIcon';
import { TabExploreIcon } from '@/components/icons/TabExploreIcon';
import { TabHomeIcon } from '@/components/icons/TabHomeIcon';
import { TabNetworkIcon } from '@/components/icons/TabNetworkIcon';
import { TabProfileIcon } from '@/components/icons/TabProfileIcon';
import type { TabIconProps } from '@/components/icons/tabIcon';
import { useNavBlurTargetStore } from '@/stores/navBlurTarget';
import { CTA_GRADIENT } from '@/theme/colors';

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
      className="w-12 items-center justify-center py-3"
    >
      <Icon focused={focused} size={24} />
    </Pressable>
  );
}

const PILL_RADIUS = 28;
// Same taming as `GlassHeader`: Android's Dimezis blur frosts the sampled
// content much darker than iOS, so it gets a lower radius and a stronger wash.
const IS_ANDROID = Platform.OS === 'android';
const BLUR_INTENSITY = IS_ANDROID ? 22 : 80;
const PILL_WASH = IS_ANDROID ? 'bg-white/70' : 'bg-white/50';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // The focused tab screen publishes its `BlurTargetView` ref here so Android's
  // `dimezisBlurView` has a backdrop to sample (iOS blurs natively regardless).
  const navBlurTarget = useNavBlurTargetStore((s) => s.target);
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
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
            }}
          >
          {/* Auto-width, centered pill — deliberately narrower than the content
              (no `mx-4` full-bleed), Instagram-style. Width is the sum of the
              fixed-width tabs + the FAB's center reserve. */}
          <View
            style={{
              borderRadius: PILL_RADIUS,
              marginBottom: insets.bottom + 12,
              boxShadow: '0 6px 20px rgba(10,10,60,0.12)',
            }}
          >
            {/* Glass pill — iOS blurs natively. On Android the real backdrop
                blur (`dimezisBlurView`) samples the focused screen's
                `BlurTargetView`, published via the nav-blur-target store; until
                a screen registers one we omit the method so it renders the
                frosted white tint instead of warning + falling back to
                "none". Clipped to the rounded shape; the FAB is a sibling
                overlay so the clip doesn't cut off its poke. */}
            <BlurView
              intensity={BLUR_INTENSITY}
              tint="light"
              {...(navBlurTarget
                ? { blurMethod: 'dimezisBlurView' as const, blurTarget: navBlurTarget }
                : {})}
              style={{ borderRadius: PILL_RADIUS, overflow: 'hidden' }}
            >
              {/* The wash carries the same radius so its hairline border follows
                  the pill instead of being cut off at the corners. Tabs are 48
                  wide with 24 icons, so px-3 + the 88 reserve leave the same 24
                  gap at the edges, between icons and around the FAB. */}
              <View
                className={`flex-row items-center px-3 border border-white/60 ${PILL_WASH}`}
                style={{ borderRadius: PILL_RADIUS }}
              >
                {leftTabs.map(renderTab)}

                {/* Center column reserves the FAB's horizontal footprint. */}
                <View style={{ width: 88, height: 48 }} />

                {rightTabs.map(renderTab)}
              </View>
            </BlurView>

            {/* Central "Jogar" FAB — poking overlay, outside the clipped pill. */}
            <View
              pointerEvents="box-none"
              className="absolute inset-x-0 items-center"
              style={{ top: -20 }}
            >
              <Pressable
                onPress={() => setMenuOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Jogar"
                className="rounded-full overflow-hidden"
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
