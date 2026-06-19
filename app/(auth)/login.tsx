import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Dimensions, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ChevronLeft } from "lucide-react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { GoogleMark } from "@/components/icons/GoogleMark";
import { QuadraLogo } from "@/components/icons/QuadraLogo";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useGoogleSignIn } from "@/features/auth/api/googleSignIn";
import { useRequestOtp } from "@/features/auth/api/requestOtp";
import { useAuthStore } from "@/stores/auth";

// Navy → blue brand hero gradient (surface-dark → primary), per DESIGN_SYSTEM "Dark hero areas".
const HERO_GRADIENT = ["#0A0A3C", "#1A1AFF"] as const;

const SWIPE_CLOSE_THRESHOLD = 120; // drag distance (px) past which a release closes the sheet

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_MIN_HEIGHT = Math.round(SCREEN_HEIGHT * 0.7); // sheet occupies ~70% of the screen
const HERO_STRIP_HEIGHT = SCREEN_HEIGHT - SHEET_MIN_HEIGHT; // dark area above the sheet (~30%)
const SHEET_HIDDEN_OFFSET = SHEET_MIN_HEIGHT + 100; // sheet parked fully below the screen when closed

const loginPhoneSchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/, "Telefone inválido"), // BR national digits
});

type LoginPhoneForm = z.infer<typeof loginPhoneSchema>;

export default function LoginScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const requestOtp = useRequestOtp();
  const googleSignIn = useGoogleSignIn();
  const setAuth = useAuthStore((s) => s.setAuth);

  const translateY = useSharedValue(SHEET_HIDDEN_OFFSET);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isValid },
  } = useForm<LoginPhoneForm>({
    resolver: zodResolver(loginPhoneSchema),
    mode: "onChange",
    defaultValues: { phone: "" },
  });

  const openSheet = () => {
    setSheetOpen(true);
    translateY.value = withTiming(0, { duration: 280 });
  };

  const closeSheet = () => {
    translateY.value = withTiming(
      SHEET_HIDDEN_OFFSET,
      { duration: 240 },
      (finished) => {
        if (finished) {
          runOnJS(setSheetOpen)(false);
        }
      },
    );
  };

  const onSubmitPhone = handleSubmit((values) => {
    const phone = `+55${values.phone}`; // assemble E.164 on submit
    requestOtp.mutate(
      { phone },
      {
        onSuccess: () => {
          router.push({ pathname: "/sms-otp", params: { phone } });
        },
        onError: (err) => {
          setError("phone", {
            message: err.message || "Não foi possível enviar o código.",
          });
        },
      },
    );
  });

  const onGoogle = () => {
    googleSignIn.mutate(undefined, {
      onSuccess: ({ session, user }) => {
        setAuth({
          userId: user.id,
          accessToken: session.token,
          hasProfile: user.hasProfile,
        });
        if (user.hasProfile) {
          router.replace("/(tabs)");
        } else {
          router.replace("/onboarding");
        }
      },
    });
  };

  // Swipe-down-to-close: only downward drags translate the sheet; releasing past
  // the threshold closes it, otherwise it springs back to the open position.
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > SWIPE_CLOSE_THRESHOLD) {
        translateY.value = withTiming(
          SHEET_HIDDEN_OFFSET,
          { duration: 240 },
          (finished) => {
            if (finished) {
              runOnJS(setSheetOpen)(false);
            }
          },
        );
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View className="flex-1 bg-surface-dark">
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1 px-6">
          <View className="flex-1 justify-center">
            {/* brand lockup */}
            <View className="flex-row items-center">
              <QuadraLogo size={44} />
              <Text className="font-word text-text-on-dark text-4xl ml-3 lowercase">
                quadra
              </Text>
            </View>

            <Text className="font-display text-display text-text-on-dark uppercase mt-8 leading-[38px]">
              O JOGO{"\n"}COMEÇA{"\n"}
              <Text className="text-accent">AQUI.</Text>
            </Text>

            <Text className="font-body text-body-bold text-text-on-dark mt-4">
              Encontre partidas de vôlei perto de você, monte seu time e suba no
              ranking.
            </Text>
          </View>

          {/* pinned CTA */}
          <View className="pb-6">
            <Button variant="grad" onPress={openSheet} testID="open-sheet">
              Entrar e jogar
            </Button>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* State B — phone login sheet (inline, not an extracted component) */}
      {sheetOpen ? (
        <View className="absolute inset-0" accessibilityViewIsModal>
          {/* dimmed backdrop — tap to close */}
          <Pressable
            className="absolute inset-0 bg-surface-dark/60"
            onPress={closeSheet}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            testID="sheet-backdrop"
          />

          {/* back chevron over the backdrop */}
          <SafeAreaView className="absolute inset-x-0 top-0">
            <Pressable
              onPress={closeSheet}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              className="ml-4 mt-2 h-10 w-10 rounded-full bg-surface-dark/40 items-center justify-center"
              testID="sheet-back"
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </Pressable>
          </SafeAreaView>

          {/* brand mark centered in the dark strip above the sheet */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={sheetStyle}
              className="absolute inset-x-0 bottom-0"
            >
              <View
                className="bg-white rounded-card shadow-modal px-6 pt-6 pb-8"
                style={{ minHeight: SHEET_MIN_HEIGHT }}
              >
                {/* grab handle */}
                <View className="self-center h-1 w-12 rounded-pill bg-line mb-4" />

                <Text className="font-display text-h1 text-text-primary uppercase">
                  ACESSE SUA CONTA
                </Text>
                <Text className="font-body text-body text-text-muted mt-1">
                  Use seu telefone para entrar ou criar conta.
                </Text>

                <Text className="font-body text-eyebrow text-text-primary uppercase mt-6">
                  Número de telefone
                </Text>

                <View className="mt-2">
                  <Controller
                    control={control}
                    name="phone"
                    render={({
                      field: { value, onChange },
                      fieldState: { error },
                    }) => (
                      <PhoneInput
                        value={value}
                        onChangeText={onChange}
                        country="BR"
                        error={error?.message}
                        testID="phone-input"
                      />
                    )}
                  />
                </View>

                <View className="mt-4">
                  <Button
                    variant="primary"
                    onPress={onSubmitPhone}
                    disabled={!isValid}
                    loading={requestOtp.isPending}
                    testID="submit-phone"
                  >
                    Entrar na Quadra
                  </Button>
                </View>

                {/* "ou" divider */}
                <View className="flex-row items-center my-6">
                  <View className="flex-1 h-px bg-line" />
                  <Text className="font-mono text-mono text-text-muted uppercase mx-3">
                    ou
                  </Text>
                  <View className="flex-1 h-px bg-line" />
                </View>

                <Button
                  variant="outline"
                  onPress={onGoogle}
                  loading={googleSignIn.isPending}
                  leftIcon={<GoogleMark />}
                  testID="google-signin"
                >
                  Entrar com Google
                </Button>

                <Text className="font-body text-caption text-text-muted text-center mt-6">
                  Ao continuar, você aceita os{" "}
                  <Text className="font-body text-caption text-text-primary">
                    Termos
                  </Text>{" "}
                  e a{" "}
                  <Text className="font-body text-caption text-text-primary">
                    Política de Privacidade
                  </Text>
                  .
                </Text>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      ) : null}
    </View>
  );
}
