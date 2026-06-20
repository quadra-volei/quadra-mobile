import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, MessageSquare } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { useResendOtp } from "@/features/auth/api/resendOtp";
import { useVerifyOtp } from "@/features/auth/api/verifyOtp";
import { useAuthStore } from "@/stores/auth";
import { colors, HERO_GRADIENT } from "@/theme/colors";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_MIN_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4); // card occupies ~40% of the screen

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30; // SCOPE: ~30s resend countdown

/** Formats an E.164 BR number (e.g. "+5531231213312") as "+55 (31) 23121-3312". */
function formatDisplayPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  // Strip the BR country code (55) when present.
  const national = digits.startsWith("55") ? digits.slice(2) : digits;
  if (national.length === 0) {
    return e164;
  }
  const ddd = national.slice(0, 2);
  const rest = national.slice(2);
  if (rest.length === 0) {
    return `+55 (${ddd}`;
  }
  // 9-digit mobile splits 5+4; 8-digit landline splits 4+4.
  const splitAt = rest.length > 8 ? 5 : 4;
  const first = rest.slice(0, splitAt);
  const second = rest.slice(splitAt);
  if (second.length === 0) {
    return `+55 (${ddd}) ${first}`;
  }
  return `+55 (${ddd}) ${first}-${second}`;
}

/** Formats a non-negative seconds count as "M:SS". */
function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function SmsOtpScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = params.phone ?? "";
  const displayPhone = formatDisplayPhone(phone);

  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [isError, setIsError] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Single countdown interval, cleared on unmount; never goes negative.
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const goBackToLogin = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  };

  const onChangeCode = (next: string) => {
    setCode(next);
    if (isError) {
      setIsError(false); // clear the error as soon as the user edits a digit
    }
  };

  const onVerify = (submitted?: string) => {
    const codeToVerify = submitted ?? code;
    if (codeToVerify.length < OTP_LENGTH || verifyOtp.isPending) {
      return; // guard against double-submit / incomplete code
    }
    verifyOtp.mutate(
      { phone, code: codeToVerify },
      {
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
        onError: () => {
          setIsError(true);
        },
      },
    );
  };

  const onResend = () => {
    resendOtp.mutate(
      { phone },
      {
        onSuccess: () => {
          setSecondsLeft(RESEND_SECONDS);
        },
      },
    );
  };

  // Lift the card by the keyboard height so the OTP boxes, the verify CTA and
  // the resend/change actions below it stay above the keyboard.
  const keyboard = useAnimatedKeyboard();
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
  }));

  return (
    <View className="flex-1 bg-surface-dark">
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1">
          {/* back chevron over the dark strip */}
          <Pressable
            onPress={goBackToLogin}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            className="ml-4 mt-2 h-10 w-10 rounded-full bg-surface-dark/40 items-center justify-center"
            testID="otp-back"
          >
            <ChevronLeft size={24} color={colors.textOnDark} />
          </Pressable>
        </SafeAreaView>
      </LinearGradient>

      {/* white card pulled up over the strip */}
      <Animated.View
        className="absolute inset-x-0 bottom-0 bg-white shadow-modal px-6 pt-6 pb-8"
        style={[
          {
            minHeight: SHEET_MIN_HEIGHT,
            // top-only radius (card token = 20px); bottom stays square so the
            // blue background never shows through rounded bottom corners.
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          cardStyle,
        ]}
      >
        <Text className="font-display text-h1 text-text-primary uppercase">
          CONFIRME SEU NÚMERO
        </Text>
        <Text className="font-body text-body text-text-muted mt-2">
          Enviamos um código de 4 dígitos por SMS para{" "}
          <Text className="font-body text-body-bold text-text-primary">
            {displayPhone}
          </Text>
          .
        </Text>

        {/* 4 digit boxes */}
        <View className="mt-6">
          <OtpInput
            value={code}
            onChangeText={onChangeCode}
            error={isError}
            autoFocus
            onFilled={(filled) => onVerify(filled)}
            testID="otp-input"
          />
        </View>

        {/* polite status for screen readers when the code is wrong */}
        {isError ? (
          <Text
            className="font-body text-caption text-danger mt-2"
            accessibilityLiveRegion="polite"
          >
            Código inválido, tente novamente
          </Text>
        ) : null}

        <View className="mt-6">
          <Button
            variant="grad"
            onPress={() => onVerify()}
            disabled={code.length < OTP_LENGTH}
            loading={verifyOtp.isPending}
            testID="verify-otp"
          >
            Verificar
          </Button>
        </View>

        {/* resend: countdown (disabled) → active link */}
        <View className="items-center mt-6">
          {secondsLeft > 0 ? (
            <Text
              className="font-body text-body text-text-muted"
              accessibilityLiveRegion="polite"
            >
              Não recebeu? Reenviar em{" "}
              <Text className="font-mono text-body-bold text-text-primary">
                {formatCountdown(secondsLeft)}
              </Text>
            </Text>
          ) : (
            <Button
              variant="ghost"
              onPress={onResend}
              loading={resendOtp.isPending}
              testID="resend-otp"
            >
              Reenviar código
            </Button>
          )}
        </View>

        {/* back to S2 */}
        <View className="items-center mt-2">
          <Button
            variant="ghost"
            onPress={goBackToLogin}
            testID="change-number"
          >
            Usar outro número
          </Button>
        </View>
      </Animated.View>
    </View>
  );
}
