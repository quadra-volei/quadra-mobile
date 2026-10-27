import { BlurTargetView } from 'expo-blur';
import { Redirect, router, Tabs } from 'expo-router';
import { Plus } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateSheet } from '@/components/domain/CreateSheet';
import { LocationPrompt } from '@/components/domain/LocationPrompt';
import { TabExploreIcon } from '@/components/icons/TabExploreIcon';
import { TabHomeIcon } from '@/components/icons/TabHomeIcon';
import { TabNetworkIcon } from '@/components/icons/TabNetworkIcon';
import { TabProfileIcon } from '@/components/icons/TabProfileIcon';
import type { TabIconProps } from '@/components/icons/tabIcon';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { useMyProfile } from '@/features/profile/api/getMyProfile';
import { takePendingLink } from '@/lib/pendingLink';
import { useAuthStore } from '@/stores/auth';
import { listenToPushTaps, registerForPush } from '@/lib/push/pushNotifications';
import { colors, HARD_SHADOW } from '@/theme/colors';
import { MOTION } from '@/theme/motion';

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

// Routes shown as tabs, in bar order. The central "+" sits between the second
// and third tab and opens the create sheet (DECISIONS #98).
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
  // A short, small bounce on tap: down a little, then back with one soft overshoot.
  const scale = useSharedValue(1);
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <PressableScale
      onPress={() => {
        scale.value = withSequence(
          withTiming(TAB_BOUNCE.down, { duration: TAB_BOUNCE.downMs }),
          withSpring(1, TAB_BOUNCE.spring),
        );
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      className="flex-1 h-full items-center justify-center"
    >
      {/* Active / inactive icon swap fades in instead of cutting. */}
      <Animated.View style={bounce}>
        <Animated.View key={String(focused)} entering={FadeIn.duration(MOTION.fadeIn)}>
          <Icon focused={focused} size={28} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
}

const TAB_BOUNCE = {
  down: 0.86,
  downMs: 70,
  spring: { damping: 9, stiffness: 320, mass: 0.6 },
};

const PILL_RADIUS = 32;
const CENTER_SIZE = 64;

// How long the "+" shows its bounce before the bar turns into the create sheet.
const CENTER_OPEN_DELAY_MS = 150;

// The lime "+" raised above the pill. It is drawn outside the pill (which clips
// its children); the row keeps an empty slot where it sits. Pressed, it gets the
// hard navy shadow and the tabs' short bounce, and the sheet opens once the
// bounce has shown — opening at once hid the bar before either could be seen
// (owner's 4th review, item 10; DECISIONS #172).
function CenterButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const [pressed, setPressed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <Animated.View
      // The shadow sits on this wrapper: the button itself clips (overflow-hidden).
      style={[bounce, { borderRadius: CENTER_SIZE / 2 }, pressed ? HARD_SHADOW : null]}
    >
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => {
          scale.value = withSequence(
            withTiming(TAB_BOUNCE.down, { duration: TAB_BOUNCE.downMs }),
            withSpring(1, TAB_BOUNCE.spring),
          );
          setPressed(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setPressed(false);
            onPress();
          }, CENTER_OPEN_DELAY_MS);
        }}
        accessibilityRole="button"
        accessibilityLabel="Criar"
        className="items-center justify-center rounded-full border-2 border-surface-dark bg-accent overflow-hidden"
        style={{ width: CENTER_SIZE, height: CENTER_SIZE }}
        testID="tab-create"
      >
        <Plus size={30} color={colors.surfaceDark} strokeWidth={2.6} />
      </Pressable>
    </Animated.View>
  );
}

// The tabs need a signed-in account with a finished profile. Any other way in
// (an old screen in the history, a link) goes back through the splash, which
// sends the user to login or onboarding.
export default function TabsLayout() {
  const ready = useAuthStore((s) => s.isAuthenticated && s.hasProfile);
  return ready ? <SignedInTabs /> : <Redirect href="/" />;
}

function SignedInTabs() {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  // What the sheet's backdrop blurs on Android.
  const blurTarget = useRef<View>(null);
  // Bumped when the location is allowed: the tabs mount again so screens that
  // read the position once, on mount (`useDeviceCoords`), get it (DECISIONS #188).
  const [tabsKey, setTabsKey] = useState(0);
  const remountTabs = useCallback(() => setTabsKey((k) => k + 1), []);

  // Signed in: ask for push once and open the match of a tapped push (API DECISIONS #77).
  useEffect(() => {
    void registerForPush();
    return listenToPushTaps();
  }, []);

  // A link opened while signed out (an invite) goes on once the user is in.
  useEffect(() => {
    const link = takePendingLink();
    if (link) {
      router.push(link);
    }
  }, []);
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
    <View className="flex-1">
    <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
    <Tabs
      key={tabsKey}
      // Switching tabs cross-fades the screens over the app background.
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.bgLight },
      }}
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
              // The create sheet takes the bar's place while it is up: it grows
              // out of the bar's frame and folds back into it (DECISIONS #161).
              opacity: sheetOpen ? 0 : 1,
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
                behind it (DECISIONS #46). The four tabs share the width left
                by the central slot. */}
            <View
              className="flex-row items-center h-16 px-2 bg-white border border-line overflow-hidden"
              style={{ borderRadius: PILL_RADIUS }}
            >
              {TABS.slice(0, 2).map(renderTab)}
              <View style={{ width: CENTER_SIZE + 16 }} />
              {TABS.slice(2).map(renderTab)}
            </View>
            <View
              pointerEvents="box-none"
              className="absolute left-0 right-0 items-center"
              style={{ top: -CENTER_SIZE / 2 + 8 }}
            >
              <CenterButton onPress={() => setSheetOpen(true)} />
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
    </BlurTargetView>
    {sheetOpen ? (
      <CreateSheet
        blurTarget={blurTarget}
        onClose={closeSheet}
        onCreateMatch={() => {
          closeSheet();
          router.push('/matches/create');
        }}
        onCreatePost={() => {
          closeSheet();
          router.push('/network/new');
        }}
      />
    ) : null}
    {/* Asks for the location once, over the tabs (DECISIONS #72, #188). */}
    <LocationPrompt blurTarget={blurTarget} onGranted={remountTabs} />
    </View>
  );
}
