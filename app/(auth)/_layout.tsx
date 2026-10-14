import { Stack } from 'expo-router';

import { STACK_OPTIONS } from '@/theme/motion';

export default function AuthLayout() {
  return <Stack screenOptions={STACK_OPTIONS} />;
}
