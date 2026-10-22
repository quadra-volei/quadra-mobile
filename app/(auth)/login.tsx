import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Dimensions, Linking, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ChevronLeft } from "lucide-react-native";
import Animated, {
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { AuthHero } from "@/components/domain/AuthHero";
import { GoogleMark } from "@/components/icons/GoogleMark";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  GoogleSignInCancelledError,
  useGoogleSignIn,
} from "@/features/auth/api/googleSignIn";
import { useRequestOtp } from "@/features/auth/api/requestOtp";
import { useRiseIn } from "@/hooks/useRiseIn";
import { useAuthStore } from "@/stores/auth";
import { colors } from "@/theme/colors";
import { LEGAL_URLS } from "@/lib/legal";

const SWIPE_CLOSE_THRESHOLD = 120; // drag distance (px) past which a release closes the sheet

// The CTA rises in after the hero's intro (AuthHero).
const CTA_DELAY = 180;

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_MIN_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4); // sheet occupies ~40% of the screen
const HERO_STRIP_HEIGHT = SCREEN_HEIGHT - SHEET_MIN_HEIGHT; // dark area above the sheet (~30%)
const SHEET_HIDDEN_OFFSET = SHEET_MIN_HEIGHT + 100; // sheet parked fully below the screen when closed

const loginPhoneSchema = z.object({
  phone: z.string().regex(/^\d{11}$/, "Telefone inválido"), // BR national digits
});

type LoginPhoneForm = z.infer<typeof loginPhoneSchema>;

export default function LoginScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const requestOtp = useRequestOtp();
  const googleSignIn = useGoogleSignIn();
  const setAuth = useAuthStore((s) => s.setAuth);

  const translateY = useSharedValue(SHEET_HIDDEN_OFFSET);

  const ctaStyle = useRiseIn({ delay: CTA_DELAY });

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
    setGoogleError(null);
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
      onError: (err) => {
        // Backing out of the Google account picker is not an error.
        if (!(err instanceof GoogleSignInCancelledError)) {
          setGoogleError(
            err.message || "Não foi possível entrar com o Google.",
          );
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

  // Lift the sheet by the keyboard height so the input, CTA and the options
  // below it stay above the keyboard instead of being covered by it.
  const keyboard = useAnimatedKeyboard();

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboard.height.value }],
  }));

  return (
    <View className="flex-1 bg-surface-dark">
      <AuthHero>
        {/* pinned CTA */}
        <Animated.View className="pb-6" style={ctaStyle}>
          <Button variant="grad" onPress={openSheet} testID="open-sheet">
            Entrar e jogar
          </Button>
        </Animated.View>
      </AuthHero>

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
              <ChevronLeft size={24} color={colors.textOnDark} />
            </Pressable>
          </SafeAreaView>

          {/* brand mark centered in the dark strip above the sheet */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={sheetStyle}
              className="absolute inset-x-0 bottom-0"
            >
              <View
                className="bg-white shadow-modal px-6 pt-6 pb-8"
                style={{
                  minHeight: SHEET_MIN_HEIGHT,
                  // top-only radius (card token = 20px); bottom stays square so
                  // the blue background never shows through rounded corners.
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                }}
              >
                {/* grab handle */}
                <View className="self-center h-1 w-12 rounded-pill bg-line mb-4" />

                <Text className="font-display text-h1 text-text-primary uppercase">
                  ACESSE SUA CONTA
                </Text>

                <Text className="font-body-bold text-eyebrow text-text-primary uppercase mt-6">
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
                        onChangeText={(text) => {
                          const onlyDigits = text.replace(/\D/g, "");
                          const limited = onlyDigits.slice(0, 11); // DDD + 9 onlyDigits
                          onChange(limited);
                        }}
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

                {/* inline (no toast) status when Google sign-in fails */}
                {googleError ? (
                  <Text
                    className="font-body text-caption text-danger text-center mt-2"
                    accessibilityLiveRegion="polite"
                    testID="google-error"
                  >
                    {googleError}
                  </Text>
                ) : null}

                <Text className="font-body text-caption text-text-muted text-center mt-6">
                  Ao continuar, você aceita os{" "}
                  <Text
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(LEGAL_URLS.terms)}
                    className="font-body text-caption text-text-primary underline"
                  >
                    Termos de Uso
                  </Text>{" "}
                  e a{" "}
                  <Text
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
                    className="font-body text-caption text-text-primary underline"
                  >
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
