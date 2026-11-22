import { Stack } from 'expo-router';

import { stackOptions } from '@/theme/motion';
import { useThemeColors } from '@/theme/useThemeColors';

export default function AuthLayout() {
  const theme = useThemeColors();
  return (
    <Stack screenOptions={stackOptions(theme)}>
      {/* Same background as the login: the code card fades in, no slide (DECISIONS #165). */}
      <Stack.Screen name="sms-otp" options={{ animation: 'fade' }} />
    </Stack>
  );
}
