import { Stack } from 'expo-router';

import { STACK_OPTIONS } from '@/theme/motion';

export default function AuthLayout() {
  return (
    <Stack screenOptions={STACK_OPTIONS}>
      {/* Same background as the login: the code card fades in, no slide (DECISIONS #164). */}
      <Stack.Screen name="sms-otp" options={{ animation: 'fade' }} />
    </Stack>
  );
}
